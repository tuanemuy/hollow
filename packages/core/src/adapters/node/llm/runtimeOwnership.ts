import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  leasedDrive,
  leasedLocal,
  leasedText,
} from "@repo/core/application/llm/inputStage";
import {
  type LlmNativeBirth,
  type LlmNativeInputOwner,
  LlmOperationError,
  type LlmPredecessorInputProof,
} from "@repo/core/application/llm/ports";
import type {
  MachinePredecessor,
  MachinePredecessorOwner,
  MachineRuntimeOwnership,
  SourceInputLease,
} from "@repo/core/application/regeneration/services";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import type {
  PdfPageIdentity,
  PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import { MACHINE_RECIPE } from "@repo/core/domain/regeneration/machine";
import {
  SOURCE_MEMORY_BYTES,
  type SourceInputReceipt,
} from "@repo/core/domain/regeneration/source";
import { z } from "zod";

const pidSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const legacyRecordSchema = z
  .object({
    pid: pidSchema,
    runtimeId: z.uuid(),
    predecessors: z.array(z.uuid()).max(64),
  })
  .strict();
const birthSchema = z.discriminatedUnion("state", [
  z
    .object({
      id: z.uuid(),
      binding: z.string().max(4096),
      state: z.literal("reserved"),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      binding: z.string().max(4096),
      state: z.enum(["active", "closed"]),
      pid: pidSchema,
    })
    .strict(),
]);
const textPredecessorSchema = z.discriminatedUnion("inputMode", [
  z
    .object({
      runtimeId: z.uuid(),
      inputMode: z.literal("legacy"),
      termination: z.enum(["legacy-unverified", "acquire-confirmed"]),
    })
    .strict(),
  z
    .object({
      runtimeId: z.uuid(),
      inputMode: z.literal("leased-text-v1"),
      termination: z.literal("acquire-confirmed"),
    })
    .strict(),
]);
const predecessorSchema = z.union([
  textPredecessorSchema,
  z
    .object({
      runtimeId: z.uuid(),
      inputMode: z.literal("leased-local-v2"),
      termination: z.literal("acquire-confirmed"),
    })
    .strict(),
]);
const recordSchema = z
  .object({
    version: z.literal(2),
    pid: pidSchema,
    runtimeId: z.uuid(),
    inputMode: z.literal("leased-text-v1"),
    predecessors: z.array(textPredecessorSchema).max(64),
  })
  .strict();
const localRecordSchema = z
  .object({
    version: z.literal(3),
    pid: pidSchema,
    runtimeId: z.uuid(),
    inputMode: z.literal("leased-local-v2"),
    predecessors: z.array(predecessorSchema).max(64),
    births: z.array(birthSchema).max(2),
  })
  .strict();
const savedRecordSchema = z.union([
  localRecordSchema,
  recordSchema,
  legacyRecordSchema,
]);
type RecordValue = z.infer<typeof localRecordSchema>;
type SavedRecord = Readonly<{
  value: z.infer<typeof savedRecordSchema>;
  text: string;
}>;
const unknown = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
const absent = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";
const dead = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH";
  }
};
type OwnershipHandle = Readonly<{
  stat(): Promise<
    Readonly<{
      isFile(): boolean;
      isDirectory(): boolean;
      size: number;
      mode: number;
    }>
  >;
  readFile(encoding: "utf8"): Promise<string>;
  writeFile(value: string): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
}>;
export type NodeLlmRuntimeOwnershipEnvironment = Readonly<{
  pid: number;
  randomUUID(): string;
  knownPidAbsent(pid: number): boolean;
  mkdir(
    directory: string,
    options: Readonly<{ recursive: true; mode: number }>,
  ): Promise<unknown>;
  open(
    file: string,
    flags: number | "wx",
    mode?: number,
  ): Promise<OwnershipHandle>;
  rename(from: string, to: string): Promise<void>;
  unlink(file: string): Promise<void>;
}>;
const environment: NodeLlmRuntimeOwnershipEnvironment = {
  pid: process.pid,
  randomUUID,
  knownPidAbsent: dead,
  mkdir,
  open,
  rename,
  unlink,
};
async function readRecord(
  io: NodeLlmRuntimeOwnershipEnvironment,
  file: string,
): Promise<SavedRecord | null> {
  let handle: OwnershipHandle;
  try {
    handle = await io.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (absent(error)) return null;
    throw unknown();
  }
  try {
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.size > 16 * 1024 ||
      (info.mode & 0o777) !== 0o600
    )
      throw unknown();
    const text = await handle.readFile("utf8");
    const parsed = savedRecordSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw unknown();
    const ids = parsed.data.predecessors.map((value) =>
      typeof value === "string" ? value : value.runtimeId,
    );
    if (new Set(ids).size !== ids.length || ids.includes(parsed.data.runtimeId))
      throw unknown();
    return { value: parsed.data, text };
  } catch {
    throw unknown();
  } finally {
    await handle.close();
  }
}
async function syncDirectory(
  io: NodeLlmRuntimeOwnershipEnvironment,
  directory: string,
) {
  const handle = await io.open(
    directory,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await handle.stat();
    if (!info.isDirectory() || (info.mode & 0o777) !== 0o700) throw unknown();
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function persist(
  io: NodeLlmRuntimeOwnershipEnvironment,
  directory: string,
  file: string,
  value: RecordValue,
): Promise<string> {
  const temporary = path.join(directory, `${io.randomUUID()}.pending`);
  const handle = await io.open(temporary, "wx", 0o600);
  let renamed = false;
  const text = JSON.stringify(value);
  try {
    await handle.writeFile(text);
    await handle.sync();
    await handle.close();
    await io.rename(temporary, file);
    renamed = true;
    await syncDirectory(io, directory);
    if ((await readRecord(io, file))?.text !== text) throw unknown();
    return text;
  } finally {
    await handle.close();
    if (!renamed) await io.unlink(temporary).catch(() => {});
  }
}
function isConversion(
  value: LlmConversion | PdfPreview | MachineRegeneration,
): value is LlmConversion {
  return "operation" in value;
}
function binding(
  value: LlmConversion | PdfPreview | MachineRegeneration,
): string | null {
  const receipt = value.inputReceipt;
  if ("executorId" in value) {
    if (
      value.access.origin === "redacted" ||
      !receipt ||
      receipt.consumer.kind !== "machine-regeneration" ||
      receipt.consumer.id !== value.id ||
      receipt.runtimeId !== value.owner.runtimeId ||
      receipt.token !== value.owner.token
    )
      return null;
    return JSON.stringify([
      "machine",
      MACHINE_RECIPE,
      value.id,
      value.commandId,
      value.requestDigest,
      value.executorId,
      value.noteId,
      value.noteVersion,
      value.originalRevisionNo,
      value.ownershipGeneration,
      value.source,
      value.access,
      value.previous,
      value.owner.runtimeId,
      value.owner.token,
      receipt.consumer,
      receipt.runtimeId,
      receipt.token,
      receipt.generation,
    ]);
  }
  const conversion = isConversion(value);
  if (
    !(
      (value.access.origin === "local-original" &&
        value.access.bindingId === null &&
        (!conversion || leasedLocal(value))) ||
      (value.access.origin === "drive-record" &&
        (!conversion || leasedDrive(value)))
    ) ||
    !receipt ||
    receipt.consumer.kind !== (conversion ? "llm-conversion" : "pdf-preview") ||
    receipt.consumer.id !== (conversion ? value.jobId : value.id) ||
    receipt.runtimeId !== value.owner.runtimeId ||
    receipt.token !== value.owner.token
  )
    return null;
  return JSON.stringify([
    conversion
      ? [
          "conversion",
          value.jobId,
          value.commandId,
          value.originalRevisionNo,
          value.sourceState,
          value.sourceCoverage,
          value.selection,
          value.selection === "fixed"
            ? [
                value.preparationVersion,
                value.promptVersion,
                value.preparationVersion === 4 ? value.manifest : null,
              ]
            : null,
        ]
      : ["preview", value.id, value.commandId, value.requestDigest],
    value.accountId,
    value.noteId,
    value.noteVersion,
    value.credentialEpoch,
    conversion ? value.sourceOwnershipGeneration : value.ownershipGeneration,
    value.source,
    value.access,
    value.owner.runtimeId,
    value.owner.token,
    receipt.consumer,
    receipt.runtimeId,
    receipt.token,
    receipt.generation,
  ]);
}
type ProofEntry = Readonly<{
  runtimeId: string;
  binding: string;
  receipt: Extract<SourceInputReceipt, { state: "closed" }>;
}>;

export class NodeLlmRuntimeOwnership implements MachineRuntimeOwnership {
  readonly #proofs = new WeakMap<LlmPredecessorInputProof, ProofEntry>();
  readonly #machineOwners = new WeakMap<
    MachinePredecessorOwner,
    ProofEntry & Readonly<{ version: number }>
  >();
  readonly #issuedMachineOwners = new Map<string, MachinePredecessorOwner>();
  private mutations: Promise<void> = Promise.resolve();
  private unproven = false;
  readonly #births = new WeakMap<LlmNativeBirth, string>();
  readonly #issued = new Map<string, LlmPredecessorInputProof>();
  private constructor(
    private readonly directory: string,
    private value: RecordValue,
    private recordText: string,
    private readonly io: NodeLlmRuntimeOwnershipEnvironment,
  ) {}
  get runtimeId() {
    return this.value.runtimeId;
  }
  predecessors(): readonly string[] {
    return this.value.predecessors.map((value) => value.runtimeId);
  }
  assertReady() {
    if (this.unproven || this.value.predecessors.length) throw unknown();
  }
  static async acquire(
    directory: string,
    io: NodeLlmRuntimeOwnershipEnvironment = environment,
  ): Promise<NodeLlmRuntimeOwnership> {
    await io.mkdir(directory, { recursive: true, mode: 0o700 });
    await syncDirectory(io, directory);
    const file = path.join(directory, "owner.json");
    const lock = path.join(directory, "recovery.lock");
    let recovery: OwnershipHandle;
    try {
      recovery = await io.open(lock, "wx", 0o600);
    } catch {
      throw unknown();
    }
    try {
      const previous = await readRecord(io, file);
      if (previous && !io.knownPidAbsent(previous.value.pid)) throw unknown();
      if (
        previous &&
        "births" in previous.value &&
        previous.value.births.some(
          (birth) =>
            birth.state === "reserved" || !io.knownPidAbsent(birth.pid),
        )
      )
        throw unknown();
      const predecessors: RecordValue["predecessors"] = previous
        ? "version" in previous.value
          ? [
              ...previous.value.predecessors,
              {
                runtimeId: previous.value.runtimeId,
                inputMode: previous.value.inputMode,
                termination: "acquire-confirmed",
              },
            ]
          : [
              ...previous.value.predecessors.map((runtimeId) => ({
                runtimeId,
                inputMode: "legacy" as const,
                termination: "legacy-unverified" as const,
              })),
              {
                runtimeId: previous.value.runtimeId,
                inputMode: "legacy",
                termination: "acquire-confirmed",
              },
            ]
        : [];
      if (predecessors.length > 64) throw unknown();
      const current = await readRecord(io, file);
      if (previous?.text !== current?.text) throw unknown();
      if (previous && !io.knownPidAbsent(previous.value.pid)) throw unknown();
      const value: RecordValue = {
        version: 3,
        pid: io.pid,
        runtimeId: io.randomUUID(),
        inputMode: "leased-local-v2",
        births: [],
        predecessors,
      };
      if (!localRecordSchema.safeParse(value).success) throw unknown();
      const recordText = await persist(io, directory, file, value);
      return new NodeLlmRuntimeOwnership(directory, value, recordText, io);
    } catch {
      throw unknown();
    } finally {
      await recovery.close();
      await io.unlink(lock);
      await syncDirectory(io, directory);
    }
  }
  private update(change: (value: RecordValue) => RecordValue): Promise<void> {
    const work = this.mutations.then(async () => {
      if (this.unproven) throw unknown();
      const file = path.join(this.directory, "owner.json");
      const lock = path.join(this.directory, "recovery.lock");
      const recovery = await this.io.open(lock, "wx", 0o600);
      try {
        if ((await readRecord(this.io, file))?.text !== this.recordText)
          throw unknown();
        const next = change(this.value);
        if (!localRecordSchema.safeParse(next).success) throw unknown();
        const recordText = await persist(this.io, this.directory, file, next);
        this.value = next;
        this.recordText = recordText;
      } finally {
        await recovery.close();
        await this.io.unlink(lock);
        await syncDirectory(this.io, this.directory);
      }
    });
    this.mutations = work.catch(() => {
      this.unproven = true;
    });
    return work.catch(() => {
      throw unknown();
    });
  }
  nativeOwner(
    value: LlmConversion | PdfPreview | MachineRegeneration,
    lease: SourceInputLease,
    page?: PdfPageIdentity,
  ): LlmNativeInputOwner {
    this.assertReady();
    const key = binding(value);
    if (
      !key ||
      value.owner.state !== "active" ||
      value.owner.runtimeId !== this.runtimeId ||
      value.inputReceipt?.state !== "active" ||
      value.sourceMemoryBytes !== SOURCE_MEMORY_BYTES ||
      JSON.stringify(lease.receipt) !== JSON.stringify(value.inputReceipt) ||
      (page &&
        (!isConversion(value) ||
          value.selection !== "fixed" ||
          value.preparationVersion !== 4 ||
          !value.manifest.pages.some(
            (entry) => JSON.stringify(entry) === JSON.stringify(page),
          )))
    )
      throw unknown();
    const nativeKey = createHash("sha256")
      .update(JSON.stringify([key, page ?? null]))
      .digest("hex");
    const idFor = (birth: LlmNativeBirth) => {
      const id = this.#births.get(birth);
      if (!id || birth.birthId !== id) throw unknown();
      return id;
    };
    return {
      reserve: async () => {
        const id = this.io.randomUUID();
        const birth = Object.freeze({ birthId: id });
        await this.update((current) => {
          const births = current.births.filter(
            (entry) => entry.state !== "closed",
          );
          if (births.length >= 2) throw unknown();
          return {
            ...current,
            births: [...births, { id, binding: nativeKey, state: "reserved" }],
          };
        });
        this.#births.set(birth, id);
        return birth;
      },
      register: async (birth, pid) => {
        const id = idFor(birth);
        if (!pidSchema.safeParse(pid).success) throw unknown();
        await this.update((current) => {
          const entry = current.births.find(
            (entry) => entry.id === id && entry.binding === nativeKey,
          );
          if (!entry || entry.state !== "reserved") throw unknown();
          return {
            ...current,
            births: current.births.map((entry) =>
              entry.id === id ? { ...entry, state: "active", pid } : entry,
            ),
          };
        });
      },
      closed: async (birth) => {
        const id = idFor(birth);
        await this.update((current) => {
          const entry = current.births.find(
            (entry) => entry.id === id && entry.binding === nativeKey,
          );
          if (
            !entry ||
            entry.state === "reserved" ||
            !this.io.knownPidAbsent(entry.pid)
          )
            throw unknown();
          return {
            ...current,
            births: current.births.map((entry) =>
              entry.id === id && entry.state !== "reserved"
                ? { ...entry, state: "closed" }
                : entry,
            ),
          };
        });
        this.#births.delete(birth);
      },
    };
  }
  inputPredecessor(
    value: LlmConversion | PdfPreview | MachineRegeneration,
  ): LlmPredecessorInputProof | null {
    const key = binding(value);
    const receipt = value.inputReceipt;
    if (
      key === null ||
      !receipt ||
      receipt.state === "closed" ||
      value.sourceMemoryBytes !== SOURCE_MEMORY_BYTES ||
      (value.owner.state !== "active" && value.owner.state !== "unknown") ||
      !this.value.predecessors.some(
        (previous) =>
          previous.runtimeId === receipt.runtimeId &&
          (previous.inputMode === "leased-local-v2" ||
            (previous.inputMode === "leased-text-v1" &&
              isConversion(value) &&
              leasedText(value))) &&
          previous.termination === "acquire-confirmed",
      )
    )
      return null;
    const issued = this.#issued.get(key);
    if (issued) return issued;
    if (this.#issued.size + this.#issuedMachineOwners.size >= 2) return null;
    const closed: Extract<SourceInputReceipt, { state: "closed" }> =
      Object.freeze({
        ...receipt,
        consumer: Object.freeze({ ...receipt.consumer }),
        state: "closed",
        proofId: this.io.randomUUID(),
      });
    const proof: LlmPredecessorInputProof = Object.freeze({ receipt: closed });
    this.#proofs.set(proof, {
      runtimeId: this.runtimeId,
      binding: key,
      receipt: closed,
    });
    this.#issued.set(key, proof);
    return proof;
  }
  verifyPredecessorInput(
    proof: LlmPredecessorInputProof,
    value: LlmConversion | PdfPreview | MachineRegeneration,
  ): boolean {
    const entry = this.#proofs.get(proof);
    const receipt = value.inputReceipt;
    if (
      !entry ||
      entry.runtimeId !== this.runtimeId ||
      entry.binding !== binding(value) ||
      !receipt ||
      !this.value.predecessors.some(
        (previous) =>
          previous.runtimeId === receipt.runtimeId &&
          (previous.inputMode === "leased-local-v2" ||
            (previous.inputMode === "leased-text-v1" &&
              isConversion(value) &&
              leasedText(value))) &&
          previous.termination === "acquire-confirmed",
      )
    )
      return false;
    return receipt.state === "closed"
      ? value.sourceMemoryBytes === 0 &&
          value.owner.state === "closed" &&
          receipt.proofId === entry.receipt.proofId
      : value.sourceMemoryBytes === SOURCE_MEMORY_BYTES &&
          (value.owner.state === "active" || value.owner.state === "unknown");
  }
  machinePredecessor(value: MachineRegeneration): MachinePredecessor | null {
    if (value.inputReceipt?.state !== "closed") {
      const proof = this.inputPredecessor(value);
      return proof ? { kind: "input", proof } : null;
    }
    const key = binding(value);
    const receipt = value.inputReceipt;
    if (
      this.unproven ||
      key === null ||
      value.sourceMemoryBytes !== 0 ||
      (value.owner.state !== "active" && value.owner.state !== "unknown") ||
      !this.value.predecessors.some(
        (previous) =>
          previous.runtimeId === receipt.runtimeId &&
          previous.inputMode === "leased-local-v2" &&
          previous.termination === "acquire-confirmed",
      )
    )
      return null;
    const exact = JSON.stringify([key, value.originalId, receipt]);
    const issued = this.#issuedMachineOwners.get(exact);
    if (issued) return { kind: "owner", proof: issued };
    if (this.#issued.size + this.#issuedMachineOwners.size >= 2) return null;
    Object.freeze(receipt.consumer);
    Object.freeze(receipt);
    const proof = Object.freeze({ receipt });
    this.#machineOwners.set(proof, {
      runtimeId: this.runtimeId,
      binding: exact,
      receipt,
      version: value.version,
    });
    this.#issuedMachineOwners.set(exact, proof);
    return { kind: "owner", proof };
  }
  pendingMachinePredecessors(runtimeId: string): readonly MachinePredecessor[] {
    return [
      ...this.pendingInputProofs(runtimeId)
        .filter(
          (proof) => proof.receipt.consumer.kind === "machine-regeneration",
        )
        .map((proof): MachinePredecessor => ({ kind: "input", proof })),
      ...[...this.#issuedMachineOwners.values()]
        .filter((proof) => proof.receipt.runtimeId === runtimeId)
        .map((proof): MachinePredecessor => ({ kind: "owner", proof })),
    ];
  }
  verifyMachinePredecessor(
    predecessor: MachinePredecessor,
    value: MachineRegeneration,
  ): boolean {
    if (predecessor.kind === "input")
      return this.verifyPredecessorInput(predecessor.proof, value);
    const entry = this.#machineOwners.get(predecessor.proof);
    const receipt = value.inputReceipt;
    return (
      !this.unproven &&
      !!entry &&
      entry.runtimeId === this.runtimeId &&
      receipt?.state === "closed" &&
      value.sourceMemoryBytes === 0 &&
      entry.binding ===
        JSON.stringify([binding(value), value.originalId, receipt]) &&
      this.value.predecessors.some(
        (previous) =>
          previous.runtimeId === receipt.runtimeId &&
          previous.inputMode === "leased-local-v2" &&
          previous.termination === "acquire-confirmed",
      ) &&
      (value.owner.state === "active" ||
        value.owner.state === "unknown" ||
        (value.owner.state === "closed" &&
          value.phase === "terminal" &&
          value.outcome === "failed" &&
          value.failure === "REGENERATION_INTERRUPTED" &&
          value.resultVersion === null &&
          value.version === entry.version + 1))
    );
  }
  consumeMachinePredecessor(predecessor: MachinePredecessor): void {
    if (predecessor.kind === "input") {
      this.consumePredecessorInput(predecessor.proof);
      return;
    }
    const entry = this.#machineOwners.get(predecessor.proof);
    if (!entry) throw unknown();
    this.#machineOwners.delete(predecessor.proof);
    this.#issuedMachineOwners.delete(entry.binding);
  }
  pendingInputProofs(runtimeId: string): readonly LlmPredecessorInputProof[] {
    return [...this.#issued.values()].filter(
      (proof) => proof.receipt.runtimeId === runtimeId,
    );
  }
  consumePredecessorInput(proof: LlmPredecessorInputProof): void {
    const entry = this.#proofs.get(proof);
    if (!entry) throw unknown();
    this.#proofs.delete(proof);
    this.#issued.delete(entry.binding);
  }
  async acknowledge(runtimeId: string): Promise<void> {
    if (
      !this.value.predecessors.some(
        (previous) => previous.runtimeId === runtimeId,
      )
    )
      return;
    if (
      [...this.#issued.values(), ...this.#issuedMachineOwners.values()].some(
        (proof) => proof.receipt.runtimeId === runtimeId,
      )
    )
      throw unknown();
    await this.update((current) => ({
      ...current,
      predecessors: current.predecessors.filter(
        (previous) => previous.runtimeId !== runtimeId,
      ),
    }));
  }
}

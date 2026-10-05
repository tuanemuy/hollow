import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  type LlmLeasedRuntimeOwnership,
  LlmOperationError,
  type LlmPredecessorInputProof,
} from "@repo/core/application/llm/ports";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
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
const predecessorSchema = z.discriminatedUnion("inputMode", [
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
const recordSchema = z
  .object({
    version: z.literal(2),
    pid: pidSchema,
    runtimeId: z.uuid(),
    inputMode: z.literal("leased-text-v1"),
    predecessors: z.array(predecessorSchema).max(64),
  })
  .strict();
const savedRecordSchema = z.union([recordSchema, legacyRecordSchema]);
type RecordValue = z.infer<typeof recordSchema>;
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
function binding(value: LlmConversion): string | null {
  const receipt = value.inputReceipt;
  if (
    value.access.origin !== "local-original" ||
    value.access.bindingId !== null ||
    value.selection !== "fixed" ||
    value.preparationVersion !== 1 ||
    value.promptVersion !== 1 ||
    !receipt ||
    receipt.consumer.kind !== "llm-conversion" ||
    receipt.consumer.id !== value.jobId ||
    receipt.runtimeId !== value.owner.runtimeId ||
    receipt.token !== value.owner.token
  )
    return null;
  return JSON.stringify([
    value.jobId,
    value.accountId,
    value.noteId,
    value.commandId,
    value.noteVersion,
    value.originalRevisionNo,
    value.sourceState,
    value.sourceCoverage,
    value.source.kind,
    value.source.originalId,
    value.source.sha256,
    value.source.bytes,
    value.source.format,
    value.owner.runtimeId,
    value.owner.token,
    receipt.consumer.kind,
    receipt.consumer.id,
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

export class NodeLlmRuntimeOwnership implements LlmLeasedRuntimeOwnership {
  readonly #proofs = new WeakMap<LlmPredecessorInputProof, ProofEntry>();
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
    if (this.value.predecessors.length) throw unknown();
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
        version: 2,
        pid: io.pid,
        runtimeId: io.randomUUID(),
        inputMode: "leased-text-v1",
        predecessors,
      };
      if (!recordSchema.safeParse(value).success) throw unknown();
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
  inputPredecessor(value: LlmConversion): LlmPredecessorInputProof | null {
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
          previous.inputMode === "leased-text-v1" &&
          previous.termination === "acquire-confirmed",
      )
    )
      return null;
    const issued = this.#issued.get(key);
    if (issued) return issued;
    if (this.#issued.size >= 2) return null;
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
    value: LlmConversion,
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
          previous.inputMode === "leased-text-v1" &&
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
      [...this.#issued.values()].some(
        (proof) => proof.receipt.runtimeId === runtimeId,
      )
    )
      throw unknown();
    const file = path.join(this.directory, "owner.json");
    const lock = path.join(this.directory, "recovery.lock");
    let recovery: OwnershipHandle;
    try {
      recovery = await this.io.open(lock, "wx", 0o600);
    } catch {
      throw unknown();
    }
    try {
      const current = await readRecord(this.io, file);
      if (current?.text !== this.recordText) throw unknown();
      const value: RecordValue = {
        ...this.value,
        predecessors: this.value.predecessors.filter(
          (previous) => previous.runtimeId !== runtimeId,
        ),
      };
      const checked = await readRecord(this.io, file);
      if (checked?.text !== current.text) throw unknown();
      const recordText = await persist(this.io, this.directory, file, value);
      this.value = value;
      this.recordText = recordText;
    } catch {
      throw unknown();
    } finally {
      await recovery.close();
      await this.io.unlink(lock);
      await syncDirectory(this.io, this.directory);
    }
  }
}

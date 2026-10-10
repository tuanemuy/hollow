import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  type FileHandle,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { request } from "node:https";
import { dirname, isAbsolute, join } from "node:path";
import {
  type Database,
  localDatabaseFile,
} from "@repo/core/adapters/libsql/client";
import { LibsqlHollowUnitOfWorkProvider } from "@repo/core/adapters/libsql/hollowUnitOfWork";
import type {
  CredentialClosedProof,
  OwnedCredentialExecution,
} from "@repo/core/application/account/ports";
import { ConflictError } from "@repo/core/application/errors";
import type { HollowUnitOfWorkProvider } from "@repo/core/application/execution/hollowUnitOfWork";
import type {
  CredentialUse,
  CredentialUseBinding,
  CredentialUseTarget,
} from "@repo/core/domain/account/deletion";
import { credentialUseKey } from "@repo/core/domain/account/deletion";
import { z } from "zod";

type Provider = "google" | "openrouter";
const predecessorSchema = z
  .object({ runtimeId: z.uuid(), provenance: z.literal("acquire-confirmed") })
  .strict();
const recordSchema = z
  .object({
    version: z.literal(1),
    mode: z.literal("credential-use-v1"),
    namespace: z.enum(["google", "openrouter"]),
    databaseBinding: z.string().regex(/^[a-f0-9]{64}$/),
    runtimeId: z.uuid(),
    pid: z.number().int().positive().safe(),
    predecessors: z.array(predecessorSchema).max(64),
  })
  .strict();
type OwnerRecord = z.infer<typeof recordSchema>;
const unavailable = () =>
  new ConflictError(
    "CREDENTIAL_OWNER_UNKNOWN",
    "連携処理の終了を確認できません。新しい利用を停止しています。",
  );
const absent = (e: unknown) =>
  e instanceof Error && "code" in e && e.code === "ENOENT";
function knownPidAbsent(pid: number) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (e) {
    return e instanceof Error && "code" in e && e.code === "ESRCH";
  }
}
async function readRecord(path: string) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await file.stat({ bigint: true });
    const named = await lstat(path, { bigint: true });
    if (
      !before.isFile() ||
      before.nlink !== 1n ||
      before.uid !== BigInt(process.getuid!()) ||
      (before.mode & 0o7777n) !== 0o600n ||
      before.size > 16_384n ||
      before.dev !== named.dev ||
      before.ino !== named.ino
    )
      throw unavailable();
    const buffer = Buffer.alloc(16_385);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const after = await file.stat({ bigint: true });
    const namedAfter = await lstat(path, { bigint: true });
    if (
      BigInt(bytesRead) !== before.size ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs ||
      namedAfter.dev !== before.dev ||
      namedAfter.ino !== before.ino
    )
      throw unavailable();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      buffer.subarray(0, bytesRead),
    );
    return { value: recordSchema.parse(JSON.parse(text)), text };
  } finally {
    await file.close();
  }
}

export type CredentialRuntimeOwner = Readonly<{
  provider: Provider;
  runtimeId: string;
  recoverableRuntimeIds(): readonly string[];
  accepting(): boolean;
  predecessor(runtimeId: string): object | null;
  verifyPredecessor(capability: object, runtimeId: string): boolean;
  acknowledge(remainingRuntimeIds: readonly string[]): Promise<void>;
  beginUse(target: CredentialUseTarget): Promise<void>;
  absentUse(target: CredentialUseTarget): Promise<boolean>;
}>;
const acquiredOwners = new WeakSet<CredentialRuntimeOwner>();
export async function acquireCredentialRuntime(
  directory: string,
  canonicalDatabasePath: string,
  provider: Provider,
  db: Database,
  unitOfWorkProvider: HollowUnitOfWorkProvider,
): Promise<CredentialRuntimeOwner> {
  if (
    !(unitOfWorkProvider instanceof LibsqlHollowUnitOfWorkProvider) ||
    !unitOfWorkProvider.sameDatabase(db)
  )
    throw unavailable();
  const databaseFile = localDatabaseFile(db);
  if (
    databaseFile === null ||
    (await realpath(databaseFile)) !== canonicalDatabasePath
  )
    throw unavailable();
  if (
    !process.getuid ||
    !isAbsolute(directory) ||
    !isAbsolute(canonicalDatabasePath) ||
    (await realpath(canonicalDatabasePath)) !== canonicalDatabasePath
  )
    throw unavailable();
  const database = await lstat(canonicalDatabasePath, { bigint: true });
  if (
    !database.isFile() ||
    database.isSymbolicLink() ||
    database.uid !== BigInt(process.getuid()) ||
    (database.mode & 0o7777n) !== 0o600n
  )
    throw unavailable();
  const binding = createHash("sha256")
    .update(
      JSON.stringify([
        provider,
        canonicalDatabasePath,
        String(database.dev),
        String(database.ino),
      ]),
    )
    .digest("hex");
  const parent = dirname(directory);
  await mkdir(parent, { mode: 0o700 }).catch((e) => {
    if (!(e instanceof Error && "code" in e && e.code === "EEXIST")) throw e;
  });
  const parentStat = await lstat(parent, { bigint: true });
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    parentStat.uid !== BigInt(process.getuid()) ||
    (parentStat.mode & 0o7777n) !== 0o700n ||
    (await realpath(parent)) !== parent
  )
    throw unavailable();
  await mkdir(directory, { mode: 0o700 }).catch((e) => {
    if (!(e instanceof Error && "code" in e && e.code === "EEXIST")) throw e;
  });
  const stat = await lstat(directory, { bigint: true });
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== BigInt(process.getuid()) ||
    (stat.mode & 0o7777n) !== 0o700n ||
    (await realpath(directory)) !== directory
  )
    throw unavailable();
  const lockPath = join(directory, "recovery.lock");
  const recordPath = join(directory, "owner.json");
  let lock: FileHandle | null = null;
  let lockIdentity: Readonly<{ dev: bigint; ino: bigint }> | null = null;
  const releaseLock = async () => {
    if (lock) {
      await lock.close();
      const actual = await lstat(lockPath, { bigint: true });
      if (
        !lockIdentity ||
        actual.dev !== lockIdentity.dev ||
        actual.ino !== lockIdentity.ino
      )
        throw unavailable();
      await unlink(lockPath);
    }
  };
  try {
    lock = await open(
      lockPath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    lockIdentity = await lock.stat({ bigint: true });
    let previous: Awaited<ReturnType<typeof readRecord>> | null;
    try {
      previous = await readRecord(recordPath);
    } catch (e) {
      if (!absent(e)) throw e;
      previous = null;
    }
    if (
      previous &&
      (previous.value.namespace !== provider ||
        previous.value.databaseBinding !== binding ||
        previous.value.predecessors.length >= 64 ||
        !knownPidAbsent(previous.value.pid) ||
        (await readRecord(recordPath)).text !== previous.text)
    )
      throw unavailable();
    let record: OwnerRecord = {
      version: 1,
      mode: "credential-use-v1",
      namespace: provider,
      databaseBinding: binding,
      runtimeId: randomUUID(),
      pid: process.pid,
      predecessors: [
        ...(previous?.value.predecessors ?? []),
        ...(previous
          ? [
              {
                runtimeId: previous.value.runtimeId,
                provenance: "acquire-confirmed" as const,
              },
            ]
          : []),
      ],
    };
    const sameDirectory = async () => {
      const current = await lstat(directory, { bigint: true });
      const currentParent = await lstat(parent, { bigint: true });
      const currentDb = await lstat(canonicalDatabasePath, { bigint: true });
      if (
        current.dev !== stat.dev ||
        current.ino !== stat.ino ||
        current.mode !== stat.mode ||
        current.uid !== stat.uid ||
        currentParent.dev !== parentStat.dev ||
        currentParent.ino !== parentStat.ino ||
        currentParent.mode !== parentStat.mode ||
        currentParent.uid !== parentStat.uid ||
        currentDb.dev !== database.dev ||
        currentDb.ino !== database.ino ||
        currentDb.uid !== database.uid ||
        currentDb.mode !== database.mode
      )
        throw unavailable();
    };
    const persist = async (value: OwnerRecord) => {
      await sameDirectory();
      const text = JSON.stringify(value);
      if (Buffer.byteLength(text) > 16_384) throw unavailable();
      const temporary = join(directory, `owner-${randomUUID()}.tmp`);
      const file = await open(
        temporary,
        constants.O_CREAT |
          constants.O_EXCL |
          constants.O_WRONLY |
          constants.O_NOFOLLOW,
        0o600,
      );
      try {
        await file.writeFile(text);
        await file.sync();
      } finally {
        await file.close();
      }
      await sameDirectory();
      await rename(temporary, recordPath);
      const dir = await open(
        directory,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        await dir.sync();
      } finally {
        await dir.close();
      }
      await sameDirectory();
      if ((await readRecord(recordPath)).text !== text) throw unavailable();
    };
    await persist(record);
    const capabilities = new Map(
      record.predecessors.map((p) => [p.runtimeId, Object.freeze({})]),
    );
    const exact = new WeakMap<object, string>();
    for (const [id, capability] of capabilities) exact.set(capability, id);
    let pending: Promise<void> = Promise.resolve();
    const acquired: CredentialRuntimeOwner = {
      provider,
      runtimeId: record.runtimeId,
      beginUse: (target) =>
        unitOfWorkProvider.run((u) =>
          u.accountDeletions.beginCredentialUse(target),
        ),
      absentUse: (target) =>
        unitOfWorkProvider.run(
          async (u) =>
            (await u.accountDeletions.credentialUse(target.id)) === null,
        ),
      recoverableRuntimeIds: () => [record.runtimeId, ...capabilities.keys()],
      accepting: () => capabilities.size === 0,
      predecessor: (id) => capabilities.get(id) ?? null,
      verifyPredecessor: (capability, id) =>
        exact.get(capability) === id && capabilities.get(id) === capability,
      acknowledge(remaining) {
        const operation = pending.then(async () => {
          const keep = new Set(remaining);
          if ((await readRecord(recordPath)).text !== JSON.stringify(record))
            throw unavailable();
          const removed = record.predecessors.filter(
            (p) => !keep.has(p.runtimeId),
          );
          if (!removed.length) return;
          const next = {
            ...record,
            predecessors: record.predecessors.filter((p) =>
              keep.has(p.runtimeId),
            ),
          };
          await persist(next);
          record = next;
          for (const p of removed) capabilities.delete(p.runtimeId);
        });
        pending = operation.catch(() => {});
        return operation;
      },
    };
    acquiredOwners.add(acquired);
    return Object.freeze(acquired);
  } finally {
    await releaseLock();
  }
}

type Entry = {
  target: CredentialUseTarget;
  signal: AbortSignal;
  resources: number;
  admitted: boolean;
  ended: boolean;
  proof: CredentialClosedProof | null;
  observe(): void;
};
type TransportState = {
  entries: WeakMap<AbortSignal, Entry>;
  bound: object | null;
};
export type NativeCredentialTransport = Readonly<{
  register(signal: AbortSignal): () => void;
  follow(parent: AbortSignal, child: AbortSignal): void;
}>;
const transports = new WeakMap<NativeCredentialTransport, TransportState>();
export function nativeCredentialTransport(
  factory: unknown,
): NativeCredentialTransport | null {
  if (factory !== request) return null;
  const state: TransportState = { entries: new WeakMap(), bound: null };
  const capability: NativeCredentialTransport = Object.freeze({
    follow(parent: AbortSignal, child: AbortSignal) {
      const entry = state.entries.get(parent);
      if (entry) state.entries.set(child, entry);
    },
    register(signal: AbortSignal) {
      const entry = state.entries.get(signal);
      if (!entry) return () => {};
      if (entry.ended || entry.resources >= 4) throw unavailable();
      entry.resources++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          entry.resources--;
          entry.observe();
        }
      };
    },
  });
  transports.set(capability, state);
  return capability;
}
const targetKey = credentialUseKey;
export class NodeCredentialUses implements OwnedCredentialExecution {
  readonly credentialOwnership = "native-v1";
  readonly provider: Provider;
  private readonly entries = new Map<string, Entry>();
  private readonly proofs = new WeakMap<
    CredentialClosedProof,
    Readonly<{ key: string; predecessor: object | null }>
  >();
  private readonly predecessorProofs = new Map<string, CredentialClosedProof>();
  private readonly transport: TransportState;
  constructor(
    private readonly owner: CredentialRuntimeOwner,
    transport: NativeCredentialTransport,
    private readonly nativeProvider: object,
  ) {
    const state = transports.get(transport);
    if (!state || state.bound || !acquiredOwners.has(owner))
      throw unavailable();
    state.bound = this;
    this.transport = state;
    this.provider = owner.provider;
  }
  supportsProvider(provider: object) {
    return provider === this.nativeProvider;
  }
  recoverableRuntimeIds() {
    return this.owner.recoverableRuntimeIds();
  }
  target(
    id: string,
    binding: CredentialUseBinding,
    token: string,
  ): CredentialUseTarget {
    if (binding.provider !== this.provider || !id || !token)
      throw unavailable();
    return {
      id,
      binding: structuredClone(binding),
      owner: { runtimeId: this.owner.runtimeId, token, generation: 1 },
    };
  }
  async runOwned<T>(
    target: CredentialUseTarget,
    signal: AbortSignal,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  async runOwned<T>(
    target: CredentialUseTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  async runOwned<T>(
    target: CredentialUseTarget,
    input: AbortSignal | ((signal: AbortSignal) => Promise<T>),
    callback?: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const signal =
      typeof input === "function" ? new AbortController().signal : input;
    const work = typeof input === "function" ? input : callback;
    const key = targetKey(target);
    if (
      !work ||
      !this.owner.accepting() ||
      target.binding.provider !== this.provider ||
      target.owner.runtimeId !== this.owner.runtimeId ||
      target.owner.generation !== 1 ||
      this.entries.has(key) ||
      this.entries.size + this.predecessorProofs.size >= 67
    )
      throw unavailable();
    const entry: Entry = {
      target: structuredClone(target),
      signal,
      resources: 0,
      admitted: false,
      ended: false,
      proof: null,
      observe: () => {
        if (!entry.ended || entry.resources !== 0 || entry.proof) return;
        const proof: CredentialClosedProof = Object.freeze({
          target: entry.target,
          evidenceId: randomUUID(),
          source: "local-close",
        });
        entry.proof = proof;
        this.proofs.set(proof, { key, predecessor: null });
      },
    };
    this.entries.set(key, entry);
    this.transport.entries.set(signal, entry);
    try {
      await this.owner.beginUse(entry.target);
      entry.admitted = true;
      return await work(signal);
    } finally {
      entry.ended = true;
      entry.observe();
    }
  }
  closure(target: CredentialUseTarget) {
    return (
      this.entries.get(targetKey(target))?.proof ??
      this.predecessorProofs.get(targetKey(target)) ??
      null
    );
  }
  predecessor(saved: CredentialUse): CredentialClosedProof | null {
    const target = saved.target;
    const key = targetKey(target);
    const existing = this.predecessorProofs.get(key);
    if (existing) return existing;
    const capability = this.owner.predecessor(target.owner.runtimeId);
    if (
      target.binding.provider !== this.provider ||
      target.owner.generation !== 1 ||
      !capability ||
      !this.owner.verifyPredecessor(capability, target.owner.runtimeId) ||
      this.entries.size + this.predecessorProofs.size >= 67
    )
      return null;
    const proof: CredentialClosedProof = Object.freeze({
      target: structuredClone(target),
      evidenceId: saved.state === "closed" ? saved.evidenceId : randomUUID(),
      source: "predecessor-exit",
    });
    this.predecessorProofs.set(key, proof);
    this.proofs.set(proof, { key, predecessor: capability });
    return proof;
  }
  verify(proof: CredentialClosedProof, saved: CredentialUse) {
    const actual = this.proofs.get(proof);
    if (
      !actual ||
      actual.key !== targetKey(saved.target) ||
      actual.key !== targetKey(proof.target)
    )
      return false;
    if (
      actual.predecessor &&
      !this.owner.verifyPredecessor(
        actual.predecessor,
        saved.target.owner.runtimeId,
      )
    )
      return false;
    return saved.state === "closed"
      ? saved.callerEnded && saved.evidenceId === proof.evidenceId
      : !saved.callerEnded && !saved.acknowledged;
  }
  async acknowledge(proof: CredentialClosedProof) {
    const actual = this.proofs.get(proof);
    if (!actual) throw unavailable();
    if (
      actual.predecessor &&
      !this.owner.verifyPredecessor(
        actual.predecessor,
        proof.target.owner.runtimeId,
      )
    )
      throw unavailable();
    this.entries.delete(actual.key);
    this.predecessorProofs.delete(actual.key);
    this.proofs.delete(proof);
  }
  async cancelUnclaimed(proof: CredentialClosedProof) {
    const actual = this.proofs.get(proof);
    if (!actual || actual.predecessor || actual.key !== targetKey(proof.target))
      return false;
    const entry = this.entries.get(actual.key);
    if (
      !entry ||
      entry.proof !== proof ||
      entry.admitted ||
      !entry.ended ||
      entry.resources !== 0
    )
      return false;
    if (!(await this.owner.absentUse(entry.target))) return false;
    if (
      this.entries.get(actual.key) !== entry ||
      entry.admitted ||
      !entry.ended ||
      entry.resources !== 0 ||
      entry.proof !== proof
    )
      return false;
    this.entries.delete(actual.key);
    this.proofs.delete(proof);
    return true;
  }
  unacknowledged() {
    return [...this.entries.values()]
      .flatMap((entry) => (entry.proof ? [entry.proof] : []))
      .concat([...this.predecessorProofs.values()]);
  }
  async acknowledgePredecessors(remaining: readonly string[]) {
    const proofs = this.unacknowledged().map((p) => p.target.owner.runtimeId);
    await this.owner.acknowledge([...new Set([...remaining, ...proofs])]);
  }
}

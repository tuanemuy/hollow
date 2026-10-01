import type { Account } from "@repo/core/domain/account/entity";
import type { Original } from "@repo/core/domain/import/entity";
import type { DriveConnection } from "@repo/core/domain/integration/drive";
import {
  driveBackupRecordSchema,
  driveBackupTargetSchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import { createNote } from "@repo/core/domain/note/entity";
import {
  machineRegenerationSchema,
  parseRegeneration,
  type SourceAttempt,
  sourceAttemptSchema,
  sourceBindingSchema,
} from "@repo/core/domain/regeneration/entity";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { describe, expect, it, vi } from "vitest";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type {
  DriveClosedProof,
  DriveOwnedResult,
} from "../integration/drive/ports";
import {
  acknowledgeSourceClosure,
  reconcileDriveClosures,
} from "../integration/drive/runner";
import type {
  RegenerationInput,
  RegenerationServices,
  SourceExecution,
  SourceInputLease,
} from "./services";
import { readInput } from "./source";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-10-01T00:00:00.000Z");
function closedWorld<T extends object>(values: Partial<T>): T {
  return new Proxy(values, {
    get(target, key) {
      if (!Object.hasOwn(target, key))
        throw new Error("UNEXPECTED_PORT_ACCESS");
      return Reflect.get(target, key);
    },
    set() {
      throw new Error("UNEXPECTED_PORT_WRITE");
    },
  }) as T;
}
function gate() {
  let release: () => void = () => {
    throw new Error("GATE_NOT_INITIALIZED");
  };
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release() };
}
function fixture() {
  const lease: SourceInputLease = {
    receipt: {
      consumer: { kind: "machine-regeneration", id: id(1) },
      runtimeId: id(2),
      token: id(3),
      generation: 1,
      state: "active",
    },
  };
  const record = parseDriveBackup(driveBackupRecordSchema, {
    id: id(10),
    version: 1,
    targetId: id(11),
    noteId: id(5),
    originalId: id(6),
    accountId: id(12),
    subject: "self-subject",
    fileId: "self-file",
    folder: {
      id: "self-folder",
      name: "Fixture",
      driveId: null,
      resourceKeyEnvelope: null,
      checkedAt: now,
    },
    bytes: 1,
    sha256: "a".repeat(64),
    createdAt: now,
    webViewLink: null,
    resourceKeyEnvelope: null,
  });
  const target = parseDriveBackup(driveBackupTargetSchema, {
    id: record.targetId,
    originalId: record.originalId,
    noteId: record.noteId,
    accountId: record.accountId,
    subject: record.subject,
    marker: id(13),
    folder: record.folder,
    folderEpoch: 1,
    version: 1,
    createdAt: now,
    updatedAt: now,
    state: "confirmed",
    fileId: record.fileId,
  });
  const binding = parseRegeneration(sourceBindingSchema, {
    id: id(14),
    recordId: record.id,
    executorId: id(4),
    credentialOwnerId: record.accountId,
    noteId: record.noteId,
    originalId: record.originalId,
    subject: record.subject,
    driveEpoch: 1,
    ownershipGeneration: 1,
    fingerprint: "b".repeat(64),
    consumer: lease.receipt.consumer,
    cancelGeneration: 0,
    version: 1,
    createdAt: now,
  });
  const machine = parseRegeneration(machineRegenerationSchema, {
    id: id(1),
    executorId: id(4),
    noteId: id(5),
    originalId: id(6),
    commandId: id(7),
    requestDigest: "a".repeat(64),
    access: { origin: "drive-record", bindingId: binding.id },
    sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    inputReceipt: lease.receipt,
    source: { sha256: record.sha256, bytes: record.bytes, format: "html" },
    noteVersion: 0,
    ownershipGeneration: 1,
    originalRevisionNo: 1,
    previous: { state: "ready", coverage: "complete", activeJobId: id(8) },
    phase: "acquiring",
    outcome: "pending",
    failure: null,
    resultVersion: null,
    owner: { state: "active", runtimeId: id(2), token: id(3) },
    cancelGeneration: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deadlineAt: new Date(now.getTime() + 60_000),
    terminalAt: null,
  });
  const original: Original = {
    id: record.originalId,
    noteId: record.noteId,
    accountId: id(4),
    name: "own.html",
    bytes: record.bytes,
    sha256: record.sha256,
    storageKey: "unused-local",
    format: "html",
    state: "ready",
    coverage: "complete",
    activeJobId: id(8),
    createdAt: now,
  };
  const account = (accountId: string): Account => ({
    id: accountId,
    email: "self@example.test",
    passwordHash: "synthetic",
    google: null,
    authVersion: 1,
    createdAt: now,
    status: "verified",
    verifiedAt: now,
  });
  const linked: Extract<DriveConnection, { state: "linked" }> = {
    accountId: record.accountId,
    epoch: 1,
    version: 1,
    credentialVersion: 1,
    settingsVersion: 1,
    admissionSequence: 0,
    autoBackup: false,
    lastUsedAt: null,
    updatedAt: now,
    state: "linked",
    folder: null,
    credential: {
      subject: record.subject,
      email: "self@example.test",
      envelope: "synthetic-envelope",
      scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
      accessExpiresAt: new Date(now.getTime() + 60_000),
      connectedAt: now,
    },
  };
  const state = {
    connection: linked,
    note: createNote(
      {
        id: record.noteId,
        accountId: id(4),
        title: "Fixture",
        html: "",
        text: "",
      },
      now,
    ),
    caller: "untracked" as "pending" | "ended" | "untracked",
    proof: null as DriveClosedProof | null,
    attempts: new Map<string, SourceAttempt>(),
    revokeBeforeWire: false,
    holdAck: false,
    failAckCas: false,
    ackReady: false,
    ackFault: "none" as
      | "none"
      | "saved"
      | "unsaved"
      | "read-failed"
      | "programming"
      | "proof-missing",
    injected: 0,
    rechecks: 0,
    predecessorRuntime: null as string | null,
    wire: 0,
  };
  const waiting = gate();
  const changed = gate();
  const ackEntered = gate();
  const ackRelease = gate();
  const adopt = vi.fn<RegenerationInput["adopt"]>();
  const endRead = vi.fn<RegenerationInput["endRead"]>();
  const startRead = vi.fn<RegenerationInput["startRead"]>();
  const confirm = vi.fn<SourceExecution["confirmSourceAcknowledged"]>(
    async () => {},
  );
  const predecessorAck = vi.fn<SourceExecution["acknowledgePredecessor"]>(
    async () => {},
  );
  const calls: string[] = [];
  const execution = closedWorld<SourceExecution>({
    changeRevision: () => 1,
    async waitForChange(revision) {
      expect(revision).toBe(1);
      calls.push("wait");
      waiting.release();
      await changed.promise;
      return "changed";
    },
    async withCaller(_target, claim, settle) {
      calls.push("caller");
      state.caller = "pending";
      try {
        const value = await claim();
        return value === null
          ? { kind: "not-claimed" as const }
          : { kind: "settled" as const, value: await settle(value) };
      } finally {
        state.caller = "ended";
      }
    },
    run<T>(
      executionTarget: DriveClosedProof["target"],
      work: (signal: AbortSignal) => Promise<T>,
    ) {
      calls.push("run");
      const controller = new AbortController();
      const result: Promise<DriveOwnedResult<T>> = work(controller.signal).then(
        (value): DriveOwnedResult<T> => ({ kind: "value", value }),
        (): DriveOwnedResult<T> => ({
          kind: "failure",
          code: "DRIVE_UNAVAILABLE",
          delivery: "not-sent",
          credentialRejection: null,
        }),
      );
      const closed = result.then(() => {
        state.proof = {
          target: executionTarget,
          evidenceId: id(40),
          source: "local-close",
        };
      });
      return { result, closed, abort: () => controller.abort() };
    },
    closure: () =>
      state.proof ? { kind: "closed", proof: state.proof } : { kind: "held" },
    caller: () => state.caller,
    async coordinate(phase, work) {
      expect(phase).toBe("maintenance");
      return work();
    },
    async acknowledge() {
      calls.push("ack");
      ackEntered.release();
      if (state.holdAck) await ackRelease.promise;
      state.ackReady = true;
    },
    confirmSourceAcknowledged: confirm,
    unacknowledged: () => [],
    predecessors: () =>
      state.predecessorRuntime
        ? [{ runtimeGeneration: state.predecessorRuntime, evidenceId: id(95) }]
        : [],
    acknowledgePredecessor: predecessorAck,
  });
  const drive = closedWorld<RegenerationServices["drive"]>({
    runtimeGeneration: id(41),
    execution,
    protector: {
      available: () => true,
      protect: () => {
        throw new Error("UNEXPECTED_PROTECT");
      },
      reveal: () =>
        JSON.stringify({
          version: 1,
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
        }),
    },
  });
  const u = closedWorld<HollowUnitOfWorkContext>({
    machineRegenerations: closedWorld<
      HollowUnitOfWorkContext["machineRegenerations"]
    >({ find: async () => machine }),
    accounts: closedWorld<HollowUnitOfWorkContext["accounts"]>({
      findById: async (accountId) => account(accountId),
    }),
    notes: closedWorld<HollowUnitOfWorkContext["notes"]>({
      findById: async () => state.note,
    }),
    imports: closedWorld<HollowUnitOfWorkContext["imports"]>({
      findOriginal: async () => original,
    }),
    driveBackupTransfers: closedWorld<
      HollowUnitOfWorkContext["driveBackupTransfers"]
    >({ sourceGeneration: async () => 1, scan: async () => [] }),
    driveAttempts: closedWorld<HollowUnitOfWorkContext["driveAttempts"]>({
      scan: async () => [],
    }),
    driveControls: closedWorld<HollowUnitOfWorkContext["driveControls"]>({
      scan: async () => [],
    }),
    regenerationBindings: closedWorld<
      HollowUnitOfWorkContext["regenerationBindings"]
    >({ find: async () => binding }),
    regenerationRecords: closedWorld<
      HollowUnitOfWorkContext["regenerationRecords"]
    >({ find: async () => record }),
    driveConnections: closedWorld<HollowUnitOfWorkContext["driveConnections"]>({
      find: async () => state.connection,
    }),
    driveBackupTargets: closedWorld<
      HollowUnitOfWorkContext["driveBackupTargets"]
    >({ find: async () => target }),
    regenerationAttempts: closedWorld<
      HollowUnitOfWorkContext["regenerationAttempts"]
    >({
      find: async (attemptId) => state.attempts.get(attemptId) ?? null,
      forBinding: async () => [...state.attempts.values()],
      held: async () =>
        [...state.attempts.values()].filter(
          (a) =>
            a.owner.state === "active" ||
            a.owner.state === "unknown" ||
            (a.owner.state === "closed" &&
              a.completion?.kind === "closed" &&
              (!a.completion.callerEnded || !a.completion.acknowledged)),
        ),
      async insert(value) {
        state.attempts.set(
          value.id,
          parseRegeneration(sourceAttemptSchema, value),
        );
      },
      async claim(value, version) {
        expect(state.attempts.get(value.id)?.version).toBe(version);
        state.attempts.set(
          value.id,
          parseRegeneration(sourceAttemptSchema, value),
        );
        return true;
      },
      async replace(value, version) {
        expect(state.attempts.get(value.id)?.version).toBe(version);
        if (
          state.failAckCas &&
          value.phase === "terminal" &&
          value.completion.kind === "closed" &&
          value.completion.acknowledged
        )
          return false;
        state.attempts.set(
          value.id,
          parseRegeneration(sourceAttemptSchema, value),
        );
        return true;
      },
    }),
  });
  let sequence = 50;
  const c = closedWorld<HollowContainer>({
    clock: { now: () => now },
    idGenerator: {
      next: () => id(sequence++),
      validate: (value) => /^[0-9a-f-]{36}$/.test(value),
    },
    unitOfWorkProvider: {
      async run(work) {
        if (state.ackReady && state.ackFault !== "none" && !state.injected) {
          const before = new Map(state.attempts);
          await work(u);
          state.injected++;
          if (state.ackFault === "unsaved") state.attempts = before;
          if (state.ackFault === "proof-missing") state.proof = null;
          if (state.ackFault === "programming")
            throw new TypeError("synthetic");
          throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
        }
        if (state.injected) {
          state.rechecks++;
          if (state.ackFault === "read-failed")
            throw new SystemError(SystemErrorCode.DatabaseError, "synthetic");
        }
        return work(u);
      },
    },
    drive,
  });
  const services = closedWorld<RegenerationServices>({
    drive,
    input: closedWorld<RegenerationInput>({
      startRead,
      endRead,
      adopt,
      unknown: () => {
        throw new Error("UNEXPECTED_UNKNOWN");
      },
    }),
    provider: {
      async read(request) {
        if (state.revokeBeforeWire)
          state.note = { ...state.note, version: state.note.version + 1 };
        await request.checkCurrent();
        state.wire++;
        return Uint8Array.of(1);
      },
      inspect: async () => {
        throw new Error("UNEXPECTED_INSPECT");
      },
    },
  });
  return {
    c,
    services,
    lease,
    state,
    calls,
    adopt,
    endRead,
    startRead,
    confirm,
    predecessorAck,
    waiting,
    changed,
    ackEntered,
    ackRelease,
    read: () => readInput(c, services, lease, new AbortController().signal),
  };
}

describe("regeneration source application ports without DB or HTTP", () => {
  for (const phase of [
    "active",
    "unknown",
    "closed-caller",
    "closed-ack",
    "safe",
  ] as const) {
    it(`reconcile retains predecessor proof for ${phase} until the same held definition is empty`, async () => {
      const f = fixture();
      await f.read();
      const old = [...f.state.attempts.values()][0];
      if (
        !old ||
        old.owner.state !== "closed" ||
        old.completion?.kind !== "closed"
      )
        throw Error("FIXTURE_STATE");
      f.state.predecessorRuntime = old.owner.runtimeId;
      f.state.proof = null;
      const row = parseRegeneration(
        sourceAttemptSchema,
        phase === "active" || phase === "unknown"
          ? {
              ...old,
              phase,
              owner: { ...old.owner, state: phase },
              completion: null,
            }
          : {
              ...old,
              completion: {
                ...old.completion,
                callerEnded: phase !== "closed-caller",
                acknowledged: phase === "safe",
              },
            },
      );
      f.state.attempts.set(row.id, row);
      expect(await reconcileDriveClosures(f.c)).toBe(0);
      expect(f.predecessorAck).toHaveBeenCalledTimes(phase === "safe" ? 1 : 0);
      expect(f.state.attempts.get(row.id)).toEqual(row);
      expect(f.state.wire).toBe(1);
    });
  }
  it("rejects the held scan sentinel rather than declaring the predecessor empty", async () => {
    const f = fixture();
    await f.read();
    const old = [...f.state.attempts.values()][0];
    if (
      !old ||
      old.owner.state !== "closed" ||
      old.completion?.kind !== "closed"
    )
      throw Error("FIXTURE_STATE");
    f.state.predecessorRuntime = old.owner.runtimeId;
    f.state.proof = null;
    for (const key of [old.id, id(99)])
      f.state.attempts.set(
        key,
        parseRegeneration(sourceAttemptSchema, {
          ...old,
          id: key,
          completion: { ...old.completion, acknowledged: false },
        }),
      );
    await expect(reconcileDriveClosures(f.c)).rejects.toMatchObject({
      code: "DRIVE_CONTEXT_CHANGED",
    });
    expect(f.predecessorAck).not.toHaveBeenCalled();
  });
  it("rejects mismatched predecessor closure evidence before any ACK or wire", async () => {
    const f = fixture();
    await f.read();
    const proof = f.state.proof;
    if (!proof) throw Error("FIXTURE_STATE");
    const prior = f.confirm.mock.calls.length;
    await expect(
      acknowledgeSourceClosure(f.c, {
        ...proof,
        evidenceId: id(99),
        source: "predecessor-exit",
      }),
    ).rejects.toMatchObject({ code: "DRIVE_CONTEXT_CHANGED" });
    expect(f.confirm).toHaveBeenCalledTimes(prior);
    expect(f.state.wire).toBe(1);
  });
  for (const fault of [
    "saved",
    "unsaved",
    "read-failed",
    "programming",
    "proof-missing",
  ] as const) {
    it(`keeps ACK result uncertainty bounded for ${fault}`, async () => {
      const f = fixture();
      f.state.ackFault = fault;
      if (fault === "saved") await f.read();
      else await expect(f.read()).rejects.toBeDefined();
      expect(f.state.injected).toBe(1);
      expect(f.state.wire).toBe(1);
      expect(f.adopt).toHaveBeenCalledTimes(fault === "saved" ? 1 : 0);
      expect(f.confirm).toHaveBeenCalledTimes(fault === "saved" ? 1 : 0);
      expect(f.state.rechecks).toBe(
        fault === "programming" ? 0 : fault === "saved" ? 2 : 1,
      );
      if (fault === "unsaved")
        expect([...f.state.attempts.values()][0]?.completion).toMatchObject({
          acknowledged: false,
        });
    });
  }
  it("waits for expired-credential notification without a data owner and recaptures before claiming", async () => {
    const f = fixture();
    f.state.connection = {
      ...f.state.connection,
      credential: { ...f.state.connection.credential, accessExpiresAt: now },
    };
    const pending = f.read();
    await f.waiting.promise;
    expect(f.calls).toEqual(["wait"]);
    expect(f.state.attempts.size).toBe(0);
    expect(f.state.wire).toBe(0);
    expect(f.adopt).not.toHaveBeenCalled();
    f.state.connection = {
      ...f.state.connection,
      version: 2,
      credentialVersion: 2,
      credential: {
        ...f.state.connection.credential,
        accessExpiresAt: new Date(now.getTime() + 60_000),
      },
    };
    f.changed.release();
    await pending;
    expect(f.calls).toEqual(["wait", "caller", "run", "ack"]);
    expect([...f.state.attempts.values()][0]?.credentialVersion).toBe(2);
    expect(f.adopt).toHaveBeenCalledOnce();
    expect(f.confirm).toHaveBeenCalledOnce();
  });
  it("does not claim if the notification leaves the credential expired", async () => {
    const f = fixture();
    f.state.connection = {
      ...f.state.connection,
      credential: { ...f.state.connection.credential, accessExpiresAt: now },
    };
    const pending = f.read();
    const rejected = expect(pending).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    await f.waiting.promise;
    f.changed.release();
    await rejected;
    expect(f.calls).toEqual(["wait"]);
    expect(f.state.attempts.size).toBe(0);
    expect(f.endRead).toHaveBeenCalledOnce();
  });
  it("rejects lost currentness at the provider check before the synthetic wire", async () => {
    const f = fixture();
    f.state.revokeBeforeWire = true;
    await expect(f.read()).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.state.wire).toBe(0);
    expect(f.adopt).not.toHaveBeenCalled();
    expect(f.endRead).toHaveBeenCalledOnce();
    expect([...f.state.attempts.values()][0]).toMatchObject({
      phase: "terminal",
      completion: { outcome: "failed", acknowledged: true },
    });
  });
  it("does not adopt bytes or finish the read while source ACK is pending", async () => {
    const f = fixture();
    f.state.holdAck = true;
    const pending = f.read();
    await f.ackEntered.promise;
    expect(f.state.caller).toBe("ended");
    expect(f.state.wire).toBe(1);
    expect(f.adopt).not.toHaveBeenCalled();
    expect(f.endRead).not.toHaveBeenCalled();
    expect(f.confirm).not.toHaveBeenCalled();
    f.ackRelease.release();
    await pending;
    expect(f.adopt).toHaveBeenCalledWith(f.lease, Uint8Array.of(1));
    expect(f.endRead).toHaveBeenCalledOnce();
    expect(f.confirm).toHaveBeenCalledOnce();
  });
  it("does not adopt bytes when execution ACK succeeds but DB ACK CAS fails", async () => {
    const f = fixture();
    f.state.failAckCas = true;
    await expect(f.read()).rejects.toMatchObject({
      code: "DRIVE_CONTEXT_CHANGED",
    });
    expect(f.state.wire).toBe(1);
    expect(f.adopt).not.toHaveBeenCalled();
    expect(f.confirm).not.toHaveBeenCalled();
    expect(f.endRead).toHaveBeenCalledOnce();
    expect([...f.state.attempts.values()][0]).toMatchObject({
      phase: "terminal",
      completion: { callerEnded: true, acknowledged: false },
    });
  });
});

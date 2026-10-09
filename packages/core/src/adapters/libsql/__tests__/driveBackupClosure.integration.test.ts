import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { cancelDriveBackups } from "@repo/core/application/integration/drive/backup/cancellation";
import { backupPhase } from "@repo/core/application/integration/drive/backup/runner";
import {
  type DriveContinuation,
  runDriveControl,
} from "@repo/core/application/integration/drive/folders";
import type {
  DriveClosedProof,
  DriveServices,
} from "@repo/core/application/integration/drive/ports";
import { reconcileDriveClosures } from "@repo/core/application/integration/drive/runner";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_LIMITS,
  type DriveControl,
  driveConnectionSchema,
  driveControlSchema,
  parseDrive,
} from "@repo/core/domain/integration/drive";
import {
  type DriveBackupJob,
  type DriveBackupTransfer,
  driveBackupTransferSchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backupNow, closedWorld, finite, gate } from "./driveBackupFixtures";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function memory() {
  let row: DriveBackupTransfer = parseDriveBackup(driveBackupTransferSchema, {
    id: id(1),
    jobId: id(2),
    targetId: id(3),
    phase: "checking",
    identity: {
      noteId: id(4),
      originalId: id(5),
      accountId: id(6),
      workspaceId: null,
      ownershipGeneration: 1,
      storageKey: "memory-original",
      bytes: 1024,
      sha256: "a".repeat(64),
      name: "original.pdf",
      subject: "subject",
      epoch: 1,
      settingsVersion: 1,
      folder: {
        id: "folder",
        name: "Folder",
        driveId: null,
        resourceKeyEnvelope: null,
        checkedAt: backupNow,
      },
    },
    owner: { state: "active", runtimeGeneration: "runtime", token: "owner" },
    credentialVersion: 1,
    version: 2,
    cancelGeneration: 0,
    received: 128,
    sessionEnvelope: "opaque",
    statusAttempts: 0,
    createdAt: backupNow,
    updatedAt: backupNow,
    deadlineAt: new Date(backupNow.getTime() + 1_800_000),
    readPinned: true,
    refreshPending: true,
  });
  let job: DriveBackupJob = {
    id: id(2),
    requestId: id(7),
    accountId: id(6),
    ordinal: 0,
    attempt: 1,
    retryOf: null,
    noteId: id(4),
    targetId: id(3),
    title: "Original",
    version: 2,
    createdAt: backupNow,
    updatedAt: backupNow,
    state: "running",
    terminalAt: null,
    bytes: 128,
  };
  let rollback = false;
  let wakes = 0;
  const execution = new NodeDriveExecution("runtime", undefined, {
    operationMs: 100,
    backupMs: 100,
    closeMs: 5,
  });
  const uow: HollowUnitOfWorkProvider = {
    async run(work) {
      let candidate = structuredClone(row);
      let candidateJob = structuredClone(job);
      const notifications: (() => undefined)[] = [];
      const transfers = closedWorld<
        HollowUnitOfWorkContext["driveBackupTransfers"]
      >({
        find: async (key) =>
          key === candidate.id ? structuredClone(candidate) : null,
        scan: async (kind) =>
          kind === "held" &&
          (candidate.owner.state === "active" ||
            candidate.owner.state === "unknown")
            ? [structuredClone(candidate)]
            : [],
        async replace(next, version) {
          if (candidate.version !== version) return false;
          candidate = parseDriveBackup(driveBackupTransferSchema, next);
          return true;
        },
        async cancel(scope, now) {
          const matches =
            scope.kind === "note"
              ? scope.noteId === candidate.identity.noteId
              : scope.kind === "account"
                ? scope.accountId === candidate.identity.accountId &&
                  (scope.epoch === undefined ||
                    scope.epoch === candidate.identity.epoch)
                : false;
          if (!matches) return [];
          if (!["succeeded", "failed", "cancelled"].includes(candidate.phase)) {
            candidate = backupPhase(
              candidate,
              "cancelled",
              { cancelGeneration: candidate.cancelGeneration + 1 },
              now,
            );
            candidateJob = {
              ...candidateJob,
              state: "cancelled",
              bytes: candidate.received,
              terminalAt: now,
              updatedAt: now,
              version: candidateJob.version + 1,
            };
          }
          return [structuredClone(candidate)];
        },
      });
      const context = closedWorld<HollowUnitOfWorkContext>({
        regenerationAttempts: closedWorld<
          HollowUnitOfWorkContext["regenerationAttempts"]
        >({ held: async () => [] }),
        accounts: closedWorld<HollowUnitOfWorkContext["accounts"]>({
          findById: async () => null,
        }),
        notes: closedWorld<HollowUnitOfWorkContext["notes"]>({
          findById: async () => null,
        }),
        imports: closedWorld<HollowUnitOfWorkContext["imports"]>({
          findByNote: async () => null,
        }),
        driveConnections: closedWorld<
          HollowUnitOfWorkContext["driveConnections"]
        >({ find: async () => null }),
        driveBackupTargets: closedWorld<
          HollowUnitOfWorkContext["driveBackupTargets"]
        >({ find: async () => null }),
        driveBackupTransfers: transfers,
        driveBackupJobs: closedWorld<
          HollowUnitOfWorkContext["driveBackupJobs"]
        >({
          find: async (key) =>
            key === candidateJob.id ? structuredClone(candidateJob) : null,
          cancelPending: async () => 0,
          async replace(next, version) {
            if (candidateJob.version !== version) return false;
            candidateJob = structuredClone(next);
            return true;
          },
        }),
        driveAttempts: closedWorld<HollowUnitOfWorkContext["driveAttempts"]>({
          scan: async () => [],
        }),
        driveControls: closedWorld<HollowUnitOfWorkContext["driveControls"]>({
          scan: async () => [],
        }),
        afterCommit: (notify) => {
          notifications.push(notify);
        },
      });
      const result = await work(context);
      if (rollback)
        throw new BusinessRuleError(
          "FIXTURE_ROLLBACK",
          "検証用ロールバックです。",
        );
      row = candidate;
      job = candidateJob;
      for (const notify of notifications) notify();
      return result;
    },
  };
  const service = closedWorld<DriveServices>({
    execution,
    wake: () => {
      wakes++;
    },
    protector: {
      available: () => true,
      protect: () => "opaque",
      reveal: () => "opaque",
    },
  });
  const c = closedWorld<HollowContainer>({
    clock: { now: () => backupNow },
    drive: service,
    unitOfWorkProvider: uow,
  });
  const target = {
    kind: "backup" as const,
    id: row.id,
    owner: { runtimeGeneration: "runtime", token: "owner" },
  };
  return {
    c,
    execution,
    target,
    uow,
    row: () => structuredClone(row),
    job: () => structuredClone(job),
    wakes: () => wakes,
    setRollback(value: boolean) {
      rollback = value;
    },
  };
}
type Memory = ReturnType<typeof memory>;

function controlSubscriber(phase: "queued" | "prepared" | "reconciling") {
  let account = verifyAccount(
    createAccount(
      id(80),
      "subscriber@example.test",
      "memory-password",
      backupNow,
    ),
    backupNow,
  );
  const browser = { hash: "subscriber-browser", epoch: 1 };
  const context = {
    accountId: account.id,
    sessionHash: "subscriber-session",
    authVersion: 1,
    browserHash: browser.hash,
    browserEpoch: browser.epoch,
  };
  let connection = parseDrive(driveConnectionSchema, {
    accountId: account.id,
    epoch: 1,
    version: 1,
    credentialVersion: 1,
    settingsVersion: 1,
    admissionSequence: 1,
    autoBackup: false,
    lastUsedAt: null,
    updatedAt: backupNow,
    state: "linked",
    credential: {
      subject: "subscriber-subject",
      email: null,
      envelope: "memory-credential",
      scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
      accessExpiresAt: new Date(backupNow.getTime() + 3_600_000),
      connectedAt: backupNow,
    },
    folder: null,
  });
  const row = parseDrive(driveControlSchema, {
    id: id(81),
    accountId: account.id,
    commandId: id(82),
    intentDigest: "b".repeat(64),
    context,
    expectedEpoch: 1,
    expectedSettingsVersion: 1,
    expectedCredentialVersion: 1,
    version: 2,
    cancelGeneration: 0,
    owner:
      phase === "queued"
        ? { state: "none" }
        : { state: "closed", runtimeGeneration: "runtime", token: "old-owner" },
    credentialUse:
      phase === "queued"
        ? { kind: "none" }
        : {
            kind: "bound",
            runtimeGeneration: "runtime",
            ownerToken: "old-owner",
            version: 1,
          },
    subject: "subscriber-subject",
    createdAt: backupNow,
    expiresAt: new Date(backupNow.getTime() + DRIVE_LIMITS.operationMs),
    updatedAt: backupNow,
    terminalAt: null,
    data:
      phase === "queued"
        ? { kind: "folder-create", phase }
        : {
            kind: "folder-create",
            phase,
            fileId: "allocated-folder",
            marker: "creation-marker",
            sends: phase === "prepared" ? 0 : 1,
            observedParent: null,
          },
  });
  let refreshing = true;
  let refreshChecks = 0;
  let actorChecks = 0;
  const claims: DriveControl[] = [];
  const execution = new NodeDriveExecution("runtime");
  const entered = gate();
  const wait = execution.waitForChange.bind(execution);
  vi.spyOn(execution, "waitForChange").mockImplementation(
    (revision, signal) => {
      const pending = wait(revision, signal);
      entered.resolve();
      return pending;
    },
  );
  const externalWork = vi.spyOn(execution, "run");
  const u = closedWorld<HollowUnitOfWorkContext>({
    accounts: closedWorld<HollowUnitOfWorkContext["accounts"]>({
      findSession: async (hash) =>
        hash === context.sessionHash
          ? {
              tokenHash: hash,
              accountId: account.id,
              browser,
              expiresAt: new Date(backupNow.getTime() + 3_600_000),
            }
          : null,
      findById: async (key) => {
        actorChecks++;
        return key === account.id ? structuredClone(account) : null;
      },
    }),
    authBrowsers: closedWorld<HollowUnitOfWorkContext["authBrowsers"]>({
      find: async (hash) => (hash === browser.hash ? browser : null),
    }),
    driveConnections: closedWorld<HollowUnitOfWorkContext["driveConnections"]>({
      find: async (key) =>
        key === account.id ? structuredClone(connection) : null,
    }),
    driveControls: closedWorld<HollowUnitOfWorkContext["driveControls"]>({
      find: async (key) => (key === row.id ? structuredClone(row) : null),
      claim: async (candidate) => {
        claims.push(structuredClone(candidate));
        return false;
      },
    }),
    driveBackupTransfers: closedWorld<
      HollowUnitOfWorkContext["driveBackupTransfers"]
    >({
      refreshing: async (key, epoch) => {
        refreshChecks++;
        return key === account.id && epoch === connection.epoch && refreshing;
      },
    }),
  });
  const c = closedWorld<HollowContainer>({
    clock: { now: () => backupNow },
    idGenerator: { next: () => id(83), validate: (value) => value === id(83) },
    unitOfWorkProvider: { run: async (work) => work(u) },
    drive: closedWorld<DriveServices>({
      execution,
      protector: {
        available: () => true,
        protect: () => "opaque",
        reveal: () => "opaque",
      },
    }),
  });
  const continuation: DriveContinuation | undefined =
    phase === "reconciling"
      ? { expectedVersion: row.version, phase, action: "inspect", sends: 1 }
      : undefined;
  return {
    execution,
    entered,
    claims,
    externalWork,
    target: {
      kind: "control" as const,
      id: row.id,
      owner: { runtimeGeneration: "runtime", token: id(83) },
    },
    row: () => structuredClone(row),
    checks: () => ({ refresh: refreshChecks, actor: actorChecks }),
    start: () => runDriveControl(c, row.id, "runtime", continuation),
    resolveRefresh() {
      refreshing = false;
      connection = parseDrive(driveConnectionSchema, {
        ...connection,
        credentialVersion: 2,
        version: 2,
      });
    },
    invalidate(kind: "actor" | "epoch") {
      if (kind === "actor") account = { ...account, authVersion: 2 };
      else
        connection = parseDrive(driveConnectionSchema, {
          ...connection,
          epoch: 2,
          version: 2,
        });
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function closedCaller(m: Memory, beforeExit?: () => Promise<void>) {
  return finite(() =>
    m.execution.withCaller(
      m.target,
      async () => true,
      async () => {
        const handle = m.execution.run(m.target, async () => true);
        const closed = finite(() => handle.closed);
        await handle.result;
        expect(await closed).toBe("resolved");
        await beforeExit?.();
        throw new BusinessRuleError(
          "FIXTURE_SAVE_FAILED",
          "検証用保存失敗です。",
        );
      },
    ),
  );
}

describe("Drive backup closure integration with memory-only transactional ports", () => {
  it("keeps claim serialized behind the closed-row save until exact proof ACK completes", async () => {
    const m = memory();
    expect(await closedCaller(m)).toBe("FIXTURE_SAVE_FAILED");
    const ready = gate();
    const release = gate();
    const acknowledge = m.execution.acknowledge.bind(m.execution);
    vi.spyOn(m.execution, "acknowledge").mockImplementation(async (proof) => {
      expect(m.row().owner.state).toBe("closed");
      ready.resolve();
      await release.promise;
      await acknowledge(proof);
    });
    const maintenance = reconcileDriveClosures(m.c);
    await ready.promise;
    expect(m.execution.accepting()).toBe(false);
    let claims = 0;
    const claimant = m.execution.withCaller(
      { ...m.target, owner: { ...m.target.owner, token: "new-owner" } },
      async () => {
        claims++;
        return null;
      },
      async () => {},
    );
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(claims).toBe(0);
    release.resolve();
    expect(await maintenance).toBe(1);
    await claimant;
    expect(claims).toBe(1);
    expect(m.execution.unacknowledged(3)).toHaveLength(0);
    await m.execution.stop();
  });
  it("does not adopt a local proof while the original caller is still pending", async () => {
    const m = memory();
    const ready = gate();
    const exit = gate();
    const task = closedCaller(m, async () => {
      ready.resolve();
      await exit.promise;
    });
    await ready.promise;
    expect(await reconcileDriveClosures(m.c)).toBe(0);
    expect(m.row().owner.state).toBe("active");
    expect(m.row().refreshPending).toBe(true);
    expect(m.execution.unacknowledged(3)).toHaveLength(1);
    exit.resolve();
    expect(await task).toBe("FIXTURE_SAVE_FAILED");
    expect(await reconcileDriveClosures(m.c)).toBe(1);
    expect(m.row().owner.state).toBe("closed");
    expect(m.row().readPinned || m.row().refreshPending).toBe(false);
    expect(m.job().state).toBe("failed");
    await m.execution.stop();
  });
  it("holds proof and pins across rollback, then acknowledges only the committed closure", async () => {
    const m = memory();
    expect(await closedCaller(m)).toBe("FIXTURE_SAVE_FAILED");
    m.setRollback(true);
    expect(await finite(() => reconcileDriveClosures(m.c))).toBe(
      "FIXTURE_ROLLBACK",
    );
    expect(m.row().owner.state).toBe("active");
    expect(m.row().readPinned && m.row().refreshPending).toBe(true);
    expect(m.execution.unacknowledged(3)).toHaveLength(1);
    expect(m.execution.accepting()).toBe(false);
    m.setRollback(false);
    expect(await reconcileDriveClosures(m.c)).toBe(1);
    expect(m.execution.unacknowledged(3)).toHaveLength(0);
    expect(m.row().owner.state).toBe("closed");
    await m.execution.stop();
  });
  it("preserves terminal cancellation progress and time when close proof arrives", async () => {
    const m = memory();
    expect(
      await closedCaller(m, () =>
        m.uow.run((u) =>
          cancelDriveBackups(
            m.c,
            u,
            { kind: "note", noteId: id(4) },
            backupNow,
          ),
        ),
      ),
    ).toBe("FIXTURE_SAVE_FAILED");
    const before = m.row();
    const beforeJob = m.job();
    expect(before.phase).toBe("cancelled");
    expect(await reconcileDriveClosures(m.c)).toBe(1);
    expect(m.row().phase).toBe("cancelled");
    expect(m.row().received).toBe(128);
    expect(m.row().cancelGeneration).toBe(before.cancelGeneration);
    expect(m.job()).toEqual(beforeJob);
    expect(m.row().owner.state).toBe("closed");
    await m.execution.stop();
  });
  it("keeps an unknown refresh and source pin while a control subscriber independently aborts", async () => {
    const m = memory();
    const ready = gate();
    const physical = gate();
    let release: (() => void) | undefined;
    const caller = finite(() =>
      m.execution.withCaller(
        m.target,
        async () => true,
        async () => {
          const handle = m.execution.run(m.target, async (signal) => {
            release = m.execution.register(signal);
            ready.resolve();
            await physical.promise;
            return true;
          });
          const close = finite(() => handle.closed);
          await handle.result;
          expect(await close).toBe("DRIVE_UNAVAILABLE");
          await m.uow.run(async (u) => {
            const old = await u.driveBackupTransfers.find(id(1));
            if (!old || old.owner.state === "none")
              throw new BusinessRuleError(
                "FIXTURE_ROW",
                "検証行がありません。",
              );
            await u.driveBackupTransfers.replace(
              {
                ...old,
                owner: { ...old.owner, state: "unknown" },
                version: old.version + 1,
              },
              old.version,
            );
          });
        },
      ),
    );
    await ready.promise;
    const controller = new AbortController();
    const subscriber = m.execution.waitForChange(
      m.execution.changeRevision(),
      controller.signal,
    );
    controller.abort();
    expect(await subscriber).toBe("stopped");
    expect(m.row().refreshPending).toBe(true);
    await vi.advanceTimersByTimeAsync(105);
    expect(await caller).toBe("resolved");
    await m.uow.run((u) =>
      cancelDriveBackups(
        m.c,
        u,
        { kind: "account", accountId: id(6), epoch: 1 },
        backupNow,
      ),
    );
    expect(m.row().phase).toBe("cancelled");
    expect(m.row().owner.state).toBe("unknown");
    expect(m.row().readPinned && m.row().refreshPending).toBe(true);
    expect(await reconcileDriveClosures(m.c)).toBe(0);
    physical.resolve();
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(await reconcileDriveClosures(m.c)).toBe(1);
    expect(m.row().readPinned || m.row().refreshPending).toBe(false);
    await m.execution.stop();
  });
  it("does not send post-commit abort or wake when the transaction rolls back", async () => {
    const m = memory();
    const ready = gate();
    const exit = gate();
    let ownerSignal: AbortSignal | undefined;
    const caller = finite(() =>
      m.execution.withCaller(
        m.target,
        async () => true,
        async () => {
          const handle = m.execution.run(m.target, async (signal) => {
            ownerSignal = signal;
            ready.resolve();
            await exit.promise;
            return true;
          });
          const closed = finite(() => handle.closed);
          await handle.result;
          await closed;
        },
      ),
    );
    await ready.promise;
    m.setRollback(true);
    expect(
      await finite(() =>
        m.uow.run((u) =>
          cancelDriveBackups(
            m.c,
            u,
            { kind: "note", noteId: id(4) },
            backupNow,
          ),
        ),
      ),
    ).toBe("FIXTURE_ROLLBACK");
    expect(ownerSignal?.aborted).toBe(false);
    expect(m.wakes()).toBe(0);
    expect(m.row().phase).toBe("checking");
    m.setRollback(false);
    await m.uow.run((u) =>
      cancelDriveBackups(m.c, u, { kind: "note", noteId: id(4) }, backupNow),
    );
    expect(ownerSignal?.aborted).toBe(true);
    expect(m.wakes()).toBe(1);
    exit.resolve();
    expect(await caller).toBe("resolved");
    await reconcileDriveClosures(m.c);
    await m.execution.stop();
  });
  it("retries an ACK failure without changing an already committed terminal row", async () => {
    const m = memory();
    await closedCaller(m);
    const acknowledge = m.execution.acknowledge.bind(m.execution);
    m.execution.acknowledge = async () => {
      throw new BusinessRuleError("FIXTURE_ACK_FAILED", "検証用ACK失敗です。");
    };
    expect(await finite(() => reconcileDriveClosures(m.c))).toBe(
      "FIXTURE_ACK_FAILED",
    );
    const committed = m.row();
    expect(committed.owner.state).toBe("closed");
    expect(m.execution.accepting()).toBe(false);
    m.execution.acknowledge = acknowledge;
    expect(await reconcileDriveClosures(m.c)).toBe(1);
    expect(m.row()).toEqual(committed);
    expect(m.execution.accepting()).toBe(true);
    await m.execution.stop();
  });
  it("rejects wrong-owner proof without weakening the persisted pin", async () => {
    const m = memory();
    const proof: DriveClosedProof = {
      target: {
        ...m.target,
        owner: { runtimeGeneration: "runtime", token: "wrong-owner" },
      },
      evidenceId: "proof",
      source: "local-close",
    };
    const caller = m.execution.caller.bind(m.execution);
    const unacknowledged = m.execution.unacknowledged.bind(m.execution);
    m.execution.caller = () => "ended";
    m.execution.unacknowledged = () => [proof];
    expect(await finite(() => reconcileDriveClosures(m.c))).toBe(
      "DRIVE_CONTEXT_CHANGED",
    );
    expect(m.row().owner.state).toBe("active");
    expect(m.row().readPinned).toBe(true);
    m.execution.caller = caller;
    m.execution.unacknowledged = unacknowledged;
    await m.execution.stop();
  });
});

describe("Drive control entry while backup refresh is pending", () => {
  it("waits without a control owner or caller and finishes when execution stops", async () => {
    const m = controlSubscriber("queued");
    const completion = finite(m.start);
    try {
      await m.entered.promise;
      expect(m.row().owner.state).toBe("none");
      expect(m.claims).toHaveLength(0);
      expect(m.execution.caller(m.target)).toBe("untracked");
      expect(m.execution.hasPendingCallers()).toBe(false);
      expect(m.externalWork).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);
      await m.execution.stop();
      expect(await completion).toBe("DRIVE_UNAVAILABLE");
      expect(m.claims).toHaveLength(0);
      expect(m.execution.caller(m.target)).toBe("untracked");
      expect(m.execution.hasPendingCallers()).toBe(false);
      expect(m.execution.unacknowledged(3)).toHaveLength(0);
      expect(m.externalWork).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await m.execution.stop();
      await completion;
    }
  });

  it.each([
    "prepared",
    "reconciling",
  ] as const)("rechecks refresh and credential version after expiry without resetting %s identity", async (phase) => {
    const m = controlSubscriber(phase);
    const original = m.row();
    const task = m.start();
    const completion = finite(() => task);
    try {
      await m.entered.promise;
      expect(m.execution.hasPendingCallers()).toBe(false);
      expect(m.claims).toHaveLength(0);
      expect(m.row()).toEqual(original);
      m.resolveRefresh();
      await vi.advanceTimersByTimeAsync(29_999);
      expect(m.claims).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(await completion).toBe("resolved");
      expect(await task).toEqual({ claimed: false, picker: null });
      expect(m.checks()).toEqual({ refresh: 2, actor: 2 });
      expect(m.claims).toHaveLength(1);
      expect(m.claims[0]).toMatchObject({
        expectedCredentialVersion: 1,
        version: original.version + 1,
        owner: { state: "active", ...m.target.owner },
        credentialUse: {
          kind: "bound",
          ownerToken: m.target.owner.token,
          runtimeGeneration: "runtime",
          version: 2,
        },
        data: {
          kind: "folder-create",
          phase: phase === "prepared" ? "running" : "reconciling",
          fileId: "allocated-folder",
          marker: "creation-marker",
          sends: 1,
          observedParent: null,
        },
      });
      expect(m.row()).toEqual(original);
      expect(m.externalWork).not.toHaveBeenCalled();
      expect(m.execution.caller(m.target)).toBe("untracked");
      expect(m.execution.hasPendingCallers()).toBe(false);
      expect(m.execution.unacknowledged(3)).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await m.execution.stop();
      await completion;
    }
  });

  it.each([
    "actor",
    "epoch",
  ] as const)("does not claim when %s changes during the refresh wait", async (kind) => {
    const m = controlSubscriber("prepared");
    const original = m.row();
    const task = m.start();
    const completion = finite(() => task);
    try {
      await m.entered.promise;
      m.resolveRefresh();
      m.invalidate(kind);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await completion).toBe("resolved");
      expect(await task).toEqual({ claimed: false, picker: null });
      expect(m.checks()).toEqual({ refresh: 1, actor: 2 });
      expect(m.claims).toHaveLength(0);
      expect(m.row()).toEqual(original);
      expect(m.externalWork).not.toHaveBeenCalled();
      expect(m.execution.caller(m.target)).toBe("untracked");
      expect(m.execution.hasPendingCallers()).toBe(false);
      expect(m.execution.unacknowledged(3)).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await m.execution.stop();
      await completion;
    }
  });
});

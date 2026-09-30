import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_LIMITS,
  type DriveAttempt,
  type DriveControl,
  type DriveFailure,
  type DriveOwner,
} from "@repo/core/domain/integration/drive";
import type { DriveCursor } from "@repo/core/domain/integration/driveRepository";
import type { HollowContainer } from "../../di/hollowTypes";
import { ConflictError, UnauthorizedError } from "../../errors";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import { settleBackupClosure } from "./backup/runner";
import { adoptDriveCandidate } from "./connection";
import { driveChanged, driveRecordCurrent, driveServices } from "./current";
import { runDriveControl } from "./folders";
import type { DriveExecutionTarget, DriveOwnedResult } from "./ports";

export function driveTarget(
  kind: DriveExecutionTarget["kind"],
  id: string,
  owner: DriveOwner,
): DriveExecutionTarget {
  if (owner.state === "none") throw driveChanged();
  return {
    kind,
    id,
    owner: { runtimeGeneration: owner.runtimeGeneration, token: owner.token },
  };
}
export async function prepareDriveClaim<T>(
  c: HollowContainer,
  prepare: (
    u: HollowUnitOfWorkContext,
  ) => Promise<null | (() => Promise<T | null>)>,
): Promise<
  Readonly<
    { kind: "claimed"; value: T | null } | { kind: "rejected"; error: Error }
  >
> {
  return c.unitOfWorkProvider.run(async (u) => {
    let write: null | (() => Promise<T | null>);
    try {
      write = await prepare(u);
    } catch (error) {
      if (
        error instanceof BusinessRuleError ||
        error instanceof ConflictError ||
        error instanceof UnauthorizedError
      )
        return { kind: "rejected" as const, error };
      throw error;
    }
    return { kind: "claimed" as const, value: write ? await write() : null };
  });
}
async function acknowledgeSaved(
  c: HollowContainer,
  target: DriveExecutionTarget,
) {
  const execution = driveServices(c).execution;
  const proof = execution.closure(target);
  if (proof.kind !== "closed") return;
  const saved = await c.unitOfWorkProvider.run(async (u) => {
    const row =
      target.kind === "control"
        ? await u.driveControls.find(target.id)
        : await u.driveAttempts.find(target.id);
    return (
      row &&
      row.owner.state === "closed" &&
      sameDriveOwner(row.owner, { ...target.owner, state: "closed" })
    );
  });
  if (!saved) throw driveChanged();
  await execution.acknowledge(proof.proof);
}

export function driveOwner(
  c: HollowContainer,
  runtimeGeneration: string,
): DriveOwner & { state: "active" } {
  return { state: "active", runtimeGeneration, token: c.idGenerator.next() };
}
export function sameDriveOwner(a: DriveOwner, b: DriveOwner) {
  return (
    a.state !== "none" &&
    b.state !== "none" &&
    a.token === b.token &&
    a.runtimeGeneration === b.runtimeGeneration
  );
}
export function failedControl(
  row: DriveControl,
  failure: DriveFailure,
  now: Date,
  owner = row.owner,
): DriveControl {
  const identity =
    row.data.kind === "folder-create"
      ? "fileId" in row.data
        ? {
            fileId: row.data.fileId,
            marker: row.data.marker,
            sends: row.data.sends,
            observedParent: row.data.observedParent,
          }
        : row.data.phase === "failed"
          ? row.data.identity
          : null
      : null;
  return {
    ...row,
    version: row.version + 1,
    updatedAt: now,
    terminalAt: row.terminalAt ?? now,
    owner,
    data:
      row.data.phase === "failed"
        ? row.data
        : row.data.kind === "folder-create"
          ? { kind: row.data.kind, phase: "failed", failure, identity }
          : { kind: row.data.kind, phase: "failed", failure },
  };
}
async function owned<T>(
  c: HollowContainer,
  target: DriveExecutionTarget,
  work: (signal: AbortSignal) => Promise<T>,
) {
  let handle: ReturnType<ReturnType<typeof driveServices>["execution"]["run"]>;
  try {
    handle = driveServices(c).execution.run(target, work);
  } catch {
    return {
      closed: false,
      result: {
        kind: "failure",
        code: "DRIVE_UNAVAILABLE",
        delivery: "unknown",
        credentialRejection: null,
      } as DriveOwnedResult<T>,
    };
  }
  const closed = handle.closed.then(
    () => true,
    () => false,
  );
  const result = await handle.result.then(
    (v) => v as DriveOwnedResult<T>,
    () =>
      ({
        kind: "failure",
        code: "DRIVE_UNAVAILABLE",
        delivery: "unknown",
        credentialRejection: null,
      }) as DriveOwnedResult<T>,
  );
  return { result, closed: await closed };
}
async function settleOwnedResult<T>(
  result: DriveOwnedResult<T>,
  settle: (
    result: DriveOwnedResult<T>,
    adopt: (work: () => Promise<void>) => Promise<void>,
    adoptionFailed: boolean,
  ) => Promise<void>,
) {
  let protectionFailure: unknown;
  try {
    await settle(
      result,
      async (work) => {
        try {
          await work();
        } catch (error) {
          if (
            error instanceof BusinessRuleError &&
            error.code === "DRIVE_UNAVAILABLE"
          )
            protectionFailure = error;
          throw error;
        }
      },
      false,
    );
  } catch (error) {
    if (protectionFailure === undefined || error !== protectionFailure)
      throw error;
    await settle(
      {
        kind: "failure",
        code: "DRIVE_UNAVAILABLE",
        delivery: "unknown",
        credentialRejection: null,
      },
      async () => {
        throw error;
      },
      true,
    );
  }
}
export async function executeDriveControl<T>(
  c: HollowContainer,
  row: DriveControl,
  work: (signal: AbortSignal) => Promise<T>,
  success: (
    u: HollowUnitOfWorkContext,
    current: DriveControl,
    value: T,
  ) => Promise<void>,
) {
  if (row.owner.state !== "active") throw driveChanged();
  const target = driveTarget("control", row.id, row.owner);
  const outcome = await owned(c, target, work);
  return driveServices(c).execution.coordinate("settle", async () => {
    await settleOwnedResult(outcome.result, (result, adopt, adoptionFailed) =>
      c.unitOfWorkProvider.run(async (u) => {
        const current = await u.driveControls.find(row.id);
        if (
          !current ||
          !sameDriveOwner(current.owner, row.owner) ||
          current.owner.state === "none" ||
          current.owner.state === "closed"
        )
          return;
        const owner = {
          ...current.owner,
          state: outcome.closed ? ("closed" as const) : ("unknown" as const),
        };
        const valid = await driveRecordCurrent(c, u, current, true);
        if (
          valid?.state === "linked" &&
          result.kind === "failure" &&
          result.credentialRejection !== null
        ) {
          if (
            !(await u.driveConnections.replace(
              {
                ...valid,
                state: "needs-relink",
                version: valid.version + 1,
                updatedAt: c.clock.now(),
              },
              valid.version,
              "invalidate",
            ))
          )
            throw driveChanged();
        }
        if (
          outcome.closed &&
          !adoptionFailed &&
          valid &&
          result.kind === "failure" &&
          current.data.kind === "folder-create" &&
          (current.data.phase === "running" ||
            current.data.phase === "reconciling") &&
          result.delivery === "unknown"
        ) {
          if (
            !(await u.driveControls.replace(
              {
                ...current,
                version: current.version + 1,
                updatedAt: c.clock.now(),
                owner,
                data: { ...current.data, phase: "reconciling" },
              },
              current.version,
            ))
          )
            throw driveChanged();
          return;
        }
        if (
          !outcome.closed ||
          result.kind === "failure" ||
          !valid ||
          current.data.phase === "failed"
        ) {
          const code: DriveFailure = current.cancelGeneration
            ? "DRIVE_CANCELLED"
            : !valid
              ? "DRIVE_CONTEXT_CHANGED"
              : result.kind === "failure"
                ? result.code
                : "DRIVE_UNAVAILABLE";
          if (
            !(await u.driveControls.replace(
              failedControl(current, code, c.clock.now(), owner),
              current.version,
            ))
          )
            throw driveChanged();
          return;
        }
        await adopt(() => success(u, { ...current, owner }, result.value));
      }),
    );
    await acknowledgeSaved(c, target);
  });
}
export async function executeDriveAttempt<T>(
  c: HollowContainer,
  row: DriveAttempt,
  work: (signal: AbortSignal) => Promise<T>,
  success: (
    u: HollowUnitOfWorkContext,
    current: DriveAttempt,
    value: T,
  ) => Promise<void>,
) {
  if (row.owner.state !== "active") throw driveChanged();
  const target = driveTarget("authorization", row.id, row.owner);
  const outcome = await owned(c, target, work);
  return driveServices(c).execution.coordinate("settle", async () => {
    await settleOwnedResult(outcome.result, (result, adopt) =>
      c.unitOfWorkProvider.run(async (u) => {
        const current = await u.driveAttempts.find(row.id);
        if (
          !current ||
          !sameDriveOwner(current.owner, row.owner) ||
          current.owner.state === "none" ||
          current.owner.state === "closed"
        )
          return;
        const owner = {
          ...current.owner,
          state: outcome.closed ? ("closed" as const) : ("unknown" as const),
        };
        const valid = await driveRecordCurrent(c, u, current);
        if (
          !outcome.closed ||
          result.kind === "failure" ||
          !valid ||
          current.data.phase === "failed"
        ) {
          const code: DriveFailure = current.cancelGeneration
            ? "DRIVE_CANCELLED"
            : !valid
              ? "DRIVE_CONTEXT_CHANGED"
              : result.kind === "failure"
                ? result.code
                : "DRIVE_UNAVAILABLE";
          if (
            !(await u.driveAttempts.replace(
              {
                ...current,
                version: current.version + 1,
                updatedAt: c.clock.now(),
                terminalAt: current.terminalAt ?? c.clock.now(),
                owner,
                confirmedFolderIdsEnvelope: null,
                data:
                  current.data.phase === "failed"
                    ? current.data
                    : { phase: "failed", failure: code },
              },
              current.version,
            ))
          )
            throw driveChanged();
          return;
        }
        await adopt(() => success(u, { ...current, owner }, result.value));
      }),
    );
    await acknowledgeSaved(c, target);
  });
}
export async function reconcileDriveClosures(c: HollowContainer) {
  const execution = driveServices(c).execution;
  return execution.coordinate("maintenance", async () => {
    const held = await c.unitOfWorkProvider.run(async (u) => ({
      attempts: await u.driveAttempts.scan({
        kind: "held",
        now: c.clock.now(),
        after: null,
        limit: 3,
      }),
      controls: await u.driveControls.scan({
        kind: "held",
        now: c.clock.now(),
        after: null,
        limit: 3,
      }),
      backups: await u.driveBackupTransfers.scan("held", 2),
    }));
    if (held.attempts.length + held.controls.length > 2) throw driveChanged();
    if (held.backups.length > 1) throw driveChanged();
    for (const row of held.attempts)
      execution.closure(driveTarget("authorization", row.id, row.owner));
    for (const row of held.controls)
      execution.closure(driveTarget("control", row.id, row.owner));
    for (const row of held.backups)
      execution.closure(driveTarget("backup", row.id, row.owner));
    let settled = 0;
    for (const proof of execution.unacknowledged(66)) {
      const target = proof.target;
      if (proof.source === "local-close") {
        const caller = execution.caller(target);
        if (caller === "pending") continue;
        if (caller !== "ended") throw driveChanged();
      }
      await c.unitOfWorkProvider.run(async (u) => {
        if (target.kind === "backup") return settleBackupClosure(c, u, proof);
        const row =
          target.kind === "control"
            ? await u.driveControls.find(target.id)
            : await u.driveAttempts.find(target.id);
        if (
          !row ||
          row.owner.state === "none" ||
          !sameDriveOwner(row.owner, { ...target.owner, state: "closed" })
        )
          throw driveChanged();
        if (row.owner.state === "closed") return;
        const owner = { ...row.owner, state: "closed" as const };
        const now = c.clock.now();
        if (row.terminalAt) {
          const next = {
            ...row,
            owner,
            version: row.version + 1,
            updatedAt: now,
          };
          const ok =
            "subject" in next
              ? await u.driveControls.replace(next, row.version)
              : await u.driveAttempts.replace(next, row.version);
          if (!ok) throw driveChanged();
          return;
        }
        const current = await driveRecordCurrent(c, u, row, "subject" in row);
        const failure: DriveFailure = row.cancelGeneration
          ? "DRIVE_CANCELLED"
          : !current
            ? "DRIVE_CONTEXT_CHANGED"
            : "DRIVE_UNAVAILABLE";
        if ("subject" in row) {
          const next: DriveControl =
            current &&
            !row.cancelGeneration &&
            row.data.kind === "folder-create" &&
            (row.data.phase === "running" || row.data.phase === "reconciling")
              ? {
                  ...row,
                  owner,
                  version: row.version + 1,
                  updatedAt: now,
                  data: { ...row.data, phase: "reconciling" },
                }
              : failedControl(row, failure, now, owner);
          if (!(await u.driveControls.replace(next, row.version)))
            throw driveChanged();
        } else {
          if (
            !(await u.driveAttempts.replace(
              {
                ...row,
                owner,
                version: row.version + 1,
                updatedAt: now,
                terminalAt: now,
                confirmedFolderIdsEnvelope: null,
                data: { phase: "failed", failure },
              },
              row.version,
            ))
          )
            throw driveChanged();
        }
      });
      await execution.acknowledge(proof);
      settled++;
    }
    for (const previous of execution.predecessors()) {
      const empty = await c.unitOfWorkProvider.run(async (u) => {
        const rows = [
          ...(await u.driveBackupTransfers.scan("held", 2)),
          ...(await u.driveAttempts.scan({
            kind: "held",
            now: c.clock.now(),
            after: null,
            limit: 3,
          })),
          ...(await u.driveControls.scan({
            kind: "held",
            now: c.clock.now(),
            after: null,
            limit: 3,
          })),
        ];
        if (rows.length > 3) throw driveChanged();
        return !rows.some(
          (r) =>
            r.owner.state !== "none" &&
            r.owner.runtimeGeneration === previous.runtimeGeneration,
        );
      });
      if (empty) await execution.acknowledgePredecessor(previous);
    }
    return settled;
  });
}
export async function maintainDrive(
  c: HollowContainer,
  runtimeGeneration?: string,
) {
  await reconcileDriveClosures(c);
  const held = await c.unitOfWorkProvider.run(async (u) => [
    ...(await u.driveAttempts.scan({
      kind: "held",
      now: c.clock.now(),
      after: null,
      limit: 3,
    })),
    ...(await u.driveControls.scan({
      kind: "held",
      now: c.clock.now(),
      after: null,
      limit: 3,
    })),
  ]);
  for (const row of held) {
    if (row.owner.state !== "active" && row.owner.state !== "unknown") continue;
    if (
      runtimeGeneration &&
      row.owner.state === "active" &&
      row.owner.runtimeGeneration !== runtimeGeneration
    ) {
      await c.unitOfWorkProvider.run(async (u) => {
        const current =
          "subject" in row
            ? await u.driveControls.find(row.id)
            : await u.driveAttempts.find(row.id);
        if (
          !current ||
          current.version !== row.version ||
          current.owner.state !== "active"
        )
          return;
        const next = {
          ...current,
          version: current.version + 1,
          updatedAt: c.clock.now(),
          owner: { ...current.owner, state: "unknown" as const },
        };
        if ("subject" in next)
          await u.driveControls.replace(next, current.version);
        else await u.driveAttempts.replace(next, current.version);
      });
    }
    const current = await c.unitOfWorkProvider.run((u) =>
      driveRecordCurrent(c, u, row),
    );
    if (!current)
      driveServices(c).execution.abort({
        ...row.owner,
        state: row.owner.state,
      });
  }
  return driveServices(c).execution.coordinate("maintenance", () =>
    c.unitOfWorkProvider.run(async (u) => {
      if (
        held.length ||
        driveServices(c).execution.hasPendingCallers() ||
        driveServices(c).execution.unacknowledged(1).length ||
        driveServices(c).execution.predecessors().length
      )
        return 0;
      const attempts = await u.driveAttempts.prune(
        c.clock.now(),
        DRIVE_LIMITS.pruneBatch,
      );
      await u.driveBackupJobs.prune(c.clock.now(), 100);
      return (
        attempts +
        (await u.driveControls.prune(
          c.clock.now(),
          DRIVE_LIMITS.pruneBatch - attempts,
        ))
      );
    }),
  );
}
export async function runDriveQueue(
  c: HollowContainer,
  runtimeGeneration: string,
  cursor: Readonly<{
    controls: DriveCursor | null;
    candidates: DriveCursor | null;
  }>,
) {
  const rows = await c.unitOfWorkProvider.run(async (u) => ({
    controls: await u.driveControls.scan({
      kind: "claimable",
      now: c.clock.now(),
      after: cursor.controls,
      limit: 100,
    }),
    candidates: await u.driveAttempts.scan({
      kind: "candidate",
      now: c.clock.now(),
      after: cursor.candidates,
      limit: 100,
    }),
  }));
  let processed = 0;
  for (const row of rows.candidates)
    if (await adoptDriveCandidate(c, row.id)) processed++;
  for (const row of rows.controls)
    if (row.data.kind !== "picker" && row.data.kind !== "disconnect") {
      await runDriveControl(c, row.id, runtimeGeneration);
      processed++;
    }
  const lastControl = rows.controls.at(-1);
  const lastCandidate = rows.candidates.at(-1);
  return {
    processed,
    cursor: {
      controls:
        rows.controls.length === 100 && lastControl
          ? { createdAt: lastControl.createdAt, id: lastControl.id }
          : null,
      candidates:
        rows.candidates.length === 100 && lastCandidate
          ? { createdAt: lastCandidate.createdAt, id: lastCandidate.id }
          : null,
    },
  };
}

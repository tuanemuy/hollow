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
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import { adoptDriveCandidate } from "./connection";
import { driveChanged, driveRecordCurrent, driveServices } from "./current";
import { runDriveControl } from "./folders";
import type { DriveOwnedResult } from "./ports";

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
  owner: DriveOwner & { state: "active" },
  work: (signal: AbortSignal) => Promise<T>,
) {
  let handle: ReturnType<ReturnType<typeof driveServices>["execution"]["run"]>;
  try {
    handle = driveServices(c).execution.run(owner, work);
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
  const outcome = await owned(c, { ...row.owner, state: "active" }, work);
  return settleOwnedResult(outcome.result, (result, adopt, adoptionFailed) =>
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
  const outcome = await owned(c, { ...row.owner, state: "active" }, work);
  return settleOwnedResult(outcome.result, (result, adopt) =>
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
}
export async function maintainDrive(
  c: HollowContainer,
  runtimeGeneration?: string,
) {
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
  return c.unitOfWorkProvider.run(async (u) => {
    const attempts = await u.driveAttempts.prune(
      c.clock.now(),
      DRIVE_LIMITS.pruneBatch,
    );
    return (
      attempts +
      (await u.driveControls.prune(
        c.clock.now(),
        DRIVE_LIMITS.pruneBatch - attempts,
      ))
    );
  });
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

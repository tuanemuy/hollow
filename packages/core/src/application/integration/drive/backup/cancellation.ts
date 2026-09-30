import type { DriveBackupScope } from "@repo/core/domain/integration/driveBackupRepository";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";

export async function cancelDriveBackups(
  container: HollowContainer,
  u: HollowUnitOfWorkContext,
  scope: DriveBackupScope,
  now: Date,
): Promise<void> {
  const cancelled = await u.driveBackupTransfers.cancel(scope, now);
  const pending = await u.driveBackupJobs.cancelPending(scope, now);
  if (!cancelled.length && !pending) return;
  u.afterCommit(() => {
    for (const row of cancelled) {
      if (row.owner.state === "active" || row.owner.state === "unknown")
        container.drive?.execution.abort({
          ...row.owner,
          state: row.owner.state,
        });
    }
    container.drive?.wake();
    return undefined;
  });
}

export async function backupImpactIds(
  u: HollowUnitOfWorkContext,
  scope: DriveBackupScope,
) {
  const jobs = await u.driveBackupJobs.live(scope);
  const orphaned = (await u.driveBackupTransfers.live(scope)).filter(
    (row) => row.jobId === null,
  );
  return [
    ...jobs.map((job) => `job:${job.id}`),
    ...orphaned.map((row) => `transfer:${row.id}`),
  ].sort();
}

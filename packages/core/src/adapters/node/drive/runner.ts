import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { runDriveBackupQueue } from "@repo/core/application/integration/drive/backup/runner";
import { driveServices } from "@repo/core/application/integration/drive/current";
import {
  maintainDrive,
  reconcileDriveClosures,
  runDriveQueue,
} from "@repo/core/application/integration/drive/runner";
import type { DriveCursor } from "@repo/core/domain/integration/driveRepository";
import { DriveTransportError } from "./execution";

export function createNodeDriveRunner(
  c: HollowContainer,
  runtimeGeneration: string,
) {
  const execution = driveServices(c).execution;
  let stopping = false;
  let running: Promise<void> | null = null;
  let backingUp: Promise<void> | null = null;
  let lastBackupAccount: string | null = null;
  let backupAgain = false;
  let again = false;
  let failed = false;
  let cursor: { controls: DriveCursor | null; candidates: DriveCursor | null } =
    { controls: null, candidates: null };
  const wake = (startBackup = true) => {
    if (stopping) return;
    if (startBackup && backingUp) backupAgain = true;
    if (startBackup && !backingUp && c.drive?.backup) {
      backingUp = runDriveBackupQueue(c, runtimeGeneration, lastBackupAccount)
        .then((result) => {
          lastBackupAccount = result.account;
          backupAgain ||= result.more;
        })
        .catch(() => {
          failed = true;
        })
        .finally(() => {
          backingUp = null;
          const continueBackup = backupAgain;
          backupAgain = false;
          if (!stopping) wake(continueBackup);
        });
    }
    if (running) {
      again = true;
      return;
    }
    running = (async () => {
      do {
        again = false;
        await maintainDrive(c, runtimeGeneration);
        if (!stopping && execution.accepting())
          cursor = (await runDriveQueue(c, runtimeGeneration, cursor)).cursor;
      } while (again && !stopping);
    })()
      .catch(() => {
        failed = true;
      })
      .finally(() => {
        running = null;
      });
  };
  return {
    wake,
    failed: () => failed,
    async stop() {
      stopping = true;
      again = false;
      const stopped = execution.stop();
      const outcome = stopped.then(
        () => true,
        () => false,
      );
      await running;
      await backingUp;
      const closed = await outcome;
      await reconcileDriveClosures(c);
      if (
        !closed ||
        execution.unacknowledged(1).length ||
        execution.predecessors().length
      )
        throw new DriveTransportError();
      await maintainDrive(c, runtimeGeneration);
    },
  };
}

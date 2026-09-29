import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
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
  let again = false;
  let failed = false;
  let cursor: { controls: DriveCursor | null; candidates: DriveCursor | null } =
    { controls: null, candidates: null };
  const wake = () => {
    if (stopping) return;
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

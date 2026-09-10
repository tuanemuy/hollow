import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepEmptyTrash } from "@repo/core/application/note/emptyTrash";
import { sweepNotePurges } from "@repo/core/application/note/purge";
export function createPurgeRunner(
  container: HollowContainer,
  intervalMs = 2000,
) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = (async () => {
      await sweepEmptyTrash(container);
      await sweepNotePurges(container);
      await sweepEmptyTrash(container);
    })()
      .catch((cause) => container.logger.error("Purge sweep failed", { cause }))
      .finally(() => {
        task = null;
      });
  };
  const timer = setInterval(wake, intervalMs);
  timer.unref();
  queueMicrotask(wake);
  return {
    wake,
    async stop() {
      stopped = true;
      clearInterval(timer);
      await task;
    },
  };
}

import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepWorkspaceIcons } from "@repo/core/application/workspace/icons";
export function createWorkspaceIconRunner(
  container: HollowContainer,
  intervalMs = 30_000,
) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = sweepWorkspaceIcons(container)
      .catch(() => container.logger.error("Workspace icon cleanup failed"))
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

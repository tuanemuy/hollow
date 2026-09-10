import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepInvitations } from "@repo/core/application/workspace/delivery";
export function createInvitationRunner(
  container: HollowContainer,
  intervalMs = 5000,
) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = sweepInvitations(container)
      .catch(() => container.logger.error("Invitation sweep failed"))
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

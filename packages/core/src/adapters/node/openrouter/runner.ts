import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
export function createOpenRouterRunner(c: HollowContainer) {
  let stopped = false;
  let active: Promise<void> | null = null;
  const wake = () => {
    if (stopped || active) return;
    active = c.unitOfWorkProvider
      .run((u) => u.openRouterAttempts.prune(c.clock.now(), 100))
      .then(() => {})
      .catch(() => c.logger.error("OpenRouter expiry cleanup deferred"))
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(wake, 60_000);
  timer.unref();
  queueMicrotask(wake);
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await active;
    },
  };
}

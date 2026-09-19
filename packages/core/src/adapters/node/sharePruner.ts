import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
export function createSharePruner(c: HollowContainer, intervalMs = 60_000) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = c.unitOfWorkProvider
      .run(async (u) => {
        const now = c.clock.now();
        await u.sharing.prune(now);
        await u.publicDiscoveryRates.prune(now);
      })
      .catch(() => c.logger.error("Sharing prune failed"))
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

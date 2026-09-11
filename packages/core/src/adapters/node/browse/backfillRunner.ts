import { backfillBrowse } from "@repo/core/application/browse/backfill";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";

export function createBrowseBackfillRunner(container: HollowContainer) {
  let stopped = false;
  let active: Promise<void> | null = null;
  let after: string | undefined;
  const controller = new AbortController();
  const tick = () => {
    if (stopped || active) return;
    active = (async () => {
      try {
        const result = await backfillBrowse(
          container,
          after,
          controller.signal,
        );
        after = result.last ?? undefined;
      } catch {
        container.logger.warn("browse_backfill_deferred", {});
        after = undefined;
      }
    })().finally(() => {
      active = null;
    });
  };
  const timer = setInterval(tick, 1000);
  timer.unref();
  tick();
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      controller.abort();
      await active;
    },
  };
}

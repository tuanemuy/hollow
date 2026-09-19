import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepExports } from "@repo/core/application/export/usecases";

export function createExportRunner(c: HollowContainer) {
  let stopped = false;
  let task: Promise<void> | null = null;
  let pruneAt = 0;
  const wake = () => {
    if (stopped || task) return;
    task = (async () => {
      for (const id of c.exporting?.lifetime.ids() ?? []) {
        if (!(await c.unitOfWorkProvider.run((u) => u.exports.find(id)))) {
          c.exporting?.lifetime.cancel(id);
          c.exporting?.lifetime.release(id);
        }
      }
      if (c.clock.now().getTime() >= pruneAt) {
        pruneAt = c.clock.now().getTime() + 60000;
        await c.unitOfWorkProvider.run((u) =>
          u.exports.pruneRates(c.clock.now()),
        );
      }
      await sweepExports(c);
    })()
      .catch(() => c.logger.error("Export cleanup deferred"))
      .finally(() => {
        task = null;
      });
  };
  const timer = setInterval(wake, 2000);
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

import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";

export function createZipRunner(c: HollowContainer) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = (async () => {
      await pumpZip(c);
      if (!stopped) await sweepZip(c);
    })()
      .catch(() => c.logger.error("ZIP work retained for safe recovery"))
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
      await Promise.all([c.zip?.execution.stop(), c.zip?.transfers.stop()]);
    },
  };
}

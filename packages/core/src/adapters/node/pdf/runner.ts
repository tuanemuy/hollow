import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepPdf } from "@repo/core/application/pdf/worker";

export function createPdfRunner(c: HollowContainer) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = (async () => {
      for (let i = 0; i < 20 && !stopped; i++) await sweepPdf(c);
    })()
      .catch(() => c.logger.error("PDF cleanup deferred"))
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

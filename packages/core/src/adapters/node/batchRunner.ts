import {
  claimBatchAttempt,
  processBatchAttempt,
  pruneBatches,
} from "../../application/batch/worker";
import type { HollowContainer } from "../../application/di/hollowTypes";

export function createBatchRunner(
  container: HollowContainer,
  intervalMs = 2000,
) {
  let stopped = false;
  let task: Promise<void> | null = null;
  const wake = () => {
    if (stopped || task) return;
    task = (async () => {
      for (let i = 0; i < 20 && !stopped; i++) {
        const attempt = await claimBatchAttempt(container, 60000);
        if (!attempt) break;
        await processBatchAttempt(container, attempt);
      }
      if (!stopped) await pruneBatches(container);
    })()
      .catch(() =>
        container.logger.error("Batch sweep failed", {
          code: "BATCH_SWEEP_FAILED",
        }),
      )
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

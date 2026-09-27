import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
export function createLlmRunner(container: HollowContainer) {
  let stopped = false;
  let active: Promise<void> | null = null;
  let lastPrune = 0;
  const wake = () => {
    if (stopped || active) return;
    active = (async () => {
      await sweepLlm(container);
      const now = container.clock.now();
      if (now.getTime() - lastPrune >= 60000) {
        await container.unitOfWorkProvider.run((u) =>
          u.llmConversions.prune(
            new Date(now.getTime() - LLM_LIMITS.historyMs),
            100,
          ),
        );
        lastPrune = now.getTime();
      }
    })()
      .catch(() => container.logger.error("LLM_RUNTIME_PROGRESS_UNCONFIRMED"))
      .finally(() => {
        active = null;
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
      await active;
      await container.llm?.execution.stop();
    },
  };
}

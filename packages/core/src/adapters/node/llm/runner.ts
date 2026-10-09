import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { sweepPdfPreviews } from "@repo/core/application/llm/pdfPreview";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import { PDF_LLM_LIMITS } from "@repo/core/domain/llm/pdfPreview";
export function createLlmRunner(container: HollowContainer) {
  const drive =
    container.llm?.inputMode === "leased-local-v2" &&
    container.llm.sourceMode === "drive";
  let stopped = false;
  let finished = false;
  let stopping: Promise<void> | null = null;
  let recoveryFailure: { error: unknown } | null = null;
  let reportRecoveryFailure!: (value: { error: unknown }) => void;
  const recoveryFailed = new Promise<{ error: unknown }>((resolve) => {
    reportRecoveryFailure = resolve;
  });
  let active: Promise<void> | null = null;
  let lastPrune = 0;
  const wake = () => {
    if (finished || (stopped && !drive) || active) return;
    const admit = !stopped;
    active = (async () => {
      await sweepLlm(container, drive ? { admit } : {});
      if (!admit) return;
      await sweepPdfPreviews(container);
      const now = container.clock.now();
      if (now.getTime() - lastPrune >= 60000) {
        await container.unitOfWorkProvider.run(async (u) => {
          await u.llmPdfPreviews.prune(
            new Date(now.getTime() - PDF_LLM_LIMITS.receiptMs),
            PDF_LLM_LIMITS.receipts,
          );
          await u.llmConversions.prune(
            new Date(now.getTime() - LLM_LIMITS.historyMs),
            100,
          );
        });
        lastPrune = now.getTime();
      }
    })()
      .catch((error: unknown) => {
        if (!admit) {
          recoveryFailure ??= { error };
          reportRecoveryFailure(recoveryFailure);
        }
        container.logger.error("LLM_RUNTIME_PROGRESS_UNCONFIRMED");
      })
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(wake, 2000);
  timer.unref();
  queueMicrotask(wake);
  const stopDrive = (): Promise<void> => {
    if (stopping) return stopping;
    stopped = true;
    stopping = (async () => {
      try {
        await active;
        const executionStop = container.llm?.execution.stop();
        wake();
        await Promise.race([
          executionStop,
          recoveryFailed.then(({ error }) => {
            throw error;
          }),
        ]);
      } finally {
        finished = true;
        clearInterval(timer);
        await active;
      }
      if (recoveryFailure) throw recoveryFailure.error;
      await sweepLlm(container, { admit: false });
      if (container.llm?.inputMode === "leased-local-v2")
        await container.llm.inputStage.stop();
    })();
    return stopping;
  };
  const stopLocal = async () => {
    stopped = true;
    clearInterval(timer);
    await active;
    await container.llm?.execution.stop();
    if (container.llm && container.llm.inputMode !== "legacy-local")
      await container.llm.inputStage.stop();
  };
  return {
    wake,
    stop: drive ? stopDrive : stopLocal,
  };
}

import type { LlmConversion, LlmOutcome } from "@repo/core/domain/llm/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { completeLlm } from "./completion";
import { currentLlmSource } from "./current";
import { isLlmOperationError } from "./ports";

export function leasedText(value: LlmConversion) {
  return (
    value.access.origin === "local-original" &&
    value.selection === "fixed" &&
    value.preparationVersion === 1
  );
}
export function sameInputSource(left: LlmConversion, right: LlmConversion) {
  return (
    left.jobId === right.jobId &&
    left.accountId === right.accountId &&
    left.noteId === right.noteId &&
    left.noteVersion === right.noteVersion &&
    left.credentialEpoch === right.credentialEpoch &&
    left.sourceOwnershipGeneration === right.sourceOwnershipGeneration &&
    JSON.stringify(left.source) === JSON.stringify(right.source) &&
    JSON.stringify(left.access) === JSON.stringify(right.access) &&
    left.selection === right.selection &&
    (left.selection !== "fixed" ||
      right.selection !== "fixed" ||
      (left.preparationVersion === right.preparationVersion &&
        left.promptVersion === right.promptVersion))
  );
}
export function sameInputReceipt(
  left: SourceInputReceipt | null,
  right: SourceInputReceipt | null,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}
export async function candidateOutcome(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
): Promise<Exclude<LlmOutcome, { kind: "pending" | "succeeded" }> | null> {
  if (value.cancelGeneration) return { kind: "cancelled" };
  if (value.deadlineAt <= c.clock.now())
    return { kind: "failed", code: "LLM_TIMEOUT" };
  try {
    await currentLlmSource(u, value, c.clock.now());
    return null;
  } catch (error) {
    if (!isLlmOperationError(error)) throw error;
    return { kind: "failed", code: error.code };
  }
}
export async function terminateCandidate(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
) {
  const outcome = await candidateOutcome(c, u, value);
  if (!outcome) return false;
  await completeLlm(c, u, value, outcome, c.clock.now(), "never-read");
  return true;
}

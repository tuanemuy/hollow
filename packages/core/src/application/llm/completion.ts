import type { LlmConversion, LlmOutcome } from "@repo/core/domain/llm/entity";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitNote } from "../note/commitNote";
import { canScope } from "../workspace/access";
import { LlmOperationError } from "./ports";

const unproven = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
export async function replaceLlm(
  u: HollowUnitOfWorkContext,
  previous: LlmConversion,
  next: LlmConversion,
) {
  if (
    !(await u.llmConversions.replace(
      { ...next, version: previous.version + 1 },
      previous.version,
    ))
  )
    throw unproven();
}
export async function completeLlm(
  container: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
  outcome: LlmOutcome,
  now: Date,
  mode: "owned" | "never-read" = "owned",
) {
  if (mode === "never-read") {
    if (
      value.sourceMemoryBytes !== 0 ||
      (value.inputReceipt && value.inputReceipt.state !== "closed") ||
      !(
        (value.phase === "queued" && value.owner.state === "idle") ||
        (value.phase === "response-ready" && value.owner.state === "closed")
      )
    )
      throw unproven();
  } else if (value.owner.state === "idle") throw unproven();
  if (outcome.kind === "pending") throw unproven();
  const terminal = {
    phase: "terminal" as const,
    owner:
      value.owner.state === "idle"
        ? value.owner
        : { ...value.owner, state: "closed" as const },
    responseBudget: 0,
    updatedAt: now,
  };
  if (value.selection === "pdf-pending") {
    if (outcome.kind === "succeeded") throw unproven();
    await replaceLlm(u, value, { ...value, ...terminal, outcome });
  } else
    await replaceLlm(u, value, {
      ...value,
      ...terminal,
      outcome,
    });
  await u.llmQuota.releaseUnsent(value.jobId, now);
  await u.llmDispatches.scrub(value.jobId);
  const original = await u.imports.findOriginal(value.source.originalId);
  if (original?.activeJobId === value.jobId && outcome.kind !== "succeeded")
    await u.imports.saveOriginal({
      ...original,
      state:
        value.operation === "regenerate"
          ? value.sourceState
          : outcome.kind === "cancelled"
            ? "cancelled"
            : "failed",
      coverage: value.sourceCoverage,
    });
  if (value.operation === "import" && outcome.kind !== "succeeded") {
    const note = await u.notes.findById(value.noteId);
    if (
      note?.lifecycle.kind === "active" &&
      note.version === value.noteVersion &&
      (await canScope(u, note.owner, value.accountId, "edit"))
    )
      await commitNote(container, u, {
        previous: note,
        note: {
          ...note,
          display: completeDisplay(
            note.display,
            "conversion",
            value.jobId,
            false,
          ),
        },
        actor: { kind: "system", jobId: value.jobId },
        cause: "import",
      });
  }
}

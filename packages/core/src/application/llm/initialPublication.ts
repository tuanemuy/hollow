import type { Original } from "@repo/core/domain/import/entity";
import type { Note } from "@repo/core/domain/note/entity";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

export async function initialPublicationBatch(
  u: HollowUnitOfWorkContext,
  note: Note,
  original: Original,
) {
  if (
    note.html.trim() ||
    original.coverage !== "no_text" ||
    (original.state !== "needs_ai" && original.state !== "failed")
  )
    return null;
  if (
    original.state === "failed" &&
    !(await u.imports.listNotices(original.id)).some(
      (notice) => notice.code === "LLM_DISABLED",
    )
  )
    return null;
  const previous = await u.jobs.find(original.activeJobId);
  if (
    !previous ||
    previous.noteId !== note.id ||
    previous.originalId !== original.id ||
    previous.noteVersion !== note.version ||
    (previous.state !== "succeeded" && previous.state !== "failed")
  )
    return null;
  const batch = await u.imports.findBatch(previous.batchId);
  if (!batch || batch.accountId !== previous.accountId || batch.cancelledAt)
    return null;
  const value = await u.llmConversions.find(previous.id);
  if (!value) {
    if (previous.accountId !== original.accountId) return null;
    if (
      original.state === "needs_ai"
        ? previous.state !== "succeeded"
        : previous.state !== "failed"
    )
      return null;
    return batch;
  }
  if (
    value.operation !== "regenerate" ||
    value.phase !== "terminal" ||
    value.outcome.kind !== "failed" ||
    value.sourceState !== original.state ||
    value.sourceCoverage !== "no_text" ||
    value.noteVersion !== note.version ||
    value.noteId !== note.id ||
    value.accountId !== previous.accountId ||
    value.access.origin !== "local-original"
  )
    return null;
  if (
    value.source.originalId !== original.id ||
    value.source.sha256 !== original.sha256 ||
    value.source.bytes !== original.bytes ||
    value.source.format !== original.format ||
    value.sourceMemoryBytes !== 0 ||
    (value.owner.state !== "closed" &&
      !(value.owner.state === "idle" && value.inputReceipt === null)) ||
    (value.inputReceipt !== null && value.inputReceipt.state !== "closed")
  )
    throw new ConflictError(
      "LLM_SOURCE_CHANGED",
      "原本または処理の所有が更新されました。確認してから開始してください。",
    );
  return batch;
}

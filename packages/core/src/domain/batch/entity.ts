import { BusinessRuleError } from "../error";
import type { NoteOwner } from "../note/entity";

export type BatchOperation =
  | Readonly<{
      kind: "tag";
      change:
        | Readonly<{ kind: "attach" | "detach"; tagId: string }>
        | Readonly<{ kind: "create"; name: string }>;
    }>
  | Readonly<{ kind: "trash"; cancelProcessing: boolean }>
  | Readonly<{ kind: "move"; destination: NoteOwner }>;
export type BatchState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";
export type BatchFailure = Readonly<{ code: string; message: string }>;
export type BatchOutcome =
  | Readonly<{
      state: "succeeded";
      result: Readonly<{ noteId: string; holdingSequence: number | null }>;
    }>
  | Readonly<{ state: "failed"; failure: BatchFailure }>
  | Readonly<{ state: "cancelled" }>;

export function selectedNoteIds(ids: readonly string[]): readonly string[] {
  if (!ids.length || ids.length > 500 || new Set(ids).size !== ids.length)
    throw new BusinessRuleError(
      "BATCH_SELECTION",
      "1〜500件のノートを重複なく選択してください。",
    );
  return ids;
}
export function batchState(
  counts: Readonly<Record<BatchState, number>>,
): BatchState {
  return counts.running
    ? "running"
    : counts.queued
      ? "queued"
      : counts.failed
        ? "failed"
        : counts.cancelled
          ? "cancelled"
          : "succeeded";
}

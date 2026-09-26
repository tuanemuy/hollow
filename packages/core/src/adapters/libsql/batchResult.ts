import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { BatchSuccessResult } from "@repo/core/domain/batch/entity";

const invalid = () =>
  new SystemError(SystemErrorCode.DataIntegrityError, "Invalid batch result");
const integer = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function decodeBatchResult(json: string): BatchSuccessResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw invalid();
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid();
  const r = raw as Record<string, unknown>;
  if (typeof r.noteId !== "string" || !r.noteId) throw invalid();
  if (!Object.hasOwn(r, "kind")) {
    if (
      Object.keys(r).length !== 2 ||
      !(
        r.holdingSequence === null ||
        (integer(r.holdingSequence) && r.holdingSequence <= 500)
      )
    )
      throw invalid();
    return {
      kind: "existing",
      noteId: r.noteId,
      holdingSequence: r.holdingSequence,
    };
  }
  if (
    r.kind !== "sharing" ||
    Object.keys(r).length !== 7 ||
    r.holdingSequence !== null ||
    !(
      r.visibility === "private" ||
      r.visibility === "link" ||
      r.visibility === "public"
    ) ||
    !(r.change === "changed" || r.change === "unchanged") ||
    !integer(r.previousShareVersion) ||
    !integer(r.shareVersion) ||
    r.shareVersion !== r.previousShareVersion + (r.change === "changed" ? 1 : 0)
  )
    throw invalid();
  return {
    kind: "sharing",
    noteId: r.noteId,
    holdingSequence: null,
    visibility: r.visibility,
    change: r.change,
    previousShareVersion: r.previousShareVersion,
    shareVersion: r.shareVersion,
  };
}
export function encodeBatchResult(result: BatchSuccessResult): string {
  return JSON.stringify(
    result.kind === "existing"
      ? { noteId: result.noteId, holdingSequence: result.holdingSequence }
      : result,
  );
}

import type { ImportNotice, Original } from "@repo/core/domain/import/entity";
import type { ConversionJob } from "@repo/core/domain/job/entity";
import type { LlmConversion, LlmFailure } from "@repo/core/domain/llm/entity";
import type { Note } from "@repo/core/domain/note/entity";
import type { NoteRevision } from "@repo/core/domain/note/revision";
import {
  type FailedMachineRetryIssue,
  machineRestartIssue,
} from "../import/machineRetry";

export type NoteConversionView =
  | (Readonly<{
      kind: "machine";
      jobId: string;
      notices: readonly ImportNotice[];
    }> &
      (
        | (Readonly<{ state: "failed" }> &
            (
              | Readonly<{ canRetry: true; retryBlocked: null }>
              | Readonly<{
                  canRetry: false;
                  retryBlocked: FailedMachineRetryIssue;
                }>
            ))
        | Readonly<{
            state: Exclude<ConversionJob["state"], "failed">;
            canRetry: false;
            retryBlocked: null;
          }>
      ))
  | Readonly<{
      kind: "llm";
      jobId: string;
      phase: LlmConversion["phase"];
      outcome: LlmConversion["outcome"]["kind"];
      failure: LlmFailure | null;
      canRetry?: never;
      retryBlocked?: never;
      notices?: never;
    }>;

/** Projects only the authorized note's active conversion; native failure text is omitted. */
export function noteConversionView(
  input: Readonly<{
    note: Note;
    original: Original | null;
    job: ConversionJob | null;
    llm: LlmConversion | null;
    notices: readonly ImportNotice[];
    accountId: string;
    canEdit: boolean;
    importingConfigured: boolean;
    revision: NoteRevision | null;
  }>,
): NoteConversionView | null {
  if (!input.original) return null;
  if (
    input.llm?.jobId === input.original.activeJobId &&
    input.llm.noteId === input.note.id
  ) {
    const llm = input.llm;
    return {
      kind: "llm",
      jobId: llm.jobId,
      phase: llm.phase,
      outcome: llm.outcome.kind,
      failure:
        llm.outcome.kind === "failed" || llm.outcome.kind === "unknown"
          ? llm.outcome.code
          : null,
    };
  }
  const job = input.job;
  if (
    !job ||
    job.id !== input.original.activeJobId ||
    job.noteId !== input.note.id
  )
    return null;
  const base = {
    kind: "machine" as const,
    jobId: job.id,
    notices: input.notices,
  };
  if (job.state !== "failed")
    return { ...base, state: job.state, canRetry: false, retryBlocked: null };
  const issue = machineRestartIssue({
    ...input,
    job,
    kind: "retry",
  });
  return issue === null
    ? { ...base, state: "failed", canRetry: true, retryBlocked: null }
    : { ...base, state: "failed", canRetry: false, retryBlocked: issue };
}

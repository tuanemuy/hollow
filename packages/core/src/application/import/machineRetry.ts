import type { Original } from "@repo/core/domain/import/entity";
import type { ConversionJob } from "@repo/core/domain/job/entity";
import type { Note } from "@repo/core/domain/note/entity";
import type { NoteRevision } from "@repo/core/domain/note/revision";

export type FailedMachineRetryIssue =
  | "read-only"
  | "other-actor"
  | "inactive-original"
  | "edited"
  | "unconfigured";
export type MachineRestartIssue = FailedMachineRetryIssue | "not-failed";
export type MachineRestartInput = Readonly<{
  kind: "retry" | "reimport";
  accountId: string;
  canEdit: boolean;
  importingConfigured: boolean;
  job: ConversionJob;
  original: Original | null;
  note: Note;
  revision: NoteRevision | null;
}>;

export function machineRestartState(
  job: ConversionJob,
  kind: MachineRestartInput["kind"],
): boolean {
  return job.state === (kind === "retry" ? "failed" : "cancelled");
}

export function machineRestartIssue(
  input: MachineRestartInput &
    Readonly<{
      kind: "retry";
      job: Extract<ConversionJob, { state: "failed" }>;
    }>,
): FailedMachineRetryIssue | null;
export function machineRestartIssue(
  input: MachineRestartInput,
): MachineRestartIssue | null;
export function machineRestartIssue(
  input: MachineRestartInput,
): MachineRestartIssue | null {
  if (input.kind === "retry" && input.job.accountId !== input.accountId)
    return "other-actor";
  if (!input.canEdit) return "read-only";
  if (!machineRestartState(input.job, input.kind)) return "not-failed";
  if (!input.original || input.original.activeJobId !== input.job.id)
    return "inactive-original";
  if (
    (input.revision
      ? input.revision.capturedNoteVersion > input.job.noteVersion
      : input.note.version !== input.job.noteVersion) ||
    input.original.state === "ready"
  )
    return "edited";
  if (!input.importingConfigured) return "unconfigured";
  return null;
}

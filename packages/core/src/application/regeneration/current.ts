import type { ImportFormat } from "@repo/core/domain/import/entity";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote } from "../workspace/access";

export async function requireRegenerationNote(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  token: string | null,
  noteId: string,
) {
  const account = await requireAccount(c, u.accounts, token);
  const note = await requireNote(
    u,
    await u.notes.findById(noteId),
    account.id,
    "edit",
  );
  if (
    note.owner.kind === "workspace" &&
    (await u.workspaces.find(note.owner.workspaceId))?.state !== "active"
  )
    throw new NotFoundError(
      "NOTE_NOT_FOUND",
      "ノートが見つからないか、現在はアクセスできません。",
    );
  return { account, note };
}

export type RegenerationRecordState = Readonly<{
  format: ImportFormat | null;
}> &
  (
    | Readonly<{ availability: "available"; reason: null }>
    | Readonly<{
        availability: "unavailable";
        reason:
          | "source-invalid"
          | "format-unsupported"
          | "recorder-unavailable"
          | "drive-unlinked"
          | "drive-needs-relink"
          | "drive-account-changed";
      }>
  );

export async function regenerationRecordState(
  u: HollowUnitOfWorkContext,
  noteId: string,
  record: DriveBackupRecord,
): Promise<RegenerationRecordState> {
  const original = await u.imports.findOriginal(record.originalId);
  const target = await u.driveBackupTargets.find(record.targetId);
  if (
    record.noteId !== noteId ||
    !original ||
    original.id !== record.originalId ||
    original.noteId !== noteId ||
    original.bytes !== record.bytes ||
    original.sha256 !== record.sha256 ||
    !target ||
    target.id !== record.targetId ||
    target.state !== "confirmed" ||
    target.noteId !== noteId ||
    target.originalId !== record.originalId ||
    target.accountId !== record.accountId ||
    target.subject !== record.subject ||
    target.fileId !== record.fileId ||
    target.folder.id !== record.folder.id ||
    target.folder.driveId !== record.folder.driveId
  )
    return {
      format: null,
      availability: "unavailable",
      reason: "source-invalid",
    };
  const format = original.format;
  if (format === "audio")
    return {
      format,
      availability: "unavailable",
      reason: "format-unsupported",
    };
  const recorder = await u.accounts.findById(record.accountId);
  if (!recorder || recorder.status !== "verified")
    return {
      format,
      availability: "unavailable",
      reason: "recorder-unavailable",
    };
  const connection = await u.driveConnections.find(record.accountId);
  if (!connection || connection.state === "unlinked")
    return {
      format,
      availability: "unavailable",
      reason: "drive-unlinked",
    };
  if (connection.credential.subject !== record.subject)
    return {
      format,
      availability: "unavailable",
      reason: "drive-account-changed",
    };
  if (connection.state === "needs-relink")
    return {
      format,
      availability: "unavailable",
      reason: "drive-needs-relink",
    };
  return { format, availability: "available", reason: null };
}

import type {
  DriveBackupFailure,
  DriveBackupRequest,
} from "@repo/core/domain/integration/driveBackup";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { driveChanged } from "../current";
import {
  backupAdmissionChanged,
  captureBackup,
  insertSnapshotJob,
  parentRoom,
  usableBackupConnection,
} from "./admission";

export async function admitAutomaticInTransaction(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  input: Readonly<{
    accountId: string;
    noteId: string;
    originalId: string;
    commandId: string;
  }>,
) {
  const connection = await u.driveConnections.find(input.accountId);
  if (!connection?.autoBackup) return null;
  if (!usableBackupConnection(connection)) throw driveChanged();
  const note = await u.notes.findById(input.noteId);
  const original = await u.imports.findOriginal(input.originalId);
  if (!note || !original || original.noteId !== note.id) throw driveChanged();
  const digest = c.tokens.hash(
    JSON.stringify([
      "drive-backup-auto",
      1,
      input.accountId,
      input.commandId,
      original.id,
    ]),
  );
  const old = await u.driveBackupRequests.command(
    input.accountId,
    input.commandId,
  );
  if (old) {
    if (old.intentDigest !== digest) throw driveChanged();
    return old.id;
  }
  const capture = await captureBackup(
    c,
    u,
    input.accountId,
    note,
    original,
    connection,
  );
  const live = await u.driveBackupJobs.activeTarget(capture.target.id);
  if (live) return live.requestId;
  const failure: DriveBackupFailure | undefined =
    connection.state === "needs-relink"
      ? "DRIVE_BACKUP_REFRESH_REQUIRED"
      : !c.drive?.backup ||
          !c.drive.protector.available() ||
          !c.importing?.storage.withOwner ||
          !(await parentRoom(u, input.accountId))
        ? "DRIVE_BACKUP_UNAVAILABLE"
        : undefined;
  const now = c.clock.now();
  const request: DriveBackupRequest = {
    id: c.idGenerator.next(),
    accountId: input.accountId,
    commandId: input.commandId,
    intentDigest: digest,
    kind: "automatic",
    count: 1,
    version: 1,
    createdAt: now,
    cancelledAt: null,
    rootRequestId: null,
    bulkSummary: null,
    generation: 1,
  };
  await u.driveBackupRequests.insert(request);
  await insertSnapshotJob(
    c,
    u,
    request,
    capture,
    0,
    failure ? { failure } : {},
  );
  if (!failure && !capture.record)
    await backupAdmissionChanged(c, u, connection);
  return request.id;
}

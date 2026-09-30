import type { DriveConnection } from "@repo/core/domain/integration/drive";
import {
  backupFolderMatches,
  type DriveBackupTarget,
  type DriveBackupTransfer,
  driveBackupTerminal,
} from "@repo/core/domain/integration/driveBackup";
import type { DriveSecretBinding, DriveSecretProtector } from "../ports";

export function backupTargetKey(
  protector: DriveSecretProtector,
  target: DriveBackupTarget,
) {
  return target.folder.resourceKeyEnvelope === null
    ? null
    : protector.reveal(target.folder.resourceKeyEnvelope, {
        purpose: "resource-key",
        accountId: target.accountId,
        subject: target.subject,
        epoch: target.folderEpoch,
        fileId: target.folder.id,
      });
}

export function backupFolderCurrent(
  protector: DriveSecretProtector,
  target: DriveBackupTarget,
  connection: DriveConnection,
) {
  if (
    connection.state !== "linked" ||
    !connection.folder ||
    target.accountId !== connection.accountId ||
    target.subject !== connection.credential.subject ||
    target.folder.id !== connection.folder.id ||
    target.folder.driveId !== connection.folder.driveId
  )
    return false;
  const envelope = connection.folder.resourceKeyEnvelope;
  try {
    const key =
      envelope === null
        ? null
        : protector.reveal(envelope, {
            purpose: "resource-key",
            accountId: connection.accountId,
            subject: connection.credential.subject,
            epoch: connection.epoch,
            fileId: connection.folder.id,
          });
    return backupTargetKey(protector, target) === key;
  } catch {
    return false;
  }
}

export function backupTargetMatches(
  row: DriveBackupTransfer,
  target: DriveBackupTarget,
) {
  const i = row.identity;
  return (
    row.targetId === target.id &&
    i.accountId === target.accountId &&
    i.subject === target.subject &&
    i.noteId === target.noteId &&
    i.originalId === target.originalId &&
    backupFolderMatches(i.folder, target.folder)
  );
}

export function backupSessionBinding(
  row: DriveBackupTransfer,
  fileId: string,
): DriveSecretBinding {
  return {
    purpose: "backup-session",
    accountId: row.identity.accountId,
    subject: row.identity.subject,
    epoch: row.identity.epoch,
    transferId: row.id,
    fileId,
  };
}

export function backupReceivedWithinIntent(
  row: DriveBackupTransfer,
  offset: number,
) {
  return (
    Number.isSafeInteger(offset) &&
    offset >= row.received &&
    offset < row.identity.bytes &&
    (row.phase === "uploading"
      ? offset <= row.offset + row.length
      : offset === row.received)
  );
}

export function backupPriorMatches(
  prior: DriveBackupTransfer,
  row: DriveBackupTransfer,
  target: DriveBackupTarget,
) {
  return (
    driveBackupTerminal(prior.phase) &&
    prior.phase !== "succeeded" &&
    prior.owner.state === "closed" &&
    !prior.readPinned &&
    !prior.refreshPending &&
    backupTargetMatches(prior, target) &&
    backupTargetMatches(row, target) &&
    prior.identity.storageKey === row.identity.storageKey &&
    prior.identity.bytes === row.identity.bytes &&
    prior.identity.sha256 === row.identity.sha256
  );
}

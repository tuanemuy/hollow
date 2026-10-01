import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import type { DriveConnection } from "@repo/core/domain/integration/drive";
import {
  backupHasSnapshot,
  DRIVE_BACKUP_LIMITS,
  type DriveBackupFailure,
  type DriveBackupIdentity,
  type DriveBackupJob,
  type DriveBackupRecord,
  type DriveBackupRequest,
  type DriveBackupTarget,
  type DriveBackupTransfer,
  driveBackupIdentitySchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import type { Note } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { canScope } from "../../../workspace/access";
import { driveChanged } from "../current";
import { backupFolderCurrent, backupTargetMatches } from "./recovery";

export type BackupConnection = Extract<
  DriveConnection,
  { state: "linked" | "needs-relink" }
> & { folder: NonNullable<DriveConnection["folder"]> };
export type BackupCapture = Readonly<{
  identity: DriveBackupIdentity;
  target: DriveBackupTarget;
  record: DriveBackupRecord | null;
  title: string;
}>;
export function backupUnavailable(code: DriveBackupFailure): never {
  throw new BusinessRuleError(
    code,
    "バックアップの条件を確認してください。原本は保全されています。",
  );
}
export function usableBackupConnection(
  row: DriveConnection | null,
): row is BackupConnection {
  return row !== null && row.state !== "unlinked" && row.folder !== null;
}
export async function captureBackup(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  note: Note,
  original: Original,
  connection: BackupConnection,
): Promise<BackupCapture> {
  if (original.noteId !== note.id || connection.accountId !== accountId)
    throw driveChanged();
  const generation = await u.driveBackupTransfers.sourceGeneration(note.id);
  if (generation === null) throw driveChanged();
  const now = c.clock.now();
  let target = await u.driveBackupTargets.original(
    original.id,
    accountId,
    connection.credential.subject,
  );
  if (!target) {
    target = {
      id: c.idGenerator.next(),
      originalId: original.id,
      noteId: note.id,
      accountId,
      subject: connection.credential.subject,
      marker: c.idGenerator.next(),
      folder: connection.folder,
      folderEpoch: connection.epoch,
      fileId: null,
      state: "unallocated",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    await u.driveBackupTargets.insertInitial(target);
  }
  const identity = parseDriveBackup(driveBackupIdentitySchema, {
    noteId: note.id,
    originalId: original.id,
    accountId,
    workspaceId:
      note.owner.kind === "workspace" ? note.owner.workspaceId : null,
    ownershipGeneration: generation,
    storageKey: original.storageKey,
    bytes: original.bytes,
    sha256: original.sha256,
    name: original.name,
    subject: connection.credential.subject,
    epoch: connection.epoch,
    settingsVersion: connection.settingsVersion,
    folder: target.folder,
  });
  return {
    identity,
    target,
    record: await u.driveBackupRecords.target(target.id),
    title: note.title,
  };
}
export function backupWake(c: HollowContainer, u: HollowUnitOfWorkContext) {
  u.afterCommit(() => {
    c.drive?.wake();
    return undefined;
  });
}
export async function backupAdmissionChanged(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  connection: BackupConnection,
) {
  if (
    !(await u.driveConnections.replace(
      {
        ...connection,
        version: connection.version + 1,
        admissionSequence: connection.admissionSequence + 1,
        updatedAt: c.clock.now(),
      },
      connection.version,
      "folder-admission",
    ))
  )
    throw driveChanged();
  backupWake(c, u);
}
export async function parentRoom(
  u: HollowUnitOfWorkContext,
  accountId: string,
) {
  const count = await u.driveBackupRequests.unfinished(accountId);
  return (
    count.account < DRIVE_BACKUP_LIMITS.accountQueued &&
    count.global < DRIVE_BACKUP_LIMITS.globalQueued
  );
}
export async function insertSnapshotJob(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: DriveBackupRequest,
  capture: BackupCapture,
  ordinal: number,
  options: Readonly<{
    failure?: DriveBackupFailure;
    prior?: DriveBackupJob;
    rootOrdinal?: number;
  }> = {},
) {
  if (!(await u.driveBackupTargets.isCurrent(capture.target.id)))
    throw driveChanged();
  const now = c.clock.now();
  const base = {
    id: c.idGenerator.next(),
    requestId: request.id,
    accountId: request.accountId,
    ordinal,
    attempt: (options.prior?.attempt ?? 0) + 1,
    retryOf: options.prior?.id ?? null,
    noteId: capture.identity.noteId,
    targetId: capture.target.id,
    title: capture.title,
    version: 1,
    createdAt: now,
    updatedAt: now,
    admissionIdentity: capture.identity,
    rootOrdinal:
      request.kind === "bulk" ? (options.rootOrdinal ?? ordinal) : null,
  };
  const job: DriveBackupJob = options.failure
    ? {
        ...base,
        state: "failed",
        failure: options.failure,
        bytes: 0,
        terminalAt: now,
      }
    : capture.record
      ? {
          ...base,
          state: "succeeded",
          recordId: capture.record.id,
          bytes: capture.record.bytes,
          terminalAt: now,
        }
      : { ...base, state: "queued", bytes: 0, terminalAt: null };
  await u.driveBackupJobs.insert(job);
  return job;
}
export async function currentSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  identity: DriveBackupIdentity,
  target: DriveBackupTarget,
) {
  const account = await u.accounts.findById(identity.accountId);
  const note = await u.notes.findById(identity.noteId);
  const original = await u.imports.findByNote(identity.noteId);
  const connection = await u.driveConnections.find(identity.accountId);
  if (
    account?.status !== "verified" ||
    !note ||
    note.lifecycle.kind !== "active" ||
    !original ||
    original.id !== identity.originalId ||
    original.storageKey !== identity.storageKey ||
    original.bytes !== identity.bytes ||
    original.sha256 !== identity.sha256 ||
    (await u.driveBackupTransfers.sourceGeneration(note.id)) !==
      identity.ownershipGeneration ||
    (note.owner.kind === "workspace" ? note.owner.workspaceId : null) !==
      identity.workspaceId ||
    !(await canScope(u, note.owner, identity.accountId, "edit")) ||
    (identity.workspaceId !== null &&
      (await u.workspaces.find(identity.workspaceId))?.state !== "active") ||
    !usableBackupConnection(connection) ||
    connection.state !== "linked" ||
    connection.epoch !== identity.epoch ||
    connection.credential.subject !== identity.subject ||
    !c.drive?.protector.available() ||
    !(await u.driveBackupTargets.isCurrent(target.id)) ||
    !backupFolderCurrent(c.drive.protector, target, connection)
  )
    return null;
  return connection;
}
export async function fillBackupQueue(
  c: HollowContainer,
  after: string | null = null,
) {
  let last = after;
  for (let turn = 0; turn < 100; turn++) {
    const result = await c.unitOfWorkProvider.run(async (u) => {
      const actor = await u.driveBackupJobs.nextWaitingActor(last);
      if (!actor) return null;
      const [job] = await u.driveBackupJobs.waiting(actor, 1);
      if (!job || !backupHasSnapshot(job)) throw driveChanged();
      const parent = await u.driveBackupRequests.find(job.requestId);
      const root = parent?.rootRequestId
        ? await u.driveBackupRequests.find(parent.rootRequestId)
        : parent;
      const target = await u.driveBackupTargets.find(job.targetId);
      const now = c.clock.now();
      const deadline = new Date(
        job.createdAt.getTime() + DRIVE_BACKUP_LIMITS.executionMs,
      );
      const connection = target
        ? await currentSnapshot(c, u, job.admissionIdentity, target)
        : null;
      const failure =
        deadline <= now
          ? "DRIVE_BACKUP_EXPIRED"
          : !connection || !target
            ? "DRIVE_BACKUP_CHANGED"
            : null;
      if (!parent || !root) throw driveChanged();
      if (parent.cancelledAt || root.cancelledAt || failure) {
        const finished: DriveBackupJob =
          parent.cancelledAt || root.cancelledAt
            ? {
                ...job,
                state: "cancelled",
                bytes: 0,
                version: job.version + 1,
                updatedAt: now,
                terminalAt: now,
              }
            : {
                ...job,
                state: "failed",
                failure: failure!,
                bytes: 0,
                version: job.version + 1,
                updatedAt: now,
                terminalAt: now,
              };
        if (!(await u.driveBackupJobs.replace(finished, job.version)))
          throw driveChanged();
        return { actor, progressed: true };
      }
      const counts = await u.driveBackupJobs.queued(actor);
      if (
        counts.account >= DRIVE_BACKUP_LIMITS.accountQueued ||
        counts.global >= DRIVE_BACKUP_LIMITS.globalQueued
      )
        return { actor, progressed: false };
      const transfer: DriveBackupTransfer = {
        id: c.idGenerator.next(),
        jobId: job.id,
        targetId: job.targetId,
        identity: job.admissionIdentity,
        owner: { state: "none" },
        credentialVersion: connection!.credentialVersion,
        version: 1,
        cancelGeneration: 0,
        received: 0,
        sessionEnvelope: null,
        statusAttempts: 0,
        readPinned: false,
        refreshPending: false,
        createdAt: now,
        updatedAt: now,
        deadlineAt: deadline,
        phase: "queued",
      };
      if (!backupTargetMatches(transfer, target!)) throw driveChanged();
      await u.driveBackupTransfers.insert(transfer);
      return { actor, progressed: true };
    });
    if (!result) break;
    if (!result.progressed && result.actor === last) break;
    last = result.actor;
  }
  return last;
}

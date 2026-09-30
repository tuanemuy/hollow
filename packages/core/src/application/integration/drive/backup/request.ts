import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupIdentity,
  type DriveBackupJob,
  type DriveBackupTransfer,
  driveBackupIdentitySchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import { requireNote } from "../../../workspace/access";
import { driveActor, driveChanged, driveServices } from "../current";
import { backupPhase } from "./runner";

export type DriveBackupRequestInput = Readonly<{
  commandId: string;
  noteId: string;
  expectedEpoch: number;
  expectedSettingsVersion: number;
}>;

export async function requestDriveBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveBackupRequestInput,
) {
  if (!driveServices(c).backup || !c.importing?.storage.withOwner)
    throw new BusinessRuleError(
      "DRIVE_BACKUP_UNAVAILABLE",
      "バックアップはこの環境で提供されていません。",
    );
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const now = c.clock.now();
    const note = await requireNote(
      u,
      await u.notes.findById(input.noteId),
      actor.accountId,
      "edit",
    );
    if (
      note.owner.kind === "workspace" &&
      (await u.workspaces.find(note.owner.workspaceId))?.state !== "active"
    )
      throw driveChanged();
    const original = await u.imports.findByNote(note.id);
    if (!original)
      throw new BusinessRuleError(
        "DRIVE_BACKUP_SOURCE_INVALID",
        "このノートにはバックアップする原本がありません。",
      );
    const digest = c.tokens.hash(
      JSON.stringify([
        "drive-backup",
        1,
        actor.accountId,
        input.noteId,
        input.expectedEpoch,
        input.expectedSettingsVersion,
      ]),
    );
    const old = await u.driveBackupRequests.command(
      actor.accountId,
      input.commandId,
    );
    if (old) {
      if (old.intentDigest !== digest) throw driveChanged();
      const [job] = await u.driveBackupJobs.forRequest(old.id);
      if (!job) throw driveChanged();
      return { requestId: old.id, jobId: job.id, accepted: false };
    }
    if (
      (await u.driveAttempts.findByCommand(actor.accountId, input.commandId)) ||
      (await u.driveControls.findByCommand(actor.accountId, input.commandId))
    )
      throw driveChanged();
    const connection = await u.driveConnections.find(actor.accountId);
    if (
      !connection ||
      connection.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      connection.settingsVersion !== input.expectedSettingsVersion
    )
      throw new BusinessRuleError(
        "DRIVE_BACKUP_REFRESH_REQUIRED",
        "現在のDrive連携を確認してください。",
      );
    if (!connection.folder)
      throw new BusinessRuleError(
        "DRIVE_BACKUP_FOLDER_UNAVAILABLE",
        "保存先フォルダを確認・選択してください。",
      );
    const ownershipGeneration = await u.driveBackupTransfers.sourceGeneration(
      note.id,
    );
    if (ownershipGeneration === null) throw driveChanged();
    const identity: DriveBackupIdentity = parseDriveBackup(
      driveBackupIdentitySchema,
      {
        noteId: note.id,
        originalId: original.id,
        accountId: actor.accountId,
        workspaceId:
          note.owner.kind === "workspace" ? note.owner.workspaceId : null,
        ownershipGeneration,
        storageKey: original.storageKey,
        bytes: original.bytes,
        sha256: original.sha256,
        name: original.name,
        subject: connection.credential.subject,
        epoch: connection.epoch,
        settingsVersion: connection.settingsVersion,
        folder: connection.folder,
      },
    );
    const existing = await u.driveBackupTargets.original(
      original.id,
      actor.accountId,
      identity.subject,
    );
    const record = existing
      ? await u.driveBackupRecords.target(existing.id)
      : null;
    if (existing && !record) {
      const active = (await u.driveBackupTransfers.forTarget(existing.id)).find(
        (v) =>
          !["succeeded", "failed", "cancelled"].includes(v.phase) ||
          v.owner.state === "active" ||
          v.owner.state === "unknown",
      );
      if (active?.jobId) {
        const job = await u.driveBackupJobs.find(active.jobId);
        if (!job) throw driveChanged();
        return { requestId: job.requestId, jobId: job.id, accepted: false };
      }
      throw new BusinessRuleError(
        "DRIVE_BACKUP_UNKNOWN",
        "前回のバックアップ結果を確認してください。別のファイルは作成していません。",
      );
    }
    const queued = await u.driveBackupJobs.queued(actor.accountId);
    if (
      !record &&
      (queued.account >= DRIVE_BACKUP_LIMITS.accountQueued ||
        queued.global >= DRIVE_BACKUP_LIMITS.globalQueued)
    )
      throw new BusinessRuleError(
        "DRIVE_BACKUP_UNAVAILABLE",
        "処理中のバックアップの終了後に再試行してください。",
      );
    const requestId = c.idGenerator.next();
    const jobId = c.idGenerator.next();
    await u.driveBackupRequests.insert({
      id: requestId,
      accountId: actor.accountId,
      commandId: input.commandId,
      intentDigest: digest,
      kind: "manual",
      version: 1,
      createdAt: now,
      cancelledAt: null,
      count: 1,
    });
    const target = existing ?? {
      id: c.idGenerator.next(),
      originalId: original.id,
      noteId: note.id,
      accountId: actor.accountId,
      subject: identity.subject,
      marker: c.idGenerator.next(),
      folder: identity.folder,
      folderEpoch: identity.epoch,
      version: 1,
      createdAt: now,
      updatedAt: now,
      state: "unallocated" as const,
      fileId: null,
    };
    if (!existing) await u.driveBackupTargets.insert(target);
    const base = {
      id: jobId,
      requestId,
      accountId: actor.accountId,
      ordinal: 0,
      attempt: 1,
      retryOf: null,
      noteId: note.id,
      targetId: target.id,
      title: note.title,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const job: DriveBackupJob = record
      ? {
          ...base,
          state: "succeeded",
          bytes: record.bytes,
          recordId: record.id,
          terminalAt: now,
        }
      : { ...base, state: "queued", bytes: 0, terminalAt: null };
    await u.driveBackupJobs.insert(job);
    if (!record) {
      const transfer: DriveBackupTransfer = {
        id: c.idGenerator.next(),
        jobId,
        targetId: target.id,
        identity,
        phase: "queued",
        owner: { state: "none" },
        credentialVersion: connection.credentialVersion,
        version: 1,
        cancelGeneration: 0,
        received: 0,
        sessionEnvelope: null,
        statusAttempts: 0,
        readPinned: false,
        refreshPending: false,
        createdAt: now,
        updatedAt: now,
        deadlineAt: new Date(now.getTime() + DRIVE_BACKUP_LIMITS.executionMs),
      };
      await u.driveBackupTransfers.insert(transfer);
      if (
        !(await u.driveConnections.replace(
          {
            ...connection,
            version: connection.version + 1,
            admissionSequence: connection.admissionSequence + 1,
            updatedAt: now,
          },
          connection.version,
          "folder-admission",
        ))
      )
        throw driveChanged();
      u.afterCommit(() => {
        c.drive?.wake();
        return undefined;
      });
    }
    return { requestId, jobId, accepted: true };
  });
}

export async function cancelDriveBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{ jobId: string }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const now = c.clock.now();
    const job = await u.driveBackupJobs.find(input.jobId);
    if (!job || job.accountId !== actor.accountId) throw driveChanged();
    if (job.terminalAt !== null || !job.targetId) return { cancelled: false };
    const rows = await u.driveBackupTransfers.forTarget(job.targetId);
    const row = rows.find((value) => value.jobId === job.id);
    if (!row || row.identity.accountId !== actor.accountId)
      throw driveChanged();
    const next = backupPhase(
      row,
      "cancelled",
      { cancelGeneration: row.cancelGeneration + 1 },
      now,
    );
    if (
      !(await u.driveBackupTransfers.replace(next, row.version)) ||
      !(await u.driveBackupJobs.replace(
        {
          ...job,
          state: "cancelled",
          bytes: row.received,
          version: job.version + 1,
          updatedAt: now,
          terminalAt: now,
        },
        job.version,
      ))
    )
      throw driveChanged();
    u.afterCommit(() => {
      if (row.owner.state === "active" || row.owner.state === "unknown")
        c.drive?.execution.abort({ ...row.owner, state: row.owner.state });
      c.drive?.wake();
      return undefined;
    });
    return { cancelled: true };
  });
}

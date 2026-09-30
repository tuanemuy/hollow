import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveConnection } from "@repo/core/domain/integration/drive";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupFailure,
  type DriveBackupRecord,
  type DriveBackupTarget,
  type DriveBackupTransfer,
  driveBackupFailureSchema,
  driveBackupTerminal,
  driveBackupTransferSchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { isObjectReadCloseUnprovenError } from "../../../ports/objectStorage";
import { canScope } from "../../../workspace/access";
import {
  protectDriveTokens,
  revealDriveCredential,
  validateTokens,
} from "../credentials";
import { driveChanged, driveServices } from "../current";
import type { DriveClosedProof } from "../ports";
import { driveOwner, driveTarget, sameDriveOwner } from "../runner";
import {
  DriveBackupOwnershipUnprovenError,
  isDriveBackupOwnershipUnprovenError,
} from "./ownershipError";
import type { DriveBackupFile, DriveBackupReceived } from "./ports";
import {
  backupFolderCurrent,
  backupPriorMatches,
  backupReceivedWithinIntent,
  backupSessionBinding,
  backupTargetKey,
  backupTargetMatches,
} from "./recovery";

const failed = (code: DriveBackupFailure): never => {
  throw new BusinessRuleError(
    code,
    "バックアップの状態を確認してください。原本は保全されています。",
  );
};
type Linked = DriveConnection & { state: "linked" };
type Outcome =
  | Readonly<{ kind: "file"; file: DriveBackupFile }>
  | Readonly<{ kind: "failure"; failure: DriveBackupFailure }>;

export function backupPhase(
  row: DriveBackupTransfer,
  phase: DriveBackupTransfer["phase"],
  patch: Readonly<Record<string, unknown>>,
  now: Date,
): DriveBackupTransfer {
  const {
    phase: _phase,
    offset: _offset,
    length: _length,
    recordId: _record,
    failure: _failure,
    ...base
  } = {
    offset: undefined,
    length: undefined,
    recordId: undefined,
    failure: undefined,
    ...row,
  };
  return parseDriveBackup(driveBackupTransferSchema, {
    ...base,
    ...patch,
    phase,
    version: row.version + 1,
    updatedAt: now,
  });
}

export async function backupCurrent(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  row: DriveBackupTransfer,
): Promise<Linked | null> {
  const i = row.identity;
  const account = await u.accounts.findById(i.accountId);
  const note = await u.notes.findById(i.noteId);
  const original = await u.imports.findByNote(i.noteId);
  const connection = await u.driveConnections.find(i.accountId);
  const target = await u.driveBackupTargets.find(row.targetId);
  if (
    row.cancelGeneration ||
    row.deadlineAt <= c.clock.now() ||
    account?.status !== "verified" ||
    !note ||
    note.lifecycle.kind !== "active" ||
    (await u.driveBackupTransfers.sourceGeneration(i.noteId)) !==
      i.ownershipGeneration ||
    (note.owner.kind === "workspace" ? note.owner.workspaceId : null) !==
      i.workspaceId ||
    !(await canScope(u, note.owner, i.accountId, "edit")) ||
    (i.workspaceId !== null &&
      (await u.workspaces.find(i.workspaceId))?.state !== "active") ||
    !original ||
    original.id !== i.originalId ||
    original.storageKey !== i.storageKey ||
    original.bytes !== i.bytes ||
    original.sha256 !== i.sha256 ||
    !connection ||
    connection.state !== "linked" ||
    connection.epoch !== i.epoch ||
    connection.settingsVersion !== i.settingsVersion ||
    connection.credential.subject !== i.subject ||
    !connection.folder ||
    !target ||
    !backupTargetMatches(row, target) ||
    !backupFolderCurrent(driveServices(c).protector, target, connection)
  )
    return null;
  return connection;
}

async function current(
  c: HollowContainer,
  captured: DriveBackupTransfer,
  signal: AbortSignal,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveBackupTransfers.find(captured.id);
    if (
      !row ||
      row.owner.state !== "active" ||
      !sameDriveOwner(row.owner, captured.owner) ||
      signal.aborted ||
      driveBackupTerminal(row.phase)
    )
      return failed("DRIVE_BACKUP_CANCELLED");
    const connection = await backupCurrent(c, u, row);
    if (!connection)
      return failed(
        row.deadlineAt <= c.clock.now()
          ? "DRIVE_BACKUP_EXPIRED"
          : "DRIVE_BACKUP_CHANGED",
      );
    return { row, connection };
  });
}
async function change(
  c: HollowContainer,
  captured: DriveBackupTransfer,
  signal: AbortSignal,
  phase: DriveBackupTransfer["phase"],
  patch: Readonly<Record<string, unknown>> = {},
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveBackupTransfers.find(captured.id);
    if (
      !row ||
      !sameDriveOwner(row.owner, captured.owner) ||
      row.owner.state !== "active" ||
      signal.aborted ||
      driveBackupTerminal(row.phase) ||
      !(await backupCurrent(c, u, row))
    )
      return failed("DRIVE_BACKUP_CHANGED");
    const next = backupPhase(row, phase, patch, c.clock.now());
    if (!(await u.driveBackupTransfers.replace(next, row.version)))
      throw driveChanged();
    if (next.jobId) {
      const job = await u.driveBackupJobs.find(next.jobId);
      if (
        job?.terminalAt === null &&
        !(await u.driveBackupJobs.replace(
          {
            ...job,
            state: "running",
            version: job.version + 1,
            updatedAt: c.clock.now(),
            bytes: next.received,
          },
          job.version,
        ))
      )
        throw driveChanged();
    }
    return next;
  });
}
function folderKey(c: HollowContainer, target: DriveBackupTarget) {
  return backupTargetKey(driveServices(c).protector, target);
}

async function access(
  c: HollowContainer,
  captured: DriveBackupTransfer,
  signal: AbortSignal,
): Promise<string> {
  const service = driveServices(c);
  let snapshot = await current(c, captured, signal);
  if (snapshot.connection.credential.accessExpiresAt > c.clock.now()) {
    if (
      snapshot.row.credentialVersion !== snapshot.connection.credentialVersion
    )
      await change(c, captured, signal, snapshot.row.phase, {
        credentialVersion: snapshot.connection.credentialVersion,
        ...(snapshot.row.phase === "uploading"
          ? { offset: snapshot.row.offset, length: snapshot.row.length }
          : {}),
      });
    return revealDriveCredential(c, snapshot.connection).accessToken;
  }
  const revision = service.execution.changeRevision();
  const reserve = () =>
    service.execution.coordinate("claim", () =>
      c.unitOfWorkProvider.run(async (u) => {
        const row = await u.driveBackupTransfers.find(captured.id);
        if (
          !row ||
          row.owner.state !== "active" ||
          !sameDriveOwner(row.owner, captured.owner) ||
          signal.aborted ||
          driveBackupTerminal(row.phase)
        )
          return null;
        const connection = await backupCurrent(c, u, row);
        if (!connection) return null;
        if (connection.credential.accessExpiresAt > c.clock.now())
          return { row, connection, refresh: false };
        if ((await u.driveControls.held(row.identity.accountId)).account > 0)
          return null;
        const next = {
          ...row,
          credentialVersion: connection.credentialVersion,
          refreshPending: true,
          version: row.version + 1,
          updatedAt: c.clock.now(),
        };
        if (!(await u.driveBackupTransfers.replace(next, row.version)))
          throw driveChanged();
        return { row: next, connection, refresh: true };
      }),
    );
  let reserved = await reserve();
  if (!reserved) {
    await service.execution.waitForChange(revision, signal);
    reserved = await reserve();
  }
  if (!reserved) return failed("DRIVE_BACKUP_REFRESH_REQUIRED");
  if (!reserved.refresh)
    return revealDriveCredential(c, reserved.connection).accessToken;
  const old = revealDriveCredential(c, reserved.connection);
  const tokens = await service.authorization.refresh({
    refreshToken: old.refreshToken,
    signal,
  });
  validateTokens(tokens);
  if (
    signal.aborted ||
    tokens.accessExpiresAt <= c.clock.now() ||
    (tokens.scope !== null &&
      !["openid", "https://www.googleapis.com/auth/drive.file"].every((scope) =>
        tokens.scope?.split(" ").includes(scope),
      ))
  )
    return failed("DRIVE_BACKUP_REFRESH_REQUIRED");
  snapshot = await current(c, captured, signal);
  await c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveBackupTransfers.find(captured.id);
    if (
      !row ||
      row.owner.state !== "active" ||
      !row.refreshPending ||
      !sameDriveOwner(row.owner, captured.owner) ||
      signal.aborted
    )
      return failed("DRIVE_BACKUP_CHANGED");
    const connection = await backupCurrent(c, u, row);
    if (
      !connection ||
      connection.version !== reserved.connection.version ||
      connection.credentialVersion !== reserved.connection.credentialVersion
    )
      return failed("DRIVE_BACKUP_CHANGED");
    const version = connection.credentialVersion + 1;
    const next: Linked = {
      ...connection,
      version: connection.version + 1,
      credentialVersion: version,
      updatedAt: c.clock.now(),
      credential: {
        ...connection.credential,
        accessExpiresAt: tokens.accessExpiresAt,
        envelope: protectDriveTokens(
          c,
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? old.refreshToken,
          },
          {
            purpose: "credential",
            accountId: connection.accountId,
            subject: connection.credential.subject,
            epoch: connection.epoch,
            credentialVersion: version,
          },
        ),
      },
    };
    if (
      !(await u.driveConnections.replace(
        next,
        connection.version,
        "refresh",
      )) ||
      !(await u.driveBackupTransfers.replace(
        {
          ...row,
          version: row.version + 1,
          updatedAt: c.clock.now(),
          credentialVersion: version,
          refreshPending: false,
        },
        row.version,
      ))
    )
      throw driveChanged();
    u.afterCommit(() => {
      service.wake();
      return undefined;
    });
  });
  return tokens.accessToken;
}

function verifyFile(
  file: DriveBackupFile,
  row: DriveBackupTransfer,
  target: DriveBackupTarget,
) {
  if (
    target.fileId !== file.id ||
    target.marker !== file.marker ||
    file.trashed ||
    file.parents.length !== 1 ||
    file.parents[0] !== target.folder.id ||
    file.bytes !== row.identity.bytes ||
    (file.sha256 !== null && file.sha256 !== row.identity.sha256)
  )
    return failed("DRIVE_BACKUP_CONFLICT");
  return file;
}
async function transfer(
  c: HollowContainer,
  captured: DriveBackupTransfer,
  signal: AbortSignal,
): Promise<DriveBackupFile> {
  const service = driveServices(c);
  const backup = service.backup;
  if (!backup) return failed("DRIVE_BACKUP_UNAVAILABLE");
  let target = await c.unitOfWorkProvider.run((u) =>
    u.driveBackupTargets.find(captured.targetId),
  );
  if (!target) return failed("DRIVE_BACKUP_CHANGED");
  let row = (await current(c, captured, signal)).row;
  const prior = await c.unitOfWorkProvider.run(async (u) => {
    const job = row.jobId ? await u.driveBackupJobs.find(row.jobId) : null;
    if (!job?.retryOf) return null;
    const old = await u.driveBackupTransfers.forJob(job.retryOf);
    if (old.kind !== "found" || !backupPriorMatches(old.row, row, target!))
      return failed("DRIVE_BACKUP_CHANGED");
    return old.row;
  });
  const key = folderKey(c, target);
  const source = await backup.source.open(row.identity, signal);
  source.closed.catch(() => {});
  try {
    await source.prepare();
    const observed = await service.folders.inspectFolder({
      accessToken: await access(c, captured, signal),
      fileId: target.folder.id,
      resourceKey: key,
      signal,
    });
    await current(c, captured, signal);
    if (observed.kind === "trashed")
      return failed("DRIVE_BACKUP_FOLDER_TRASHED");
    if (
      observed.kind !== "usable" ||
      observed.folder.id !== target.folder.id ||
      observed.folder.driveId !== target.folder.driveId
    )
      return failed("DRIVE_BACKUP_FOLDER_UNAVAILABLE");
    let freshlyAllocated = false;
    if (target.fileId !== null) {
      const previous = await backup.provider.inspectFile({
        accessToken: await access(c, captured, signal),
        fileId: target.fileId,
        resourceKey: null,
        signal,
      });
      await current(c, captured, signal);
      if (previous) return verifyFile(previous, row, target);
    } else {
      if (prior || row.phase !== "checking")
        return failed("DRIVE_BACKUP_UNKNOWN");
      await change(c, captured, signal, "allocating");
      const fileId = await backup.provider.allocateFileId({
        accessToken: await access(c, captured, signal),
        signal,
      });
      target = await c.unitOfWorkProvider.run(async (u) => {
        const saved = await u.driveBackupTransfers.find(captured.id);
        const old = await u.driveBackupTargets.find(captured.targetId);
        if (
          !saved ||
          !sameDriveOwner(saved.owner, captured.owner) ||
          signal.aborted ||
          !(await backupCurrent(c, u, saved)) ||
          !old ||
          old.fileId !== null
        )
          return failed("DRIVE_BACKUP_CHANGED");
        const next = {
          ...old,
          state: "allocated" as const,
          fileId,
          version: old.version + 1,
          updatedAt: c.clock.now(),
        };
        if (!(await u.driveBackupTargets.replace(next, old.version)))
          throw driveChanged();
        return next;
      });
      freshlyAllocated = true;
    }
    if (target.fileId === null) return failed("DRIVE_BACKUP_UNKNOWN");
    const fileId = target.fileId;
    const allocatedTarget = target;
    const inspect = async () => {
      const previous = await backup.provider.inspectFile({
        accessToken: await access(c, captured, signal),
        fileId,
        resourceKey: null,
        signal,
      });
      await current(c, captured, signal);
      return previous ? verifyFile(previous, row, allocatedTarget) : null;
    };
    const evidence =
      row.sessionEnvelope !== null
        ? row
        : row.phase === "checking"
          ? prior
          : null;
    let session: string | null = null;
    let mayStart = freshlyAllocated;
    if (evidence?.sessionEnvelope) {
      session = service.protector.reveal(
        evidence.sessionEnvelope,
        backupSessionBinding(evidence, fileId),
      );
      if (row.statusAttempts >= DRIVE_BACKUP_LIMITS.statusAttempts)
        return failed("DRIVE_BACKUP_UNKNOWN");
      row = await change(c, captured, signal, row.phase, {
        statusAttempts: row.statusAttempts + 1,
        ...(row.phase === "uploading"
          ? { offset: row.offset, length: row.length }
          : {}),
      });
      const observed = await backup.provider.queryReceived({
        accessToken: await access(c, captured, signal),
        signal,
        session,
        bytes: row.identity.bytes,
      });
      await current(c, captured, signal);
      if (observed.kind === "complete")
        return verifyFile(observed.file, row, target);
      if (
        observed.kind === "incomplete" &&
        backupReceivedWithinIntent(evidence, observed.offset)
      ) {
        row = await change(c, captured, signal, "reconciling", {
          received: observed.offset,
          sessionEnvelope: service.protector.protect(
            session,
            backupSessionBinding(row, fileId),
          ),
        });
      } else {
        const completed = await inspect();
        if (completed) return completed;
        if (
          observed.kind !== "session-expired" ||
          evidence.id === row.id ||
          !prior
        )
          return failed("DRIVE_BACKUP_UNKNOWN");
        mayStart = true;
        session = null;
      }
    }
    if (session === null) {
      if (!mayStart) return failed("DRIVE_BACKUP_UNKNOWN");
      row = await change(c, captured, signal, "initiating", {
        sessionEnvelope: null,
      });
      const started = await backup.provider.startResumable({
        accessToken: await access(c, captured, signal),
        signal,
        fileId,
        folderId: target.folder.id,
        folderResourceKey: key,
        marker: target.marker,
        name: row.identity.name,
        bytes: row.identity.bytes,
      });
      await current(c, captured, signal);
      if (started.kind !== "started") {
        const completed = await inspect();
        if (completed) return completed;
        return failed("DRIVE_BACKUP_UNKNOWN");
      }
      session = started.session;
      row = await change(c, captured, signal, "reconciling", {
        sessionEnvelope: service.protector.protect(
          session,
          backupSessionBinding(row, fileId),
        ),
      });
    }
    while (row.received < row.identity.bytes) {
      const length = Math.min(
        DRIVE_BACKUP_LIMITS.chunkBytes,
        row.identity.bytes - row.received,
      );
      const chunk = await source.readRange(row.received, length);
      row = await change(c, captured, signal, "uploading", {
        offset: row.received,
        length,
      });
      let result: DriveBackupReceived;
      try {
        result = await backup.provider.uploadChunk({
          accessToken: await access(c, captured, signal),
          signal,
          session,
          bytes: row.identity.bytes,
          offset: row.received,
          chunk,
        });
      } catch (error) {
        if (error instanceof BusinessRuleError) throw error;
        // An uncertain write is followed only by a status query, never a blind replay.
        result = { kind: "unknown" };
      }
      await current(c, captured, signal);
      if (result.kind === "unknown") {
        if (row.statusAttempts >= DRIVE_BACKUP_LIMITS.statusAttempts)
          return failed("DRIVE_BACKUP_UNKNOWN");
        row = await change(c, captured, signal, "uploading", {
          offset: row.received,
          length,
          statusAttempts: row.statusAttempts + 1,
        });
        result = await backup.provider.queryReceived({
          accessToken: await access(c, captured, signal),
          signal,
          session,
          bytes: row.identity.bytes,
        });
        await current(c, captured, signal);
      }
      if (result.kind === "complete") {
        verifyFile(result.file, row, target);
        row = await change(c, captured, signal, "verifying", {
          received: row.identity.bytes,
        });
        break;
      }
      if (result.kind === "session-expired" || result.kind === "conflict") {
        const previous = await backup.provider.inspectFile({
          accessToken: await access(c, captured, signal),
          fileId,
          resourceKey: null,
          signal,
        });
        await current(c, captured, signal);
        if (previous) return verifyFile(previous, row, target);
        return failed("DRIVE_BACKUP_UNKNOWN");
      }
      if (
        result.kind !== "incomplete" ||
        !backupReceivedWithinIntent(row, result.offset)
      ) {
        const completed = await inspect();
        if (completed) return completed;
        return failed("DRIVE_BACKUP_UNKNOWN");
      }
      const unchanged = result.offset === row.received;
      if (unchanged && row.statusAttempts >= DRIVE_BACKUP_LIMITS.statusAttempts)
        return failed("DRIVE_BACKUP_UNKNOWN");
      row = await change(c, captured, signal, "reconciling", {
        received: result.offset,
        statusAttempts: row.statusAttempts + (unchanged ? 1 : 0),
      });
    }
    const file = await backup.provider.inspectFile({
      accessToken: await access(c, captured, signal),
      signal,
      fileId,
      resourceKey: null,
    });
    await current(c, captured, signal);
    if (!file) return failed("DRIVE_BACKUP_UNKNOWN");
    return verifyFile(file, row, target);
  } finally {
    await source.close().catch(() => {
      throw new DriveBackupOwnershipUnprovenError(captured.id);
    });
    await source.closed.catch(() => {
      throw new DriveBackupOwnershipUnprovenError(captured.id);
    });
  }
}

async function settle(
  c: HollowContainer,
  captured: DriveBackupTransfer,
  outcome: Outcome,
  closed: boolean,
  rejected: boolean,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveBackupTransfers.find(captured.id);
    if (
      !row ||
      !sameDriveOwner(row.owner, captured.owner) ||
      row.owner.state === "none" ||
      row.owner.state === "closed"
    )
      return;
    const now = c.clock.now();
    const connection = await backupCurrent(c, u, row);
    const owner = {
      ...row.owner,
      state: closed ? ("closed" as const) : ("unknown" as const),
    };
    if (
      connection &&
      rejected &&
      connection.credentialVersion === row.credentialVersion
    )
      await u.driveConnections.replace(
        {
          ...connection,
          state: "needs-relink",
          version: connection.version + 1,
          updatedAt: now,
        },
        connection.version,
        "invalidate",
      );
    let next: DriveBackupTransfer;
    if (row.phase === "cancelled")
      next = {
        ...row,
        owner,
        readPinned: !closed && row.readPinned,
        refreshPending: !closed && row.refreshPending,
        version: row.version + 1,
        updatedAt: now,
      };
    else if (closed && connection && outcome.kind === "file") {
      const target = await u.driveBackupTargets.find(row.targetId);
      if (!target || target.fileId === null || target.state === "confirmed")
        throw driveChanged();
      verifyFile(outcome.file, row, target);
      const recordId = c.idGenerator.next();
      const binding = {
        accountId: row.identity.accountId,
        subject: row.identity.subject,
        recordId,
        fileId: target.fileId,
      };
      const resourceKey = folderKey(c, target);
      const record: DriveBackupRecord = {
        id: recordId,
        version: 1,
        targetId: target.id,
        noteId: row.identity.noteId,
        originalId: row.identity.originalId,
        accountId: row.identity.accountId,
        subject: row.identity.subject,
        fileId: target.fileId,
        folder: {
          ...target.folder,
          resourceKeyEnvelope:
            resourceKey === null
              ? null
              : driveServices(c).protector.protect(resourceKey, {
                  ...binding,
                  purpose: "backup-record-folder-key",
                }),
        },
        bytes: row.identity.bytes,
        sha256: row.identity.sha256,
        createdAt: now,
        webViewLink: outcome.file.webViewLink,
        resourceKeyEnvelope:
          outcome.file.resourceKey === null
            ? null
            : driveServices(c).protector.protect(outcome.file.resourceKey, {
                ...binding,
                purpose: "backup-record-file-key",
              }),
      };
      if (
        !(await u.driveBackupTargets.replace(
          {
            ...target,
            state: "confirmed",
            version: target.version + 1,
            updatedAt: now,
          },
          target.version,
        ))
      )
        throw driveChanged();
      await u.driveBackupRecords.insert(record);
      next = backupPhase(
        row,
        "succeeded",
        {
          owner,
          readPinned: false,
          refreshPending: false,
          recordId,
          received: row.identity.bytes,
          sessionEnvelope: null,
        },
        now,
      );
      if (
        !(await u.driveConnections.replace(
          {
            ...connection,
            version: connection.version + 1,
            updatedAt: now,
            lastUsedAt: now,
          },
          connection.version,
          "touch",
        ))
      )
        throw driveChanged();
    } else
      next = backupPhase(
        row,
        "failed",
        {
          owner,
          readPinned: !closed && row.readPinned,
          refreshPending: !closed && row.refreshPending,
          failure: !closed
            ? "DRIVE_BACKUP_UNKNOWN"
            : !connection
              ? "DRIVE_BACKUP_CHANGED"
              : outcome.kind === "failure"
                ? outcome.failure
                : "DRIVE_BACKUP_UNKNOWN",
        },
        now,
      );
    if (!(await u.driveBackupTransfers.replace(next, row.version)))
      throw driveChanged();
    const target = await u.driveBackupTargets.find(row.targetId);
    if (
      target?.fileId &&
      target.state !== "confirmed" &&
      target.state !== "unknown"
    )
      await u.driveBackupTargets.replace(
        {
          ...target,
          state: "unknown",
          version: target.version + 1,
          updatedAt: now,
        },
        target.version,
      );
    if (row.jobId) {
      const job = await u.driveBackupJobs.find(row.jobId);
      if (job?.terminalAt === null) {
        const base = {
          ...job,
          version: job.version + 1,
          updatedAt: now,
          terminalAt: now,
          bytes: next.received,
        };
        const finished =
          next.phase === "succeeded"
            ? { ...base, state: "succeeded" as const, recordId: next.recordId }
            : next.phase === "cancelled"
              ? { ...base, state: "cancelled" as const }
              : {
                  ...base,
                  state: "failed" as const,
                  failure:
                    next.phase === "failed"
                      ? next.failure
                      : ("DRIVE_BACKUP_UNKNOWN" as const),
                };
        if (!(await u.driveBackupJobs.replace(finished, job.version)))
          throw driveChanged();
      }
    }
  });
}

export async function runDriveBackup(
  c: HollowContainer,
  id: string,
  generation: string,
) {
  const service = driveServices(c);
  const owner = driveOwner(c, generation);
  const target = driveTarget("backup", id, owner);
  const result = await service.execution.withCaller(
    target,
    () =>
      c.unitOfWorkProvider.run(async (u) => {
        const row = await u.driveBackupTransfers.find(id);
        if (
          !row ||
          !(
            (row.phase === "queued" && row.owner.state === "none") ||
            (!driveBackupTerminal(row.phase) && row.owner.state === "closed")
          ) ||
          !(await backupCurrent(c, u, row))
        )
          return null;
        const job = row.jobId ? await u.driveBackupJobs.find(row.jobId) : null;
        const request = job
          ? await u.driveBackupRequests.find(job.requestId)
          : null;
        const initial = row.phase === "queued" && row.owner.state === "none";
        if (!request || (initial && request.cancelledAt !== null)) return null;
        const next = backupPhase(
          row,
          initial ? "checking" : row.phase,
          {
            owner,
            readPinned: true,
            ...(row.phase === "uploading"
              ? { offset: row.offset, length: row.length }
              : {}),
          },
          c.clock.now(),
        );
        return (await u.driveBackupTransfers.claim(next, row.version))
          ? next
          : null;
      }),
    async (row) => {
      const storage = c.importing?.storage;
      if (!storage?.withOwner) return failed("DRIVE_BACKUP_UNAVAILABLE");
      let persisted = false;
      try {
        await storage.withOwner({ kind: "drive-backup", id }, async () => {
          const handle = service.execution.run<Outcome>(
            target,
            async (signal) => {
              try {
                let file: DriveBackupFile;
                try {
                  file = await transfer(c, row, signal);
                } catch (error) {
                  if (isObjectReadCloseUnprovenError(error))
                    throw new DriveBackupOwnershipUnprovenError(id);
                  throw error;
                }
                return { kind: "file", file };
              } catch (error) {
                const parsed =
                  error instanceof BusinessRuleError
                    ? driveBackupFailureSchema.safeParse(error.code)
                    : null;
                if (parsed?.success)
                  return { kind: "failure", failure: parsed.data };
                throw error;
              }
            },
          );
          const closed = handle.closed.then(
            () => true,
            () => false,
          );
          const result = await handle.result;
          const didClose = await closed;
          try {
            await service.execution.coordinate("settle", () =>
              settle(
                c,
                row,
                result.kind === "value"
                  ? result.value
                  : {
                      kind: "failure",
                      failure: result.credentialRejection
                        ? "DRIVE_BACKUP_REFRESH_REQUIRED"
                        : "DRIVE_BACKUP_UNKNOWN",
                    },
                didClose,
                result.kind === "failure" &&
                  result.credentialRejection !== null,
              ),
            );
          } catch {
            throw new DriveBackupOwnershipUnprovenError(id);
          }
          persisted = true;
          if (!didClose) throw new DriveBackupOwnershipUnprovenError(id);
        });
      } catch (error) {
        if (
          !persisted ||
          !isDriveBackupOwnershipUnprovenError(error) ||
          error.owner.id !== id
        )
          throw error;
      }
    },
  );
  const proof = service.execution.closure(target);
  if (proof.kind === "closed") {
    const saved = await c.unitOfWorkProvider.run((u) =>
      u.driveBackupTransfers.find(id),
    );
    if (saved?.owner.state === "closed" && sameDriveOwner(saved.owner, owner))
      await service.execution.acknowledge(proof.proof);
  }
  return result.kind === "settled";
}

export async function settleBackupClosure(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  proof: DriveClosedProof,
) {
  const row = await u.driveBackupTransfers.find(proof.target.id);
  if (
    !row ||
    row.owner.state === "none" ||
    !sameDriveOwner(row.owner, { ...proof.target.owner, state: "closed" })
  )
    throw driveChanged();
  if (row.owner.state === "closed") return;
  const now = c.clock.now();
  const owner = { ...row.owner, state: "closed" as const };
  const recoverable =
    !driveBackupTerminal(row.phase) && (await backupCurrent(c, u, row));
  const next =
    driveBackupTerminal(row.phase) || recoverable
      ? {
          ...row,
          owner,
          readPinned: false,
          refreshPending: false,
          version: row.version + 1,
          updatedAt: now,
        }
      : backupPhase(
          row,
          "failed",
          {
            owner,
            readPinned: false,
            refreshPending: false,
            failure: "DRIVE_BACKUP_UNKNOWN",
          },
          now,
        );
  if (!(await u.driveBackupTransfers.replace(next, row.version)))
    throw driveChanged();
  if (row.jobId && !recoverable) {
    const job = await u.driveBackupJobs.find(row.jobId);
    if (job?.terminalAt === null)
      await u.driveBackupJobs.replace(
        {
          ...job,
          state: "failed",
          failure: "DRIVE_BACKUP_UNKNOWN",
          version: job.version + 1,
          updatedAt: now,
          terminalAt: now,
          bytes: row.received,
        },
        job.version,
      );
  }
}

export async function runDriveBackupQueue(
  c: HollowContainer,
  generation: string,
  previousAccount: string | null = null,
) {
  let lastAccount = previousAccount;
  if (!c.drive?.backup || !c.drive.execution.accepting()) return lastAccount;
  for (let scanned = 0; scanned < 100; scanned++) {
    if (!c.drive.execution.accepting()) break;
    const rows = await c.unitOfWorkProvider.run(async (u) => [
      ...(await u.driveBackupTransfers.scan("recoverable", 100)),
      ...(await u.driveBackupTransfers.scan("queued", 100)),
    ]);
    const row =
      rows.find((value) => value.identity.accountId !== lastAccount) ?? rows[0];
    if (!row) break;
    if (
      (
        await c.unitOfWorkProvider.run((u) =>
          u.driveBackupTransfers.held(row.identity.accountId),
        )
      ).global > 0
    )
      break;
    lastAccount = row.identity.accountId;
    const valid = await c.unitOfWorkProvider.run((u) =>
      backupCurrent(c, u, row),
    );
    if (!valid) {
      await c.unitOfWorkProvider.run(async (u) => {
        const current = await u.driveBackupTransfers.find(row.id);
        if (!current || current.version !== row.version) return;
        const next = backupPhase(
          current,
          "failed",
          { failure: "DRIVE_BACKUP_CHANGED" },
          c.clock.now(),
        );
        if (!(await u.driveBackupTransfers.replace(next, current.version)))
          throw driveChanged();
        if (row.jobId) {
          const job = await u.driveBackupJobs.find(row.jobId);
          if (job?.terminalAt === null)
            await u.driveBackupJobs.replace(
              {
                ...job,
                state: "failed",
                failure: "DRIVE_BACKUP_CHANGED",
                version: job.version + 1,
                updatedAt: c.clock.now(),
                terminalAt: c.clock.now(),
                bytes: current.received,
              },
              job.version,
            );
        }
      });
    } else if (!(await runDriveBackup(c, row.id, generation))) break;
  }
  return lastAccount;
}

import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupIdentity,
  type DriveBackupTarget,
  type DriveBackupTargetHead,
  driveBackupIdentitySchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { canScope, requireNote } from "../../../workspace/access";
import { driveActor, driveChanged, driveServices } from "../current";
import { backupAdmissionChanged, parentRoom } from "./admission";
import { backupTargetKey } from "./recovery";

export type RetargetPreview =
  | Readonly<{
      kind: "available";
      headTargetId: string;
      headVersion: number;
      targetVersion: number;
      epoch: number;
      settingsVersion: number;
      destinationName: string;
      expectedDigest: string;
    }>
  | Readonly<{
      kind: "unavailable";
      reason:
        | "not-started"
        | "same-destination"
        | "active"
        | "already-saved"
        | "resolve-old-result"
        | "ownership-pending"
        | "reconnect"
        | "select-folder"
        | "changed";
    }>;
export type RetargetInput = Readonly<{
  noteId: string;
  commandId: string;
  expectedEpoch: number;
  expectedSettingsVersion: number;
  expectedHeadTargetId: string;
  expectedHeadVersion: number;
  expectedTargetVersion: number;
  expectedDigest: string;
}>;

export function retargetDeadline(c: Pick<HollowContainer, "clock">) {
  const start = c.clock.now().getTime();
  let last = start;
  return () => {
    const now = c.clock.now().getTime();
    if (now < last || now - start >= 2000) throw driveChanged();
    last = now;
  };
}
function owned(c: HollowContainer) {
  const execution = driveServices(c).execution;
  return (
    execution.accepting() &&
    execution.unacknowledged(1).length === 0 &&
    execution.predecessors().length === 0
  );
}
export async function retargetOwnersClosed(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  head: DriveBackupTargetHead,
  check: () => void,
) {
  if (!owned(c)) return false;
  let after: string | null = null;
  for (let page = 0; page < 100; page++) {
    check();
    const result = await u.driveBackupTargets.closedOwners(head, after, 100);
    check();
    if (!owned(c)) return false;
    for (const item of result.items) {
      if (
        driveServices(c).execution.caller({
          kind: "backup",
          id: item.transferId,
          owner: item.owner,
        }) === "pending"
      )
        return false;
    }
    if (result.nextAfter === null) return true;
    if (
      result.items.length !== 100 ||
      result.nextAfter !== result.items[result.items.length - 1]?.transferId ||
      (after !== null && result.nextAfter <= after)
    )
      throw driveChanged();
    after = result.nextAfter;
  }
  return false;
}

async function inspect(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actorId: string,
  noteId: string,
  check: () => void,
) {
  const unavailable = (
    reason: Extract<RetargetPreview, { kind: "unavailable" }>["reason"],
  ) => ({ kind: "unavailable" as const, reason });
  const read = async <T>(work: () => Promise<T>) => {
    check();
    const value = await work();
    check();
    return value;
  };
  const found = await read(() => u.notes.findById(noteId));
  const note = await read(() => requireNote(u, found, actorId));
  if (!(await read(() => canScope(u, note.owner, actorId, "edit"))))
    return unavailable("changed");
  if (note.owner.kind === "workspace") {
    const workspaceId = note.owner.workspaceId;
    if ((await read(() => u.workspaces.find(workspaceId)))?.state !== "active")
      return unavailable("changed");
  }
  const original = await read(() => u.imports.findByNote(note.id));
  const connection = await read(() => u.driveConnections.find(actorId));
  if (
    !original ||
    !c.drive?.backup ||
    !c.importing?.storage.withOwner ||
    !c.drive.protector.available()
  )
    return unavailable("changed");
  if (connection?.state !== "linked") return unavailable("reconnect");
  if (!connection.folder) return unavailable("select-folder");
  const previous = await read(() =>
    u.driveBackupTargets.original(
      original.id,
      actorId,
      connection.credential.subject,
    ),
  );
  if (previous === null) return unavailable("not-started");
  const evidence = await read(() =>
    u.driveBackupTargets.inspectRetarget({
      originalId: original.id,
      accountId: actorId,
      subject: connection.credential.subject,
    }),
  );
  if (evidence.kind === "blocked")
    return unavailable(
      evidence.reason === "already-saved"
        ? "already-saved"
        : evidence.reason === "active"
          ? "active"
          : "resolve-old-result",
    );
  const folder = connection.folder;
  const newKey =
    folder.resourceKeyEnvelope === null
      ? null
      : c.drive.protector.reveal(folder.resourceKeyEnvelope, {
          purpose: "resource-key",
          accountId: actorId,
          subject: connection.credential.subject,
          epoch: connection.epoch,
          fileId: folder.id,
        });
  const oldKey = backupTargetKey(c.drive.protector, evidence.target);
  if (
    evidence.target.folder.id === folder.id &&
    evidence.target.folder.driveId === folder.driveId &&
    oldKey === newKey
  )
    return unavailable("same-destination");
  if (!(await retargetOwnersClosed(c, u, evidence.head, check)))
    return unavailable("ownership-pending");
  const generation = await read(() =>
    u.driveBackupTransfers.sourceGeneration(note.id),
  );
  if (generation === null) return unavailable("changed");
  const identity: DriveBackupIdentity = parseDriveBackup(
    driveBackupIdentitySchema,
    {
      noteId,
      originalId: original.id,
      accountId: actorId,
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
      folder,
    },
  );
  const expectedDigest = c.tokens.hash(
    JSON.stringify([
      "drive-backup-retarget-preview",
      1,
      actorId,
      noteId,
      original.id,
      original.storageKey,
      original.bytes,
      original.sha256,
      original.name,
      identity.workspaceId,
      generation,
      evidence.head.targetId,
      evidence.head.version,
      evidence.target.version,
      connection.epoch,
      connection.settingsVersion,
      connection.credential.subject,
      folder.id,
      folder.driveId,
      newKey,
    ]),
  );
  const preview: Extract<RetargetPreview, { kind: "available" }> = {
    kind: "available",
    headTargetId: evidence.head.targetId,
    headVersion: evidence.head.version,
    targetVersion: evidence.target.version,
    epoch: connection.epoch,
    settingsVersion: connection.settingsVersion,
    destinationName: folder.name,
    expectedDigest,
  };
  check();
  return {
    kind: "ready" as const,
    preview,
    identity,
    connection: { ...connection, folder },
    head: evidence.head,
    title: note.title,
  };
}

export async function previewDriveBackupRetarget(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{ noteId: string }>,
) {
  const check = retargetDeadline(c);
  return driveServices(c).execution.coordinate("maintenance", () =>
    c.unitOfWorkProvider.run(async (u) => {
      check();
      const actor = await driveActor(c, u, request);
      const value = await inspect(c, u, actor.accountId, input.noteId, check);
      const preview: RetargetPreview =
        value.kind === "ready" ? value.preview : value;
      return {
        actor: {
          accountId: actor.accountId,
          authVersion: actor.authVersion,
          browserEpoch: actor.browserEpoch,
        },
        noteId: input.noteId,
        preview,
      };
    }),
  );
}

export async function retargetDriveBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: RetargetInput,
) {
  const check = retargetDeadline(c);
  return driveServices(c).execution.coordinate("maintenance", () =>
    c.unitOfWorkProvider.run(async (u) => {
      const actor = await driveActor(c, u, request);
      const digest = c.tokens.hash(
        JSON.stringify([
          "drive-backup-retarget",
          1,
          actor.accountId,
          input.noteId,
          input.expectedEpoch,
          input.expectedSettingsVersion,
          input.expectedHeadTargetId,
          input.expectedHeadVersion,
          input.expectedTargetVersion,
          input.expectedDigest,
        ]),
      );
      const old = await u.driveBackupRequests.command(
        actor.accountId,
        input.commandId,
      );
      if (old) {
        if (old.intentDigest !== digest) throw driveChanged();
        await requireNote(
          u,
          await u.notes.findById(input.noteId),
          actor.accountId,
          "edit",
        );
        const [job] = await u.driveBackupJobs.forRequest(old.id);
        if (!job || job.noteId !== input.noteId) throw driveChanged();
        return { requestId: old.id, jobId: job.id, accepted: false };
      }
      check();
      if (
        (await u.driveAttempts.findByCommand(
          actor.accountId,
          input.commandId,
        )) ||
        (await u.driveControls.findByCommand(actor.accountId, input.commandId))
      )
        throw driveChanged();
      const value = await inspect(c, u, actor.accountId, input.noteId, check);
      if (
        value.kind !== "ready" ||
        value.preview.headTargetId !== input.expectedHeadTargetId ||
        value.preview.headVersion !== input.expectedHeadVersion ||
        value.preview.targetVersion !== input.expectedTargetVersion ||
        value.preview.epoch !== input.expectedEpoch ||
        value.preview.settingsVersion !== input.expectedSettingsVersion ||
        value.preview.expectedDigest !== input.expectedDigest
      )
        throw driveChanged();
      const counts = await u.driveBackupJobs.queued(actor.accountId);
      if (
        !(await parentRoom(u, actor.accountId)) ||
        counts.account >= DRIVE_BACKUP_LIMITS.accountQueued ||
        counts.global >= DRIVE_BACKUP_LIMITS.globalQueued
      )
        throw new BusinessRuleError(
          "DRIVE_BACKUP_UNAVAILABLE",
          "処理中のバックアップの終了後に再確認してください。",
        );
      check();
      if (!owned(c)) throw driveChanged();
      const now = c.clock.now();
      const target: DriveBackupTarget = {
        id: c.idGenerator.next(),
        originalId: value.identity.originalId,
        noteId: input.noteId,
        accountId: actor.accountId,
        subject: value.identity.subject,
        marker: c.idGenerator.next(),
        folder: value.identity.folder,
        folderEpoch: value.identity.epoch,
        version: 1,
        createdAt: now,
        updatedAt: now,
        state: "unallocated",
        fileId: null,
      };
      if (
        !(await u.driveBackupTargets.replaceHead(
          value.head,
          input.expectedTargetVersion,
          target,
        ))
      )
        throw driveChanged();
      check();
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
      check();
      await u.driveBackupJobs.insert({
        id: jobId,
        requestId,
        accountId: actor.accountId,
        ordinal: 0,
        attempt: 1,
        retryOf: null,
        noteId: input.noteId,
        targetId: target.id,
        title: value.title,
        admissionIdentity: value.identity,
        rootOrdinal: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        state: "queued",
        bytes: 0,
        terminalAt: null,
      });
      check();
      await u.driveBackupTransfers.insert({
        id: c.idGenerator.next(),
        jobId,
        targetId: target.id,
        identity: value.identity,
        owner: { state: "none" },
        credentialVersion: value.connection.credentialVersion,
        version: 1,
        cancelGeneration: 0,
        received: 0,
        sessionEnvelope: null,
        statusAttempts: 0,
        readPinned: false,
        refreshPending: false,
        phase: "queued",
        createdAt: now,
        updatedAt: now,
        deadlineAt: new Date(now.getTime() + DRIVE_BACKUP_LIMITS.executionMs),
      });
      check();
      await backupAdmissionChanged(c, u, value.connection);
      check();
      if (!owned(c)) throw driveChanged();
      return { requestId, jobId, accepted: true };
    }),
  );
}

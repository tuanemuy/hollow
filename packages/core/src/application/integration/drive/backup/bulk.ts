import type {
  DriveBackupJob,
  DriveBackupRequest,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { canScope, requireScope } from "../../../workspace/access";
import { driveActor, driveChanged } from "../current";
import {
  type BackupConnection,
  backupAdmissionChanged,
  backupUnavailable,
  backupWake,
  captureBackup,
  insertSnapshotJob,
  parentRoom,
  usableBackupConnection,
} from "./admission";
import { backupFolderCurrent, backupRetryEvidence } from "./recovery";
import { backupPhase } from "./runner";

export type BackupSelection = Readonly<{
  noteIds: readonly string[];
  workspaceId: string | null;
}>;
async function connectionForBulk(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actor: string,
) {
  const connection = await u.driveConnections.find(actor);
  if (!usableBackupConnection(connection) || connection.state !== "linked")
    return backupUnavailable("DRIVE_BACKUP_REFRESH_REQUIRED");
  if (
    !c.drive?.backup ||
    !c.drive.protector.available() ||
    !c.importing?.storage.withOwner
  )
    return backupUnavailable("DRIVE_BACKUP_UNAVAILABLE");
  return connection;
}
async function inspect(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  actor: string,
  input: BackupSelection,
  connection: BackupConnection,
) {
  if (
    input.noteIds.length < 1 ||
    input.noteIds.length > 500 ||
    new Set(input.noteIds).size !== input.noteIds.length
  )
    throw driveChanged();
  await requireScope(
    u,
    input.workspaceId === null
      ? { kind: "personal", accountId: actor }
      : { kind: "workspace", workspaceId: input.workspaceId },
    actor,
    "edit",
  );
  if (
    input.workspaceId !== null &&
    (await u.workspaces.find(input.workspaceId))?.state !== "active"
  )
    throw driveChanged();
  const counts = {
    selected: input.noteIds.length,
    noOriginal: 0,
    denied: 0,
    processing: 0,
    recorded: 0,
    pending: 0,
  };
  const facts: unknown[] = [];
  const accepted: string[] = [];
  for (const id of [...input.noteIds].sort()) {
    const note = await u.notes.findById(id);
    if (
      !note ||
      note.lifecycle.kind !== "active" ||
      (note.owner.kind === "workspace" ? note.owner.workspaceId : null) !==
        input.workspaceId ||
      !(await canScope(u, note.owner, actor, "edit"))
    ) {
      counts.denied++;
      facts.push([id, "denied"]);
      continue;
    }
    const original = await u.imports.findByNote(id);
    if (!original) {
      counts.noOriginal++;
      facts.push([id, "no-original"]);
      continue;
    }
    const target = await u.driveBackupTargets.original(
      original.id,
      actor,
      connection.credential.subject,
    );
    const record = target ? await u.driveBackupRecords.target(target.id) : null;
    const active = target
      ? await u.driveBackupJobs.activeTarget(target.id)
      : null;
    const old = target ? await u.driveBackupJobs.latestTarget(target.id) : null;
    const safe =
      !target ||
      record ||
      (!active &&
        old?.state === "cancelled" &&
        (await u.driveBackupTransfers.canRetryUnstarted(target.id, old.id)));
    if (
      active ||
      !safe ||
      (target &&
        !record &&
        !backupFolderCurrent(c.drive!.protector, target, connection))
    ) {
      counts.processing++;
      facts.push([
        id,
        "processing",
        target?.id ?? null,
        active?.id ?? null,
        old?.id ?? null,
      ]);
      continue;
    }
    if (record) counts.recorded++;
    else counts.pending++;
    const generation = await u.driveBackupTransfers.sourceGeneration(id);
    if (generation === null) throw driveChanged();
    facts.push([
      id,
      record ? "recorded" : "pending",
      original.id,
      original.storageKey,
      original.bytes,
      original.sha256,
      generation,
      target?.id ?? null,
      target?.folder ?? connection.folder,
      record?.id ?? null,
    ]);
    accepted.push(id);
  }
  const digest = c.tokens.hash(
    JSON.stringify([
      "drive-backup-selection",
      1,
      actor,
      input.workspaceId,
      connection.epoch,
      connection.settingsVersion,
      connection.credential.subject,
      connection.folder,
      facts,
    ]),
  );
  return { counts, digest, accepted };
}
export async function previewDriveBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: BackupSelection,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const connection = await connectionForBulk(c, u, actor.accountId);
    const result = await inspect(c, u, actor.accountId, input, connection);
    return {
      actor: { accountId: actor.accountId },
      ...result.counts,
      digest: result.digest,
      folderName: connection.folder.name,
      epoch: connection.epoch,
    };
  });
}
export async function requestDriveBackupBulk(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: BackupSelection &
    Readonly<{ commandId: string; expectedDigest: string }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const intentDigest = c.tokens.hash(
      JSON.stringify([
        "drive-backup-bulk",
        1,
        actor.accountId,
        input.workspaceId,
        [...input.noteIds].sort(),
        input.expectedDigest,
      ]),
    );
    const old = await u.driveBackupRequests.command(
      actor.accountId,
      input.commandId,
    );
    if (old) {
      if (old.intentDigest !== intentDigest) throw driveChanged();
      return { requestId: old.id, count: old.count, accepted: false };
    }
    if (
      (await u.driveAttempts.findByCommand(actor.accountId, input.commandId)) ||
      (await u.driveControls.findByCommand(actor.accountId, input.commandId))
    )
      throw driveChanged();
    const connection = await connectionForBulk(c, u, actor.accountId);
    const result = await inspect(c, u, actor.accountId, input, connection);
    if (result.digest !== input.expectedDigest || !result.accepted.length)
      throw driveChanged();
    if (result.counts.pending > 0 && !(await parentRoom(u, actor.accountId)))
      return backupUnavailable("DRIVE_BACKUP_UNAVAILABLE");
    const now = c.clock.now();
    const parent: DriveBackupRequest = {
      id: c.idGenerator.next(),
      accountId: actor.accountId,
      commandId: input.commandId,
      intentDigest,
      kind: "bulk",
      count: result.accepted.length,
      version: 1,
      generation: 1,
      rootRequestId: null,
      bulkSummary: { version: 1, digest: result.digest, ...result.counts },
      cancelledAt: null,
      createdAt: now,
    };
    await u.driveBackupRequests.insert(parent);
    for (const [ordinal, id] of result.accepted.entries()) {
      const note = await u.notes.findById(id);
      const original = await u.imports.findByNote(id);
      if (!note || !original) throw driveChanged();
      await insertSnapshotJob(
        c,
        u,
        parent,
        await captureBackup(c, u, actor.accountId, note, original, connection),
        ordinal,
      );
    }
    if (result.counts.pending) await backupAdmissionChanged(c, u, connection);
    return { requestId: parent.id, count: parent.count, accepted: true };
  });
}

export type BackupParentInput = Readonly<{
  requestId: string;
  expectedGeneration: number;
}>;
async function rootForActor(
  u: HollowUnitOfWorkContext,
  id: string,
  actor: string,
) {
  const receipt = await u.driveBackupRequests.find(id);
  const root = receipt?.rootRequestId
    ? await u.driveBackupRequests.find(receipt.rootRequestId)
    : receipt;
  if (
    !root ||
    root.accountId !== actor ||
    receipt?.accountId !== actor ||
    root.rootRequestId != null
  )
    throw driveChanged();
  return root;
}
export async function cancelDriveBackupParent(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: BackupParentInput,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const root = await rootForActor(u, input.requestId, actor.accountId);
    if ((root.generation ?? 1) !== input.expectedGeneration)
      throw driveChanged();
    const children =
      root.kind === "bulk"
        ? await u.driveBackupJobs.latest(root.id)
        : await u.driveBackupJobs.forRequest(root.id);
    if (root.cancelledAt || children.every((v) => v.terminalAt !== null))
      return { cancelled: false, waiting: 0 };
    const now = c.clock.now();
    if (
      !(await u.driveBackupRequests.replace(
        { ...root, cancelledAt: now, version: root.version + 1 },
        root.version,
      ))
    )
      throw driveChanged();
    let waiting = 0;
    for (const job of children) {
      if (job.terminalAt !== null) continue;
      const exact = await u.driveBackupTransfers.forJob(job.id);
      if (exact.kind === "ambiguous") throw driveChanged();
      const row = exact.kind === "found" ? exact.row : null;
      if (row && (row.phase !== "queued" || row.owner.state !== "none")) {
        waiting++;
        continue;
      }
      if (!row && !job.admissionIdentity) throw driveChanged();
      if (
        row &&
        !(await u.driveBackupTransfers.replace(
          backupPhase(
            row,
            "cancelled",
            { cancelGeneration: row.cancelGeneration + 1 },
            now,
          ),
          row.version,
        ))
      )
        throw driveChanged();
      if (
        !(await u.driveBackupJobs.replace(
          {
            ...job,
            state: "cancelled",
            bytes: 0,
            version: job.version + 1,
            updatedAt: now,
            terminalAt: now,
          },
          job.version,
        ))
      )
        throw driveChanged();
    }
    backupWake(c, u);
    return { cancelled: true, waiting };
  });
}
export async function retryDriveBackupParent(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: BackupParentInput & Readonly<{ commandId: string }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const digest = c.tokens.hash(
      JSON.stringify([
        "drive-backup-bulk-retry",
        1,
        actor.accountId,
        input.requestId,
        input.expectedGeneration,
      ]),
    );
    const old = await u.driveBackupRequests.command(
      actor.accountId,
      input.commandId,
    );
    if (old) {
      if (old.intentDigest !== digest) throw driveChanged();
      return {
        requestId: old.rootRequestId ?? old.id,
        receiptId: old.id,
        accepted: false,
      };
    }
    if (
      (await u.driveAttempts.findByCommand(actor.accountId, input.commandId)) ||
      (await u.driveControls.findByCommand(actor.accountId, input.commandId))
    )
      throw driveChanged();
    const root = await rootForActor(u, input.requestId, actor.accountId);
    if (
      root.kind !== "bulk" ||
      (root.generation ?? 1) !== input.expectedGeneration
    )
      throw driveChanged();
    const latest = await u.driveBackupJobs.latest(root.id);
    const failed = latest.filter(
      (job): job is Extract<DriveBackupJob, { state: "failed" }> =>
        job.state === "failed",
    );
    if (!failed.length) throw driveChanged();
    const connection = await connectionForBulk(c, u, actor.accountId);
    const held = new Set(
      (
        await u.driveBackupJobs.live({
          kind: "account",
          accountId: actor.accountId,
        })
      ).map((job) => job.id),
    );
    const live = latest.some(
      (job) => job.terminalAt === null || held.has(job.id),
    );
    if (!live && !(await parentRoom(u, actor.accountId)))
      return backupUnavailable("DRIVE_BACKUP_UNAVAILABLE");
    const now = c.clock.now();
    const receipt: DriveBackupRequest = {
      id: c.idGenerator.next(),
      accountId: actor.accountId,
      commandId: input.commandId,
      intentDigest: digest,
      kind: "bulk",
      count: failed.length,
      version: 1,
      generation: input.expectedGeneration + 1,
      rootRequestId: root.id,
      bulkSummary: null,
      cancelledAt: null,
      createdAt: now,
    };
    await u.driveBackupRequests.insert(receipt);
    for (const [ordinal, job] of failed.entries()) {
      if (!job.noteId || !job.targetId || job.rootOrdinal == null)
        throw driveChanged();
      const note = await u.notes.findById(job.noteId);
      const original = await u.imports.findByNote(job.noteId);
      const target = await u.driveBackupTargets.find(job.targetId);
      if (
        !note ||
        note.lifecycle.kind !== "active" ||
        !original ||
        !target ||
        !(await canScope(u, note.owner, actor.accountId, "edit")) ||
        (note.owner.kind === "workspace" &&
          (await u.workspaces.find(note.owner.workspaceId))?.state !==
            "active") ||
        !backupFolderCurrent(c.drive!.protector, target, connection)
      )
        throw driveChanged();
      const capture = await captureBackup(
        c,
        u,
        actor.accountId,
        note,
        original,
        connection,
      );
      if (
        capture.target.id !== job.targetId ||
        capture.record ||
        !(await backupRetryEvidence(u, job, target, capture.identity))
      )
        throw driveChanged();
      await insertSnapshotJob(c, u, receipt, capture, ordinal, {
        prior: job,
        rootOrdinal: job.rootOrdinal,
      });
    }
    if (
      !(await u.driveBackupRequests.advanceRoot(
        root.id,
        root.version,
        input.expectedGeneration,
      ))
    )
      throw driveChanged();
    await backupAdmissionChanged(c, u, connection);
    return { requestId: root.id, receiptId: receipt.id, accepted: true };
  });
}

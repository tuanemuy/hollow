import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupJob,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import { canScope, requireNote } from "../../../workspace/access";
import { driveActor } from "../current";

function jobView(job: DriveBackupJob) {
  return {
    id: job.id,
    requestId: job.requestId,
    noteId: job.noteId,
    title: job.title,
    state: job.state,
    attempt: job.attempt,
    bytes: job.bytes,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    failure: job.state === "failed" ? job.failure : null,
  };
}
export async function getDriveBackup(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{ noteId: string; commandId?: string | undefined }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const note = await requireNote(
      u,
      await u.notes.findById(input.noteId),
      actor.accountId,
    );
    const original = await u.imports.findByNote(note.id);
    const connection = await u.driveConnections.find(actor.accountId);
    const receipt = input.commandId
      ? await u.driveBackupRequests.command(actor.accountId, input.commandId)
      : null;
    const ownJobs = receipt
      ? (await u.driveBackupJobs.forRequest(receipt.id)).filter(
          (job) => job.noteId === note.id,
        )
      : [];
    const live = (
      await u.driveBackupTransfers.live({ kind: "note", noteId: note.id })
    ).filter((row) => row.identity.accountId === actor.accountId);
    const records = await u.driveBackupRecords.forNote(
      note.id,
      actor.accountId,
    );
    const processing = [];
    for (const row of live) {
      const job = row.jobId ? await u.driveBackupJobs.find(row.jobId) : null;
      const parent = job
        ? await u.driveBackupRequests.find(job.requestId)
        : null;
      processing.push({
        jobId: row.jobId,
        phase: row.phase,
        bytes: row.received,
        total: row.identity.bytes,
        owner: row.owner.state,
        manualCancellationRequested: parent?.cancelledAt != null,
      });
    }
    return {
      actor: {
        accountId: actor.accountId,
        authVersion: actor.authVersion,
        browserEpoch: actor.browserEpoch,
      },
      noteId: note.id,
      configured: Boolean(c.drive?.backup && c.drive.protector.available()),
      hasOriginal: original !== null,
      epoch: connection?.epoch ?? 0,
      settingsVersion: connection?.settingsVersion ?? 1,
      linked: connection?.state === "linked",
      folderName: connection?.folder?.name ?? null,
      processing,
      receipt: ownJobs.length
        ? { requestId: receipt!.id, jobs: ownJobs.map(jobView) }
        : null,
      records: records.map((record) => ({
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        bytes: record.bytes,
        link: record.webViewLink,
      })),
    };
  });
}
export async function getDriveBackupHistory(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const jobs = await u.driveBackupJobs.history(
      actor.accountId,
      new Date(c.clock.now().getTime() - DRIVE_BACKUP_LIMITS.historyMs),
      100,
    );
    const rows = [];
    for (const job of jobs) {
      const note = job.noteId ? await u.notes.findById(job.noteId) : null;
      const accessible =
        note !== null &&
        (await canScope(u, note.owner, actor.accountId)) &&
        (note.owner.kind !== "workspace" ||
          (await u.workspaces.find(note.owner.workspaceId))?.state ===
            "active");
      rows.push({
        ...jobView(job),
        noteId: accessible ? job.noteId : null,
        title: accessible
          ? job.title
          : job.noteId === null
            ? "削除済みノート"
            : "アクセスできないノート",
      });
    }
    return { actor: { accountId: actor.accountId }, rows };
  });
}

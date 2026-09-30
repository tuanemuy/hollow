import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupJob,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import { canScope, requireNote } from "../../../workspace/access";
import { driveActor } from "../current";
import { backupFolderCurrent, backupRetryEvidence } from "./recovery";

function jobView(job: DriveBackupJob) {
  return {
    id: job.id,
    version: job.version,
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
    let retry: {
      transferId: string | null;
      version: number | null;
      jobId: string;
      jobVersion: number;
      cancelled: boolean;
    } | null = null;
    if (
      original &&
      connection?.state === "linked" &&
      c.drive?.backup &&
      live.length === 0 &&
      (await canScope(u, note.owner, actor.accountId, "edit"))
    ) {
      const target = await u.driveBackupTargets.original(
        original.id,
        actor.accountId,
        connection.credential.subject,
      );
      if (
        target &&
        target.state !== "confirmed" &&
        backupFolderCurrent(c.drive.protector, target, connection)
      ) {
        const job = await u.driveBackupJobs.latestTarget(target.id);
        const exact = job ? await u.driveBackupTransfers.forJob(job.id) : null;
        const saved =
          job?.admissionIdentity ??
          (exact?.kind === "found" ? exact.row.identity : null);
        const generation = await u.driveBackupTransfers.sourceGeneration(
          note.id,
        );
        if (job && saved && generation !== null) {
          const identity = {
            ...saved,
            epoch: connection.epoch,
            settingsVersion: connection.settingsVersion,
            storageKey: original.storageKey,
            bytes: original.bytes,
            sha256: original.sha256,
            name: original.name,
            ownershipGeneration: generation,
            workspaceId:
              note.owner.kind === "workspace" ? note.owner.workspaceId : null,
          };
          const evidence = await backupRetryEvidence(u, job, target, identity);
          if (evidence)
            retry = {
              transferId: exact?.kind === "found" ? exact.row.id : null,
              version: exact?.kind === "found" ? exact.row.version : null,
              jobId: job.id,
              jobVersion: job.version,
              cancelled: job.state === "cancelled",
            };
        }
      }
    }
    const processing = [];
    for (const row of live) {
      const job = row.jobId ? await u.driveBackupJobs.find(row.jobId) : null;
      const parent = job
        ? await u.driveBackupRequests.find(job.requestId)
        : null;
      const root = parent?.rootRequestId
        ? await u.driveBackupRequests.find(parent.rootRequestId)
        : parent;
      processing.push({
        jobId: row.jobId,
        phase: row.phase,
        bytes: row.received,
        total: row.identity.bytes,
        owner: row.owner.state,
        manualCancellationRequested:
          parent?.cancelledAt != null || root?.cancelledAt != null,
      });
    }
    const liveIds = new Set(live.map((row) => row.jobId));
    for (const job of await u.driveBackupJobs.live({
      kind: "note",
      noteId: note.id,
    })) {
      if (
        job.accountId !== actor.accountId ||
        liveIds.has(job.id) ||
        !job.admissionIdentity
      )
        continue;
      const parent = await u.driveBackupRequests.find(job.requestId);
      const root = parent?.rootRequestId
        ? await u.driveBackupRequests.find(parent.rootRequestId)
        : parent;
      processing.push({
        jobId: job.id,
        phase: "queued",
        bytes: 0,
        total: job.admissionIdentity.bytes,
        owner: "none",
        manualCancellationRequested:
          parent?.cancelledAt != null || root?.cancelledAt != null,
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
      retry,
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

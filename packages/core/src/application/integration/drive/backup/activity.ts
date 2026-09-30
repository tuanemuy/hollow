import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupJob,
  type DriveBackupRequest,
} from "@repo/core/domain/integration/driveBackup";
import type { AuthenticationRequest } from "../../../account/ports";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { canScope } from "../../../workspace/access";
import { driveActor, driveChanged } from "../current";

export type BackupActivityCursor = Readonly<{
  id: string;
  createdAt: string;
  digest: string;
}>;
export type BackupActivityInput = Readonly<{
  cursor?: BackupActivityCursor | undefined;
  watch?: readonly string[] | undefined;
  watchAfter?: number | undefined;
  commandId?: string | undefined;
}>;
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;
function cursorDigest(
  c: HollowContainer,
  actor: string,
  id: string,
  createdAt: string,
) {
  return c.tokens.hash(
    JSON.stringify(["drive-backup-cursor", 1, actor, id, createdAt]),
  );
}
async function children(u: HollowUnitOfWorkContext, row: DriveBackupRequest) {
  return row.kind === "bulk" && !row.rootRequestId
    ? u.driveBackupJobs.latest(row.id)
    : u.driveBackupJobs.forRequest(row.id);
}
async function accessibleJob(
  u: HollowUnitOfWorkContext,
  actor: string,
  job: DriveBackupJob,
) {
  const note = job.noteId ? await u.notes.findById(job.noteId) : null;
  const accessible =
    note !== null &&
    (await canScope(u, note.owner, actor)) &&
    (note.owner.kind !== "workspace" ||
      (await u.workspaces.find(note.owner.workspaceId))?.state === "active");
  return {
    id: job.id,
    version: job.version,
    noteId: accessible ? job.noteId : null,
    title: accessible
      ? job.title
      : job.noteId
        ? "アクセスできないノート"
        : "削除済みノート",
    state: job.state,
    attempt: job.attempt,
    bytes: job.bytes,
    failure: job.state === "failed" ? job.failure : null,
    createdAt: job.createdAt.toISOString(),
  };
}
async function parentView(
  u: HollowUnitOfWorkContext,
  actor: string,
  row: DriveBackupRequest,
  live: ReadonlySet<string>,
) {
  const jobs = await children(u, row);
  const counts = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
  };
  let active = 0;
  for (const job of jobs) {
    counts[job.state]++;
    if (live.has(job.id) || job.terminalAt === null) active++;
  }
  const first = jobs[0] ? await accessibleJob(u, actor, jobs[0]) : null;
  return {
    id: row.id,
    parentId: row.rootRequestId ?? row.id,
    generation: row.generation ?? 1,
    kind: row.kind,
    count: jobs.length,
    counts,
    active,
    state: active
      ? ("processing" as const)
      : counts.failed
        ? ("failed" as const)
        : counts.cancelled
          ? ("cancelled" as const)
          : ("succeeded" as const),
    title: first?.title ?? "バックアップ",
    createdAt: row.createdAt.toISOString(),
    cancellationRequested: row.cancelledAt !== null,
    retryable: row.kind === "bulk" && !row.rootRequestId && counts.failed > 0,
    summary: row.bulkSummary
      ? {
          selected: row.bulkSummary.selected,
          noOriginal: row.bulkSummary.noOriginal,
          denied: row.bulkSummary.denied,
          processing: row.bulkSummary.processing,
          recorded: row.bulkSummary.recorded,
          pending: row.bulkSummary.pending,
        }
      : null,
  };
}
export async function getDriveBackupActivity(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: BackupActivityInput = {},
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const since = new Date(
      c.clock.now().getTime() - DRIVE_BACKUP_LIMITS.historyMs,
    );
    const cursor = input.cursor;
    if (
      cursor &&
      (cursor.digest !==
        cursorDigest(c, actor.accountId, cursor.id, cursor.createdAt) ||
        !Number.isFinite(new Date(cursor.createdAt).getTime()))
    )
      throw driveChanged();
    const page = await u.driveBackupRequests.page(
      actor.accountId,
      since,
      cursor ? { id: cursor.id, createdAt: new Date(cursor.createdAt) } : null,
      50,
    );
    const live = new Set(
      (
        await u.driveBackupJobs.live({
          kind: "account",
          accountId: actor.accountId,
        })
      ).map((job) => job.id),
    );
    const rows: Awaited<ReturnType<typeof parentView>>[] = [];
    let last: DriveBackupRequest | null = null;
    let cut = false;
    for (const parent of page) {
      const value = await parentView(u, actor.accountId, parent, live);
      if (bytes([...rows, value]) > 28 * 1024) {
        cut = true;
        break;
      }
      rows.push(value);
      last = parent;
    }
    const watched: (Awaited<ReturnType<typeof parentView>> & {
      requestedId: string;
    })[] = [];
    const ids = [...new Set(input.watch ?? [])];
    if (ids.length > 50) throw driveChanged();
    const receipt = input.commandId
      ? await u.driveBackupRequests.command(actor.accountId, input.commandId)
      : null;
    if (receipt && !ids.includes(receipt.id)) ids.unshift(receipt.id);
    const watchStart = input.watchAfter ?? 0;
    if (!Number.isInteger(watchStart) || watchStart < 0 || watchStart > 50)
      throw driveChanged();
    let watchIndex = watchStart;
    for (; watchIndex < Math.min(ids.length, 50); watchIndex++) {
      const id = ids[watchIndex]!;
      const parent = await u.driveBackupRequests.find(id);
      if (
        !parent ||
        parent.accountId !== actor.accountId ||
        parent.createdAt <= since
      )
        continue;
      const root = parent.rootRequestId
        ? await u.driveBackupRequests.find(parent.rootRequestId)
        : null;
      const value = await parentView(
        u,
        actor.accountId,
        root && root.accountId === actor.accountId && root.createdAt > since
          ? root
          : parent,
        live,
      );
      if (bytes([...watched, { ...value, requestedId: id }]) > 28 * 1024) break;
      watched.push({ ...value, requestedId: id });
    }
    const next =
      last && (cut || page.length === 50)
        ? {
            id: last.id,
            createdAt: last.createdAt.toISOString(),
            digest: cursorDigest(
              c,
              actor.accountId,
              last.id,
              last.createdAt.toISOString(),
            ),
          }
        : null;
    return {
      actor: {
        accountId: actor.accountId,
        authVersion: actor.authVersion,
        browserEpoch: actor.browserEpoch,
      },
      active: (await u.driveBackupRequests.unfinished(actor.accountId)).account,
      rows,
      watched,
      watchNext: watchIndex < Math.min(ids.length, 50) ? watchIndex : null,
      next,
      receipt:
        receipt && receipt.createdAt > since
          ? {
              requestId: receipt.rootRequestId ?? receipt.id,
              receiptId: receipt.id,
              generation: receipt.generation ?? 1,
            }
          : null,
    };
  });
}
export async function getDriveBackupDetail(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    requestId: string;
    generation: number;
    after?: number | undefined;
  }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const parent = await u.driveBackupRequests.find(input.requestId);
    if (
      !parent ||
      parent.accountId !== actor.accountId ||
      (parent.generation ?? 1) !== input.generation ||
      parent.createdAt.getTime() <=
        c.clock.now().getTime() - DRIVE_BACKUP_LIMITS.historyMs
    )
      throw driveChanged();
    const all = await children(u, parent);
    const start = input.after ?? 0;
    if (!Number.isInteger(start) || start < 0 || start > all.length)
      throw driveChanged();
    const rows = [];
    let index = start;
    for (; index < all.length && rows.length < 50; index++) {
      const job = all[index]!;
      const value = await accessibleJob(u, actor.accountId, job);
      const record =
        job.state === "succeeded" && value.noteId
          ? await u.driveBackupRecords.find(job.recordId)
          : null;
      const row = {
        ...value,
        link: record?.accountId === actor.accountId ? record.webViewLink : null,
      };
      if (bytes([...rows, row]) > 60 * 1024) break;
      rows.push(row);
    }
    return {
      actor: { accountId: actor.accountId },
      requestId: parent.id,
      generation: parent.generation ?? 1,
      rows,
      next: index < all.length ? index : null,
    };
  });
}

import { BusinessRuleError } from "@repo/core/domain/error";
import {
  driveOwnerSchema,
  driveOwnerTransition,
} from "@repo/core/domain/integration/drive";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupJob,
  type DriveBackupRecord,
  type DriveBackupRequest,
  type DriveBackupTarget,
  type DriveBackupTargetHead,
  type DriveBackupTargetTuple,
  type DriveBackupTransfer,
  driveBackupJobSchema,
  driveBackupRecordSchema,
  driveBackupRequestSchema,
  driveBackupTargetHeadSchema,
  driveBackupTargetSchema,
  driveBackupTerminal,
  driveBackupTransferSchema,
  parseDriveBackup,
  type RetargetPersistenceEvidence,
} from "@repo/core/domain/integration/driveBackup";
import type {
  DriveBackupJobRepository,
  DriveBackupRecordRepository,
  DriveBackupRequestRepository,
  DriveBackupScope,
  DriveBackupTargetRepository,
  DriveBackupTransferRepository,
} from "@repo/core/domain/integration/driveBackupRepository";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  driveBackupTargetHeads as heads,
  driveBackupJobs as jobs,
  driveBackupRecords as records,
  driveBackupRequests as requests,
  driveBackupTargets as targets,
  driveBackupTransfers as transfers,
} from "../driveBackupSchema";
import { notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { sourceHeldCounts } from "./regenerationRepository";

const invalid = (): never => {
  throw new BusinessRuleError(
    "DRIVE_BACKUP_STATE_INVALID",
    "バックアップの保存状態を確認できません。",
  );
};
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const bounded = (n: number) =>
  Number.isSafeInteger(n) && n >= 1 && n <= 100 ? n : invalid();
const held = inArray(transfers.ownerState, ["active", "unknown"]);
const live = or(
  held,
  sql`${transfers.phase} not in ('succeeded','failed','cancelled')`,
)!;
const jobHeld = sql`exists(select 1 from drive_backup_transfers t where t.job_id=${jobs.id} and (t.owner_state in ('active','unknown') or t.read_pinned=1 or t.refresh_pending=1))`;
const jobLive = or(isNull(jobs.terminalAt), jobHeld)!;
const pendingJob = and(
  eq(jobs.state, "queued"),
  sql`${jobs.admissionIdentity} is not null`,
  sql`not exists(select 1 from drive_backup_transfers t where t.job_id=${jobs.id})`,
)!;
function jobScope(scope: DriveBackupScope) {
  if (scope.kind === "note") return eq(jobs.noteId, scope.noteId);
  if (scope.kind === "account")
    return and(
      eq(jobs.accountId, scope.accountId),
      scope.epoch === undefined
        ? undefined
        : sql`(json_extract(${jobs.admissionIdentity},'$.epoch')=${scope.epoch} or exists(select 1 from drive_backup_transfers t where t.job_id=${jobs.id} and t.epoch=${scope.epoch}))`,
    );
  return and(
    scope.accountId === undefined
      ? undefined
      : eq(jobs.accountId, scope.accountId),
    sql`(json_extract(${jobs.admissionIdentity},'$.workspaceId')=${scope.workspaceId} or exists(select 1 from drive_backup_transfers t where t.job_id=${jobs.id} and t.workspace_id=${scope.workspaceId}))`,
  );
}
const latestJob = sql`not exists(select 1 from drive_backup_jobs newer join drive_backup_requests nr on nr.id=newer.request_id join drive_backup_requests own on own.id=${jobs.requestId}
 where coalesce(nr.root_request_id,nr.id)=coalesce(own.root_request_id,own.id) and newer.root_ordinal=${jobs.rootOrdinal}
 and (case when nr.root_request_id is null then 1 else nr.generation end)>(case when own.root_request_id is null then 1 else own.generation end))`;
function scopeWhere(scope: DriveBackupScope) {
  if (scope.kind === "note") return eq(transfers.noteId, scope.noteId);
  if (scope.kind === "account")
    return and(
      eq(transfers.accountId, scope.accountId),
      scope.epoch === undefined ? undefined : eq(transfers.epoch, scope.epoch),
    );
  return and(
    eq(transfers.workspaceId, scope.workspaceId),
    scope.accountId === undefined
      ? undefined
      : eq(transfers.accountId, scope.accountId),
  );
}
function jobRow(row: typeof jobs.$inferSelect): DriveBackupJob {
  const { failure, recordId, ...base } = row;
  return parseDriveBackup(driveBackupJobSchema, {
    ...base,
    ...(row.state === "failed" ? { failure } : {}),
    ...(row.state === "succeeded" ? { recordId } : {}),
  });
}
function transferRow(row: typeof transfers.$inferSelect): DriveBackupTransfer {
  const {
    noteId: _note,
    accountId: _actor,
    workspaceId: _scope,
    epoch: _epoch,
    ownerState,
    runtimeGeneration,
    ownerToken,
    offset,
    length,
    recordId,
    failure,
    ...base
  } = row;
  return parseDriveBackup(driveBackupTransferSchema, {
    ...base,
    owner:
      ownerState === "none"
        ? { state: "none" }
        : { state: ownerState, runtimeGeneration, token: ownerToken },
    ...(row.phase === "uploading" ? { offset, length } : {}),
    ...(row.phase === "succeeded" ? { recordId } : {}),
    ...(row.phase === "failed" ? { failure } : {}),
  });
}
function transferValues(
  input: DriveBackupTransfer,
): typeof transfers.$inferInsert {
  const row = parseDriveBackup(driveBackupTransferSchema, input);
  const { owner, ...base } = row;
  return {
    ...base,
    noteId: row.identity.noteId,
    accountId: row.identity.accountId,
    workspaceId: row.identity.workspaceId,
    epoch: row.identity.epoch,
    ownerState: owner.state,
    runtimeGeneration: owner.state === "none" ? null : owner.runtimeGeneration,
    ownerToken: owner.state === "none" ? null : owner.token,
    offset: row.phase === "uploading" ? row.offset : null,
    length: row.phase === "uploading" ? row.length : null,
    recordId: row.phase === "succeeded" ? row.recordId : null,
    failure: row.phase === "failed" ? row.failure : null,
  };
}

function retargetUnsafe(tuple: DriveBackupTargetTuple) {
  return sql`exists(select 1 from drive_backup_targets t
    where t.original_id=${tuple.originalId} and t.account_id=${tuple.accountId} and t.subject=${tuple.subject} and (
      t.state!='unallocated' or t.file_id is not null
      or exists(select 1 from drive_backup_records r where r.target_id=t.id)
      or exists(select 1 from drive_backup_jobs j where j.target_id=t.id and not coalesce(
        j.state in ('failed','cancelled') and j.terminal_at is not null and j.bytes=0 and j.account_id=t.account_id and j.note_id=t.note_id
        and (j.failure is null or j.failure not in ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
        and (select count(*) from drive_backup_transfers x where x.job_id=j.id)<=1
        and (j.admission_identity is not null or exists(select 1 from drive_backup_transfers x where x.job_id=j.id))
        and (j.admission_identity is null or (json_extract(j.admission_identity,'$.originalId')=t.original_id
          and json_extract(j.admission_identity,'$.noteId')=t.note_id and json_extract(j.admission_identity,'$.accountId')=t.account_id
          and json_extract(j.admission_identity,'$.subject')=t.subject
          and json_extract(j.admission_identity,'$.folder.id')=json_extract(t.folder,'$.id')
          and json_extract(j.admission_identity,'$.folder.driveId') is json_extract(t.folder,'$.driveId')
          and json_extract(j.admission_identity,'$.folder.resourceKeyEnvelope') is json_extract(t.folder,'$.resourceKeyEnvelope'))),0))
      or exists(select 1 from drive_backup_transfers x where (x.target_id=t.id or x.job_id in (select id from drive_backup_jobs where target_id=t.id)) and not coalesce(
        x.target_id=t.id and x.note_id=t.note_id and x.account_id=t.account_id
        and json_extract(x.identity,'$.originalId')=t.original_id and json_extract(x.identity,'$.subject')=t.subject
        and json_extract(x.identity,'$.noteId')=t.note_id and json_extract(x.identity,'$.accountId')=t.account_id
        and json_extract(x.identity,'$.folder.id')=json_extract(t.folder,'$.id')
        and json_extract(x.identity,'$.folder.driveId') is json_extract(t.folder,'$.driveId')
        and json_extract(x.identity,'$.folder.resourceKeyEnvelope') is json_extract(t.folder,'$.resourceKeyEnvelope')
        and (x.job_id is null or exists(select 1 from drive_backup_jobs j where j.id=x.job_id and j.target_id=t.id and j.account_id=t.account_id and j.note_id=t.note_id))
        and x.phase in ('failed','cancelled') and x.received=0 and x.session_envelope is null and x.status_attempts=0
        and x.offset is null and x.length is null and x.read_pinned=0 and x.refresh_pending=0
        and (x.failure is null or x.failure not in ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
        and (x.owner_state='none' or (x.owner_state='closed' and x.phase='failed' and x.failure in ('DRIVE_BACKUP_FOLDER_TRASHED','DRIVE_BACKUP_FOLDER_UNAVAILABLE')))
        and not exists(select 1 from object_writes w where w.kind='drive-backup' and w.owner_id=x.id and w.active=1),0))
    ))`;
}

export class LibsqlDriveBackupRequestRepository
  implements DriveBackupRequestRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(requests)
      .where(eq(requests.id, id));
    return row ? parseDriveBackup(driveBackupRequestSchema, row) : null;
  }
  async command(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(requests)
      .where(
        and(
          eq(requests.accountId, accountId),
          eq(requests.commandId, commandId),
        ),
      );
    return row ? parseDriveBackup(driveBackupRequestSchema, row) : null;
  }
  async insert(value: DriveBackupRequest) {
    await this.db
      .insert(requests)
      .values(parseDriveBackup(driveBackupRequestSchema, value));
  }
  async replace(value: DriveBackupRequest, expectedVersion: number) {
    const next = parseDriveBackup(driveBackupRequestSchema, value);
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    if (
      next.version !== old.version + 1 ||
      !same(
        { ...old, version: next.version, cancelledAt: next.cancelledAt },
        next,
      ) ||
      old.cancelledAt !== null
    )
      return invalid();
    return (
      (
        await this.db
          .update(requests)
          .set(next)
          .where(
            and(
              eq(requests.id, next.id),
              eq(requests.version, expectedVersion),
            ),
          )
          .returning({ id: requests.id })
      ).length === 1
    );
  }
  async advanceRoot(
    id: string,
    expectedVersion: number,
    expectedGeneration: number,
  ) {
    return (
      (
        await this.db
          .update(requests)
          .set({
            version: expectedVersion + 1,
            generation: expectedGeneration + 1,
            cancelledAt: null,
          })
          .where(
            and(
              eq(requests.id, id),
              eq(requests.version, expectedVersion),
              eq(requests.generation, expectedGeneration),
              eq(requests.kind, "bulk"),
              isNull(requests.rootRequestId),
            ),
          )
          .returning({ id: requests.id })
      ).length === 1
    );
  }
  async unfinished(accountId: string) {
    const values = await this.db.all<{
      account: number;
      global: number;
    }>(sql`select count(*) as global,coalesce(sum(case when r.account_id=${accountId} then 1 else 0 end),0) as account from drive_backup_requests r where r.root_request_id is null and exists(
      select 1 from drive_backup_jobs j join drive_backup_requests jr on jr.id=j.request_id where coalesce(jr.root_request_id,jr.id)=r.id and (j.terminal_at is null or exists(select 1 from drive_backup_transfers t where t.job_id=j.id and (t.owner_state in ('active','unknown') or t.read_pinned=1 or t.refresh_pending=1))))`);
    return values[0] ?? { account: 0, global: 0 };
  }
  async page(
    accountId: string,
    since: Date,
    after: Readonly<{ createdAt: Date; id: string }> | null,
    limit: number,
  ) {
    return (
      await this.db
        .select()
        .from(requests)
        .where(
          and(
            eq(requests.accountId, accountId),
            gt(requests.createdAt, since),
            sql`(${requests.rootRequestId} is null or not exists(select 1 from drive_backup_requests root where root.id=${requests.rootRequestId} and root.created_at>${since.getTime()}))`,
            after
              ? or(
                  lt(requests.createdAt, after.createdAt),
                  and(
                    eq(requests.createdAt, after.createdAt),
                    lt(requests.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(requests.createdAt), desc(requests.id))
        .limit(bounded(limit))
    ).map((row) => parseDriveBackup(driveBackupRequestSchema, row));
  }
}
export class LibsqlDriveBackupJobRepository
  implements DriveBackupJobRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, id));
    return row ? jobRow(row) : null;
  }
  async forRequest(id: string) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(eq(jobs.requestId, id))
        .orderBy(asc(jobs.ordinal), asc(jobs.attempt))
        .limit(500)
    ).map(jobRow);
  }
  async latest(rootId: string) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(
          and(
            sql`exists(select 1 from drive_backup_requests r where r.id=${jobs.requestId} and coalesce(r.root_request_id,r.id)=${rootId})`,
            latestJob,
          ),
        )
        .orderBy(asc(jobs.rootOrdinal), asc(jobs.ordinal))
        .limit(500)
    ).map(jobRow);
  }
  async activeTarget(targetId: string) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.targetId, targetId), jobLive))
      .limit(2);
    if (rows.length > 1) return invalid();
    return rows[0] ? jobRow(rows[0]) : null;
  }
  async latestTarget(targetId: string) {
    const [row] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.targetId, targetId))
      .orderBy(desc(sql`rowid`))
      .limit(1);
    return row ? jobRow(row) : null;
  }
  async live(scope: DriveBackupScope) {
    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(jobScope(scope), jobLive))
      .orderBy(asc(jobs.id))
      .limit(50002);
    if (rows.length > 50001) return invalid();
    return rows.map(jobRow);
  }
  async cancelPending(scope: DriveBackupScope, now: Date) {
    const rows = await this.db
      .update(jobs)
      .set({
        state: "cancelled",
        version: sql`${jobs.version}+1`,
        terminalAt: now,
        updatedAt: now,
      })
      .where(and(jobScope(scope), pendingJob))
      .returning({ id: jobs.id });
    return rows.length;
  }
  async nextWaitingActor(after: string | null) {
    const first = async (following: boolean) =>
      (
        await this.db
          .select({ accountId: jobs.accountId })
          .from(jobs)
          .where(
            and(
              pendingJob,
              following && after ? gt(jobs.accountId, after) : undefined,
            ),
          )
          .orderBy(asc(jobs.accountId))
          .limit(1)
      )[0]?.accountId ?? null;
    return (after ? await first(true) : null) ?? (await first(false));
  }
  async waiting(accountId: string, limit: number) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.accountId, accountId), pendingJob))
        .orderBy(asc(jobs.createdAt), asc(jobs.id))
        .limit(bounded(limit))
    ).map(jobRow);
  }
  async insert(value: DriveBackupJob) {
    await this.db
      .insert(jobs)
      .values(parseDriveBackup(driveBackupJobSchema, value));
  }
  async replace(value: DriveBackupJob, expectedVersion: number) {
    const next = parseDriveBackup(driveBackupJobSchema, value);
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    if (
      next.version !== old.version + 1 ||
      old.terminalAt !== null ||
      next.updatedAt < old.updatedAt ||
      next.requestId !== old.requestId ||
      next.accountId !== old.accountId ||
      next.ordinal !== old.ordinal ||
      next.attempt !== old.attempt ||
      next.createdAt.getTime() !== old.createdAt.getTime() ||
      next.targetId !== old.targetId ||
      next.noteId !== old.noteId ||
      next.rootOrdinal !== old.rootOrdinal ||
      !same(next.admissionIdentity, old.admissionIdentity)
    )
      return invalid();
    return (
      (
        await this.db
          .update(jobs)
          .set({
            ...next,
            failure: next.state === "failed" ? next.failure : null,
            recordId: next.state === "succeeded" ? next.recordId : null,
          })
          .where(and(eq(jobs.id, next.id), eq(jobs.version, expectedVersion)))
          .returning({ id: jobs.id })
      ).length === 1
    );
  }
  async history(accountId: string, since: Date, limit: number) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.accountId, accountId), gt(jobs.createdAt, since)))
        .orderBy(desc(jobs.createdAt), desc(jobs.id))
        .limit(bounded(limit))
    ).map(jobRow);
  }
  async queued(accountId: string) {
    const [global] = await this.db
      .select({ n: count() })
      .from(transfers)
      .where(live);
    const [account] = await this.db
      .select({ n: count() })
      .from(transfers)
      .where(and(live, eq(transfers.accountId, accountId)));
    return { global: global?.n ?? 0, account: account?.n ?? 0 };
  }
  async prune(now: Date, limit: number) {
    const expired = await this.db
      .select({ id: jobs.id, requestId: jobs.requestId })
      .from(jobs)
      .where(
        and(
          sql`${jobs.createdAt} <= ${now.getTime() - DRIVE_BACKUP_LIMITS.historyMs}`,
          sql`${jobs.terminalAt} is not null`,
          sql`not exists(select 1 from drive_backup_transfers t where t.job_id=${jobs.id} and (t.owner_state in ('active','unknown') or t.phase not in ('succeeded','failed','cancelled')))`,
          sql`not exists(select 1 from drive_backup_jobs r where r.retry_of=${jobs.id} and (r.terminal_at is null or exists(select 1 from drive_backup_transfers t where t.job_id=r.id and (t.owner_state in ('active','unknown') or t.read_pinned=1 or t.refresh_pending=1))))`,
          sql`not (${jobs.rootOrdinal} is not null and ${latestJob} and exists(
            select 1 from drive_backup_requests own join drive_backup_requests root on root.id=coalesce(own.root_request_id,own.id)
            where own.id=${jobs.requestId} and (root.created_at>${now.getTime() - DRIVE_BACKUP_LIMITS.historyMs}
              or exists(select 1 from drive_backup_requests receipt where receipt.root_request_id=root.id and receipt.created_at>${now.getTime() - DRIVE_BACKUP_LIMITS.historyMs})
              or exists(select 1 from drive_backup_jobs sibling join drive_backup_requests sr on sr.id=sibling.request_id where coalesce(sr.root_request_id,sr.id)=root.id and (sibling.terminal_at is null or exists(select 1 from drive_backup_transfers t where t.job_id=sibling.id and (t.owner_state in ('active','unknown') or t.read_pinned=1 or t.refresh_pending=1)))))))`,
        ),
      )
      .limit(bounded(limit));
    for (const row of expired) {
      await this.db
        .update(transfers)
        .set({ jobId: null })
        .where(eq(transfers.jobId, row.id));
      await this.db
        .update(jobs)
        .set({ retryOf: null })
        .where(eq(jobs.retryOf, row.id));
      await this.db.delete(jobs).where(eq(jobs.id, row.id));
      await this.db
        .delete(requests)
        .where(
          and(
            eq(requests.id, row.requestId),
            sql`not exists(select 1 from drive_backup_jobs j where j.request_id=${requests.id})`,
            sql`not exists(select 1 from drive_backup_requests child where child.root_request_id=${requests.id})`,
          ),
        );
    }
    for (let pass = 0; pass < 2; pass++) {
      const empty = await this.db
        .select({ id: requests.id })
        .from(requests)
        .where(
          and(
            sql`${requests.createdAt}<=${now.getTime() - DRIVE_BACKUP_LIMITS.historyMs}`,
            sql`not exists(select 1 from drive_backup_jobs j where j.request_id=${requests.id})`,
            sql`not exists(select 1 from drive_backup_requests child where child.root_request_id=${requests.id})`,
          ),
        )
        .limit(bounded(limit));
      if (empty.length)
        await this.db.delete(requests).where(
          inArray(
            requests.id,
            empty.map((row) => row.id),
          ),
        );
    }
    return expired.length;
  }
}
export class LibsqlDriveBackupTargetRepository
  implements DriveBackupTargetRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(targets)
      .where(eq(targets.id, id));
    return row ? parseDriveBackup(driveBackupTargetSchema, row) : null;
  }
  async original(originalId: string, accountId: string, subject: string) {
    const head = await this.head({ originalId, accountId, subject });
    if (head) {
      const target = await this.find(head.targetId);
      if (
        !target ||
        target.originalId !== originalId ||
        target.accountId !== accountId ||
        target.subject !== subject
      )
        return invalid();
      return target;
    }
    const [orphan] = await this.db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.originalId, originalId),
          eq(targets.accountId, accountId),
          eq(targets.subject, subject),
        ),
      )
      .limit(1);
    if (orphan) return invalid();
    return null;
  }
  async head(tuple: DriveBackupTargetTuple) {
    const [row] = await this.db
      .select()
      .from(heads)
      .where(
        and(
          eq(heads.originalId, tuple.originalId),
          eq(heads.accountId, tuple.accountId),
          eq(heads.subject, tuple.subject),
        ),
      );
    return row ? parseDriveBackup(driveBackupTargetHeadSchema, row) : null;
  }
  async isCurrent(targetId: string) {
    return (
      (
        await this.db
          .select({ id: heads.targetId })
          .from(heads)
          .where(eq(heads.targetId, targetId))
          .limit(1)
      ).length === 1
    );
  }
  async inspectRetarget(
    tuple: DriveBackupTargetTuple,
  ): Promise<RetargetPersistenceEvidence> {
    const head = await this.head(tuple);
    const target = head ? await this.find(head.targetId) : null;
    if (!head || !target)
      return { kind: "blocked", reason: "invalid-evidence" };
    const [evidence] = await this.db.all<{
      allocated: number;
      recorded: number;
      active: number;
      unsafe: number;
      closed: number;
    }>(sql`
      select
      exists(select 1 from drive_backup_targets t where t.original_id=${tuple.originalId} and t.account_id=${tuple.accountId} and t.subject=${tuple.subject} and (t.state!='unallocated' or t.file_id is not null)) allocated,
      exists(select 1 from drive_backup_records r where r.original_id=${tuple.originalId} and r.account_id=${tuple.accountId} and r.subject=${tuple.subject}) recorded,
      exists(select 1 from drive_backup_jobs j join drive_backup_targets t on t.id=j.target_id where t.original_id=${tuple.originalId} and t.account_id=${tuple.accountId} and t.subject=${tuple.subject} and j.terminal_at is null) active,
      (${retargetUnsafe(tuple)}) unsafe,
      exists(select 1 from drive_backup_transfers x join drive_backup_targets t on t.id=x.target_id where t.original_id=${tuple.originalId} and t.account_id=${tuple.accountId} and t.subject=${tuple.subject} and x.owner_state='closed') closed`);
    if (!evidence) return invalid();
    if (evidence.recorded) return { kind: "blocked", reason: "already-saved" };
    if (evidence.allocated || target.state !== "unallocated")
      return { kind: "blocked", reason: "allocated" };
    if (evidence.active) return { kind: "blocked", reason: "active" };
    if (evidence.unsafe) return { kind: "blocked", reason: "invalid-evidence" };
    return {
      kind: "never-sent",
      head,
      target,
      closure: evidence.closed ? "closed-before-create" : "never-owned",
    };
  }
  async closedOwners(
    tuple: DriveBackupTargetTuple,
    afterTransferId: string | null,
    limit: 100,
  ) {
    if (limit !== 100) return invalid();
    const rows = await this.db.all<{
      id: string;
      runtime_generation: string;
      owner_token: string;
    }>(sql`
      select x.id,x.runtime_generation,x.owner_token from drive_backup_transfers x join drive_backup_targets t on t.id=x.target_id
      where t.original_id=${tuple.originalId} and t.account_id=${tuple.accountId} and t.subject=${tuple.subject}
      and x.owner_state='closed' and (${afterTransferId} is null or x.id collate binary > ${afterTransferId})
      order by x.id collate binary limit 101`);
    const items = rows.slice(0, limit).map((row) => {
      const owner = parseDriveBackup(driveOwnerSchema, {
        state: "closed",
        runtimeGeneration: row.runtime_generation,
        token: row.owner_token,
      });
      if (owner.state !== "closed") return invalid();
      return {
        transferId: row.id,
        owner: {
          runtimeGeneration: owner.runtimeGeneration,
          token: owner.token,
        },
      };
    });
    return {
      items,
      nextAfter:
        rows.length > limit ? items[items.length - 1]!.transferId : null,
    };
  }
  async insertInitial(value: DriveBackupTarget) {
    const target = parseDriveBackup(driveBackupTargetSchema, value);
    await this.db.insert(heads).values({
      originalId: target.originalId,
      accountId: target.accountId,
      subject: target.subject,
      targetId: target.id,
      version: 1,
    });
    await this.db.insert(targets).values(target);
  }
  async replaceHead(
    expected: DriveBackupTargetHead,
    expectedTargetVersion: number,
    next: DriveBackupTarget,
  ) {
    const target = parseDriveBackup(driveBackupTargetSchema, next);
    const evidence = await this.inspectRetarget(expected);
    if (
      evidence.kind !== "never-sent" ||
      !same(evidence.head, expected) ||
      evidence.target.version !== expectedTargetVersion
    )
      return false;
    if (
      target.originalId !== expected.originalId ||
      target.accountId !== expected.accountId ||
      target.subject !== expected.subject ||
      target.noteId !== evidence.target.noteId ||
      target.id === expected.targetId
    )
      return invalid();
    const updated = await this.db
      .update(heads)
      .set({ targetId: target.id, version: expected.version + 1 })
      .where(
        and(
          eq(heads.targetId, expected.targetId),
          eq(heads.version, expected.version),
          sql`exists(select 1 from drive_backup_targets t where t.id=${expected.targetId} and t.version=${expectedTargetVersion})`,
        ),
      )
      .returning({ id: heads.targetId });
    if (!updated.length) return false;
    await this.db.insert(targets).values(target);
    return true;
  }
  async replace(value: DriveBackupTarget, expectedVersion: number) {
    const next = parseDriveBackup(driveBackupTargetSchema, value);
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    if (
      next.version !== old.version + 1 ||
      next.updatedAt < old.updatedAt ||
      old.state === "confirmed" ||
      (old.fileId !== null && old.fileId !== next.fileId) ||
      !same(
        {
          ...old,
          state: next.state,
          fileId: next.fileId,
          version: next.version,
          updatedAt: next.updatedAt,
        },
        next,
      )
    )
      return invalid();
    return (
      (
        await this.db
          .update(targets)
          .set(next)
          .where(
            and(eq(targets.id, next.id), eq(targets.version, expectedVersion)),
          )
          .returning({ id: targets.id })
      ).length === 1
    );
  }
  async purgeNote(noteId: string) {
    if (
      (
        await this.db
          .select({ id: jobs.id })
          .from(jobs)
          .where(and(eq(jobs.noteId, noteId), isNull(jobs.terminalAt)))
          .limit(1)
      ).length
    )
      return invalid();
    if (
      (
        await this.db
          .select({ id: transfers.id })
          .from(transfers)
          .where(
            and(
              eq(transfers.noteId, noteId),
              or(live, eq(transfers.readPinned, true)),
            ),
          )
          .limit(1)
      ).length
    )
      return invalid();
    await this.db
      .update(jobs)
      .set({
        noteId: null,
        targetId: null,
        title: "削除済みノート",
        admissionIdentity: null,
      })
      .where(eq(jobs.noteId, noteId));
    await this.db
      .delete(heads)
      .where(
        sql`${heads.targetId} in (select id from drive_backup_targets where note_id=${noteId})`,
      );
    await this.db.delete(records).where(eq(records.noteId, noteId));
    await this.db.delete(transfers).where(eq(transfers.noteId, noteId));
    await this.db.delete(targets).where(eq(targets.noteId, noteId));
  }
}
export class LibsqlDriveBackupTransferRepository
  implements DriveBackupTransferRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async sourceGeneration(noteId: string) {
    const [row] = await this.db
      .select({ value: notes.ownershipGeneration })
      .from(notes)
      .where(eq(notes.id, noteId));
    return row?.value ?? null;
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, id));
    return row ? transferRow(row) : null;
  }
  async forTarget(targetId: string) {
    return (
      await this.db
        .select()
        .from(transfers)
        .where(eq(transfers.targetId, targetId))
        .orderBy(desc(transfers.createdAt))
        .limit(100)
    ).map(transferRow);
  }
  async forJob(jobId: string) {
    const rows = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.jobId, jobId))
      .limit(2);
    if (rows.length === 0) return { kind: "missing" as const };
    if (rows.length !== 1) return { kind: "ambiguous" as const };
    return { kind: "found" as const, row: transferRow(rows[0]!) };
  }
  async canStartUnallocated(targetId: string) {
    const rows = await this.db
      .select({ id: targets.id })
      .from(targets)
      .where(
        and(
          eq(targets.id, targetId),
          eq(targets.state, "unallocated"),
          isNull(targets.fileId),
          sql`exists (select 1 from ${transfers} where ${transfers.targetId} = ${targets.id} and ${transfers.phase} = 'cancelled' and ${transfers.ownerState} = 'none')`,
          sql`not exists (select 1 from ${transfers} where ${transfers.targetId} = ${targets.id} and not (
        ${transfers.phase} = 'cancelled' and ${transfers.ownerState} = 'none'
        and ${transfers.received} = 0 and ${transfers.sessionEnvelope} is null
        and ${transfers.statusAttempts} = 0 and ${transfers.readPinned} = 0
        and ${transfers.refreshPending} = 0
      ))`,
        ),
      )
      .limit(1);
    return rows.length === 1;
  }
  async canRetryUnstarted(
    targetId: string,
    jobId: string,
    exceptJobId?: string,
  ) {
    const rows = await this.db.all<{
      id: string;
    }>(sql`select t.id from drive_backup_targets t join drive_backup_jobs j on j.target_id=t.id
      where t.id=${targetId} and j.id=${jobId} and j.state in ('failed','cancelled') and t.state='unallocated' and t.file_id is null
      and (j.admission_identity is not null or exists(select 1 from drive_backup_transfers x where x.job_id=j.id))
      and (select count(*) from drive_backup_transfers x where x.job_id=j.id)<=1
      and not exists(select 1 from drive_backup_jobs other where other.target_id=t.id and other.terminal_at is null and (${exceptJobId ?? null} is null or other.id<>${exceptJobId ?? null}))
      and not exists(select 1 from drive_backup_transfers x where x.target_id=t.id and (${exceptJobId ?? null} is null or x.job_id is null or x.job_id<>${exceptJobId ?? null}) and not (
        x.phase in ('failed','cancelled') and x.owner_state='none' and x.received=0 and x.session_envelope is null
        and x.status_attempts=0 and x.read_pinned=0 and x.refresh_pending=0 and x.offset is null and x.length is null
      )) limit 1`);
    return rows.length === 1;
  }
  async insert(value: DriveBackupTransfer) {
    await this.db.insert(transfers).values(transferValues(value));
  }
  async replace(value: DriveBackupTransfer, expectedVersion: number) {
    const next = parseDriveBackup(driveBackupTransferSchema, value);
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    if (
      next.version !== old.version + 1 ||
      next.updatedAt < old.updatedAt ||
      !same(next.identity, old.identity) ||
      next.targetId !== old.targetId ||
      next.jobId !== old.jobId ||
      next.createdAt.getTime() !== old.createdAt.getTime() ||
      next.deadlineAt.getTime() !== old.deadlineAt.getTime() ||
      !driveOwnerTransition(old.owner, next.owner) ||
      next.received < old.received ||
      next.cancelGeneration < old.cancelGeneration ||
      next.cancelGeneration > old.cancelGeneration + 1 ||
      (driveBackupTerminal(old.phase) && next.phase !== old.phase) ||
      (old.owner.state === "unknown" && next.owner.state === "active")
    )
      return invalid();
    return (
      (
        await this.db
          .update(transfers)
          .set(transferValues(next))
          .where(
            and(
              eq(transfers.id, next.id),
              eq(transfers.version, expectedVersion),
            ),
          )
          .returning({ id: transfers.id })
      ).length === 1
    );
  }
  async claim(value: DriveBackupTransfer, expectedVersion: number) {
    const counts = await this.held(value.identity.accountId);
    if (
      counts.global >= DRIVE_BACKUP_LIMITS.globalOwners ||
      counts.account >= DRIVE_BACKUP_LIMITS.accountOwners
    )
      return false;
    const old = await this.find(value.id);
    if (
      !old ||
      value.owner.state !== "active" ||
      !(
        (old.phase === "queued" &&
          old.owner.state === "none" &&
          value.phase === "checking") ||
        (!driveBackupTerminal(old.phase) &&
          old.owner.state === "closed" &&
          value.phase === old.phase)
      )
    )
      return false;
    return this.replace(value, expectedVersion);
  }
  async scan(kind: "queued" | "recoverable" | "held", limit: number) {
    return (
      await this.db
        .select()
        .from(transfers)
        .where(
          kind === "queued"
            ? and(
                eq(transfers.phase, "queued"),
                eq(transfers.ownerState, "none"),
              )
            : kind === "recoverable"
              ? and(
                  eq(transfers.ownerState, "closed"),
                  sql`${transfers.phase} not in ('succeeded','failed','cancelled')`,
                )
              : held,
        )
        .orderBy(asc(transfers.createdAt), asc(transfers.id))
        .limit(bounded(limit))
    ).map(transferRow);
  }
  async live(scope: DriveBackupScope) {
    return (
      await this.db
        .select()
        .from(transfers)
        .where(and(scopeWhere(scope), live))
        .orderBy(asc(transfers.createdAt), asc(transfers.id))
        .limit(101)
    ).map(transferRow);
  }
  async cancel(scope: DriveBackupScope, now: Date) {
    const rows = await this.live(scope);
    if (rows.length > 101) return invalid();
    const changed: DriveBackupTransfer[] = [];
    for (const row of rows) {
      if (row.phase === "cancelled" || driveBackupTerminal(row.phase)) {
        changed.push(row);
        continue;
      }
      const {
        phase: _phase,
        offset: _offset,
        length: _length,
        ...base
      } = {
        offset: undefined,
        length: undefined,
        ...row,
      };
      const next = parseDriveBackup(driveBackupTransferSchema, {
        ...base,
        phase: "cancelled",
        version: row.version + 1,
        cancelGeneration: row.cancelGeneration + 1,
        updatedAt: now,
      });
      if (!(await this.replace(next, row.version))) return invalid();
      if (row.jobId) {
        const repo = new LibsqlDriveBackupJobRepository(this.db);
        const job = await repo.find(row.jobId);
        if (job && job.terminalAt === null)
          await repo.replace(
            {
              ...job,
              state: "cancelled",
              version: job.version + 1,
              bytes: row.received,
              terminalAt: now,
              updatedAt: now,
            },
            job.version,
          );
      }
      changed.push(next);
    }
    return changed;
  }
  async held(accountId: string) {
    const [global] = await this.db
      .select({ n: count() })
      .from(transfers)
      .where(held);
    const [account] = await this.db
      .select({ n: count() })
      .from(transfers)
      .where(and(held, eq(transfers.accountId, accountId)));
    const source = await sourceHeldCounts(this.db, accountId);
    return {
      global: (global?.n ?? 0) + source.global,
      account: (account?.n ?? 0) + source.account,
    };
  }
  async refreshing(accountId: string, epoch: number) {
    return (
      (
        await this.db
          .select({ id: transfers.id })
          .from(transfers)
          .where(
            and(
              held,
              eq(transfers.accountId, accountId),
              eq(transfers.epoch, epoch),
              eq(transfers.refreshPending, true),
            ),
          )
          .limit(1)
      ).length > 0
    );
  }
}
export class LibsqlDriveBackupRecordRepository
  implements DriveBackupRecordRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(records)
      .where(eq(records.id, id));
    return row ? parseDriveBackup(driveBackupRecordSchema, row) : null;
  }
  async target(targetId: string) {
    const [row] = await this.db
      .select()
      .from(records)
      .where(eq(records.targetId, targetId));
    return row ? parseDriveBackup(driveBackupRecordSchema, row) : null;
  }
  async forNote(noteId: string, accountId: string) {
    return (
      await this.db
        .select()
        .from(records)
        .where(
          and(eq(records.noteId, noteId), eq(records.accountId, accountId)),
        )
        .limit(100)
    ).map((row) => parseDriveBackup(driveBackupRecordSchema, row));
  }
  async insert(value: DriveBackupRecord) {
    const next = parseDriveBackup(driveBackupRecordSchema, value);
    const target = await new LibsqlDriveBackupTargetRepository(this.db).find(
      next.targetId,
    );
    if (
      !target ||
      target.state !== "confirmed" ||
      target.fileId !== next.fileId ||
      target.accountId !== next.accountId ||
      target.subject !== next.subject ||
      target.noteId !== next.noteId ||
      target.originalId !== next.originalId
    )
      return invalid();
    await this.db.insert(records).values(next);
  }
}

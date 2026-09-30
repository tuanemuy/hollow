import { BusinessRuleError } from "@repo/core/domain/error";
import { driveOwnerTransition } from "@repo/core/domain/integration/drive";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupJob,
  type DriveBackupRecord,
  type DriveBackupRequest,
  type DriveBackupTarget,
  type DriveBackupTransfer,
  driveBackupJobSchema,
  driveBackupRecordSchema,
  driveBackupRequestSchema,
  driveBackupTargetSchema,
  driveBackupTerminal,
  driveBackupTransferSchema,
  parseDriveBackup,
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
  or,
  sql,
} from "drizzle-orm";
import {
  driveBackupJobs as jobs,
  driveBackupRecords as records,
  driveBackupRequests as requests,
  driveBackupTargets as targets,
  driveBackupTransfers as transfers,
} from "../driveBackupSchema";
import { notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

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
      next.noteId !== old.noteId
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
      .from(jobs)
      .where(isNull(jobs.terminalAt));
    const [account] = await this.db
      .select({ n: count() })
      .from(jobs)
      .where(and(isNull(jobs.terminalAt), eq(jobs.accountId, accountId)));
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
    const [row] = await this.db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.originalId, originalId),
          eq(targets.accountId, accountId),
          eq(targets.subject, subject),
        ),
      );
    return row ? parseDriveBackup(driveBackupTargetSchema, row) : null;
  }
  async insert(value: DriveBackupTarget) {
    await this.db
      .insert(targets)
      .values(parseDriveBackup(driveBackupTargetSchema, value));
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
      .set({ noteId: null, targetId: null, title: "削除済みノート" })
      .where(eq(jobs.noteId, noteId));
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
    return { global: global?.n ?? 0, account: account?.n ?? 0 };
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

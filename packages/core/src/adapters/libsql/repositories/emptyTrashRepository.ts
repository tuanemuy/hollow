import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import {
  type EmptyAttempt,
  type EmptyCounts,
  type EmptyCursor,
  type EmptyHeader,
  type EmptySummary,
  type EmptyTarget,
  emptyJobState,
} from "@repo/core/domain/purge/emptyTrash";
import type { EmptyTrashRepository } from "@repo/core/domain/purge/ports/emptyTrashRepository";
import { selectedScope } from "@repo/core/domain/workspace/entity";
import { and, eq, sql } from "drizzle-orm";
import {
  emptyTrashAttempts as attempts,
  emptyTrashBatches as batches,
  emptyTrashTargets as targets,
} from "../emptyTrashSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { scopeCondition } from "./scopeCapacityRepository";

const joins = sql`from empty_trash_targets t left join empty_trash_attempts a on a.id=t.latest_attempt_id left join note_purges p on p.id=a.purge_id`;
const state = sql`case when t.closed_state is not null then t.closed_state when a.id is null or (a.purge_id is null and a.state='queued') then 'waiting' else coalesce(p.state,a.state) end`;
function header(row: typeof batches.$inferSelect): EmptyHeader {
  if (row.phase === "accepted" && row.acceptedAt)
    return { ...row, phase: "accepted", acceptedAt: row.acceptedAt };
  if (row.phase !== "accepted" && row.acceptedAt === null)
    return { ...row, phase: row.phase, acceptedAt: null };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid empty-trash header",
  );
}
function attempt(row: typeof attempts.$inferSelect): EmptyAttempt {
  return row.state === "failed"
    ? {
        ...row,
        state: "failed",
        failure: row.failure ?? "処理状態を確認できません。",
      }
    : { ...row, state: row.state, failure: null };
}
export class LibsqlEmptyTrashRepository implements EmptyTrashRepository {
  constructor(private readonly db: HollowTransaction) {}
  async prepare(
    id: string,
    accountId: string,
    now: Date,
    expires: Date,
    workspaceId?: string,
  ) {
    await this.db.insert(batches).values({
      id,
      accountId,
      workspaceId: workspaceId ?? null,
      phase: "prepared",
      createdAt: now,
      updatedAt: now,
      expiresAt: expires,
      total: 0,
    });
    await this.db.run(sql`insert into empty_trash_targets(parent_id,ordinal,note_id,operation_id,title)
      select ${id},row_number() over(order by trashed_at desc,id desc),id,trash_operation_id,title from notes
      where ${scopeCondition(selectedScope(accountId, { workspaceId }), sql`owner_workspace_id`, sql`owner_account_id`)} and lifecycle='trashed'`);
    const [count] = await this.db.all<{ n: number }>(
      sql`select count(*) n from empty_trash_targets where parent_id=${id}`,
    );
    if (!count?.n) {
      await this.db.delete(batches).where(eq(batches.id, id));
      return null;
    }
    await this.db
      .update(batches)
      .set({ total: count.n })
      .where(eq(batches.id, id));
    return this.find(id);
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(batches)
      .where(eq(batches.id, id));
    return row ? header(row) : null;
  }
  async accept(id: string, now: Date) {
    await this.db
      .update(batches)
      .set({
        phase: "accepted",
        acceptedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .where(and(eq(batches.id, id), eq(batches.phase, "prepared")));
  }
  async discard(id: string, now: Date) {
    await this.db
      .update(batches)
      .set({ phase: "discarded", updatedAt: now })
      .where(and(eq(batches.id, id), eq(batches.phase, "prepared")));
  }
  async pending(limit: number) {
    return this.db.all<{
      parentId: string;
      ordinal: number;
      generation: number;
      attemptId: string | null;
    }>(sql`
      select t.parent_id parentId,t.ordinal,b.generation,t.latest_attempt_id attemptId from empty_trash_targets t
      join empty_trash_batches b on b.id=t.parent_id left join empty_trash_attempts a on a.id=t.latest_attempt_id
      where b.phase='accepted' and t.closed_state is null and (a.id is null or (a.purge_id is null and a.state='queued'))
      order by b.created_at,b.id,t.ordinal limit ${limit}`);
  }
  async target(id: string, ordinal: number): Promise<EmptyTarget | null> {
    const [row] = await this.db
      .select()
      .from(targets)
      .where(and(eq(targets.parentId, id), eq(targets.ordinal, ordinal)));
    if (!row) return null;
    const [latest] = row.latestAttemptId
      ? await this.db
          .select()
          .from(attempts)
          .where(eq(attempts.id, row.latestAttemptId))
      : [];
    const value = latest ? await this.project(latest) : null;
    return {
      parentId: row.parentId,
      ordinal: row.ordinal,
      noteId: row.noteId,
      operationId: row.operationId,
      title: row.title,
      closedState: row.closedState,
      latest: value,
    };
  }
  private async project(
    row: typeof attempts.$inferSelect,
  ): Promise<EmptyAttempt> {
    if (!row.purgeId) return attempt(row);
    const [p] = await this.db.all<{
      state: EmptyAttempt["state"];
      failure: string | null;
      recoveries: number;
      updated_at: number;
    }>(
      sql`select state,failure,recoveries,updated_at from note_purges where id=${row.purgeId}`,
    );
    return p
      ? attempt({
          ...row,
          state: p.state,
          failure: p.failure,
          recoveries: Math.max(0, p.recoveries - row.recoveryBase),
          updatedAt: new Date(p.updated_at),
        })
      : attempt(row);
  }
  async saveAttempt(value: EmptyAttempt) {
    await this.db
      .insert(attempts)
      .values(value)
      .onConflictDoUpdate({
        target: attempts.id,
        set: {
          purgeId: value.purgeId,
          state: value.state,
          failure: value.failure,
          recoveryBase: value.recoveryBase,
          recoveries: value.recoveries,
          updatedAt: value.updatedAt,
        },
      });
    await this.db
      .update(targets)
      .set({ latestAttemptId: value.id })
      .where(
        and(
          eq(targets.parentId, value.parentId),
          eq(targets.ordinal, value.ordinal),
        ),
      );
  }
  async cancel(id: string, generation: number, now: Date) {
    await this.db
      .update(batches)
      .set({
        cancelRequested: true,
        generation: generation + 1,
        updatedAt: now,
      })
      .where(and(eq(batches.id, id), eq(batches.generation, generation)));
    await this.db.run(
      sql`update empty_trash_targets set closed_state='cancelled' where parent_id=${id} and latest_attempt_id is null and closed_state is null`,
    );
    await this.db.run(sql`update empty_trash_attempts set state='cancelled',failure=null,updated_at=${now.getTime()}
      where parent_id=${id} and purge_id is null and state='queued' and id in(select latest_attempt_id from empty_trash_targets where parent_id=${id})`);
  }
  async retry(
    id: string,
    generation: number,
    ordinal: number | undefined,
    idPrefix: string,
    now: Date,
  ) {
    const selected = sql`select t.ordinal from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id left join note_purges p on p.id=a.purge_id
      where t.parent_id=${id} and ${ordinal === undefined ? sql`1` : sql`t.ordinal=${ordinal}`} and coalesce(p.state,a.state)='failed' and t.closed_state is null`;
    await this.db.run(sql`update empty_trash_attempts set state='failed',failure=coalesce((select failure from note_purges where id=purge_id),failure),
      recoveries=max(0,coalesce((select recoveries from note_purges where id=purge_id),recovery_base)-recovery_base),
      updated_at=coalesce((select updated_at from note_purges where id=purge_id),updated_at)
      where id in(select latest_attempt_id from empty_trash_targets where parent_id=${id} and ordinal in(${selected}))`);
    await this.db.run(sql`insert into empty_trash_attempts(id,parent_id,ordinal,retry_of,purge_id,state,failure,recovery_base,recoveries,created_at,updated_at)
      select ${idPrefix}||':'||t.ordinal,t.parent_id,t.ordinal,a.id,a.purge_id,'queued',null,coalesce(p.recoveries,a.recovery_base),0,${now.getTime()},${now.getTime()}
      from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id left join note_purges p on p.id=a.purge_id
      where t.parent_id=${id} and t.ordinal in(${selected})`);
    const [count] = await this.db.all<{ n: number }>(
      sql`select count(*) n from empty_trash_attempts where id like ${`${idPrefix}:%`}`,
    );
    if (!count?.n) return 0;
    await this.db.run(
      sql`update empty_trash_targets set latest_attempt_id=${idPrefix}||':'||ordinal where parent_id=${id} and ordinal in(${selected})`,
    );
    await this.db.run(
      sql`update note_purges set state='queued',failure=null,next_attempt_at=${now.getTime()} where state='failed' and id in(select purge_id from empty_trash_attempts where id like ${`${idPrefix}:%`})`,
    );
    await this.db
      .update(batches)
      .set({
        generation: generation + 1,
        cancelRequested: false,
        updatedAt: now,
      })
      .where(and(eq(batches.id, id), eq(batches.generation, generation)));
    return count.n;
  }
  private async counts(id: string): Promise<EmptyCounts> {
    const [row] = await this.db.all<EmptyCounts>(sql`select count(*) total,
      coalesce(sum((${state})='waiting'),0) waiting,coalesce(sum((${state}) in('queued','running')),0) active,
      coalesce(sum((${state})='succeeded'),0) succeeded,coalesce(sum((${state})='failed'),0) failed,
      coalesce(sum((${state})='cancelled'),0) cancelled,coalesce(sum(t.note_id is null),0) expired,
      coalesce(sum((${state})='failed' and t.closed_state is null),0) retryable ${joins} where t.parent_id=${id}`);
    return (
      row ?? {
        total: 0,
        waiting: 0,
        active: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
        expired: 0,
        retryable: 0,
      }
    );
  }
  async summary(id: string): Promise<EmptySummary | null> {
    const h = await this.find(id);
    if (!h) return null;
    const counts = await this.counts(id);
    const [last] = await this.db.all<{ at: number | null }>(
      sql`select max(coalesce(p.updated_at,a.updated_at)) at ${joins} where t.parent_id=${id}`,
    );
    return {
      header: {
        ...h,
        updatedAt: new Date(Math.max(h.updatedAt.getTime(), last?.at ?? 0)),
      },
      counts,
      state: emptyJobState(counts, h.cancelRequested),
    };
  }
  private liveParents(accountId: string, since: Date) {
    return sql`b.account_id=${accountId} and b.phase='accepted' and (b.created_at>=${since.getTime()} or exists(
      select 1 ${joins} where t.parent_id=b.id and (a.created_at>=${since.getTime()} or (${state}) in('waiting','queued','running') or (p.id is not null and p.state!='succeeded'))))`;
  }
  private unfinished() {
    return sql`exists(select 1 ${joins} where t.parent_id=b.id and ((${state}) in('waiting','queued','running') or ((${state})='failed' and t.closed_state is null)))`;
  }
  async read(id: string, accountId: string, since: Date) {
    const [row] = await this.db.all<{ id: string }>(
      sql`select b.id from empty_trash_batches b where b.id=${id} and ${this.liveParents(accountId, since)}`,
    );
    return row ? this.summary(row.id) : null;
  }
  async page(
    accountId: string,
    scope: "unfinished" | "completed",
    before: EmptyCursor | undefined,
    since: Date,
    limit: number,
  ) {
    const rows = await this.db.all<{
      id: string;
    }>(sql`select b.id from empty_trash_batches b where ${this.liveParents(accountId, since)}
      and ${scope === "unfinished" ? this.unfinished() : sql`not (${this.unfinished()})`}
      and ${before ? sql`(b.created_at<${before.at.getTime()} or (b.created_at=${before.at.getTime()} and b.id<${before.id}))` : sql`1`}
      order by b.created_at desc,b.id desc limit ${limit}`);
    const result: EmptySummary[] = [];
    for (const row of rows) {
      const value = await this.summary(row.id);
      if (value) result.push(value);
    }
    return result;
  }
  async activity(accountId: string, since: Date) {
    const [row] = await this.db.all<{
      unfinished: number;
      active: number;
      failed: number;
      representative: string | null;
    }>(sql`
      select count(*) unfinished,
      coalesce(sum(exists(select 1 ${joins} where t.parent_id=b.id and (${state}) in('waiting','queued','running'))),0) active,
      coalesce(sum(not exists(select 1 ${joins} where t.parent_id=b.id and (${state}) in('waiting','queued','running'))),0) failed,min(b.id) representative
      from empty_trash_batches b where ${this.liveParents(accountId, since)} and ${this.unfinished()}`);
    return row ?? { unfinished: 0, active: 0, failed: 0, representative: null };
  }
  async children(id: string, after: number, since: Date, limit: number) {
    const parent = await this.find(id);
    const rows = await this.db.all<{
      ordinal: number;
    }>(sql`select t.ordinal ${joins} where t.parent_id=${id} and t.ordinal>${after}
      and t.note_id is not null and (a.id is null or a.created_at>=${since.getTime()} or (${state}) in('waiting','queued','running') or(p.id is not null and p.state!='succeeded')) order by t.ordinal limit ${limit}`);
    const result: EmptyTarget[] = [];
    for (const row of rows) {
      const value = await this.target(id, row.ordinal);
      if (value)
        result.push(
          parent && parent.createdAt < since ? { ...value, title: "" } : value,
        );
    }
    return result;
  }
  async attempts(
    id: string,
    ordinal: number,
    before: EmptyCursor | undefined,
    since: Date,
    limit: number,
  ) {
    const rows = await this.db
      .select()
      .from(attempts)
      .where(sql`${attempts.parentId}=${id} and ${attempts.ordinal}=${ordinal} and ${attempts.createdAt}>=${since.getTime()}
      and ${before ? sql`(${attempts.createdAt}<${before.at.getTime()} or (${attempts.createdAt}=${before.at.getTime()} and ${attempts.id}<${before.id}))` : sql`1`}`)
      .orderBy(sql`${attempts.createdAt} desc,${attempts.id} desc`)
      .limit(limit);
    return rows.map(attempt);
  }
  async reconcile(limit: number) {
    await this.db.run(sql`update empty_trash_attempts set state=(select state from note_purges where id=purge_id),
      failure=(select failure from note_purges where id=purge_id),updated_at=(select updated_at from note_purges where id=purge_id),
      recoveries=max(0,(select recoveries from note_purges where id=purge_id)-recovery_base)
      where id in(select a.id ${joins} where p.id is not null and (a.state!=p.state or a.updated_at!=p.updated_at or a.recoveries!=max(0,p.recoveries-a.recovery_base)) order by a.updated_at,a.id limit ${limit})`);
  }
  async prune(before: Date, now: Date, limit: number) {
    await this.db.run(
      sql`update empty_trash_targets set title='' where (parent_id,ordinal) in(select t.parent_id,t.ordinal from empty_trash_targets t join empty_trash_batches b on b.id=t.parent_id where b.phase='accepted' and b.created_at<${before.getTime()} and t.title!='' limit ${limit})`,
    );
    await this.db.run(
      sql`delete from empty_trash_batches where id in(select id from empty_trash_batches where phase in('prepared','discarded') and expires_at<=${now.getTime()} limit ${limit})`,
    );
    await this.db.run(
      sql`delete from empty_trash_attempts where id in(select a.id from empty_trash_attempts a where a.created_at<${before.getTime()} and not exists(select 1 from empty_trash_targets t where t.latest_attempt_id=a.id) limit ${limit})`,
    );
    await this.db.run(sql`update empty_trash_targets set closed_state=coalesce(closed_state,(select coalesce(p.state,a.state) from empty_trash_attempts a left join note_purges p on p.id=a.purge_id where a.id=latest_attempt_id),'cancelled'),note_id=null,operation_id=null,title=''
      where (parent_id,ordinal) in(select t.parent_id,t.ordinal ${joins} join empty_trash_batches b on b.id=t.parent_id where b.created_at<${before.getTime()} and t.note_id is not null
      and (t.closed_state is not null or (a.created_at<${before.getTime()} and a.state in('succeeded','failed','cancelled') and (p.id is null or p.state='succeeded'))) limit ${limit})`);
    await this.db.run(
      sql`delete from empty_trash_attempts where id in(select latest_attempt_id from empty_trash_targets where note_id is null and latest_attempt_id is not null limit ${limit})`,
    );
    await this.db.run(
      sql`update empty_trash_targets set latest_attempt_id=null where note_id is null and latest_attempt_id is not null and not exists(select 1 from empty_trash_attempts a where a.id=latest_attempt_id)`,
    );
    await this.db.run(sql`delete from empty_trash_batches where id in(select b.id from empty_trash_batches b where b.phase='accepted' and b.created_at<${before.getTime()}
      and not exists(select 1 from empty_trash_targets t where t.parent_id=b.id and t.note_id is not null) limit ${limit})`);
  }
}

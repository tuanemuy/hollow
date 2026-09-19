import type {
  BatchAttempt,
  BatchHeader,
  BatchRepository,
  BatchSummary,
  MoveReceipt,
} from "@repo/core/application/batch/ports";
import {
  type BatchOutcome,
  type BatchState,
  batchState,
} from "@repo/core/domain/batch/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { and, eq, sql } from "drizzle-orm";
import {
  noteBatchAttempts as attempts,
  noteBatches as batches,
  noteBatchMoveReceipts as receipts,
  noteBatchTargets as targets,
} from "../batchSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

const encode = JSON.stringify;
const parse = <T>(value: string): T => JSON.parse(value) as T;
const changed = () =>
  new BusinessRuleError(
    "BATCH_CHANGED",
    "処理の状態が変わりました。現在の結果を確認してください。",
  );
function header(r: typeof batches.$inferSelect): BatchHeader {
  return {
    ...r,
    source: parse(r.source),
    operation: parse(r.operation),
    cancelRequested: r.cancelRequested === 1,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}
function attempt(r: typeof attempts.$inferSelect): BatchAttempt {
  const expected = r.expected
    ? parse<BatchAttempt["expected"]>(r.expected)
    : null;
  const compatible =
    expected?.kind === "move" && !Object.hasOwn(expected.move, "sharing")
      ? {
          ...expected,
          move: {
            ...expected.move,
            sharing: {
              version: 0,
              visibility: "private" as const,
              hasPassword: false,
            },
          },
        }
      : expected;
  return {
    ...r,
    state: r.state as BatchState,
    expected: compatible,
    failure: r.failure ? parse(r.failure) : null,
    result: r.result ? parse(r.result) : null,
    leaseUntil: r.leaseUntil === null ? null : new Date(r.leaseUntil),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}
function attemptRow(a: BatchAttempt): typeof attempts.$inferInsert {
  return {
    ...a,
    expected: a.expected ? encode(a.expected) : null,
    failure: a.failure ? encode(a.failure) : null,
    result: a.result ? encode(a.result) : null,
    leaseUntil: a.leaseUntil?.getTime() ?? null,
    createdAt: a.createdAt.getTime(),
    updatedAt: a.updatedAt.getTime(),
  };
}
export class LibsqlBatchRepository implements BatchRepository {
  constructor(private readonly db: HollowTransaction) {}
  async accept(h: BatchHeader, children: readonly BatchAttempt[]) {
    await this.db.insert(batches).values({
      ...h,
      source: encode(h.source),
      operation: encode(h.operation),
      sourceWorkspaceId:
        h.source.kind === "workspace" ? h.source.workspaceId : null,
      destinationWorkspaceId:
        h.operation.kind === "move" &&
        h.operation.destination.kind === "workspace"
          ? h.operation.destination.workspaceId
          : null,
      cancelRequested: h.cancelRequested ? 1 : 0,
      createdAt: h.createdAt.getTime(),
      updatedAt: h.updatedAt.getTime(),
    });
    for (const a of children) {
      await this.db.insert(attempts).values(attemptRow(a));
      await this.db.insert(targets).values({
        parentId: h.id,
        ordinal: a.ordinal,
        noteId: a.noteId,
        latestAttemptId: a.id,
      });
    }
  }
  async byRequest(actorId: string, requestId: string) {
    const r = (
      await this.db
        .select()
        .from(batches)
        .where(
          and(eq(batches.actorId, actorId), eq(batches.requestId, requestId)),
        )
    )[0];
    return r ? header(r) : null;
  }
  async find(id: string) {
    const r = (
      await this.db.select().from(batches).where(eq(batches.id, id))
    )[0];
    return r ? header(r) : null;
  }
  async attempt(id: string) {
    const r = (
      await this.db.select().from(attempts).where(eq(attempts.id, id))
    )[0];
    return r ? attempt(r) : null;
  }
  async children(id: string, after: number, limit: number) {
    const rows = await this.db
      .select({ a: attempts })
      .from(targets)
      .innerJoin(attempts, eq(attempts.id, targets.latestAttemptId))
      .where(and(eq(targets.parentId, id), sql`${targets.ordinal}>${after}`))
      .orderBy(targets.ordinal)
      .limit(limit);
    return rows.map((r) => attempt(r.a));
  }
  async claim(now: Date, token: string, until: Date) {
    const [r] = await this.db.all<{ id: string }>(
      sql`select a.id from note_batch_attempts a join note_batch_targets t on t.latest_attempt_id=a.id join note_batches b on b.id=a.parent_id where a.state='queued' and b.cancel_requested=0 and not exists(select 1 from note_batch_attempts x where x.parent_id=a.parent_id and x.state='running') order by b.created_at,b.id,a.generation,a.ordinal limit 1`,
    );
    if (!r) return null;
    const result = await this.db
      .update(attempts)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until.getTime(),
        updatedAt: now.getTime(),
      })
      .where(and(eq(attempts.id, r.id), eq(attempts.state, "queued")))
      .returning();
    return result[0] ? attempt(result[0]) : null;
  }
  async finish(id: string, token: string, outcome: BatchOutcome, now: Date) {
    const rows = await this.db
      .update(attempts)
      .set({
        state: outcome.state,
        failure: outcome.state === "failed" ? encode(outcome.failure) : null,
        result: outcome.state === "succeeded" ? encode(outcome.result) : null,
        leaseToken: null,
        leaseUntil: null,
        updatedAt: now.getTime(),
      })
      .where(
        and(
          eq(attempts.id, id),
          eq(attempts.state, "running"),
          eq(attempts.leaseToken, token),
        ),
      )
      .returning({ parentId: attempts.parentId });
    const p = rows[0]?.parentId;
    if (p)
      await this.db
        .update(batches)
        .set({ updatedAt: now.getTime() })
        .where(eq(batches.id, p));
    return !!p;
  }
  async bindTag(id: string, tagId: string) {
    const rows = await this.db
      .update(batches)
      .set({ binding: tagId })
      .where(and(eq(batches.id, id), sql`${batches.binding} is null`))
      .returning();
    if (!rows.length && (await this.find(id))?.binding !== tagId)
      throw changed();
  }
  async recordReceipt(r: MoveReceipt) {
    const updated = await this.db
      .update(batches)
      .set({ lastSequence: r.sequence })
      .where(
        and(
          eq(batches.id, r.parentId),
          eq(batches.lastSequence, r.sequence - 1),
        ),
      )
      .returning();
    if (!updated.length) throw changed();
    await this.db.insert(receipts).values({
      ...r,
      source: encode(r.source),
      destination: encode(r.destination),
      before: encode(r.before),
      after: encode(r.after),
      createdAt: r.createdAt.getTime(),
    });
  }
  async receipts(id: string, after: number) {
    return (
      await this.db
        .select()
        .from(receipts)
        .where(
          and(eq(receipts.parentId, id), sql`${receipts.sequence}>${after}`),
        )
        .orderBy(receipts.sequence)
        .limit(501)
    ).map((r) => ({
      ...r,
      source: parse<MoveReceipt["source"]>(r.source),
      destination: parse<MoveReceipt["destination"]>(r.destination),
      before: parse<MoveReceipt["before"]>(r.before),
      after: parse<MoveReceipt["after"]>(r.after),
      createdAt: new Date(r.createdAt),
    }));
  }
  async cancel(id: string, generation: number, now: Date) {
    const rows = await this.db
      .update(batches)
      .set({ cancelRequested: 1, updatedAt: now.getTime() })
      .where(and(eq(batches.id, id), eq(batches.generation, generation)))
      .returning();
    if (!rows.length) throw changed();
    await this.db
      .update(attempts)
      .set({ state: "cancelled", failure: null, updatedAt: now.getTime() })
      .where(and(eq(attempts.parentId, id), eq(attempts.state, "queued")));
  }
  async cancelNote(noteId: string, now: Date, exceptAttempt?: string) {
    await this.db.run(
      sql`update note_batch_attempts set state='cancelled',failure=null,lease_token=null,lease_until=null,updated_at=${now.getTime()} where note_id=${noteId} and state in ('queued','running') and id!=${exceptAttempt ?? ""}`,
    );
  }
  async cancelScopeActor(scopeId: string, actorId: string, now: Date) {
    await this.db.run(
      sql`update note_batch_attempts set state='cancelled',failure=null,lease_token=null,lease_until=null,updated_at=${now.getTime()} where state in ('queued','running') and parent_id in(select id from note_batches where actor_id=${actorId} and (source_workspace_id=${scopeId} or destination_workspace_id=${scopeId}))`,
    );
  }
  async retry(
    h: BatchHeader,
    children: readonly BatchAttempt[],
    now: Date,
    digest: string,
  ) {
    const rows = await this.db
      .update(batches)
      .set({
        generation: h.generation + 1,
        retryDigest: digest,
        cancelRequested: 0,
        updatedAt: now.getTime(),
      })
      .where(and(eq(batches.id, h.id), eq(batches.generation, h.generation)))
      .returning();
    if (!rows.length) throw changed();
    for (const a of children) {
      const prior = a.retryOf ? await this.attempt(a.retryOf) : null;
      if (!prior || prior.state !== "failed") throw changed();
      const target = await this.db
        .update(targets)
        .set({ latestAttemptId: a.id })
        .where(
          and(
            eq(targets.parentId, h.id),
            eq(targets.ordinal, a.ordinal),
            eq(targets.latestAttemptId, prior.id),
          ),
        )
        .returning();
      if (!target.length) throw changed();
      await this.db.insert(attempts).values(attemptRow(a));
    }
  }
  async summary(id: string): Promise<BatchSummary | null> {
    const h = await this.find(id);
    if (!h) return null;
    const rows = await this.db.all<{
      state: BatchState;
      count: number;
      updated: number;
    }>(
      sql`select a.state,count(*) count,max(a.updated_at) updated from note_batch_targets t join note_batch_attempts a on a.id=t.latest_attempt_id where t.parent_id=${id} group by a.state`,
    );
    const counts: Record<BatchState, number> = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const r of rows) counts[r.state] = r.count;
    return {
      header: {
        ...h,
        updatedAt: new Date(
          Math.max(h.updatedAt.getTime(), ...rows.map((r) => r.updated)),
        ),
      },
      state: batchState(counts),
      counts,
    };
  }
  async page(
    actorId: string,
    scope: "unfinished" | "completed",
    before: { at: Date; id: string } | undefined,
    since: Date,
  ) {
    const unfinished = sql`exists(select 1 from note_batch_targets t join note_batch_attempts a on a.id=t.latest_attempt_id where t.parent_id=b.id and a.state in ('queued','running','failed'))`;
    const rows = await this.db.all<{ id: string }>(
      sql`select b.id from note_batches b where b.actor_id=${actorId} and ${scope === "unfinished" ? unfinished : sql`not (${unfinished})`} and (b.created_at>=${since.getTime()} or exists(select 1 from note_batch_targets t join note_batch_attempts a on a.id=t.latest_attempt_id where t.parent_id=b.id and (a.state in ('queued','running') or a.created_at>=${since.getTime()}))) ${before ? sql`and (b.created_at<${before.at.getTime()} or (b.created_at=${before.at.getTime()} and b.id<${before.id}))` : sql``} order by b.created_at desc,b.id desc limit 51`,
    );
    const result: BatchSummary[] = [];
    for (const r of rows) {
      const s = await this.summary(r.id);
      if (s) result.push(s);
    }
    return result;
  }
  async activity(actorId: string, since: Date) {
    const [r] = await this.db.all<{ active: number; failed: number }>(
      sql`select count(distinct case when a.state in ('queued','running') then b.id end) active,count(distinct case when a.state='failed' and a.created_at>=${since.getTime()} then b.id end) failed from note_batches b join note_batch_targets t on t.parent_id=b.id join note_batch_attempts a on a.id=t.latest_attempt_id where b.actor_id=${actorId}`,
    );
    return r ?? { active: 0, failed: 0 };
  }
  async recover(now: Date) {
    await this.db.run(
      sql`update note_batch_attempts set state='failed',failure=${encode({ code: "BATCH_INTERRUPTED", message: "処理が中断しました。現在の影響を確認して再試行してください。" })},lease_token=null,lease_until=null,updated_at=${now.getTime()} where id in(select id from note_batch_attempts where state='running' and lease_until<=${now.getTime()} order by lease_until,id limit 20)`,
    );
  }
  async prune(before: Date, limit: number) {
    await this.db.run(
      sql`update note_batch_attempts set title='' where id in(select id from note_batch_attempts where created_at<${before.getTime()} and title!='' limit ${limit})`,
    );
    const [parent] = await this.db.all<{ id: string; pruned_through: number }>(
      sql`select b.id,b.pruned_through from note_batches b where exists(select 1 from note_batch_move_receipts r where r.parent_id=b.id and r.created_at<${before.getTime()}) and not exists(select 1 from note_batch_targets t join note_batch_attempts a on a.id=t.latest_attempt_id where t.parent_id=b.id and a.state in ('queued','running')) order by b.created_at,b.id limit 1`,
    );
    if (parent) {
      const prefix = await this.db
        .select()
        .from(receipts)
        .where(eq(receipts.parentId, parent.id))
        .orderBy(receipts.sequence)
        .limit(limit);
      let through = parent.pruned_through;
      for (const r of prefix) {
        if (r.sequence !== through + 1 || r.createdAt >= before.getTime())
          break;
        through = r.sequence;
      }
      if (through > parent.pruned_through) {
        await this.db
          .delete(receipts)
          .where(
            and(
              eq(receipts.parentId, parent.id),
              sql`${receipts.sequence}<=${through}`,
            ),
          );
        await this.db
          .update(batches)
          .set({ prunedThrough: through })
          .where(
            and(
              eq(batches.id, parent.id),
              eq(batches.prunedThrough, parent.pruned_through),
            ),
          );
      }
    }
    await this.db.run(
      sql`delete from note_batch_attempts where id in(select a.id from note_batch_attempts a where a.created_at<${before.getTime()} and a.state in ('succeeded','failed','cancelled') and not exists(select 1 from note_batch_targets t where t.latest_attempt_id=a.id) and not exists(select 1 from note_batch_move_receipts r where r.attempt_id=a.id) limit ${limit})`,
    );
    await this.db.run(
      sql`delete from note_batches where id in(select b.id from note_batches b where b.created_at<${before.getTime()} and not exists(select 1 from note_batch_targets t join note_batch_attempts a on a.id=t.latest_attempt_id where t.parent_id=b.id and (a.state in ('queued','running') or a.created_at>=${before.getTime()})) and not exists(select 1 from note_batch_attempts a where a.parent_id=b.id and not exists(select 1 from note_batch_targets t where t.latest_attempt_id=a.id)) limit ${limit})`,
    );
  }
}

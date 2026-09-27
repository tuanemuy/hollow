import type {
  ZipAccept,
  ZipHistoryKey,
  ZipRequestRepository,
  ZipRetryAccept,
} from "@repo/core/application/zip/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { ZipRun, ZipRunKey } from "@repo/core/domain/zip/entity";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  zipAttempts,
  zipRequests,
  zipRuns,
  zipSpoolRefs,
  zipTargets,
} from "../zipSchema";
import {
  attemptRow,
  currentZipRead,
  requestRow,
  requestValues,
  runRow,
  runValues,
  runWhere,
  zipUnavailable,
} from "./zipHelpers";

const receipt = (run: ZipRun) => ({
  requestId: run.requestId,
  generation: run.generation,
  commandId: run.commandId,
  acceptedAt: run.acceptedAt,
});
export class LibsqlZipRequestRepository implements ZipRequestRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(zipRequests)
      .where(eq(zipRequests.id, id));
    return row ? requestRow(row) : null;
  }
  async findRun(key: ZipRunKey) {
    const [row] = await this.db.select().from(zipRuns).where(runWhere(key));
    return row ? runRow(row) : null;
  }
  async findCommand(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(zipRuns)
      .where(
        and(eq(zipRuns.accountId, accountId), eq(zipRuns.commandId, commandId)),
      );
    return row ? runRow(row) : null;
  }
  async targets(requestId: string) {
    return this.db
      .select()
      .from(zipTargets)
      .where(eq(zipTargets.requestId, requestId))
      .orderBy(asc(zipTargets.ordinal));
  }
  async attempts(key: ZipRunKey) {
    return (
      await this.db
        .select()
        .from(zipAttempts)
        .where(
          and(
            eq(zipAttempts.requestId, key.requestId),
            eq(zipAttempts.generation, key.generation),
          ),
        )
        .orderBy(asc(zipAttempts.ordinal))
    ).map(attemptRow);
  }
  async attemptsByIds(ids: readonly string[]) {
    if (ids.length > 500) throw zipUnavailable();
    if (!ids.length) return [];
    return (
      await this.db
        .select()
        .from(zipAttempts)
        .where(inArray(zipAttempts.id, [...new Set(ids)]))
    ).map(attemptRow);
  }
  async latestAttempts(requestId: string) {
    return (
      await this.db
        .select({ attempt: zipAttempts })
        .from(zipAttempts)
        .innerJoin(
          zipTargets,
          and(
            eq(zipTargets.requestId, zipAttempts.requestId),
            eq(zipTargets.ordinal, zipAttempts.ordinal),
            eq(zipTargets.latestAttemptNumber, zipAttempts.attemptNumber),
          ),
        )
        .where(eq(zipAttempts.requestId, requestId))
        .orderBy(asc(zipAttempts.ordinal))
    ).map(({ attempt }) => attemptRow(attempt));
  }
  private async idle(accountId: string) {
    const [busy] = await this.db
      .select({ accountId: zipRequests.accountId })
      .from(zipRequests)
      .where(sql`${zipRequests.state}!='terminal'`)
      .limit(1);
    if (busy)
      throw new BusinessRuleError(
        busy.accountId === accountId ? "ZIP_ACTIVE" : "ZIP_BUSY",
        busy.accountId === accountId
          ? "進行中のZIPが完了してからやり直してください。"
          : "ZIP生成を使用中です。後でもう一度お試しください。",
      );
  }
  async accept(input: ZipAccept, _now: Date) {
    const previous = await this.findCommand(
      input.request.accountId,
      input.run.commandId,
    );
    if (previous) {
      if (previous.inputDigest !== input.run.inputDigest)
        throw new BusinessRuleError(
          "ZIP_COMMAND_CONFLICT",
          "同じ操作IDの内容が一致しません。",
        );
      return receipt(previous);
    }
    await this.idle(input.request.accountId);
    await this.db.insert(zipRequests).values(requestValues(input.request));
    await this.db.insert(zipRuns).values(runValues(input.run));
    if (input.targets.length)
      await this.db.insert(zipTargets).values([...input.targets]);
    if (input.attempts.length)
      await this.db.insert(zipAttempts).values([...input.attempts]);
    if (input.reused.length)
      await this.db.insert(zipSpoolRefs).values([...input.reused]);
    return receipt(input.run);
  }
  async acceptRetry(input: ZipRetryAccept, now: Date) {
    const previous = await this.findCommand(
      input.accountId,
      input.run.commandId,
    );
    if (previous) {
      if (previous.inputDigest !== input.run.inputDigest)
        throw new BusinessRuleError(
          "ZIP_COMMAND_CONFLICT",
          "同じ操作IDの内容が一致しません。",
        );
      return receipt(previous);
    }
    await this.idle(input.accountId);
    const parent = await this.find(input.requestId);
    if (
      !parent ||
      parent.accountId !== input.accountId ||
      parent.state !== "terminal" ||
      parent.version !== input.expectedVersion ||
      parent.generation !== input.expectedGeneration ||
      parent.generation + 1 !== input.run.generation
    )
      throw zipUnavailable();
    const oldRun = await this.findRun({
      requestId: parent.id,
      generation: parent.generation,
    });
    if (
      !oldRun ||
      oldRun.historyExpiresAt <= now ||
      oldRun.state === "cancelled" ||
      oldRun.state === "succeeded"
    )
      throw zipUnavailable();
    if (oldRun.publishedAt !== null) {
      const [artifact] = await this.db.all<{ id: string }>(
        sql`select id from zip_artifacts where id=${oldRun.artifactId} and state='ready' and expires_at>${now.getTime()}`,
      );
      if (!artifact) throw zipUnavailable();
    }
    const latest = await this.latestAttempts(parent.id);
    if (
      !input.attempts.length ||
      input.attempts.some(
        (attempt) =>
          !latest.some(
            (old) =>
              old.ordinal === attempt.ordinal &&
              old.state === "failed" &&
              old.attemptNumber + 1 === attempt.attemptNumber &&
              old.historyExpiresAt > now,
          ),
      )
    )
      throw zipUnavailable();
    await this.db
      .update(zipRequests)
      .set({
        state: "active",
        generation: input.run.generation,
        updatedAt: now,
        version: parent.version + 1,
      })
      .where(
        and(
          eq(zipRequests.id, parent.id),
          eq(zipRequests.version, parent.version),
        ),
      );
    await this.db.insert(zipRuns).values(runValues(input.run));
    for (const attempt of input.attempts) {
      await this.db
        .update(zipTargets)
        .set({ latestAttemptNumber: attempt.attemptNumber })
        .where(
          and(
            eq(zipTargets.requestId, parent.id),
            eq(zipTargets.ordinal, attempt.ordinal),
          ),
        );
      await this.db.insert(zipAttempts).values(attempt);
    }
    if (input.reused.length)
      await this.db.insert(zipSpoolRefs).values([...input.reused]);
    return receipt(input.run);
  }
  async acceptAssemblyRetry(input: ZipAccept, origin: ZipRunKey, now: Date) {
    const oldRun = await this.findRun(origin);
    if (
      !oldRun ||
      oldRun.accountId !== input.request.accountId ||
      oldRun.historyExpiresAt <= now ||
      oldRun.state !== "failed" ||
      !oldRun.failure ||
      oldRun.publishedAt !== null
    )
      throw zipUnavailable();
    const [open] = await this.db.all<{ id: string }>(
      sql`select id from zip_assemblies where request_id=${origin.requestId} and generation=${origin.generation} and state!='closed' limit 1`,
    );
    if (open) throw zipUnavailable();
    return this.accept(input, now);
  }
  async list(accountId: string, before: ZipHistoryKey | null, now: Date) {
    return (
      await this.db
        .select({ request: zipRequests, run: zipRuns })
        .from(zipRuns)
        .innerJoin(zipRequests, eq(zipRequests.id, zipRuns.requestId))
        .where(
          and(
            eq(zipRuns.accountId, accountId),
            gt(zipRuns.historyExpiresAt, now),
            before
              ? sql`(${zipRuns.acceptedAt},${zipRuns.requestId},${zipRuns.generation})<(${before.acceptedAt.getTime()},${before.requestId},${before.generation})`
              : undefined,
          ),
        )
        .orderBy(
          desc(zipRuns.acceptedAt),
          desc(zipRuns.requestId),
          desc(zipRuns.generation),
        )
        .limit(50)
    ).map(({ request, run }) => ({
      request: requestRow(request),
      run: runRow(run),
    }));
  }
  async summary(accountId: string, _now: Date) {
    const [row] = await this.db
      .select({ id: zipRequests.id })
      .from(zipRequests)
      .where(
        and(
          eq(zipRequests.accountId, accountId),
          sql`${zipRequests.state}!='terminal'`,
        ),
      )
      .limit(1);
    return {
      activeCount: row ? 1 : 0,
      representative: row ? { id: row.id, title: "ノート一括ZIP" } : null,
    };
  }
  async activePage(accountId: string, after: string | null) {
    return this.db
      .select({ id: zipRequests.id, version: zipRequests.version })
      .from(zipRequests)
      .where(
        and(
          eq(zipRequests.accountId, accountId),
          sql`${zipRequests.state}!='terminal'`,
          after ? gt(zipRequests.id, after) : undefined,
        ),
      )
      .orderBy(asc(zipRequests.id))
      .limit(50);
  }
  async watched(accountId: string, ids: readonly string[], now: Date) {
    if (!ids.length) return [];
    if (ids.length > 50) throw zipUnavailable();
    return (
      await this.db
        .select({ request: zipRequests, run: zipRuns })
        .from(zipRequests)
        .innerJoin(
          zipRuns,
          and(
            eq(zipRuns.requestId, zipRequests.id),
            eq(zipRuns.generation, zipRequests.generation),
          ),
        )
        .where(
          and(
            eq(zipRequests.accountId, accountId),
            inArray(zipRequests.id, [...ids]),
            gt(zipRuns.historyExpiresAt, now),
          ),
        )
    ).map(({ request, run }) => ({
      request: requestRow(request),
      run: runRow(run),
    }));
  }
  async cancel(id: string, accountId: string, now: Date) {
    const parent = await this.find(id);
    if (
      !parent ||
      parent.accountId !== accountId ||
      parent.state === "terminal"
    )
      return false;
    await this.db
      .update(zipRequests)
      .set({
        state: "stopping",
        cancelGeneration: parent.generation,
        updatedAt: now,
        version: parent.version + 1,
      })
      .where(eq(zipRequests.id, id));
    await this.db
      .update(zipRuns)
      .set({
        state: "stopping",
        failure: null,
        version: sql`${zipRuns.version}+1`,
      })
      .where(runWhere({ requestId: id, generation: parent.generation }));
    await this.db
      .update(zipAttempts)
      .set({ state: "cancelled", version: sql`${zipAttempts.version}+1` })
      .where(
        and(
          eq(zipAttempts.requestId, id),
          eq(zipAttempts.generation, parent.generation),
          eq(zipAttempts.state, "queued"),
        ),
      );
    return true;
  }
  async cancelWorkspaceMember(
    workspaceId: string,
    accountId: string,
    cause: "role-downgrade" | "membership-ended",
    now: Date,
  ) {
    const notes = await this.db.all<{ id: string }>(
      sql`select distinct t.live_note_id id from zip_targets t join zip_requests q on q.id=t.request_id join notes n on n.id=t.live_note_id where q.account_id=${accountId} and n.owner_workspace_id=${workspaceId} and q.state!='terminal' limit 500`,
    );
    for (const note of notes)
      await this.invalidateForAccount(
        note.id,
        accountId,
        now,
        "ZIP_CANCELLED",
        cause === "membership-ended",
      );
    if (cause === "membership-ended") {
      await this.db.run(
        sql`update zip_artifacts set state='cleanup',next_cleanup_at=${now.getTime()} where state='ready' and exists(select 1 from zip_artifact_entries e join notes n on n.id=e.live_note_id join zip_assemblies s on s.id=zip_artifacts.assembly_id join zip_requests q on q.id=s.request_id where e.artifact_id=zip_artifacts.id and n.owner_workspace_id=${workspaceId} and q.account_id=${accountId})`,
      );
      await this.closeRetiredDeliveries();
    }
  }
  async invalidateNote(
    noteId: string,
    now: Date,
    reason: "ZIP_CANCELLED" | "ZIP_CONTENT_CHANGED" = "ZIP_CANCELLED",
  ) {
    await this.invalidateForAccount(noteId, null, now, reason, true);
  }
  private async invalidateForAccount(
    noteId: string,
    accountId: string | null,
    now: Date,
    reason: "ZIP_CANCELLED" | "ZIP_CONTENT_CHANGED",
    retire: boolean,
  ) {
    const targets = await this.db
      .select({ target: zipTargets, run: zipRuns })
      .from(zipTargets)
      .innerJoin(zipRequests, eq(zipRequests.id, zipTargets.requestId))
      .innerJoin(
        zipRuns,
        and(
          eq(zipRuns.requestId, zipRequests.id),
          eq(zipRuns.generation, zipRequests.generation),
        ),
      )
      .where(
        and(
          eq(zipTargets.liveNoteId, noteId),
          sql`${zipRequests.state}!='terminal'`,
          accountId ? eq(zipRequests.accountId, accountId) : undefined,
        ),
      );
    for (const { target, run } of targets) {
      if (!run.exclusions.some((entry) => entry.ordinal === target.ordinal))
        await this.db
          .update(zipRuns)
          .set({
            exclusions: [
              ...run.exclusions,
              { ordinal: target.ordinal, reason },
            ],
            version: run.version + 1,
          })
          .where(runWhere(run));
      await this.db
        .update(zipAttempts)
        .set({
          state: reason === "ZIP_CANCELLED" ? "cancelled" : "excluded",
          failure: reason === "ZIP_CANCELLED" ? null : reason,
          version: sql`${zipAttempts.version}+1`,
        })
        .where(
          and(
            eq(zipAttempts.requestId, run.requestId),
            eq(zipAttempts.generation, run.generation),
            eq(zipAttempts.ordinal, target.ordinal),
            eq(zipAttempts.state, "queued"),
          ),
        );
    }
    if (!retire) return;
    await this.db.run(
      sql`update zip_artifacts set state='cleanup',next_cleanup_at=${now.getTime()} where state='ready' and exists(select 1 from zip_artifact_entries e join zip_assemblies s on s.id=zip_artifacts.assembly_id join zip_requests q on q.id=s.request_id where e.artifact_id=zip_artifacts.id and e.live_note_id=${noteId} and (${accountId} is null or q.account_id=${accountId}))`,
    );
    await this.closeRetiredDeliveries();
  }
  private async closeRetiredDeliveries() {
    await this.db.run(
      sql`update zip_deliveries set state=case when state='ready' then 'closed' else 'closing' end where state in('ready','sending') and exists(select 1 from zip_artifacts a where a.id=zip_deliveries.artifact_id and a.state='cleanup')`,
    );
  }
  async prune(now: Date) {
    const ms = now.getTime();
    await this.db.run(
      sql`update zip_attempts set title='' where id in(select id from zip_attempts where history_expires_at<=${ms} and title!='' order by history_expires_at,id limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_deliveries where id in(select id from zip_deliveries where state='closed' and expires_at<=${ms} order by expires_at,id limit 100)`,
    );
    await this.db.run(sql`delete from zip_spool_refs where (request_id,generation,ordinal) in(select f.request_id,f.generation,f.ordinal from zip_spool_refs f join zip_runs r on r.request_id=f.request_id and r.generation=f.generation join zip_targets t on t.request_id=f.request_id and t.ordinal=f.ordinal where f.purpose='retry' and r.state in('succeeded','partial','failed','cancelled') and (
      (f.retry_until<=${ms} and not exists(select 1 from zip_artifacts a where a.id=r.artifact_id and a.state!='removed')) or
      not ${currentZipRead(sql`t.live_note_id`, sql`r.account_id`)} or
      exists(select 1 from zip_artifacts a where a.id=r.artifact_id and a.state!='ready')
    ) order by f.retry_until,f.request_id,f.generation,f.ordinal limit 100)`);
    await this.db.run(
      sql`delete from zip_attempts where id in(select p.id from zip_attempts p join zip_runs r on r.request_id=p.request_id and r.generation=p.generation where p.history_expires_at<=${ms} and r.history_expires_at<=${ms} and r.state in('succeeded','partial','failed','cancelled') and p.pdf_compute_id is null and not exists(select 1 from zip_pdf_holds h where h.attempt_id=p.id) and not exists(select 1 from zip_spool_refs f where f.request_id=r.request_id and f.generation=r.generation) and not exists(select 1 from zip_spools s where s.attempt_id=p.id and (s.state!='removed' or exists(select 1 from zip_spool_refs f where f.spool_id=s.id))) and not exists(select 1 from zip_artifacts a where a.id=r.artifact_id and (a.state!='removed' or exists(select 1 from zip_deliveries d where d.artifact_id=a.id))) and not exists(select 1 from zip_assemblies s where s.request_id=r.request_id and s.generation=r.generation and (s.state!='closed' or s.storage_key is not null)) order by p.history_expires_at,p.id limit 100)`,
    );
    await this.db.run(
      sql`update zip_runs set artifact_id=null where (request_id,generation) in(select r.request_id,r.generation from zip_runs r join zip_artifacts a on a.id=r.artifact_id where r.history_expires_at<=${ms} and a.state='removed' and not exists(select 1 from zip_deliveries d where d.artifact_id=a.id) and not exists(select 1 from zip_attempts p where p.request_id=r.request_id and p.generation=r.generation) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_artifact_entries where (artifact_id,ordinal) in(select e.artifact_id,e.ordinal from zip_artifact_entries e join zip_artifacts a on a.id=e.artifact_id where a.state='removed' and not exists(select 1 from zip_runs r where r.artifact_id=a.id) and not exists(select 1 from zip_deliveries d where d.artifact_id=a.id) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_artifacts where id in(select a.id from zip_artifacts a where a.state='removed' and not exists(select 1 from zip_artifact_entries e where e.artifact_id=a.id) and not exists(select 1 from zip_runs r where r.artifact_id=a.id) and not exists(select 1 from zip_deliveries d where d.artifact_id=a.id) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_assemblies where id in(select s.id from zip_assemblies s join zip_runs r on r.request_id=s.request_id and r.generation=s.generation where s.state='closed' and s.storage_key is null and r.history_expires_at<=${ms} and not exists(select 1 from zip_artifacts a where a.assembly_id=s.id) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_runs where (request_id,generation) in(select r.request_id,r.generation from zip_runs r where r.history_expires_at<=${ms} and r.state in('succeeded','partial','failed','cancelled') and r.artifact_id is null and not exists(select 1 from zip_attempts p where p.request_id=r.request_id and p.generation=r.generation) and not exists(select 1 from zip_spool_refs f where f.request_id=r.request_id and f.generation=r.generation) and not exists(select 1 from zip_assemblies s where s.request_id=r.request_id and s.generation=r.generation) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_targets where (request_id,ordinal) in(select t.request_id,t.ordinal from zip_targets t join zip_requests q on q.id=t.request_id where q.state='terminal' and q.history_expires_at<=${ms} and not exists(select 1 from zip_runs r where r.request_id=q.id) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_requests where id in(select q.id from zip_requests q where q.state='terminal' and q.history_expires_at<=${ms} and not exists(select 1 from zip_runs r where r.request_id=q.id) and not exists(select 1 from zip_targets t where t.request_id=q.id) limit 100)`,
    );
    await this.db.run(
      sql`delete from zip_spools where id in(select s.id from zip_spools s where s.state='removed' and not exists(select 1 from zip_spool_refs f where f.spool_id=s.id) limit 100)`,
    );
  }
}

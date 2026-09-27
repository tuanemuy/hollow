import type { ZipWorkRepository } from "@repo/core/application/zip/ports";
import type {
  ZipAssembly,
  ZipAttempt,
  ZipExclusionReason,
  ZipFile,
  ZipLease,
  ZipRunKey,
} from "@repo/core/domain/zip/entity";
import { and, asc, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  zipAssemblies,
  zipAttempts,
  zipRequests,
  zipRuns,
  zipSpoolRefs,
} from "../zipSchema";
import {
  assemblyRow,
  attemptRow,
  cleanupValues,
  deleteReceipt,
  liveRun,
  ownerAbsent,
  requestRow,
  reserveZipBytes,
  runResults,
  runRow,
  runWhere,
  zipReservedSql,
} from "./zipHelpers";

export class LibsqlZipWorkRepository implements ZipWorkRepository {
  constructor(private readonly db: HollowTransaction) {}
  async active() {
    const [row] = await this.db
      .select({ request: zipRequests, run: zipRuns })
      .from(zipRequests)
      .innerJoin(
        zipRuns,
        and(
          eq(zipRuns.requestId, zipRequests.id),
          eq(zipRuns.generation, zipRequests.generation),
        ),
      )
      .where(sql`${zipRequests.state}!='terminal'`)
      .limit(1);
    return row
      ? { request: requestRow(row.request), run: runRow(row.run) }
      : null;
  }
  async claim(now: Date, lease: ZipLease) {
    const [row] = await this.db
      .select({ request: zipRequests, run: zipRuns })
      .from(zipRuns)
      .innerJoin(
        zipRequests,
        and(
          eq(zipRequests.id, zipRuns.requestId),
          eq(zipRequests.generation, zipRuns.generation),
        ),
      )
      .where(
        and(
          eq(zipRuns.state, "queued"),
          eq(zipRequests.state, "active"),
          sql`${zipRuns.deadlineAt}>${now.getTime()} and ${zipRequests.cancelGeneration}<${zipRuns.generation}`,
        ),
      )
      .orderBy(asc(zipRuns.acceptedAt))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(zipRuns)
      .set({
        state: "running",
        leaseToken: lease.token,
        runtimeId: lease.runtimeId,
        leaseUntil: lease.until,
        version: row.run.version + 1,
      })
      .where(and(runWhere(row.run), eq(zipRuns.state, "queued")))
      .returning();
    return claimed
      ? { request: requestRow(row.request), run: runRow(claimed), lease }
      : null;
  }
  async renew(key: ZipRunKey, token: string, now: Date, until: Date) {
    if (!(await liveRun(this.db, key, token, now))) return false;
    return (
      (
        await this.db
          .update(zipRuns)
          .set({ leaseUntil: until })
          .where(and(runWhere(key), eq(zipRuns.leaseToken, token)))
          .returning({ id: zipRuns.requestId })
      ).length === 1
    );
  }
  async nextAttempt(key: ZipRunKey, token: string, now: Date) {
    const run = await liveRun(this.db, key, token, now);
    if (!run || run.state !== "running") return null;
    const [row] = await this.db
      .select()
      .from(zipAttempts)
      .where(
        and(
          eq(zipAttempts.requestId, key.requestId),
          eq(zipAttempts.generation, key.generation),
          eq(zipAttempts.state, "queued"),
        ),
      )
      .orderBy(asc(zipAttempts.ordinal))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(zipAttempts)
      .set({ state: "running", version: row.version + 1 })
      .where(and(eq(zipAttempts.id, row.id), eq(zipAttempts.state, "queued")))
      .returning();
    return claimed ? attemptRow(claimed) : null;
  }
  async finishAttempt(
    id: string,
    token: string,
    outcome: Extract<
      ZipAttempt,
      { state: "failed" | "excluded" | "cancelled" }
    >,
    now: Date,
  ) {
    const [row] = await this.db
      .select()
      .from(zipAttempts)
      .where(eq(zipAttempts.id, id));
    if (
      !row ||
      row.state !== "running" ||
      !(await liveRun(this.db, row, token, now))
    )
      return false;
    const [active] = await this.db.all<{ id: string }>(
      sql`select s.id from zip_spools s join object_writes w on w.kind='zip-spool' and w.owner_id=s.id and w.active=1 where s.attempt_id=${id} limit 1`,
    );
    if (active) return false;
    return (
      (
        await this.db
          .update(zipAttempts)
          .set({
            state: outcome.state,
            result: null,
            failure: outcome.failure,
            version: row.version + 1,
          })
          .where(and(eq(zipAttempts.id, id), eq(zipAttempts.state, "running")))
          .returning({ id: zipAttempts.id })
      ).length === 1
    );
  }
  async beginAssembly(
    assembly: ZipAssembly,
    token: string,
    diskLimit: number,
    now: Date,
  ) {
    const run = await liveRun(this.db, assembly, token, now);
    if (!run) return false;
    const [pending] = await this.db
      .select({ id: zipAttempts.id })
      .from(zipAttempts)
      .where(
        and(
          eq(zipAttempts.requestId, run.requestId),
          eq(zipAttempts.generation, run.generation),
          sql`${zipAttempts.state} in('queued','running')`,
        ),
      )
      .limit(1);
    if (
      pending ||
      assembly.ordinals.some((ordinal) =>
        run.exclusions.some((entry) => entry.ordinal === ordinal),
      )
    )
      return false;
    await reserveZipBytes(this.db, assembly.reservedBytes, diskLimit);
    const { cleanup, ...values } = assembly;
    await this.db
      .insert(zipAssemblies)
      .values({ ...values, ...cleanupValues(cleanup) });
    await this.db
      .update(zipRuns)
      .set({ state: "assembling", version: run.version + 1 })
      .where(runWhere(run));
    await this.db
      .update(zipRequests)
      .set({
        state: "assembling",
        updatedAt: now,
        version: sql`${zipRequests.version}+1`,
      })
      .where(eq(zipRequests.id, run.requestId));
    return true;
  }
  async assembly(id: string) {
    const [row] = await this.db
      .select()
      .from(zipAssemblies)
      .where(eq(zipAssemblies.id, id));
    return row ? assemblyRow(row) : null;
  }
  async exclude(
    key: ZipRunKey,
    token: string,
    ordinals: readonly number[],
    reason: ZipExclusionReason,
    now: Date,
  ) {
    const run = await liveRun(this.db, key, token, now);
    if (!run) return false;
    const added = [...new Set(ordinals)].filter(
      (ordinal) => !run.exclusions.some((entry) => entry.ordinal === ordinal),
    );
    if (added.length)
      await this.db
        .update(zipRuns)
        .set({
          exclusions: [
            ...run.exclusions,
            ...added.map((ordinal) => ({ ordinal, reason })),
          ],
          version: run.version + 1,
        })
        .where(runWhere(key));
    for (const ordinal of new Set(ordinals))
      await this.db
        .delete(zipSpoolRefs)
        .where(
          and(
            eq(zipSpoolRefs.requestId, key.requestId),
            eq(zipSpoolRefs.generation, key.generation),
            eq(zipSpoolRefs.ordinal, ordinal),
          ),
        );
    if (added.length)
      await this.db
        .update(zipAssemblies)
        .set({ outcome: "excluded", nextCleanupAt: now })
        .where(
          and(
            eq(zipAssemblies.requestId, key.requestId),
            eq(zipAssemblies.generation, key.generation),
            eq(zipAssemblies.state, "closed"),
            eq(zipAssemblies.outcome, "success"),
          ),
        );
    return true;
  }
  async closeAssembly(
    id: string,
    token: string,
    outcome: "success" | "failure" | "excluded" | "cancelled",
    file: ZipFile | null,
    now: Date,
  ) {
    const assembly = await this.assembly(id);
    if (!assembly || assembly.state === "closed") return false;
    const [run] = await this.db
      .select()
      .from(zipRuns)
      .where(and(runWhere(assembly), eq(zipRuns.leaseToken, token)));
    if (!run) return false;
    return (
      (
        await this.db
          .update(zipAssemblies)
          .set({ state: "closed", outcome, file, nextCleanupAt: now })
          .where(and(eq(zipAssemblies.id, id), ownerAbsent("zip-assembly", id)))
          .returning({ id: zipAssemblies.id })
      ).length === 1
    );
  }
  async fail(key: ZipRunKey, token: string | null, reason: string, now: Date) {
    const changed = await this.db
      .update(zipRuns)
      .set({
        state: "stopping",
        failure: reason,
        version: sql`${zipRuns.version}+1`,
      })
      .where(
        and(
          runWhere(key),
          token
            ? eq(zipRuns.leaseToken, token)
            : sql`${zipRuns.leaseToken} is null`,
          sql`${zipRuns.state} in('queued','running','assembling','stopping')`,
        ),
      )
      .returning();
    if (!changed.length) return;
    await this.db
      .update(zipRequests)
      .set({
        state: "stopping",
        updatedAt: now,
        version: sql`${zipRequests.version}+1`,
      })
      .where(eq(zipRequests.id, key.requestId));
    await this.db
      .update(zipAttempts)
      .set({ state: "cancelled", version: sql`${zipAttempts.version}+1` })
      .where(
        and(
          eq(zipAttempts.requestId, key.requestId),
          eq(zipAttempts.generation, key.generation),
          eq(zipAttempts.state, "queued"),
        ),
      );
  }
  async finishClosed(key: ZipRunKey, token: string | null, now: Date) {
    const [run] = await this.db
      .select()
      .from(zipRuns)
      .where(
        and(
          runWhere(key),
          eq(zipRuns.state, "stopping"),
          token
            ? eq(zipRuns.leaseToken, token)
            : sql`${zipRuns.leaseToken} is null`,
        ),
      );
    if (!run) return false;
    const [busy] = await this.db.all<{ id: string }>(
      sql`select s.id from zip_assemblies s where s.request_id=${key.requestId} and s.generation=${key.generation} and (s.state!='closed' or exists(select 1 from object_writes w where w.kind='zip-assembly' and w.owner_id=s.id and w.active=1)) union all select s.id from zip_spools s join zip_attempts p on p.id=s.attempt_id where p.request_id=${key.requestId} and p.generation=${key.generation} and exists(select 1 from object_writes w where w.kind='zip-spool' and w.owner_id=s.id and w.active=1) limit 1`,
    );
    if (busy) return false;
    await this.db
      .update(zipAttempts)
      .set({
        state: run.failure ? "failed" : "cancelled",
        failure: run.failure,
        version: sql`${zipAttempts.version}+1`,
      })
      .where(
        and(
          eq(zipAttempts.requestId, key.requestId),
          eq(zipAttempts.generation, key.generation),
          eq(zipAttempts.state, "running"),
        ),
      );
    const results = await runResults(this.db, runRow(run));
    if (run.failure)
      await this.db
        .update(zipSpoolRefs)
        .set({ purpose: "retry", retryUntil: run.historyExpiresAt })
        .where(
          and(
            eq(zipSpoolRefs.requestId, key.requestId),
            eq(zipSpoolRefs.generation, key.generation),
          ),
        );
    else
      await this.db
        .delete(zipSpoolRefs)
        .where(
          and(
            eq(zipSpoolRefs.requestId, key.requestId),
            eq(zipSpoolRefs.generation, key.generation),
          ),
        );
    await this.db
      .update(zipRuns)
      .set({
        state: run.failure ? "failed" : "cancelled",
        finishedAt: now,
        results,
        leaseToken: null,
        runtimeId: null,
        leaseUntil: null,
        version: run.version + 1,
      })
      .where(runWhere(key));
    await this.db
      .update(zipRequests)
      .set({
        state: "terminal",
        updatedAt: now,
        version: sql`${zipRequests.version}+1`,
      })
      .where(eq(zipRequests.id, key.requestId));
    return true;
  }
  async recover(now: Date) {
    const rows = await this.db
      .select()
      .from(zipRuns)
      .where(
        sql`${zipRuns.state} in('queued','running','assembling','stopping')`,
      )
      .limit(20);
    for (const run of rows) {
      if (run.state !== "stopping")
        await this.fail(run, run.leaseToken, "ZIP_INTERRUPTED", now);
      await this.db
        .update(zipAssemblies)
        .set({ state: "closed", outcome: "failure", nextCleanupAt: now })
        .where(
          and(
            eq(zipAssemblies.requestId, run.requestId),
            eq(zipAssemblies.generation, run.generation),
            sql`${zipAssemblies.state}!='closed'`,
            sql`not exists(select 1 from object_writes w where w.kind='zip-assembly' and w.owner_id=${zipAssemblies.id} and w.active=1)`,
          ),
        );
      await this.finishClosed(run, run.leaseToken, now);
    }
  }
  async claimAssemblyCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(zipAssemblies)
      .where(
        and(
          eq(zipAssemblies.state, "closed"),
          sql`${zipAssemblies.key} is not null and ${zipAssemblies.nextCleanupAt}<=${now.getTime()} and (${zipAssemblies.cleanupUntil} is null or ${zipAssemblies.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from zip_artifacts a where a.assembly_id=${zipAssemblies.id} and a.state!='removed')`,
          sql`(${zipAssemblies.outcome}!='success' or not exists(select 1 from zip_runs r where r.request_id=${zipAssemblies.requestId} and r.generation=${zipAssemblies.generation} and r.state in('queued','running','assembling','stopping')))`,
        ),
      )
      .orderBy(asc(zipAssemblies.nextCleanupAt), asc(zipAssemblies.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(zipAssemblies)
      .set({ cleanupToken: token, cleanupUntil: until })
      .where(eq(zipAssemblies.id, row.id))
      .returning();
    return claimed ? assemblyRow(claimed) : null;
  }
  async assemblyCleaned(id: string, token: string, deleteToken: string) {
    const row = await this.assembly(id);
    if (!row?.key) return false;
    return (
      (
        await this.db
          .update(zipAssemblies)
          .set({
            key: null,
            file: null,
            reservedBytes: 0,
            cleanupToken: null,
            cleanupUntil: null,
          })
          .where(
            and(
              eq(zipAssemblies.id, id),
              eq(zipAssemblies.cleanupToken, token),
              eq(zipAssemblies.state, "closed"),
              ownerAbsent("zip-assembly", id),
              deleteReceipt(row.key, deleteToken),
            ),
          )
          .returning({ id: zipAssemblies.id })
      ).length === 1
    );
  }
  async deferAssemblyCleanup(id: string, token: string, now: Date) {
    await this.db
      .update(zipAssemblies)
      .set({
        cleanupToken: null,
        cleanupUntil: null,
        nextCleanupAt: new Date(now.getTime() + 5000),
      })
      .where(
        and(eq(zipAssemblies.id, id), eq(zipAssemblies.cleanupToken, token)),
      );
  }
  async reserved() {
    const [row] = await this.db.all<{
      bytes: number;
      unmaterializedBytes: number;
    }>(
      sql`select ${zipReservedSql} bytes,coalesce((select sum(reserved_bytes) from zip_spools where state='writing'),0)+coalesce((select sum(reserved_bytes) from zip_assemblies where state!='closed'),0) unmaterializedBytes`,
    );
    return {
      bytes: Number(row?.bytes ?? 0),
      unmaterializedBytes: Number(row?.unmaterializedBytes ?? 0),
    };
  }
}

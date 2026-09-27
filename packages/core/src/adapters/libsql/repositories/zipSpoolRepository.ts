import type { ZipSpoolRepository } from "@repo/core/application/zip/ports";
import type {
  ZipAttemptResult,
  ZipRunKey,
  ZipSpool,
} from "@repo/core/domain/zip/entity";
import { and, asc, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { zipAttempts, zipSpoolRefs, zipSpools } from "../zipSchema";
import {
  cleanupValues,
  deleteReceipt,
  liveRun,
  ownerAbsent,
  refRow,
  reserveZipBytes,
  spoolRow,
} from "./zipHelpers";

export class LibsqlZipSpoolRepository implements ZipSpoolRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(zipSpools)
      .where(eq(zipSpools.id, id));
    return row ? spoolRow(row) : null;
  }
  async refs(key: ZipRunKey) {
    return (
      await this.db
        .select({ ref: zipSpoolRefs, spool: zipSpools })
        .from(zipSpoolRefs)
        .innerJoin(zipSpools, eq(zipSpools.id, zipSpoolRefs.spoolId))
        .where(
          and(
            eq(zipSpoolRefs.requestId, key.requestId),
            eq(zipSpoolRefs.generation, key.generation),
          ),
        )
        .orderBy(asc(zipSpoolRefs.ordinal))
    ).map(({ ref, spool }) => ({ ref: refRow(ref), spool: spoolRow(spool) }));
  }
  async reserve(spool: ZipSpool, token: string, diskLimit: number, now: Date) {
    const [attempt] = await this.db
      .select()
      .from(zipAttempts)
      .where(eq(zipAttempts.id, spool.attemptId));
    if (!attempt || attempt.state !== "running" || spool.state !== "writing")
      return false;
    const run = await liveRun(this.db, attempt, token, now);
    if (
      !run ||
      run.exclusions.some((entry) => entry.ordinal === attempt.ordinal)
    )
      return false;
    const [existing] = await this.db
      .select({ id: zipSpools.id })
      .from(zipSpools)
      .where(eq(zipSpools.attemptId, attempt.id))
      .limit(1);
    if (existing) return false;
    await reserveZipBytes(this.db, spool.reservedBytes, diskLimit);
    const { cleanup, ...values } = spool;
    await this.db
      .insert(zipSpools)
      .values({ ...values, ...cleanupValues(cleanup) });
    return true;
  }
  async publish(
    id: string,
    token: string,
    result: ZipAttemptResult,
    now: Date,
  ) {
    const spool = await this.find(id);
    if (
      !spool ||
      spool.state !== "writing" ||
      result.bytes > spool.reservedBytes
    )
      return false;
    const [attempt] = await this.db
      .select()
      .from(zipAttempts)
      .where(eq(zipAttempts.id, spool.attemptId));
    if (!attempt || attempt.state !== "running") return false;
    const run = await liveRun(this.db, attempt, token, now);
    if (
      !run ||
      run.exclusions.some((entry) => entry.ordinal === attempt.ordinal)
    )
      return false;
    const rows = await this.db
      .update(zipSpools)
      .set({ state: "ready", result, reservedBytes: result.bytes })
      .where(
        and(
          eq(zipSpools.id, id),
          eq(zipSpools.state, "writing"),
          ownerAbsent("zip-spool", id),
        ),
      )
      .returning();
    if (!rows.length) return false;
    await this.db
      .update(zipAttempts)
      .set({ state: "succeeded", result, version: attempt.version + 1 })
      .where(eq(zipAttempts.id, attempt.id));
    await this.db.insert(zipSpoolRefs).values({
      requestId: attempt.requestId,
      generation: attempt.generation,
      ordinal: attempt.ordinal,
      spoolId: id,
      purpose: "active",
      retryUntil: null,
    });
    return true;
  }
  async retire(id: string, now: Date) {
    await this.db
      .update(zipSpools)
      .set({ state: "cleanup", nextCleanupAt: now })
      .where(
        and(
          eq(zipSpools.id, id),
          sql`${zipSpools.state} in('writing','ready')`,
          sql`not exists(select 1 from zip_spool_refs f where f.spool_id=${zipSpools.id})`,
          ownerAbsent("zip-spool", id),
        ),
      );
  }
  async claimCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(zipSpools)
      .where(
        and(
          sql`${zipSpools.state}!='removed' and ${zipSpools.nextCleanupAt}<=${now.getTime()} and (${zipSpools.cleanupUntil} is null or ${zipSpools.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from zip_spool_refs f where f.spool_id=${zipSpools.id}) and not exists(select 1 from object_writes w where w.kind='zip-spool' and w.owner_id=${zipSpools.id} and w.active=1)`,
          sql`not exists(select 1 from zip_attempts p join zip_runs r on r.request_id=p.request_id and r.generation=p.generation where p.id=${zipSpools.attemptId} and r.state in('queued','running','assembling','stopping'))`,
        ),
      )
      .orderBy(asc(zipSpools.nextCleanupAt), asc(zipSpools.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(zipSpools)
      .set({ state: "cleanup", cleanupToken: token, cleanupUntil: until })
      .where(eq(zipSpools.id, row.id))
      .returning();
    return claimed ? spoolRow(claimed) : null;
  }
  async cleaned(id: string, token: string, deleteToken: string) {
    const row = await this.find(id);
    if (!row?.key) return false;
    return (
      (
        await this.db
          .update(zipSpools)
          .set({
            state: "removed",
            key: null,
            result: null,
            reservedBytes: 0,
            cleanupToken: null,
            cleanupUntil: null,
          })
          .where(
            and(
              eq(zipSpools.id, id),
              eq(zipSpools.state, "cleanup"),
              eq(zipSpools.cleanupToken, token),
              ownerAbsent("zip-spool", id),
              deleteReceipt(row.key, deleteToken),
            ),
          )
          .returning({ id: zipSpools.id })
      ).length === 1
    );
  }
  async deferCleanup(id: string, token: string, now: Date) {
    await this.db
      .update(zipSpools)
      .set({
        cleanupToken: null,
        cleanupUntil: null,
        nextCleanupAt: new Date(now.getTime() + 5000),
      })
      .where(and(eq(zipSpools.id, id), eq(zipSpools.cleanupToken, token)));
  }
}

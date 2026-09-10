import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  Companion,
  ReferenceEntry,
  ReferenceJob,
  ReferenceObject,
  ReferenceSettings,
  SourceBundle,
} from "@repo/core/domain/reference/entity";
import type { ReferenceRepository } from "@repo/core/domain/reference/ports/referenceRepository";
import { and, asc, eq, gt, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  companionSources,
  referenceJobs as jobs,
  referenceEntries,
  referenceObjects,
  referenceSettings,
  sourceBundles,
} from "../referenceSchema";

const orphanCompanion = () =>
  and(
    sql`exists (select 1 from source_bundles b where b.id=${companionSources.bundleId} and b.sealed=1)`,
    sql`not exists (select 1 from reference_settings s where s.bundle_id=${companionSources.bundleId})`,
    sql`not exists (select 1 from upload_reservations u where u.batch_id=${companionSources.bundleId} and u.state in ('awaiting','uploading'))`,
  );

function hydrate(row: typeof jobs.$inferSelect): ReferenceJob {
  if (
    row.state === "running" &&
    row.leaseToken &&
    row.leaseUntil &&
    row.failure === null
  )
    return {
      ...row,
      state: "running",
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      failure: null,
    };
  if (row.state === "failed" && row.failure !== null)
    return {
      ...row,
      state: "failed",
      leaseToken: null,
      leaseUntil: null,
      failure: row.failure,
    };
  if (
    row.state === "queued" ||
    row.state === "succeeded" ||
    row.state === "cancelled"
  )
    return {
      ...row,
      state: row.state,
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid reference job",
  );
}
export class LibsqlReferenceRepository implements ReferenceRepository {
  constructor(private readonly db: HollowTransaction) {}
  async settings(noteId: string) {
    return (
      (
        await this.db
          .select()
          .from(referenceSettings)
          .where(eq(referenceSettings.noteId, noteId))
      )[0] ?? null
    );
  }
  async saveSettings(row: ReferenceSettings) {
    await this.db
      .insert(referenceSettings)
      .values(row)
      .onConflictDoUpdate({ target: referenceSettings.noteId, set: row });
  }
  async entries(noteId: string) {
    return this.db
      .select()
      .from(referenceEntries)
      .where(eq(referenceEntries.noteId, noteId))
      .orderBy(asc(referenceEntries.createdAt));
  }
  async saveEntry(row: ReferenceEntry) {
    await this.db
      .insert(referenceEntries)
      .values(row)
      .onConflictDoUpdate({ target: referenceEntries.id, set: row });
  }
  async clearCurrent(noteId: string) {
    await this.db
      .update(referenceEntries)
      .set({ current: false })
      .where(eq(referenceEntries.noteId, noteId));
  }
  async insertJob(row: ReferenceJob) {
    await this.db.insert(jobs).values(row);
  }
  async job(id: string) {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, id));
    return row ? hydrate(row) : null;
  }
  async activeForNote(noteId: string) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.noteId, noteId),
            inArray(jobs.state, ["queued", "running"]),
          ),
        )
    ).map(hydrate);
  }
  async cancelNote(noteId: string, now: Date) {
    await this.db
      .update(jobs)
      .set({
        state: "cancelled",
        cancelRequested: true,
        leaseToken: null,
        leaseUntil: null,
        failure: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobs.noteId, noteId),
          inArray(jobs.state, ["queued", "running"]),
        ),
      );
  }
  async listJobs(accountId: string, since: Date) {
    return (
      await this.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.accountId, accountId), gt(jobs.createdAt, since)))
        .orderBy(sql`${jobs.createdAt} desc`)
    ).map(hydrate);
  }
  async retry(id: string) {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.retryOf, id));
    return row ? hydrate(row) : null;
  }
  async claim(now: Date, token: string, until: Date) {
    const eligible = and(
      or(
        eq(jobs.state, "queued"),
        and(eq(jobs.state, "running"), lte(jobs.leaseUntil, now)),
      ),
      sql`not exists (select 1 from reference_settings s join source_bundles b on b.id=s.bundle_id where s.note_id=${jobs.noteId} and b.sealed=0)`,
    );
    const next = this.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eligible)
      .orderBy(asc(jobs.createdAt))
      .limit(1);
    const [row] = await this.db
      .update(jobs)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until,
        attempt: sql`${jobs.attempt}+1`,
        updatedAt: now,
      })
      .where(and(inArray(jobs.id, next), eligible))
      .returning();
    return row ? hydrate(row) : null;
  }
  async heartbeat(
    id: string,
    token: string,
    now: Date,
    until: Date,
    completed: number,
  ) {
    return (
      (
        await this.db
          .update(jobs)
          .set({ leaseUntil: until, updatedAt: now, completed })
          .where(
            and(
              eq(jobs.id, id),
              eq(jobs.state, "running"),
              eq(jobs.leaseToken, token),
              gt(jobs.leaseUntil, now),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async finish(
    id: string,
    token: string,
    now: Date,
    state: "succeeded" | "failed" | "cancelled",
    failure?: string,
  ) {
    return (
      (
        await this.db
          .update(jobs)
          .set({
            state,
            leaseToken: null,
            leaseUntil: null,
            failure:
              state === "failed"
                ? (failure ?? "参照を取り込めませんでした。")
                : null,
            updatedAt: now,
          })
          .where(
            and(
              eq(jobs.id, id),
              eq(jobs.state, "running"),
              eq(jobs.leaseToken, token),
              gt(jobs.leaseUntil, now),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async cancel(id: string, now: Date) {
    await this.db
      .update(jobs)
      .set({ state: "cancelled", updatedAt: now })
      .where(and(eq(jobs.id, id), eq(jobs.state, "queued")));
    await this.db
      .update(jobs)
      .set({ cancelRequested: true, updatedAt: now })
      .where(and(eq(jobs.id, id), eq(jobs.state, "running")));
  }
  async saveObject(row: ReferenceObject) {
    const [existing] = await this.db
      .select()
      .from(referenceObjects)
      .where(eq(referenceObjects.id, row.id));
    if (row.state === "cleaned") {
      if (existing && existing.state !== "committed")
        await this.db
          .update(referenceObjects)
          .set({ state: "cleaned" })
          .where(eq(referenceObjects.id, row.id));
      return;
    }
    if (existing?.state === "cleaned" || existing?.state === "committed") {
      if (row.state === existing.state) return;
      throw new BusinessRuleError(
        "OBJECT_FENCED",
        "終了した保存処理は更新できません。",
      );
    }
    if (
      (
        await this.db.all(
          sql`select 1 from reference_jobs j join notes n on n.id=j.note_id where j.id=${row.jobId} and j.state='running' and n.lifecycle='active'`,
        )
      ).length === 0
    )
      throw new BusinessRuleError(
        "OBJECT_FENCED",
        "終了した保存処理は更新できません。",
      );
    await this.db
      .insert(referenceObjects)
      .values(row)
      .onConflictDoUpdate({ target: referenceObjects.id, set: row });
  }
  async objects(jobId: string) {
    return this.db
      .select()
      .from(referenceObjects)
      .where(eq(referenceObjects.jobId, jobId));
  }
  async abandonedObjects(now: Date) {
    return this.db
      .select()
      .from(referenceObjects)
      .where(
        and(
          inArray(referenceObjects.state, ["reserved", "written"]),
          lt(referenceObjects.createdAt, new Date(now.getTime() - 10 * 60_000)),
          sql`not exists (select 1 from reference_jobs j where j.id=${referenceObjects.jobId} and j.state='running' and j.lease_until>${now.getTime()})`,
        ),
      );
  }
  async usedBytes(accountId: string) {
    const [a] = await this.db
      .select({
        bytes: sql<number>`coalesce(sum(${referenceObjects.bytes}),0)`,
      })
      .from(referenceObjects)
      .where(
        and(
          eq(referenceObjects.accountId, accountId),
          inArray(referenceObjects.state, ["reserved", "written"]),
        ),
      );
    const [b] = await this.db
      .select({
        bytes: sql<number>`coalesce(sum(${companionSources.bytes}),0)`,
      })
      .from(companionSources)
      .where(eq(companionSources.accountId, accountId));
    return Number(a?.bytes ?? 0) + Number(b?.bytes ?? 0);
  }
  async insertBundle(row: SourceBundle) {
    await this.db.insert(sourceBundles).values(row);
  }
  async bundle(id: string) {
    return (
      (
        await this.db
          .select()
          .from(sourceBundles)
          .where(eq(sourceBundles.id, id))
      )[0] ?? null
    );
  }
  async sealBundle(id: string) {
    await this.db
      .update(sourceBundles)
      .set({ sealed: true })
      .where(eq(sourceBundles.id, id));
  }
  async insertCompanion(row: Companion) {
    await this.db.insert(companionSources).values(row);
  }
  async companions(bundleId: string) {
    return this.db
      .select()
      .from(companionSources)
      .where(eq(companionSources.bundleId, bundleId));
  }
  async orphanCompanions() {
    return this.db
      .select()
      .from(companionSources)
      .where(orphanCompanion())
      .limit(100);
  }
  async removeOrphanCompanion(id: string) {
    await this.db
      .delete(companionSources)
      .where(and(eq(companionSources.id, id), orphanCompanion()));
  }
  async pruneJobs(before: Date) {
    await this.db
      .delete(jobs)
      .where(
        and(
          lt(jobs.createdAt, before),
          inArray(jobs.state, ["succeeded", "failed", "cancelled"]),
          sql`not exists(select 1 from reference_objects o where o.job_id=${jobs.id} and o.state in ('reserved','written'))`,
          sql`not exists(select 1 from object_writes w where w.kind='reference-job' and w.owner_id=${jobs.id} and w.active=1)`,
          sql`not exists(select 1 from notes n where n.id=${jobs.noteId} and n.lifecycle='purging')`,
        ),
      );
  }
}

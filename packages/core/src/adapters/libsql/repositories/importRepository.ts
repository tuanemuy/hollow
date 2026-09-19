import type {
  ImportBatch,
  ImportNotice,
  Original,
  UploadReservation,
} from "@repo/core/domain/import/entity";
import type { ImportRepository } from "@repo/core/domain/import/ports/importRepository";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import {
  conversionJobs,
  extractionNotices,
  importBatches,
  originals,
  uploadReservations,
} from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { sourceBundles } from "../referenceSchema";

export class LibsqlImportRepository implements ImportRepository {
  constructor(private readonly db: HollowTransaction) {}
  async insertBatch(batch: ImportBatch) {
    await this.db.insert(importBatches).values(batch);
  }
  async findBatch(id: string) {
    return (
      (
        await this.db
          .select()
          .from(importBatches)
          .where(eq(importBatches.id, id))
      )[0] ?? null
    );
  }
  async listBatches(accountId: string, since: Date) {
    return this.db
      .select()
      .from(importBatches)
      .where(
        and(
          eq(importBatches.accountId, accountId),
          gt(importBatches.createdAt, since),
        ),
      )
      .orderBy(sql`${importBatches.createdAt} desc`);
  }
  async cancelBatch(id: string, now: Date) {
    await this.db
      .update(importBatches)
      .set({ cancelledAt: now })
      .where(eq(importBatches.id, id));
  }
  async insertReservation(row: UploadReservation) {
    await this.db.insert(uploadReservations).values(row);
  }
  async findReservation(id: string) {
    return (
      (
        await this.db
          .select()
          .from(uploadReservations)
          .where(eq(uploadReservations.id, id))
      )[0] ?? null
    );
  }
  async listReservations(batchId: string) {
    return this.db
      .select()
      .from(uploadReservations)
      .where(eq(uploadReservations.batchId, batchId));
  }
  async updateReservation(
    id: string,
    expectedState: UploadReservation["state"],
    state: UploadReservation["state"],
    failure: string | undefined,
  ) {
    return (
      (
        await this.db
          .update(uploadReservations)
          .set({ state, failure: failure ?? null })
          .where(
            and(
              eq(uploadReservations.id, id),
              eq(uploadReservations.state, expectedState),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async reservedAndUsedBytes(accountId: string, now: Date) {
    const [used] = await this.db
      .select({ bytes: sql<number>`coalesce(sum(${originals.bytes}),0)` })
      .from(originals)
      .where(eq(originals.accountId, accountId));
    const [reserved] = await this.db
      .select({
        bytes: sql<number>`coalesce(sum(${uploadReservations.bytes}),0)`,
      })
      .from(uploadReservations)
      .where(
        and(
          eq(uploadReservations.accountId, accountId),
          sql`(${uploadReservations.state} = 'uploading' OR (${uploadReservations.state} = 'awaiting' AND ${uploadReservations.expiresAt} > ${now.getTime()}) OR (${uploadReservations.state} IN ('failed','cancelled') AND ${uploadReservations.storageCleaned} = 0))`,
        ),
      );
    return Number(used?.bytes ?? 0) + Number(reserved?.bytes ?? 0);
  }
  async insertOriginal(row: Original) {
    await this.db.insert(originals).values(row);
  }
  async findOriginal(id: string) {
    return (
      (await this.db.select().from(originals).where(eq(originals.id, id)))[0] ??
      null
    );
  }
  async findByNote(noteId: string) {
    return (
      (
        await this.db
          .select()
          .from(originals)
          .where(eq(originals.noteId, noteId))
      )[0] ?? null
    );
  }
  async saveOriginal(row: Original) {
    await this.db.update(originals).set(row).where(eq(originals.id, row.id));
  }
  async replaceNotices(originalId: string, notices: readonly ImportNotice[]) {
    await this.db
      .delete(extractionNotices)
      .where(eq(extractionNotices.originalId, originalId));
    if (notices.length)
      await this.db
        .insert(extractionNotices)
        .values(notices.map((n) => ({ ...n, originalId })));
  }
  async listNotices(originalId: string) {
    return this.db
      .select({
        code: extractionNotices.code,
        location: extractionNotices.location,
        message: extractionNotices.message,
      })
      .from(extractionNotices)
      .where(eq(extractionNotices.originalId, originalId));
  }
  async expireReservations(now: Date) {
    await this.db
      .update(uploadReservations)
      .set({
        state: "failed",
        failure: "アップロードの有効期限が切れました。取り込み直してください。",
      })
      .where(
        and(
          inArray(uploadReservations.state, ["awaiting", "uploading"]),
          lt(uploadReservations.expiresAt, now),
        ),
      );
    await this.db
      .update(sourceBundles)
      .set({ sealed: true })
      .where(
        and(
          eq(sourceBundles.sealed, false),
          sql`not exists (select 1 from upload_reservations r where r.batch_id=${sourceBundles.id} and r.state in ('awaiting','uploading'))`,
        ),
      );
    const rows = await this.db
      .select({ storageKey: uploadReservations.storageKey })
      .from(uploadReservations)
      .where(
        and(
          inArray(uploadReservations.state, ["failed", "cancelled"]),
          eq(uploadReservations.storageCleaned, false),
          sql`not exists(select 1 from object_writes w where w.kind='import-upload' and w.owner_id=${uploadReservations.id} and w.active=1)`,
          lt(
            uploadReservations.expiresAt,
            new Date(now.getTime() - 5 * 60_000),
          ),
        ),
      );
    return rows.map((row) => row.storageKey);
  }
  async markStorageCleaned(storageKey: string) {
    await this.db
      .update(uploadReservations)
      .set({ storageCleaned: true })
      .where(
        and(
          eq(uploadReservations.storageKey, storageKey),
          inArray(uploadReservations.state, ["failed", "cancelled"]),
          sql`not exists(select 1 from object_writes w join import_batches b on b.id=${uploadReservations.batchId} join workspaces s on s.id=b.workspace_id and s.state='deleted' where w.kind='import-upload' and w.owner_id=${uploadReservations.id} and w.active=1)`,
        ),
      );
  }
  async pruneHistory(before: Date) {
    const old = this.db
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(
        and(
          lt(importBatches.createdAt, before),
          sql`not exists (select 1 from conversion_jobs j where j.batch_id = ${importBatches.id} and j.state in ('queued','running'))`,
          sql`not exists (select 1 from upload_reservations u where u.batch_id = ${importBatches.id} and u.state in ('awaiting','uploading'))`,
          sql`not exists (select 1 from upload_reservations u where u.batch_id = ${importBatches.id} and u.state != 'accepted' and u.storage_cleaned = 0)`,
          sql`not exists (select 1 from conversion_jobs j join notes n on n.id=j.note_id where j.batch_id=${importBatches.id} and n.lifecycle='purging')`,
          sql`not exists (select 1 from object_writes w where w.active=1 and ((w.kind='conversion-job' and exists(select 1 from conversion_jobs j where j.id=w.owner_id and j.batch_id=${importBatches.id})) or (w.kind='import-upload' and exists(select 1 from upload_reservations u where u.id=w.owner_id and u.batch_id=${importBatches.id}))))`,
        ),
      );
    const ids = (await old).map((x) => x.id);
    if (!ids.length) return;
    await this.db
      .delete(conversionJobs)
      .where(inArray(conversionJobs.batchId, ids));
    await this.db
      .delete(uploadReservations)
      .where(inArray(uploadReservations.batchId, ids));
    await this.db.delete(importBatches).where(inArray(importBatches.id, ids));
  }
}

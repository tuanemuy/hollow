import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import {
  type Asset,
  MEDIA_LIMITS,
  type MediaDraft,
  type MediaUpload,
} from "@repo/core/domain/asset/entity";
import type { AssetRepository } from "@repo/core/domain/asset/ports/assetRepository";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  assets,
  mediaDrafts,
  mediaUploads,
  noteAssetReferences,
} from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

function hydrate(row: typeof assets.$inferSelect): Asset {
  if (row.draftId && !row.sourceNoteId && !row.sourceJobId)
    return {
      ...row,
      draftId: row.draftId,
      sourceNoteId: null,
      sourceJobId: null,
    };
  if (!row.draftId && row.sourceNoteId && row.sourceJobId)
    return {
      ...row,
      draftId: null,
      sourceNoteId: row.sourceNoteId,
      sourceJobId: row.sourceJobId,
    };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid asset provenance",
  );
}

export class LibsqlAssetRepository implements AssetRepository {
  constructor(private readonly db: HollowTransaction) {}
  async insertDraft(draft: MediaDraft) {
    await this.db.insert(mediaDrafts).values(draft);
  }
  async findDraft(id: string) {
    return (
      (
        await this.db.select().from(mediaDrafts).where(eq(mediaDrafts.id, id))
      )[0] ?? null
    );
  }
  async bindDraft(id: string, noteId: string) {
    await this.db
      .update(mediaDrafts)
      .set({ noteId })
      .where(
        and(
          eq(mediaDrafts.id, id),
          sql`${mediaDrafts.noteId} is null or ${mediaDrafts.noteId}=${noteId}`,
        ),
      );
  }
  async insertUpload(upload: MediaUpload) {
    await this.db.insert(mediaUploads).values(upload);
  }
  async findUpload(id: string) {
    return (
      (
        await this.db.select().from(mediaUploads).where(eq(mediaUploads.id, id))
      )[0] ?? null
    );
  }
  async transitionUpload(
    id: string,
    from: MediaUpload["state"],
    to: MediaUpload["state"],
  ) {
    return (
      (
        await this.db
          .update(mediaUploads)
          .set({ state: to })
          .where(and(eq(mediaUploads.id, id), eq(mediaUploads.state, from)))
          .returning()
      ).length > 0
    );
  }
  async markUploadCleaned(id: string) {
    await this.db
      .update(mediaUploads)
      .set({ storageCleaned: true })
      .where(eq(mediaUploads.id, id));
  }
  async insert(asset: Asset) {
    await this.db.insert(assets).values(asset);
  }
  async find(id: string) {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id));
    return row ? hydrate(row) : null;
  }
  async isReferenced(noteId: string, assetId: string) {
    return (
      (
        await this.db
          .select()
          .from(noteAssetReferences)
          .where(
            and(
              eq(noteAssetReferences.noteId, noteId),
              eq(noteAssetReferences.assetId, assetId),
              eq(noteAssetReferences.version, 0),
            ),
          )
      ).length > 0
    );
  }
  async referenceIds(noteId: string, version: number) {
    return (
      await this.db
        .select({ id: noteAssetReferences.assetId })
        .from(noteAssetReferences)
        .where(
          and(
            eq(noteAssetReferences.noteId, noteId),
            eq(noteAssetReferences.version, version),
          ),
        )
    ).map((r) => r.id);
  }
  async pinRevision(
    noteId: string,
    version: number,
    assetIds: readonly string[],
  ) {
    if (version <= 0)
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Invalid revision pin",
      );
    const ids = [...new Set(assetIds)];
    if (!ids.length) return;
    await this.db
      .insert(noteAssetReferences)
      .values(ids.map((assetId) => ({ noteId, assetId, version })));
    await this.db
      .update(assets)
      .set({ unreferencedAt: null, committedToNote: true })
      .where(inArray(assets.id, ids));
  }
  async removeRevisionPins(
    noteId: string,
    versions: readonly number[],
    now: Date,
  ) {
    if (versions.some((v) => v <= 0))
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Invalid revision pin",
      );
    if (versions.length)
      await this.db
        .delete(noteAssetReferences)
        .where(
          and(
            eq(noteAssetReferences.noteId, noteId),
            inArray(noteAssetReferences.version, [...versions]),
          ),
        );
    await this.db
      .update(assets)
      .set({ unreferencedAt: now })
      .where(
        and(
          sql`${assets.unreferencedAt} is null`,
          sql`not exists (select 1 from note_asset_references r where r.asset_id = ${assets.id})`,
        ),
      );
  }
  async replaceCurrentReferences(
    noteId: string,
    assetIds: readonly string[],
    now: Date,
  ) {
    await this.db
      .delete(noteAssetReferences)
      .where(
        and(
          eq(noteAssetReferences.noteId, noteId),
          eq(noteAssetReferences.version, 0),
        ),
      );
    if (assetIds.length) {
      await this.db.insert(noteAssetReferences).values(
        [...new Set(assetIds)].map((assetId) => ({
          noteId,
          assetId,
          version: 0,
        })),
      );
      await this.db
        .update(assets)
        .set({ unreferencedAt: null, committedToNote: true })
        .where(inArray(assets.id, [...assetIds]));
    }
    await this.db
      .update(assets)
      .set({ unreferencedAt: now })
      .where(
        and(
          sql`${assets.unreferencedAt} is null`,
          sql`not exists (select 1 from note_asset_references r where r.asset_id = ${assets.id})`,
        ),
      );
  }
  async reservedAndUsedBytes(accountId: string, now: Date) {
    const [used] = await this.db
      .select({ bytes: sql<number>`coalesce(sum(${assets.bytes}),0)` })
      .from(assets)
      .where(eq(assets.accountId, accountId));
    const [reserved] = await this.db
      .select({ bytes: sql<number>`coalesce(sum(${mediaUploads.bytes}),0)` })
      .from(mediaUploads)
      .where(
        and(
          eq(mediaUploads.accountId, accountId),
          sql`(${mediaUploads.state} = 'uploading' OR (${mediaUploads.state} = 'awaiting' AND ${mediaUploads.expiresAt} > ${now.getTime()}) OR (${mediaUploads.state} = 'failed' AND ${mediaUploads.storageCleaned} = 0))`,
        ),
      );
    return Number(used?.bytes ?? 0) + Number(reserved?.bytes ?? 0);
  }
  async collectGarbage(now: Date) {
    await this.db
      .update(mediaUploads)
      .set({ state: "failed" })
      .where(
        and(
          inArray(mediaUploads.state, ["awaiting", "uploading"]),
          lt(mediaUploads.expiresAt, new Date(now.getTime() - 5 * 60_000)),
        ),
      );
    const uploads = await this.db
      .select()
      .from(mediaUploads)
      .where(
        and(
          eq(mediaUploads.state, "failed"),
          eq(mediaUploads.storageCleaned, false),
        ),
      );
    await this.db
      .update(assets)
      .set({ state: "deleting" })
      .where(
        and(
          eq(assets.state, "ready"),
          lt(
            assets.unreferencedAt,
            new Date(now.getTime() - MEDIA_LIMITS.unreferencedMs),
          ),
          sql`not exists (select 1 from note_asset_references r where r.asset_id = ${assets.id})`,
          sql`not exists (select 1 from media_drafts d where d.id = ${assets.draftId} and d.expires_at > ${now.getTime()})`,
        ),
      );
    return {
      uploads,
      assets: (
        await this.db.select().from(assets).where(eq(assets.state, "deleting"))
      ).map(hydrate),
    };
  }
  async finishDelete(id: string) {
    await this.db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.state, "deleting")));
  }
}

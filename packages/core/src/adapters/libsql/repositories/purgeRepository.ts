import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  JobResultSnapshot,
  PurgeIntent,
  PurgeObject,
  PurgeObjectOwner,
} from "@repo/core/domain/purge/entity";
import type { PurgeRepository } from "@repo/core/domain/purge/ports/purgeRepository";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import {
  conversionJobs,
  mediaDrafts,
  noteAssetReferences,
  notes,
  originals,
} from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  jobSnapshots,
  notePurges,
  objectDeletes,
  purgeObjects,
} from "../purgeSchema";
import {
  referenceEntries,
  referenceJobs,
  referenceSettings,
} from "../referenceSchema";

function hydrate(row: typeof notePurges.$inferSelect): PurgeIntent {
  const ownership =
    row.cause === "workspace-deletion" &&
    row.workspaceDeletionId &&
    row.workspaceId &&
    row.accountId === null
      ? {
          cause: "workspace-deletion" as const,
          accountId: null,
          workspaceDeletionId: row.workspaceDeletionId,
          workspaceId: row.workspaceId,
        }
      : row.cause === "expired"
        ? { cause: "expired" as const, accountId: row.accountId }
        : row.cause === "manual" && row.accountId
          ? { cause: "manual" as const, accountId: row.accountId }
          : null;
  if (!ownership)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Manual purge requires a user",
    );
  if (
    row.state === "running" &&
    row.leaseToken &&
    row.leaseUntil &&
    row.failure === null
  )
    return {
      ...row,
      ...ownership,
      state: "running",
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      failure: null,
    };
  if (
    row.state === "failed" &&
    row.failure &&
    row.leaseToken === null &&
    row.leaseUntil === null
  )
    return {
      ...row,
      ...ownership,
      state: "failed",
      failure: row.failure,
      leaseToken: null,
      leaseUntil: null,
    };
  if (
    (row.state === "queued" || row.state === "succeeded") &&
    row.failure === null &&
    row.leaseToken === null &&
    row.leaseUntil === null
  )
    return {
      ...row,
      ...ownership,
      state: row.state,
      failure: null,
      leaseToken: null,
      leaseUntil: null,
    };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid purge state",
  );
}

export class LibsqlPurgeRepository implements PurgeRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const row = (
      await this.db.select().from(notePurges).where(eq(notePurges.id, id))
    )[0];
    return row ? hydrate(row) : null;
  }
  async forNote(noteId: string) {
    const row = (
      await this.db
        .select()
        .from(notePurges)
        .where(eq(notePurges.noteId, noteId))
    )[0];
    return row ? hydrate(row) : null;
  }
  async page(
    accountId: string,
    scope: "unfinished" | "completed",
    since: Date,
    before: Readonly<{ at: Date; id: string }> | undefined,
    limit: number,
  ) {
    const rows = await this.db
      .select()
      .from(notePurges)
      .where(
        and(
          eq(notePurges.accountId, accountId),
          sql`not exists(select 1 from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id where a.purge_id=${notePurges.id})`,
          scope === "unfinished"
            ? ne(notePurges.state, "succeeded")
            : and(
                eq(notePurges.state, "succeeded"),
                gte(notePurges.createdAt, since),
              ),
          before
            ? or(
                lt(notePurges.createdAt, before.at),
                and(
                  eq(notePurges.createdAt, before.at),
                  lt(notePurges.id, before.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(notePurges.createdAt), desc(notePurges.id))
      .limit(limit);
    return rows.map(hydrate);
  }
  async summary(accountId: string) {
    const [counts] = await this.db
      .select({
        unfinished: sql<number>`count(*)`,
        active: sql<number>`coalesce(sum(case when ${notePurges.state} in ('queued','running') then 1 else 0 end),0)`,
        failed: sql<number>`coalesce(sum(case when ${notePurges.state}='failed' then 1 else 0 end),0)`,
      })
      .from(notePurges)
      .where(
        and(
          eq(notePurges.accountId, accountId),
          ne(notePurges.state, "succeeded"),
          sql`not exists(select 1 from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id where a.purge_id=${notePurges.id})`,
        ),
      );
    const [representative] = await this.db
      .select()
      .from(notePurges)
      .where(
        and(
          eq(notePurges.accountId, accountId),
          inArray(notePurges.state, ["queued", "running"]),
          sql`not exists(select 1 from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id where a.purge_id=${notePurges.id})`,
        ),
      )
      .orderBy(asc(notePurges.createdAt), asc(notePurges.id))
      .limit(1);
    return {
      unfinished: Number(counts?.unfinished ?? 0),
      active: Number(counts?.active ?? 0),
      failed: Number(counts?.failed ?? 0),
      representative: representative ? hydrate(representative) : null,
    };
  }
  async observe(accountId: string, ids: readonly string[], since: Date) {
    if (!ids.length) return [];
    const rows = await this.db
      .select()
      .from(notePurges)
      .where(
        and(
          eq(notePurges.accountId, accountId),
          inArray(notePurges.id, [...ids]),
          or(
            ne(notePurges.state, "succeeded"),
            gte(notePurges.createdAt, since),
          ),
        ),
      );
    return rows.map(hydrate);
  }
  async begin(intent: PurgeIntent) {
    await this.db.insert(notePurges).values(intent);
    await this.capture(intent.id);
    await this.db
      .delete(noteAssetReferences)
      .where(eq(noteAssetReferences.noteId, intent.noteId));
  }
  async due(now: Date, limit: number) {
    const rows = await this.db
      .select({ id: notes.id, operationId: notes.trashOperationId })
      .from(notes)
      .where(and(eq(notes.lifecycle, "trashed"), lte(notes.purgeAfter, now)))
      .orderBy(asc(notes.purgeAfter), asc(notes.id))
      .limit(limit);
    return rows.flatMap((r) =>
      r.operationId ? [{ id: r.id, operationId: r.operationId }] : [],
    );
  }
  async claim(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(notePurges)
      .where(
        or(
          and(
            inArray(notePurges.state, ["queued", "failed"]),
            lte(notePurges.nextAttemptAt, now),
          ),
          and(eq(notePurges.state, "running"), lte(notePurges.leaseUntil, now)),
        ),
      )
      .orderBy(asc(notePurges.nextAttemptAt), asc(notePurges.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(notePurges)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until,
        updatedAt: now,
        failure: null,
        recoveries: sql`case when ${notePurges.state} in('failed','running') then min(${notePurges.recoveries}+1,2147483647) else ${notePurges.recoveries} end`,
      })
      .where(eq(notePurges.id, row.id))
      .returning();
    return claimed ? hydrate(claimed) : null;
  }
  async objects(id: string): Promise<readonly PurgeObject[]> {
    return (
      await this.db
        .select()
        .from(purgeObjects)
        .where(and(eq(purgeObjects.purgeId, id), eq(purgeObjects.done, false)))
        .limit(100)
    ).map((r) => ({
      purgeId: r.purgeId,
      key: r.key,
      owner: { kind: r.kind, id: r.ownerId },
      done: r.done,
    }));
  }
  async capture(id: string) {
    const intent = await this.find(id);
    if (!intent || intent.state === "succeeded") return;
    const n = intent.noteId;
    const rows = await this.db.all<{
      kind: PurgeObjectOwner["kind"];
      ownerId: string;
      key: string;
    }>(sql`
      select * from (
        select 'original' kind,id ownerId,storage_key key from originals where note_id=${n}
        union all select 'export-operation',e.id,e.storage_key from export_operations e where e.note_id=${n}
        union all select 'pdf-artifact',a.id,a.storage_key from pdf_artifacts a where a.live_note_id=${n} and a.storage_key is not null
        union all select 'zip-spool',s.id,s.storage_key from zip_spools s join zip_attempts a on a.id=s.attempt_id join zip_targets t on t.request_id=a.request_id and t.ordinal=a.ordinal where t.live_note_id=${n} and s.storage_key is not null
        union all select 'zip-artifact',a.id,a.storage_key from zip_artifacts a where a.storage_key is not null and exists(select 1 from zip_artifact_entries e where e.artifact_id=a.id and e.live_note_id=${n})
        union all select 'asset',a.id,a.storage_key from assets a where (a.source_note_id=${n} or exists(select 1 from media_drafts d where d.id=a.draft_id and d.note_id=${n}) or exists(select 1 from note_asset_references r where r.asset_id=a.id and r.note_id=${n}))
        union all select 'media-upload',u.id,u.id||'_source' from media_uploads u join media_drafts d on d.id=u.draft_id where d.note_id=${n} and u.state!='accepted'
        union all select 'media-upload',u.id,u.id||'_safe' from media_uploads u join media_drafts d on d.id=u.draft_id where d.note_id=${n} and u.state!='accepted'
        union all select 'reference-object',o.id,o.id from reference_objects o join reference_jobs j on j.id=o.job_id where j.note_id=${n} and o.state in ('reserved','written')
        union all select 'companion',c.id,c.storage_key from companion_sources c join source_bundles b on b.id=c.bundle_id where b.sealed=1 and exists(select 1 from reference_settings own where own.note_id=${n} and own.bundle_id=b.id) and not exists(select 1 from reference_settings s where s.bundle_id=b.id and s.note_id!=${n}) and not exists(select 1 from upload_reservations u where u.batch_id=b.id and u.state in ('awaiting','uploading'))
      ) candidates where not exists(select 1 from purge_objects p where p.purge_id=${id} and p.storage_key=candidates.key) limit 100`);
    for (const row of rows)
      await this.db
        .insert(purgeObjects)
        .values({
          purgeId: id,
          key: row.key,
          kind: row.kind,
          ownerId: row.ownerId,
          done: false,
        })
        .onConflictDoNothing();
    await this.db
      .update(notePurges)
      .set({
        total: sql`(select count(*) from purge_objects where purge_id=${id})`,
      })
      .where(eq(notePurges.id, id));
  }
  private async hasWriters(noteId: string) {
    return (
      (
        await this.db.all(sql`select 1 from object_writes w where w.active=1 and (
      (w.kind='media-upload' and exists(select 1 from media_uploads u join media_drafts d on d.id=u.draft_id where u.id=w.owner_id and d.note_id=${noteId})) or
      (w.kind='reference-job' and exists(select 1 from reference_jobs j where j.id=w.owner_id and (j.note_id=${noteId} or exists(select 1 from reference_settings s join reference_settings own on s.bundle_id=own.bundle_id where s.note_id=j.note_id and own.note_id=${noteId})))) or
      (w.kind='conversion-job' and exists(select 1 from conversion_jobs j where j.id=w.owner_id and j.note_id=${noteId})) or
      (w.kind='llm-pdf-preview' and exists(select 1 from llm_pdf_previews p where p.id=w.owner_id and p.note_id=${noteId})) or
      (w.kind='export-operation' and exists(select 1 from export_operations e where e.id=w.owner_id and e.note_id=${noteId})) or
      (w.kind='pdf-artifact' and exists(select 1 from pdf_artifacts a where a.id=w.owner_id and a.live_note_id=${noteId})) or
      (w.kind='pdf-delivery' and exists(select 1 from pdf_deliveries d join pdf_artifacts a on a.id=d.artifact_id where d.id=w.owner_id and a.live_note_id=${noteId})) or
      (w.kind='pdf-anonymous-delivery' and exists(select 1 from pdf_anonymous_deliveries d join pdf_artifacts a on a.id=d.artifact_id where d.id=w.owner_id and a.live_note_id=${noteId})) or
      (w.kind='zip-source' and exists(select 1 from zip_attempts p join zip_targets t on t.request_id=p.request_id and t.ordinal=p.ordinal where p.id=w.owner_id and t.live_note_id=${noteId})) or
      (w.kind='zip-spool' and exists(select 1 from zip_spools s join zip_attempts p on p.id=s.attempt_id join zip_targets t on t.request_id=p.request_id and t.ordinal=p.ordinal where s.id=w.owner_id and t.live_note_id=${noteId})) or
      (w.kind='zip-assembly' and exists(select 1 from zip_assemblies a join zip_targets t on t.request_id=a.request_id where a.id=w.owner_id and t.live_note_id=${noteId})) or
      (w.kind='zip-delivery' and exists(select 1 from zip_deliveries d join zip_artifact_entries e on e.artifact_id=d.artifact_id where d.id=w.owner_id and e.live_note_id=${noteId})) or
      (w.kind='import-upload' and exists(select 1 from upload_reservations u join originals o on o.storage_key=u.storage_key where u.id=w.owner_id and o.note_id=${noteId}))
    ) limit 1`)
      ).length > 0 ||
      (
        await this.db.all(
          sql`select 1 where exists(select 1 from pdf_computations c where c.live_note_id=${noteId} and (c.state!='closed' or c.workspace_removed=0)) or exists(select 1 from pdf_deliveries d join pdf_artifacts a on a.id=d.artifact_id where a.live_note_id=${noteId} and d.state!='closed') or exists(select 1 from pdf_anonymous_deliveries d join pdf_artifacts a on a.id=d.artifact_id where a.live_note_id=${noteId} and d.state!='closed')
          or exists(select 1 from zip_targets t join zip_requests q on q.id=t.request_id where t.live_note_id=${noteId} and q.state!='terminal')
          or exists(select 1 from zip_pdf_holds h join pdf_artifacts a on a.id=h.artifact_id where a.live_note_id=${noteId} and h.state!='released')
          or exists(select 1 from llm_conversions c where c.note_id=${noteId} and (c.phase!='terminal' or c.owner_state in('active','unknown') or c.response_budget!=0 or exists(select 1 from llm_quota_reservations q where q.job_id=c.job_id and q.state='reserved')))
          or exists(select 1 from llm_pdf_previews p where p.note_id=${noteId} and (p.state in('queued','running','unknown') or p.owner_state in('active','unknown')))
          or exists(select 1 from zip_spool_refs f join zip_targets t on t.request_id=f.request_id and t.ordinal=f.ordinal where t.live_note_id=${noteId})
          or exists(select 1 from zip_spools s join zip_attempts p on p.id=s.attempt_id join zip_targets t on t.request_id=p.request_id and t.ordinal=p.ordinal where t.live_note_id=${noteId} and exists(select 1 from zip_spool_refs f where f.spool_id=s.id))
          or exists(select 1 from zip_assemblies a join zip_targets t on t.request_id=a.request_id where t.live_note_id=${noteId} and (a.state!='closed' or a.storage_key is not null))
          or exists(select 1 from zip_deliveries d join zip_artifact_entries e on e.artifact_id=d.artifact_id where e.live_note_id=${noteId} and d.state!='closed')`,
        )
      ).length > 0
    );
  }
  async completeObject(
    id: string,
    token: string,
    key: string,
    deleteToken: string,
    now: Date,
  ) {
    const p = await this.find(id);
    if (
      !p ||
      p.leaseToken !== token ||
      p.state !== "running" ||
      !p.leaseUntil ||
      p.leaseUntil <= now
    )
      return false;
    if (await this.hasWriters(p.noteId)) return false;
    const [deleted] = await this.db
      .select()
      .from(objectDeletes)
      .where(
        and(
          eq(objectDeletes.key, key),
          eq(objectDeletes.token, deleteToken),
          eq(objectDeletes.done, true),
        ),
      );
    if (!deleted) return false;
    const [object] = await this.db
      .select()
      .from(purgeObjects)
      .where(and(eq(purgeObjects.purgeId, id), eq(purgeObjects.key, key)));
    if (
      object?.kind === "asset" &&
      (
        await this.db
          .select()
          .from(noteAssetReferences)
          .where(
            and(
              eq(noteAssetReferences.assetId, object.ownerId),
              ne(noteAssetReferences.noteId, p.noteId),
            ),
          )
          .limit(1)
      ).length
    )
      throw new BusinessRuleError(
        "PURGE_SHARED",
        "別ノートの保持関係があるため回収できません。",
      );
    if (object?.kind === "export-operation")
      await this.db.run(
        sql`delete from export_operations where id=${object.ownerId} and note_id=${p.noteId} and storage_key=${key}`,
      );
    if (object?.kind === "pdf-artifact")
      await this.db.run(
        sql`update pdf_artifacts set state='removed',storage_key=null,file=null,reserved_bytes=0,cleanup_token=null,cleanup_until=null where id=${object.ownerId} and live_note_id=${p.noteId} and storage_key=${key}`,
      );
    if (object?.kind === "zip-spool")
      await this.db.run(
        sql`update zip_spools set state='removed',storage_key=null,result=null,reserved_bytes=0,cleanup_token=null,cleanup_until=null where id=${object.ownerId} and storage_key=${key}`,
      );
    if (object?.kind === "zip-artifact") {
      await this.db.run(
        sql`update zip_artifacts set state='removed',storage_key=null,file=null,reserved_bytes=0,cleanup_token=null,cleanup_until=null where id=${object.ownerId} and storage_key=${key}`,
      );
      await this.db.run(
        sql`update zip_artifact_entries set live_note_id=null where artifact_id=${object.ownerId}`,
      );
    }
    await this.db
      .update(purgeObjects)
      .set({ done: true })
      .where(and(eq(purgeObjects.purgeId, id), eq(purgeObjects.key, key)));
    await this.db
      .update(notePurges)
      .set({
        completed: sql`(select count(*) from purge_objects where purge_id=${id} and done=1)`,
        updatedAt: now,
      })
      .where(eq(notePurges.id, id));
    return true;
  }
  async readyToDelete(id: string, token: string, key: string, now: Date) {
    const p = await this.find(id);
    if (
      !p ||
      p.state !== "running" ||
      p.leaseToken !== token ||
      !p.leaseUntil ||
      p.leaseUntil <= now ||
      (await this.hasWriters(p.noteId))
    )
      return false;
    const [o] = await this.db
      .select()
      .from(purgeObjects)
      .where(
        and(
          eq(purgeObjects.purgeId, id),
          eq(purgeObjects.key, key),
          eq(purgeObjects.done, false),
        ),
      );
    if (!o) return false;
    if (
      o.kind === "asset" &&
      (
        await this.db
          .select()
          .from(noteAssetReferences)
          .where(eq(noteAssetReferences.assetId, o.ownerId))
          .limit(1)
      ).length
    )
      throw new BusinessRuleError(
        "PURGE_SHARED",
        "別ノートの保持関係があるため回収できません。",
      );
    return true;
  }
  async finish(id: string, token: string, now: Date) {
    const p = await this.find(id);
    if (
      !p ||
      p.state !== "running" ||
      p.leaseToken !== token ||
      !p.leaseUntil ||
      p.leaseUntil <= now
    )
      return false;
    await this.capture(id);
    if ((await this.objects(id)).length || (await this.hasWriters(p.noteId)))
      return false;
    const pendingBundle = await this.db.all(
      sql`select 1 from reference_settings own where own.note_id=${p.noteId} and own.bundle_id is not null and not exists(select 1 from reference_settings other where other.bundle_id=own.bundle_id and other.note_id!=own.note_id) and (exists(select 1 from source_bundles b where b.id=own.bundle_id and b.sealed=0) or exists(select 1 from upload_reservations u where u.batch_id=own.bundle_id and u.state in ('awaiting','uploading'))) limit 1`,
    );
    if (pendingBundle.length) return false;
    const foreign = await this.db.all(
      sql`select 1 from note_asset_references r join assets a on a.id=r.asset_id where r.note_id!=${p.noteId} and (a.source_note_id=${p.noteId} or exists(select 1 from media_drafts d where d.id=a.draft_id and d.note_id=${p.noteId})) limit 1`,
    );
    if (foreign.length)
      throw new BusinessRuleError(
        "PURGE_SHARED",
        "別ノートの保持関係があるため回収できません。",
      );
    await this.db.run(
      sql`update pdf_requests set live_note_id=null where live_note_id=${p.noteId} and state in('succeeded','failed','cancelled')`,
    );
    await this.db.run(
      sql`update pdf_anonymous_requests set live_note_id=null where live_note_id=${p.noteId} and state in('succeeded','failed','invalidated','expired')`,
    );
    await this.db.run(
      sql`update pdf_artifacts set live_note_id=null where live_note_id=${p.noteId} and state='removed'`,
    );
    await this.db.run(
      sql`update pdf_computations set live_note_id=null where live_note_id=${p.noteId} and state='closed' and workspace_removed=1`,
    );
    await this.db.run(
      sql`update zip_targets set live_note_id=null where live_note_id=${p.noteId}`,
    );
    await this.db.run(
      sql`update zip_artifact_entries set live_note_id=null where live_note_id=${p.noteId} and exists(select 1 from zip_artifacts a where a.id=zip_artifact_entries.artifact_id and a.state='removed')`,
    );
    await this.archiveJobs(p, now);
    await this.db
      .delete(referenceEntries)
      .where(eq(referenceEntries.noteId, p.noteId));
    await this.db
      .delete(referenceSettings)
      .where(eq(referenceSettings.noteId, p.noteId));
    await this.db.run(
      sql`delete from extraction_notices where original_id in(select id from originals where note_id=${p.noteId})`,
    );
    await this.db.delete(originals).where(eq(originals.noteId, p.noteId));
    await this.db.run(
      sql`delete from assets where source_note_id=${p.noteId} or draft_id in(select id from media_drafts where note_id=${p.noteId})`,
    );
    await this.db.run(
      sql`delete from media_uploads where draft_id in(select id from media_drafts where note_id=${p.noteId})`,
    );
    await this.db.delete(mediaDrafts).where(eq(mediaDrafts.noteId, p.noteId));
    await this.db.run(
      sql`delete from reference_objects where id in(select owner_id from purge_objects where purge_id=${id} and kind='reference-object')`,
    );
    await this.db.run(
      sql`delete from companion_sources where id in(select owner_id from purge_objects where purge_id=${id} and kind='companion')`,
    );
    // An already-admitted purge may finish before the workspace admission cursor reaches it.
    await this.db.run(
      sql`insert into workspace_deletion_notes(intent_id,note_id,purge_id,completed_at) select d.id,n.id,${id},${now.getTime()} from notes n join workspace_deletions d on d.workspace_id=n.owner_workspace_id join workspaces w on w.id=d.workspace_id and w.state='deleted' where n.id=${p.noteId} and n.lifecycle='purging' and n.trash_operation_id=${id} and d.state!='succeeded' on conflict(intent_id,note_id) do update set completed_at=excluded.completed_at`,
    );
    await this.db
      .delete(notes)
      .where(
        and(
          eq(notes.id, p.noteId),
          eq(notes.lifecycle, "purging"),
          eq(notes.trashOperationId, id),
        ),
      );
    await this.db
      .update(notePurges)
      .set({
        state: "succeeded",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
        updatedAt: now,
      })
      .where(eq(notePurges.id, id));
    return true;
  }
  private async archiveJobs(p: PurgeIntent, _now: Date) {
    if (await this.hasWriters(p.noteId))
      throw new BusinessRuleError(
        "PURGE_PROCESSING",
        "処理の実終了を待っています。",
      );
    const conversions = await this.db
      .select()
      .from(conversionJobs)
      .where(eq(conversionJobs.noteId, p.noteId));
    const refs = await this.db
      .select()
      .from(referenceJobs)
      .where(eq(referenceJobs.noteId, p.noteId));
    for (const j of conversions) {
      if (j.state === "queued" || j.state === "running")
        throw new BusinessRuleError(
          "PURGE_PROCESSING",
          "処理の終了を待っています。",
        );
      const [o] = await this.db
        .select({ name: originals.name })
        .from(originals)
        .where(eq(originals.id, j.originalId));
      await this.db
        .insert(jobSnapshots)
        .values({
          id: j.id,
          kind: "conversion",
          accountId: j.accountId,
          batchId: j.batchId,
          retryOf: j.retryOf,
          name: o?.name ?? p.title,
          state: j.state,
          failure: j.failure,
          attempt: j.attempt,
          completed: j.state === "succeeded" ? 1 : 0,
          total: 1,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        })
        .onConflictDoNothing();
    }
    for (const j of refs) {
      if (j.state === "queued" || j.state === "running")
        throw new BusinessRuleError(
          "PURGE_PROCESSING",
          "処理の終了を待っています。",
        );
      await this.db
        .insert(jobSnapshots)
        .values({
          id: j.id,
          kind: "reference",
          accountId: j.accountId,
          batchId: null,
          retryOf: j.retryOf,
          name: p.title,
          state: j.state,
          failure: j.failure,
          attempt: j.attempt,
          completed: j.completed,
          total: j.total,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        })
        .onConflictDoNothing();
    }
    await this.db.run(
      sql`delete from llm_pdf_previews where note_id=${p.noteId}`,
    );
    await this.db.run(
      sql`delete from llm_dispatches where job_id in(select job_id from llm_conversions where note_id=${p.noteId})`,
    );
    await this.db.run(
      sql`delete from llm_quota_reservations where job_id in(select job_id from llm_conversions where note_id=${p.noteId})`,
    );
    await this.db.run(
      sql`delete from llm_conversions where note_id=${p.noteId}`,
    );
    await this.db
      .delete(conversionJobs)
      .where(eq(conversionJobs.noteId, p.noteId));
    await this.db.run(
      sql`delete from reference_objects where job_id in(select id from reference_jobs where note_id=${p.noteId})`,
    );
    await this.db
      .delete(referenceJobs)
      .where(eq(referenceJobs.noteId, p.noteId));
  }
  async defer(id: string, token: string, now: Date, reason: string | null) {
    await this.db
      .update(notePurges)
      .set({
        state: reason ? "failed" : "queued",
        failure: reason,
        leaseToken: null,
        leaseUntil: null,
        updatedAt: now,
        nextAttemptAt: new Date(now.getTime() + (reason ? 30_000 : 2000)),
      })
      .where(and(eq(notePurges.id, id), eq(notePurges.leaseToken, token)));
  }
  async retry(id: string, now: Date) {
    await this.db
      .update(notePurges)
      .set({ state: "queued", failure: null, nextAttemptAt: now })
      .where(and(eq(notePurges.id, id), eq(notePurges.state, "failed")));
  }
  async snapshots(
    accountId: string,
    since: Date,
  ): Promise<readonly JobResultSnapshot[]> {
    return this.db
      .select()
      .from(jobSnapshots)
      .where(
        and(
          eq(jobSnapshots.accountId, accountId),
          gte(jobSnapshots.createdAt, since),
        ),
      )
      .orderBy(desc(jobSnapshots.createdAt));
  }
  async prune(before: Date) {
    await this.db
      .delete(jobSnapshots)
      .where(lt(jobSnapshots.createdAt, before));
    await this.db.run(
      sql`delete from purge_objects where purge_id in(select id from note_purges where state='succeeded' and created_at<${before.getTime()} and not exists(select 1 from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id where a.purge_id=note_purges.id and a.state!='succeeded'))`,
    );
    await this.db
      .delete(notePurges)
      .where(
        and(
          eq(notePurges.state, "succeeded"),
          lt(notePurges.createdAt, before),
          sql`not exists(select 1 from empty_trash_targets t join empty_trash_attempts a on a.id=t.latest_attempt_id where a.purge_id=${notePurges.id} and a.state!='succeeded')`,
        ),
      );
    await this.db.run(
      sql`delete from object_write_keys where write_id in(select id from object_writes where active=0 and created_at<${before.getTime()})`,
    );
    await this.db.run(
      sql`delete from object_writes where active=0 and created_at<${before.getTime()}`,
    );
    await this.db.run(
      sql`delete from object_deletes where done=1 and lease_until<${before.getTime()} and not exists(select 1 from purge_objects p join note_purges n on n.id=p.purge_id where p.storage_key=object_deletes.storage_key and n.state!='succeeded') and not exists(select 1 from object_write_keys k join object_writes w on w.id=k.write_id where k.storage_key=object_deletes.storage_key and w.active=1)`,
    );
  }
}

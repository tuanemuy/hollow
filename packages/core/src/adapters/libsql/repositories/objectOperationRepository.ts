import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwnership } from "@repo/core/domain/note/ownership";
import type { WriteOwner } from "@repo/core/domain/purge/entity";
import type { ObjectOperationRepository } from "@repo/core/domain/purge/ports/purgeRepository";
import { and, eq, ne, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { objectDeletes, objectWriteKeys, objectWrites } from "../purgeSchema";
import { currentPdfAnonymousDemand } from "./pdfAnonymousHelpers";
import { currentAnyPdfDemand } from "./pdfDemandRepository";
import { currentPdfDemand } from "./pdfHelpers";
import { currentZipRead } from "./zipHelpers";
import { currentZipPdfAttempt } from "./zipPdfHelpers";

const stopped = () =>
  new BusinessRuleError(
    "OBJECT_FENCED",
    "対象の保存処理は終了しています。最新の状態を確認してください。",
  );
export class LibsqlObjectOperationRepository
  implements ObjectOperationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  private async ownerActive(owner: WriteOwner, now: Date) {
    if (owner.kind === "drive-backup")
      return (
        (
          await this.db.all(
            sql`select 1 from drive_backup_transfers t join notes n on n.id=t.note_id join originals o on o.id=json_extract(t.identity,'$.originalId') join drive_connections d on d.account_id=t.account_id join accounts a on a.id=t.account_id where t.id=${owner.id} and t.owner_state='active' and t.cancel_generation=0 and t.deadline_at>${now.getTime()} and t.phase not in ('succeeded','failed','cancelled') and n.lifecycle='active' and n.ownership_generation=json_extract(t.identity,'$.ownershipGeneration') and o.note_id=n.id and o.storage_key=json_extract(t.identity,'$.storageKey') and o.bytes=json_extract(t.identity,'$.bytes') and o.sha256=json_extract(t.identity,'$.sha256') and d.state='linked' and d.epoch=t.epoch and json_extract(d.credential,'$.subject')=json_extract(t.identity,'$.subject') and json_extract(d.folder,'$.id')=json_extract(t.identity,'$.folder.id') and a.verified_at is not null and ((n.owner_workspace_id is null and n.owner_account_id=t.account_id) or (n.owner_workspace_id is not null and exists(select 1 from workspaces w join workspace_members m on m.workspace_id=w.id where w.id=n.owner_workspace_id and w.state='active' and m.account_id=t.account_id and m.role in ('owner','editor'))))`,
          )
        ).length > 0 &&
        (
          await this.db.all(
            sql`select 1 from drive_backup_transfers t join drive_backup_target_heads h on h.target_id=t.target_id where t.id=${owner.id}`,
          )
        ).length === 1
      );
    if (owner.kind === "llm-pdf-preview")
      return (
        (
          await this.db.all(
            sql`select 1 from llm_pdf_previews p join notes n on n.id=p.note_id join originals o on o.id=p.original_id join openrouter_connections c on c.account_id=p.account_id join accounts a on a.id=p.account_id where p.id=${owner.id} and p.state='running' and p.owner_state='active' and p.cancel_generation=0 and p.expires_at>${now.getTime()} and n.lifecycle='active' and n.version=p.note_version and n.ownership_generation=p.ownership_generation and o.note_id=n.id and o.sha256=p.source_sha256 and o.bytes=p.source_bytes and o.format='pdf' and c.state='linked' and c.epoch=p.credential_epoch and (c.key_expires_at is null or c.key_expires_at>${now.getTime()}) and a.verified_at is not null and ((n.owner_workspace_id is null and n.owner_account_id=p.account_id) or (n.owner_workspace_id is not null and exists(select 1 from workspaces w join workspace_members m on m.workspace_id=w.id where w.id=n.owner_workspace_id and w.state='active' and m.account_id=p.account_id and m.role in ('owner','editor'))))`,
          )
        ).length > 0
      );
    if (owner.kind === "zip-source")
      return (
        (
          await this.db.all(
            sql`select 1 from zip_pdf_holds h join zip_attempts p on p.id=h.attempt_id join pdf_artifacts a on a.id=h.artifact_id where h.attempt_id=${owner.id} and h.state='reading' and p.pdf_phase='copying' and a.state in('ready','cleanup') and a.file is not null and a.storage_key is not null and a.generation=h.artifact_generation and ${currentZipPdfAttempt(owner.id, now)}`,
          )
        ).length > 0
      );
    if (owner.kind === "zip-spool")
      return (
        (
          await this.db.all(
            sql`select 1 from zip_spools s join zip_attempts p on p.id=s.attempt_id join zip_runs r on r.request_id=p.request_id and r.generation=p.generation join zip_requests q on q.id=r.request_id join zip_targets t on t.request_id=p.request_id and t.ordinal=p.ordinal where s.id=${owner.id} and s.state='writing' and p.state='running' and r.state='running' and r.lease_until>${now.getTime()} and r.deadline_at>${now.getTime()} and q.generation=r.generation and q.cancel_generation<r.generation and q.state='active' and not exists(select 1 from json_each(r.exclusions) e where json_extract(e.value,'$.ordinal')=p.ordinal) and ${currentZipRead(sql`t.live_note_id`, sql`r.account_id`)}`,
          )
        ).length > 0
      );
    if (owner.kind === "zip-assembly")
      return (
        (
          await this.db.all(
            sql`select 1 from zip_assemblies a join zip_runs r on r.request_id=a.request_id and r.generation=a.generation join zip_requests q on q.id=r.request_id where a.id=${owner.id} and a.state='writing' and r.state='assembling' and r.lease_until>${now.getTime()} and r.deadline_at>${now.getTime()} and q.generation=r.generation and q.cancel_generation<r.generation and q.state='assembling' and not exists(select 1 from json_each(a.ordinals) e where not exists(select 1 from zip_targets t join zip_spool_refs f on f.request_id=t.request_id and f.ordinal=t.ordinal and f.generation=r.generation join zip_spools s on s.id=f.spool_id where t.request_id=r.request_id and t.ordinal=e.value and s.state='ready' and ${currentZipRead(sql`t.live_note_id`, sql`r.account_id`)}) or exists(select 1 from json_each(r.exclusions) x where json_extract(x.value,'$.ordinal')=e.value))`,
          )
        ).length > 0
      );
    if (owner.kind === "zip-delivery")
      return (
        (
          await this.db.all(
            sql`select 1 from zip_deliveries d join zip_artifacts a on a.id=d.artifact_id where d.id=${owner.id} and d.state='sending' and d.expires_at>${now.getTime()} and a.state='ready' and a.expires_at>${now.getTime()} and a.generation=d.artifact_generation and exists(select 1 from zip_artifact_entries e where e.artifact_id=a.id) and not exists(select 1 from zip_artifact_entries e where e.artifact_id=a.id and not ${currentZipRead(sql`e.live_note_id`, sql`d.account_id`)})`,
          )
        ).length > 0
      );
    const query =
      owner.kind === "pdf-artifact"
        ? sql`select 1 from pdf_artifacts a join pdf_computations c on c.id=a.compute_id where a.id=${owner.id} and a.state='writing' and c.state='running' and c.lease_until>${now.getTime()} and c.deadline_at>${now.getTime()} and ${currentAnyPdfDemand(sql`c.id`, now)}`
        : owner.kind === "pdf-delivery"
          ? sql`select 1 from pdf_deliveries d join pdf_artifacts a on a.id=d.artifact_id where d.id=${owner.id} and d.state='sending' and d.expires_at>${now.getTime()} and a.state='ready' and a.expires_at>${now.getTime()} and exists(select 1 from pdf_requests where id=d.request_id and account_id=d.account_id and state='succeeded' and ${currentPdfDemand})`
          : owner.kind === "pdf-anonymous-delivery"
            ? sql`select 1 from pdf_anonymous_deliveries d join pdf_artifacts a on a.id=d.artifact_id where d.id=${owner.id} and d.state='sending' and d.expires_at>${now.getTime()} and a.state='ready' and a.expires_at>${now.getTime()} and exists(select 1 from pdf_anonymous_requests where id=d.request_id and state='succeeded' and ${currentPdfAnonymousDemand(now)})`
            : owner.kind === "profile-icon-upload"
              ? sql`select 1 from account_profile_icons i join account_public_profiles p on p.account_id=i.account_id join sessions s on s.token_hash=i.session_hash and s.account_id=i.account_id join accounts a on a.id=i.account_id where i.id=${owner.id} and i.state in ('processing','writing') and i.expires_at>${now.getTime()} and s.expires_at>${now.getTime()} and a.verified_at is not null and p.version=i.profile_version`
              : owner.kind === "export-operation"
                ? sql`select 1 from export_operations e join notes n on n.id=e.note_id where e.id=${owner.id} and e.state in('preparing','sending') and n.lifecycle='active' and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))`
                : owner.kind === "icon-upload"
                  ? sql`select 1 from workspace_icons i join workspaces w on w.id=i.workspace_id join workspace_members m on m.workspace_id=w.id and m.account_id=i.actor_id where i.id=${owner.id} and i.state in ('processing','writing') and w.state='active' and m.role='owner' and w.settings_version=i.settings_version`
                  : owner.kind === "media-upload"
                    ? sql`select 1 from media_uploads u join media_drafts d on d.id=u.draft_id left join notes n on n.id=d.note_id where u.id=${owner.id} and u.state in ('awaiting','uploading') and ((d.note_id is null and (d.workspace_id is null or exists(select 1 from workspaces w where w.id=d.workspace_id and w.state='active'))) or (d.note_id is not null and n.lifecycle='active' and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))))`
                    : owner.kind === "import-upload"
                      ? sql`select 1 from upload_reservations u join source_bundles b on b.id=u.batch_id where u.id=${owner.id} and u.state in ('awaiting','uploading') and b.sealed=0 and (b.workspace_id is null or exists(select 1 from workspaces w where w.id=b.workspace_id and w.state='active'))`
                      : owner.kind === "reference-job"
                        ? sql`select 1 from reference_jobs j join notes n on n.id=j.note_id where j.id=${owner.id} and j.state='running' and n.lifecycle='active' and j.ownership_generation=n.ownership_generation and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))`
                        : sql`select 1 from conversion_jobs j join notes n on n.id=j.note_id where j.id=${owner.id} and j.state='running' and n.lifecycle='active' and (n.owner_workspace_id is null or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))`;
    return (await this.db.all(query)).length > 0;
  }
  async beginWrite(id: string, runtime: string, owner: WriteOwner, now: Date) {
    if (!(await this.ownerActive(owner, now))) throw stopped();
    const [scope] = await this.db.all<{
      note_id: string;
      ownership_generation: number;
    }>(
      sql`select n.id note_id,n.ownership_generation from notes n where
        (${owner.kind}='drive-backup' and exists(select 1 from drive_backup_transfers t where t.id=${owner.id} and t.note_id=n.id and json_extract(t.identity,'$.ownershipGeneration')=n.ownership_generation))
        or (${owner.kind}='media-upload' and exists(select 1 from media_uploads u join media_drafts d on d.id=u.draft_id where u.id=${owner.id} and d.note_id=n.id))
        or (${owner.kind}='reference-job' and exists(select 1 from reference_jobs j where j.id=${owner.id} and j.note_id=n.id))
        or (${owner.kind}='conversion-job' and exists(select 1 from conversion_jobs j where j.id=${owner.id} and j.note_id=n.id))
        or (${owner.kind}='llm-pdf-preview' and exists(select 1 from llm_pdf_previews p where p.id=${owner.id} and p.note_id=n.id and p.ownership_generation=n.ownership_generation))`,
    );
    const ownership: NoteOwnership = scope
      ? {
          kind: "bound",
          noteId: scope.note_id,
          generation: scope.ownership_generation,
        }
      : { kind: "unbound" };
    await this.db.insert(objectWrites).values({
      id,
      runtime,
      kind: owner.kind,
      ownerId: owner.id,
      active: true,
      createdAt: now,
      noteId: ownership.kind === "bound" ? ownership.noteId : null,
      ownershipGeneration:
        ownership.kind === "bound" ? ownership.generation : null,
    });
  }
  async endWrite(id: string) {
    await this.db
      .update(objectWrites)
      .set({ active: false })
      .where(eq(objectWrites.id, id));
  }
  async recoverWrites(runtime: string) {
    await this.db
      .update(objectWrites)
      .set({ active: false })
      .where(ne(objectWrites.runtime, runtime));
    await this.db.delete(objectDeletes).where(eq(objectDeletes.done, false));
  }
  async canPublish(id: string, now: Date) {
    const [row] = await this.db
      .select()
      .from(objectWrites)
      .where(eq(objectWrites.id, id));
    return Boolean(
      row?.active &&
        (row.noteId === null ||
          (
            await this.db.all(
              sql`select 1 from notes where id=${row.noteId} and ownership_generation=${row.ownershipGeneration}`,
            )
          ).length > 0) &&
        (await this.ownerActive({ kind: row.kind, id: row.ownerId }, now)),
    );
  }
  async registerKey(id: string, key: string, now: Date) {
    if (!(await this.canPublish(id, now))) throw stopped();
    const [deleted] = await this.db
      .select()
      .from(objectDeletes)
      .where(eq(objectDeletes.key, key));
    if (deleted && (!deleted.done || deleted.writerId !== id)) throw stopped();
    if (deleted)
      await this.db
        .delete(objectDeletes)
        .where(
          and(
            eq(objectDeletes.key, key),
            eq(objectDeletes.token, deleted.token),
          ),
        );
    await this.db
      .insert(objectWriteKeys)
      .values({ writeId: id, key })
      .onConflictDoNothing();
  }
  async claimDelete(
    key: string,
    token: string,
    writerId: string | null,
    now: Date,
    until: Date,
  ) {
    if (
      (
        await this.db.all(
          sql`select 1 from drive_backup_transfers t where json_extract(t.identity,'$.storageKey')=${key} and (t.read_pinned=1 or t.owner_state in ('active','unknown') or t.phase not in ('succeeded','failed','cancelled')) limit 1`,
        )
      ).length > 0
    )
      return false;
    const busy = await this.db.all(
      sql`select 1 from object_write_keys k join object_writes w on w.id=k.write_id where k.storage_key=${key} and w.active=1 and w.id != ${writerId ?? ""} limit 1`,
    );
    if (busy.length) return false;
    if (
      (
        await this.db.all(
          sql`select 1 from llm_pdf_previews p join originals o on o.id=p.original_id where o.storage_key=${key} and (p.state in ('queued','running','unknown') or p.owner_state in ('active','unknown')) limit 1`,
        )
      ).length
    )
      return false;
    if (
      (
        await this.db.all(
          sql`select 1 from pdf_artifacts a join zip_pdf_holds h on h.artifact_id=a.id where a.storage_key=${key} and h.state!='released' limit 1`,
        )
      ).length
    )
      return false;
    const retained = await this.db.all(
      sql`select 1 from zip_spools s where s.storage_key=${key} and exists(select 1 from zip_spool_refs f where f.spool_id=s.id) union all select 1 from zip_artifacts a where a.storage_key=${key} and (a.state='ready' or exists(select 1 from zip_deliveries d where d.artifact_id=a.id and d.state!='closed')) union all select 1 from zip_assemblies a where a.storage_key=${key} and a.state!='closed' limit 1`,
    );
    if (retained.length) return false;
    const [old] = await this.db
      .select()
      .from(objectDeletes)
      .where(eq(objectDeletes.key, key));
    if (old && !old.done && old.until > now) return false;
    await this.db
      .insert(objectDeletes)
      .values({ key, token, writerId, until, done: false })
      .onConflictDoUpdate({
        target: objectDeletes.key,
        set: { token, writerId, until, done: false },
      });
    return true;
  }
  async finishDelete(key: string, token: string) {
    return (
      (
        await this.db
          .update(objectDeletes)
          .set({ done: true })
          .where(
            and(eq(objectDeletes.key, key), eq(objectDeletes.token, token)),
          )
          .returning()
      ).length > 0
    );
  }
  async releaseDelete(key: string, token: string) {
    await this.db
      .delete(objectDeletes)
      .where(
        and(
          eq(objectDeletes.key, key),
          eq(objectDeletes.token, token),
          eq(objectDeletes.done, false),
        ),
      );
  }
}

import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import type { ScopeCapacityRepository } from "@repo/core/domain/workspace/ports/workspaceRepository";
import { type SQL, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";

export function scopeCondition(scope: NoteOwner, workspace: SQL, account: SQL) {
  return scope.kind === "workspace"
    ? sql`${workspace}=${scope.workspaceId}`
    : sql`${workspace} is null and ${account}=${scope.accountId}`;
}
export function scopeCapacityQuery(scope: NoteOwner, now: Date) {
  const match = scopeCondition(scope, sql`r.workspace_id`, sql`r.account_id`);
  const holdingKind = scope.kind;
  const holdingId =
    scope.kind === "workspace" ? scope.workspaceId : scope.accountId;
  return sql`
      select coalesce(sum(bytes),0) bytes from (
        select r.bytes from (
          select o.bytes,n.owner_workspace_id workspace_id,n.owner_account_id account_id from originals o join notes n on n.id=o.note_id
          union all
          select a.bytes,case when n.id is not null then n.owner_workspace_id else d.workspace_id end,case when n.id is not null then n.owner_account_id else coalesce(d.account_id,a.account_id) end
          from assets a left join media_drafts d on d.id=a.draft_id left join notes n on n.id=coalesce(a.source_note_id,d.note_id)
          union all
          select u.bytes,b.workspace_id,u.account_id from upload_reservations u join import_batches b on b.id=u.batch_id
          where u.state='uploading' or (u.state='awaiting' and u.expires_at>${now.getTime()}) or (u.state in ('failed','cancelled') and u.storage_cleaned=0)
          union all
          select u.bytes,case when n.id is not null then n.owner_workspace_id else d.workspace_id end,case when n.id is not null then n.owner_account_id else d.account_id end
          from media_uploads u join media_drafts d on d.id=u.draft_id left join notes n on n.id=d.note_id
          where u.state='uploading' or (u.state='awaiting' and u.expires_at>${now.getTime()}) or (u.state='failed' and u.storage_cleaned=0)
          union all
          select o.bytes,n.owner_workspace_id,n.owner_account_id
          from reference_objects o left join reference_jobs j on j.id=o.job_id left join notes n on n.id=j.note_id where o.state in ('reserved','written')
          union all
          select i.bytes,i.workspace_id,i.actor_id from workspace_icons i
          union all
          select i.bytes,null,i.account_id from account_profile_icons i
        ) r where ${match}
        union all
        select c.bytes from companion_sources c where exists(select 1 from bundle_scope_holdings h where h.bundle_id=c.bundle_id and h.scope_kind=${holdingKind} and h.scope_id=${holdingId} and h.note_holds+h.admission_holds+h.cleanup_holds>0)
      )`;
}
export const scopeCapacityIntegrityQuery = () =>
  sql`select 1 invalid where exists(select 1 from assets a left join media_drafts d on d.id=a.draft_id left join notes n on n.id=coalesce(a.source_note_id,d.note_id) where (a.source_note_id is not null or d.note_id is not null) and n.id is null) or exists(select 1 from media_uploads u join media_drafts d on d.id=u.draft_id left join notes n on n.id=d.note_id where d.note_id is not null and n.id is null) or exists(select 1 from reference_objects o left join reference_jobs j on j.id=o.job_id left join notes n on n.id=j.note_id where o.state in ('reserved','written') and n.id is null)`;
export const invalidCapacityProvenance = () =>
  new SystemError(
    SystemErrorCode.DataIntegrityError,
    "保存容量の所有記録を確認できません。",
  );
export class LibsqlScopeCapacityRepository implements ScopeCapacityRepository {
  constructor(private readonly db: HollowTransaction) {}
  async usedBytes(scope: NoteOwner, now: Date) {
    if ((await this.db.all(scopeCapacityIntegrityQuery())).length)
      throw invalidCapacityProvenance();
    const rows = await this.db.all<{ bytes: number }>(
      scopeCapacityQuery(scope, now),
    );
    return Number(rows[0]?.bytes ?? 0);
  }
}

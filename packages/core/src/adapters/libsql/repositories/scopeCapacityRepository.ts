import type { NoteOwner } from "@repo/core/domain/note/entity";
import type { ScopeCapacityRepository } from "@repo/core/domain/workspace/ports/workspaceRepository";
import { type SQL, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";

export function scopeCondition(scope: NoteOwner, workspace: SQL, account: SQL) {
  return scope.kind === "workspace"
    ? sql`${workspace}=${scope.workspaceId}`
    : sql`${workspace} is null and ${account}=${scope.accountId}`;
}
export class LibsqlScopeCapacityRepository implements ScopeCapacityRepository {
  constructor(private readonly db: HollowTransaction) {}
  async usedBytes(scope: NoteOwner, now: Date) {
    const match = scopeCondition(scope, sql`r.workspace_id`, sql`r.account_id`);
    const noteMatch = scopeCondition(
      scope,
      sql`n.owner_workspace_id`,
      sql`n.owner_account_id`,
    );
    const bundleMatch = scopeCondition(
      scope,
      sql`b.workspace_id`,
      sql`b.account_id`,
    );
    const rows = await this.db.all<{ bytes: number }>(sql`
      select coalesce(sum(bytes),0) bytes from (
        select r.bytes from (
          select o.bytes,n.owner_workspace_id workspace_id,n.owner_account_id account_id from originals o join notes n on n.id=o.note_id
          union all
          select a.bytes,coalesce(n.owner_workspace_id,d.workspace_id),case when n.id is not null then n.owner_account_id else coalesce(d.account_id,a.account_id) end
          from assets a left join media_drafts d on d.id=a.draft_id left join notes n on n.id=coalesce(a.source_note_id,d.note_id)
          union all
          select u.bytes,b.workspace_id,u.account_id from upload_reservations u join import_batches b on b.id=u.batch_id
          where u.state='uploading' or (u.state='awaiting' and u.expires_at>${now.getTime()}) or (u.state in ('failed','cancelled') and u.storage_cleaned=0)
          union all
          select u.bytes,coalesce(n.owner_workspace_id,d.workspace_id),case when n.id is not null then n.owner_account_id else d.account_id end
          from media_uploads u join media_drafts d on d.id=u.draft_id left join notes n on n.id=d.note_id
          where u.state='uploading' or (u.state='awaiting' and u.expires_at>${now.getTime()}) or (u.state='failed' and u.storage_cleaned=0)
          union all
          select o.bytes,coalesce(n.owner_workspace_id,o.workspace_id),case when n.id is not null then n.owner_account_id else o.account_id end
          from reference_objects o left join reference_jobs j on j.id=o.job_id left join notes n on n.id=j.note_id where o.state in ('reserved','written')
        ) r where ${match}
        union all
        select c.bytes from companion_sources c join source_bundles b on b.id=c.bundle_id where
          exists(select 1 from reference_settings s join notes n on n.id=s.note_id where s.bundle_id=b.id and ${noteMatch})
          or ((${bundleMatch}) and (not exists(select 1 from reference_settings s where s.bundle_id=b.id) or b.sealed=0 or exists(select 1 from upload_reservations u where u.batch_id=b.id and u.state in ('awaiting','uploading'))))
      )`);
    return Number(rows[0]?.bytes ?? 0);
  }
}

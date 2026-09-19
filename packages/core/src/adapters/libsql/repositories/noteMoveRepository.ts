import { moveAmounts } from "@repo/core/application/move/expected";
import type {
  BundleHolding,
  MoveAudiencePage,
  MoveExpected,
  MoveResources,
  MoveScope,
  MoveTagMapping,
  NoteMoveRepository,
} from "@repo/core/application/move/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { tagScopeKey } from "@repo/core/domain/tag/entity";
import { type SQL, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { scopeCondition } from "./scopeCapacityRepository";

const changed = () =>
  new BusinessRuleError(
    "MOVE_CHANGED",
    "移動条件が変わりました。最新の影響を確認し直してください。",
  );
const kind = (s: NoteOwner) => s.kind;
const id = (s: NoteOwner) =>
  s.kind === "workspace" ? s.workspaceId : s.accountId;
const owner = (workspace: string | null, account: string | null): NoteOwner => {
  if (workspace && !account)
    return { kind: "workspace", workspaceId: workspace };
  if (!workspace && account) return { kind: "personal", accountId: account };
  throw new BusinessRuleError(
    "MOVE_PROVENANCE",
    "保存先の記録を確認できません。移動は行っていません。",
  );
};
export class LibsqlNoteMoveRepository implements NoteMoveRepository {
  constructor(private readonly db: HollowTransaction) {}
  private async scope(s: NoteOwner): Promise<MoveScope> {
    if (s.kind === "personal")
      return { owner: s, name: "個人のスペース", membershipRevision: 0 };
    const [w] = await this.db.all<{
      name: string;
      membership_revision: number;
    }>(
      sql`select name,membership_revision from workspaces where id=${s.workspaceId} and state='active'`,
    );
    if (!w) throw changed();
    return {
      owner: s,
      name: w.name,
      membershipRevision: w.membership_revision,
    };
  }
  async destinations(
    accountId: string,
    source: NoteOwner,
    after: string | undefined,
  ) {
    const rows = await this.db.all<{
      id: string;
      name: string;
      membership_revision: number;
    }>(
      sql`select w.id,w.name,w.membership_revision from workspaces w join workspace_members m on m.workspace_id=w.id and m.account_id=${accountId} where w.state='active' and m.role in ('owner','editor') and w.id!=${source.kind === "workspace" ? source.workspaceId : ""} and w.id>${after ?? ""} order by w.id limit 51`,
    );
    const items: MoveScope[] = [];
    if (
      !after &&
      !(source.kind === "personal" && source.accountId === accountId)
    )
      items.push(await this.scope({ kind: "personal", accountId }));
    const room = 50 - items.length;
    for (const w of rows.slice(0, room))
      items.push({
        owner: { kind: "workspace", workspaceId: w.id },
        name: w.name,
        membershipRevision: w.membership_revision,
      });
    return {
      items,
      next: rows.length > room ? (rows[room - 1]?.id ?? null) : null,
    };
  }
  private async holding(
    bundleId: string,
    scope: NoteOwner,
  ): Promise<BundleHolding> {
    const [h] = await this.db.all<{
      revision: number;
      note_holds: number;
      admission_holds: number;
      cleanup_holds: number;
    }>(
      sql`select revision,note_holds,admission_holds,cleanup_holds from bundle_scope_holdings where bundle_id=${bundleId} and scope_kind=${kind(scope)} and scope_id=${id(scope)}`,
    );
    return h
      ? {
          kind: "present",
          revision: h.revision,
          noteHolds: h.note_holds,
          admissionHolds: h.admission_holds,
          cleanupHolds: h.cleanup_holds,
        }
      : { kind: "absent" };
  }
  async inspect(
    noteId: string,
    destination: NoteOwner,
    now: Date,
  ): Promise<MoveExpected> {
    const [n] = await this.db.all<{
      owner_account_id: string | null;
      owner_workspace_id: string | null;
      version: number;
      ownership_generation: number;
      resource_revision: number;
    }>(
      sql`select owner_account_id,owner_workspace_id,version,ownership_generation,resource_revision from notes where id=${noteId} and lifecycle='active'`,
    );
    if (!n) throw changed();
    const source = owner(n.owner_workspace_id, n.owner_account_id);
    const destKey = tagScopeKey(destination);
    const rows = await this.db.all<{
      id: string;
      key: string;
      name: string;
      target_id: string | null;
      target_key: string | null;
      target_name: string | null;
    }>(
      sql`select t.id,t.normalized_key key,t.name,d.id target_id,d.normalized_key target_key,d.name target_name from note_tags nt join tags t on t.id=nt.tag_id left join tags d on d.scope_key=${destKey} and d.normalized_key=t.normalized_key where nt.note_id=${noteId} order by t.id limit 51`,
    );
    if (rows.length > 50) throw changed();
    const tags: MoveTagMapping[] = rows.map((t) => ({
      source: { id: t.id, key: t.key, name: t.name },
      destination:
        t.target_id && t.target_key && t.target_name
          ? { id: t.target_id, key: t.target_key, name: t.target_name }
          : null,
    }));
    const amounts = await this.db.all<{
      kind: keyof MoveResources;
      count: number;
      bytes: number;
    }>(sql`
      select kind,count(*) count,coalesce(sum(bytes),0) bytes from (
       select 'originals' kind,o.bytes from originals o where o.note_id=${noteId}
       union all select case when exists(select 1 from note_asset_references p where p.asset_id=a.id and p.note_id=${noteId} and p.version=0) then 'currentAssets' when exists(select 1 from note_asset_references p where p.asset_id=a.id and p.note_id=${noteId}) then 'heldAssets' else 'graceAssets' end,a.bytes from assets a left join media_drafts d on d.id=a.draft_id where a.source_note_id=${noteId} or d.note_id=${noteId}
       union all select 'mediaReservations',u.bytes from media_uploads u join media_drafts d on d.id=u.draft_id where d.note_id=${noteId} and (u.state='uploading' or (u.state='awaiting' and u.expires_at>${now.getTime()}) or (u.state='failed' and u.storage_cleaned=0))
       union all select 'referenceReservations',o.bytes from reference_objects o join reference_jobs j on j.id=o.job_id where j.note_id=${noteId} and o.state in ('reserved','written')
      ) group by kind`);
    const resources: Record<
      keyof MoveResources,
      { count: number; bytes: number }
    > = {
      originals: { count: 0, bytes: 0 },
      currentAssets: { count: 0, bytes: 0 },
      heldAssets: { count: 0, bytes: 0 },
      graceAssets: { count: 0, bytes: 0 },
      mediaReservations: { count: 0, bytes: 0 },
      referenceReservations: { count: 0, bytes: 0 },
    };
    for (const a of amounts)
      resources[a.kind] = { count: a.count, bytes: a.bytes };
    const [b] = await this.db.all<{
      id: string;
      content_revision: number;
      bytes: number;
    }>(
      sql`select b.id,b.content_revision,(select coalesce(sum(c.bytes),0) from companion_sources c where c.bundle_id=b.id) bytes from reference_settings s join source_bundles b on b.id=s.bundle_id where s.note_id=${noteId}`,
    );
    const bundle = b
      ? {
          id: b.id,
          contentRevision: b.content_revision,
          bytes: b.bytes,
          source: await this.holding(b.id, source),
          destination: await this.holding(b.id, destination),
        }
      : null;
    return {
      noteId,
      version: n.version,
      ownershipGeneration: n.ownership_generation,
      resourceRevision: n.resource_revision,
      source: await this.scope(source),
      destination: await this.scope(destination),
      normalizationVersion: "16.0.0",
      tags,
      resources,
      bundle,
      ...moveAmounts(resources, bundle),
    };
  }
  async bundleState(
    bundleId: string,
    source: NoteOwner,
    destination: NoteOwner,
  ) {
    const [b] = await this.db.all<{
      id: string;
      content_revision: number;
      bytes: number;
    }>(
      sql`select id,content_revision,(select coalesce(sum(bytes),0) from companion_sources where bundle_id=source_bundles.id) bytes from source_bundles where id=${bundleId}`,
    );
    return b
      ? {
          id: b.id,
          contentRevision: b.content_revision,
          bytes: b.bytes,
          source: await this.holding(b.id, source),
          destination: await this.holding(b.id, destination),
        }
      : null;
  }
  private members(scope: NoteOwner): SQL {
    return scope.kind === "personal"
      ? sql`select id from accounts where id=${scope.accountId}`
      : sql`select account_id id from workspace_members where workspace_id=${scope.workspaceId}`;
  }
  async audience(
    expected: MoveExpected,
    direction: "gained" | "lost",
    after: string | undefined,
  ): Promise<MoveAudiencePage> {
    const left = this.members(
      direction === "gained"
        ? expected.destination.owner
        : expected.source.owner,
    );
    const right = this.members(
      direction === "gained"
        ? expected.source.owner
        : expected.destination.owner,
    );
    const cte = sql`with audience as (${left} except ${right})`;
    const [count] = await this.db.all<{ count: number }>(
      sql`${cte} select count(*) count from audience`,
    );
    const rows = await this.db.all<{ id: string; label: string }>(
      sql`${cte} select a.id,a.email label from audience p join accounts a on a.id=p.id where a.id>${after ?? ""} order by a.id limit 51`,
    );
    return {
      direction,
      total: count?.count ?? 0,
      items: rows.slice(0, 50),
      next: rows.length > 50 ? (rows[49]?.id ?? null) : null,
    };
  }
  async hasConversion(noteId: string) {
    return (
      (
        await this.db.all(
          sql`select 1 from conversion_jobs where note_id=${noteId} and state in ('queued','running') limit 1`,
        )
      ).length > 0
    );
  }
  async interruptions(noteId: string) {
    const [r] = await this.db.all<{
      mediaUploads: number;
      referenceJobs: number;
    }>(
      sql`select (select count(*) from media_uploads u join media_drafts d on d.id=u.draft_id where d.note_id=${noteId} and u.state in ('awaiting','uploading')) mediaUploads,(select count(*) from reference_jobs where note_id=${noteId} and state in ('queued','running')) referenceJobs`,
    );
    return r ?? { mediaUploads: 0, referenceJobs: 0 };
  }
  async apply(expected: MoveExpected, now: Date) {
    const destination = expected.destination.owner;
    const rows = await this.db.all(
      sql`update notes set owner_account_id=${destination.kind === "personal" ? destination.accountId : null},owner_workspace_id=${destination.kind === "workspace" ? destination.workspaceId : null},version=version+1,ownership_generation=ownership_generation+1,
      display=case when json_extract(display,'$.initialization.kind')='reference' and exists(select 1 from reference_jobs j where j.note_id=notes.id and j.id=json_extract(notes.display,'$.initialization.jobId') and j.state in ('queued','running')) then json_set(display,'$.initialization',json('{"kind":"complete","reason":"interrupted"}')) else display end
      where id=${expected.noteId} and lifecycle='active' and version=${expected.version} and ownership_generation=${expected.ownershipGeneration} and resource_revision=${expected.resourceRevision} and ${scopeCondition(expected.source.owner, sql`owner_workspace_id`, sql`owner_account_id`)} returning id`,
    );
    if (!rows.length) throw changed();
    await this.db.run(
      sql`delete from note_tags where note_id=${expected.noteId}`,
    );
    for (const t of expected.tags)
      if (t.destination)
        await this.db.run(
          sql`insert into note_tags(note_id,tag_id) values(${expected.noteId},${t.destination.id})`,
        );
    await this.db.run(
      sql`update media_uploads set state='failed' where draft_id in(select id from media_drafts where note_id=${expected.noteId}) and (state='uploading' or (state='awaiting' and expires_at>${now.getTime()}))`,
    );
    await this.db.run(
      sql`update reference_jobs set state='cancelled',lease_token=null,lease_until=null,failure=null,cancel_requested=1,updated_at=${now.getTime()} where note_id=${expected.noteId} and state in ('queued','running')`,
    );
    await this.db.run(
      sql`update reference_settings set active_job_id=null where note_id=${expected.noteId}`,
    );
  }
}

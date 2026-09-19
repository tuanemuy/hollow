import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { tagScopeKey } from "@repo/core/domain/tag/entity";
import type {
  WorkspaceDeletionIntent,
  WorkspaceDeletionReceipt,
  WorkspaceDeletionResult,
} from "@repo/core/domain/workspace/deletion";
import type {
  WorkspaceDeletionRepository,
  WorkspaceDeletionResource,
} from "@repo/core/domain/workspace/ports/workspaceDeletionRepository";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  workspaceDeletions as intents,
  workspaceDeletionReceipts as receipts,
  workspaceDeletionNotes as targets,
} from "../workspaceDeletionSchema";

const corrupt = () =>
  new SystemError(
    SystemErrorCode.DataIntegrityError,
    "ワークスペース回収状態を確認できません。",
  );
function hydrate(row: typeof intents.$inferSelect): WorkspaceDeletionIntent {
  if (
    row.state === "running" &&
    row.leaseToken &&
    row.leaseUntil &&
    row.completedAt === null
  )
    return {
      ...row,
      state: "running",
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
      completedAt: null,
    };
  if (
    row.state === "queued" &&
    row.leaseToken === null &&
    row.leaseUntil === null &&
    row.completedAt === null
  )
    return {
      ...row,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      completedAt: null,
    };
  if (
    row.state === "succeeded" &&
    row.leaseToken === null &&
    row.leaseUntil === null &&
    row.completedAt
  )
    return {
      ...row,
      state: "succeeded",
      leaseToken: null,
      leaseUntil: null,
      completedAt: row.completedAt,
    };
  throw corrupt();
}

export class LibsqlWorkspaceDeletionRepository
  implements WorkspaceDeletionRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async receipt(accountId: string, requestId: string, since: Date) {
    return (
      (
        await this.db
          .select()
          .from(receipts)
          .where(
            and(
              eq(receipts.accountId, accountId),
              eq(receipts.requestId, requestId),
              gte(receipts.acceptedAt, since),
            ),
          )
      )[0] ?? null
    );
  }
  async result(
    receipt: WorkspaceDeletionReceipt,
  ): Promise<WorkspaceDeletionResult> {
    const intent = await this.find(receipt.intentId);
    if (!intent) throw corrupt();
    const [row] = await this.db.all<{ n: number }>(
      sql`select count(*) n from workspace_deletion_notes where intent_id=${intent.id} and completed_at is not null`,
    );
    return {
      requestId: receipt.requestId,
      name: receipt.name,
      acceptedAt: receipt.acceptedAt.toISOString(),
      state: intent.state === "succeeded" ? "succeeded" : "reclaiming",
      totalNotes: intent.totalNotes,
      completedNotes: Number(row?.n ?? 0),
      completedAt: intent.completedAt?.toISOString() ?? null,
      delayed: intent.lastFailure !== null,
    };
  }
  async page(
    accountId: string,
    since: Date,
    before: Readonly<{ at: Date; requestId: string }> | undefined,
    limit: number,
  ) {
    return this.db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.accountId, accountId),
          gte(receipts.acceptedAt, since),
          before
            ? sql`(${receipts.acceptedAt}<${before.at.getTime()} or (${receipts.acceptedAt}=${before.at.getTime()} and ${receipts.requestId}<${before.requestId}))`
            : undefined,
        ),
      )
      .orderBy(desc(receipts.acceptedAt), desc(receipts.requestId))
      .limit(limit);
  }
  async find(id: string) {
    const row = (
      await this.db.select().from(intents).where(eq(intents.id, id))
    )[0];
    return row ? hydrate(row) : null;
  }
  async accept(input: {
    id: string;
    workspaceId: string;
    accountId: string;
    requestId: string;
    name: string;
    now: Date;
  }) {
    const { id, workspaceId: ws, now } = input;
    const [count] = await this.db.all<{ n: number }>(
      sql`select count(*) n from notes where owner_workspace_id=${ws}`,
    );
    await this.db.insert(intents).values({
      id,
      workspaceId: ws,
      state: "queued",
      acceptedAt: now,
      updatedAt: now,
      nextAttemptAt: now,
      totalNotes: Number(count?.n ?? 0),
    });
    await this.db.insert(receipts).values({
      accountId: input.accountId,
      requestId: input.requestId,
      intentId: id,
      workspaceId: ws,
      name: input.name,
      acceptedAt: now,
    });
    const changed = await this.db.all(
      sql`update workspaces set state='deleted',creator_id=null,name=null,description=null,created_at=null,icon_id=null,settings_version=settings_version+1 where id=${ws} and state='active' returning id`,
    );
    if (changed.length !== 1) throw corrupt();
    const conversion = sql`select j.id from conversion_jobs j join notes n on n.id=j.note_id where n.owner_workspace_id=${ws} and j.state in ('queued','running')`;
    await this.db.run(
      sql`update originals set state='cancelled' where active_job_id in (${conversion})`,
    );
    await this.db.run(
      sql`update conversion_jobs set state='cancelled',lease_token=null,lease_until=null,failure=null,updated_at=${now.getTime()} where id in (${conversion})`,
    );
    await this.db.run(
      sql`update reference_settings set active_job_id=null where note_id in(select id from notes where owner_workspace_id=${ws})`,
    );
    await this.db.run(
      sql`update reference_jobs set state='cancelled',lease_token=null,lease_until=null,failure=null,cancel_requested=1,updated_at=${now.getTime()} where note_id in(select id from notes where owner_workspace_id=${ws}) and state in ('queued','running')`,
    );
    await this.db.run(
      sql`update note_batch_attempts set state='cancelled',lease_token=null,lease_until=null,failure=null,updated_at=${now.getTime()} where state in ('queued','running') and (note_id in(select id from notes where owner_workspace_id=${ws}) or exists(select 1 from note_batches b join notes n on n.id=note_batch_attempts.note_id where b.id=note_batch_attempts.parent_id and b.destination_workspace_id=${ws} and ((b.source_workspace_id is not null and n.owner_workspace_id=b.source_workspace_id) or (b.source_workspace_id is null and n.owner_workspace_id is null and n.owner_account_id=b.actor_id))))`,
    );
    await this.db.run(
      sql`update upload_reservations set state='cancelled',failure=null where batch_id in(select id from import_batches where workspace_id=${ws}) and state in ('awaiting','uploading')`,
    );
    await this.db.run(
      sql`update source_bundles set sealed=1 where workspace_id=${ws} and sealed=0`,
    );
    await this.db.run(
      sql`update media_uploads set state='failed' where state in ('awaiting','uploading') and draft_id in(select d.id from media_drafts d left join notes n on n.id=d.note_id where (d.note_id is null and d.workspace_id=${ws}) or n.owner_workspace_id=${ws})`,
    );
    await this.db.run(
      sql`update workspace_icons set state='cleanup',next_attempt_at=${now.getTime()} where workspace_id=${ws} and state!='cleanup'`,
    );
    await this.db.run(
      sql`delete from auth_continuations where invitation_id in(select id from workspace_invitations where workspace_id=${ws})`,
    );
    await this.db.run(
      sql`update workspace_invitations set state=case when state='pending' then 'cancelled' else state end,token_hash=null,envelope=null,delivery_snapshot=null,lease_token=null,lease_until=null,delivery_state='stopped',delivery_failure=null,terminal_at=coalesce(terminal_at,${now.getTime()}) where workspace_id=${ws}`,
    );
  }
  async claim(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(intents)
      .where(
        sql`(${intents.state}='queued' and ${intents.nextAttemptAt}<=${now.getTime()}) or (${intents.state}='running' and ${intents.leaseUntil}<=${now.getTime()})`,
      )
      .orderBy(asc(intents.nextAttemptAt), asc(intents.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(intents)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until,
        updatedAt: now,
        recoveries: row.recoveries + (row.state === "running" ? 1 : 0),
      })
      .where(
        and(
          eq(intents.id, row.id),
          sql`(${intents.state}='queued' and ${intents.nextAttemptAt}<=${now.getTime()}) or (${intents.state}='running' and ${intents.leaseUntil}<=${now.getTime()})`,
        ),
      )
      .returning();
    return claimed ? hydrate(claimed) : null;
  }
  private async live(id: string, token: string, now: Date) {
    const intent = await this.find(id);
    return intent?.state === "running" &&
      intent.leaseToken === token &&
      intent.leaseUntil > now
      ? intent
      : null;
  }
  async ownsNote(intentId: string, noteId: string) {
    return (
      (
        await this.db.all(
          sql`select 1 from workspace_deletions d join workspaces w on w.id=d.workspace_id and w.state='deleted' join notes n on n.owner_workspace_id=w.id where d.id=${intentId} and n.id=${noteId} and d.state!='succeeded' limit 1`,
        )
      ).length === 1
    );
  }
  async noteCandidates(id: string, token: string, now: Date, limit: number) {
    const intent = await this.live(id, token, now);
    if (!intent || intent.admissionComplete) return [];
    return (
      await this.db.all<{ id: string }>(
        sql`select id from notes where owner_workspace_id=${intent.workspaceId} and id>${intent.admissionCursor ?? ""} order by id limit ${limit}`,
      )
    ).map((row) => row.id);
  }
  async linkNote(
    intentId: string,
    noteId: string,
    purgeId: string,
    completedAt: Date | null,
  ) {
    if (!(await this.ownsNote(intentId, noteId))) throw corrupt();
    await this.db
      .insert(targets)
      .values({ intentId, noteId, purgeId, completedAt })
      .onConflictDoNothing();
  }
  async advance(
    id: string,
    token: string,
    cursor: string | null,
    exhausted: boolean,
    now: Date,
  ) {
    if (!(await this.live(id, token, now))) return false;
    await this.db
      .update(intents)
      .set({
        admissionCursor: cursor,
        admissionComplete: exhausted,
        updatedAt: now,
      })
      .where(eq(intents.id, id));
    return true;
  }
  async resources(
    id: string,
    token: string,
    now: Date,
    limit: number,
  ): Promise<readonly WorkspaceDeletionResource[]> {
    const intent = await this.live(id, token, now);
    if (!intent) return [];
    const ws = intent.workspaceId;
    const result: WorkspaceDeletionResource[] = [];
    const media = await this.db.all<{ id: string }>(
      sql`select u.id from media_uploads u join media_drafts d on d.id=u.draft_id where d.note_id is null and d.workspace_id=${ws} and u.state in ('awaiting','uploading','failed') and u.storage_cleaned=0 and not exists(select 1 from object_writes w where w.kind='media-upload' and w.owner_id=u.id and w.active=1) order by u.id limit ${limit}`,
    );
    for (const row of media)
      result.push({
        kind: "media-upload",
        id: row.id,
        keys: [`${row.id}_source`, `${row.id}_safe`],
      });
    if (result.length < limit) {
      const uploads = await this.db.all<{ id: string; storage_key: string }>(
        sql`select u.id,u.storage_key from upload_reservations u join import_batches b on b.id=u.batch_id where b.workspace_id=${ws} and u.state in ('failed','cancelled') and u.storage_cleaned=0 and not exists(select 1 from object_writes w where w.kind='import-upload' and w.owner_id=u.id and w.active=1) order by u.id limit ${limit - result.length}`,
      );
      for (const row of uploads)
        result.push({
          kind: "import-upload",
          id: row.id,
          keys: [row.storage_key],
        });
    }
    if (result.length < limit) {
      const assets = await this.db.all<{ id: string; storage_key: string }>(
        sql`select a.id,a.storage_key from assets a join media_drafts d on d.id=a.draft_id where d.note_id is null and a.source_note_id is null and d.workspace_id=${ws} and not exists(select 1 from note_asset_references r where r.asset_id=a.id) and not exists(select 1 from media_uploads u join object_writes w on w.kind='media-upload' and w.owner_id=u.id and w.active=1 where u.draft_id=d.id) order by a.id limit ${limit - result.length}`,
      );
      for (const row of assets)
        result.push({ kind: "asset", id: row.id, keys: [row.storage_key] });
    }
    if (result.length < limit) {
      const companions = await this.db.all<{ id: string; storage_key: string }>(
        sql`select c.id,c.storage_key from companion_sources c join source_bundles b on b.id=c.bundle_id where b.sealed=1 and exists(select 1 from bundle_scope_holdings h where h.bundle_id=b.id and h.scope_kind='workspace' and h.scope_id=${ws} and h.cleanup_holds>0) and not exists(select 1 from reference_settings s where s.bundle_id=b.id) and not exists(select 1 from upload_reservations u where u.batch_id=b.id and u.state in ('awaiting','uploading')) and not exists(select 1 from object_writes w join upload_reservations u on w.kind='import-upload' and w.owner_id=u.id where u.batch_id=b.id and w.active=1) order by c.id limit ${limit - result.length}`,
      );
      for (const row of companions)
        result.push({ kind: "companion", id: row.id, keys: [row.storage_key] });
    }
    return result;
  }
  async resourceReady(
    id: string,
    token: string,
    resource: WorkspaceDeletionResource,
    now: Date,
  ) {
    const candidates = await this.resources(id, token, now, 50);
    return candidates.some(
      (row) =>
        row.kind === resource.kind &&
        row.id === resource.id &&
        JSON.stringify(row.keys) === JSON.stringify(resource.keys),
    );
  }
  async completeResource(
    id: string,
    token: string,
    resource: WorkspaceDeletionResource,
    deleted: readonly { key: string; token: string }[],
    now: Date,
  ) {
    if (!(await this.resourceReady(id, token, resource, now))) return false;
    for (const key of resource.keys) {
      const claim = deleted.find((row) => row.key === key);
      if (
        !claim ||
        !(
          await this.db.all(
            sql`select 1 from object_deletes where storage_key=${key} and token=${claim.token} and done=1`,
          )
        ).length
      )
        return false;
    }
    if (resource.kind === "media-upload")
      await this.db.run(
        sql`update media_uploads set state='failed',storage_cleaned=1 where id=${resource.id}`,
      );
    else if (resource.kind === "import-upload")
      await this.db.run(
        sql`update upload_reservations set storage_cleaned=1 where id=${resource.id}`,
      );
    else if (resource.kind === "asset")
      await this.db.run(sql`delete from assets where id=${resource.id}`);
    else
      await this.db.run(
        sql`delete from companion_sources where id=${resource.id}`,
      );
    return true;
  }
  async finishStep(id: string, token: string, now: Date, limit: number) {
    const intent = await this.live(id, token, now);
    if (!intent) return false;
    const ws = intent.workspaceId;
    const scopeKey = tagScopeKey({ kind: "workspace", workspaceId: ws });
    await this.db.run(
      sql`delete from tags where id in(select id from tags where scope_key=${scopeKey} and not exists(select 1 from note_tags where tag_id=tags.id) order by id limit ${limit})`,
    );
    await this.db.run(
      sql`delete from workspace_members where rowid in(select rowid from workspace_members where workspace_id=${ws} limit ${limit})`,
    );
    await this.db.run(
      sql`delete from media_uploads where id in(select u.id from media_uploads u join media_drafts d on d.id=u.draft_id where d.workspace_id=${ws} and d.note_id is null and (u.storage_cleaned=1 or u.state='accepted') and not exists(select 1 from assets a where a.draft_id=d.id) and not exists(select 1 from object_writes w where w.kind='media-upload' and w.owner_id=u.id and w.active=1) limit ${limit})`,
    );
    await this.db.run(
      sql`delete from media_drafts where id in(select d.id from media_drafts d where d.workspace_id=${ws} and d.note_id is null and not exists(select 1 from assets a where a.draft_id=d.id) and not exists(select 1 from media_uploads u where u.draft_id=d.id) limit ${limit})`,
    );
    const pending = await this.db.all(
      sql`select 1 where exists(select 1 from notes where owner_workspace_id=${ws}) or exists(select 1 from tags where scope_key=${scopeKey}) or exists(select 1 from workspace_members where workspace_id=${ws}) or exists(select 1 from media_drafts where workspace_id=${ws} and note_id is null) or exists(select 1 from upload_reservations u join import_batches b on b.id=u.batch_id where b.workspace_id=${ws} and u.state in ('failed','cancelled') and u.storage_cleaned=0) or exists(select 1 from workspace_icons where workspace_id=${ws}) or exists(select 1 from bundle_scope_holdings h join companion_sources c on c.bundle_id=h.bundle_id where h.scope_kind='workspace' and h.scope_id=${ws} and h.cleanup_holds>0) or (select count(*) from workspace_deletion_notes where intent_id=${id} and completed_at is not null)!=${intent.totalNotes}`,
    );
    if (!intent.admissionComplete || pending.length) return false;
    await this.db
      .update(intents)
      .set({
        state: "succeeded",
        completedAt: now,
        updatedAt: now,
        leaseToken: null,
        leaseUntil: null,
        lastFailure: null,
      })
      .where(eq(intents.id, id));
    return true;
  }
  async defer(
    id: string,
    token: string,
    now: Date,
    failure: string | null,
    immediate: boolean,
  ) {
    await this.db
      .update(intents)
      .set({
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        updatedAt: now,
        lastFailure: failure,
        nextAttemptAt: new Date(
          now.getTime() + (failure ? 30_000 : immediate ? 0 : 2000),
        ),
      })
      .where(and(eq(intents.id, id), eq(intents.leaseToken, token)));
  }
  async pruneReceipts(before: Date, limit: number) {
    await this.db.run(
      sql`delete from workspace_deletion_receipts where rowid in(select rowid from workspace_deletion_receipts where accepted_at<${before.getTime()} order by accepted_at limit ${limit})`,
    );
  }
}

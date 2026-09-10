import { BusinessRuleError } from "@repo/core/domain/error";
import type { WriteOwner } from "@repo/core/domain/purge/entity";
import type { ObjectOperationRepository } from "@repo/core/domain/purge/ports/purgeRepository";
import { and, eq, ne, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { objectDeletes, objectWriteKeys, objectWrites } from "../purgeSchema";

const stopped = () =>
  new BusinessRuleError(
    "OBJECT_FENCED",
    "対象の保存処理は終了しています。最新の状態を確認してください。",
  );
export class LibsqlObjectOperationRepository
  implements ObjectOperationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  private async ownerActive(owner: WriteOwner) {
    const query =
      owner.kind === "icon-upload"
        ? sql`select 1 from workspace_icons i join workspaces w on w.id=i.workspace_id join workspace_members m on m.workspace_id=w.id and m.account_id=i.actor_id where i.id=${owner.id} and i.state in ('processing','writing') and w.state='active' and m.role='owner' and w.settings_version=i.settings_version`
        : owner.kind === "media-upload"
          ? sql`select 1 from media_uploads u join media_drafts d on d.id=u.draft_id left join notes n on n.id=d.note_id where u.id=${owner.id} and u.state in ('awaiting','uploading') and (d.note_id is null or n.lifecycle='active')`
          : owner.kind === "import-upload"
            ? sql`select 1 from upload_reservations u join source_bundles b on b.id=u.batch_id where u.id=${owner.id} and u.state in ('awaiting','uploading') and b.sealed=0`
            : owner.kind === "reference-job"
              ? sql`select 1 from reference_jobs j join notes n on n.id=j.note_id where j.id=${owner.id} and j.state='running' and n.lifecycle='active'`
              : sql`select 1 from conversion_jobs j join notes n on n.id=j.note_id where j.id=${owner.id} and j.state='running' and n.lifecycle='active'`;
    return (await this.db.all(query)).length > 0;
  }
  async beginWrite(id: string, runtime: string, owner: WriteOwner, now: Date) {
    if (!(await this.ownerActive(owner))) throw stopped();
    await this.db.insert(objectWrites).values({
      id,
      runtime,
      kind: owner.kind,
      ownerId: owner.id,
      active: true,
      createdAt: now,
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
  async canPublish(id: string) {
    const [row] = await this.db
      .select()
      .from(objectWrites)
      .where(eq(objectWrites.id, id));
    return Boolean(
      row?.active &&
        (await this.ownerActive({ kind: row.kind, id: row.ownerId })),
    );
  }
  async registerKey(id: string, key: string) {
    if (!(await this.canPublish(id))) throw stopped();
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
    const busy = await this.db.all(
      sql`select 1 from object_write_keys k join object_writes w on w.id=k.write_id where k.storage_key=${key} and w.active=1 and w.id != ${writerId ?? ""} limit 1`,
    );
    if (busy.length) return false;
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

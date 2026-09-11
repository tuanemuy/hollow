import { BusinessRuleError } from "@repo/core/domain/error";
import type { Tag } from "@repo/core/domain/tag/entity";
import type { TagRepository } from "@repo/core/domain/tag/ports/tagRepository";
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { noteTags, tags } from "../browseSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

export class LibsqlTagRepository implements TagRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    return (
      (await this.db.select().from(tags).where(eq(tags.id, id)))[0] ?? null
    );
  }
  async findByKey(scopeKey: string, key: string) {
    return (
      (
        await this.db
          .select()
          .from(tags)
          .where(and(eq(tags.scopeKey, scopeKey), eq(tags.normalizedKey, key)))
      )[0] ?? null
    );
  }
  async ensure(tag: Omit<Tag, "mutationRevision">) {
    await this.db
      .insert(tags)
      .values(tag)
      .onConflictDoNothing({ target: [tags.scopeKey, tags.normalizedKey] });
    const result = await this.findByKey(tag.scopeKey, tag.normalizedKey);
    if (!result)
      throw new BusinessRuleError(
        "TAG_CHANGED",
        "タグが変わりました。読み直してください。",
      );
    return result;
  }
  async selected(noteId: string) {
    return this.db
      .select(getTableColumns(tags))
      .from(tags)
      .innerJoin(noteTags, eq(noteTags.tagId, tags.id))
      .where(eq(noteTags.noteId, noteId))
      .orderBy(tags.normalizedKey, tags.id)
      .limit(51);
  }
  async attach(noteId: string, tagId: string) {
    const existing = await this.db
      .select()
      .from(noteTags)
      .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
    if (existing.length) return false;
    const inserted = await this.db.all(
      sql`insert into note_tags(note_id,tag_id) select n.id,t.id from notes n join tags t on t.id=${tagId} where n.id=${noteId} and n.lifecycle='active' and t.scope_key=case when n.owner_workspace_id is null then 'p:'||n.owner_account_id else 'w:'||n.owner_workspace_id end and (select count(*) from note_tags where note_id=n.id)<50 returning note_id`,
    );
    if (!inserted.length)
      throw new BusinessRuleError(
        "TAG_LIMIT",
        "1つのノートに付けられるタグは50個までです。",
      );
    return true;
  }
  async detach(noteId: string, tagId: string) {
    return (
      (
        await this.db
          .delete(noteTags)
          .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
          .returning()
      ).length > 0
    );
  }
  async counts(tagId: string, scopeKey: string) {
    const [row] = await this.db.all<{
      active: number;
      trashed: number;
      purging: number;
      total: number;
      invalid: number;
    }>(
      sql`select count(*) total,coalesce(sum(n.lifecycle='active'),0) active,coalesce(sum(n.lifecycle='trashed'),0) trashed,coalesce(sum(n.lifecycle='purging'),0) purging,coalesce(sum(n.id is null or (case when n.owner_workspace_id is null then 'p:'||n.owner_account_id else 'w:'||n.owner_workspace_id end)!=${scopeKey}),0) invalid from note_tags nt left join notes n on n.id=nt.note_id where nt.tag_id=${tagId}`,
    );
    if (!row || row.invalid)
      throw new BusinessRuleError(
        "TAG_RELATION",
        "タグの関係を確認できません。変更していません。",
      );
    return {
      active: Number(row.active),
      trashed: Number(row.trashed),
      purging: Number(row.purging),
      total: Number(row.total),
    };
  }
  async overlap(sourceId: string, targetId: string) {
    const [row] = await this.db.all<{ count: number }>(
      sql`select count(*) count from note_tags s join note_tags t on t.note_id=s.note_id and t.tag_id=${targetId} where s.tag_id=${sourceId}`,
    );
    return Number(row?.count ?? 0);
  }
  async rename(id: string, name: string, key: string, version: string) {
    await this.db
      .update(tags)
      .set({ name, normalizedKey: key, meaningVersion: version })
      .where(eq(tags.id, id));
  }
  async merge(sourceId: string, targetId: string) {
    await this.db.run(
      sql`delete from note_tags where tag_id=${sourceId} and note_id in(select note_id from note_tags where tag_id=${targetId})`,
    );
    await this.db
      .update(noteTags)
      .set({ tagId: targetId })
      .where(eq(noteTags.tagId, sourceId));
    await this.delete(sourceId);
  }
  async delete(id: string) {
    await this.db.delete(tags).where(eq(tags.id, id));
  }
}

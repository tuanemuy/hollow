import type { InValue, Row, Transaction } from "@libsql/client";
import type { TagNormalizerPort } from "@repo/core/application/browse/ports";
import { ForbiddenError, NotFoundError } from "@repo/core/application/errors";
import type {
  TagReadInput,
  TagReadResult,
} from "@repo/core/application/tag/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { type TagSummary, tagScopeKey } from "@repo/core/domain/tag/entity";
import { z } from "zod";

const columns = `t.id,t.name,t.normalized_key,t.meaning_version,t.mutation_revision,
 (select count(*) from note_tags r where r.tag_id=t.id) total,
 (select count(*) from note_tags r join notes n on n.id=r.note_id where r.tag_id=t.id and n.lifecycle='active') active,
 (select count(*) from note_tags r join notes n on n.id=r.note_id where r.tag_id=t.id and n.lifecycle='trashed') trashed,
 (select count(*) from note_tags r join notes n on n.id=r.note_id where r.tag_id=t.id and n.lifecycle='purging') purging,
 (select count(*) from note_tags r left join notes n on n.id=r.note_id where r.tag_id=t.id and (n.id is null or (case when n.owner_workspace_id is null then 'p:'||n.owner_account_id else 'w:'||n.owner_workspace_id end)!=t.scope_key)) invalid`;
function summary(r: Row): TagSummary {
  if (Number(r.invalid))
    throw new BusinessRuleError(
      "TAG_RELATION",
      "タグの関係を確認できません。変更していません。",
    );
  return {
    id: String(r.id),
    name: String(r.name),
    key: String(r.normalized_key),
    normalizationVersion: String(r.meaning_version),
    revision: Number(r.mutation_revision),
    active: Number(r.active),
    trashed: Number(r.trashed),
    purging: Number(r.purging),
    total: Number(r.total),
  };
}
const pageCursor = z
  .object({
    identity: z.string().max(2400),
    key: z.string().max(800),
    id: z.string().max(64),
    active: z.number().int().nonnegative(),
  })
  .strict();
export async function tagReadSnapshot(
  tx: Transaction,
  input: TagReadInput,
  scope: NoteOwner,
  name: string,
  canEdit: boolean,
  normalizer: TagNormalizerPort,
): Promise<TagReadResult> {
  if (!canEdit)
    throw new ForbiddenError(
      "TAG_EDIT_REQUIRED",
      "タグの編集権限がありません。",
    );
  const scopeKey = tagScopeKey(scope);
  const find = async (id: string) => {
    const r = (
      await tx.execute({
        sql: `select ${columns} from tags t where t.id=? and t.scope_key=? and t.meaning_version=?`,
        args: [id, scopeKey, normalizer.version],
      })
    ).rows[0];
    if (!r)
      throw new NotFoundError(
        "TAG_NOT_FOUND",
        "タグが見つからないか、操作できません。",
      );
    return summary(r);
  };
  if (input.purpose === "impact") {
    const source = await find(input.sourceId);
    const target = input.targetId ? await find(input.targetId) : null;
    const overlap = target
      ? Number(
          (
            await tx.execute({
              sql: "select count(*) count from note_tags s join note_tags t on t.note_id=s.note_id and t.tag_id=? where s.tag_id=?",
              args: [target.id, source.id],
            })
          ).rows[0]?.count ?? 0,
        )
      : 0;
    return {
      kind: "impact",
      source,
      target,
      overlap,
      affected: source.total + (target?.total ?? 0) - overlap,
    };
  }
  let selected: { id: string; name: string }[] = [];
  if (input.purpose === "picker") {
    const note = (
      await tx.execute({
        sql: "select id from notes where id=? and lifecycle='active' and (case when owner_workspace_id is null then 'p:'||owner_account_id else 'w:'||owner_workspace_id end)=?",
        args: [input.noteId, scopeKey],
      })
    ).rows[0];
    if (!note)
      throw new NotFoundError(
        "NOTE_NOT_FOUND",
        "ノートが見つからないか、操作できません。",
      );
    const rows = (
      await tx.execute({
        sql: "select t.id,t.name,t.scope_key,t.meaning_version from note_tags r join tags t on t.id=r.tag_id where r.note_id=? order by t.normalized_key,t.id limit 51",
        args: [input.noteId],
      })
    ).rows;
    if (
      rows.length > 50 ||
      rows.some(
        (r) =>
          r.scope_key !== scopeKey || r.meaning_version !== normalizer.version,
      )
    )
      throw new BusinessRuleError(
        "TAG_RELATION",
        "タグの関係を確認できません。",
      );
    selected = rows.map((r) => ({ id: String(r.id), name: String(r.name) }));
  }
  const key = normalizer.key(input.query.trim());
  const identity = JSON.stringify({
    purpose: input.purpose,
    scopeKey,
    query: key,
    noteId: input.purpose === "picker" ? input.noteId : null,
    unusedOnly: input.purpose === "manager" && input.unusedOnly,
    version: normalizer.version,
  });
  let before: z.infer<typeof pageCursor> | null = null;
  if (input.cursor) {
    try {
      before = pageCursor.parse(JSON.parse(input.cursor));
      if (before.identity !== identity) throw Error();
    } catch {
      throw new BusinessRuleError(
        "TAG_CURSOR",
        "表示条件が変わりました。最初から読み直してください。",
      );
    }
  }
  const args: InValue[] = [scopeKey, normalizer.version, key];
  const picker = input.purpose === "picker";
  const after = before
    ? picker
      ? " and (active<? or (active=? and (normalized_key>? or (normalized_key=? and id>?))))"
      : " and (normalized_key>? or (normalized_key=? and id>?))"
    : "";
  if (before)
    args.push(
      ...(picker
        ? [before.active, before.active, before.key, before.key, before.id]
        : [before.key, before.key, before.id]),
    );
  const rows = (
    await tx.execute({
      sql: `with candidates as(select ${columns} from tags t where t.scope_key=? and t.meaning_version=? and instr(t.normalized_key,?)>0) select * from candidates where 1=1 ${input.purpose === "manager" && input.unusedOnly ? "and total=0" : ""}${after} order by ${picker ? "active desc," : ""}normalized_key,id limit 51`,
      args,
    })
  ).rows;
  const items = rows.slice(0, 50).map(summary);
  const last = items.at(-1);
  const exactRow = key
    ? (
        await tx.execute({
          sql: `select ${columns} from tags t where t.scope_key=? and t.meaning_version=? and t.normalized_key=?`,
          args: [scopeKey, normalizer.version, key],
        })
      ).rows[0]
    : undefined;
  const unusedTotal = Number(
    (
      await tx.execute({
        sql: "select count(*) count from tags t where t.scope_key=? and t.meaning_version=? and not exists(select 1 from note_tags r where r.tag_id=t.id)",
        args: [scopeKey, normalizer.version],
      })
    ).rows[0]?.count ?? 0,
  );
  return {
    kind: "page",
    purpose: input.purpose,
    scope: {
      workspaceId: scope.kind === "workspace" ? scope.workspaceId : null,
      name,
    },
    items,
    selected,
    exact: exactRow ? summary(exactRow) : null,
    unusedTotal,
    identity,
    nextCursor:
      rows.length > 50 && last
        ? JSON.stringify({
            identity,
            key: last.key,
            id: last.id,
            active: last.active,
          })
        : null,
  };
}

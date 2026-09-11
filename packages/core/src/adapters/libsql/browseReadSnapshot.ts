import {
  createClient,
  type InValue,
  type Row,
  type Transaction,
} from "@libsql/client";
import type {
  BrowseNote,
  BrowsePage,
  BrowseReadSnapshotPort,
  BrowseRequest,
  BrowseResponse,
  CivilDatePort,
  TagNormalizerPort,
} from "@repo/core/application/browse/ports";
import { matchedParts } from "@repo/core/application/browse/textParts";
import {
  NotFoundError,
  UnauthorizedError,
} from "@repo/core/application/errors";
import type { Clock } from "@repo/core/application/ports/clock";
import {
  BROWSE_VERSION,
  type BrowseSort,
  type SearchQuery,
  type SearchTerm,
  searchMatch,
  searchQuery,
} from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import {
  capacityLimit,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { isSerializableError } from "@repo/core/lib/error";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { projectText } from "../node/browse/projection";
import { browseResponseSchema } from "../node/browse/wire";
import { mapDbError } from "./repositories/helpers";
import {
  invalidCapacityProvenance,
  scopeCapacityIntegrityQuery,
  scopeCapacityQuery,
} from "./repositories/scopeCapacityRepository";
import { tagReadSnapshot } from "./tagReadSnapshot";

type Clause = { sql: string; args: InValue[] };
const clause = (sql: string, ...args: InValue[]): Clause => ({ sql, args });
const join = (parts: readonly Clause[], separator = " AND "): Clause => ({
  sql: parts.map((p) => `(${p.sql})`).join(separator),
  args: parts.flatMap((p) => p.args),
});
const text = (r: Row, key: string) => String(r[key] ?? "");
const number = (r: Row, key: string) => Number(r[key] ?? 0);
const scopeKey = (scope: NoteOwner) =>
  scope.kind === "personal" ? `p:${scope.accountId}` : `w:${scope.workspaceId}`;
const scopeWhere = (scope: NoteOwner): Clause =>
  scope.kind === "personal"
    ? clause(
        "n.owner_workspace_id is null and n.owner_account_id=?",
        scope.accountId,
      )
    : clause("n.owner_workspace_id=?", scope.workspaceId);
const cursorSchema = z.object({
  identity: z.string().max(16384),
  key: z.union([z.number(), z.string().max(7200)]),
  id: z.string().max(64),
  updated: z.number().optional(),
  nameKey: z.string().max(800).optional(),
  day: z.string().optional(),
});
function cursor(value: string | undefined, identity: string) {
  if (!value) return null;
  try {
    const result = cursorSchema.parse(JSON.parse(value));
    if (result.identity !== identity) throw Error();
    return result;
  } catch {
    throw new BusinessRuleError(
      "BROWSE_CURSOR",
      "表示条件が変わりました。最初から読み直してください。",
    );
  }
}
function termClause(term: SearchTerm, column: "title" | "body") {
  return term.kind === "ascii"
    ? clause(`instr(p.${column}_words,?)>0`, ` ${term.value}`)
    : clause(`instr(p.${column}_key,?)>0`, term.value);
}
function relevance(q: SearchQuery): Clause {
  if (!q.terms.length) return clause("0");
  const title = join(q.terms.map((t) => termClause(t, "title")));
  const someTitle = join(
    q.terms.map((t) => termClause(t, "title")),
    " OR ",
  );
  return clause(
    `case when p.title_key=? then 0 when ${title.sql} then 1 when ${someTitle.sql} then 2 else 3 end`,
    q.normalized,
    ...title.args,
    ...someTitle.args,
  );
}
function firstBodyMatch(q: SearchQuery): Clause {
  if (!q.terms.length) return clause("0");
  const terms = q.terms.map((term) =>
    term.kind === "ascii"
      ? clause(
          "select min(json_extract(w.value,'$[1]')) pos from json_each(p.body_segments,'$.words') w where substr(json_extract(w.value,'$[0]'),1,?)=?",
          term.value.length,
          term.value,
        )
      : clause("select nullif(instr(p.body_key,?),0)-1 pos", term.value),
  );
  return clause(
    `coalesce((select min(pos) from (${terms.map((t) => t.sql).join(" union all ")})),0)`,
    ...terms.flatMap((t) => t.args),
  );
}
function sortKey(
  sort: BrowseSort,
  q: SearchQuery,
): Readonly<{ key: Clause; direction: "asc" | "desc" }> {
  if (sort === "relevance")
    return q.terms.length
      ? { key: relevance(q), direction: "asc" }
      : { key: clause("n.updated_at"), direction: "desc" };
  const key = sort.startsWith("title")
    ? "p.title_key"
    : sort.startsWith("created")
      ? "n.created_at"
      : "n.updated_at";
  return { key: clause(key), direction: sort.endsWith("asc") ? "asc" : "desc" };
}

export class LibsqlBrowseReadSnapshot implements BrowseReadSnapshotPort {
  constructor(
    private readonly databaseUrl: string,
    private readonly clock: Clock,
    private readonly civil: CivilDatePort,
    private readonly tagNormalizer: TagNormalizerPort,
  ) {}
  async read(request: BrowseRequest): Promise<BrowseResponse> {
    const client = createClient({ url: this.databaseUrl });
    let tx: Transaction | undefined;
    try {
      tx = await client.transaction("read");
      await tx.execute("PRAGMA query_only=ON");
      const result = await this.snapshot(tx, request);
      return browseResponseSchema.parse(result);
    } catch (error) {
      if (isSerializableError(error)) throw error;
      return mapDbError(
        "一覧を読み取れませんでした。再試行してください。",
        async () => {
          throw error;
        },
      );
    } finally {
      tx?.close();
      client.close();
    }
  }
  private async snapshot(
    tx: Transaction,
    request: BrowseRequest,
  ): Promise<BrowseResponse> {
    const now = this.clock.now();
    const auth = await tx.execute({
      sql: "select a.id from sessions s join accounts a on a.id=s.account_id where s.token_hash=? and s.expires_at>? and a.verified_at is not null",
      args: [request.sessionHash, now.getTime()],
    });
    const accountId = auth.rows[0] ? text(auth.rows[0], "id") : null;
    if (!accountId)
      throw new UnauthorizedError(
        "SESSION_REQUIRED",
        "サインインしてください。",
      );
    const c =
      request.kind === "tag-management" ? request.input : request.conditions;
    const scope = selectedScope(accountId, c);
    let name = "個人のスペース";
    let canEdit = true;
    let iconId: string | null = null;
    if (scope.kind === "workspace") {
      const r = (
        await tx.execute({
          sql: "select w.name,w.icon_id,m.role from workspaces w join workspace_members m on m.workspace_id=w.id where w.id=? and w.state='active' and m.account_id=?",
          args: [scope.workspaceId, accountId],
        })
      ).rows[0];
      if (!r)
        throw new NotFoundError(
          "SCOPE_NOT_FOUND",
          "このスペースにはアクセスできません。",
        );
      name = text(r, "name");
      canEdit = text(r, "role") !== "viewer";
      iconId = r.icon_id === null ? null : text(r, "icon_id");
    }
    const scopeClause = scopeWhere(scope);
    if (request.kind === "tag-management")
      return {
        kind: "tag-management",
        result: await tagReadSnapshot(
          tx,
          request.input,
          scope,
          name,
          canEdit,
          this.tagNormalizer,
        ),
      };
    if (request.kind === "tags")
      return this.tagPage(tx, request, scopeClause, scope);
    const conditions = request.conditions;
    return this.notesSnapshot(
      tx,
      conditions,
      scope,
      scopeClause,
      name,
      canEdit,
      iconId,
      now,
    );
  }
  private async notesSnapshot(
    tx: Transaction,
    c: Extract<BrowseRequest, { kind: "notes" }>["conditions"],
    scope: NoteOwner,
    scopeClause: Clause,
    name: string,
    canEdit: boolean,
    iconId: string | null,
    now: Date,
  ): Promise<BrowseResponse> {
    const query = searchQuery(c.query);
    const identity = JSON.stringify({
      v: BROWSE_VERSION,
      scope: scopeKey(scope),
      q: query.raw,
      tags: [...new Set(c.tags)].sort(),
      month: c.month ?? null,
      zone: c.zone,
      sort: c.sort,
      layout: c.layout,
      day: c.day ?? null,
    });
    const before = cursor(c.cursor, identity);
    const currentMonth = this.civil.currentMonth(now, c.zone);
    const month =
      c.month ?? (c.layout === "calendar" ? currentMonth : undefined);
    const calendar = month ? this.civil.month(month, c.zone) : null;
    const filters = [scopeClause, clause("n.lifecycle='active'")];
    if (calendar)
      filters.push(
        clause(
          "n.created_at>=? and n.created_at<?",
          calendar.range.start,
          calendar.range.end,
        ),
      );
    if (c.day) {
      const day = calendar?.days.find((d) => d.date === c.day);
      if (!day)
        throw new BusinessRuleError(
          "BROWSE_DAY",
          "表示中の月の日付を選んでください。",
        );
      filters.push(
        clause(
          "n.created_at>=? and n.created_at<?",
          day.range.start,
          day.range.end,
        ),
      );
    }
    const selectedTags: { id: string; name: string | null }[] = [];
    for (const id of [...new Set(c.tags)]) {
      const row = (
        await tx.execute({
          sql: "select name from tags where id=? and scope_key=? and meaning_version=?",
          args: [id, scopeKey(scope), this.tagNormalizer.version],
        })
      ).rows[0];
      selectedTags.push({ id, name: row ? text(row, "name") : null });
      filters.push(
        clause(
          "exists(select 1 from note_tags nt join tags t on t.id=nt.tag_id where nt.note_id=n.id and t.id=? and t.scope_key=? and t.meaning_version=?)",
          id,
          scopeKey(scope),
          this.tagNormalizer.version,
        ),
      );
    }
    const missing = (
      await tx.execute({
        sql: `select n.id from notes n left join note_projections p on p.note_id=n.id where ${scopeClause.sql} and n.lifecycle='active' and (p.id is null or p.meaning_version<>? or p.note_version<>n.version) limit 1`,
        args: [...scopeClause.args, BROWSE_VERSION],
      })
    ).rows.length;
    if (missing)
      throw new BusinessRuleError(
        "SEARCH_PREPARING",
        "一覧の索引を準備中です。少し待って再試行してください。",
      );
    filters.push(
      clause(
        "p.meaning_version=? and p.note_version=n.version",
        BROWSE_VERSION,
      ),
    );
    if (query.terms.length) {
      filters.push(clause("note_search match ?", searchMatch(query)));
      filters.push(
        ...query.terms.map((t) =>
          join([termClause(t, "title"), termClause(t, "body")], " OR "),
        ),
      );
    }
    const where = join(filters);
    const from = query.terms.length
      ? "note_search cross join note_projections p on p.id=note_search.rowid cross join notes n on n.id=p.note_id"
      : "notes n join note_projections p on p.note_id=n.id";
    const total = Number(
      (
        await tx.execute({
          sql: `select count(*) total from ${from} where ${where.sql}`,
          args: where.args,
        })
      ).rows[0]?.total ?? 0,
    );
    const ordering = sortKey(
      c.layout === "calendar" ? "created-desc" : c.sort,
      query,
    );
    const rows =
      c.layout === "calendar" && !c.day
        ? { items: [], nextCursor: null }
        : await this.notePage(tx, {
            from,
            where,
            query,
            ordering,
            before,
            identity,
            scope,
            limit: 50,
          });
    const days: BrowsePage["calendar"][number][] = [];
    if (c.layout === "calendar" && calendar && !c.day) {
      for (const day of calendar.days) {
        const dayWhere = join([
          where,
          clause(
            "n.created_at>=? and n.created_at<?",
            day.range.start,
            day.range.end,
          ),
        ]);
        const count = Number(
          (
            await tx.execute({
              sql: `select count(*) total from ${from} where ${dayWhere.sql}`,
              args: dayWhere.args,
            })
          ).rows[0]?.total ?? 0,
        );
        const dayIdentity = JSON.stringify({
          ...JSON.parse(identity),
          day: day.date,
        });
        const items = await this.notePage(tx, {
          from,
          where: dayWhere,
          query,
          ordering,
          before: null,
          identity: dayIdentity,
          scope,
          limit: 3,
        });
        days.push({
          date: day.date,
          count,
          items: items.items,
          nextCursor: items.nextCursor,
        });
      }
    }
    const integrity = new SQLiteSyncDialect().sqlToQuery(
      scopeCapacityIntegrityQuery(),
    );
    if (
      (
        await tx.execute({
          sql: integrity.sql,
          args: integrity.params as InValue[],
        })
      ).rows.length
    )
      throw invalidCapacityProvenance();
    const capacity = new SQLiteSyncDialect().sqlToQuery(
      scopeCapacityQuery(scope, now),
    );
    const usedBytes = Number(
      (
        await tx.execute({
          sql: capacity.sql,
          args: capacity.params as InValue[],
        })
      ).rows[0]?.bytes ?? 0,
    );
    return {
      kind: "notes",
      page: {
        ...rows,
        items: c.layout === "calendar" && !c.day ? [] : rows.items,
        scope: { workspaceId: c.workspaceId ?? null, name, canEdit, iconId },
        usage: {
          usedBytes,
          limitBytes: capacityLimit(scope),
          updatedAt: now.toISOString(),
        },
        total,
        conditions: c,
        identity,
        selectedTags,
        calendar: days,
      },
    };
  }
  private async notePage(
    tx: Transaction,
    input: Readonly<{
      from: string;
      where: Clause;
      query: SearchQuery;
      ordering: ReturnType<typeof sortKey>;
      before: ReturnType<typeof cursor>;
      identity: string;
      scope: NoteOwner;
      limit: number;
    }>,
  ) {
    const { from, query, ordering, before, identity, scope, limit } = input;
    const filters = [input.where];
    const ranked =
      query.terms.length > 0 && ordering.key.sql.startsWith("case ");
    if (before) {
      if (ranked && before.updated === undefined)
        throw new BusinessRuleError(
          "BROWSE_CURSOR",
          "最初から読み直してください。",
        );
      filters.push(
        ranked
          ? clause(
              `(${ordering.key.sql}>? or (${ordering.key.sql}=? and (n.updated_at<? or (n.updated_at=? and n.id<?))))`,
              ...ordering.key.args,
              before.key,
              ...ordering.key.args,
              before.key,
              before.updated ?? 0,
              before.updated ?? 0,
              before.id,
            )
          : clause(
              `(${ordering.key.sql}${ordering.direction === "asc" ? ">" : "<"}? or (${ordering.key.sql}=? and n.id<?))`,
              ...ordering.key.args,
              before.key,
              ...ordering.key.args,
              before.key,
              before.id,
            ),
      );
    }
    const where = join(filters);
    const position = firstBodyMatch(query);
    const tieOrder = ranked ? "updated_at desc," : "";
    const sql = `with selected as (select n.id,n.title,n.created_at,n.updated_at,p.id pid,${ordering.key.sql} ordering_key,${position.sql} match_pos from ${from} where ${where.sql} order by ordering_key ${ordering.direction},${tieOrder}n.id desc limit ?), located as(select s.*,coalesce((select case when json_extract(r.value,'$[1]')-json_extract(r.value,'$[0]')=json_extract(r.value,'$[3]')-json_extract(r.value,'$[2]') then json_extract(r.value,'$[2]')+s.match_pos-json_extract(r.value,'$[0]') else json_extract(r.value,'$[2]') end from json_each(p.body_segments,'$.ranges') r where json_extract(r.value,'$[0]')<=s.match_pos and json_extract(r.value,'$[1]')>s.match_pos limit 1),0) display_pos from selected s join note_projections p on p.id=s.pid) select s.*,substr(p.body_text,max(1,s.display_pos-39),160) snippet,p.media_label,coalesce(o.state,'ready') status,(select p.lead_image from assets a join note_asset_references ar on ar.asset_id=a.id where ar.note_id=s.id and ar.version=0 and a.state='ready' and a.kind='image' and a.mime<>'image/svg+xml' and p.lead_image='/api/notes/'||s.id||'/assets/'||a.id limit 1) thumbnail from located s join note_projections p on p.id=s.pid left join originals o on o.note_id=s.id order by s.ordering_key ${ordering.direction},${tieOrder}s.id desc`;
    const result = await tx.execute({
      sql,
      args: [...ordering.key.args, ...position.args, ...where.args, limit + 1],
    });
    const page = result.rows.slice(0, limit);
    const last = page.at(-1);
    const items: BrowseNote[] = [];
    for (const row of page) {
      const tags = (
        await tx.execute({
          sql: "select t.id,t.name from note_tags nt join tags t on t.id=nt.tag_id where nt.note_id=? and t.scope_key=? and t.meaning_version=? order by t.normalized_key,t.id limit 50",
          args: [text(row, "id"), scopeKey(scope), this.tagNormalizer.version],
        })
      ).rows.map((t) => ({ id: text(t, "id"), name: text(t, "name") }));
      const status = z
        .enum(["processing", "ready", "needs_ai", "failed", "cancelled"])
        .parse(row.status);
      items.push({
        id: text(row, "id"),
        title: text(row, "title"),
        createdAt: new Date(number(row, "created_at")).toISOString(),
        updatedAt: new Date(number(row, "updated_at")).toISOString(),
        status,
        titleParts: matchedParts(projectText(text(row, "title")), query),
        excerpt: matchedParts(projectText(text(row, "snippet")), query),
        thumbnailUrl: row.thumbnail === null ? null : text(row, "thumbnail"),
        mediaLabel: row.media_label === null ? null : text(row, "media_label"),
        tags,
      });
    }
    return {
      items,
      nextCursor:
        result.rows.length > limit && last
          ? JSON.stringify({
              identity,
              key: last.ordering_key,
              ...(ranked ? { updated: number(last, "updated_at") } : {}),
              id: last.id,
            })
          : null,
    };
  }
  private async tagPage(
    tx: Transaction,
    request: Extract<BrowseRequest, { kind: "tags" }>,
    scope: Clause,
    owner: NoteOwner,
  ): Promise<BrowseResponse> {
    const key = this.tagNormalizer.key(request.tagQuery);
    const identity = JSON.stringify({
      v: this.tagNormalizer.version,
      scope: scopeKey(owner),
      query: key,
    });
    const before = cursor(request.tagCursor, identity);
    if (before && before.nameKey === undefined)
      throw new BusinessRuleError(
        "BROWSE_CURSOR",
        "候補を最初から読み直してください。",
      );
    const having = before
      ? "having count(*)<? or (count(*)=? and (t.normalized_key>? or (t.normalized_key=? and t.id>?)))"
      : "";
    const result = await tx.execute({
      sql: `select t.id,t.name,t.normalized_key,count(*) total from tags t join note_tags nt on nt.tag_id=t.id join notes n on n.id=nt.note_id where ${scope.sql} and n.lifecycle='active' and t.scope_key=? and t.meaning_version=? and instr(t.normalized_key,?)>0 group by t.id ${having} order by total desc,t.normalized_key,t.id asc limit 51`,
      args: [
        ...scope.args,
        scopeKey(owner),
        this.tagNormalizer.version,
        key,
        ...(before
          ? [
              before.key,
              before.key,
              before.nameKey ?? "",
              before.nameKey ?? "",
              before.id,
            ]
          : []),
      ],
    });
    const rows = result.rows.slice(0, 50);
    const last = rows.at(-1);
    return {
      kind: "tags",
      items: rows.map((r) => ({
        id: text(r, "id"),
        name: text(r, "name"),
        count: number(r, "total"),
      })),
      nextCursor:
        result.rows.length > 50 && last
          ? JSON.stringify({
              identity,
              key: number(last, "total"),
              nameKey: text(last, "normalized_key"),
              id: text(last, "id"),
            })
          : null,
    };
  }
}

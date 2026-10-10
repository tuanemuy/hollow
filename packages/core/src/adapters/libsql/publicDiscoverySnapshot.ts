import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import {
  createClient,
  type InValue,
  type Row,
  type Transaction,
} from "@libsql/client";
import { matchedParts } from "@repo/core/application/browse/textParts";
import {
  NotFoundError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import { type Clock, SystemClock } from "@repo/core/application/ports/clock";
import type {
  PublicDiscoveryRequest,
  PublicDiscoveryResponse,
  PublicNoteCard,
  PublicPageOwner,
} from "@repo/core/application/publication/ports";
import {
  BROWSE_VERSION,
  type SearchQuery,
  type SearchTerm,
  searchMatch,
  searchQuery,
} from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";
import { projectText } from "../node/browse/projection";
import { NodeTagNormalizer } from "../node/browse/tagNormalizer";
import { publicResponseSchema } from "../node/publication/wire";
import { mapDbError } from "./repositories/helpers";

type Clause = { sql: string; args: InValue[] };
const clause = (sql: string, ...args: InValue[]): Clause => ({ sql, args });
const and = (clauses: readonly Clause[]): Clause => ({
  sql: clauses.map((c) => `(${c.sql})`).join(" AND "),
  args: clauses.flatMap((c) => c.args),
});
const str = (r: Row, key: string) => String(r[key] ?? "");
const num = (r: Row, key: string) => Number(r[key] ?? 0);
const notePath = (r: Row) =>
  `/p/${str(r, "public_id")}/${num(r, "url_generation")}`;
const current =
  "n.lifecycle='active' and s.visibility='public' and ((n.owner_workspace_id is null and exists(select 1 from accounts oa where oa.id=n.owner_account_id and oa.state='active')) or exists(select 1 from workspaces ow where ow.id=n.owner_workspace_id and ow.state='active'))";
const identityJoin =
  "join note_sharing s on s.note_id=n.id join note_public_identities pi on pi.note_id=n.id";
const notFound = () =>
  new NotFoundError("PUBLIC_NOT_FOUND", "このページは利用できません。");
const busy = () =>
  new SystemError(
    SystemErrorCode.PublicSearchBusy,
    "公開一覧が更新されました。再読み込みしてください。",
  );
function term(t: SearchTerm, column: "title" | "body") {
  return t.kind === "ascii"
    ? clause(`instr(p.${column}_words,?)>0`, ` ${t.value}`)
    : clause(`instr(p.${column}_key,?)>0`, t.value);
}
function rank(q: SearchQuery) {
  if (!q.terms.length) return clause("0");
  const title = and(q.terms.map((t) => term(t, "title")));
  const some = q.terms.map((t) => term(t, "title"));
  return clause(
    `case when p.title_key=? then 0 when ${title.sql} then 1 when ${some.map((t) => `(${t.sql})`).join(" OR ")} then 2 else 3 end`,
    q.normalized,
    ...title.args,
    ...some.flatMap((t) => t.args),
  );
}
function firstMatch(q: SearchQuery) {
  if (!q.terms.length) return clause("0");
  const terms = q.terms.map((t) =>
    t.kind === "ascii"
      ? clause(
          "select min(json_extract(w.value,'$[1]')) pos from json_each(p.body_segments,'$.words') w where substr(json_extract(w.value,'$[0]'),1,?)=?",
          t.value.length,
          t.value,
        )
      : clause("select nullif(instr(p.body_key,?),0)-1 pos", t.value),
  );
  return clause(
    `coalesce((select min(pos) from (${terms.map((t) => t.sql).join(" union all ")})),0)`,
    ...terms.flatMap((t) => t.args),
  );
}
function dateBoundary(value: string | undefined, zone: string) {
  try {
    if (/^[+\-\u2212]/.test(zone)) throw new RangeError();
    new Intl.DateTimeFormat("en", { timeZone: zone });
    if (!value) return undefined;
    return Temporal.PlainDate.from(value, {
      overflow: "reject",
    }).toZonedDateTime({ timeZone: zone }).epochMilliseconds;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new BusinessRuleError(
      "PUBLIC_DATE",
      "有効な日付とタイムゾーンを選んでください。",
    );
  }
}
const cursorSchema = z
  .object({
    version: z.literal(1),
    identity: z.string().regex(/^[a-f0-9]{64}$/),
    rank: z.number().int().min(0).max(3),
    updated: z.number().safe().int(),
    id: z.string().max(64),
  })
  .strict();
function decodeCursor(value: string | undefined, identity: string) {
  if (!value) return null;
  try {
    const parsed = cursorSchema.parse(JSON.parse(value));
    if (parsed.identity !== identity) throw Error();
    return parsed;
  } catch {
    throw new BusinessRuleError(
      "PUBLIC_CURSOR",
      "表示条件が変わりました。最初から読み直してください。",
    );
  }
}
type Snapshot = { response: PublicDiscoveryResponse; guard: unknown };
export class LibsqlPublicDiscoverySnapshot {
  constructor(
    private readonly databaseUrl: string,
    private readonly clock: Clock = SystemClock,
  ) {}
  async read(
    request: PublicDiscoveryRequest,
  ): Promise<PublicDiscoveryResponse> {
    const client = createClient({ url: this.databaseUrl });
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const read = async () => {
          const tx = await client.transaction("read");
          try {
            await tx.execute("PRAGMA query_only=ON");
            return await this.snapshot(tx, request);
          } finally {
            tx.close();
          }
        };
        const initial = await read();
        const latest = await read();
        if (JSON.stringify(initial) !== JSON.stringify(latest)) continue;
        return publicResponseSchema.parse(initial.response);
      }
      throw busy();
    } catch (error) {
      if (isSerializableError(error)) throw error;
      return mapDbError("公開一覧を読み取れませんでした。", async () => {
        throw error;
      });
    } finally {
      client.close();
    }
  }
  private async snapshot(
    tx: Transaction,
    request: PublicDiscoveryRequest,
  ): Promise<Snapshot> {
    if (request.kind !== "list") return this.sitemap(tx, request);
    const { scope, conditions: c } = request;
    let owner: PublicPageOwner = {
      kind: "all",
      title: "公開ノートを探す",
      path: "/discover",
      description: "公開されているノートを検索できます。",
      iconUrl: null,
    };
    let ownerGuard: Row | null = null;
    const filters = [clause(current)];
    if (scope.kind === "profile") {
      const row = (
        await tx.execute({
          sql: "select ap.*,dn.display_name,dn.version name_version,ic.state icon_state,ic.sha256 icon_sha from account_public_profiles ap join accounts a on a.id=ap.account_id left join account_display_names dn on dn.account_id=a.id left join account_profile_icons ic on ic.id=ap.icon_id where ap.handle=? and a.state='active'",
          args: [scope.handle],
        })
      ).rows[0];
      if (!row) throw notFound();
      ownerGuard = row;
      owner = {
        kind: "profile",
        handle: scope.handle,
        title:
          row.display_name === null || row.display_name === undefined
            ? "表示名未設定"
            : str(row, "display_name"),
        path: `/@${scope.handle}`,
        description: str(row, "bio"),
        iconUrl:
          row.icon_id && row.icon_state === "ready"
            ? `/@${scope.handle}/icons/${str(row, "icon_id")}`
            : null,
      };
      filters.push(
        clause(
          "n.owner_workspace_id is null and n.owner_account_id=?",
          str(row, "account_id"),
        ),
      );
    } else if (scope.kind === "workspace") {
      const row = (
        await tx.execute({
          sql: "select w.id,w.name,w.description,w.slug,w.state,w.settings_version,w.icon_id,wp.version publication_version,wp.page_public,ic.sha256 icon_sha,ic.state icon_state from workspaces w join workspace_public_settings wp on wp.workspace_id=w.id left join workspace_icons ic on ic.id=w.icon_id where w.slug=? and w.state='active' and wp.page_public=1",
          args: [scope.slug],
        })
      ).rows[0];
      if (!row) throw notFound();
      ownerGuard = row;
      owner = {
        kind: "workspace",
        slug: scope.slug,
        title: str(row, "name"),
        path: `/w/${scope.slug}`,
        description: str(row, "description"),
        iconUrl:
          row.icon_id && row.icon_state === "ready"
            ? `/w/${scope.slug}/icons/${str(row, "icon_id")}`
            : null,
      };
      filters.push(clause("n.owner_workspace_id=?", str(row, "id")));
    }
    let viewer: Extract<
      PublicDiscoveryResponse,
      { kind: "list" }
    >["page"]["viewer"] = null;
    let viewerGuard: unknown = null;
    if (request.viewerSessionHash && ownerGuard) {
      const actor = (
        await tx.execute({
          sql: "select a.id,s.expires_at,a.verified_at from sessions s join accounts a on a.id=s.account_id where s.token_hash=? and s.expires_at>? and a.verified_at is not null",
          args: [request.viewerSessionHash, this.clock.now().getTime()],
        })
      ).rows[0];
      if (
        actor &&
        scope.kind === "profile" &&
        actor.id === ownerGuard.account_id
      ) {
        viewer = {
          kind: "owner",
          settingsUrl: "/settings/profile",
          workUrl: "/notes",
        };
        viewerGuard = actor;
      }
      if (actor && scope.kind === "workspace") {
        const member = (
          await tx.execute({
            sql: "select m.role,w.membership_revision from workspace_members m join workspaces w on w.id=m.workspace_id where m.workspace_id=? and m.account_id=? and w.state='active'",
            args: [str(ownerGuard, "id"), str(actor, "id")],
          })
        ).rows[0];
        if (member) {
          viewer = {
            kind: member.role === "owner" ? "owner" : "member",
            settingsUrl: `/workspaces/${str(ownerGuard, "id")}/settings`,
            workUrl: `/notes?workspaceId=${encodeURIComponent(str(ownerGuard, "id"))}`,
          };
          viewerGuard = { actor, member };
        }
      }
    }
    const query = searchQuery(c.query);
    const fromDate = dateBoundary(c.from, c.zone);
    const untilDate = dateBoundary(c.until, c.zone);
    if (
      fromDate !== undefined &&
      untilDate !== undefined &&
      fromDate >= untilDate
    )
      throw new BusinessRuleError(
        "PUBLIC_DATE",
        "終了日は開始日より後にしてください。",
      );
    if (fromDate !== undefined)
      filters.push(clause("n.updated_at>=?", fromDate));
    if (untilDate !== undefined)
      filters.push(clause("n.updated_at<?", untilDate));
    const tagKeys = [
      ...new Set(c.tags.map((t) => NodeTagNormalizer.key(t))),
    ].sort();
    const tagScope =
      "t.scope_key=case when n.owner_workspace_id is null then 'p:'||n.owner_account_id else 'w:'||n.owner_workspace_id end and t.meaning_version=?";
    for (const key of tagKeys)
      filters.push(
        clause(
          `exists(select 1 from note_tags nt join tags t on t.id=nt.tag_id where nt.note_id=n.id and ${tagScope} and t.normalized_key=?)`,
          NodeTagNormalizer.version,
          key,
        ),
      );
    const base = and(filters);
    const missing = await tx.execute({
      sql: `select n.id from notes n ${identityJoin} left join note_projections p on p.note_id=n.id where ${base.sql} and (p.id is null or p.meaning_version<>? or p.note_version<>n.version) limit 1`,
      args: [...base.args, BROWSE_VERSION],
    });
    if (missing.rows.length)
      throw new BusinessRuleError(
        "SEARCH_PREPARING",
        "公開一覧の索引を準備中です。少し待って再試行してください。",
      );
    filters.push(
      clause(
        "p.meaning_version=? and p.note_version=n.version",
        BROWSE_VERSION,
      ),
    );
    if (query.terms.length) {
      filters.push(clause("note_search match ?", searchMatch(query)));
      for (const t of query.terms) {
        const a = term(t, "title");
        const b = term(t, "body");
        filters.push(clause(`(${a.sql}) OR (${b.sql})`, ...a.args, ...b.args));
      }
    }
    const source = query.terms.length
      ? `note_search cross join note_projections p on p.id=note_search.rowid cross join notes n on n.id=p.note_id ${identityJoin}`
      : `notes n join note_projections p on p.note_id=n.id ${identityJoin}`;
    const where = and(filters);
    const total = num(
      (
        await tx.execute({
          sql: `select count(*) total from ${source} where ${where.sql}`,
          args: where.args,
        })
      ).rows[0] ?? {},
      "total",
    );
    const facets = (
      await tx.execute({
        sql: `select min(t.name) name,count(distinct n.id) count from ${source} join note_tags nt on nt.note_id=n.id join tags t on t.id=nt.tag_id where ${where.sql} and ${tagScope} group by t.normalized_key order by t.normalized_key limit 50`,
        args: [...where.args, NodeTagNormalizer.version],
      })
    ).rows.map((r) => ({ name: str(r, "name"), count: num(r, "count") }));
    const identity = createHash("sha256")
      .update("hollow-public-cursor-v1\0")
      .update(
        JSON.stringify({
          scope,
          query: query.normalized,
          tags: tagKeys,
          zone: c.zone,
          from: c.from ?? null,
          until: c.until ?? null,
        }),
      )
      .digest("hex");
    const before = decodeCursor(c.cursor, identity);
    const ordering = rank(query);
    const pageFilters = [where];
    if (before)
      pageFilters.push(
        query.terms.length
          ? clause(
              `(${ordering.sql}>? or (${ordering.sql}=? and n.id<?))`,
              ...ordering.args,
              before.rank,
              ...ordering.args,
              before.rank,
              before.id,
            )
          : clause(
              "(n.updated_at<? or (n.updated_at=? and n.id<?))",
              before.updated,
              before.updated,
              before.id,
            ),
      );
    const pageWhere = and(pageFilters);
    const position = firstMatch(query);
    const sort = query.terms.length
      ? "ranking asc,id desc"
      : "updated_at desc,id desc";
    const sql = `with selected as (select n.id,n.title,n.version,n.updated_at,n.owner_account_id,n.owner_workspace_id,n.ownership_generation,n.resource_revision,n.creator_id,p.id pid,pi.public_id,pi.url_generation,pi.access_epoch,s.version sharing_version,${ordering.sql} ranking,${position.sql} match_pos from ${source} where ${pageWhere.sql} order by ${query.terms.length ? "ranking asc,n.id desc" : "n.updated_at desc,n.id desc"} limit 51), located as(select x.*,coalesce((select case when json_extract(r.value,'$[1]')-json_extract(r.value,'$[0]')=json_extract(r.value,'$[3]')-json_extract(r.value,'$[2]') then json_extract(r.value,'$[2]')+x.match_pos-json_extract(r.value,'$[0]') else json_extract(r.value,'$[2]') end from json_each(p.body_segments,'$.ranges') r where json_extract(r.value,'$[0]')<=x.match_pos and json_extract(r.value,'$[1]')>x.match_pos limit 1),0) display_pos from selected x join note_projections p on p.id=x.pid) select x.*,substr(p.body_text,max(1,x.display_pos-39),160) snippet,(select a.id from assets a join note_asset_references ar on ar.asset_id=a.id where ar.note_id=x.id and ar.version=0 and a.state='ready' and a.kind='image' and a.mime in ('image/png','image/jpeg','image/webp','image/gif') and p.lead_image='/api/notes/'||x.id||'/assets/'||a.id limit 1) thumbnail from located x join note_projections p on p.id=x.pid order by ${sort}`;
    const rows = (
      await tx.execute({
        sql,
        args: [...ordering.args, ...position.args, ...pageWhere.args],
      })
    ).rows;
    const items: PublicNoteCard[] = [];
    const guards: unknown[] = [];
    for (const r of rows.slice(0, 50)) {
      const creator = r.creator_id
        ? (
            await tx.execute({
              sql: "select a.id,d.display_name,d.version name_version,p.handle,p.version profile_version from accounts a left join account_display_names d on d.account_id=a.id left join account_public_profiles p on p.account_id=a.id where a.id=?",
              args: [str(r, "creator_id")],
            })
          ).rows[0]
        : undefined;
      const tags = (
        await tx.execute({
          sql: "select t.id,t.name,t.mutation_revision from note_tags nt join tags t on t.id=nt.tag_id where nt.note_id=? and t.scope_key=? and t.meaning_version=? order by t.normalized_key,t.id limit 50",
          args: [
            str(r, "id"),
            r.owner_workspace_id
              ? `w:${str(r, "owner_workspace_id")}`
              : `p:${str(r, "owner_account_id")}`,
            NodeTagNormalizer.version,
          ],
        })
      ).rows;
      const author: PublicNoteCard["author"] = !r.creator_id
        ? { kind: "unknown" }
        : !creator
          ? { kind: "deleted" }
          : creator.display_name
            ? { kind: "named", displayName: str(creator, "display_name") }
            : { kind: "unset" };
      items.push({
        path: notePath(r),
        title: str(r, "title"),
        updatedAt: new Date(num(r, "updated_at")).toISOString(),
        author,
        authorUrl: creator?.handle ? `/@${str(creator, "handle")}` : null,
        titleParts: matchedParts(projectText(str(r, "title")), query),
        excerpt: matchedParts(projectText(str(r, "snippet")), query),
        thumbnailUrl: r.thumbnail
          ? `${notePath(r)}/assets/${str(r, "thumbnail")}`
          : null,
        tags: tags.map((t) => str(t, "name")),
      });
      guards.push({ row: r, creator: creator ?? null, tags });
    }
    const last = rows.slice(0, 50).at(-1);
    return {
      response: {
        kind: "list",
        page: {
          owner,
          viewer,
          items,
          total,
          tags: facets,
          conditions: c,
          nextCursor:
            rows.length > 50 && last
              ? JSON.stringify({
                  version: 1,
                  identity,
                  rank: num(last, "ranking"),
                  updated: num(last, "updated_at"),
                  id: str(last, "id"),
                })
              : null,
        },
      },
      guard: { owner: ownerGuard, viewer: viewerGuard, rows: guards },
    };
  }
  private async sitemap(
    tx: Transaction,
    request: Exclude<PublicDiscoveryRequest, { kind: "list" }>,
  ): Promise<Snapshot> {
    const catalogues = {
      notes: {
        from: `notes n ${identityJoin}`,
        where: current,
        select:
          "pi.public_id,pi.url_generation,pi.access_epoch,n.version,n.ownership_generation,n.updated_at,s.version sharing_version",
        order: "pi.public_id",
      },
      profiles: {
        from: "account_public_profiles ap join accounts a on a.id=ap.account_id",
        where: "ap.handle is not null and a.state='active'",
        select: "ap.handle,ap.version,ap.icon_id",
        order: "ap.handle",
      },
      workspaces: {
        from: "workspaces w join workspace_public_settings wp on wp.workspace_id=w.id",
        where: "w.state='active' and wp.page_public=1 and w.slug is not null",
        select:
          "w.slug,w.settings_version,w.icon_id,wp.version publication_version",
        order: "w.slug",
      },
    };
    if (request.kind === "sitemap-index") {
      const paths: string[] = [];
      for (const kind of ["notes", "profiles", "workspaces"] as const) {
        const cat = catalogues[kind];
        const count = num(
          (
            await tx.execute(
              `select count(*) total from ${cat.from} where ${cat.where}`,
            )
          ).rows[0] ?? {},
          "total",
        );
        const pages = Math.ceil(count / 500);
        if (pages + paths.length > 50000)
          throw new BusinessRuleError(
            "SITEMAP_CAPACITY",
            "サイトマップの配信設定を調整する必要があります。",
          );
        for (let page = 0; page < pages; page++)
          paths.push(`/sitemap/${kind}/${page}.xml`);
      }
      return { response: { kind: "sitemap-index", paths }, guard: null };
    }
    const cat = catalogues[request.catalogue];
    const offset = request.page * 500;
    if (!Number.isSafeInteger(offset)) throw notFound();
    const rows = (
      await tx.execute({
        sql: `select ${cat.select} from ${cat.from} where ${cat.where} order by ${cat.order} limit 500 offset ?`,
        args: [offset],
      })
    ).rows;
    if (!rows.length) throw notFound();
    return {
      response: {
        kind: "sitemap-leaf",
        entries: rows.map((r) => ({
          path:
            request.catalogue === "notes"
              ? notePath(r)
              : request.catalogue === "profiles"
                ? `/@${str(r, "handle")}`
                : `/w/${str(r, "slug")}`,
          lastmod:
            request.catalogue === "notes"
              ? new Date(num(r, "updated_at")).toISOString()
              : null,
        })),
      },
      guard: rows,
    };
  }
}

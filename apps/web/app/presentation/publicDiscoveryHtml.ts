import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  PublicDiscoveryConditions,
  PublicDiscoveryResponse,
  PublicNoteCard,
  PublicPageOwner,
} from "@repo/core/application/publication/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

type DiscoveryPage = Extract<PublicDiscoveryResponse, { kind: "list" }>["page"];
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const name = "[a-z0-9][a-z0-9-]{1,61}[a-z0-9]";
const notePathPattern = new RegExp(`^/p/${uuid}/1$`);
const profilePathPattern = new RegExp(`^/@${name}$`);
const workspacePathPattern = new RegExp(`^/w/${name}$`);
const publicAssetPattern = new RegExp(`^/p/${uuid}/1/assets/${uuid}$`);
const publicIconPattern = new RegExp(`^/(?:@${name}|w/${name})/icons/${uuid}$`);
const sitemapPathPattern =
  /^\/sitemap\/(?:notes|profiles|workspaces)\/(0|[1-9][0-9]*)\.xml$/;

function invalid(): never {
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid public discovery response",
  );
}
function matches(pattern: RegExp, value: string) {
  return pattern.exec(value)?.[0] === value;
}
function escapeMarkup(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
function ownerPath(owner: PublicPageOwner) {
  if (owner.kind === "all") {
    if (owner.path !== "/discover") return invalid();
  } else if (owner.kind === "profile") {
    if (
      !matches(profilePathPattern, owner.path) ||
      owner.path !== `/@${owner.handle}`
    )
      return invalid();
  } else if (
    !matches(workspacePathPattern, owner.path) ||
    owner.path !== `/w/${owner.slug}`
  )
    return invalid();
  return owner.path;
}
function currentIcon(owner: PublicPageOwner) {
  const icon = owner.iconUrl;
  return icon &&
    matches(publicIconPattern, icon) &&
    icon.startsWith(`${owner.path}/icons/`)
    ? icon
    : null;
}
function currentThumbnail(item: PublicNoteCard) {
  const image = item.thumbnailUrl;
  return image &&
    matches(publicAssetPattern, image) &&
    image.startsWith(`${item.path}/assets/`)
    ? image
    : null;
}
function conditionUrl(
  path: string,
  conditions: PublicDiscoveryConditions,
  tags: readonly string[] = conditions.tags,
  cursor: string | undefined = undefined,
) {
  const search = new URLSearchParams();
  if (conditions.query) search.set("q", conditions.query);
  for (const tag of tags) search.append("tag", tag);
  if (conditions.from) search.set("from", conditions.from);
  if (conditions.until) search.set("until", conditions.until);
  search.set("zone", conditions.zone);
  if (cursor) search.set("cursor", cursor);
  return `${path}?${search.toString()}`;
}
function toggledTags(tags: readonly string[], tag: string) {
  return tags.includes(tag)
    ? tags.filter((value) => value !== tag)
    : [...tags, tag];
}
function renderParts(parts: PublicNoteCard["titleParts"]) {
  return parts
    .map((part) =>
      part.match
        ? `<mark>${escapeMarkup(part.text)}</mark>`
        : escapeMarkup(part.text),
    )
    .join("");
}
function dateTime(value: string) {
  if (
    !matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, value) ||
    !Number.isFinite(Date.parse(value))
  )
    return invalid();
  if (new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))
    return invalid();
  return value;
}
function author(item: PublicNoteCard) {
  const label =
    item.author.kind === "named"
      ? item.author.displayName
      : item.author.kind === "unset"
        ? "表示名未設定"
        : item.author.kind === "deleted"
          ? "退会した利用者"
          : "作成者不明";
  const url = item.authorUrl;
  return url &&
    matches(profilePathPattern, url) &&
    (item.author.kind === "named" || item.author.kind === "unset")
    ? `<a href="${escapeMarkup(url)}">${escapeMarkup(label)}</a>`
    : escapeMarkup(label);
}
function renderCard(
  item: PublicNoteCard,
  path: string,
  conditions: PublicDiscoveryConditions,
) {
  if (!matches(notePathPattern, item.path)) return invalid();
  const thumbnail = currentThumbnail(item);
  const updated = dateTime(item.updatedAt);
  const title = item.titleParts.length
    ? renderParts(item.titleParts)
    : escapeMarkup(item.title);
  const tags = item.tags
    .map((tag) => {
      const selected = conditions.tags.includes(tag);
      const href = conditionUrl(
        path,
        conditions,
        selected ? conditions.tags : [...conditions.tags, tag],
      );
      return `<li><a href="${escapeMarkup(href)}">#${escapeMarkup(tag)}</a></li>`;
    })
    .join("");
  return `<article class="pd-card">${thumbnail ? `<img class="pd-thumbnail" src="${escapeMarkup(thumbnail)}" alt="" width="112" height="84" loading="lazy" decoding="async">` : ""}<h2><a href="${escapeMarkup(item.path)}">${title}</a></h2><p class="pd-byline">著者: ${author(item)}<br>更新日時: <time datetime="${escapeMarkup(updated)}">${escapeMarkup(updated.replace("T", " ").replace("Z", " UTC"))}</time></p>${item.excerpt.length ? `<p class="pd-excerpt">${renderParts(item.excerpt)}</p>` : ""}${tags ? `<ul class="pd-tags" aria-label="ノートのタグ">${tags}</ul>` : ""}</article>`;
}

function viewerBanner(page: DiscoveryPage) {
  const viewer = page.viewer;
  if (!viewer) return "";
  if (page.owner.kind === "profile") {
    if (
      viewer.kind !== "owner" ||
      viewer.settingsUrl !== "/settings/profile" ||
      viewer.workUrl !== "/notes"
    )
      return invalid();
  } else if (page.owner.kind === "workspace") {
    const match = new RegExp(`^/workspaces/(${uuid})/settings$`).exec(
      viewer.settingsUrl,
    );
    if (
      !match ||
      match[0] !== viewer.settingsUrl ||
      viewer.workUrl !== `/notes?workspaceId=${match[1]}`
    )
      return invalid();
  } else return invalid();
  return `<aside class="pd-empty" aria-label="外部向けの公開表示"><p>これは外部向けの公開ページです。非公開・限定のノートは表示されません。</p><nav><a href="${escapeMarkup(viewer.settingsUrl)}">${page.owner.kind === "profile" ? "プロフィール設定" : "ワークスペース設定"}</a><a href="${escapeMarkup(viewer.workUrl)}">作業一覧に戻る</a></nav></aside>`;
}

const style = `<style>
.public-discovery{color:#262626;min-width:0;overflow-wrap:anywhere}
.public-discovery a{color:inherit;text-underline-offset:.2em}
.public-discovery :focus-visible{outline:2px solid #222;outline-offset:3px}
.public-discovery .pd-description{white-space:pre-wrap}
.public-discovery .pd-icon{width:80px;height:80px;object-fit:cover;border-radius:50%}
.public-discovery .pd-form{display:grid;gap:12px;padding:16px 0;border-block:1px solid #ccc}
.public-discovery .pd-row{display:flex;flex-wrap:wrap;gap:12px;align-items:end}
.public-discovery .pd-field{flex:1 1 180px;min-width:0}
.public-discovery .pd-field label{display:block;margin:0 0 4px}
.public-discovery input:not([type=checkbox]){width:100%;min-width:0;border:1px solid #aaa;border-radius:4px;background:#fff;color:inherit;font:inherit;padding:10px;box-sizing:border-box}
.public-discovery button{min-height:44px;padding:8px 16px;border:1px solid #999;background:#fff;border-radius:4px;color:inherit;font:inherit;cursor:pointer}
.public-discovery fieldset{min-width:0;border:1px solid #ccc;margin:0;padding:12px}
.public-discovery .pd-checks{display:flex;flex-wrap:wrap;gap:8px 16px}
.public-discovery .pd-checks label{display:flex;align-items:center;gap:8px;margin:0;min-height:44px}
.public-discovery input[type=checkbox]{width:18px;height:18px;flex-shrink:0}
.public-discovery .pd-muted,.public-discovery .pd-byline{color:#555;font-size:.875rem}
.public-discovery .pd-tags{display:flex;flex-wrap:wrap;gap:8px 14px;list-style:none;padding:0}
.public-discovery .pd-card{border-top:1px solid #ccc;padding:18px 0;display:flow-root}
.public-discovery .pd-card h2{font-size:1.2rem;margin:0 0 8px}
.public-discovery .pd-thumbnail{width:112px;height:84px;object-fit:cover;float:right;margin:0 0 12px 12px}
.public-discovery mark{background:#e4e4e4;color:inherit}
.public-discovery .pd-empty{padding:20px;border:1px solid #ccc}
.public-discovery .pd-pagination{display:flex;flex-wrap:wrap;gap:16px;margin-top:20px}
@media(max-width:420px){.public-discovery .pd-field{flex-basis:100%}.public-discovery .pd-thumbnail{width:88px;height:66px}.public-discovery .pd-form button{width:100%}}
</style>`;

export function renderPublicDiscovery(page: DiscoveryPage): {
  title: string;
  body: string;
  canonical: string;
  description: string;
  image: string | null;
  index: boolean;
} {
  if (
    page.items.length > 50 ||
    page.tags.length > 50 ||
    page.conditions.tags.length > 50 ||
    !Number.isSafeInteger(page.total) ||
    page.total < 0
  )
    return invalid();
  const { owner, conditions } = page;
  const path = ownerPath(owner);
  const icon = currentIcon(owner);
  const filtered = Boolean(
    conditions.query ||
      conditions.tags.length ||
      conditions.from ||
      conditions.until ||
      conditions.cursor,
  );
  const facets = new Map(page.tags.map((tag) => [tag.name, tag.count]));
  const choices = [...new Set([...conditions.tags, ...facets.keys()])];
  const checks = choices
    .map(
      (tag, index) =>
        `<label for="pd-tag-${index}"><input id="pd-tag-${index}" type="checkbox" name="tag" value="${escapeMarkup(tag)}"${conditions.tags.includes(tag) ? " checked" : ""}>${escapeMarkup(tag)}${facets.has(tag) ? ` (${facets.get(tag)})` : "（選択中）"}</label>`,
    )
    .join("");
  const links = page.tags
    .map(
      (tag) =>
        `<li><a href="${escapeMarkup(conditionUrl(path, conditions, toggledTags(conditions.tags, tag.name)))}"${conditions.tags.includes(tag.name) ? ' aria-current="true"' : ""}>${conditions.tags.includes(tag.name) ? "解除: " : ""}#${escapeMarkup(tag.name)} (${tag.count})</a></li>`,
    )
    .join("");
  const form = `<form class="pd-form" method="get" action="${escapeMarkup(path)}" aria-label="公開ノートの検索"><div class="pd-row"><div class="pd-field"><label for="pd-query">${owner.kind === "all" ? "公開ノートを横断検索" : "この公開ページ内を検索"}</label><input id="pd-query" type="search" name="q" value="${escapeMarkup(conditions.query)}" maxlength="800" aria-describedby="pd-query-help"></div></div><p id="pd-query-help" class="pd-muted">検索語は2文字以上。日本語は部分一致、英数字は語頭から一致します。非公開・限定公開のノートは検索しません。</p>${checks ? `<fieldset><legend>タグ（複数選択できます）</legend><div class="pd-checks">${checks}</div></fieldset>` : ""}<div class="pd-row"><div class="pd-field"><label for="pd-from">更新日・開始日（当日を含む）</label><input id="pd-from" type="date" name="from" value="${escapeMarkup(conditions.from ?? "")}"></div><div class="pd-field"><label for="pd-until">更新日・終了日（当日を含まない）</label><input id="pd-until" type="date" name="until" value="${escapeMarkup(conditions.until ?? "")}"></div><div class="pd-field"><label for="pd-zone">日付のタイムゾーン（IANA名）</label><input id="pd-zone" name="zone" value="${escapeMarkup(conditions.zone)}" required maxlength="128" placeholder="Asia/Tokyo"></div></div><p class="pd-muted">期間は更新日時で絞ります。開始日の0時以上、終了日の0時未満を、指定したタイムゾーンで扱います。</p><div class="pd-row"><button type="submit">検索・絞り込み</button><a href="${escapeMarkup(path)}">条件を解除して最初へ戻る</a></div></form>`;
  const empty =
    page.total === 0
      ? `<div class="pd-empty"><h2>${filtered ? "条件に一致する公開ノートはありません" : "公開ノートはまだありません"}</h2><p>${filtered ? "検索語を短くする、タグを減らす、期間を広げるなど、条件を緩めてください。" : "ノートを公開するには、アプリ内のノート詳細で共有設定を開き、「公開」を選びます。"}</p>${owner.kind === "profile" ? "<p>ワークスペース所有のノートは、この個人の公開ページには並びません。</p>" : ""}</div>`
      : page.items.length === 0
        ? `<p class="pd-empty">この続きに表示できるノートはありません。公開状態が変わった可能性があります。最初のページから確認してください。</p>`
        : "";
  const next =
    page.nextCursor !== null
      ? `<a rel="next" href="${escapeMarkup(conditionUrl(path, conditions, conditions.tags, page.nextCursor))}">次のページ</a>`
      : "";
  const first = conditions.cursor
    ? `<a href="${escapeMarkup(conditionUrl(path, conditions))}">同じ条件の最初のページ</a>`
    : "";
  const body = `${style}<section class="public-discovery" aria-labelledby="pd-title"><header>${icon ? `<img class="pd-icon" src="${escapeMarkup(icon)}" width="80" height="80" alt="${escapeMarkup(owner.kind === "profile" ? "プロフィールアイコン" : "ワークスペースのアイコン")}">` : ""}<h1 id="pd-title">${escapeMarkup(owner.title)}</h1>${owner.kind === "profile" ? `<p class="pd-muted">@${escapeMarkup(owner.handle)} · 個人の公開ページ</p>` : owner.kind === "workspace" ? '<p class="pd-muted">ワークスペースの公開ページ</p>' : ""}${owner.description ? `<p class="pd-description">${escapeMarkup(owner.description)}</p>` : ""}</header>${form}${links ? `<nav aria-label="タグで絞り込み"><ul class="pd-tags">${links}</ul></nav>` : ""}<p role="status">公開ノート ${page.total} 件 · このページ ${page.items.length} 件（1ページ最大50件）</p>${empty}${page.items.map((item) => renderCard(item, path, conditions)).join("")}<nav class="pd-pagination" aria-label="ページ移動">${first}${next}</nav></section>`;
  return {
    title: owner.title,
    body: viewerBanner(page) + body,
    canonical: path,
    description: owner.description,
    image:
      page.items.map(currentThumbnail).find((value) => value !== null) ?? icon,
    index: owner.kind !== "all" && !filtered,
  };
}

function appOrigin(appUrl: string) {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    return invalid();
  }
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    Array.from(appUrl).some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        character === "\\",
    )
  )
    return invalid();
  return url.origin;
}
function sitemapLeafPath(path: string) {
  if (
    !matches(notePathPattern, path) &&
    !matches(profilePathPattern, path) &&
    !matches(workspacePathPattern, path)
  )
    return invalid();
  return path;
}

export function renderPublicSitemap(
  result: Exclude<PublicDiscoveryResponse, { kind: "list" }>,
  appUrl: string,
): string {
  const origin = appOrigin(appUrl);
  const isIndex = result.kind === "sitemap-index";
  const count = isIndex ? result.paths.length : result.entries.length;
  if (count > (isIndex ? 50_000 : 500))
    throw new BusinessRuleError(
      "SITEMAP_CAPACITY",
      "サイトマップの配信設定を調整する必要があります。",
    );
  const root = isIndex ? "sitemapindex" : "urlset";
  const start = `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const end = `</${root}>`;
  const encoder = new TextEncoder();
  let bytes = encoder.encode(start + end).byteLength;
  const chunks: string[] = [start];
  const append = (value: string) => {
    bytes += encoder.encode(value).byteLength;
    if (bytes > 50 * 1024 ** 2)
      throw new BusinessRuleError(
        "SITEMAP_CAPACITY",
        "サイトマップの配信設定を調整する必要があります。",
      );
    chunks.push(value);
  };
  if (result.kind === "sitemap-index") {
    for (const path of result.paths) {
      const match = sitemapPathPattern.exec(path);
      if (
        !match?.[1] ||
        match[0] !== path ||
        !Number.isSafeInteger(Number(match[1]))
      )
        return invalid();
      append(`<sitemap><loc>${escapeMarkup(origin + path)}</loc></sitemap>`);
    }
  } else {
    for (const entry of result.entries) {
      const path = sitemapLeafPath(entry.path);
      const lastmod =
        entry.lastmod === null
          ? ""
          : `<lastmod>${escapeMarkup(dateTime(entry.lastmod))}</lastmod>`;
      append(`<url><loc>${escapeMarkup(origin + path)}</loc>${lastmod}</url>`);
    }
  }
  chunks.push(end);
  return chunks.join("");
}

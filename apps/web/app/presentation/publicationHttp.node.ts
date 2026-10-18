import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { importContext } from "@repo/core/application/import/context";
import {
  getPublicAsset,
  publicNotFound,
  readPublicNote,
} from "@repo/core/application/publication/reading";
import { parsePublicAssetUrl } from "@repo/core/domain/publication/urls";
import type { ShareAuthor } from "@repo/core/domain/sharing/entity";
import {
  escapeAttribute as escapeHtml,
  frameDocument,
  safeParentLink,
} from "../components/hollow/editorMedia";
import layoutCss from "../styles/layout.css?raw";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";
import { singleRange } from "./mediaHttp.node";
import { notePrintResponse, readingPrintNotice } from "./notePrint";
import { referenceLedgerHtml } from "./referenceLedgerHtml";

export const authorLabel = (author: ShareAuthor) =>
  author.kind === "named"
    ? author.displayName
    : author.kind === "unset"
      ? "表示名未設定"
      : author.kind === "deleted"
        ? "退会した利用者"
        : "著者不明";
export function publicHeaders(index = true) {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": index ? "index, follow" : "noindex, nofollow",
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy":
      "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; img-src 'self' data:; object-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
}
export function publicPage(
  title: string,
  body: string,
  metadata: {
    canonical?: string;
    description?: string;
    image?: string;
    article?: boolean;
  } = {},
) {
  const meta = `${metadata.canonical ? `<link rel="canonical" href="${escapeHtml(metadata.canonical)}"><meta property="og:url" content="${escapeHtml(metadata.canonical)}">` : ""}<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:type" content="${metadata.article ? "article" : "website"}">${metadata.description ? `<meta name="description" content="${escapeHtml(metadata.description)}"><meta property="og:description" content="${escapeHtml(metadata.description)}">` : ""}${metadata.image ? `<meta property="og:image" content="${escapeHtml(metadata.image)}">` : ""}`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} — Hollow</title>${meta}<style>${layoutCss}*{box-sizing:border-box}body{overflow-wrap:anywhere;margin:0;background:#fafafa;color:#202020;font:16px/1.7 system-ui,sans-serif}main{width:min(var(--list-max),100%);margin:auto;padding:24px var(--container-padding)}main.hollow-reading-page{width:min(var(--content-max),100%)}h1{line-height:1.4;overflow-wrap:anywhere}input,select,button{font:inherit;padding:10px;max-width:100%;box-sizing:border-box}label{display:block;margin:12px 0 4px}button,a{touch-action:manipulation}button{cursor:pointer}a{color:inherit}iframe{border:0;background:white;width:100%;height:75vh;margin-top:20px}small{color:#555}nav{display:flex;gap:16px;flex-wrap:wrap}article{border-top:1px solid #ddd;padding:16px 0}.thumb{width:96px;height:72px;object-fit:cover;float:right}.avatar{width:80px;height:80px;object-fit:cover;border-radius:50%}.error{border-left:3px solid #555;padding:12px}.bio{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:450px){main{padding:16px var(--container-padding)}h1{font-size:25px}}</style></head><body><main${metadata.article ? ' class="hollow-reading-page"' : ""}><nav><a href="/discover">Hollow · 公開ノート</a></nav>${body}</main></body></html>`;
}
export function publicHttpError(
  request: Request,
  c: HollowContainer,
  error: unknown,
) {
  const raw = serializeError(error);
  const safe = redactForClient(raw);
  const busy =
    raw.code === SystemErrorCode.ShareSnapshotChanged ||
    raw.code === SystemErrorCode.PublicSearchBusy;
  const status =
    raw.code === "PUBLIC_TRASHED" ? 410 : busy ? 503 : httpStatusFor(raw);
  if (raw.kind === "system" || raw.kind === "unknown")
    c.logger.error("Public HTTP failed", { kind: raw.kind, code: raw.code });
  const headers = publicHeaders(false);
  if (busy) headers.set("Retry-After", "3");
  const unavailable = status === 404 || status === 410;
  return new Response(
    request.method === "HEAD"
      ? null
      : publicPage(
          unavailable ? "ページを利用できません" : "閲覧できません",
          `<h1>${unavailable ? "このページは利用できません。" : "閲覧できませんでした。"}</h1>${unavailable ? "" : `<p>${escapeHtml(safe.message)}</p>`}`,
        ),
    { status, headers },
  );
}
export async function publicationHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/public-default.svg") {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    if (url.search)
      return new Response(null, { status: 404, headers: publicHeaders(false) });
    return new Response(
      request.method === "HEAD"
        ? null
        : '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#eef2f5"/><rect x="410" y="110" width="380" height="410" rx="20" fill="white" stroke="#456" stroke-width="8"/><path d="M475 220h250M475 300h250M475 380h170" stroke="#456" stroke-width="18"/><text x="600" y="590" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#234">Hollow</text></svg>',
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      },
    );
  }
  if (!url.pathname.startsWith("/p/")) return null;
  let stream: ReadableStream<Uint8Array> | null = null;
  try {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, {
        status: 405,
        headers: {
          ...Object.fromEntries(publicHeaders(false)),
          Allow: "GET, HEAD",
        },
      });
    if (url.search) throw publicNotFound();
    const assetRef = parsePublicAssetUrl(url.pathname);
    if (assetRef) {
      const asset = await getPublicAsset(c, assetRef, assetRef.assetId);
      const storage = importContext(c).storage;
      const info = await storage.stat(asset.storageKey);
      if (info.bytes !== asset.bytes)
        throw new SystemError(
          SystemErrorCode.DataIntegrityError,
          "Public media length mismatch",
        );
      const range = singleRange(request.headers.get("range"), info.bytes);
      if (range !== "invalid" && request.method !== "HEAD")
        stream = await storage.stream(asset.storageKey, range ?? undefined);
      const latest = await getPublicAsset(c, assetRef, assetRef.assetId);
      if (
        latest.storageKey !== asset.storageKey ||
        latest.bytes !== asset.bytes ||
        latest.sha256 !== asset.sha256 ||
        latest.mime !== asset.mime
      )
        throw publicNotFound();
      const headers = publicHeaders();
      headers.set("Accept-Ranges", "bytes");
      headers.set(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
      if (range === "invalid") {
        headers.set("Content-Range", `bytes */${info.bytes}`);
        return new Response(null, { status: 416, headers });
      }
      headers.set("Content-Type", asset.mime);
      headers.set("Content-Disposition", "inline");
      headers.set(
        "Content-Length",
        String(range ? range.end - range.start + 1 : info.bytes),
      );
      if (range)
        headers.set(
          "Content-Range",
          `bytes ${range.start}-${range.end}/${info.bytes}`,
        );
      return new Response(stream, { status: range ? 206 : 200, headers });
    }
    const match =
      /^\/p\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/(1)(\/document|\/print)?$/.exec(
        url.pathname,
      );
    if (!match?.[1]) throw publicNotFound();
    const content = await readPublicNote(
      c,
      { publicId: match[1], urlGeneration: 1 },
      request.signal,
    );
    const canonical = new URL(content.path, c.appUrl).href;
    if (match[3] === "/print")
      return notePrintResponse(
        request,
        {
          title: content.title,
          html: content.html,
          assetUrls: content.assetUrls,
          externalSources: content.externalSources,
          displayStyle: content.display.style,
        },
        new URL(c.appUrl).origin,
        content.path,
      );
    const headers = publicHeaders();
    if (match[3]) {
      headers.set(
        "Content-Security-Policy",
        "sandbox allow-same-origin; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      );
      const document = frameDocument(
        content.html,
        content.assetUrls,
        new URL(c.appUrl).origin,
        content.externalSources,
        content.display.style,
      ).replace(
        "</head>",
        `<title>${escapeHtml(content.title)} — Hollow</title><meta name="referrer" content="no-referrer"><link rel="canonical" href="${escapeHtml(canonical)}"></head>`,
      );
      return new Response(request.method === "HEAD" ? null : document, {
        headers,
      });
    }
    const links = content.links.filter((link) => safeParentLink(link.url));
    const author = escapeHtml(authorLabel(content.author));
    const printable = content.html.trim() !== "";
    const body = `<h1>${escapeHtml(content.title)}</h1><p>著者: ${content.authorUrl ? `<a href="${escapeHtml(content.authorUrl)}">${author}</a>` : author}<br><small>更新: <time datetime="${content.updatedAt}">${escapeHtml(content.updatedAt)}</time></small></p>${content.owner ? `<p>現在の公開ページ: <a href="${escapeHtml(content.owner.url)}">${escapeHtml(content.owner.label)}</a></p>` : ""}${content.tags.length ? `<p>${content.tags.map((tag) => `<a href="/discover?tag=${encodeURIComponent(tag.name)}">#${escapeHtml(tag.name)}</a>`).join(" · ")}</p>` : ""}<nav><a href="#reference-ledger">参照リソース一覧へ</a><a href="${content.path}/document">本文を別画面で開く</a><a href="/s/export-public/${content.publicId}/${content.urlGeneration}">ダウンロード</a>${printable ? `<a href="${content.path}/print">印刷</a>` : ""}</nav>${printable ? readingPrintNotice : ""}<iframe title="ノート本文" sandbox="allow-same-origin" referrerpolicy="no-referrer" src="${content.path}/document"></iframe>${referenceLedgerHtml(content.references)}${content.removed.length ? `<details><summary>表示について</summary><ul>${content.removed.map((notice) => `<li>${escapeHtml(notice)}</li>`).join("")}</ul></details>` : ""}${links.length ? `<details><summary>本文中のリンク</summary><ul>${links.map((link) => `<li><a href="${escapeHtml(link.url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(link.label || link.url)}</a></li>`).join("")}</ul></details>` : ""}`;
    return new Response(
      request.method === "HEAD"
        ? null
        : publicPage(content.title, body, {
            canonical,
            description: content.description,
            image: new URL(content.image ?? "/public-default.svg", c.appUrl)
              .href,
            article: true,
          }),
      { headers },
    );
  } catch (error) {
    if (stream) await stream.cancel().catch(() => {});
    return publicHttpError(request, c, error);
  }
}

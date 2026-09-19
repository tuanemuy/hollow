import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import {
  ForbiddenError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import { importContext } from "@repo/core/application/import/context";
import {
  checkShareAvailable,
  getSharedAsset,
  readSharedNote,
  shareNotFound,
  unlockShare,
} from "@repo/core/application/sharing/reading";
import type { ShareAuthor } from "@repo/core/domain/sharing/entity";
import { parseSharedAssetUrl } from "@repo/core/domain/sharing/urls";
import {
  escapeAttribute,
  frameDocument,
  safeParentLink,
} from "../components/hollow/editorMedia";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";
import { singleRange } from "./mediaHttp.node";

const cookieName = "hollow_share_browser";
const cookie = (request: Request, name: string) => {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
};
const authorLabel = (author: ShareAuthor) =>
  author.kind === "named"
    ? author.displayName
    : author.kind === "unset"
      ? "表示名未設定"
      : author.kind === "deleted"
        ? "退会済みの著者"
        : "著者不明";
const page = (title: string, body: string) =>
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${escapeAttribute(title)} — Hollow</title><style>body{margin:0;background:#fafafa;color:#202020;font:16px/1.7 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:24px}h1{line-height:1.4;overflow-wrap:anywhere}input,button{font:inherit;padding:10px;max-width:100%;box-sizing:border-box}label{display:block;margin:16px 0 4px}button,a{touch-action:manipulation}button{cursor:pointer}a{color:inherit}iframe{border:1px solid #ddd;background:white;width:100%;height:75vh;margin-top:20px}small{color:#555}.error{border-left:3px solid #555;padding:12px}ul{padding-left:24px}nav{display:flex;gap:16px;flex-wrap:wrap}@media(max-width:450px){main{padding:16px}h1{font-size:25px}}</style></head><body><main>${body}</main></body></html>`;
function gate(token: string, message?: string) {
  return page(
    "限定リンク",
    `<h1>限定リンク</h1><p>パスワードを入力してください。</p>${message ? `<p class="error" role="alert">${escapeAttribute(message)}</p>` : ""}<form method="post" action="/s/${token}/unlock"><label for="password">パスワード</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><p><button type="submit">閲覧する</button></p></form><p><small>Cookie を有効にしてください。通過したブラウザーで24時間閲覧できます。読み込みで期限は延長されません。</small></p>`,
  );
}
async function boundedPassword(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const type = request.headers.get("content-type")?.split(";")[0];
  if (type !== "application/x-www-form-urlencoded") return null;
  const params = new URLSearchParams(new TextDecoder().decode(all));
  if (
    params.getAll("password").length !== 1 ||
    [...params.keys()].some((key) => key !== "password")
  )
    return null;
  const password = params.get("password");
  return password && new TextEncoder().encode(password).byteLength <= 1024
    ? password
    : null;
}
export async function sharingHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/s/")) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Type": "text/html; charset=utf-8",
  });
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; img-src * data:; media-src * data:; font-src *; object-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  const assetRef = parseSharedAssetUrl(url.pathname);
  const route = /^\/s\/([A-Za-z0-9_-]{43})(\/unlock)?$/.exec(url.pathname);
  const browser = cookie(request, cookieName);
  const setBrowser = (value: string) =>
    headers.append(
      "Set-Cookie",
      `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/s; Max-Age=86400${new URL(c.appUrl).protocol === "https:" ? "; Secure" : ""}`,
    );
  let stream: ReadableStream<Uint8Array> | null = null;
  try {
    if (assetRef) {
      if (!["GET", "HEAD"].includes(request.method)) {
        headers.set("Allow", "GET, HEAD");
        return new Response(null, { status: 405, headers });
      }
      const asset = await getSharedAsset(
        c,
        assetRef.token,
        browser,
        assetRef.assetId,
      );
      const storage = importContext(c).storage;
      const info = await storage.stat(asset.storageKey);
      if (info.bytes !== asset.bytes)
        throw new SystemError(
          SystemErrorCode.DataIntegrityError,
          "Shared media length mismatch",
        );
      const range = singleRange(request.headers.get("range"), info.bytes);
      if (range !== "invalid" && request.method !== "HEAD")
        stream = await storage.stream(asset.storageKey, range ?? undefined);
      const latest = await getSharedAsset(
        c,
        assetRef.token,
        browser,
        assetRef.assetId,
      );
      if (
        latest.storageKey !== asset.storageKey ||
        latest.bytes !== asset.bytes ||
        latest.sha256 !== asset.sha256 ||
        latest.mime !== asset.mime
      )
        return shareNotFound();
      headers.set("Accept-Ranges", "bytes");
      if (range === "invalid") {
        headers.set("Content-Range", `bytes */${info.bytes}`);
        return new Response(null, { status: 416, headers });
      }
      headers.set("Content-Type", asset.mime);
      headers.set("Content-Disposition", "inline");
      headers.set(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
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
    if (!route?.[1]) return shareNotFound();
    const token = route[1];
    if (route[2]) {
      if (request.method !== "POST") {
        headers.set("Allow", "POST");
        return new Response(null, { status: 405, headers });
      }
      const origin = request.headers.get("origin");
      const sameOriginForm =
        origin === "null" &&
        request.headers.get("sec-fetch-site") === "same-origin" &&
        request.headers.get("sec-fetch-mode") === "navigate" &&
        request.headers.get("sec-fetch-dest") === "document";
      if (origin !== new URL(c.appUrl).origin && !sameOriginForm)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
      await checkShareAvailable(c, token);
      if (!browser) {
        setBrowser(c.tokens.generate());
        return new Response(
          gate(
            token,
            "Cookie を有効にして、パスワードをもう一度入力してください。",
          ),
          { status: 400, headers },
        );
      }
      const password = await boundedPassword(request);
      if (password === null)
        return new Response(gate(token, "パスワードを確認してください。"), {
          status: 422,
          headers,
        });
      const result = await unlockShare(c, token, browser, password);
      if (result.kind === "accepted") {
        setBrowser(browser);
        headers.set("Location", `/s/${token}`);
        return new Response(null, { status: 303, headers });
      }
      if (result.kind === "blocked")
        headers.set(
          "Retry-After",
          String(
            Math.max(
              1,
              Math.ceil(
                (new Date(result.retryAt).getTime() - c.clock.now().getTime()) /
                  1000,
              ),
            ),
          ),
        );
      return new Response(
        gate(
          token,
          result.kind === "blocked"
            ? "試行が多いため、しばらく待ってから再試行してください。"
            : "パスワードを確認してください。",
        ),
        { status: result.kind === "blocked" ? 429 : 422, headers },
      );
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    const content = await readSharedNote(
      c,
      token,
      browser,
      cookie(request, "hollow_session"),
      true,
    );
    if (content.kind === "gate") {
      if (!browser) setBrowser(c.tokens.generate());
      return new Response(request.method === "HEAD" ? null : gate(token), {
        headers,
      });
    }
    if (!browser) setBrowser(c.tokens.generate());
    const frame = frameDocument(
      content.html,
      content.assetUrls,
      url.origin,
      content.externalSources,
      content.display.style,
    );
    const links = content.links.filter((link) => safeParentLink(link.url));
    const body = `<nav><span>Hollow · 限定公開</span>${content.canEdit ? `<a href="/notes/${content.noteId}/edit">編集する</a>` : ""}</nav><h1>${escapeAttribute(content.title)}</h1><p>著者: ${escapeAttribute(authorLabel(content.author))}<br><small>更新: <time datetime="${content.updatedAt}">${escapeAttribute(content.updatedAt)}</time></small></p>${content.tags.length ? `<p>${content.tags.map((tag) => `<span>#${escapeAttribute(tag.name)}</span>`).join(" · ")}</p>` : ""}<iframe title="ノート本文" sandbox="allow-same-origin" referrerpolicy="no-referrer" srcdoc="${escapeAttribute(frame)}"></iframe>${content.removed.length ? `<details><summary>表示について</summary><ul>${content.removed.map((text) => `<li>${escapeAttribute(text)}</li>`).join("")}</ul></details>` : ""}${links.length ? `<details><summary>本文中のリンク</summary><ul>${links.map((link) => `<li><a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeAttribute(link.label || link.url)}</a></li>`).join("")}</ul></details>` : ""}`;
    const exportForm = `<section aria-label="ノートの書き出し"><h2>書き出し</h2><p>保存済みの現在の本文を書き出します。準備中はブラウザーの読み込み表示で進行します。中止はブラウザーの停止操作を使ってください。</p><p><small>Markdownの画像・HTML対応は閲覧器に依存します。外部参照は後日の変更やオフライン表示を保証しません。除去した内容がある場合はファイル末尾の「書き出しについて」に示します。</small></p><form method="post" action="/s/${token}/exports"><button name="format" value="html" type="submit">HTMLを書き出す</button> <button name="format" value="markdown" type="submit">Markdownを書き出す</button></form></section>`;
    return new Response(
      request.method === "HEAD" ? null : page(content.title, body + exportForm),
      { headers },
    );
  } catch (error) {
    if (stream) await stream.cancel().catch(() => {});
    const raw = serializeError(error);
    const safe = redactForClient(raw);
    const busy =
      raw.code === SystemErrorCode.SharePasswordBusy ||
      raw.code === SystemErrorCode.ShareSnapshotChanged;
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Sharing HTTP failed", { kind: raw.kind, code: raw.code });
    if (busy) headers.set("Retry-After", "3");
    const status = busy ? 503 : httpStatusFor(raw);
    const body = page(
      status === 404 ? "リンクを利用できません" : "閲覧できません",
      `<h1>${status === 404 ? "このリンクは利用できません。" : "閲覧できませんでした。"}</h1><p>${escapeAttribute(busy ? "しばらく待ってから再読み込みしてください。" : safe.message)}</p>`,
    );
    return new Response(request.method === "HEAD" ? null : body, {
      status,
      headers,
    });
  }
}

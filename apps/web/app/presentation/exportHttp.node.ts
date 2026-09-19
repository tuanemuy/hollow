import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import type { ExportFormat } from "@repo/core/application/export/document";
import {
  type ExportAccess,
  exportNotFound,
  publicExportPage,
} from "@repo/core/application/export/snapshot";
import {
  getExportFile,
  prepareExport,
} from "@repo/core/application/export/usecases";
import { escapeAttribute } from "../components/hollow/editorMedia";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

const cookie = (request: Request, name: string) => {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith(`${name}=`)) ?? [];
  const value = values.length === 1 ? values[0]?.slice(name.length + 1) : null;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
};
const page = (body: string) =>
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>書き出し — Hollow</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:48rem;margin:0 auto;padding:24px;overflow-wrap:anywhere}a,button{font:inherit;padding:12px;display:inline-block}button{cursor:pointer}</style></head><body><main>${body}</main></body></html>`;
async function formatInput(
  request: Request,
  native: boolean,
): Promise<ExportFormat> {
  if (!request.body) throw new Error("Missing export format");
  const reader = request.body.getReader();
  let expired = false;
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 5000);
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        throw new Error("Export input too large");
      }
      chunks.push(next.value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (expired) throw new Error("Export input timeout");
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = new TextDecoder().decode(all);
  let value: unknown;
  if (native) {
    if (
      request.headers.get("content-type")?.split(";")[0] !==
      "application/x-www-form-urlencoded"
    )
      throw new Error("Export content type");
    const params = new URLSearchParams(raw);
    if (
      [...params.keys()].some((key) => key !== "format") ||
      params.getAll("format").length !== 1
    )
      throw new Error("Export format");
    value = params.get("format");
  } else {
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/json"
    )
      throw new Error("Export content type");
    const input: unknown = JSON.parse(raw);
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length !== 1 ||
      !("format" in input)
    )
      throw new Error("Export format");
    value = input.format;
  }
  if (value !== "html" && value !== "markdown")
    throw new Error("Export format");
  return value;
}

export async function exportHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const app =
    /^\/api\/notes\/([a-f0-9-]{36})\/exports(?:\/([a-f0-9-]{36}))?$/.exec(
      url.pathname,
    );
  const link = /^\/s\/([A-Za-z0-9_-]{43})\/exports(?:\/([a-f0-9-]{36}))?$/.exec(
    url.pathname,
  );
  const published =
    /^\/s\/export-public\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/1(?:\/([a-f0-9-]{36}))?$/.exec(
      url.pathname,
    );
  if (!app && !link && !published) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  const native = Boolean(link || published);
  const route = published ?? link ?? app;
  const id = route?.[2];
  headers.set(
    "Content-Type",
    native ? "text/html; charset=utf-8" : "application/json",
  );
  try {
    if (!route?.[1] || url.search) return exportNotFound();
    const browser = cookie(request, "hollow_share_browser");
    if (published && !id && request.method === "GET") {
      const metadata = await publicExportPage(c, {
        publicId: route[1],
        urlGeneration: 1,
      });
      const duplicate =
        (request.headers
          .get("cookie")
          ?.split(";")
          .filter((v) => v.trim().startsWith("hollow_share_browser=")).length ??
          0) > 1;
      const navigation =
        request.headers.get("sec-fetch-mode") === "navigate" &&
        request.headers.get("sec-fetch-dest") === "document" &&
        ["same-origin", "none"].includes(
          request.headers.get("sec-fetch-site") ?? "",
        );
      if (duplicate || (!browser && !navigation))
        return new Response(
          page(
            `<h1>ダウンロードの準備</h1><p>ブラウザーで公開ノートから開き直し、Cookie を有効にしてください。</p><a href="${escapeAttribute(metadata.path)}">公開ノートに戻る</a>`,
          ),
          { status: 403, headers },
        );
      if (!browser)
        headers.append(
          "Set-Cookie",
          `hollow_share_browser=${c.tokens.generate()}; HttpOnly; SameSite=Lax; Path=/s; Max-Age=86400${new URL(c.appUrl).protocol === "https:" ? "; Secure" : ""}`,
        );
      return new Response(
        page(
          `<h1>${escapeAttribute(metadata.title)} — ダウンロード</h1><p>保存済みの現在の内容を書き出します。HTML は1ファイルに画像を埋め込みます。Markdown の画像や非対応 HTML の表示は閲覧器によって異なります。外部参照は後から変化することがあります。</p>${metadata.hasBody ? `<form method="post" action="${escapeAttribute(url.pathname)}"><button name="format" value="html">HTML をダウンロード</button><button name="format" value="markdown">Markdown をダウンロード</button></form>` : "<p>本文が空のためダウンロードできません。</p>"}<p><a href="${escapeAttribute(metadata.path)}">公開ノートに戻る</a></p>`,
        ),
        { headers },
      );
    }
    const access: ExportAccess = published
      ? {
          kind: "public",
          publicId: route[1],
          urlGeneration: 1,
          browser: browser ?? "",
        }
      : link
        ? { kind: "link", token: route[1], browser: browser ?? "" }
        : {
            kind: "account",
            noteId: route[1],
            session: cookie(request, "hollow_session"),
          };
    if ((link || published) && !browser) return exportNotFound();
    const allowed = id ? ["GET"] : published ? ["GET", "POST"] : ["POST"];
    if (!allowed.includes(request.method)) {
      headers.set("Allow", allowed.join(", "));
      return new Response(null, { status: 405, headers });
    }
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      const localNative =
        native &&
        request.method === "POST" &&
        origin === "null" &&
        request.headers.get("sec-fetch-site") === "same-origin" &&
        request.headers.get("sec-fetch-mode") === "navigate" &&
        request.headers.get("sec-fetch-dest") === "document";
      if (origin !== new URL(c.appUrl).origin && !localNative)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
    }
    if (id && request.method === "GET") {
      if (request.headers.has("range"))
        return new Response(null, { status: 416, headers });
      const result = await getExportFile(c, access, id);
      headers.set("Content-Type", result.file.mime);
      headers.set("Content-Length", String(result.file.bytes));
      const filename = encodeURIComponent(result.file.filename).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      headers.set(
        "Content-Disposition",
        `attachment; filename="note.${result.file.mime.startsWith("text/html") ? "html" : "md"}"; filename*=UTF-8''${filename}`,
      );
      return new Response(result.body, { headers });
    }
    let format: ExportFormat;
    try {
      format = await formatInput(request, native);
    } catch {
      return new Response(
        native
          ? page(
              "<h1>形式を確認してください</h1><p>元の画面からやり直してください。</p>",
            )
          : JSON.stringify({
              error: {
                kind: "validation",
                code: "EXPORT_INPUT",
                message: "形式を確認してください。",
              },
            }),
        { status: 422, headers },
      );
    }
    const result = await prepareExport(c, access, format, request.signal);
    const downloadPath = `${url.pathname}/${result.operationId}`;
    if (native) {
      headers.set("Location", downloadPath);
      return new Response(null, { status: 303, headers });
    }
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ ...result, downloadPath }), {
      headers,
    });
  } catch (error) {
    const raw = serializeError(error);
    const safe = redactForClient(raw);
    const status =
      raw.code === "EXPORT_RATE_LIMIT"
        ? 429
        : ["EXPORT_BUSY", "EXPORT_DISK_BUSY"].includes(raw.code ?? "")
          ? 503
          : httpStatusFor(raw);
    if (status === 429 || status === 503)
      headers.set("Retry-After", status === 429 ? "60" : "3");
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Export HTTP failed", { kind: raw.kind, code: raw.code });
    headers.set(
      "Content-Type",
      native ? "text/html; charset=utf-8" : "application/json",
    );
    return new Response(
      native
        ? page(
            `<h1>書き出せませんでした</h1><p>${escapeAttribute(safe.message)}</p><p>元のノートで現在の内容を確認してから、手動でやり直してください。</p>`,
          )
        : JSON.stringify({ error: safe }),
      { status, headers },
    );
  }
}

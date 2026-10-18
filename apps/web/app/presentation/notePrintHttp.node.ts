import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { getNote } from "@repo/core/application/note/getNote";
import { escapeAttribute } from "../components/hollow/editorMedia";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";
import { externalDocumentReadingAllowed } from "./externalReading";
import { notePrintResponse } from "./notePrint";

const session = (request: Request) => {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith("hollow_session=")) ?? [];
  const value =
    values.length === 1 ? values[0]?.slice("hollow_session=".length) : null;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
};

const headers = () =>
  new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });

export async function notePrintHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = /^\/notes\/([a-f0-9-]{36})\/print$/.exec(url.pathname);
  if (!match?.[1]) return null;
  const noteId = match[1];
  if (!["GET", "HEAD"].includes(request.method)) {
    const response = headers();
    response.set("Allow", "GET, HEAD");
    return new Response(null, { status: 405, headers: response });
  }
  try {
    const token = session(request);
    const note = await getNote(c, token, noteId);
    const rendered = await renderNote(c, token, {
      html: note.html,
      noteId,
      externalReading: externalDocumentReadingAllowed(c.appUrl, {
        destination: request.headers.get("sec-fetch-dest") ?? undefined,
        mode: request.headers.get("sec-fetch-mode") ?? undefined,
        site: request.headers.get("sec-fetch-site") ?? undefined,
      }),
    });
    return notePrintResponse(
      request,
      {
        title: note.title,
        html: rendered.html,
        assetUrls: rendered.assetUrls,
        externalSources: rendered.externalSources,
        displayStyle: note.display.style,
      },
      new URL(c.appUrl).origin,
      `/notes/${noteId}`,
    );
  } catch (error) {
    const raw = serializeError(error);
    const safe = redactForClient(raw);
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Note print failed", { kind: raw.kind, code: raw.code });
    const status = httpStatusFor(raw);
    const message =
      status === 404 || status === 401
        ? "ノートが見つからないか、閲覧できません。"
        : safe.message;
    return new Response(
      request.method === "HEAD"
        ? null
        : `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>印刷できません — Hollow</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:48rem;margin:0 auto;padding:24px 16px;overflow-wrap:anywhere;color:#202020}a{color:inherit}</style></head><body><main><h1>印刷できません</h1><p>${escapeAttribute(message)}</p><p><a href="/notes">ノート一覧へ</a></p></main></body></html>`,
      { status, headers: headers() },
    );
  }
}

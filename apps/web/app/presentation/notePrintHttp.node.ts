import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { getNote } from "@repo/core/application/note/getNote";
import { authenticationCookie } from "./authenticationHttp.node";
import { serializeError } from "./errorResponse";
import { externalDocumentReadingAllowed } from "./externalReading";
import { notePrintResponse, returnToEntry } from "./notePrint";

/**
 * `/notes/:noteId/print`. Whatever keeps the note from printing (no session,
 * no access, gone, empty body) sends the reader back to the note detail,
 * which already shows sign-in, not-found and empty states.
 */
export async function notePrintHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const match = /^\/notes\/([a-f0-9-]{36})\/print$/.exec(
    new URL(request.url).pathname,
  );
  if (!match?.[1]) return null;
  const noteId = match[1];
  const detail = `/notes/${noteId}`;
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "private, no-store" },
    });
  try {
    const token = authenticationCookie(request, "hollow_session");
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
      { ...rendered, title: note.title, display: note.display },
      new URL(c.appUrl).origin,
      detail,
    );
  } catch (error) {
    const raw = serializeError(error);
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Note print failed", { kind: raw.kind, code: raw.code });
    return returnToEntry(detail);
  }
}

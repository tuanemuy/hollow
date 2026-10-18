import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { getNote } from "@repo/core/application/note/getNote";
import { hasBody } from "@repo/core/domain/note/entity";
import { authenticationCookie } from "./authenticationHttp.node";
import { serializeError } from "./errorResponse";
import { externalDocumentReadingAllowed } from "./externalReading";
import { notePrintResponse, returnToEntry } from "./notePrint";
import { publicHttpError } from "./publicationHttp.node";

/**
 * `/notes/:noteId/print`. No session, no access, a missing or trashed note
 * and an empty saved body send the reader back to the note detail, which
 * already shows sign-in, not-found and empty states; a system failure is
 * reported as one.
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
    if (!hasBody(note.html)) return returnToEntry(detail);
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
    const { kind } = serializeError(error);
    return kind === "system" || kind === "unknown"
      ? publicHttpError(request, c, error)
      : returnToEntry(detail);
  }
}

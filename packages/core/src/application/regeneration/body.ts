import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import type { Note } from "@repo/core/domain/note/entity";
import { editNote } from "@repo/core/domain/note/entity";
import type { NoteRevision } from "@repo/core/domain/note/revision";
import { assetNotFound, authorizedHistoryAsset } from "../asset/access";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitNote } from "../note/commitNote";
import { checkedSnapshot } from "../note/history";
import { inspectDependencies } from "../reference/dependencies";
import { scheduleReferences } from "../reference/schedule";
export const commitRegeneratedBody = commitNote;
export async function prepareBody(
  c: HollowContainer,
  note: Note,
  html: string,
) {
  const document = c.referencing?.processor.prepare(html);
  const inspections = document
    ? await inspectDependencies(c, document)
    : new Map<string, string>();
  const safe = c.htmlSanitizer.sanitize(document?.html ?? html);
  const projection = await c.browsing?.projection.project({
    title: note.title,
    html: safe.html,
  });
  return { safe, document, inspections, projection };
}
export async function adoptBody(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  note: Note,
  jobId: string,
  accountId: string,
  body: Awaited<ReturnType<typeof prepareBody>>,
) {
  const updated = editNote(note, note.title, body.safe.html, c.clock.now());
  await commitRegeneratedBody(c, u, {
    previous: note,
    note: updated,
    actor: { kind: "system", jobId },
    cause: "import",
    projection: body.projection,
    afterCurrent: async () => {
      if (body.document)
        await scheduleReferences(
          c,
          u,
          updated,
          accountId,
          { ...body.document, html: body.safe.html },
          undefined,
          null,
          body.inspections,
        );
    },
  });
  return updated;
}
export async function prepareUndoBody(
  c: HollowContainer,
  note: Note,
  revision: NoteRevision,
) {
  const snapshot = await checkedSnapshot(c, revision);
  return { snapshot, body: await prepareBody(c, note, snapshot.html) };
}

export async function authorizeUndoResources(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  revision: NoteRevision,
  html: string,
) {
  for (const url of c.htmlSanitizer.assetUrls(html)) {
    const ref = parseAssetUrl(url);
    if (!ref || ref.scope !== "notes" || ref.scopeId !== revision.noteId)
      throw assetNotFound();
    await authorizedHistoryAsset(u, accountId, {
      scope: "history",
      scopeId: revision.noteId,
      revisionNo: revision.revisionNo,
      assetId: ref.assetId,
    });
  }
}

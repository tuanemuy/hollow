import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import type { Note } from "@repo/core/domain/note/entity";
import {
  type NoteRevision,
  REVISION_LIMIT,
  type RevisionActor,
  type RevisionCause,
  type RevisionResource,
  recordHumanMutation,
  requireRetainedWysOrigin,
  sameNoteContent,
  type WysOriginHint,
} from "@repo/core/domain/note/revision";
import { sameScope, selectedScope } from "@repo/core/domain/workspace/entity";
import { assetNotFound, requireDraft } from "../asset/access";
import type { NoteProjection } from "../browse/ports";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

async function resources(
  context: HollowUnitOfWorkContext,
  note: Note,
): Promise<readonly RevisionResource[]> {
  return (await context.references.entries(note.id))
    .filter(
      (e) =>
        e.current &&
        e.state === "acquired" &&
        (e.kind === "image" || e.kind === "video" || e.kind === "stylesheet"),
    )
    .map((e) => ({
      kind: e.kind as RevisionResource["kind"],
      url: e.url,
      finalUrl: e.finalUrl,
      assetId: e.assetId,
      bytes: e.bytes,
    }));
}
function snapshot(
  note: Note,
  revisionNo: number,
  actor: RevisionActor,
  cause: RevisionCause,
  savedAt: Date,
  manifest: readonly RevisionResource[],
  restoredFrom: number | null = null,
  originRevisionNo: number | null = null,
): NoteRevision {
  return {
    noteId: note.id,
    revisionNo,
    capturedNoteVersion: note.version,
    title: note.title,
    html: note.html,
    style: note.display.style,
    actor,
    cause,
    savedAt,
    restoredFrom,
    originRevisionNo,
    resources: manifest,
  };
}
export async function ensureRevisionHead(
  context: HollowUnitOfWorkContext,
  note: Note,
) {
  const existing = await context.revisions.head(note.id);
  if (existing) return existing;
  const head = {
    noteId: note.id,
    currentNo: 1,
    baseFloor: note.version,
    actors: [],
  };
  await context.revisions.insert(
    snapshot(
      note,
      1,
      { kind: "legacy" },
      "baseline",
      note.updatedAt,
      await resources(context, note),
    ),
  );
  await context.assets.pinRevision(
    note.id,
    1,
    await context.assets.referenceIds(note.id, 0),
  );
  await context.revisions.saveHead(head);
  return head;
}

/** Called inside the caller's authorization and job-guard transaction. */
export async function commitNote(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  input: {
    previous: Note | null;
    projection?: NoteProjection | undefined;
    note: Note;
    actor: RevisionActor;
    cause: RevisionCause;
    restoredFrom?: number;
    wysOrigin?: WysOriginHint;
    draftId?: string | undefined;
    afterCurrent?: (note: Note, changed: boolean) => Promise<void>;
  },
) {
  const { previous, note, actor, cause } = input;
  const now = container.clock.now();
  const changed = !previous || !sameNoteContent(previous, note);
  if (previous && changed)
    await context.zipRequests.invalidateNote(
      note.id,
      now,
      "ZIP_CONTENT_CHANGED",
    );
  const bodyChanged =
    !previous || previous.title !== note.title || previous.html !== note.html;
  if (
    container.browsing &&
    bodyChanged &&
    (!input.projection ||
      input.projection.sourceHtml !== note.html ||
      input.projection.sourceTitle !== note.title)
  )
    throw new ConflictError(
      "PROJECTION_STALE",
      "本文の準備中に保存内容が変わりました。最新の入力を保持したまま再試行してください。",
    );
  const head = previous
    ? await ensureRevisionHead(context, previous)
    : { noteId: note.id, currentNo: 0, baseFloor: 0, actors: [] };
  const revisionNo = changed ? head.currentNo + 1 : head.currentNo;
  const previousRevision = previous
    ? await context.revisions.find(note.id, head.currentNo)
    : null;
  let originRevisionNo =
    cause === "restore" ? null : (previousRevision?.originRevisionNo ?? null);
  if (
    previous &&
    cause !== "restore" &&
    note.html !== previous.html &&
    input.wysOrigin
  ) {
    originRevisionNo = requireRetainedWysOrigin(
      note.id,
      input.wysOrigin,
      await context.revisions.find(note.id, input.wysOrigin.revisionNo),
      (await context.revisions.list(note.id)).map(
        (revision) => revision.revisionNo,
      ),
      revisionNo,
    );
  }
  if (previous) await context.notes.save(note, previous.version);
  else await context.notes.insert(note);
  if (input.draftId) {
    if (input.actor.kind !== "user") throw assetNotFound();
    const draft = await requireDraft(
      context,
      input.draftId,
      input.actor.accountId,
      now,
    );
    if (draft.noteId && draft.noteId !== note.id) throw assetNotFound();
    if (
      !draft.noteId &&
      !sameScope(
        note.owner,
        selectedScope(draft.accountId, {
          workspaceId: draft.workspaceId ?? undefined,
        }),
      )
    )
      throw assetNotFound();
    await context.assets.bindDraft(draft.id, note.id);
  }
  const ids: string[] = [];
  for (const url of container.htmlSanitizer.assetUrls(note.html)) {
    const reference = parseAssetUrl(url);
    if (
      !reference ||
      reference.scope !== "notes" ||
      reference.scopeId !== note.id
    )
      throw assetNotFound();
    const asset = await context.assets.find(reference.assetId);
    if (!asset || asset.state !== "ready") throw assetNotFound();
    const origin = asset.draftId
      ? await context.assets.findDraft(asset.draftId)
      : null;
    if (
      asset.sourceNoteId !== note.id &&
      origin?.noteId !== note.id &&
      !(await context.assets.isReferenced(note.id, asset.id))
    )
      throw assetNotFound();
    ids.push(asset.id);
  }
  if (changed) await context.assets.pinRevision(note.id, revisionNo, ids);
  await context.assets.replaceCurrentReferences(note.id, ids, now);
  await input.afterCurrent?.(note, changed);
  if (changed) {
    await context.revisions.insert(
      snapshot(
        note,
        revisionNo,
        actor,
        cause,
        now,
        await resources(context, note),
        input.restoredFrom,
        originRevisionNo,
      ),
    );
    await context.revisions.saveHead({
      ...head,
      currentNo: revisionNo,
      actors:
        actor.kind === "user"
          ? recordHumanMutation(head.actors, actor.accountId, note.version)
          : head.actors,
    });
    const discarded = await context.revisions.prune(note.id, REVISION_LIMIT);
    await context.assets.removeRevisionPins(note.id, discarded, now);
  }
  if (container.browsing && bodyChanged && input.projection)
    await context.browseIndex.save(note.id, note.version, input.projection);
  return { note, changed, revisionNo };
}

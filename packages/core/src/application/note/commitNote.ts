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
import { assetNotFound, requireDraft } from "../asset/access";
import type { HollowContainer } from "../di/hollowTypes";
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
    if (note.owner.kind !== "personal") throw assetNotFound();
    const draft = await requireDraft(
      context,
      input.draftId,
      note.owner.accountId,
      now,
    );
    if (draft.noteId && draft.noteId !== note.id) throw assetNotFound();
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
    if (
      !asset ||
      asset.state !== "ready" ||
      note.owner.kind !== "personal" ||
      asset.accountId !== note.owner.accountId
    )
      throw assetNotFound();
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
  return { note, changed, revisionNo };
}

import { historyAssetUrl, parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { editNote } from "@repo/core/domain/note/entity";
import type {
  NoteRevision,
  RevisionResource,
} from "@repo/core/domain/note/revision";
import { requireAccount } from "../account/session";
import { assetNotFound, authorizedHistoryAsset } from "../asset/access";
import { renderAuthorizedHtml } from "../asset/references";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { inspectDependencies } from "../reference/dependencies";
import { scheduleReferences } from "../reference/schedule";
import { requireNote } from "../workspace/access";
import { commitNote, ensureRevisionHead } from "./commitNote";
import { toNoteView } from "./view";
import { readWysContext } from "./wysContext";

const missingRevision = () =>
  new NotFoundError(
    "REVISION_NOT_FOUND",
    "この版は保持されていないか、閲覧できません。",
  );
async function requireRevision(
  context: HollowUnitOfWorkContext,
  noteId: string,
  revisionNo: number,
) {
  const revision = await context.revisions.find(noteId, revisionNo);
  if (!revision) throw missingRevision();
  return revision;
}
export async function getNoteVersion(
  container: HollowContainer,
  token: string | null,
  noteId: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return {
      version: (
        await requireNote(c, await c.notes.findById(noteId), account.id)
      ).version,
    };
  });
}
export async function listRevisions(
  container: HollowContainer,
  token: string | null,
  noteId: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = await requireNote(
      c,
      await c.notes.findById(noteId),
      account.id,
    );
    const head = await c.revisions.head(note.id);
    const items = await c.revisions.list(note.id);
    return {
      noteId,
      currentVersion: note.version,
      currentRevisionNo: head?.currentNo ?? 0,
      processing: (await c.imports.findByNote(note.id))?.state === "processing",
      items: items.map((r) => ({
        revisionNo: r.revisionNo,
        capturedNoteVersion: r.capturedNoteVersion,
        title: r.title,
        style: r.style,
        savedAt: r.savedAt.toISOString(),
        cause: r.cause,
        actorKind: r.actor.kind,
        isCurrent: r.revisionNo === head?.currentNo,
        sameAsCurrent:
          r.html === note.html &&
          r.title === note.title &&
          r.style === note.display.style,
      })),
    };
  });
}
async function checkedSnapshot(
  container: HollowContainer,
  revision: NoteRevision,
  signal?: AbortSignal,
) {
  const processor = container.referencing?.processor;
  let html = processor?.prepare(revision.html).html ?? revision.html;
  const accepted = new Set<string>();
  const resources: RevisionResource[] = revision.resources.filter(
    (r) => !r.url.startsWith("data:") && !r.finalUrl?.startsWith("data:"),
  );
  const removed: string[] = [];
  if (processor) {
    const replacements = new Map<string, string>();
    const data = new Set(
      processor
        .prepare(html)
        .candidates.filter(
          (c) =>
            (c.kind === "image" || c.kind === "video") &&
            c.url.startsWith("data:"),
        )
        .map((c) => c.url),
    );
    if (data.size > 200)
      throw new BusinessRuleError(
        "REVISION_DATA_SIZE",
        "この版の data URI は200件の検査上限を超えています。",
      );
    for (const uri of data) {
      const decoded = processor.decodeDataUri(uri);
      if (decoded.bytes.byteLength > 32 * 1024)
        throw new BusinessRuleError(
          "REVISION_DATA_SIZE",
          "この版の大きな data URI は安全なメディアとして再挿入してください。",
        );
      if (!container.inlineMedia)
        throw new BusinessRuleError(
          "MEDIA_UNAVAILABLE",
          "メディアの内容を検査できません。",
        );
      const bytes = decoded.bytes;
      const result = await container.inlineMedia.inspect({
        ...(signal ? { signal } : {}),
        bytes: bytes.byteLength,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
      });
      const safe = processor.encodeDataUri(
        result.sanitizedSvg ?? bytes,
        result.mime,
      );
      accepted.add(safe);
      replacements.set(uri, safe);
      resources.push({
        kind: result.kind,
        url: safe,
        finalUrl: safe,
        assetId: null,
        bytes: (result.sanitizedSvg ?? bytes).byteLength,
      });
      removed.push(...result.removed);
    }
    html = processor.rewrite(html, replacements, []).html;
  }
  const safe = container.htmlSanitizer.sanitize(html);
  return {
    html: safe.html,
    data: accepted,
    resources,
    removed: [...new Set([...removed, ...safe.removed])],
  };
}
async function snapshotAssets(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  accountId: string,
  revision: NoteRevision,
  html: string,
) {
  const replacements = new Map<string, string>();
  for (const url of container.htmlSanitizer.assetUrls(html)) {
    const ref = parseAssetUrl(url);
    if (!ref || ref.scope !== "notes" || ref.scopeId !== revision.noteId)
      throw assetNotFound();
    await authorizedHistoryAsset(context, accountId, {
      scope: "history",
      scopeId: revision.noteId,
      revisionNo: revision.revisionNo,
      assetId: ref.assetId,
    });
    replacements.set(
      url,
      historyAssetUrl({
        scope: "history",
        scopeId: revision.noteId,
        revisionNo: revision.revisionNo,
        assetId: ref.assetId,
      }),
    );
  }
  return replacements;
}
export async function renderRevision(
  container: HollowContainer,
  token: string | null,
  input: { noteId: string; revisionNo: number; externalReading?: boolean },
  signal?: AbortSignal,
) {
  const revision = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await requireNote(c, await c.notes.findById(input.noteId), account.id);
    return requireRevision(c, input.noteId, input.revisionNo);
  });
  const checked = await checkedSnapshot(container, revision, signal);
  const replacements = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await requireNote(c, await c.notes.findById(input.noteId), account.id);
    await requireRevision(c, input.noteId, input.revisionNo);
    return snapshotAssets(container, c, account.id, revision, checked.html);
  });
  const html = container.htmlSanitizer.rewriteAssets(
    checked.html,
    replacements,
  );
  const rendered = await renderAuthorizedHtml(
    container,
    html,
    new Set([...checked.data, ...replacements.values()]),
    input.externalReading,
    signal,
  );
  return {
    ...rendered,
    removed: [...new Set([...checked.removed, ...rendered.removed])],
    title: revision.title,
    displayStyle: revision.style,
  };
}
export async function restoreRevision(
  container: HollowContainer,
  token: string | null,
  input: { noteId: string; revisionNo: number; expectedVersion: number },
  signal?: AbortSignal,
) {
  const revision = await container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await requireNote(
      c,
      await c.notes.findById(input.noteId),
      account.id,
      "edit",
    );
    return requireRevision(c, input.noteId, input.revisionNo);
  });
  const checked = await checkedSnapshot(container, revision, signal);
  const document = container.referencing?.processor.prepare(checked.html);
  const inspections = document
    ? await inspectDependencies(container, document, signal)
    : new Map<string, string>();
  const result = await container.unitOfWorkProvider.run(async (c) => {
    if (signal?.aborted)
      throw new BusinessRuleError(
        "MEDIA_TIMEOUT",
        "復元の安全確認が制限時間を超えました。もう一度お試しください。",
      );
    const account = await requireAccount(container, c.accounts, token);
    const previous = await requireNote(
      c,
      await c.notes.findById(input.noteId),
      account.id,
      "edit",
    );
    await requireRevision(c, previous.id, input.revisionNo);
    if (previous.version !== input.expectedVersion)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "確認後にノートが更新されました。現在の内容を確認して、復元を選び直してください。",
      );
    const original = await c.imports.findByNote(previous.id);
    if (original?.state === "processing")
      throw new BusinessRuleError(
        "NOTE_PROCESSING",
        "変換中は復元できません。完了を待つか、処理履歴から取り消してください。",
      );
    await snapshotAssets(container, c, account.id, revision, checked.html);
    if (
      revision.title === previous.title &&
      checked.html === previous.html &&
      revision.style === previous.display.style
    )
      throw new BusinessRuleError("REVISION_UNCHANGED", "現在と同じ内容です。");
    await ensureRevisionHead(c, previous);
    const note = editNote(
      {
        ...previous,
        display: {
          style: revision.style,
          source: "user",
          initialization: { kind: "complete", reason: "user" },
        },
      },
      revision.title,
      checked.html,
      container.clock.now(),
    );
    await commitNote(container, c, {
      previous,
      note,
      actor: { kind: "user", accountId: account.id },
      cause: "restore",
      restoredFrom: revision.revisionNo,
      afterCurrent: async () => {
        if (document)
          await scheduleReferences(
            container,
            c,
            note,
            account.id,
            document,
            undefined,
            null,
            inspections,
            checked.resources,
          );
      },
    });
    return {
      ...toNoteView(
        note,
        original,
        original ? await c.imports.listNotices(original.id) : [],
      ),
      removed: checked.removed,
      wysContext: await readWysContext(c, note),
    };
  });
  container.referencing?.wake();
  return result;
}

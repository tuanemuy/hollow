export type EditorDraft = {
  title: string;
  html: string;
  draftId?: string | undefined;
  importReferences?: boolean | undefined;
  wys?: import("./wysRecovery").WysRecovery | undefined;
};

import { type EditorMode, isEditorMode } from "./editorMode";
import { readWysRecovery } from "./wysRecovery";

export type { EditorMode } from "./editorMode";
export type EditorSaveCause = "manual" | "autosave" | "title";

export function editorSaveCause(
  current: EditorDraft,
  saved: Pick<EditorDraft, "title" | "html"> | undefined,
  requested: "manual" | "autosave",
): EditorSaveCause {
  return saved && current.html === saved.html && current.title !== saved.title
    ? "title"
    : requested;
}

export function editorRecoveryDownload(draft: EditorDraft, mode: EditorMode) {
  const name = Array.from(draft.title || "無題")
    .map((character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ? "_"
        : character,
    )
    .join("")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 100);
  return {
    filename: `${name}.hollow-backup.json`,
    content: JSON.stringify(
      {
        format: "hollow-unsaved-note",
        title: draft.title,
        html: draft.html,
        mode,
      },
      null,
      2,
    ),
    mime: "application/json;charset=utf-8",
  };
}

export const hasUnseenEditorUpdate = (
  observed: number,
  saved: number,
  notified: number,
) => observed > saved && observed > notified;

export function oneShotEditorConfirmation(version?: number) {
  let remaining = version;
  return () => {
    const confirmed = remaining;
    remaining = undefined;
    return confirmed;
  };
}

export const sameBody = (a: EditorDraft, b: EditorDraft) =>
  a.title === b.title && a.html === b.html;
export const sameDraft = (a: EditorDraft, b: EditorDraft) =>
  sameBody(a, b) &&
  (a.importReferences ?? true) === (b.importReferences ?? true);

export async function settleEditorSave<Result>(options: {
  read: () => EditorDraft;
  persist: (snapshot: EditorDraft) => Promise<Result>;
  accept: (snapshot: EditorDraft, result: Result) => EditorDraft;
  refresh: () => Promise<unknown>;
  continueSaving: boolean;
  shouldNavigate: (result: Result) => boolean;
  lock: (locked: boolean) => void;
  navigate: (result: Result) => Promise<unknown>;
}) {
  for (;;) {
    const snapshot = options.read();
    const result = await options.persist(snapshot);
    const accepted = options.accept(snapshot, result);
    await options.refresh();
    if (!sameDraft(options.read(), accepted)) {
      if (options.continueSaving) continue;
      return;
    }
    if (!options.shouldNavigate(result)) return;
    options.lock(true);
    try {
      // A synchronous React flush can apply an input queued before the lock.
      if (!sameDraft(options.read(), accepted)) continue;
      await options.navigate(result);
      return;
    } finally {
      options.lock(false);
    }
  }
}

type BackupStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const draftKey = (
  userId: string,
  noteId?: string,
  workspaceId?: string,
) =>
  `hollow:draft:${userId}:${noteId ?? (workspaceId ? `new:workspace:${workspaceId}` : "new")}`;

export function readEditorBackup(storage: BackupStorage, key: string) {
  const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
  if (
    !value ||
    typeof value !== "object" ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !("html" in value) ||
    typeof value.html !== "string"
  )
    return null;
  const draft: EditorDraft = {
    title: value.title,
    html: value.html,
    ...("wys" in value ? { wys: readWysRecovery(value.wys) } : {}),
    ...("draftId" in value && typeof value.draftId === "string"
      ? { draftId: value.draftId }
      : {}),
    ...("importReferences" in value &&
    typeof value.importReferences === "boolean"
      ? { importReferences: value.importReferences }
      : {}),
  };
  const noteId =
    "noteId" in value &&
    typeof value.noteId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.noteId,
    )
      ? value.noteId
      : undefined;
  const mode: EditorMode | undefined =
    "mode" in value && isEditorMode(value.mode) ? value.mode : undefined;
  return { draft, noteId, mode };
}

export function writeEditorBackup(
  storage: BackupStorage,
  userId: string,
  routeNoteId: string | undefined,
  persistedId: string | undefined,
  draft: EditorDraft,
  dirty: boolean,
  mode?: EditorMode,
  workspaceId?: string,
) {
  const target = draftKey(userId, persistedId ?? routeNoteId, workspaceId);
  const value = {
    title: draft.title,
    html: draft.html,
    draftId: draft.draftId,
    importReferences: draft.importReferences,
    mode,
    wys: draft.wys,
  };
  if (dirty) storage.setItem(target, JSON.stringify(value));
  else storage.removeItem(target);
  if (!routeNoteId && persistedId)
    storage.setItem(
      draftKey(userId, undefined, workspaceId),
      JSON.stringify({ ...value, noteId: persistedId }),
    );
}

export function clearCreationBackup(
  storage: BackupStorage,
  userId: string,
  noteId: string,
  workspaceId?: string,
) {
  const key = draftKey(userId, undefined, workspaceId);
  if (readEditorBackup(storage, key)?.noteId === noteId)
    storage.removeItem(key);
}

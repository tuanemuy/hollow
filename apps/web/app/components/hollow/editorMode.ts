export type EditorMode = "wysiwyg" | "html" | "visual";

export function isEditorMode(value: unknown): value is EditorMode {
  return value === "wysiwyg" || value === "html" || value === "visual";
}

export const editorModeKey = (userId: string) => `hollow:editor-mode:${userId}`;

export function readEditorMode(
  storage: Pick<Storage, "getItem">,
  userId: string,
): EditorMode | undefined {
  const value = storage.getItem(editorModeKey(userId));
  return isEditorMode(value) ? value : undefined;
}

export function writeEditorMode(
  storage: Pick<Storage, "setItem">,
  userId: string,
  mode: EditorMode,
): void {
  storage.setItem(editorModeKey(userId), mode);
}

export function resolveEditorMode(input: {
  isNew: boolean;
  backup?: EditorMode | undefined;
  explicit?: EditorMode | undefined;
  device?: EditorMode | undefined;
}): EditorMode {
  if (input.backup) return input.backup;
  if (input.isNew) return "wysiwyg";
  return input.explicit ?? input.device ?? "html";
}

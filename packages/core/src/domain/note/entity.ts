import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteVisibility } from "@repo/core/domain/sharing/entity";
import { automaticDisplay, type NoteDisplay } from "./displayStyle";
import type { NoteLifecycle } from "./lifecycle";

export const MAX_HTML_BYTES = 800 * 1024;
export const MAX_TITLE_LENGTH = 200;

export type NoteOwner =
  | Readonly<{ kind: "personal"; accountId: string }>
  | Readonly<{ kind: "workspace"; workspaceId: string }>;

export type Note = Readonly<{
  creator?:
    | Readonly<{ kind: "account"; accountId: string }>
    | Readonly<{ kind: "unknown" }>;
  id: string;
  owner: NoteOwner;
  lifecycle: NoteLifecycle;
  title: string;
  html: string;
  display: NoteDisplay;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  visibility: NoteVisibility;
  status: "ready";
}>;

export function noteTitle(title: string, text = ""): string {
  const trimmed = title.trim();
  if (Array.from(trimmed).length > MAX_TITLE_LENGTH) {
    throw new BusinessRuleError(
      "TITLE_TOO_LONG",
      "タイトルは200文字以内で入力してください。",
    );
  }
  return (
    trimmed ||
    Array.from(text.trim().split("\n")[0] ?? "")
      .slice(0, MAX_TITLE_LENGTH)
      .join("") ||
    "無題"
  );
}

/** A note body that is empty or only whitespace has nothing to read, share or export. */
export function hasBody(html: string): boolean {
  return html.trim() !== "";
}

export function assertHtmlSize(html: string): void {
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
    throw new BusinessRuleError(
      "HTML_TOO_LARGE",
      "本文は800 KB以内に分割してください。",
    );
  }
}

export function createNote(
  input: Readonly<{
    id: string;
    accountId: string;
    owner?: NoteOwner;
    title: string;
    html: string;
    text: string;
  }>,
  now: Date,
): Note {
  assertHtmlSize(input.html);
  return {
    id: input.id,
    owner: input.owner ?? { kind: "personal", accountId: input.accountId },
    creator: { kind: "account", accountId: input.accountId },
    lifecycle: { kind: "active" },
    title: noteTitle(input.title, input.text),
    html: input.html,
    display: automaticDisplay(false, "blank"),
    version: 0,
    createdAt: now,
    updatedAt: now,
    visibility: "private",
    status: "ready",
  };
}

export function editNote(
  note: Note,
  title: string,
  html: string,
  now: Date,
): Note {
  assertHtmlSize(html);
  return {
    ...note,
    title: noteTitle(title),
    html,
    version: note.version + 1,
    updatedAt: now,
  };
}

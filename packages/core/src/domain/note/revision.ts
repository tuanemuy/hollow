import { BusinessRuleError } from "../error";
import type { DisplayStyle } from "./displayStyle";
import type { Note } from "./entity";

export const REVISION_LIMIT = 20;
export type RevisionCause =
  | "manual"
  | "autosave"
  | "title"
  | "style"
  | "import"
  | "reference"
  | "restore"
  | "baseline";
export type RevisionActor =
  | Readonly<{ kind: "user"; accountId: string }>
  | Readonly<{ kind: "system"; jobId?: string }>
  | Readonly<{ kind: "legacy" }>;
export type HumanMutation = Readonly<{ accountId: string; version: number }>;
export type RevisionHead = Readonly<{
  noteId: string;
  currentNo: number;
  baseFloor: number;
  actors: readonly HumanMutation[];
}>;
export type RevisionResource = Readonly<{
  kind: "image" | "video" | "stylesheet";
  url: string;
  finalUrl: string | null;
  assetId: string | null;
  bytes: number;
}>;
export type NoteRevision = Readonly<{
  noteId: string;
  revisionNo: number;
  capturedNoteVersion: number;
  title: string;
  html: string;
  style: DisplayStyle;
  savedAt: Date;
  actor: RevisionActor;
  cause: RevisionCause;
  restoredFrom: number | null;
  originRevisionNo: number | null;
  resources: readonly RevisionResource[];
}>;
export type WysOriginHint = Readonly<{
  revisionNo: number;
  capturedNoteVersion: number;
}>;

export function requireRetainedWysOrigin(
  noteId: string,
  hint: WysOriginHint,
  revision: NoteRevision | null,
  retained: readonly number[],
  nextRevisionNo: number,
): number {
  const afterCommit = [nextRevisionNo, ...retained]
    .sort((a, b) => b - a)
    .slice(0, REVISION_LIMIT);
  if (
    !revision ||
    revision.noteId !== noteId ||
    revision.revisionNo !== hint.revisionNo ||
    revision.capturedNoteVersion !== hint.capturedNoteVersion ||
    !retained.includes(hint.revisionNo) ||
    hint.revisionNo >= nextRevisionNo ||
    !afterCommit.includes(hint.revisionNo)
  )
    throw new BusinessRuleError(
      "WYS_ORIGIN_UNAVAILABLE",
      "変換前の版を保存後も保持できません。最新の未保存HTMLを退避したまま、変換元を確認するかHTMLモードで回復してください。",
    );
  return hint.revisionNo;
}
export function sameNoteContent(
  a: Pick<Note, "title" | "html" | "display">,
  b: Pick<Note, "title" | "html" | "display">,
): boolean {
  return (
    a.title === b.title &&
    a.html === b.html &&
    a.display.style === b.display.style
  );
}
export function recordHumanMutation(
  actors: readonly HumanMutation[],
  accountId: string,
  version: number,
): readonly HumanMutation[] {
  return [
    { accountId, version },
    ...actors.filter((a) => a.accountId !== accountId),
  ].slice(0, 2);
}
export function conflictingHumanVersion(
  head: RevisionHead,
  accountId: string,
  baseVersion: number,
): number | "unknown" | null {
  if (baseVersion < head.baseFloor) return "unknown";
  const other = head.actors.find((actor) => actor.accountId !== accountId);
  return other && other.version > baseVersion ? other.version : null;
}

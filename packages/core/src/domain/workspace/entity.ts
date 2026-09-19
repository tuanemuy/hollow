import { BusinessRuleError } from "../error";
import type { NoteOwner } from "../note/entity";

export type WorkspaceRole = "owner" | "editor" | "viewer";
export type Workspace = Readonly<{
  id: string;
  creatorId: string;
  name: string;
  description: string;
  slug: string | null;
  createdAt: Date;
  state: "active";
  iconId?: string | null;
}>;
export type DeletedWorkspace = Readonly<{
  id: string;
  slug: string | null;
  state: "deleted";
}>;
export type ScopeSelection = Readonly<{ workspaceId?: string | undefined }>;
export type ScopeCursor = Readonly<{ at: Date; id: string }>;
export const SCOPE_PAGE_SIZE = 50;
export const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "settings",
  "new",
  "edit",
  "trash",
  "notes",
  "workspaces",
  "assets",
  "static",
  "help",
]);
export function workspaceFields(
  input: Readonly<{ name: string; description: string; slug?: string }>,
) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || [...name].length > 100)
    throw new BusinessRuleError(
      "WORKSPACE_NAME",
      "名前は1〜100文字で入力してください。",
    );
  if ([...description].length > 2000)
    throw new BusinessRuleError(
      "WORKSPACE_DESCRIPTION",
      "説明は2000文字以内で入力してください。",
    );
  return { name, description, slug: workspaceSlug(input.slug ?? "") };
}
export function workspaceSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (!slug) return null;
  if (
    slug.length < 3 ||
    slug.length > 63 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(slug) ||
    RESERVED_WORKSPACE_SLUGS.has(slug)
  )
    throw new BusinessRuleError(
      "WORKSPACE_SLUG",
      "スラッグは3〜63文字の英小文字・数字・内部のハイフンを使用し、予約語を避けてください。",
    );
  return slug;
}
export function selectedScope(
  accountId: string,
  selection: ScopeSelection,
): NoteOwner {
  return selection.workspaceId
    ? { kind: "workspace", workspaceId: selection.workspaceId }
    : { kind: "personal", accountId };
}
export function sameScope(a: NoteOwner, b: NoteOwner) {
  return a.kind === "personal"
    ? b.kind === "personal" && a.accountId === b.accountId
    : b.kind === "workspace" && a.workspaceId === b.workspaceId;
}
export function capacityLimit(scope: NoteOwner) {
  return (scope.kind === "personal" ? 5 : 20) * 1024 ** 3;
}

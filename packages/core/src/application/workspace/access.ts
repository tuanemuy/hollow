import type { Note, NoteOwner } from "@repo/core/domain/note/entity";
import { capacityLimit } from "@repo/core/domain/workspace/entity";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

export async function scopeRole(
  c: HollowUnitOfWorkContext,
  scope: NoteOwner,
  accountId: string,
) {
  return scope.kind === "personal"
    ? scope.accountId === accountId
      ? "owner"
      : null
    : c.workspaces.role(scope.workspaceId, accountId);
}
export async function canScope(
  c: HollowUnitOfWorkContext,
  scope: NoteOwner,
  accountId: string,
  operation: "read" | "edit" = "read",
) {
  const role = await scopeRole(c, scope, accountId);
  return role !== null && (operation === "read" || role !== "viewer");
}
export async function requireScope(
  c: HollowUnitOfWorkContext,
  scope: NoteOwner,
  accountId: string,
  operation: "read" | "edit" = "read",
) {
  if (!(await canScope(c, scope, accountId, operation)))
    throw new NotFoundError(
      "SCOPE_NOT_FOUND",
      "このスペースにはアクセスできません。個人のスペースへ戻ってください。",
    );
  return scope;
}
export async function requireNote(
  c: HollowUnitOfWorkContext,
  note: Note | null,
  accountId: string,
  operation: "read" | "edit" = "read",
  includeTrash = false,
): Promise<Note> {
  if (
    !note ||
    (!includeTrash && note.lifecycle.kind !== "active") ||
    !(await canScope(c, note.owner, accountId, operation))
  )
    throw new NotFoundError(
      "NOTE_NOT_FOUND",
      "ノートが見つからないか、現在はアクセスできません。最新の未保存内容はダウンロードして保管できます。",
    );
  return note;
}
export async function scopeView(
  c: HollowUnitOfWorkContext,
  scope: NoteOwner,
  accountId: string,
) {
  const role = await scopeRole(c, scope, accountId);
  return {
    workspaceId: scope.kind === "workspace" ? scope.workspaceId : null,
    name:
      scope.kind === "workspace"
        ? ((await c.workspaces.find(scope.workspaceId))?.name ??
          "ワークスペース")
        : "個人のスペース",
    canEdit: role === "owner" || role === "editor",
  };
}
export async function scopeUsage(
  c: HollowUnitOfWorkContext,
  scope: NoteOwner,
  now: Date,
) {
  return {
    usedBytes: await c.capacity.usedBytes(scope, now),
    limitBytes: capacityLimit(scope),
    updatedAt: now.toISOString(),
  };
}

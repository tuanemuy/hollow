import { BusinessRuleError } from "../error";

export const TRASH_RETENTION_MS = 30 * 86400_000;
export type NoteLifecycle =
  | Readonly<{ kind: "active" }>
  | Readonly<{ kind: "purging"; purgeId: string }>
  | Readonly<{
      kind: "trashed";
      trashedAt: Date;
      purgeAfter: Date;
      operationId: string;
    }>;

export function trashLifecycle(
  now: Date,
  operationId: string,
): Extract<NoteLifecycle, { kind: "trashed" }> {
  return {
    kind: "trashed",
    trashedAt: now,
    purgeAfter: new Date(now.getTime() + TRASH_RETENTION_MS),
    operationId,
  };
}

export function restoreLifecycle(
  lifecycle: NoteLifecycle,
  operationId: string,
  now: Date,
): NoteLifecycle {
  if (lifecycle.kind !== "trashed" || lifecycle.operationId !== operationId)
    throw new BusinessRuleError(
      "TRASH_CHANGED",
      "ゴミ箱の状態が変わりました。一覧を再読み込みしてください。",
    );
  if (now >= lifecycle.purgeAfter)
    throw new BusinessRuleError(
      "TRASH_EXPIRED",
      "保管期限が過ぎたため復元できません。",
    );
  return { kind: "active" };
}

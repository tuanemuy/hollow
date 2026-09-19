import type { SharingView } from "@repo/core/application/sharing/settings";
import {
  assertSharePassword,
  displayName,
  type ShareAuthor,
} from "@repo/core/domain/sharing/entity";
import { z } from "zod";
import { extractSerializedError } from "@/presentation/errorResponse";

export type SharingActor = Readonly<{ id: string; epoch: number }>;
export type SharingActorProps = Readonly<{
  actorId: string;
  actorEpoch: number;
  currentActor: () => SharingActor | null;
}>;
export function sameSharingActor(
  actor: SharingActor | null,
  id: string,
  epoch: number,
) {
  return actor?.id === id && actor.epoch === epoch;
}
export function ownsSharingOperation(
  mounted: boolean,
  active: object | null,
  token: object,
  actor: SharingActor | null,
  id: string,
  epoch: number,
) {
  return mounted && active === token && sameSharingActor(actor, id, epoch);
}
export function isSharingView(
  view: SharingView,
  actorId: string,
  noteId: string,
) {
  return view.actorId === actorId && view.expected.noteId === noteId;
}
export function authorLabel(author: ShareAuthor) {
  switch (author.kind) {
    case "named":
      return author.displayName;
    case "unset":
      return "表示名未設定";
    case "deleted":
      return "退会した利用者";
    case "unknown":
      return "作成者不明";
  }
}
export function sharingAudience(view: SharingView) {
  const scope = view.expected.scope;
  const members = scope.workspaceId
    ? `ワークスペース「${scope.name}」のメンバー ${scope.memberCount} 名`
    : "所有者本人";
  return view.visibility === "private"
    ? members
    : view.visibility === "link"
      ? `${members}と、${view.hasPassword ? "パスワードを通過した" : ""}共有リンクを知っている人`
      : "誰でも";
}
export function sharingFailure(cause: unknown) {
  const error = extractSerializedError(cause);
  const kind =
    error.kind === "unknown" || error.kind === "system"
      ? "unknown"
      : error.kind === "notFound" ||
          error.kind === "forbidden" ||
          error.kind === "unauthorized"
        ? "access"
        : error.kind === "conflict"
          ? "conflict"
          : "rejected";
  return {
    kind,
    message:
      kind === "unknown" ? "応答を確認できませんでした。" : error.message,
  } as const;
}
export function passwordError(value: string): string | null {
  try {
    assertSharePassword(value);
    return null;
  } catch {
    return "パスワードは8文字以上、UTF-8で1024バイト以内にしてください。";
  }
}
export function displayNameError(value: string): string | null {
  try {
    displayName(value);
    return null;
  } catch {
    return "表示名は前後の空白を除いて50文字以内とし、改行や制御文字を含めないでください。";
  }
}
export function safeInternalHref(value: string | undefined): string | null {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  try {
    const url = new URL(value, "https://hollow.invalid");
    return url.origin === "https://hollow.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : null;
  } catch {
    return null;
  }
}
const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
export function sharingReturnHref(value: string | undefined) {
  const safe = safeInternalHref(value);
  const match =
    safe === value && safe
      ? new RegExp(`^/notes/(${uuid})\\?sharing=1$`).exec(safe)
      : null;
  return match && z.uuid().safeParse(match[1]).success ? safe : null;
}
export function sharingProfileHref(value: string) {
  const safe = safeInternalHref(value);
  const match =
    safe === value && safe
      ? new RegExp(
          `^/settings/profile\\?noteId=(${uuid})&resume=sharing$`,
        ).exec(safe)
      : null;
  return match && z.uuid().safeParse(match[1]).success ? safe : null;
}

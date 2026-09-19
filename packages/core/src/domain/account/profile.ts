import { BusinessRuleError } from "../error";
import type { IconMime, IconOutput } from "../workspace/icon";

export type PublicProfile = Readonly<{
  accountId: string;
  handle: string | null;
  bio: string;
  iconId: string | null;
  version: number;
}>;

const reservedHandles = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "settings",
  "new",
  "edit",
  "trash",
  "notes",
  "workspaces",
  "assets",
  "static",
  "help",
  "discover",
  "sitemap",
  "s",
  "p",
  "w",
  "export-public",
]);

export function publicHandle(value: string | null): string | null {
  const handle =
    value?.trim().replace(/[A-Z]/g, (letter) => letter.toLowerCase()) ?? "";
  if (!handle) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(handle))
    throw new BusinessRuleError(
      "PROFILE_HANDLE_INVALID",
      "ハンドルは3〜63文字の英小文字・数字・内部のハイフンで指定してください。",
    );
  if (reservedHandles.has(handle))
    throw new BusinessRuleError(
      "PROFILE_HANDLE_RESERVED",
      "このハンドルは予約されています。",
    );
  return handle;
}

export function profileBio(value: string): string {
  const bio = value.trim();
  if (Array.from(bio).length > 300)
    throw new BusinessRuleError(
      "PROFILE_BIO_LENGTH",
      "自己紹介は300文字以内にしてください。",
    );
  if (
    Array.from(bio).some((character) => {
      const point = character.codePointAt(0) ?? 0;
      return (
        (point < 32 && point !== 9 && point !== 10 && point !== 13) ||
        (point >= 127 && point <= 159)
      );
    })
  )
    throw new BusinessRuleError(
      "PROFILE_BIO_INVALID",
      "自己紹介に制御文字は使えません。",
    );
  return bio;
}

type ProfileIconBase = Readonly<{
  id: string;
  accountId: string;
  sessionHash: string;
  profileVersion: number;
  inputBytes: number;
  mime: IconMime;
  storageKey: string;
  bytes: number;
  createdAt: Date;
  expiresAt: Date;
  nextAttemptAt: Date;
}>;
export type ProfileIcon = ProfileIconBase &
  (
    | Readonly<{
        state: "awaiting" | "processing" | "cleanup";
        output: IconOutput | null;
      }>
    | Readonly<{ state: "writing" | "ready"; output: IconOutput }>
  );

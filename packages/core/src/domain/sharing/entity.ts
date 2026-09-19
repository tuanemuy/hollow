import { BusinessRuleError } from "../error";

export type NoteVisibility = "private" | "link" | "public";
export type ShareSettings = Readonly<{
  noteId: string;
  visibility: NoteVisibility;
  version: number;
  linkGeneration: number;
  tokenHash: string | null;
  tokenEnvelope: string | null;
  passwordHash: string | null;
  grantEpoch: number;
}>;
export type ShareGrant = Readonly<{
  noteId: string;
  browserHash: string;
  linkGeneration: number;
  grantEpoch: number;
  verifiedAt: Date;
  expiresAt: Date;
}>;
export type ShareScope = Readonly<{
  ownershipGeneration: number;
  workspaceId: string | null;
  membershipRevision: number;
  name: string;
  memberCount: number;
}>;
export type ShareExpected = Readonly<{
  noteId: string;
  shareVersion: number;
  noteVersion: number;
  scope: ShareScope;
}>;
export type ShareOperation =
  | Readonly<{ kind: "visibility"; visibility: "private" | "link" }>
  | Readonly<{
      kind: "visibility";
      visibility: "public";
      confirmPasswordRemoval: boolean;
    }>
  | Readonly<{ kind: "regenerate" }>
  | Readonly<{ kind: "password"; password: string }>
  | Readonly<{ kind: "remove-password" }>;
export type ShareAuthor =
  | Readonly<{ kind: "named"; displayName: string }>
  | Readonly<{ kind: "unset" | "deleted" | "unknown" }>;
export type DisplayNameProfile = Readonly<{
  accountId: string;
  displayName: string | null;
  version: number;
}>;
export const SHARE_GRANT_MS = 24 * 60 * 60_000;
export const SHARE_RATE_WINDOW_MS = 15 * 60_000;

export function assertSharePassword(password: string) {
  if (
    Array.from(password).length < 8 ||
    new TextEncoder().encode(password).length > 1024
  )
    throw new BusinessRuleError(
      "SHARE_PASSWORD_LENGTH",
      "パスワードは8文字以上、UTF-8で1024バイト以内にしてください。",
    );
}
export function displayName(value: string): string | null {
  if (
    Array.from(value).some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (
        code <= 31 ||
        (code >= 127 && code <= 159) ||
        code === 0x2028 ||
        code === 0x2029
      );
    })
  )
    throw new BusinessRuleError(
      "DISPLAY_NAME_INVALID",
      "表示名に改行や制御文字は使えません。",
    );
  const name = value.trim();
  if (Array.from(name).length > 50)
    throw new BusinessRuleError(
      "DISPLAY_NAME_LENGTH",
      "表示名は50文字以内にしてください。",
    );
  return name || null;
}

import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  AuthBrowserBinding,
  AuthenticationMethods,
} from "./authentication";

export type Account = Readonly<{
  id: string;
  email: string;
  authVersion: number;
  createdAt: Date;
}> &
  AuthenticationMethods &
  (
    | Readonly<{ status: "unverified"; verifiedAt: null }>
    | Readonly<{ status: "verified"; verifiedAt: Date }>
  );

export function accountEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BusinessRuleError(
      "INVALID_EMAIL",
      "メールアドレスを確認してください。",
    );
  }
  return email;
}

export function assertPassword(value: string): void {
  if (
    value.length < 12 ||
    value.length > 128 ||
    !/[a-zA-Z]/.test(value) ||
    !/[^a-zA-Z]/.test(value)
  ) {
    throw new BusinessRuleError(
      "WEAK_PASSWORD",
      "パスワードは英字と数字または記号を含む12〜128文字で入力してください。",
    );
  }
}

export function createAccount(
  id: string,
  email: string,
  passwordHash: string,
  now: Date,
): Account {
  return {
    id,
    email: accountEmail(email),
    passwordHash,
    google: null,
    authVersion: 1,
    createdAt: now,
    status: "unverified",
    verifiedAt: null,
  };
}

export function verifyAccount(account: Account, now: Date): Account {
  return { ...account, status: "verified", verifiedAt: now };
}

export type EmailVerification = Readonly<{
  tokenHash: string;
  accountId: string;
  browserHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export type Session = Readonly<{
  tokenHash: string;
  accountId: string;
  expiresAt: Date;
  browser?: AuthBrowserBinding;
}>;

export type AuthThrottle = Readonly<{
  key: string;
  attempts: number;
  blockedUntil: Date;
  lastAttemptAt: Date;
}>;

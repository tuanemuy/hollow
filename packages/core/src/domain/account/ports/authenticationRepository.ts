import type { AuthBrowserBinding, GoogleIdentity } from "../authentication";
import type { Account } from "../entity";

export interface AccountAuthenticationRepository {
  findByGoogle(subject: string): Promise<Account | null>;
  createGoogle(
    input: Readonly<{
      id: string;
      email: string;
      identity: GoogleIdentity;
      now: Date;
    }>,
  ): Promise<Account>;
  setPassword(
    id: string,
    version: number,
    passwordHash: string | null,
  ): Promise<boolean>;
  linkGoogle(
    id: string,
    version: number,
    identity: GoogleIdentity,
  ): Promise<boolean>;
  unlinkGoogle(id: string, version: number): Promise<boolean>;
  deleteOtherSessions(
    accountId: string,
    keepHash: string | null,
  ): Promise<void>;
}

export interface AuthBrowserRepository {
  ensure(
    hash: string,
    retainUntil: Date,
    now: Date,
  ): Promise<AuthBrowserBinding>;
  find(hash: string): Promise<AuthBrowserBinding | null>;
  advance(
    expected: AuthBrowserBinding,
    retainUntil: Date,
    now: Date,
  ): Promise<AuthBrowserBinding | null>;
  bindLegacy(
    sessionHash: string,
    browser: AuthBrowserBinding,
  ): Promise<boolean>;
  prune(now: Date, limit: number): Promise<number>;
}

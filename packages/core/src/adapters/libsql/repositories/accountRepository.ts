import { ConflictError } from "@repo/core/application/errors";
import {
  GOOGLE_ISSUER,
  type GoogleIdentity,
} from "@repo/core/domain/account/authentication";
import type {
  AccountIdentityState,
  StoredAccount,
} from "@repo/core/domain/account/deletion";
import type {
  Account,
  AuthThrottle,
  EmailVerification,
  Session,
} from "@repo/core/domain/account/entity";
import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { authBrowserContexts, googleIdentities } from "../authSchema";
import {
  accounts,
  authThrottles,
  emailVerifications,
  sessions,
} from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

function toStoredAccount(
  row: typeof accounts.$inferSelect,
  identity: typeof googleIdentities.$inferSelect | null,
): StoredAccount {
  if (row.state === "deleted") {
    if (
      !row.deletionId ||
      row.email !== null ||
      row.passwordHash !== null ||
      row.createdAt !== null ||
      row.verifiedAt !== null
    )
      throw new ConflictError(
        "ACCOUNT_STATE_INVALID",
        "アカウントの保存状態を確認できません。",
      );
    return {
      kind: "deleted",
      id: row.id,
      authVersion: row.authVersion,
      deletionId: row.deletionId,
    };
  }
  if (row.email === null || row.createdAt === null || row.deletionId !== null)
    throw new ConflictError(
      "ACCOUNT_STATE_INVALID",
      "アカウントの保存状態を確認できません。",
    );
  const google: GoogleIdentity | null = identity
    ? {
        issuer: GOOGLE_ISSUER,
        subject: identity.subject,
        linkedAt: identity.linkedAt,
      }
    : null;
  const methods =
    row.passwordHash !== null
      ? { passwordHash: row.passwordHash, google }
      : google
        ? { passwordHash: null, google }
        : null;
  if (!methods)
    throw new ConflictError(
      "AUTH_METHOD_MISSING",
      "認証方法を確認できませんでした。",
    );
  const status = row.verifiedAt
    ? { status: "verified" as const, verifiedAt: row.verifiedAt }
    : { status: "unverified" as const, verifiedAt: null };
  return {
    kind: "active",
    account: {
      id: row.id,
      email: row.email,
      createdAt: row.createdAt,
      authVersion: row.authVersion,
      ...methods,
      ...status,
    },
  };
}

export class LibsqlAccountRepository implements AccountRepository {
  constructor(private readonly db: HollowTransaction) {}
  async identity(id: string): Promise<AccountIdentityState> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id));
    if (!row) return { kind: "missing" };
    if (row.state === "deleted") {
      if (
        !row.deletionId ||
        row.email !== null ||
        row.passwordHash !== null ||
        row.createdAt !== null ||
        row.verifiedAt !== null
      )
        throw new ConflictError(
          "ACCOUNT_STATE_INVALID",
          "アカウントの保存状態を確認できません。",
        );
      return { kind: "deleted", id: row.id, deletionId: row.deletionId };
    }
    return { kind: "active", id: row.id, authVersion: row.authVersion };
  }
  async findByEmail(email: string) {
    const [row] = await this.db
      .select({ account: accounts, identity: googleIdentities })
      .from(accounts)
      .leftJoin(googleIdentities, eq(googleIdentities.accountId, accounts.id))
      .where(eq(accounts.email, email));
    if (!row) return null;
    const stored = toStoredAccount(row.account, row.identity);
    return stored.kind === "active" ? stored.account : null;
  }
  async findById(id: string) {
    const [row] = await this.db
      .select({ account: accounts, identity: googleIdentities })
      .from(accounts)
      .leftJoin(googleIdentities, eq(googleIdentities.accountId, accounts.id))
      .where(eq(accounts.id, id));
    if (!row) return null;
    const stored = toStoredAccount(row.account, row.identity);
    return stored.kind === "active" ? stored.account : null;
  }
  async save(account: Account) {
    if (!account.passwordHash || account.google)
      throw new ConflictError(
        "AUTH_CREATE_METHOD",
        "認証専用の登録手続きが必要です。",
      );
    await this.db.insert(accounts).values(account);
  }
  async markVerified(id: string, authVersion: number, now: Date) {
    const rows = await this.db
      .update(accounts)
      .set({ verifiedAt: now })
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.state, "active"),
          eq(accounts.authVersion, authVersion),
          isNull(accounts.verifiedAt),
        ),
      )
      .returning({ id: accounts.id });
    return rows.length === 1;
  }
  async findVerification(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash));
    return row ?? null;
  }
  async saveVerification(verification: EmailVerification) {
    await this.db
      .insert(emailVerifications)
      .values(verification)
      .onConflictDoUpdate({
        target: emailVerifications.tokenHash,
        set: { consumedAt: verification.consumedAt },
      });
  }
  async deleteVerifications(accountId: string) {
    await this.db
      .delete(emailVerifications)
      .where(eq(emailVerifications.accountId, accountId));
  }
  async findSession(tokenHash: string) {
    const [row] = await this.db
      .select({ session: sessions })
      .from(sessions)
      .leftJoin(
        authBrowserContexts,
        eq(authBrowserContexts.hash, sessions.browserHash),
      )
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          sql`exists(select 1 from accounts a where a.id=${sessions.accountId} and a.state='active')`,
          or(
            and(isNull(sessions.browserHash), isNull(sessions.browserEpoch)),
            and(
              eq(authBrowserContexts.hash, sessions.browserHash),
              eq(authBrowserContexts.epoch, sessions.browserEpoch),
            ),
          ),
        ),
      );
    if (!row) return null;
    const s = row.session;
    return {
      tokenHash: s.tokenHash,
      accountId: s.accountId,
      expiresAt: s.expiresAt,
      ...(s.browserHash !== null && s.browserEpoch !== null
        ? { browser: { hash: s.browserHash, epoch: s.browserEpoch } }
        : {}),
    };
  }
  async saveSession(session: Session) {
    await this.db.insert(sessions).values({
      ...session,
      browserHash: session.browser?.hash ?? null,
      browserEpoch: session.browser?.epoch ?? null,
    });
  }
  async deleteSession(tokenHash: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  async findThrottle(key: string) {
    const [row] = await this.db
      .select()
      .from(authThrottles)
      .where(eq(authThrottles.key, key));
    return row ?? null;
  }
  async saveThrottle(throttle: AuthThrottle) {
    await this.db
      .insert(authThrottles)
      .values(throttle)
      .onConflictDoUpdate({ target: authThrottles.key, set: throttle });
  }
  async deleteThrottle(key: string) {
    await this.db.delete(authThrottles).where(eq(authThrottles.key, key));
  }
}

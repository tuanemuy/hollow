import type {
  Account,
  AuthThrottle,
  EmailVerification,
  Session,
} from "@repo/core/domain/account/entity";
import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import { eq } from "drizzle-orm";
import {
  accounts,
  authThrottles,
  emailVerifications,
  sessions,
} from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

function toAccount(row: typeof accounts.$inferSelect): Account {
  return row.verifiedAt
    ? { ...row, status: "verified", verifiedAt: row.verifiedAt }
    : { ...row, status: "unverified", verifiedAt: null };
}

export class LibsqlAccountRepository implements AccountRepository {
  constructor(private readonly db: HollowTransaction) {}
  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email));
    return row ? toAccount(row) : null;
  }
  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id));
    return row ? toAccount(row) : null;
  }
  async save(account: Account) {
    await this.db
      .insert(accounts)
      .values(account)
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          email: account.email,
          passwordHash: account.passwordHash,
          verifiedAt: account.verifiedAt,
        },
      });
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
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    return row ?? null;
  }
  async saveSession(session: Session) {
    await this.db.insert(sessions).values(session);
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

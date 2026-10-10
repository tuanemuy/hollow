import { ConflictError } from "@repo/core/application/errors";
import {
  GOOGLE_ISSUER,
  type GoogleIdentity,
} from "@repo/core/domain/account/authentication";
import type { AccountAuthenticationRepository } from "@repo/core/domain/account/ports/authenticationRepository";
import { and, eq, exists, isNotNull, ne, sql } from "drizzle-orm";
import { googleIdentities } from "../authSchema";
import { accounts, sessions } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { LibsqlAccountRepository } from "./accountRepository";

export class LibsqlAccountAuthenticationRepository
  implements AccountAuthenticationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async findByGoogle(subject: string) {
    const [identity] = await this.db
      .select()
      .from(googleIdentities)
      .where(
        and(
          eq(googleIdentities.issuer, GOOGLE_ISSUER),
          eq(googleIdentities.subject, subject),
        ),
      );
    if (!identity) return null;
    const repository = new LibsqlAccountRepository(this.db);
    const stored = await repository.identity(identity.accountId);
    if (stored.kind === "deleted")
      throw new ConflictError(
        "AUTH_CONTEXT_CHANGED",
        "認証状況が変わりました。",
      );
    return repository.findById(identity.accountId);
  }
  async createGoogle(
    input: Readonly<{
      id: string;
      email: string;
      identity: GoogleIdentity;
      now: Date;
    }>,
  ) {
    await this.db.insert(accounts).values({
      id: input.id,
      email: input.email,
      passwordHash: null,
      authVersion: 1,
      createdAt: input.now,
      verifiedAt: input.now,
    });
    await this.db
      .insert(googleIdentities)
      .values({ accountId: input.id, ...input.identity });
    const account = await new LibsqlAccountRepository(this.db).findById(
      input.id,
    );
    if (!account)
      throw new ConflictError("AUTH_CONFLICT", "認証情報が変更されています。");
    return account;
  }
  async setPassword(id: string, version: number, passwordHash: string | null) {
    const rows = await this.db
      .update(accounts)
      .set({ passwordHash, authVersion: sql`${accounts.authVersion} + 1` })
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.state, "active"),
          eq(accounts.authVersion, version),
          passwordHash === null
            ? exists(
                this.db
                  .select({ id: googleIdentities.accountId })
                  .from(googleIdentities)
                  .where(eq(googleIdentities.accountId, id)),
              )
            : undefined,
        ),
      )
      .returning({ id: accounts.id });
    return rows.length === 1;
  }
  async linkGoogle(id: string, version: number, identity: GoogleIdentity) {
    const [old] = await this.db
      .select()
      .from(googleIdentities)
      .where(eq(googleIdentities.accountId, id));
    if (old) return false;
    const changed = await this.db
      .update(accounts)
      .set({ authVersion: sql`${accounts.authVersion} + 1` })
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.state, "active"),
          eq(accounts.authVersion, version),
        ),
      )
      .returning({ id: accounts.id });
    if (!changed.length) return false;
    await this.db
      .insert(googleIdentities)
      .values({ accountId: id, ...identity });
    return true;
  }
  async unlinkGoogle(id: string, version: number) {
    const changed = await this.db
      .update(accounts)
      .set({ authVersion: sql`${accounts.authVersion} + 1` })
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.state, "active"),
          eq(accounts.authVersion, version),
          isNotNull(accounts.passwordHash),
          exists(
            this.db
              .select({ id: googleIdentities.accountId })
              .from(googleIdentities)
              .where(eq(googleIdentities.accountId, id)),
          ),
        ),
      )
      .returning({ id: accounts.id });
    if (!changed.length) return false;
    await this.db
      .delete(googleIdentities)
      .where(eq(googleIdentities.accountId, id));
    return true;
  }
  async deleteOtherSessions(accountId: string, keepHash: string | null) {
    await this.db
      .delete(sessions)
      .where(
        and(
          eq(sessions.accountId, accountId),
          keepHash === null ? undefined : ne(sessions.tokenHash, keepHash),
        ),
      );
  }
}

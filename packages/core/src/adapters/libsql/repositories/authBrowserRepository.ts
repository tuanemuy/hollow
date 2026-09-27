import type { AuthBrowserBinding } from "@repo/core/domain/account/authentication";
import type { AuthBrowserRepository } from "@repo/core/domain/account/ports/authenticationRepository";
import {
  and,
  eq,
  isNotNull,
  isNull,
  lt,
  lte,
  notExists,
  sql,
} from "drizzle-orm";
import { authBrowserContexts, googleAuthAttempts } from "../authSchema";
import { sessions } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

export class LibsqlAuthBrowserRepository implements AuthBrowserRepository {
  constructor(private readonly db: HollowTransaction) {}
  async ensure(hash: string, retainUntil: Date, now: Date) {
    const [row] = await this.db
      .insert(authBrowserContexts)
      .values({ hash, epoch: 1, retainUntil, updatedAt: now })
      .onConflictDoUpdate({
        target: authBrowserContexts.hash,
        set: {
          retainUntil: sql`max(${authBrowserContexts.retainUntil}, ${retainUntil.getTime()})`,
          updatedAt: now,
        },
      })
      .returning();
    if (!row) throw new Error("Auth browser insert returned no row");
    return { hash: row.hash, epoch: row.epoch };
  }
  async find(hash: string) {
    const [row] = await this.db
      .select({
        hash: authBrowserContexts.hash,
        epoch: authBrowserContexts.epoch,
      })
      .from(authBrowserContexts)
      .where(eq(authBrowserContexts.hash, hash));
    return row ?? null;
  }
  async advance(expected: AuthBrowserBinding, retainUntil: Date, now: Date) {
    const [row] = await this.db
      .update(authBrowserContexts)
      .set({
        epoch: expected.epoch + 1,
        retainUntil: sql`max(${authBrowserContexts.retainUntil}, ${retainUntil.getTime()})`,
        updatedAt: now,
      })
      .where(
        and(
          eq(authBrowserContexts.hash, expected.hash),
          eq(authBrowserContexts.epoch, expected.epoch),
        ),
      )
      .returning({
        hash: authBrowserContexts.hash,
        epoch: authBrowserContexts.epoch,
      });
    return row ?? null;
  }
  async bindLegacy(sessionHash: string, browser: AuthBrowserBinding) {
    const current = await this.find(browser.hash);
    if (!current || current.epoch !== browser.epoch) return false;
    const rows = await this.db
      .update(sessions)
      .set({ browserHash: browser.hash, browserEpoch: browser.epoch })
      .where(
        and(
          eq(sessions.tokenHash, sessionHash),
          isNull(sessions.browserHash),
          isNull(sessions.browserEpoch),
        ),
      )
      .returning({ id: sessions.tokenHash });
    return rows.length === 1;
  }
  async prune(now: Date, limit: number) {
    const budget = Math.min(100, Math.max(0, limit));
    const expired = await this.db
      .select({ hash: sessions.tokenHash })
      .from(sessions)
      .where(and(isNotNull(sessions.browserHash), lte(sessions.expiresAt, now)))
      .orderBy(sessions.expiresAt, sessions.tokenHash)
      .limit(budget);
    for (const row of expired)
      await this.db.delete(sessions).where(eq(sessions.tokenHash, row.hash));
    const candidates = await this.db
      .select({ hash: authBrowserContexts.hash })
      .from(authBrowserContexts)
      .where(
        and(
          lt(authBrowserContexts.retainUntil, now),
          notExists(
            this.db
              .select({ id: sessions.tokenHash })
              .from(sessions)
              .where(eq(sessions.browserHash, authBrowserContexts.hash)),
          ),
          notExists(
            this.db
              .select({ id: googleAuthAttempts.id })
              .from(googleAuthAttempts)
              .where(
                eq(googleAuthAttempts.browserHash, authBrowserContexts.hash),
              ),
          ),
        ),
      )
      .orderBy(authBrowserContexts.retainUntil, authBrowserContexts.hash)
      .limit(budget - expired.length);
    for (const row of candidates)
      await this.db
        .delete(authBrowserContexts)
        .where(eq(authBrowserContexts.hash, row.hash));
    return expired.length + candidates.length;
  }
}

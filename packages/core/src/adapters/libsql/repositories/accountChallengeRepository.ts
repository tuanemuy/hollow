import { ConflictError } from "@repo/core/application/errors";
import type { AuthChallenge } from "@repo/core/domain/account/authentication";
import type { AccountChallengeRepository } from "@repo/core/domain/account/ports/authAttemptRepository";
import { and, eq, gt, isNull, lt, max } from "drizzle-orm";
import { accountAuthChallenges } from "../authSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

export class LibsqlAccountChallengeRepository
  implements AccountChallengeRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(hash: string): Promise<AuthChallenge | null> {
    const [r] = await this.db
      .select()
      .from(accountAuthChallenges)
      .where(eq(accountAuthChallenges.tokenHash, hash));
    if (!r) return null;
    const common = {
      tokenHash: r.tokenHash,
      accountId: r.accountId,
      authVersion: r.authVersion,
      email: r.email,
      generation: r.generation,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      consumedAt: r.consumedAt,
    };
    if (r.purpose === "reset") return { ...common, purpose: "reset" };
    if (
      r.attemptId === null ||
      r.subject === null ||
      r.browserHash === null ||
      r.browserEpoch === null
    )
      throw new ConflictError(
        "AUTH_STATE_INVALID",
        "確認手続きを確認できませんでした。",
      );
    return {
      ...common,
      purpose: "google-link",
      attemptId: r.attemptId,
      subject: r.subject,
      browser: { hash: r.browserHash, epoch: r.browserEpoch },
    };
  }
  async nextGeneration(id: string, purpose: AuthChallenge["purpose"]) {
    const [row] = await this.db
      .select({ n: max(accountAuthChallenges.generation) })
      .from(accountAuthChallenges)
      .where(
        and(
          eq(accountAuthChallenges.accountId, id),
          eq(accountAuthChallenges.purpose, purpose),
        ),
      );
    return (row?.n ?? 0) + 1;
  }
  async insert(c: AuthChallenge) {
    await this.db
      .update(accountAuthChallenges)
      .set({ consumedAt: c.createdAt })
      .where(
        and(
          eq(accountAuthChallenges.accountId, c.accountId),
          eq(accountAuthChallenges.purpose, c.purpose),
          isNull(accountAuthChallenges.consumedAt),
        ),
      );
    await this.db.insert(accountAuthChallenges).values({
      ...c,
      attemptId: c.purpose === "google-link" ? c.attemptId : null,
      subject: c.purpose === "google-link" ? c.subject : null,
      browserHash: c.purpose === "google-link" ? c.browser.hash : null,
      browserEpoch: c.purpose === "google-link" ? c.browser.epoch : null,
    });
  }
  async consume(hash: string, now: Date) {
    const rows = await this.db
      .update(accountAuthChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(accountAuthChallenges.tokenHash, hash),
          isNull(accountAuthChallenges.consumedAt),
          gt(accountAuthChallenges.expiresAt, now),
        ),
      )
      .returning({ id: accountAuthChallenges.tokenHash });
    return rows.length === 1;
  }
  async prune(now: Date, limit: number) {
    const rows = await this.db
      .select({ id: accountAuthChallenges.tokenHash })
      .from(accountAuthChallenges)
      .where(lt(accountAuthChallenges.expiresAt, now))
      .orderBy(accountAuthChallenges.expiresAt, accountAuthChallenges.tokenHash)
      .limit(Math.min(100, Math.max(0, limit)));
    for (const row of rows)
      await this.db
        .delete(accountAuthChallenges)
        .where(eq(accountAuthChallenges.tokenHash, row.id));
    return rows.length;
  }
}

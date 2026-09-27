import { ConflictError } from "@repo/core/application/errors";
import {
  type AuthActor,
  GOOGLE_ISSUER,
  type GoogleAttempt,
} from "@repo/core/domain/account/authentication";
import type { GoogleAuthAttemptRepository } from "@repo/core/domain/account/ports/authAttemptRepository";
import { and, count, eq, gt, gte, inArray, lt, notExists } from "drizzle-orm";
import { z } from "zod";
import { accountAuthChallenges, googleAuthAttempts } from "../authSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

const claimsSchema = z.object({
  issuer: z.literal(GOOGLE_ISSUER),
  subject: z.string().min(1).max(255),
  email: z.string().min(1).max(254),
  authoritative: z.boolean(),
  issuedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});
const returnSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("notes") }),
  z.object({ kind: z.literal("methods") }),
  z.object({ kind: z.literal("note"), id: z.string().uuid() }),
  z.object({
    kind: z.literal("invitation"),
    selector: z.string().max(128),
    continuation: z.string().max(128),
  }),
]);
const failureSchema = z.enum([
  "AUTH_EXPIRED",
  "AUTH_CONTEXT_CHANGED",
  "AUTH_EXCHANGE_UNKNOWN",
  "AUTH_PROVIDER_REJECTED",
  "AUTH_UNVERIFIED",
  "AUTH_CONFLICT",
]);
const invalid = () =>
  new ConflictError("AUTH_STATE_INVALID", "認証手続きを確認できませんでした。");

function decode(row: typeof googleAuthAttempts.$inferSelect): GoogleAttempt {
  const actor: AuthActor | null =
    row.actorAccountId !== null &&
    row.actorSessionHash !== null &&
    row.actorAuthVersion !== null
      ? {
          accountId: row.actorAccountId,
          sessionHash: row.actorSessionHash,
          authVersion: row.actorAuthVersion,
        }
      : null;
  const intent =
    row.mode === "login"
      ? { mode: "login" as const, actor }
      : actor
        ? { mode: row.mode, actor }
        : null;
  if (!intent) throw invalid();
  const common = {
    id: row.id,
    stateHash: row.stateHash,
    nonceHash: row.nonceHash,
    browser: { hash: row.browserHash, epoch: row.browserEpoch },
    returnTo: returnSchema.parse(row.returnTo),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    version: row.version,
    ...intent,
  };
  switch (row.state) {
    case "pending":
    case "exchanging":
      if (!row.verifierEnvelope) throw invalid();
      return {
        ...common,
        state: row.state,
        verifierEnvelope: row.verifierEnvelope,
      };
    case "verified":
    case "proof-required":
      return {
        ...common,
        state: row.state,
        claims: claimsSchema.parse(row.claims),
        targetAccountId: row.targetAccountId,
        targetAuthVersion: row.targetAuthVersion,
      };
    case "reauth-ready":
      if (!row.proofHash || !row.proofExpiresAt) throw invalid();
      return {
        ...common,
        state: "reauth-ready",
        claims: claimsSchema.parse(row.claims),
        proofHash: row.proofHash,
        proofExpiresAt: row.proofExpiresAt,
      };
    case "completed":
      if (!row.resultAccountId) throw invalid();
      return {
        ...common,
        state: "completed",
        resultAccountId: row.resultAccountId,
      };
    case "failed":
      return {
        ...common,
        state: "failed",
        failure: failureSchema.parse(row.failure),
      };
  }
}

function encode(a: GoogleAttempt): typeof googleAuthAttempts.$inferInsert {
  return {
    id: a.id,
    stateHash: a.stateHash,
    nonceHash: a.nonceHash,
    mode: a.mode,
    actorAccountId: a.actor?.accountId ?? null,
    actorSessionHash: a.actor?.sessionHash ?? null,
    actorAuthVersion: a.actor?.authVersion ?? null,
    browserHash: a.browser.hash,
    browserEpoch: a.browser.epoch,
    returnTo: a.returnTo,
    createdAt: a.createdAt,
    expiresAt: a.expiresAt,
    version: a.version,
    state: a.state,
    verifierEnvelope:
      a.state === "pending" || a.state === "exchanging"
        ? a.verifierEnvelope
        : null,
    claims:
      a.state === "verified" ||
      a.state === "proof-required" ||
      a.state === "reauth-ready"
        ? a.claims
        : null,
    targetAccountId:
      a.state === "verified" || a.state === "proof-required"
        ? a.targetAccountId
        : null,
    targetAuthVersion:
      a.state === "verified" || a.state === "proof-required"
        ? a.targetAuthVersion
        : null,
    proofHash: a.state === "reauth-ready" ? a.proofHash : null,
    proofExpiresAt: a.state === "reauth-ready" ? a.proofExpiresAt : null,
    resultAccountId: a.state === "completed" ? a.resultAccountId : null,
    failure: a.state === "failed" ? a.failure : null,
  };
}

export class LibsqlGoogleAuthAttemptRepository
  implements GoogleAuthAttemptRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(googleAuthAttempts)
      .where(eq(googleAuthAttempts.id, id));
    return row ? decode(row) : null;
  }
  async findByState(hash: string) {
    const [row] = await this.db
      .select()
      .from(googleAuthAttempts)
      .where(eq(googleAuthAttempts.stateHash, hash));
    return row ? decode(row) : null;
  }
  async insert(a: GoogleAttempt & Readonly<{ state: "pending" }>) {
    await this.db.insert(googleAuthAttempts).values(encode(a));
  }
  async replace(a: GoogleAttempt, version: number) {
    if (a.version !== version + 1) throw invalid();
    const rows = await this.db
      .update(googleAuthAttempts)
      .set(encode(a))
      .where(
        and(
          eq(googleAuthAttempts.id, a.id),
          eq(googleAuthAttempts.version, version),
        ),
      )
      .returning({ id: googleAuthAttempts.id });
    return rows.length === 1;
  }
  async countRecent(hash: string, since: Date) {
    const [row] = await this.db
      .select({ n: count() })
      .from(googleAuthAttempts)
      .where(
        and(
          eq(googleAuthAttempts.browserHash, hash),
          gte(googleAuthAttempts.createdAt, since),
        ),
      );
    return row?.n ?? 0;
  }
  async countActive(hash: string, now: Date) {
    const [row] = await this.db
      .select({ n: count() })
      .from(googleAuthAttempts)
      .where(
        and(
          eq(googleAuthAttempts.browserHash, hash),
          gt(googleAuthAttempts.expiresAt, now),
          inArray(googleAuthAttempts.state, [
            "pending",
            "exchanging",
            "verified",
            "proof-required",
            "reauth-ready",
          ]),
        ),
      );
    return row?.n ?? 0;
  }
  async prune(now: Date, limit: number) {
    const rows = await this.db
      .select({ id: googleAuthAttempts.id })
      .from(googleAuthAttempts)
      .where(
        and(
          lt(googleAuthAttempts.expiresAt, now),
          notExists(
            this.db
              .select({ id: accountAuthChallenges.tokenHash })
              .from(accountAuthChallenges)
              .where(
                eq(accountAuthChallenges.attemptId, googleAuthAttempts.id),
              ),
          ),
        ),
      )
      .orderBy(googleAuthAttempts.expiresAt, googleAuthAttempts.id)
      .limit(Math.min(100, Math.max(0, limit)));
    for (const row of rows)
      await this.db
        .delete(googleAuthAttempts)
        .where(eq(googleAuthAttempts.id, row.id));
    return rows.length;
  }
}

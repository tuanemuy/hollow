import type {
  AuthReturn,
  GoogleClaims,
} from "@repo/core/domain/account/authentication";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts } from "./hollowSchema";

export const googleIdentities = sqliteTable(
  "google_identities",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    linkedAt: integer("linked_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("google_identity_subject").on(t.issuer, t.subject),
    check(
      "google_identity_issuer",
      sql`${t.issuer} = 'https://accounts.google.com'`,
    ),
    check(
      "google_identity_subject_size",
      sql`length(${t.subject}) between 1 and 255`,
    ),
  ],
);

export const authBrowserContexts = sqliteTable(
  "auth_browser_contexts",
  {
    hash: text("browser_hash").primaryKey(),
    epoch: integer("epoch").notNull(),
    retainUntil: integer("retain_until", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("auth_browser_retention").on(t.retainUntil, t.hash),
    check("auth_browser_epoch", sql`${t.epoch} between 1 and 9007199254740991`),
  ],
);

export const googleAuthAttempts = sqliteTable(
  "google_auth_attempts",
  {
    id: text("id").primaryKey(),
    stateHash: text("state_hash").notNull().unique(),
    nonceHash: text("nonce_hash").notNull(),
    mode: text("mode", { enum: ["login", "link", "reauth"] }).notNull(),
    browserHash: text("browser_hash")
      .notNull()
      .references(() => authBrowserContexts.hash, { onDelete: "restrict" }),
    browserEpoch: integer("browser_epoch").notNull(),
    actorAccountId: text("actor_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    actorSessionHash: text("actor_session_hash"),
    actorAuthVersion: integer("actor_auth_version"),
    returnTo: text("return_to", { mode: "json" }).$type<AuthReturn>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    state: text("state", {
      enum: [
        "pending",
        "exchanging",
        "verified",
        "proof-required",
        "reauth-ready",
        "completed",
        "failed",
      ],
    }).notNull(),
    version: integer("version").notNull(),
    verifierEnvelope: text("verifier_envelope"),
    claims: text("claims", { mode: "json" }).$type<GoogleClaims>(),
    targetAccountId: text("target_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    targetAuthVersion: integer("target_auth_version"),
    proofHash: text("proof_hash"),
    proofExpiresAt: integer("proof_expires_at", { mode: "timestamp_ms" }),
    resultAccountId: text("result_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    failure: text("failure"),
  },
  (t) => [
    index("google_attempt_expiry").on(t.state, t.expiresAt, t.id),
    index("google_attempt_browser").on(t.browserHash, t.browserEpoch),
    index("google_attempt_actor").on(t.actorAccountId, t.state),
    check(
      "google_attempt_actor",
      sql`(${t.actorAccountId} is null and ${t.actorSessionHash} is null and ${t.actorAuthVersion} is null and ${t.mode} = 'login') or (${t.actorAccountId} is not null and ${t.actorSessionHash} is not null and ${t.actorAuthVersion} >= 1)`,
    ),
    check(
      "google_attempt_time",
      sql`${t.expiresAt} > ${t.createdAt} and ${t.expiresAt} <= ${t.createdAt} + 600000`,
    ),
    check(
      "google_attempt_version",
      sql`${t.version} >= 1 and ${t.browserEpoch} >= 1`,
    ),
    check(
      "google_attempt_secret",
      sql`(${t.state} in ('pending','exchanging') and ${t.verifierEnvelope} is not null and ${t.claims} is null) or (${t.state} not in ('pending','exchanging') and ${t.verifierEnvelope} is null)`,
    ),
    check(
      "google_attempt_result",
      sql`(${t.state} in ('verified','proof-required','reauth-ready') and ${t.claims} is not null) or (${t.state} not in ('verified','proof-required','reauth-ready') and ${t.claims} is null)`,
    ),
    check(
      "google_attempt_proof",
      sql`(${t.state} = 'reauth-ready' and ${t.mode} = 'reauth' and ${t.proofHash} is not null and ${t.proofExpiresAt} is not null and ${t.proofExpiresAt} <= ${t.expiresAt}) or (${t.state} != 'reauth-ready' and ${t.proofHash} is null and ${t.proofExpiresAt} is null)`,
    ),
  ],
);

export const accountAuthChallenges = sqliteTable(
  "account_auth_challenges",
  {
    tokenHash: text("token_hash").primaryKey(),
    purpose: text("purpose", { enum: ["google-link", "reset"] }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    authVersion: integer("auth_version").notNull(),
    email: text("email").notNull(),
    generation: integer("generation").notNull(),
    attemptId: text("attempt_id").references(() => googleAuthAttempts.id, {
      onDelete: "restrict",
    }),
    subject: text("subject"),
    browserHash: text("browser_hash"),
    browserEpoch: integer("browser_epoch"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("auth_challenge_account").on(t.purpose, t.accountId, t.expiresAt),
    index("auth_challenge_expiry").on(t.expiresAt, t.tokenHash),
    check(
      "auth_challenge_binding",
      sql`(${t.purpose} = 'reset' and ${t.attemptId} is null and ${t.subject} is null and ${t.browserHash} is null and ${t.browserEpoch} is null) or (${t.purpose} = 'google-link' and ${t.attemptId} is not null and ${t.subject} is not null and ${t.browserHash} is not null and ${t.browserEpoch} >= 1)`,
    ),
    check(
      "auth_challenge_time",
      sql`${t.expiresAt} > ${t.createdAt} and ${t.expiresAt} <= ${t.createdAt} + case when ${t.purpose} = 'reset' then 3600000 else 600000 end`,
    ),
  ],
);

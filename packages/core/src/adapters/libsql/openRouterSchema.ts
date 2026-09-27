import type { OpenRouterReturn } from "@repo/core/domain/integration/openRouter";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { authBrowserContexts } from "./authSchema";
import { accounts } from "./hollowSchema";

export const openRouterConnections = sqliteTable(
  "openrouter_connections",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    epoch: integer("epoch").notNull(),
    version: integer("version").notNull(),
    state: text("state", {
      enum: ["unlinked", "linked", "needs_relink"],
    }).notNull(),
    credentialEnvelope: text("credential_envelope"),
    keyExpiresAt: integer("key_expires_at", { mode: "timestamp_ms" }),
    providerUserId: text("provider_user_id"),
    linkedAt: integer("linked_at", { mode: "timestamp_ms" }),
    everLinkedAt: integer("ever_linked_at", { mode: "timestamp_ms" }),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check(
      "openrouter_connection_version",
      sql`${t.epoch} between 0 and 9007199254740991 and ${t.version} between 1 and 9007199254740991`,
    ),
    check(
      "openrouter_connection_shape",
      sql`(${t.state} = 'unlinked' and ${t.credentialEnvelope} is null and ${t.keyExpiresAt} is null and ${t.providerUserId} is null and ${t.linkedAt} is null and ${t.lastUsedAt} is null) or (${t.state} in ('linked','needs_relink') and ${t.credentialEnvelope} is not null and length(${t.credentialEnvelope}) > 0 and ${t.linkedAt} is not null and ${t.everLinkedAt} is not null and ${t.epoch} >= 1)`,
    ),
  ],
);

export const openRouterAttempts = sqliteTable(
  "openrouter_attempts",
  {
    id: text("id").primaryKey(),
    correlationHash: text("correlation_hash").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    sessionHash: text("session_hash").notNull(),
    authVersion: integer("auth_version").notNull(),
    browserHash: text("browser_hash")
      .notNull()
      .references(() => authBrowserContexts.hash, { onDelete: "restrict" }),
    browserEpoch: integer("browser_epoch").notNull(),
    expectedEpoch: integer("expected_epoch").notNull(),
    expectedVersion: integer("expected_version").notNull(),
    confirmedAdmissionSequence: integer("confirmed_admission_sequence"),
    returnTo: text("return_to", { mode: "json" })
      .$type<OpenRouterReturn>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull(),
    state: text("state", {
      enum: ["pending", "exchanging", "checking", "completed", "failed"],
    }).notNull(),
    verifierEnvelope: text("verifier_envelope"),
    candidateEnvelope: text("candidate_envelope"),
    resultEpoch: integer("result_epoch"),
    firstLink: integer("first_link", { mode: "boolean" }),
    failure: text("failure", {
      enum: [
        "OPENROUTER_EXPIRED",
        "OPENROUTER_CONTEXT_CHANGED",
        "OPENROUTER_EXCHANGE_UNKNOWN",
        "OPENROUTER_PROVIDER_REJECTED",
        "OPENROUTER_CANCELLED",
        "OPENROUTER_CONNECTION_CHANGED",
      ],
    }),
  },
  (t) => [
    index("openrouter_attempt_browser").on(t.browserHash, t.createdAt),
    index("openrouter_attempt_account").on(t.accountId, t.state),
    index("openrouter_attempt_expiry").on(t.expiresAt, t.id),
    check(
      "openrouter_attempt_versions",
      sql`${t.authVersion} >= 1 and ${t.browserEpoch} >= 1 and ${t.expectedEpoch} >= 0 and ${t.expectedVersion} >= 1 and ${t.version} >= 1`,
    ),
    check(
      "openrouter_attempt_time",
      sql`${t.expiresAt} = ${t.createdAt} + 600000`,
    ),
    check(
      "openrouter_attempt_admission",
      sql`${t.confirmedAdmissionSequence} is null or ${t.confirmedAdmissionSequence} between 0 and 9007199254740991`,
    ),
    check(
      "openrouter_attempt_envelopes",
      sql`(${t.verifierEnvelope} is null or length(${t.verifierEnvelope}) > 0) and (${t.candidateEnvelope} is null or length(${t.candidateEnvelope}) > 0)`,
    ),
    check(
      "openrouter_attempt_shape",
      sql`(${t.state} = 'pending' and ${t.verifierEnvelope} is not null and ${t.candidateEnvelope} is null and ${t.resultEpoch} is null and ${t.firstLink} is null and ${t.failure} is null) or (${t.state} = 'exchanging' and ${t.verifierEnvelope} is null and ${t.candidateEnvelope} is null and ${t.resultEpoch} is null and ${t.firstLink} is null and ${t.failure} is null) or (${t.state} = 'checking' and ${t.verifierEnvelope} is null and ${t.candidateEnvelope} is not null and ${t.resultEpoch} is null and ${t.firstLink} is null and ${t.failure} is null) or (${t.state} = 'completed' and ${t.verifierEnvelope} is null and ${t.candidateEnvelope} is null and ${t.resultEpoch} is not null and ${t.resultEpoch} >= 1 and ${t.firstLink} is not null and ${t.firstLink} in (0,1) and ${t.failure} is null) or (${t.state} = 'failed' and ${t.verifierEnvelope} is null and ${t.candidateEnvelope} is null and ${t.resultEpoch} is null and ${t.firstLink} is null and ${t.failure} is not null and ${t.failure} in ('OPENROUTER_EXPIRED','OPENROUTER_CONTEXT_CHANGED','OPENROUTER_EXCHANGE_UNKNOWN','OPENROUTER_PROVIDER_REJECTED','OPENROUTER_CANCELLED','OPENROUTER_CONNECTION_CHANGED'))`,
    ),
  ],
);

export const openRouterModelSettings = sqliteTable(
  "openrouter_model_settings",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    defaultsVersion: integer("defaults_version").notNull(),
    textModel: text("text_model").notNull(),
    imageModel: text("image_model").notNull(),
    audioModel: text("audio_model").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check(
      "openrouter_models_version",
      sql`${t.version} >= 1 and ${t.defaultsVersion} = 1`,
    ),
    check(
      "openrouter_models_ids",
      sql`length(${t.textModel}) between 1 and 255 and length(${t.imageModel}) between 1 and 255 and length(${t.audioModel}) between 1 and 255`,
    ),
  ],
);

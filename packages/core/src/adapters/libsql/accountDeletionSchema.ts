import type {
  AccountDeletionDebt,
  AccountDeletionTable,
  CredentialUseBinding,
  DriveAcknowledgment,
} from "@repo/core/domain/account/deletion";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts } from "./hollowSchema";

export const accountDeletions = sqliteTable(
  "account_deletions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: "restrict" }),
    fenceAuthVersion: integer("fence_auth_version").notNull(),
    state: text("state", {
      enum: ["queued", "running", "waiting-owner", "succeeded"],
    }).notNull(),
    table: text("cursor_table").$type<AccountDeletionTable>().notNull(),
    afterId: text("cursor_after_id"),
    version: integer("version").notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }).notNull(),
    nextAttemptAt: integer("next_attempt_at", {
      mode: "timestamp_ms",
    }).notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    lastFailureCode: text("last_failure_code", { enum: ["step-failed"] }),
  },
  (t) => [
    index("account_deletion_claim").on(t.state, t.nextAttemptAt, t.id),
    uniqueIndex("account_deletion_identity").on(t.id, t.accountId),
    check(
      "account_deletion_version",
      sql`${t.version} between 1 and 9007199254740991 and ${t.fenceAuthVersion} between 2 and 9007199254740991`,
    ),
    check(
      "account_deletion_cursor",
      sql`${t.table} in('personal-notes','uploads','media-drafts','profile-icons','exports','source-attempts','source-bindings','drive-attempts','drive-controls','drive-transfers','drive-heads','drive-jobs','drive-targets','drive-records','google-attempts','auth-challenges','email-verifications','google-identities','openrouter-attempts','openrouter-connection','drive-connection','profile','credential-origins','credential-uses','drive-acknowledgments','verify') and (${t.afterId} is null or length(cast(${t.afterId} as blob)) between 1 and 256) and (${t.state}!='succeeded' or (${t.table}='verify' and ${t.afterId} is null))`,
    ),
    check(
      "account_deletion_failure",
      sql`${t.lastFailureCode} is null or ${t.lastFailureCode}='step-failed'`,
    ),
    check(
      "account_deletion_lease",
      sql`(${t.state}='running' and ${t.leaseToken} is not null and ${t.leaseUntil}>${t.acceptedAt}) or (${t.state} in ('queued','waiting-owner','succeeded') and ${t.leaseToken} is null and ${t.leaseUntil} is null)`,
    ),
  ],
);

export const accountDeletionDebts = sqliteTable(
  "account_deletion_debts",
  {
    intentId: text("intent_id")
      .notNull()
      .references(() => accountDeletions.id, { onDelete: "restrict" }),
    kind: text("kind").$type<AccountDeletionDebt["kind"]>().notNull(),
    ownerId: text("owner_id").notNull(),
    locator: text("locator").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.intentId, t.kind, t.ownerId, t.locator] }),
    check(
      "account_deletion_debt_shape",
      sql`${t.kind} in('source-attempt','input','drive-attempt','drive-control','drive-transfer','object-write','purge') and length(cast(${t.ownerId} as blob)) between 1 and 256 and length(cast(${t.locator} as blob)) between 1 and 4096 and json_valid(${t.locator}) and json_type(${t.locator},'$.table')='text' and json_extract(${t.locator},'$.id')=${t.ownerId}`,
    ),
  ],
);

export const accountDeletionPurges = sqliteTable(
  "account_deletion_purges",
  {
    intentId: text("intent_id")
      .notNull()
      .references(() => accountDeletions.id, { onDelete: "restrict" }),
    noteId: text("note_id").notNull(),
    purgeId: text("purge_id").notNull().unique(),
  },
  (t) => [primaryKey({ columns: [t.intentId, t.noteId] })],
);

export const driveAcknowledgments = sqliteTable(
  "account_deletion_drive_acknowledgments",
  {
    kind: text("kind").$type<DriveAcknowledgment["kind"]>().notNull(),
    id: text("id").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    runtimeGeneration: text("runtime_generation").notNull(),
    ownerToken: text("owner_token").notNull(),
    evidenceId: text("evidence_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.kind, t.id, t.runtimeGeneration, t.ownerToken] }),
    index("account_deletion_drive_ack_account").on(t.accountId, t.kind, t.id),
    check(
      "account_deletion_drive_ack_shape",
      sql`${t.kind} in('authorization','control','backup') and length(cast(${t.id} as blob)) between 1 and 256 and length(cast(${t.runtimeGeneration} as blob)) between 1 and 128 and length(cast(${t.ownerToken} as blob)) between 1 and 128 and length(cast(${t.evidenceId} as blob)) between 1 and 128`,
    ),
  ],
);

export const credentialUses = sqliteTable(
  "account_deletion_credential_uses",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: ["google", "openrouter"] }).notNull(),
    binding: text("binding", { mode: "json" })
      .$type<CredentialUseBinding>()
      .notNull(),
    accountId: text("account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    resultAccountId: text("result_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    sourceId: text("source_id").notNull(),
    runtimeId: text("runtime_id").notNull(),
    ownerToken: text("owner_token").notNull(),
    generation: integer("generation").notNull(),
    version: integer("version").notNull(),
    state: text("state", { enum: ["active", "unknown", "closed"] }).notNull(),
    callerEnded: integer("caller_ended", { mode: "boolean" }).notNull(),
    acknowledged: integer("acknowledged", { mode: "boolean" }).notNull(),
    evidenceId: text("evidence_id"),
  },
  (t) => [
    index("credential_use_pending").on(t.provider, t.acknowledged, t.id),
    index("credential_use_account").on(t.accountId, t.state),
    index("credential_use_result_account").on(t.resultAccountId, t.state),
    index("credential_use_source").on(t.sourceId, t.provider),
    check(
      "credential_use_version",
      sql`${t.version} between 1 and 9007199254740991 and ${t.generation}=1 and length(cast(${t.runtimeId} as blob)) between 1 and 128 and length(cast(${t.ownerToken} as blob)) between 1 and 128`,
    ),
    check(
      "credential_use_state",
      sql`(${t.state} in('active','unknown') and ${t.callerEnded}=0 and ${t.acknowledged}=0 and ${t.evidenceId} is null) or (${t.state}='closed' and ${t.callerEnded}=1 and ${t.acknowledged} in(0,1) and ${t.evidenceId} is not null)`,
    ),
    check(
      "credential_use_binding",
      sql`coalesce(json_valid(${t.binding}) and json_extract(${t.binding},'$.provider')=${t.provider} and json_extract(${t.binding},'$.source.id')=${t.sourceId} and json_extract(${t.binding},'$.source.version') between 1 and 9007199254740991 and ((json_extract(${t.binding},'$.authority.kind')='account' and json_extract(${t.binding},'$.authority.accountId')=${t.accountId} and ${t.accountId} is not null and json_extract(${t.binding},'$.authority.authVersion') between 1 and 9007199254740991) or (${t.provider}='google' and json_extract(${t.binding},'$.authority.kind')='unresolved-google' and ${t.accountId} is null and json_type(${t.binding},'$.authority.accountId')='null' and json_type(${t.binding},'$.authority.authVersion')='null')),0)`,
    ),
  ],
);

export const credentialOrigins = sqliteTable(
  "account_deletion_credential_origins",
  {
    provider: text("provider", { enum: ["google", "openrouter"] }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    mode: text("mode", { enum: ["legacy-unproven", "native-v1"] }).notNull(),
    useId: text("use_id").references(() => credentialUses.id, {
      onDelete: "restrict",
    }),
    credentialEpoch: integer("credential_epoch"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.accountId] }),
    check(
      "credential_origin_shape",
      sql`(${t.mode}='legacy-unproven' and ${t.useId} is null and ${t.credentialEpoch} is null) or (${t.mode}='native-v1' and ${t.useId} is not null and ((${t.provider}='google' and ${t.credentialEpoch} is null) or (${t.provider}='openrouter' and ${t.credentialEpoch} between 1 and 9007199254740991)))`,
    ),
  ],
);

import type {
  ZipAttemptResult,
  ZipExclusion,
  ZipFile,
  ZipRunResult,
} from "@repo/core/domain/zip/entity";
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, notes } from "./hollowSchema";

const instant = (name: string) => integer(name, { mode: "timestamp_ms" });
const cleanup = () => ({
  nextCleanupAt: instant("next_cleanup_at").notNull(),
  cleanupToken: text("cleanup_token"),
  cleanupUntil: instant("cleanup_until"),
});

export const zipRequests = sqliteTable(
  "zip_requests",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    format: text("format", { enum: ["html", "markdown", "pdf"] }).notNull(),
    style: text("style", { enum: ["saved"] }).notNull(),
    state: text("state", {
      enum: ["active", "assembling", "stopping", "terminal"],
    }).notNull(),
    generation: integer("generation").notNull(),
    cancelGeneration: integer("cancel_generation").notNull(),
    version: integer("version").notNull(),
    retryOf: text("retry_of"),
    createdAt: instant("created_at").notNull(),
    historyExpiresAt: instant("history_expires_at").notNull(),
    updatedAt: instant("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("zip_request_command").on(t.accountId, t.commandId),
    uniqueIndex("zip_request_account_active")
      .on(t.accountId)
      .where(sql`${t.state}!='terminal'`),
    uniqueIndex("zip_request_global_active")
      .on(sql`(1)`)
      .where(sql`${t.state}!='terminal'`),
    index("zip_request_history").on(t.accountId, t.createdAt, t.id),
    index("zip_request_expiry").on(t.historyExpiresAt, t.id),
    check(
      "zip_request_state",
      sql`${t.state} in('active','assembling','stopping','terminal')`,
    ),
    check(
      "zip_request_format",
      sql`${t.format} in('html','markdown','pdf') and ${t.style}='saved'`,
    ),
    check(
      "zip_request_lifetime",
      sql`${t.historyExpiresAt}=${t.createdAt}+7776000000`,
    ),
    check(
      "zip_request_versions",
      sql`${t.generation} between 1 and 9007199254740991 and ${t.version} between 1 and 9007199254740991 and ${t.cancelGeneration} between 0 and ${t.generation}`,
    ),
  ],
);

export const zipRuns = sqliteTable(
  "zip_runs",
  {
    requestId: text("request_id")
      .notNull()
      .references(() => zipRequests.id, { onDelete: "restrict" }),
    generation: integer("generation").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    state: text("state", {
      enum: [
        "queued",
        "running",
        "assembling",
        "stopping",
        "succeeded",
        "partial",
        "failed",
        "cancelled",
      ],
    }).notNull(),
    failure: text("failure"),
    leaseToken: text("lease_token"),
    runtimeId: text("runtime_id"),
    leaseUntil: instant("lease_until"),
    deadlineAt: instant("deadline_at").notNull(),
    acceptedAt: instant("accepted_at").notNull(),
    historyExpiresAt: instant("history_expires_at").notNull(),
    publishedAt: instant("published_at"),
    finishedAt: instant("finished_at"),
    artifactId: text("artifact_id").references(
      (): AnySQLiteColumn => zipArtifacts.id,
      { onDelete: "restrict" },
    ),
    exclusions: text("exclusions", { mode: "json" })
      .$type<readonly ZipExclusion[]>()
      .notNull()
      .default([]),
    results: text("results", { mode: "json" }).$type<readonly ZipRunResult[]>(),
    version: integer("version").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.requestId, t.generation] }),
    uniqueIndex("zip_run_command").on(t.accountId, t.commandId),
    index("zip_run_claim").on(t.state, t.acceptedAt, t.requestId),
    index("zip_run_expiry").on(t.historyExpiresAt, t.requestId, t.generation),
    index("zip_run_artifact").on(t.artifactId),
    check(
      "zip_run_state",
      sql`${t.state} in('queued','running','assembling','stopping','succeeded','partial','failed','cancelled')`,
    ),
    check(
      "zip_run_lifetime",
      sql`${t.historyExpiresAt}=${t.acceptedAt}+7776000000 and ${t.deadlineAt}>${t.acceptedAt}`,
    ),
    check(
      "zip_run_lease",
      sql`(${t.leaseToken} is null)=(${t.leaseUntil} is null) and (${t.leaseToken} is null)=(${t.runtimeId} is null) and (${t.state} not in('running','assembling') or ${t.leaseToken} is not null) and (${t.state} not in('queued','succeeded','partial','failed','cancelled') or ${t.leaseToken} is null)`,
    ),
    check(
      "zip_run_failure",
      sql`(${t.state}='failed' and ${t.failure} is not null) or (${t.state}='stopping') or (${t.state} not in('failed','stopping') and ${t.failure} is null)`,
    ),
    check(
      "zip_run_published",
      sql`${t.state} not in('succeeded','partial') or ${t.publishedAt} is not null`,
    ),
    check(
      "zip_run_finished",
      sql`(${t.state} in('succeeded','partial','failed','cancelled') and typeof(${t.finishedAt})='integer' and ${t.finishedAt} between ${t.acceptedAt} and 9007199254740991) or (${t.state} in('queued','running','assembling','stopping') and ${t.finishedAt} is null)`,
    ),
    check(
      "zip_run_versions",
      sql`${t.generation} between 1 and 9007199254740991 and ${t.version} between 1 and 9007199254740991`,
    ),
  ],
);

export const zipTargets = sqliteTable(
  "zip_targets",
  {
    requestId: text("request_id")
      .notNull()
      .references(() => zipRequests.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    latestAttemptNumber: integer("latest_attempt_number").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.requestId, t.ordinal] }),
    uniqueIndex("zip_target_note").on(t.requestId, t.targetNoteId),
    index("zip_target_live").on(t.liveNoteId, t.requestId),
    check(
      "zip_target_ordinal",
      sql`${t.ordinal} between 0 and 499 and ${t.latestAttemptNumber} between 1 and 9007199254740991`,
    ),
    check(
      "zip_target_live",
      sql`${t.liveNoteId} is null or ${t.liveNoteId}=${t.targetNoteId}`,
    ),
  ],
);

export const zipAttempts = sqliteTable(
  "zip_attempts",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    generation: integer("generation").notNull(),
    ordinal: integer("ordinal").notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    title: text("title").notNull(),
    expectedIdentity: text("expected_identity").notNull(),
    state: text("state", {
      enum: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "excluded",
        "cancelled",
      ],
    }).notNull(),
    result: text("result", { mode: "json" }).$type<ZipAttemptResult>(),
    failure: text("failure"),
    createdAt: instant("created_at").notNull(),
    historyExpiresAt: instant("history_expires_at").notNull(),
    version: integer("version").notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.requestId, t.generation],
      foreignColumns: [zipRuns.requestId, zipRuns.generation],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.requestId, t.ordinal],
      foreignColumns: [zipTargets.requestId, zipTargets.ordinal],
    }).onDelete("restrict"),
    uniqueIndex("zip_attempt_number").on(
      t.requestId,
      t.ordinal,
      t.attemptNumber,
    ),
    index("zip_attempt_work").on(t.requestId, t.generation, t.state, t.ordinal),
    index("zip_attempt_expiry").on(t.historyExpiresAt, t.id),
    check(
      "zip_attempt_state",
      sql`${t.state} in('queued','running','succeeded','failed','excluded','cancelled')`,
    ),
    check(
      "zip_attempt_result",
      sql`(${t.state}='succeeded' and ${t.result} is not null and ${t.failure} is null) or (${t.state} in('failed','excluded') and ${t.result} is null and ${t.failure} is not null) or (${t.state} in('queued','running','cancelled') and ${t.result} is null and ${t.failure} is null)`,
    ),
    check(
      "zip_attempt_lifetime",
      sql`${t.historyExpiresAt}=${t.createdAt}+7776000000`,
    ),
    check(
      "zip_attempt_versions",
      sql`${t.attemptNumber} between 1 and 9007199254740991 and ${t.version} between 1 and 9007199254740991`,
    ),
  ],
);

export const zipSpools = sqliteTable(
  "zip_spools",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id").notNull(),
    format: text("format", { enum: ["html", "markdown", "pdf"] }).notNull(),
    generation: integer("generation").notNull(),
    key: text("storage_key").unique(),
    state: text("state", {
      enum: ["writing", "ready", "cleanup", "removed"],
    }).notNull(),
    result: text("result", { mode: "json" }).$type<ZipAttemptResult>(),
    reservedBytes: integer("reserved_bytes").notNull(),
    createdAt: instant("created_at").notNull(),
    ...cleanup(),
  },
  (t) => [
    index("zip_spool_cleanup").on(t.state, t.nextCleanupAt, t.id),
    index("zip_spool_attempt").on(t.attemptId),
    check(
      "zip_spool_state",
      sql`${t.state} in('writing','ready','cleanup','removed')`,
    ),
    check("zip_spool_format", sql`${t.format} in('html','markdown','pdf')`),
    check(
      "zip_spool_storage",
      sql`(${t.state}='removed' and ${t.key} is null and ${t.result} is null and ${t.reservedBytes}=0) or (${t.state}!='removed' and ${t.key} is not null)`,
    ),
    check(
      "zip_spool_ready",
      sql`${t.state}!='ready' or ${t.result} is not null`,
    ),
    check(
      "zip_spool_writing",
      sql`${t.state}!='writing' or ${t.result} is null`,
    ),
    check(
      "zip_spool_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes} between 0 and 9007199254740991`,
    ),
    check(
      "zip_spool_generation",
      sql`${t.generation} between 1 and 9007199254740991`,
    ),
    check(
      "zip_spool_cleanup_lease",
      sql`(${t.cleanupToken} is null)=(${t.cleanupUntil} is null)`,
    ),
  ],
);

export const zipSpoolRefs = sqliteTable(
  "zip_spool_refs",
  {
    requestId: text("request_id").notNull(),
    generation: integer("generation").notNull(),
    ordinal: integer("ordinal").notNull(),
    spoolId: text("spool_id")
      .notNull()
      .references(() => zipSpools.id, { onDelete: "restrict" }),
    purpose: text("purpose", { enum: ["active", "retry"] }).notNull(),
    retryUntil: instant("retry_until"),
  },
  (t) => [
    primaryKey({ columns: [t.requestId, t.generation, t.ordinal] }),
    foreignKey({
      columns: [t.requestId, t.generation],
      foreignColumns: [zipRuns.requestId, zipRuns.generation],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.requestId, t.ordinal],
      foreignColumns: [zipTargets.requestId, zipTargets.ordinal],
    }).onDelete("restrict"),
    index("zip_ref_spool").on(t.spoolId),
    index("zip_ref_expiry").on(
      t.purpose,
      t.retryUntil,
      t.requestId,
      t.generation,
    ),
    check(
      "zip_ref_purpose",
      sql`(${t.purpose}='active' and ${t.retryUntil} is null) or (${t.purpose}='retry' and ${t.retryUntil} is not null)`,
    ),
  ],
);

export const zipAssemblies = sqliteTable(
  "zip_assemblies",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    generation: integer("generation").notNull(),
    assemblyGeneration: integer("assembly_generation").notNull(),
    state: text("state", { enum: ["writing", "closing", "closed"] }).notNull(),
    outcome: text("outcome", {
      enum: ["success", "failure", "excluded", "cancelled"],
    }),
    ordinals: text("ordinals", { mode: "json" })
      .$type<readonly number[]>()
      .notNull(),
    sealDigest: text("seal_digest").notNull(),
    key: text("storage_key").unique(),
    file: text("file", { mode: "json" }).$type<ZipFile>(),
    reservedBytes: integer("reserved_bytes").notNull(),
    createdAt: instant("created_at").notNull(),
    ...cleanup(),
  },
  (t) => [
    foreignKey({
      columns: [t.requestId, t.generation],
      foreignColumns: [zipRuns.requestId, zipRuns.generation],
    }).onDelete("restrict"),
    uniqueIndex("zip_assembly_generation").on(
      t.requestId,
      t.generation,
      t.assemblyGeneration,
    ),
    uniqueIndex("zip_assembly_active")
      .on(sql`(1)`)
      .where(sql`${t.state}!='closed'`),
    index("zip_assembly_cleanup").on(t.nextCleanupAt, t.id),
    check(
      "zip_assembly_state",
      sql`${t.state} in('writing','closing','closed')`,
    ),
    check(
      "zip_assembly_outcome",
      sql`(${t.state}='closed' and ${t.outcome} in('success','failure','excluded','cancelled')) or (${t.state}!='closed' and (${t.outcome} is null or ${t.outcome} in('failure','excluded','cancelled')))`,
    ),
    check(
      "zip_assembly_storage",
      sql`${t.key} is not null or (${t.state}='closed' and ${t.reservedBytes}=0)`,
    ),
    check(
      "zip_assembly_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes} between 0 and 9007199254740991`,
    ),
    check(
      "zip_assembly_generation",
      sql`${t.assemblyGeneration} between 1 and 9007199254740991`,
    ),
    check(
      "zip_assembly_ordinals",
      sql`json_valid(${t.ordinals}) and json_type(${t.ordinals})='array' and json_array_length(${t.ordinals}) between 1 and 500`,
    ),
    check(
      "zip_assembly_cleanup_lease",
      sql`(${t.cleanupToken} is null)=(${t.cleanupUntil} is null)`,
    ),
  ],
);

export const zipArtifacts = sqliteTable(
  "zip_artifacts",
  {
    id: text("id").primaryKey(),
    assemblyId: text("assembly_id")
      .notNull()
      .references(() => zipAssemblies.id, { onDelete: "restrict" }),
    generation: integer("generation").notNull(),
    state: text("state", { enum: ["ready", "cleanup", "removed"] }).notNull(),
    key: text("storage_key").unique(),
    file: text("file", { mode: "json" }).$type<ZipFile>(),
    reservedBytes: integer("reserved_bytes").notNull(),
    publishedAt: instant("published_at").notNull(),
    expiresAt: instant("expires_at").notNull(),
    ...cleanup(),
  },
  (t) => [
    index("zip_artifact_cleanup").on(t.state, t.nextCleanupAt, t.id),
    index("zip_artifact_expiry").on(t.expiresAt, t.id),
    check(
      "zip_artifact_state",
      sql`${t.state} in('ready','cleanup','removed')`,
    ),
    check(
      "zip_artifact_storage",
      sql`(${t.state}='removed' and ${t.key} is null and ${t.file} is null and ${t.reservedBytes}=0) or (${t.state} in('ready','cleanup') and ${t.key} is not null and ${t.file} is not null)`,
    ),
    check(
      "zip_artifact_lifetime",
      sql`${t.expiresAt}=${t.publishedAt}+604800000`,
    ),
    check(
      "zip_artifact_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes} between 0 and 9007199254740991`,
    ),
    check(
      "zip_artifact_generation",
      sql`${t.generation} between 1 and 9007199254740991`,
    ),
    check(
      "zip_artifact_cleanup_lease",
      sql`(${t.cleanupToken} is null)=(${t.cleanupUntil} is null)`,
    ),
  ],
);

export const zipArtifactEntries = sqliteTable(
  "zip_artifact_entries",
  {
    artifactId: text("artifact_id")
      .notNull()
      .references(() => zipArtifacts.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    sourceIdentity: text("source_identity").notNull(),
    externalIdentity: text("external_identity").notNull(),
    profile: text("profile").notNull(),
    filename: text("filename").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.artifactId, t.ordinal] }),
    index("zip_artifact_entry_live").on(t.liveNoteId, t.artifactId),
    check("zip_artifact_entry_ordinal", sql`${t.ordinal} between 0 and 499`),
    check(
      "zip_artifact_entry_live",
      sql`${t.liveNoteId} is null or ${t.liveNoteId}=${t.targetNoteId}`,
    ),
    check(
      "zip_artifact_entry_bytes",
      sql`typeof(${t.bytes})='integer' and ${t.bytes} between 0 and 1000000000`,
    ),
  ],
);

export const zipDeliveries = sqliteTable(
  "zip_deliveries",
  {
    id: text("id").primaryKey(),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => zipArtifacts.id, { onDelete: "restrict" }),
    artifactGeneration: integer("artifact_generation").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    state: text("state", {
      enum: ["ready", "sending", "closing", "closed"],
    }).notNull(),
    claimToken: text("claim_token"),
    runtimeId: text("runtime_id"),
    createdAt: instant("created_at").notNull(),
    expiresAt: instant("expires_at").notNull(),
  },
  (t) => [
    index("zip_delivery_artifact").on(t.artifactId, t.state),
    index("zip_delivery_expiry").on(t.state, t.expiresAt, t.id),
    check(
      "zip_delivery_state",
      sql`${t.state} in('ready','sending','closing','closed')`,
    ),
    check(
      "zip_delivery_claim",
      sql`(${t.state} in('ready','closed') and ${t.claimToken} is null and ${t.runtimeId} is null) or (${t.state} in('sending','closing') and ${t.claimToken} is not null and ${t.runtimeId} is not null)`,
    ),
    check(
      "zip_delivery_lifetime",
      sql`${t.expiresAt}>${t.createdAt} and ${t.expiresAt}<=${t.createdAt}+600000`,
    ),
    check(
      "zip_delivery_generation",
      sql`${t.artifactGeneration} between 1 and 9007199254740991`,
    ),
  ],
);

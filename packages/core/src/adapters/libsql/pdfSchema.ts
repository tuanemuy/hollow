import type { PdfFile } from "@repo/core/domain/pdf/entity";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, notes } from "./hollowSchema";

export const pdfComputations = sqliteTable(
  "pdf_computations",
  {
    id: text("id").primaryKey(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    sourceIdentity: text("source_identity").notNull(),
    profile: text("profile").notNull(),
    state: text("state", {
      enum: ["queued", "running", "stopping", "closed"],
    }).notNull(),
    generation: integer("generation").notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    workspaceId: text("workspace_id").notNull().unique(),
    reservedBytes: integer("reserved_bytes").notNull(),
    workspaceRemoved: integer("workspace_removed", { mode: "boolean" })
      .notNull()
      .default(false),
    nextCleanupAt: integer("next_cleanup_at", {
      mode: "timestamp_ms",
    }).notNull(),
    cleanupToken: text("cleanup_token"),
    cleanupUntil: integer("cleanup_until", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("pdf_computation_active_note")
      .on(t.liveNoteId)
      .where(sql`${t.state}!='closed'`),
    index("pdf_computation_claim").on(t.state, t.createdAt, t.id),
    index("pdf_computation_cleanup").on(
      t.workspaceRemoved,
      t.nextCleanupAt,
      t.id,
    ),
    check(
      "pdf_computation_state",
      sql`${t.state} in('queued','running','stopping','closed')`,
    ),
    check(
      "pdf_computation_lease",
      sql`(${t.state} in('queued','closed') and ${t.leaseToken} is null and ${t.leaseUntil} is null) or (${t.state} in('running','stopping') and ${t.leaseToken} is not null and ${t.leaseUntil} is not null)`,
    ),
    check(
      "pdf_computation_live",
      sql`(${t.liveNoteId} is not null and ${t.liveNoteId}=${t.targetNoteId}) or (${t.state}='closed' and ${t.workspaceRemoved}=1 and ${t.liveNoteId} is null)`,
    ),
    check(
      "pdf_computation_removed",
      sql`${t.workspaceRemoved} in(0,1) and (${t.workspaceRemoved}=0 or (${t.state}='closed' and ${t.reservedBytes}=0))`,
    ),
    check(
      "pdf_computation_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes} between 0 and 9007199254740991`,
    ),
    check(
      "pdf_computation_generation",
      sql`typeof(${t.generation})='integer' and ${t.generation} between 1 and 9007199254740991`,
    ),
    check(
      "pdf_computation_cleanup_lease",
      sql`(${t.cleanupToken} is null)=(${t.cleanupUntil} is null)`,
    ),
  ],
);

export const pdfArtifacts = sqliteTable(
  "pdf_artifacts",
  {
    id: text("id").primaryKey(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    computeId: text("compute_id")
      .notNull()
      .references(() => pdfComputations.id, { onDelete: "restrict" }),
    sourceIdentity: text("source_identity").notNull(),
    profile: text("profile").notNull(),
    state: text("state", {
      enum: ["writing", "ready", "cleanup", "removed"],
    }).notNull(),
    key: text("storage_key").unique(),
    file: text("file", { mode: "json" }).$type<PdfFile>(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    reservedBytes: integer("reserved_bytes").notNull(),
    generation: integer("generation").notNull(),
    nextCleanupAt: integer("next_cleanup_at", {
      mode: "timestamp_ms",
    }).notNull(),
    cleanupToken: text("cleanup_token"),
    cleanupUntil: integer("cleanup_until", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("pdf_artifact_cache").on(
      t.liveNoteId,
      t.sourceIdentity,
      t.profile,
      t.state,
      t.expiresAt,
    ),
    index("pdf_artifact_cleanup").on(t.state, t.nextCleanupAt, t.id),
    index("pdf_artifact_compute").on(t.computeId, t.id),
    check(
      "pdf_artifact_state",
      sql`${t.state} in('writing','ready','cleanup','removed')`,
    ),
    check(
      "pdf_artifact_live",
      sql`(${t.liveNoteId} is not null and ${t.liveNoteId}=${t.targetNoteId}) or (${t.state}='removed' and ${t.liveNoteId} is null)`,
    ),
    check(
      "pdf_artifact_storage",
      sql`(${t.state}='removed' and ${t.key} is null and ${t.file} is null and ${t.reservedBytes}=0) or (${t.state}!='removed' and ${t.key} is not null)`,
    ),
    check(
      "pdf_artifact_ready",
      sql`${t.state}!='ready' or (${t.file} is not null and ${t.publishedAt} is not null and ${t.expiresAt} is not null and ${t.expiresAt}=${t.publishedAt}+86400000)`,
    ),
    check(
      "pdf_artifact_unpublished",
      sql`${t.state}!='writing' or (${t.file} is null and ${t.publishedAt} is null and ${t.expiresAt} is null)`,
    ),
    check(
      "pdf_artifact_expiry",
      sql`(${t.publishedAt} is null and ${t.expiresAt} is null) or (${t.publishedAt} is not null and ${t.expiresAt} is not null and ${t.expiresAt}=${t.publishedAt}+86400000)`,
    ),
    check(
      "pdf_artifact_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes} between 0 and 9007199254740991`,
    ),
    check(
      "pdf_artifact_generation",
      sql`typeof(${t.generation})='integer' and ${t.generation} between 1 and 9007199254740991`,
    ),
    check(
      "pdf_artifact_cleanup_lease",
      sql`(${t.cleanupToken} is null)=(${t.cleanupUntil} is null)`,
    ),
  ],
);

export const pdfRequests = sqliteTable(
  "pdf_requests",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    sourceIdentity: text("source_identity").notNull(),
    style: text("style", { enum: ["default", "original"] }).notNull(),
    computeId: text("compute_id").references(() => pdfComputations.id, {
      onDelete: "restrict",
    }),
    artifactId: text("artifact_id").references(() => pdfArtifacts.id, {
      onDelete: "restrict",
    }),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    failure: text("failure"),
    retryOf: text("retry_of"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    historyExpiresAt: integer("history_expires_at", {
      mode: "timestamp_ms",
    }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => [
    uniqueIndex("pdf_request_command").on(t.accountId, t.commandId),
    index("pdf_request_history").on(t.accountId, t.createdAt, t.id),
    index("pdf_request_demand").on(t.computeId, t.state, t.id),
    index("pdf_request_note_actor").on(t.liveNoteId, t.accountId, t.state),
    index("pdf_request_expiry").on(t.historyExpiresAt, t.id),
    index("pdf_request_artifact").on(t.artifactId),
    check(
      "pdf_request_state",
      sql`${t.state} in('queued','running','succeeded','failed','cancelled')`,
    ),
    check("pdf_request_style", sql`${t.style} in('default','original')`),
    check(
      "pdf_request_result",
      sql`(${t.state}='succeeded' and ${t.artifactId} is not null and ${t.failure} is null) or (${t.state}='failed' and ${t.artifactId} is null and ${t.failure} is not null) or (${t.state} in('queued','running','cancelled') and ${t.artifactId} is null and ${t.failure} is null)`,
    ),
    check(
      "pdf_request_live",
      sql`(${t.liveNoteId} is not null and ${t.liveNoteId}=${t.targetNoteId}) or (${t.state} in('succeeded','failed','cancelled') and ${t.liveNoteId} is null)`,
    ),
    check(
      "pdf_request_compute",
      sql`${t.state} not in('queued','running') or ${t.computeId} is not null`,
    ),
    check(
      "pdf_request_lifetime",
      sql`${t.historyExpiresAt}=${t.createdAt}+7776000000`,
    ),
    check(
      "pdf_request_version",
      sql`typeof(${t.version})='integer' and ${t.version} between 1 and 9007199254740991`,
    ),
  ],
);

export const pdfDeliveries = sqliteTable(
  "pdf_deliveries",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => pdfRequests.id, { onDelete: "restrict" }),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => pdfArtifacts.id, { onDelete: "restrict" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    state: text("state", {
      enum: ["ready", "sending", "closing", "closed"],
    }).notNull(),
    generation: integer("generation").notNull(),
    claimToken: text("claim_token"),
    runtimeId: text("runtime_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    nextCleanupAt: integer("next_cleanup_at", {
      mode: "timestamp_ms",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("pdf_delivery_request_active")
      .on(t.requestId)
      .where(sql`${t.state}!='closed'`),
    index("pdf_delivery_artifact").on(t.artifactId, t.state),
    index("pdf_delivery_cleanup").on(t.state, t.nextCleanupAt, t.id),
    check(
      "pdf_delivery_state",
      sql`${t.state} in('ready','sending','closing','closed')`,
    ),
    check(
      "pdf_delivery_owner",
      sql`(${t.state} in('ready','closed') and ${t.claimToken} is null and ${t.runtimeId} is null) or (${t.state} in('sending','closing') and ${t.claimToken} is not null and ${t.runtimeId} is not null)`,
    ),
    check(
      "pdf_delivery_lifetime",
      sql`${t.expiresAt}>${t.createdAt} and ${t.expiresAt}<=${t.createdAt}+120000`,
    ),
    check(
      "pdf_delivery_generation",
      sql`typeof(${t.generation})='integer' and ${t.generation} between 1 and 9007199254740991`,
    ),
  ],
);

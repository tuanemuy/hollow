import type { NoteDisplay } from "@repo/core/domain/note/displayStyle";
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

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
});

export const emailVerifications = sqliteTable("email_verifications", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  browserHash: text("browser_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "timestamp_ms" }),
});

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_sessions_account").on(table.accountId)],
);

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  useAi: integer("use_ai", { mode: "boolean" }).notNull(),
  cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
});
export const uploadReservations = sqliteTable("upload_reservations", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => importBatches.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  name: text("name").notNull(),
  role: text("role", { enum: ["note", "companion"] })
    .notNull()
    .default("note"),
  sourcePath: text("source_path").notNull().default(""),
  bytes: integer("bytes").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  state: text("state", {
    enum: ["awaiting", "uploading", "accepted", "failed", "cancelled"],
  }).notNull(),
  failure: text("failure"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  storageCleaned: integer("storage_cleaned", { mode: "boolean" })
    .notNull()
    .default(false),
});
export const originals = sqliteTable("originals", {
  id: text("id").primaryKey(),
  noteId: text("note_id")
    .notNull()
    .unique()
    .references(() => notes.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  name: text("name").notNull(),
  bytes: integer("bytes").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  sha256: text("sha256").notNull(),
  format: text("format", {
    enum: [
      "html",
      "markdown",
      "text",
      "docx",
      "xlsx",
      "pptx",
      "pdf",
      "image",
      "audio",
    ],
  }).notNull(),
  state: text("state", {
    enum: ["processing", "ready", "needs_ai", "failed", "cancelled"],
  }).notNull(),
  coverage: text("coverage", {
    enum: ["complete", "partial", "no_text"],
  }).notNull(),
  activeJobId: text("active_job_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
export const conversionJobs = sqliteTable(
  "conversion_jobs",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => importBatches.id),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id),
    noteVersion: integer("note_version").notNull(),
    useAi: integer("use_ai", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    attempt: integer("attempt").notNull(),
    retryOf: text("retry_of"),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    failure: text("failure"),
  },
  (t) => [
    uniqueIndex("conversion_job_retry_once").on(t.retryOf),
    index("conversion_job_claim").on(t.state, t.leaseUntil),
    check(
      "conversion_job_state_fields",
      sql`(${t.state} = 'running' AND ${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL AND ${t.failure} IS NULL) OR (${t.state} = 'failed' AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.failure} IS NOT NULL) OR (${t.state} IN ('queued','succeeded','cancelled') AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.failure} IS NULL)`,
    ),
  ],
);
export const extractionNotices = sqliteTable("extraction_notices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: text("original_id")
    .notNull()
    .references(() => originals.id),
  code: text("code").notNull(),
  location: text("location").notNull(),
  message: text("message").notNull(),
});

export const authThrottles = sqliteTable("auth_throttles", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  blockedUntil: integer("blocked_until", { mode: "timestamp_ms" }).notNull(),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }).notNull(),
});

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    ownerAccountId: text("owner_account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    ownerWorkspaceId: text("owner_workspace_id"),
    lifecycle: text("lifecycle", { enum: ["active", "trashed"] })
      .notNull()
      .default("active"),
    trashedAt: integer("trashed_at", { mode: "timestamp_ms" }),
    purgeAfter: integer("purge_after", { mode: "timestamp_ms" }),
    trashOperationId: text("trash_operation_id"),
    title: text("title").notNull(),
    html: text("html").notNull(),
    display: text("display", { mode: "json" })
      .$type<NoteDisplay>()
      .notNull()
      .default({
        style: "default",
        source: "legacy",
        initialization: { kind: "complete", reason: "legacy" },
      }),
    version: integer("version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    check(
      "notes_one_owner",
      sql`(${table.ownerAccountId} IS NOT NULL) != (${table.ownerWorkspaceId} IS NOT NULL)`,
    ),
    check(
      "notes_lifecycle_valid",
      sql`(${table.lifecycle} = 'active' AND ${table.trashedAt} IS NULL AND ${table.purgeAfter} IS NULL AND ${table.trashOperationId} IS NULL) OR (${table.lifecycle} = 'trashed' AND ${table.trashedAt} IS NOT NULL AND ${table.purgeAfter} IS NOT NULL AND ${table.purgeAfter} > ${table.trashedAt} AND ${table.trashOperationId} IS NOT NULL)`,
    ),
    index("idx_notes_trash").on(
      table.ownerAccountId,
      table.lifecycle,
      table.trashedAt,
      table.id,
    ),
    index("idx_notes_personal_updated").on(
      table.ownerAccountId,
      table.updatedAt,
      table.id,
    ),
  ],
);

export const mediaDrafts = sqliteTable("media_drafts", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  noteId: text("note_id").references(() => notes.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});
export const mediaUploads = sqliteTable("media_uploads", {
  id: text("id").primaryKey(),
  draftId: text("draft_id")
    .notNull()
    .references(() => mediaDrafts.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  name: text("name").notNull(),
  bytes: integer("bytes").notNull(),
  state: text("state", {
    enum: ["awaiting", "uploading", "accepted", "failed"],
  }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  storageCleaned: integer("storage_cleaned", { mode: "boolean" })
    .notNull()
    .default(false),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  draftId: text("draft_id").references(() => mediaDrafts.id),
  sourceNoteId: text("source_note_id").references(() => notes.id),
  sourceJobId: text("source_job_id"),
  storageKey: text("storage_key").notNull().unique(),
  bytes: integer("bytes").notNull(),
  sha256: text("sha256").notNull(),
  mime: text("mime", {
    enum: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
    ],
  }).notNull(),
  kind: text("kind", { enum: ["image", "video"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  unreferencedAt: integer("unreferenced_at", { mode: "timestamp_ms" }),
  committedToNote: integer("committed_to_note", { mode: "boolean" })
    .notNull()
    .default(false),
  state: text("state", { enum: ["ready", "deleting"] }).notNull(),
});
export const noteAssetReferences = sqliteTable(
  "note_asset_references",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    version: integer("version").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.assetId, t.version] }),
    index("asset_reference_pin").on(t.assetId),
  ],
);

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
export const sourceBundles = sqliteTable("source_bundles", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  sealed: integer("sealed", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
export const companionSources = sqliteTable("companion_sources", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => sourceBundles.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  path: text("path").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  bytes: integer("bytes").notNull(),
  sha256: text("sha256").notNull(),
});
export const referenceSettings = sqliteTable("reference_settings", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  activeJobId: text("active_job_id"),
  bundleId: text("bundle_id").references(() => sourceBundles.id),
  sourcePath: text("source_path"),
});
export const referenceEntries = sqliteTable(
  "reference_entries",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id),
    kind: text("kind", {
      enum: ["image", "video", "stylesheet", "background", "font"],
    }).notNull(),
    url: text("url").notNull(),
    location: text("location").notNull(),
    current: integer("current", { mode: "boolean" }).notNull(),
    state: text("state", {
      enum: [
        "acquired",
        "unattempted",
        "failed",
        "limited",
        "external",
        "cancelled",
      ],
    }).notNull(),
    reason: text("reason"),
    assetId: text("asset_id"),
    finalUrl: text("final_url"),
    bytes: integer("bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("reference_entry_note").on(t.noteId, t.current)],
);
export const referenceJobs = sqliteTable(
  "reference_jobs",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    noteVersion: integer("note_version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    attempt: integer("attempt").notNull(),
    retryOf: text("retry_of"),
    total: integer("total").notNull(),
    completed: integer("completed").notNull(),
    cancelRequested: integer("cancel_requested", { mode: "boolean" }).notNull(),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    failure: text("failure"),
  },
  (t) => [
    uniqueIndex("reference_retry_once").on(t.retryOf),
    index("reference_job_claim").on(t.state, t.leaseUntil),
    check(
      "reference_job_fields",
      sql`(${t.state}='running' AND ${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL AND ${t.failure} IS NULL) OR (${t.state}='failed' AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.failure} IS NOT NULL) OR (${t.state} IN ('queued','succeeded','cancelled') AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.failure} IS NULL)`,
    ),
  ],
);
export const referenceObjects = sqliteTable("reference_objects", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  bytes: integer("bytes").notNull(),
  state: text("state", {
    enum: ["reserved", "written", "committed", "cleaned"],
  }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

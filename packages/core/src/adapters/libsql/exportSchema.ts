import type {
  ExportAuthority,
  ExportFile,
} from "@repo/core/application/export/ports";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { notes } from "./hollowSchema";

export const exportOperations = sqliteTable(
  "export_operations",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    authority: text("authority", { mode: "json" })
      .$type<ExportAuthority>()
      .notNull(),
    format: text("format", { enum: ["html", "markdown"] }).notNull(),
    sourceIdentity: text("source_identity").notNull(),
    key: text("storage_key").notNull().unique(),
    reservedBytes: integer("reserved_bytes").notNull().default(0),
    state: text("state", {
      enum: ["preparing", "ready", "sending", "cleanup"],
    }).notNull(),
    file: text("file", { mode: "json" }).$type<ExportFile>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    generation: integer("generation").notNull().default(1),
    nextCleanupAt: integer("next_cleanup_at", {
      mode: "timestamp_ms",
    }).notNull(),
    cleanupToken: text("cleanup_token"),
    cleanupUntil: integer("cleanup_until", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("export_operation_note").on(t.noteId, t.state),
    index("export_operation_cleanup").on(t.state, t.nextCleanupAt),
    index("export_operation_expiry").on(t.expiresAt),
    check(
      "export_operation_bytes",
      sql`typeof(${t.reservedBytes})='integer' and ${t.reservedBytes}>=0 and ${t.reservedBytes}<=9007199254740991`,
    ),
    check(
      "export_operation_generation",
      sql`typeof(${t.generation})='integer' and ${t.generation}>0 and ${t.generation}<=9007199254740991`,
    ),
    check(
      "export_operation_file",
      sql`(${t.state}='preparing' and ${t.file} is null) or (${t.state} in('ready','sending') and ${t.file} is not null) or ${t.state}='cleanup'`,
    ),
  ],
);

export const exportDownloadRates = sqliteTable(
  "export_download_rates",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["browser", "note"] }).notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    attempts: integer("attempts").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.kind, t.subjectHash] }),
    index("export_rate_prune").on(t.windowStart),
    check(
      "export_rate_count",
      sql`typeof(${t.attempts})='integer' and ${t.attempts} between 1 and 30`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaceSchema";

export const workspaceDeletions = sqliteTable(
  "workspace_deletions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id),
    state: text("state", {
      enum: ["queued", "running", "succeeded"],
    }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    nextAttemptAt: integer("next_attempt_at", {
      mode: "timestamp_ms",
    }).notNull(),
    admissionCursor: text("admission_cursor"),
    admissionComplete: integer("admission_complete", { mode: "boolean" })
      .notNull()
      .default(false),
    totalNotes: integer("total_notes").notNull(),
    recoveries: integer("recoveries").notNull().default(0),
    lastFailure: text("last_failure"),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("workspace_deletion_claim").on(t.state, t.nextAttemptAt),
    check(
      "workspace_deletion_state_fields",
      sql`(${t.state}='queued' AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.completedAt} IS NULL) OR (${t.state}='running' AND ${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL AND ${t.completedAt} IS NULL) OR (${t.state}='succeeded' AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL AND ${t.completedAt} IS NOT NULL)`,
    ),
    check(
      "workspace_deletion_counts",
      sql`${t.totalNotes}>=0 AND ${t.recoveries}>=0`,
    ),
  ],
);

export const workspaceDeletionNotes = sqliteTable(
  "workspace_deletion_notes",
  {
    intentId: text("intent_id")
      .notNull()
      .references(() => workspaceDeletions.id),
    noteId: text("note_id").notNull(),
    purgeId: text("purge_id").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    primaryKey({ columns: [t.intentId, t.noteId] }),
    index("workspace_deletion_note_purge").on(t.purgeId),
  ],
);

export const workspaceDeletionReceipts = sqliteTable(
  "workspace_deletion_receipts",
  {
    accountId: text("account_id").notNull(),
    requestId: text("request_id").notNull(),
    intentId: text("intent_id")
      .notNull()
      .unique()
      .references(() => workspaceDeletions.id),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.requestId] }),
    index("workspace_deletion_receipt_age").on(t.acceptedAt),
    index("workspace_deletion_receipt_actor_page").on(
      t.accountId,
      t.acceptedAt,
      t.requestId,
    ),
  ],
);

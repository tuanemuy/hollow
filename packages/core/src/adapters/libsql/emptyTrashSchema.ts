import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const emptyTrashBatches = sqliteTable(
  "empty_trash_batches",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    phase: text("phase", {
      enum: ["prepared", "accepted", "discarded"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    total: integer("total").notNull(),
    generation: integer("generation").notNull().default(0),
    cancelRequested: integer("cancel_requested", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [index("empty_owner_history").on(t.accountId, t.phase, t.createdAt)],
);
export const emptyTrashTargets = sqliteTable(
  "empty_trash_targets",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => emptyTrashBatches.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    noteId: text("note_id"),
    operationId: text("operation_id"),
    title: text("title").notNull(),
    latestAttemptId: text("latest_attempt_id"),
    closedState: text("closed_state", {
      enum: ["succeeded", "failed", "cancelled"],
    }),
  },
  (t) => [
    primaryKey({ columns: [t.parentId, t.ordinal] }),
    index("empty_target_latest").on(t.latestAttemptId),
  ],
);
export const emptyTrashAttempts = sqliteTable(
  "empty_trash_attempts",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id")
      .notNull()
      .references(() => emptyTrashBatches.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    retryOf: text("retry_of"),
    purgeId: text("purge_id"),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    failure: text("failure"),
    recoveryBase: integer("recovery_base").notNull().default(0),
    recoveries: integer("recoveries").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("empty_attempt_target").on(t.parentId, t.ordinal, t.createdAt),
    index("empty_attempt_purge").on(t.purgeId),
  ],
);

import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const noteBatches = sqliteTable(
  "note_batches",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    requestId: text("request_id").notNull(),
    digest: text("digest").notNull(),
    source: text("source").notNull(),
    sourceWorkspaceId: text("source_workspace_id"),
    destinationWorkspaceId: text("destination_workspace_id"),
    operation: text("operation").notNull(),
    binding: text("binding"),
    retryDigest: text("retry_digest"),
    total: integer("total").notNull(),
    excluded: integer("excluded").notNull(),
    generation: integer("generation").notNull(),
    cancelRequested: integer("cancel_requested").notNull().default(0),
    lastSequence: integer("last_sequence").notNull().default(0),
    prunedThrough: integer("pruned_through").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("batch_request").on(t.actorId, t.requestId),
    index("batch_history").on(t.actorId, t.createdAt, t.id),
    index("batch_source_actor").on(t.sourceWorkspaceId, t.actorId),
    index("batch_destination_actor").on(t.destinationWorkspaceId, t.actorId),
  ],
);
export const noteBatchTargets = sqliteTable(
  "note_batch_targets",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => noteBatches.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    noteId: text("note_id").notNull(),
    latestAttemptId: text("latest_attempt_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.parentId, t.ordinal] }),
    uniqueIndex("batch_target_note").on(t.parentId, t.noteId),
    index("batch_target_note_lookup").on(t.noteId),
    index("batch_target_latest").on(t.latestAttemptId),
  ],
);
export const noteBatchAttempts = sqliteTable(
  "note_batch_attempts",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id")
      .notNull()
      .references(() => noteBatches.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    noteId: text("note_id").notNull(),
    title: text("title").notNull(),
    retryOf: text("retry_of"),
    generation: integer("generation").notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    expected: text("expected"),
    baseSequence: integer("base_sequence").notNull(),
    state: text("state").notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until"),
    failure: text("failure"),
    result: text("result"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("batch_attempt_pending").on(
      t.state,
      t.parentId,
      t.generation,
      t.ordinal,
    ),
    index("batch_attempt_note").on(t.noteId, t.state),
    index("batch_attempt_target").on(t.parentId, t.ordinal, t.createdAt),
  ],
);
export const noteBatchMoveReceipts = sqliteTable(
  "note_batch_move_receipts",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => noteBatches.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    attemptId: text("attempt_id").notNull(),
    bundleId: text("bundle_id").notNull(),
    source: text("source").notNull(),
    destination: text("destination").notNull(),
    before: text("before").notNull(),
    after: text("after").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.parentId, t.sequence] }),
    uniqueIndex("batch_receipt_attempt").on(t.attemptId),
    index("batch_receipt_bundle").on(t.parentId, t.bundleId, t.sequence),
  ],
);

import type {
  JobResultSnapshot,
  PurgeObjectOwner,
  WriteOwner,
} from "@repo/core/domain/purge/entity";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const notePurges = sqliteTable(
  "note_purges",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id").notNull().unique(),
    accountId: text("account_id").notNull(),
    operationId: text("operation_id").notNull(),
    title: text("title").notNull(),
    cause: text("cause", { enum: ["manual", "expired"] }).notNull(),
    state: text("state", {
      enum: ["queued", "running", "failed", "succeeded"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    nextAttemptAt: integer("next_attempt_at", {
      mode: "timestamp_ms",
    }).notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    completed: integer("completed").notNull().default(0),
    total: integer("total").notNull().default(0),
    failure: text("failure"),
  },
  (t) => [index("purge_claim").on(t.state, t.nextAttemptAt)],
);
export const purgeObjects = sqliteTable(
  "purge_objects",
  {
    purgeId: text("purge_id").notNull(),
    key: text("storage_key").notNull(),
    kind: text("kind").$type<PurgeObjectOwner["kind"]>().notNull(),
    ownerId: text("owner_id").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.purgeId, t.key] })],
);
export const objectWrites = sqliteTable("object_writes", {
  id: text("id").primaryKey(),
  runtime: text("runtime").notNull(),
  kind: text("kind").$type<WriteOwner["kind"]>().notNull(),
  ownerId: text("owner_id").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
export const objectWriteKeys = sqliteTable(
  "object_write_keys",
  {
    writeId: text("write_id").notNull(),
    key: text("storage_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.writeId, t.key] })],
);
export const objectDeletes = sqliteTable("object_deletes", {
  key: text("storage_key").primaryKey(),
  token: text("token").notNull(),
  writerId: text("writer_id"),
  until: integer("lease_until", { mode: "timestamp_ms" }).notNull(),
  done: integer("done", { mode: "boolean" }).notNull(),
});
export const jobSnapshots = sqliteTable("job_result_snapshots", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<JobResultSnapshot["kind"]>().notNull(),
  accountId: text("account_id").notNull(),
  batchId: text("batch_id"),
  retryOf: text("retry_of"),
  name: text("name").notNull(),
  state: text("state").$type<JobResultSnapshot["state"]>().notNull(),
  failure: text("failure"),
  attempt: integer("attempt").notNull(),
  completed: integer("completed").notNull(),
  total: integer("total").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

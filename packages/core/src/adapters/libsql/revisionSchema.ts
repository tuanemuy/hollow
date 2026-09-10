import type {
  HumanMutation,
  RevisionActor,
  RevisionCause,
  RevisionResource,
} from "@repo/core/domain/note/revision";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { notes } from "./hollowSchema";

export const revisionHeads = sqliteTable("note_revision_heads", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  currentNo: integer("current_no").notNull(),
  baseFloor: integer("base_floor").notNull(),
  actors: text("actors", { mode: "json" })
    .$type<readonly HumanMutation[]>()
    .notNull(),
});
export const noteRevisions = sqliteTable(
  "note_revisions",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    revisionNo: integer("revision_no").notNull(),
    capturedNoteVersion: integer("captured_note_version").notNull(),
    title: text("title").notNull(),
    html: text("html").notNull(),
    style: text("style", { enum: ["default", "original"] }).notNull(),
    savedAt: integer("saved_at", { mode: "timestamp_ms" }).notNull(),
    actor: text("actor", { mode: "json" }).$type<RevisionActor>().notNull(),
    cause: text("cause").$type<RevisionCause>().notNull(),
    restoredFrom: integer("restored_from"),
    originRevisionNo: integer("origin_revision_no"),
    resources: text("resources", { mode: "json" })
      .$type<readonly RevisionResource[]>()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.revisionNo] }),
    check("revision_positive", sql`${table.revisionNo} > 0`),
  ],
);

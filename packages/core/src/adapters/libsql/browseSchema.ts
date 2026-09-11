import type { ProjectionSegment } from "@repo/core/application/browse/ports";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { notes } from "./hollowSchema";

export const noteProjections = sqliteTable(
  "note_projections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    noteId: text("note_id")
      .notNull()
      .unique()
      .references(() => notes.id, { onDelete: "cascade" }),
    noteVersion: integer("note_version").notNull(),
    meaningVersion: text("meaning_version").notNull(),
    titleText: text("title_text").notNull(),
    titleKey: text("title_key").notNull(),
    titleWords: text("title_words").notNull(),
    titleSegments: text("title_segments", { mode: "json" })
      .$type<readonly ProjectionSegment[]>()
      .notNull(),
    bodyText: text("body_text").notNull(),
    bodyKey: text("body_key").notNull(),
    bodyWords: text("body_words").notNull(),
    bodySegments: text("body_segments", { mode: "json" })
      .$type<
        Readonly<{
          ranges: readonly ProjectionSegment[];
          words: readonly (readonly [string, number])[];
        }>
      >()
      .notNull(),
    tokens: text("tokens").notNull(),
    leadImage: text("lead_image"),
    mediaLabel: text("media_label"),
  },
  (t) => [index("projection_title").on(t.titleKey, t.noteId)],
);
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    scopeKey: text("scope_key").notNull(),
    name: text("name").notNull(),
    normalizedKey: text("normalized_key").notNull(),
    meaningVersion: text("meaning_version").notNull(),
  },
  (t) => [uniqueIndex("tag_scope_key").on(t.scopeKey, t.normalizedKey)],
);
export const noteTags = sqliteTable(
  "note_tags",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.tagId] }),
    index("note_tag_reverse").on(t.tagId, t.noteId),
  ],
);

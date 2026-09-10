import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaceSchema";
export const workspaceIcons = sqliteTable(
  "workspace_icons",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    actorId: text("actor_id").notNull(),
    settingsVersion: integer("settings_version").notNull(),
    inputBytes: integer("input_bytes").notNull(),
    mime: text("mime", {
      enum: ["image/png", "image/jpeg", "image/webp"],
    }).notNull(),
    storageKey: text("storage_key").notNull().unique(),
    bytes: integer("bytes").notNull(),
    state: text("state", {
      enum: ["awaiting", "processing", "writing", "ready", "cleanup"],
    }).notNull(),
    sha256: text("sha256"),
    width: integer("width"),
    height: integer("height"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    nextAttemptAt: integer("next_attempt_at", {
      mode: "timestamp_ms",
    }).notNull(),
    failure: text("failure"),
  },
  (t) => [
    index("workspace_icon_cleanup").on(t.state, t.nextAttemptAt),
    index("workspace_icon_actor").on(t.workspaceId, t.actorId, t.state),
  ],
);

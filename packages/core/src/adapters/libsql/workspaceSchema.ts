import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id"),
    name: text("name"),
    description: text("description"),
    slug: text("slug").unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    state: text("state", { enum: ["active", "deleted"] }).notNull(),
    settingsVersion: integer("settings_version").notNull().default(0),
    membershipRevision: integer("membership_revision").notNull().default(1),
    iconId: text("icon_id"),
  },
  (t) => [
    index("workspace_creator").on(t.creatorId, t.state),
    check(
      "workspace_profile_state",
      sql`(${t.state}='active' AND ${t.creatorId} IS NOT NULL AND ${t.name} IS NOT NULL AND ${t.description} IS NOT NULL AND ${t.createdAt} IS NOT NULL) OR (${t.state}='deleted' AND ${t.creatorId} IS NULL AND ${t.name} IS NULL AND ${t.description} IS NULL AND ${t.createdAt} IS NULL AND ${t.iconId} IS NULL)`,
    ),
  ],
);
export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    accountId: text("account_id").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.accountId] }),
    index("workspace_member_account").on(t.accountId, t.workspaceId),
  ],
);

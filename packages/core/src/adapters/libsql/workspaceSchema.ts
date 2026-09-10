import {
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
    creatorId: text("creator_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    slug: text("slug").unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    state: text("state", { enum: ["active", "deleted"] }).notNull(),
  },
  (t) => [index("workspace_creator").on(t.creatorId, t.state)],
);
export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    accountId: text("account_id").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.accountId] }),
    index("workspace_member_account").on(t.accountId, t.workspaceId),
  ],
);

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, notes } from "./hollowSchema";
import { workspaces } from "./workspaceSchema";

export const publicNoteIdentities = sqliteTable(
  "note_public_identities",
  {
    noteId: text("note_id")
      .primaryKey()
      .references(() => notes.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    urlGeneration: integer("url_generation").notNull(),
    accessEpoch: integer("access_epoch").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check(
      "public_identity_versions",
      sql`${t.urlGeneration}=1 and ${t.accessEpoch}>=0`,
    ),
  ],
);

export const profileIcons = sqliteTable(
  "account_profile_icons",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    sessionHash: text("session_hash").notNull(),
    profileVersion: integer("profile_version").notNull(),
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
    index("profile_icon_cleanup").on(t.state, t.nextAttemptAt),
    index("profile_icon_account").on(t.accountId, t.state),
    check(
      "profile_icon_bytes",
      sql`${t.bytes}>=0 and ${t.inputBytes}>0 and ${t.profileVersion}>=0`,
    ),
    check(
      "profile_icon_output",
      sql`${t.state} not in ('writing','ready') or (${t.sha256} is not null and ${t.width} is not null and ${t.height} is not null and ${t.width}>0 and ${t.height}>0)`,
    ),
  ],
);

export const publicProfiles = sqliteTable(
  "account_public_profiles",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    handle: text("handle"),
    bio: text("bio").notNull().default(""),
    iconId: text("icon_id").references(() => profileIcons.id, {
      onDelete: "restrict",
    }),
    version: integer("version").notNull().default(0),
  },
  (t) => [
    uniqueIndex("account_public_handle").on(t.handle),
    check("profile_version", sql`${t.version}>=0`),
  ],
);

export const workspacePublications = sqliteTable(
  "workspace_public_settings",
  {
    workspaceId: text("workspace_id")
      .primaryKey()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pagePublic: integer("page_public", { mode: "boolean" }).notNull(),
    version: integer("version").notNull(),
  },
  (t) => [
    check(
      "workspace_public_version",
      sql`${t.version}>=0 and ${t.pagePublic} in (0,1)`,
    ),
  ],
);

export const publicDiscoveryRates = sqliteTable(
  "public_discovery_rates",
  {
    kind: text("kind", { enum: ["browser", "global"] }).notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    attempts: integer("attempts").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.kind, t.subjectHash] }),
    index("public_rate_expiry").on(t.windowStart),
  ],
);

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

export const noteSharing = sqliteTable(
  "note_sharing",
  {
    noteId: text("note_id")
      .primaryKey()
      .references(() => notes.id, { onDelete: "cascade" }),
    visibility: text("visibility", { enum: ["private", "link", "public"] })
      .notNull()
      .default("private"),
    version: integer("version").notNull().default(0),
    linkGeneration: integer("link_generation").notNull().default(0),
    tokenHash: text("token_hash"),
    tokenEnvelope: text("token_envelope"),
    passwordHash: text("password_hash"),
    grantEpoch: integer("grant_epoch").notNull().default(0),
  },
  (t) => [
    uniqueIndex("note_sharing_token").on(t.tokenHash),
    check(
      "note_sharing_versions",
      sql`${t.version}>=0 and ${t.linkGeneration}>=0 and ${t.grantEpoch}>=0`,
    ),
    check(
      "note_sharing_token_fields",
      sql`(${t.linkGeneration}=0 and ${t.tokenHash} is null and ${t.tokenEnvelope} is null and ${t.passwordHash} is null and ${t.visibility}='private') or (${t.linkGeneration}>0 and ${t.tokenHash} is not null and ${t.tokenEnvelope} is not null)`,
    ),
    check(
      "note_sharing_public_password",
      sql`${t.visibility}!='public' or ${t.passwordHash} is null`,
    ),
  ],
);
export const shareGrants = sqliteTable(
  "share_grants",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    browserHash: text("browser_hash").notNull(),
    linkGeneration: integer("link_generation").notNull(),
    grantEpoch: integer("grant_epoch").notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.browserHash] }),
    index("share_grant_expiry").on(t.expiresAt),
  ],
);
export const sharePasswordRates = sqliteTable(
  "share_password_rates",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["browser", "link"] }).notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    attempts: integer("attempts").notNull(),
    blockedUntil: integer("blocked_until", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    revision: integer("revision").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.kind, t.subjectHash] }),
    index("share_rate_prune").on(t.updatedAt),
  ],
);
export const accountDisplayNames = sqliteTable("account_display_names", {
  accountId: text("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  version: integer("version").notNull(),
});

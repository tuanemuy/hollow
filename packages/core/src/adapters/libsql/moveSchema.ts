import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sourceBundles } from "./referenceSchema";

export const bundleScopeHoldings = sqliteTable(
  "bundle_scope_holdings",
  {
    bundleId: text("bundle_id")
      .notNull()
      .references(() => sourceBundles.id),
    scopeKind: text("scope_kind", {
      enum: ["personal", "workspace"],
    }).notNull(),
    scopeId: text("scope_id").notNull(),
    noteHolds: integer("note_holds").notNull().default(0),
    admissionHolds: integer("admission_holds").notNull().default(0),
    cleanupHolds: integer("cleanup_holds").notNull().default(0),
    revision: integer("revision").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.bundleId, t.scopeKind, t.scopeId] })],
);

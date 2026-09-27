import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { pdfArtifacts } from "./pdfSchema";
import { zipAttempts } from "./zipSchema";

export const zipPdfHolds = sqliteTable(
  "zip_pdf_holds",
  {
    attemptId: text("attempt_id")
      .primaryKey()
      .references(() => zipAttempts.id, { onDelete: "restrict" }),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => pdfArtifacts.id, { onDelete: "restrict" }),
    artifactGeneration: integer("artifact_generation").notNull(),
    acquiredAt: integer("acquired_at", { mode: "timestamp_ms" }).notNull(),
    state: text("state", {
      enum: ["held", "reading", "closing", "released"],
    }).notNull(),
    claimToken: text("claim_token"),
    runtimeId: text("runtime_id"),
    version: integer("version").notNull(),
  },
  (t) => [
    index("zip_pdf_hold_artifact").on(t.artifactId, t.state, t.attemptId),
    index("zip_pdf_hold_state").on(t.state, t.attemptId),
    check(
      "zip_pdf_hold_state",
      sql`${t.state} in('held','reading','closing','released')`,
    ),
    check(
      "zip_pdf_hold_claim",
      sql`(${t.claimToken} is null)=(${t.runtimeId} is null) and (${t.state} not in('held','released') or ${t.claimToken} is null) and (${t.state}!='reading' or ${t.claimToken} is not null)`,
    ),
    check(
      "zip_pdf_hold_numbers",
      sql`typeof(${t.artifactGeneration})='integer' and ${t.artifactGeneration} between 1 and 9007199254740991 and typeof(${t.version})='integer' and ${t.version} between 1 and 9007199254740991 and typeof(${t.acquiredAt})='integer' and ${t.acquiredAt} between 0 and 9007199254740991`,
    ),
  ],
);

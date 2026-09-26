import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { notes } from "./hollowSchema";
import { pdfArtifacts, pdfComputations } from "./pdfSchema";

export const pdfAnonymousRequests = sqliteTable(
  "pdf_anonymous_requests",
  {
    id: text("id").primaryKey(),
    browserHash: text("browser_hash").notNull(),
    commandId: text("command_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    targetNoteId: text("target_note_id").notNull(),
    liveNoteId: text("live_note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    sourceIdentity: text("source_identity").notNull(),
    profile: text("profile").notNull(),
    computeId: text("compute_id").references(() => pdfComputations.id, {
      onDelete: "restrict",
    }),
    artifactId: text("artifact_id").references(() => pdfArtifacts.id, {
      onDelete: "restrict",
    }),
    authorityKind: text("authority_kind", {
      enum: ["public", "link"],
    }).notNull(),
    publicId: text("public_id"),
    urlGeneration: integer("url_generation"),
    accessEpoch: integer("access_epoch"),
    tokenHash: text("token_hash"),
    linkGeneration: integer("link_generation"),
    grantEpoch: integer("grant_epoch"),
    grantVerifiedAt: integer("grant_verified_at", { mode: "timestamp_ms" }),
    grantExpiresAt: integer("grant_expires_at", { mode: "timestamp_ms" }),
    state: text("state", {
      enum: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "invalidated",
        "expired",
      ],
    }).notNull(),
    failure: text("failure"),
    version: integer("version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ticketExpiresAt: integer("ticket_expires_at", {
      mode: "timestamp_ms",
    }).notNull(),
    ticketGeneration: integer("ticket_generation").notNull(),
    ticketKid: text("ticket_kid").notNull(),
    autoDeliveryId: text("auto_delivery_id"),
  },
  (t) => [
    uniqueIndex("pdf_anonymous_request_command").on(t.browserHash, t.commandId),
    index("pdf_anonymous_request_demand").on(t.computeId, t.state, t.id),
    index("pdf_anonymous_request_note").on(t.liveNoteId, t.state, t.id),
    index("pdf_anonymous_request_expiry").on(t.ticketExpiresAt, t.id),
    index("pdf_anonymous_request_artifact").on(t.artifactId),
    check(
      "pdf_anonymous_request_state",
      sql`${t.state} in('queued','running','succeeded','failed','invalidated','expired')`,
    ),
    check(
      "pdf_anonymous_request_authority",
      sql`(${t.authorityKind}='public' and ${t.publicId} is not null and ${t.urlGeneration} is not null and ${t.urlGeneration}>0 and ${t.accessEpoch} is not null and ${t.accessEpoch}>=0 and ${t.tokenHash} is null and ${t.linkGeneration} is null and ${t.grantEpoch} is null and ${t.grantVerifiedAt} is null and ${t.grantExpiresAt} is null) or (${t.authorityKind}='link' and ${t.publicId} is null and ${t.urlGeneration} is null and ${t.accessEpoch} is null and ${t.tokenHash} is not null and ${t.linkGeneration} is not null and ${t.linkGeneration}>0 and ${t.grantEpoch} is not null and ${t.grantEpoch}>=0)`,
    ),
    check(
      "pdf_anonymous_request_grant",
      sql`(${t.grantVerifiedAt} is null and ${t.grantExpiresAt} is null) or (${t.grantVerifiedAt} is not null and ${t.grantExpiresAt} is not null and ${t.grantVerifiedAt}<=${t.createdAt} and ${t.grantExpiresAt}>${t.createdAt})`,
    ),
    check(
      "pdf_anonymous_request_live",
      sql`(${t.liveNoteId} is not null and ${t.liveNoteId}=${t.targetNoteId}) or (${t.state} in('succeeded','failed','invalidated','expired') and ${t.liveNoteId} is null)`,
    ),
    check(
      "pdf_anonymous_request_compute",
      sql`${t.state} not in('queued','running') or ${t.computeId} is not null`,
    ),
    check(
      "pdf_anonymous_request_result",
      sql`(${t.state}='succeeded' and ${t.artifactId} is not null and ${t.failure} is null) or (${t.state}='failed' and ${t.artifactId} is null and ${t.failure} is not null) or (${t.state} in('queued','running') and ${t.artifactId} is null and ${t.failure} is null) or (${t.state} in('invalidated','expired') and ${t.failure} is null)`,
    ),
    check(
      "pdf_anonymous_request_lifetime",
      sql`${t.ticketExpiresAt}=${t.createdAt}+600000`,
    ),
    check(
      "pdf_anonymous_request_version",
      sql`typeof(${t.version})='integer' and ${t.version} between 1 and 9007199254740991 and typeof(${t.ticketGeneration})='integer' and ${t.ticketGeneration} between 1 and 9007199254740991`,
    ),
  ],
);

export const pdfAnonymousDeliveries = sqliteTable(
  "pdf_anonymous_deliveries",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => pdfAnonymousRequests.id, { onDelete: "restrict" }),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => pdfArtifacts.id, { onDelete: "restrict" }),
    state: text("state", {
      enum: ["ready", "sending", "closing", "closed"],
    }).notNull(),
    generation: integer("generation").notNull(),
    claimToken: text("claim_token"),
    runtimeId: text("runtime_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    nextCleanupAt: integer("next_cleanup_at", {
      mode: "timestamp_ms",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("pdf_anonymous_delivery_request_active")
      .on(t.requestId)
      .where(sql`${t.state}!='closed'`),
    index("pdf_anonymous_delivery_artifact").on(t.artifactId, t.state),
    index("pdf_anonymous_delivery_cleanup").on(t.state, t.nextCleanupAt, t.id),
    check(
      "pdf_anonymous_delivery_state",
      sql`${t.state} in('ready','sending','closing','closed')`,
    ),
    check(
      "pdf_anonymous_delivery_owner",
      sql`(${t.state} in('ready','closed') and ${t.claimToken} is null and ${t.runtimeId} is null) or (${t.state} in('sending','closing') and ${t.claimToken} is not null and ${t.runtimeId} is not null)`,
    ),
    check(
      "pdf_anonymous_delivery_lifetime",
      sql`${t.expiresAt}>${t.createdAt} and ${t.expiresAt}<=${t.createdAt}+120000`,
    ),
    check(
      "pdf_anonymous_delivery_generation",
      sql`typeof(${t.generation})='integer' and ${t.generation} between 1 and 9007199254740991`,
    ),
  ],
);

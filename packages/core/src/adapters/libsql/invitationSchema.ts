import type {
  DeliveryState,
  InvitationDeliverySnapshot,
  InvitationState,
} from "@repo/core/domain/workspace/invitation";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
export const invitations = sqliteTable(
  "workspace_invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    issuerId: text("issuer_id").notNull(),
    generation: integer("generation").notNull(),
    tokenHash: text("token_hash").unique(),
    envelope: text("envelope"),
    deliverySnapshot: text("delivery_snapshot", {
      mode: "json",
    }).$type<InvitationDeliverySnapshot>(),
    state: text("state").$type<InvitationState>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    terminalAt: integer("terminal_at", { mode: "timestamp_ms" }),
    acceptedBy: text("accepted_by"),
    deliveryState: text("delivery_state").$type<DeliveryState>().notNull(),
    attempts: integer("attempts").notNull(),
    firstAttemptAt: integer("first_attempt_at", { mode: "timestamp_ms" }),
    nextAttemptAt: integer("next_attempt_at", {
      mode: "timestamp_ms",
    }).notNull(),
    leaseToken: text("lease_token"),
    leaseUntil: integer("lease_until", { mode: "timestamp_ms" }),
    deliveryFailure: text("delivery_failure"),
  },
  (t) => [
    index("invitation_workspace").on(t.workspaceId, t.id),
    index("invitation_recipient").on(t.workspaceId, t.email),
    index("invitation_issuer").on(t.workspaceId, t.issuerId, t.state),
    index("invitation_due").on(t.state, t.nextAttemptAt),
    index("invitation_expiry").on(t.expiresAt),
  ],
);
export const invitationHistory = sqliteTable(
  "invitation_history",
  {
    id: text("id").notNull(),
    generation: integer("generation").notNull(),
    workspaceId: text("workspace_id").notNull(),
    state: text("state").notNull(),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull(),
    terminalAt: integer("terminal_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.generation] }),
    index("invitation_history_expiry").on(t.terminalAt),
  ],
);
export const invitationReceipts = sqliteTable(
  "invitation_receipts",
  {
    actorId: text("actor_id").notNull(),
    requestId: text("request_id").notNull(),
    digest: text("digest").notNull(),
    ids: text("ids", { mode: "json" }).$type<readonly string[]>().notNull(),
    skipped: integer("skipped").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.actorId, t.requestId] })],
);
export const invitationRates = sqliteTable(
  "invitation_rates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("invitation_rate_workspace").on(t.workspaceId, t.createdAt),
    index("invitation_rate_actor").on(t.actorId, t.createdAt),
  ],
);
export const authContinuations = sqliteTable(
  "auth_continuations",
  {
    id: text("id").primaryKey(),
    browserHash: text("browser_hash").notNull(),
    invitationId: text("invitation_id").notNull(),
    generation: integer("generation").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("continuation_expiry").on(t.expiresAt)],
);

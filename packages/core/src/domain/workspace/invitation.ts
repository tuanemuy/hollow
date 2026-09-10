import { accountEmail } from "../account/entity";
import { BusinessRuleError } from "../error";
import type { WorkspaceRole } from "./entity";

export const INVITATION_LIFETIME = 14 * 86400_000;
export const CONTINUATION_LIFETIME = 86400_000;
export const INVITATION_RETENTION = 90 * 86400_000;
export const DELIVERY_DELAYS = [
  60_000, 300_000, 900_000, 3600_000, 14400_000,
] as const;
export type InvitationState =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "issuer_lost"
  | "expired";
export type DeliveryState =
  | "pending"
  | "running"
  | "sent"
  | "failed"
  | "configuration"
  | "stopped";
export type InvitationDeliverySnapshot = Readonly<{
  to: string;
  subject: string;
  beforeToken: string;
  afterToken: string;
}>;
export type Invitation = Readonly<{
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  issuerId: string;
  generation: number;
  tokenHash: string | null;
  envelope: string | null;
  deliverySnapshot: InvitationDeliverySnapshot | null;
  state: InvitationState;
  createdAt: Date;
  issuedAt: Date;
  expiresAt: Date;
  terminalAt: Date | null;
  acceptedBy: string | null;
  deliveryState: DeliveryState;
  attempts: number;
  firstAttemptAt: Date | null;
  nextAttemptAt: Date;
  leaseToken: string | null;
  leaseUntil: Date | null;
  deliveryFailure: string | null;
}>;
export type InvitationReceipt = Readonly<{
  actorId: string;
  requestId: string;
  digest: string;
  ids: readonly string[];
  skipped: number;
  expiresAt: Date;
}>;
export type AuthContinuation = Readonly<{
  id: string;
  browserHash: string;
  invitationId: string;
  generation: number;
  createdAt: Date;
  expiresAt: Date;
}>;
export function invitationRecipients(values: readonly string[]) {
  if (values.length < 1 || values.length > 10)
    throw new BusinessRuleError(
      "INVITATION_RECIPIENTS",
      "一度に招待できる宛先は1〜10件です。",
    );
  return [...new Set(values.map(accountEmail))].sort();
}
export function invitationActive(row: Invitation, now: Date) {
  return (
    row.state === "pending" && row.expiresAt > now && row.tokenHash !== null
  );
}
export function terminalInvitation(
  row: Invitation,
  state: Exclude<InvitationState, "pending">,
  now: Date,
  acceptedBy: string | null = null,
): Invitation {
  return {
    ...row,
    state,
    terminalAt: now,
    acceptedBy,
    tokenHash: null,
    envelope: null,
    deliverySnapshot: null,
    deliveryState: "stopped",
    leaseToken: null,
    leaseUntil: null,
    deliveryFailure: null,
  };
}

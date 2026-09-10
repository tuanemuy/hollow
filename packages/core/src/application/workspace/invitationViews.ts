import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import type {
  DeliveryState,
  InvitationState,
} from "@repo/core/domain/workspace/invitation";
export type InvitationSelection = Readonly<{ id: string; generation: number }>;
export type InvitationView = Readonly<{
  id: string;
  email: string;
  role: WorkspaceRole;
  generation: number;
  state: InvitationState;
  issuedAt: string;
  expiresAt: string;
  deliveryState: DeliveryState;
  attempts: number;
  failure: string | null;
  canCopy: boolean;
  canResend: boolean;
}>;
export type MemberView = Readonly<{
  accountId: string;
  email: string;
  displayName: string | null;
  role: WorkspaceRole;
  joinedAt: string | null;
}>;
export type WorkspaceSettingsView = Readonly<{
  iconId: string | null;
  id: string;
  name: string;
  description: string;
  slug: string | null;
  settingsVersion: number;
  role: WorkspaceRole;
  accountId: string;
  ownerCount: number;
  members: readonly MemberView[];
  nextCursor: string | null;
}>;
export type InvitationLandingView = Readonly<{
  iconId: string | null;
  id: string;
  generation: number;
  workspaceId: string;
  name: string;
  description: string;
  role: WorkspaceRole;
  issuer: string;
  expiresAt: string;
  status: "pending" | "joined";
  signedIn: boolean;
  emailMatches: boolean;
  accountEmail: string | null;
}>;

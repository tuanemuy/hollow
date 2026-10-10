import type { Account } from "./entity";

export type StoredAccount =
  | Readonly<{ kind: "active"; account: Account }>
  | Readonly<{
      kind: "deleted";
      id: string;
      authVersion: number;
      deletionId: string;
    }>;

export type AccountIdentityState =
  | Readonly<{ kind: "active"; id: string; authVersion: number }>
  | Readonly<{ kind: "deleted"; id: string; deletionId: string }>
  | Readonly<{ kind: "missing" }>;

export const ACCOUNT_DELETION_PAGE_SIZE = 25;
export const ACCOUNT_DELETION_LEASE_MS = 30_000;

export type DriveAcknowledgmentTarget = Readonly<{
  kind: "authorization" | "control" | "backup";
  id: string;
  runtimeGeneration: string;
  ownerToken: string;
}>;
export type DriveAcknowledgment = DriveAcknowledgmentTarget &
  Readonly<{ evidenceId: string }>;

export const accountDeletionTables = [
  "personal-notes",
  "uploads",
  "media-drafts",
  "profile-icons",
  "exports",
  "source-attempts",
  "source-bindings",
  "drive-attempts",
  "drive-controls",
  "drive-transfers",
  "drive-heads",
  "drive-jobs",
  "drive-targets",
  "drive-records",
  "google-attempts",
  "auth-challenges",
  "email-verifications",
  "google-identities",
  "openrouter-attempts",
  "openrouter-connection",
  "drive-connection",
  "profile",
  "credential-origins",
  "credential-uses",
  "drive-acknowledgments",
  "verify",
] as const;
export type AccountDeletionTable = (typeof accountDeletionTables)[number];
export type AccountDeletionCursor = Readonly<{
  table: AccountDeletionTable;
  afterId: string | null;
}>;
export type AccountDeletionIntent = Readonly<{
  id: string;
  accountId: string;
  fenceAuthVersion: number;
  acceptedAt: Date;
  version: number;
  cursor: AccountDeletionCursor;
  nextAttemptAt: Date;
}> &
  (
    | Readonly<{
        state: "queued" | "waiting-owner" | "succeeded";
        leaseToken: null;
        leaseUntil: null;
      }>
    | Readonly<{ state: "running"; leaseToken: string; leaseUntil: Date }>
  );

export type AccountDeletionDebt = Readonly<{
  intentId: string;
  kind:
    | "source-attempt"
    | "input"
    | "drive-attempt"
    | "drive-control"
    | "drive-transfer"
    | "object-write"
    | "purge";
  ownerId: string;
  locator: string;
}>;

export type CredentialAuthority =
  | Readonly<{
      kind: "account";
      accountId: string;
      authVersion: number;
      browserHash: string;
      browserEpoch: number;
    }>
  | Readonly<{
      kind: "unresolved-google";
      accountId: null;
      authVersion: null;
      browserHash: string;
      browserEpoch: number;
    }>;
export type CredentialUseBinding =
  | Readonly<{
      provider: "google";
      operation: "callback";
      source: Readonly<{ kind: "google-attempt"; id: string; version: number }>;
      authority: CredentialAuthority;
    }>
  | Readonly<{
      provider: "openrouter";
      operation: "callback" | "retry";
      source: Readonly<{
        kind: "openrouter-attempt";
        id: string;
        version: number;
      }>;
      authority: Extract<CredentialAuthority, { kind: "account" }>;
    }>
  | Readonly<{
      provider: "openrouter";
      operation: "check";
      source: Readonly<{
        kind: "openrouter-connection";
        id: string;
        version: number;
        epoch: number;
      }>;
      authority: Extract<CredentialAuthority, { kind: "account" }>;
    }>;
export type CredentialUseTarget = Readonly<{
  id: string;
  binding: CredentialUseBinding;
  owner: Readonly<{ runtimeId: string; token: string; generation: number }>;
}>;
export type CredentialUse = Readonly<{
  target: CredentialUseTarget;
  version: number;
}> &
  (
    | Readonly<{
        state: "active" | "unknown";
        callerEnded: false;
        acknowledged: false;
        evidenceId: null;
      }>
    | Readonly<{
        state: "closed";
        callerEnded: true;
        acknowledged: boolean;
        evidenceId: string;
      }>
  );
export function credentialUseKey(target: CredentialUseTarget): string {
  const { binding, owner } = target;
  const { source, authority } = binding;
  return JSON.stringify([
    target.id,
    binding.provider,
    binding.operation,
    source.kind,
    source.id,
    source.version,
    source.kind === "openrouter-connection" ? source.epoch : null,
    authority.kind,
    authority.accountId,
    authority.authVersion,
    authority.browserHash,
    authority.browserEpoch,
    owner.runtimeId,
    owner.token,
    owner.generation,
  ]);
}

import type {
  DriveCredential,
  DriveFailure,
  DriveFolder,
  DriveOwner,
} from "@repo/core/domain/integration/drive";

export type DriveSecretBinding =
  | Readonly<{
      purpose: "verifier" | "candidate" | "folder-confirmation";
      accountId: string;
      attemptId: string;
      browserHash: string;
      browserEpoch: number;
    }>
  | Readonly<{
      purpose: "credential";
      accountId: string;
      subject: string;
      epoch: number;
      credentialVersion: number;
    }>
  | Readonly<{
      purpose: "resource-key";
      accountId: string;
      subject: string;
      epoch: number;
      fileId: string;
    }>;
export interface DriveSecretProtector {
  available(): boolean;
  protect(value: string, binding: DriveSecretBinding): string;
  reveal(envelope: string, binding: DriveSecretBinding): string;
}
export type DriveTokenSet = Readonly<{
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  scope: string | null;
  accessExpiresAt: Date;
}>;
export interface DriveAuthorization {
  authorization(
    input: Readonly<{
      state: string;
      nonce: string;
      verifier: string;
      loginHint: string | null;
      consent: boolean;
      chooseAccount: boolean;
    }>,
  ): Promise<string>;
  exchange(
    input: Readonly<{ code: string; verifier: string; signal: AbortSignal }>,
  ): Promise<DriveTokenSet>;
  verifyCandidate(
    input: Readonly<{
      tokens: DriveTokenSet;
      nonceHash: string;
      signal: AbortSignal;
    }>,
  ): Promise<
    Readonly<{
      subject: string;
      email: string | null;
      scopes: readonly string[];
    }>
  >;
  refresh(
    input: Readonly<{ refreshToken: string; signal: AbortSignal }>,
  ): Promise<DriveTokenSet>;
}
export type DriveFolderObservation =
  | Readonly<{
      kind: "usable";
      folder: Omit<DriveFolder, "resourceKeyEnvelope" | "checkedAt">;
      resourceKey: string | null;
      parents: readonly string[];
      marker: string | null;
    }>
  | Readonly<{
      kind: "shortcut";
      targetId: string;
      targetResourceKey: string | null;
    }>
  | Readonly<{ kind: "trashed"; explicitly: boolean }>
  | Readonly<{
      kind: "access-denied" | "unavailable-ambiguous" | "invalid-metadata";
    }>
  | Readonly<{ kind: "transient"; reason: "rate" | "provider" | "network" }>;
export interface DriveFolderProvider {
  generateFolderId(
    input: Readonly<{ accessToken: string; signal: AbortSignal }>,
  ): Promise<string>;
  inspectFolder(
    input: Readonly<{
      accessToken: string;
      fileId: string;
      resourceKey: string | null;
      signal: AbortSignal;
    }>,
  ): Promise<DriveFolderObservation>;
  createFolder(
    input: Readonly<{
      accessToken: string;
      fileId: string;
      marker: string;
      signal: AbortSignal;
    }>,
  ): Promise<Readonly<{ kind: "created" | "conflict" }>>;
}
export type DriveOwnedResult<T> =
  | Readonly<{ kind: "value"; value: T }>
  | Readonly<{
      kind: "failure";
      code: DriveFailure;
      delivery: "not-sent" | "unknown";
      credentialRejection: null | "access-token" | "refresh-token";
    }>;
export type DriveExecutionTarget = Readonly<{
  kind: "authorization" | "control";
  id: string;
  owner: Readonly<{ runtimeGeneration: string; token: string }>;
}>;
export type DriveClosedProof = Readonly<{
  target: DriveExecutionTarget;
  evidenceId: string;
  source: "local-close" | "predecessor-exit";
}>;
export type DriveClosureState =
  | Readonly<{ kind: "unproven" | "held" }>
  | Readonly<{ kind: "closed"; proof: DriveClosedProof }>;
export type DrivePredecessorProof = Readonly<{
  runtimeGeneration: string;
  evidenceId: string;
}>;
export interface DriveExecution {
  accepting(): boolean;
  hasPendingCallers(): boolean;
  withCaller<C, T>(
    target: DriveExecutionTarget,
    claim: () => Promise<C | null>,
    settle: (claimed: C) => Promise<T>,
  ): Promise<
    Readonly<{ kind: "not-claimed" }> | Readonly<{ kind: "settled"; value: T }>
  >;
  caller(target: DriveExecutionTarget): "pending" | "ended" | "untracked";
  coordinate<T>(
    phase: "claim" | "settle" | "maintenance",
    work: () => Promise<T>,
  ): Promise<T>;
  abort(owner: DriveOwner & { state: "active" | "unknown" }): void;
  run<T>(
    target: DriveExecutionTarget,
    work: (signal: AbortSignal) => Promise<T>,
  ): Readonly<{
    result: Promise<DriveOwnedResult<T>>;
    closed: Promise<void>;
    abort(): void;
  }>;
  closure(target: DriveExecutionTarget): DriveClosureState;
  unacknowledged(limit: number): readonly DriveClosedProof[];
  acknowledge(proof: DriveClosedProof): Promise<void>;
  predecessors(): readonly DrivePredecessorProof[];
  acknowledgePredecessor(proof: DrivePredecessorProof): Promise<void>;
  stop(): Promise<void>;
}
export type DriveServices = Readonly<{
  runtimeGeneration: string;
  picker: Readonly<{ appId: string; apiKey: string }>;
  protector: DriveSecretProtector;
  authorization: DriveAuthorization;
  folders: DriveFolderProvider;
  execution: DriveExecution;
  wake(): void;
}>;
export type DriveVerifiedCandidate = Readonly<{
  credential: DriveCredential;
  expectedEpoch: number;
  expectedSettingsVersion: number;
}>;

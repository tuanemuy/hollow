import type {
  AccountDeletionIntent,
  CredentialUse,
  CredentialUseTarget,
  DriveAcknowledgment,
  DriveAcknowledgmentTarget,
} from "../deletion";

export type AccountDeletionResource = Readonly<{
  kind: "import-upload" | "media-upload" | "asset" | "profile-icon";
  id: string;
  keys: readonly string[];
}>;

export interface AccountDeletionRepository {
  saveDriveAcknowledgment(value: DriveAcknowledgment): Promise<boolean>;
  driveAcknowledgment(value: DriveAcknowledgment): Promise<boolean>;
  pendingDriveAcknowledgments(
    predecessorGenerations: readonly string[],
  ): Promise<readonly DriveAcknowledgmentTarget[]>;
  accept(
    input: Readonly<{
      id: string;
      accountId: string;
      expectedAuthVersion: number;
      now: Date;
    }>,
  ): Promise<void>;
  find(id: string): Promise<AccountDeletionIntent | null>;
  claim(
    now: Date,
    token: string,
    until: Date,
  ): Promise<AccountDeletionIntent | null>;
  ownsPersonalNote(intentId: string, noteId: string): Promise<boolean>;
  personalNotes(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<readonly string[]>;
  linkPurge(intentId: string, noteId: string, purgeId: string): Promise<void>;
  resources(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<readonly AccountDeletionResource[]>;
  resourceReady(
    intent: AccountDeletionIntent,
    resource: AccountDeletionResource,
    now: Date,
  ): Promise<boolean>;
  completeResource(
    intent: AccountDeletionIntent,
    resource: AccountDeletionResource,
    deleted: readonly Readonly<{ key: string; token: string }>[],
    now: Date,
  ): Promise<boolean>;
  beginCredentialUse(target: CredentialUseTarget): Promise<void>;
  saveCredentialOrigin(target: CredentialUseTarget): Promise<boolean>;
  adoptGoogleCredentials(
    input: Readonly<{
      attemptId: string;
      expectedVersion: number;
      accountId: string;
    }>,
  ): Promise<void>;
  credentialUse(id: string): Promise<CredentialUse | null>;
  saveCredentialClosure(
    target: CredentialUseTarget,
    evidenceId: string,
    expectedVersion: number,
  ): Promise<boolean>;
  markCredentialUnknown(
    target: CredentialUseTarget,
    expectedVersion: number,
  ): Promise<boolean>;
  acknowledgeCredentialUse(
    target: CredentialUseTarget,
    evidenceId: string,
    expectedVersion: number,
  ): Promise<boolean>;
  pendingCredentialUses(
    provider: CredentialUseTarget["binding"]["provider"],
    afterId: string | null,
    runtimeIds: readonly string[],
  ): Promise<readonly CredentialUse[]>;
  credentialRuntimeIds(
    provider: CredentialUseTarget["binding"]["provider"],
    runtimeIds: readonly string[],
  ): Promise<readonly string[]>;
  step(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<
    Readonly<{ progressed: number; blocked: number; finished: boolean }>
  >;
  release(
    id: string,
    token: string,
    now: Date,
    failureCode: "step-failed" | null,
  ): Promise<void>;
}

export const WORKSPACE_DELETION_LEASE_MS = 60_000;
export const WORKSPACE_DELETION_STEP_SIZE = 50;
export const WORKSPACE_DELETION_RECEIPT_MS = 90 * 24 * 60 * 60 * 1000;

export type WorkspaceDeletionIntent = Readonly<{
  id: string;
  workspaceId: string;
  acceptedAt: Date;
  updatedAt: Date;
  nextAttemptAt: Date;
  admissionCursor: string | null;
  admissionComplete: boolean;
  totalNotes: number;
  recoveries: number;
  lastFailure: string | null;
}> &
  (
    | Readonly<{
        state: "queued";
        leaseToken: null;
        leaseUntil: null;
        completedAt: null;
      }>
    | Readonly<{
        state: "running";
        leaseToken: string;
        leaseUntil: Date;
        completedAt: null;
      }>
    | Readonly<{
        state: "succeeded";
        leaseToken: null;
        leaseUntil: null;
        completedAt: Date;
      }>
  );
export type WorkspaceDeletionReceipt = Readonly<{
  accountId: string;
  requestId: string;
  intentId: string;
  workspaceId: string;
  name: string;
  acceptedAt: Date;
}>;

export type WorkspaceDeletionResult = Readonly<{
  requestId: string;
  name: string;
  acceptedAt: string;
  state: "reclaiming" | "succeeded";
  totalNotes: number;
  completedNotes: number;
  completedAt: string | null;
  delayed: boolean;
}>;

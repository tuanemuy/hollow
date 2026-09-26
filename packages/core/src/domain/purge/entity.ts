export type WriteOwner = Readonly<{
  kind:
    | "import-upload"
    | "media-upload"
    | "reference-job"
    | "conversion-job"
    | "export-operation"
    | "pdf-artifact"
    | "pdf-delivery"
    | "pdf-anonymous-delivery"
    | "profile-icon-upload"
    | "icon-upload";
  id: string;
}>;
export type PurgeObjectOwner = Readonly<{
  kind:
    | "original"
    | "asset"
    | "media-upload"
    | "reference-object"
    | "companion"
    | "pdf-artifact"
    | "export-operation";
  id: string;
}>;
export type PurgeIntent = Readonly<{
  id: string;
  noteId: string;
  workspaceId?: string | null;
  operationId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  nextAttemptAt: Date;
  completed: number;
  total: number;
  recoveries: number;
}> &
  (
    | Readonly<{ cause: "manual"; accountId: string }>
    | Readonly<{ cause: "expired"; accountId: string | null }>
    | Readonly<{
        cause: "workspace-deletion";
        accountId: null;
        workspaceDeletionId: string;
        workspaceId: string;
      }>
  ) &
  (
    | Readonly<{
        state: "queued" | "succeeded";
        leaseToken: null;
        leaseUntil: null;
        failure: null;
      }>
    | Readonly<{
        state: "running";
        leaseToken: string;
        leaseUntil: Date;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        leaseToken: null;
        leaseUntil: null;
        failure: string;
      }>
  );
export type PurgeInitiator =
  | Readonly<{ kind: "system" }>
  | Readonly<{ kind: "user"; accountId: string }>;
export function purgeInitiator(
  p: Pick<PurgeIntent, "cause" | "accountId">,
): PurgeInitiator {
  if (p.cause !== "manual") return { kind: "system" };
  if (!p.accountId) throw new Error("Manual purge requires a user");
  return { kind: "user", accountId: p.accountId };
}
export type PurgeObject = Readonly<{
  purgeId: string;
  key: string;
  owner: PurgeObjectOwner;
  done: boolean;
}>;
export type JobResultSnapshot = Readonly<{
  id: string;
  kind: "conversion" | "reference";
  accountId: string;
  batchId: string | null;
  retryOf: string | null;
  name: string;
  state: "succeeded" | "failed" | "cancelled";
  failure: string | null;
  attempt: number;
  completed: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type WriteOwner = Readonly<{
  kind: "import-upload" | "media-upload" | "reference-job" | "conversion-job";
  id: string;
}>;
export type PurgeObjectOwner = Readonly<{
  kind:
    | "original"
    | "asset"
    | "media-upload"
    | "reference-object"
    | "companion";
  id: string;
}>;
export type PurgeIntent = Readonly<{
  id: string;
  noteId: string;
  accountId: string;
  operationId: string;
  title: string;
  cause: "manual" | "expired";
  createdAt: Date;
  updatedAt: Date;
  nextAttemptAt: Date;
  completed: number;
  total: number;
}> &
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

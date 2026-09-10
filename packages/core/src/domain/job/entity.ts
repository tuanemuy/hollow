type JobBase = Readonly<{
  id: string;
  batchId: string;
  originalId: string;
  accountId: string;
  noteId: string;
  noteVersion: number;
  useAi: boolean;
  createdAt: Date;
  updatedAt: Date;
  attempt: number;
  retryOf: string | null;
}>;
export type ConversionJob = JobBase &
  (
    | Readonly<{
        state: "queued";
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
        state: "succeeded" | "cancelled";
        leaseToken: null;
        leaseUntil: null;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        leaseToken: null;
        leaseUntil: null;
        failure: string;
      }>
  );
export type JobTerminal = "succeeded" | "failed" | "cancelled";

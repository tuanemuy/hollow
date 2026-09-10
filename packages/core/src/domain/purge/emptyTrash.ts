export type EmptyJobState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";
export type EmptyCounts = Readonly<{
  total: number;
  waiting: number;
  active: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  expired: number;
  retryable: number;
}>;
export function emptyJobState(
  counts: EmptyCounts,
  cancelled: boolean,
): EmptyJobState {
  if (counts.waiting || counts.active)
    return counts.waiting === counts.total ? "queued" : "running";
  if (cancelled) return "cancelled";
  if (counts.failed) return "failed";
  return "succeeded";
}
export type EmptyHeader = Readonly<{
  id: string;
  accountId: string;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
  total: number;
  generation: number;
  cancelRequested: boolean;
}> &
  (
    | Readonly<{ phase: "prepared" | "discarded"; acceptedAt: null }>
    | Readonly<{ phase: "accepted"; acceptedAt: Date }>
  );
export type EmptyAttempt = Readonly<{
  id: string;
  parentId: string;
  ordinal: number;
  retryOf: string | null;
  purgeId: string | null;
  recoveryBase: number;
  recoveries: number;
  createdAt: Date;
  updatedAt: Date;
}> &
  (
    | Readonly<{ state: Exclude<EmptyJobState, "failed">; failure: null }>
    | Readonly<{ state: "failed"; failure: string }>
  );
export type EmptyTarget = Readonly<{
  parentId: string;
  ordinal: number;
  noteId: string | null;
  operationId: string | null;
  title: string;
  closedState: "succeeded" | "failed" | "cancelled" | null;
  latest: EmptyAttempt | null;
}>;
export type EmptySummary = Readonly<{
  header: EmptyHeader;
  counts: EmptyCounts;
  state: EmptyJobState;
}>;
export type EmptyCursor = Readonly<{ at: Date; id: string }>;

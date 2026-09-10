import type {
  EmptyAttempt,
  EmptyCursor,
  EmptyHeader,
  EmptySummary,
  EmptyTarget,
} from "../emptyTrash";

export interface EmptyTrashRepository {
  prepare(
    id: string,
    accountId: string,
    now: Date,
    expires: Date,
    workspaceId?: string,
  ): Promise<EmptyHeader | null>;
  find(id: string): Promise<EmptyHeader | null>;
  accept(id: string, now: Date): Promise<void>;
  discard(id: string, now: Date): Promise<void>;
  pending(limit: number): Promise<
    readonly {
      parentId: string;
      ordinal: number;
      generation: number;
      attemptId: string | null;
    }[]
  >;
  target(id: string, ordinal: number): Promise<EmptyTarget | null>;
  saveAttempt(attempt: EmptyAttempt): Promise<void>;
  cancel(id: string, generation: number, now: Date): Promise<void>;
  retry(
    id: string,
    generation: number,
    ordinal: number | undefined,
    idPrefix: string,
    now: Date,
  ): Promise<number>;
  summary(id: string): Promise<EmptySummary | null>;
  read(
    id: string,
    accountId: string,
    since: Date,
  ): Promise<EmptySummary | null>;
  page(
    accountId: string,
    scope: "unfinished" | "completed",
    before: EmptyCursor | undefined,
    since: Date,
    limit: number,
  ): Promise<readonly EmptySummary[]>;
  activity(
    accountId: string,
    since: Date,
  ): Promise<{
    unfinished: number;
    active: number;
    failed: number;
    representative: string | null;
  }>;
  children(
    id: string,
    after: number,
    since: Date,
    limit: number,
  ): Promise<readonly EmptyTarget[]>;
  attempts(
    id: string,
    ordinal: number,
    before: EmptyCursor | undefined,
    since: Date,
    limit: number,
  ): Promise<readonly EmptyAttempt[]>;
  reconcile(limit: number): Promise<void>;
  prune(before: Date, now: Date, limit: number): Promise<void>;
}

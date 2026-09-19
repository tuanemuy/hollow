import type {
  BatchOperation,
  BatchOutcome,
  BatchState,
} from "../../domain/batch/entity";
import type { NoteOwner } from "../../domain/note/entity";
import type { MoveExpected, MovePreview } from "../move/ports";

export type BatchExpected =
  | Readonly<{ kind: "tag" }>
  | Readonly<{
      kind: "trash";
      version: number;
      hasRunningJobs: boolean;
      processingFingerprint: string;
    }>
  | Readonly<{ kind: "move"; move: MoveExpected }>;
export type BatchPreviewItem =
  | Readonly<{ kind: "excluded"; noteId: string }>
  | Readonly<{
      kind: "ready";
      noteId: string;
      title: string;
      expected: BatchExpected;
      move: MovePreview | null;
      latestAttemptId: string | null;
      baseSequence: number;
    }>;
export type BatchPreviewInput = Readonly<{
  ids: readonly string[];
  source: NoteOwner;
  operation: BatchOperation;
  parentId?: string | undefined;
}>;
export type BatchConfirmation =
  | Extract<BatchPreviewItem, { kind: "excluded" }>
  | Omit<Extract<BatchPreviewItem, { kind: "ready" }>, "move">;
export type BatchAcceptInput = Readonly<{
  requestId: string;
  source: NoteOwner;
  operation: BatchOperation;
  items: readonly BatchConfirmation[];
}>;
export type BatchHeader = Readonly<{
  id: string;
  actorId: string;
  requestId: string;
  digest: string;
  source: NoteOwner;
  operation: BatchOperation;
  binding: string | null;
  retryDigest: string | null;
  total: number;
  excluded: number;
  generation: number;
  cancelRequested: boolean;
  lastSequence: number;
  prunedThrough: number;
  createdAt: Date;
  updatedAt: Date;
}>;
export type BatchAttempt = Readonly<{
  id: string;
  parentId: string;
  ordinal: number;
  noteId: string;
  title: string;
  retryOf: string | null;
  generation: number;
  attemptNumber: number;
  expected: BatchExpected | null;
  baseSequence: number;
  state: BatchState;
  leaseToken: string | null;
  leaseUntil: Date | null;
  failure: Readonly<{ code: string; message: string }> | null;
  result: Readonly<{ noteId: string; holdingSequence: number | null }> | null;
  createdAt: Date;
  updatedAt: Date;
}>;
export type MoveReceipt = Readonly<{
  parentId: string;
  sequence: number;
  attemptId: string;
  bundleId: string;
  source: NoteOwner;
  destination: NoteOwner;
  before: NonNullable<MoveExpected["bundle"]>;
  after: NonNullable<MoveExpected["bundle"]>;
  createdAt: Date;
}>;
export type BatchSummary = Readonly<{
  header: BatchHeader;
  state: BatchState;
  counts: Readonly<Record<BatchState, number>>;
}>;
export type BatchView = Readonly<{
  id: string;
  kind: BatchOperation["kind"];
  state: BatchState;
  total: number;
  excluded: number;
  generation: number;
  createdAt: string;
  updatedAt: string;
  counts: Readonly<Record<BatchState, number>>;
}>;
export interface BatchRepository {
  accept(header: BatchHeader, attempts: readonly BatchAttempt[]): Promise<void>;
  byRequest(actorId: string, requestId: string): Promise<BatchHeader | null>;
  find(id: string): Promise<BatchHeader | null>;
  attempt(id: string): Promise<BatchAttempt | null>;
  children(
    id: string,
    after: number,
    limit: number,
  ): Promise<readonly BatchAttempt[]>;
  claim(now: Date, token: string, until: Date): Promise<BatchAttempt | null>;
  finish(
    id: string,
    token: string,
    outcome: BatchOutcome,
    now: Date,
  ): Promise<boolean>;
  bindTag(id: string, tagId: string): Promise<void>;
  recordReceipt(receipt: MoveReceipt): Promise<void>;
  receipts(id: string, after: number): Promise<readonly MoveReceipt[]>;
  cancel(id: string, generation: number, now: Date): Promise<void>;
  cancelNote(noteId: string, now: Date, exceptAttempt?: string): Promise<void>;
  cancelScopeActor(scopeId: string, actorId: string, now: Date): Promise<void>;
  retry(
    header: BatchHeader,
    attempts: readonly BatchAttempt[],
    now: Date,
    digest: string,
  ): Promise<void>;
  summary(id: string): Promise<BatchSummary | null>;
  page(
    actorId: string,
    scope: "unfinished" | "completed",
    before: { at: Date; id: string } | undefined,
    since: Date,
  ): Promise<readonly BatchSummary[]>;
  activity(
    actorId: string,
    since: Date,
  ): Promise<Readonly<{ active: number; failed: number }>>;
  recover(now: Date): Promise<void>;
  prune(before: Date, limit: number): Promise<void>;
}

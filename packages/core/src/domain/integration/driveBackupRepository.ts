import type {
  DriveBackupJob,
  DriveBackupRecord,
  DriveBackupRequest,
  DriveBackupTarget,
  DriveBackupTargetHead,
  DriveBackupTargetTuple,
  DriveBackupTransfer,
  RetargetPersistenceEvidence,
} from "./driveBackup";

export type RetainedBackupRecord = Readonly<{
  retention: "recorder-deleted";
  deletionId: string;
  redactionVersion: 1;
  id: string;
  version: 1;
  targetId: string;
  noteId: string;
  originalId: string;
  accountId: string;
  bytes: number;
  sha256: string;
  createdAt: Date;
}>;
export type StoredBackupRecord = DriveBackupRecord | RetainedBackupRecord;
export function retainedBackupRecord(
  record: StoredBackupRecord,
): record is RetainedBackupRecord {
  return "retention" in record && record.retention === "recorder-deleted";
}

export type DriveBackupScope =
  | Readonly<{ kind: "note"; noteId: string }>
  | Readonly<{ kind: "account"; accountId: string; epoch?: number }>
  | Readonly<{ kind: "workspace"; workspaceId: string; accountId?: string }>;

export interface DriveBackupRequestRepository {
  find(id: string): Promise<DriveBackupRequest | null>;
  command(
    accountId: string,
    commandId: string,
  ): Promise<DriveBackupRequest | null>;
  insert(value: DriveBackupRequest): Promise<void>;
  replace(value: DriveBackupRequest, expectedVersion: number): Promise<boolean>;
  advanceRoot(
    id: string,
    expectedVersion: number,
    expectedGeneration: number,
  ): Promise<boolean>;
  unfinished(
    accountId: string,
  ): Promise<Readonly<{ account: number; global: number }>>;
  page(
    accountId: string,
    since: Date,
    after: Readonly<{ createdAt: Date; id: string }> | null,
    limit: number,
  ): Promise<readonly DriveBackupRequest[]>;
}
export interface DriveBackupJobRepository {
  find(id: string): Promise<DriveBackupJob | null>;
  forRequest(id: string): Promise<readonly DriveBackupJob[]>;
  latest(rootId: string): Promise<readonly DriveBackupJob[]>;
  activeTarget(targetId: string): Promise<DriveBackupJob | null>;
  latestTarget(targetId: string): Promise<DriveBackupJob | null>;
  live(scope: DriveBackupScope): Promise<readonly DriveBackupJob[]>;
  cancelPending(scope: DriveBackupScope, now: Date): Promise<number>;
  nextWaitingActor(after: string | null): Promise<string | null>;
  waiting(accountId: string, limit: number): Promise<readonly DriveBackupJob[]>;
  insert(value: DriveBackupJob): Promise<void>;
  replace(value: DriveBackupJob, expectedVersion: number): Promise<boolean>;
  history(
    accountId: string,
    since: Date,
    limit: number,
  ): Promise<readonly DriveBackupJob[]>;
  queued(
    accountId: string,
  ): Promise<Readonly<{ account: number; global: number }>>;
  prune(now: Date, limit: number): Promise<number>;
}
export interface DriveBackupTargetRepository {
  find(id: string): Promise<DriveBackupTarget | null>;
  head(tuple: DriveBackupTargetTuple): Promise<DriveBackupTargetHead | null>;
  isCurrent(targetId: string): Promise<boolean>;
  inspectRetarget(
    tuple: DriveBackupTargetTuple,
  ): Promise<RetargetPersistenceEvidence>;
  closedOwners(
    tuple: DriveBackupTargetTuple,
    afterTransferId: string | null,
    limit: 100,
  ): Promise<
    Readonly<{
      items: readonly Readonly<{
        transferId: string;
        owner: Readonly<{ runtimeGeneration: string; token: string }>;
      }>[];
      nextAfter: string | null;
    }>
  >;
  original(
    originalId: string,
    accountId: string,
    subject: string,
  ): Promise<DriveBackupTarget | null>;
  insertInitial(value: DriveBackupTarget): Promise<void>;
  replaceHead(
    expected: DriveBackupTargetHead,
    expectedTargetVersion: number,
    next: DriveBackupTarget,
  ): Promise<boolean>;
  replace(value: DriveBackupTarget, expectedVersion: number): Promise<boolean>;
  purgeNote(noteId: string): Promise<void>;
}
export interface DriveBackupTransferRepository {
  sourceGeneration(noteId: string): Promise<number | null>;
  find(id: string): Promise<DriveBackupTransfer | null>;
  forTarget(targetId: string): Promise<readonly DriveBackupTransfer[]>;
  canStartUnallocated(targetId: string): Promise<boolean>;
  canRetryUnstarted(
    targetId: string,
    jobId: string,
    exceptJobId?: string,
  ): Promise<boolean>;
  forJob(
    jobId: string,
  ): Promise<
    | Readonly<{ kind: "missing" | "ambiguous" }>
    | Readonly<{ kind: "found"; row: DriveBackupTransfer }>
  >;
  insert(value: DriveBackupTransfer): Promise<void>;
  replace(
    value: DriveBackupTransfer,
    expectedVersion: number,
  ): Promise<boolean>;
  claim(value: DriveBackupTransfer, expectedVersion: number): Promise<boolean>;
  scan(
    kind: "queued" | "recoverable" | "held",
    limit: number,
  ): Promise<readonly DriveBackupTransfer[]>;
  live(scope: DriveBackupScope): Promise<readonly DriveBackupTransfer[]>;
  cancel(
    scope: DriveBackupScope,
    now: Date,
  ): Promise<readonly DriveBackupTransfer[]>;
  held(
    accountId: string,
  ): Promise<Readonly<{ account: number; global: number }>>;
  refreshing(accountId: string, epoch: number): Promise<boolean>;
}
export interface DriveBackupRecordRepository {
  find(id: string): Promise<DriveBackupRecord | null>;
  target(targetId: string): Promise<DriveBackupRecord | null>;
  forNote(
    noteId: string,
    accountId: string,
  ): Promise<readonly DriveBackupRecord[]>;
  insert(value: DriveBackupRecord): Promise<void>;
}

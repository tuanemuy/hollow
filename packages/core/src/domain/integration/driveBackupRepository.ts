import type {
  DriveBackupJob,
  DriveBackupRecord,
  DriveBackupRequest,
  DriveBackupTarget,
  DriveBackupTransfer,
} from "./driveBackup";

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
}
export interface DriveBackupJobRepository {
  find(id: string): Promise<DriveBackupJob | null>;
  forRequest(id: string): Promise<readonly DriveBackupJob[]>;
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
  original(
    originalId: string,
    accountId: string,
    subject: string,
  ): Promise<DriveBackupTarget | null>;
  insert(value: DriveBackupTarget): Promise<void>;
  replace(value: DriveBackupTarget, expectedVersion: number): Promise<boolean>;
  purgeNote(noteId: string): Promise<void>;
}
export interface DriveBackupTransferRepository {
  sourceGeneration(noteId: string): Promise<number | null>;
  find(id: string): Promise<DriveBackupTransfer | null>;
  forTarget(targetId: string): Promise<readonly DriveBackupTransfer[]>;
  insert(value: DriveBackupTransfer): Promise<void>;
  replace(
    value: DriveBackupTransfer,
    expectedVersion: number,
  ): Promise<boolean>;
  claim(value: DriveBackupTransfer, expectedVersion: number): Promise<boolean>;
  scan(
    kind: "queued" | "held",
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

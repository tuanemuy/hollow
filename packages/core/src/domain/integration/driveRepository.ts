import type {
  DriveAttempt,
  DriveConnection,
  DriveControl,
  DriveOwner,
} from "./drive";

export type DriveConnectionChange =
  | "adopt"
  | "refresh"
  | "folder"
  | "invalidate"
  | "disconnect"
  | "touch"
  | "admission"
  | "folder-admission";
export type DriveCursor = Readonly<{ createdAt: Date; id: string }>;
export type DriveScan = Readonly<{
  kind: "claimable" | "held" | "candidate";
  now: Date;
  after: DriveCursor | null;
  limit: number;
}>;
export interface DriveConnectionRepository {
  find(accountId: string): Promise<DriveConnection | null>;
  ensure(accountId: string, now: Date): Promise<DriveConnection>;
  replace(
    value: DriveConnection,
    expectedVersion: number,
    change: DriveConnectionChange,
  ): Promise<boolean>;
}

export interface DriveAttemptRepository {
  scan(input: DriveScan): Promise<readonly DriveAttempt[]>;
  find(id: string): Promise<DriveAttempt | null>;
  findByState(hash: string): Promise<DriveAttempt | null>;
  findByCommand(
    accountId: string,
    commandId: string,
  ): Promise<DriveAttempt | null>;
  insert(value: DriveAttempt & { data: { phase: "pending" } }): Promise<void>;
  replace(value: DriveAttempt, expectedVersion: number): Promise<boolean>;
  countRecent(browserHash: string, since: Date): Promise<number>;
  countLive(browserHash: string, now: Date): Promise<number>;
  liveForAccount(accountId: string): Promise<readonly DriveAttempt[]>;
  claim(
    id: string,
    expectedVersion: number,
    owner: DriveOwner & { state: "active" },
    now: Date,
  ): Promise<boolean>;
  prune(now: Date, limit: number): Promise<number>;
}

export interface DriveControlRepository {
  scan(input: DriveScan): Promise<readonly DriveControl[]>;
  refreshCredential(
    input: Readonly<{
      control: DriveControl;
      expectedVersion: number;
      connection: DriveConnection;
      expectedConnectionVersion: number;
    }>,
  ): Promise<DriveControl>;
  find(id: string): Promise<DriveControl | null>;
  findByCommand(
    accountId: string,
    commandId: string,
  ): Promise<DriveControl | null>;
  insert(value: DriveControl & { data: { phase: "queued" } }): Promise<void>;
  replace(value: DriveControl, expectedVersion: number): Promise<boolean>;
  liveForAccount(accountId: string): Promise<readonly DriveControl[]>;
  claim(value: DriveControl, expectedVersion: number): Promise<boolean>;
  held(
    accountId: string,
  ): Promise<Readonly<{ global: number; account: number }>>;
  queued(
    accountId: string,
  ): Promise<Readonly<{ global: number; account: number }>>;
  history(
    accountId: string,
    since: Date,
    limit: number,
  ): Promise<readonly DriveControl[]>;
  prune(now: Date, limit: number): Promise<number>;
}

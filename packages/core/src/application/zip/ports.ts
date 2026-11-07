import type {
  ZipArtifact,
  ZipArtifactEntry,
  ZipAssembly,
  ZipAttempt,
  ZipAttemptResult,
  ZipDelivery,
  ZipExclusionReason,
  ZipFile,
  ZipFormat,
  ZipLease,
  ZipRequest,
  ZipRun,
  ZipRunKey,
  ZipSpool,
  ZipSpoolRef,
  ZipTarget,
} from "@repo/core/domain/zip/entity";
import type { ObjectOwnershipUnprovenError } from "../ports/objectOwnership";

export type ZipAvailableFormat = ZipFormat;
export type ZipReceipt = Readonly<{
  requestId: string;
  generation: number;
  commandId: string;
  acceptedAt: Date;
}>;
export type ZipAccept = Readonly<{
  request: ZipRequest;
  run: ZipRun;
  targets: readonly ZipTarget[];
  attempts: readonly ZipAttempt[];
  reused: readonly ZipSpoolRef[];
}>;
export type ZipRetryAccept = Readonly<{
  requestId: string;
  accountId: string;
  expectedVersion: number;
  expectedGeneration: number;
  run: ZipRun;
  attempts: readonly ZipAttempt[];
  reused: readonly ZipSpoolRef[];
}>;
export type ZipHistoryKey = Readonly<{
  acceptedAt: Date;
  requestId: string;
  generation: number;
}>;
export type ZipHistoryItem = Readonly<{ request: ZipRequest; run: ZipRun }>;
export type ZipWorkClaim = Readonly<{
  request: ZipRequest;
  run: ZipRun;
  lease: ZipLease;
}>;

export interface ZipRequestRepository {
  find(id: string): Promise<ZipRequest | null>;
  findRun(key: ZipRunKey): Promise<ZipRun | null>;
  findCommand(accountId: string, commandId: string): Promise<ZipRun | null>;
  targets(requestId: string): Promise<readonly ZipTarget[]>;
  attempts(key: ZipRunKey): Promise<readonly ZipAttempt[]>;
  attemptsByIds(ids: readonly string[]): Promise<readonly ZipAttempt[]>;
  latestAttempts(requestId: string): Promise<readonly ZipAttempt[]>;
  accept(input: ZipAccept, now: Date): Promise<ZipReceipt>;
  acceptRetry(input: ZipRetryAccept, now: Date): Promise<ZipReceipt>;
  acceptAssemblyRetry(
    input: ZipAccept,
    origin: ZipRunKey,
    now: Date,
  ): Promise<ZipReceipt>;
  list(
    accountId: string,
    before: ZipHistoryKey | null,
    now: Date,
  ): Promise<readonly ZipHistoryItem[]>;
  summary(
    accountId: string,
    now: Date,
  ): Promise<
    Readonly<{
      activeCount: number;
      representative: Readonly<{ id: string; title: string }> | null;
    }>
  >;
  activePage(
    accountId: string,
    after: string | null,
  ): Promise<readonly Readonly<{ id: string; version: number }>[]>;
  watched(
    accountId: string,
    ids: readonly string[],
    now: Date,
  ): Promise<readonly ZipHistoryItem[]>;
  cancel(id: string, accountId: string, now: Date): Promise<boolean>;
  cancelWorkspaceMember(
    workspaceId: string,
    accountId: string,
    cause: "role-downgrade" | "membership-ended",
    now: Date,
  ): Promise<void>;
  invalidateNote(
    noteId: string,
    now: Date,
    reason?: "ZIP_CANCELLED" | "ZIP_CONTENT_CHANGED",
  ): Promise<void>;
  prune(now: Date): Promise<void>;
}

export interface ZipWorkRepository {
  active(): Promise<ZipHistoryItem | null>;
  claim(now: Date, lease: ZipLease): Promise<ZipWorkClaim | null>;
  renew(
    key: ZipRunKey,
    token: string,
    now: Date,
    until: Date,
  ): Promise<boolean>;
  nextAttempt(
    key: ZipRunKey,
    token: string,
    now: Date,
  ): Promise<ZipAttempt | null>;
  finishAttempt(
    id: string,
    token: string,
    outcome: Extract<
      ZipAttempt,
      { state: "failed" | "excluded" | "cancelled" }
    >,
    now: Date,
  ): Promise<boolean>;
  beginAssembly(
    assembly: ZipAssembly,
    token: string,
    diskLimit: number,
    now: Date,
  ): Promise<boolean>;
  assembly(id: string): Promise<ZipAssembly | null>;
  exclude(
    key: ZipRunKey,
    token: string,
    ordinals: readonly number[],
    reason: ZipExclusionReason,
    now: Date,
  ): Promise<boolean>;
  closeAssembly(
    id: string,
    token: string,
    outcome: "success" | "failure" | "excluded" | "cancelled",
    file: ZipFile | null,
    now: Date,
  ): Promise<boolean>;
  fail(
    key: ZipRunKey,
    token: string | null,
    reason: string,
    now: Date,
  ): Promise<void>;
  finishClosed(
    key: ZipRunKey,
    token: string | null,
    now: Date,
  ): Promise<boolean>;
  recover(now: Date): Promise<void>;
  claimAssemblyCleanup(
    now: Date,
    token: string,
    until: Date,
  ): Promise<ZipAssembly | null>;
  assemblyCleaned(
    id: string,
    token: string,
    deleteToken: string,
  ): Promise<boolean>;
  deferAssemblyCleanup(id: string, token: string, now: Date): Promise<void>;
  reserved(): Promise<Readonly<{ bytes: number; unmaterializedBytes: number }>>;
}

export interface ZipSpoolRepository {
  find(id: string): Promise<ZipSpool | null>;
  refs(
    key: ZipRunKey,
  ): Promise<readonly Readonly<{ ref: ZipSpoolRef; spool: ZipSpool }>[]>;
  reserve(
    spool: ZipSpool,
    token: string,
    diskLimit: number,
    now: Date,
  ): Promise<boolean>;
  publish(
    id: string,
    token: string,
    result: ZipAttemptResult,
    now: Date,
  ): Promise<boolean>;
  retire(id: string, now: Date): Promise<void>;
  claimCleanup(now: Date, token: string, until: Date): Promise<ZipSpool | null>;
  cleaned(id: string, token: string, deleteToken: string): Promise<boolean>;
  deferCleanup(id: string, token: string, now: Date): Promise<void>;
}

export interface ZipArtifactRepository {
  find(id: string): Promise<ZipArtifact | null>;
  entries(id: string): Promise<readonly ZipArtifactEntry[]>;
  publish(
    input: Readonly<{
      artifact: ZipArtifact;
      entries: readonly ZipArtifactEntry[];
      run: ZipRunKey;
      token: string;
      partial: boolean;
    }>,
    now: Date,
  ): Promise<boolean>;
  retire(id: string, now: Date): Promise<void>;
  claimCleanup(
    now: Date,
    token: string,
    until: Date,
  ): Promise<ZipArtifact | null>;
  cleaned(id: string, token: string, deleteToken: string): Promise<boolean>;
  deferCleanup(id: string, token: string, now: Date): Promise<void>;
}

export interface ZipDeliveryRepository {
  find(id: string): Promise<ZipDelivery | null>;
  prepare(delivery: ZipDelivery, now: Date): Promise<void>;
  claim(
    id: string,
    accountId: string,
    token: string,
    runtimeId: string,
    now: Date,
  ): Promise<ZipDelivery | null>;
  beginClose(id: string, token: string, now: Date): Promise<void>;
  close(id: string, token: string | null): Promise<boolean>;
  expireReady(now: Date): Promise<void>;
  recover(now: Date): Promise<void>;
  prune(now: Date): Promise<void>;
}

export type ZipCapacity = Readonly<{
  diskBytes: number;
  protectedDiskBytes: number;
  totalMs: number;
  childMs: number;
  assemblyMs: number;
  deliveryMs: number;
  leaseMs: number;
  cleanupMs: number;
}>;

export interface ZipDiskAdmission {
  reserve<T>(
    input: Readonly<{
      newBytes: number;
      unmaterializedBytes: () => Promise<number>;
    }>,
    commit: () => Promise<T>,
  ): Promise<T>;
}

export interface ZipExecution {
  readonly runtimeId: string;
  start(
    id: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ): boolean;
  active(id: string): boolean;
  cancel(id: string): void;
  within<T>(
    deadlineAt: Date,
    parent: AbortSignal,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  stop(): Promise<void>;
}
export interface ZipTransfers {
  readonly runtimeId: string;
  hold(id: string, expiresAt: Date): AbortSignal;
  ids(): readonly string[];
  release(id: string): void;
  retain(id: string, error: ObjectOwnershipUnprovenError): void;
  cancel(id: string): void;
  stop(): Promise<void>;
}

import type {
  JobResultSnapshot,
  PurgeIntent,
  PurgeObject,
  WriteOwner,
} from "../entity";

export interface PurgeRepository {
  find(id: string): Promise<PurgeIntent | null>;
  forNote(noteId: string): Promise<PurgeIntent | null>;
  page(
    accountId: string,
    scope: "unfinished" | "completed",
    since: Date,
    before: Readonly<{ at: Date; id: string }> | undefined,
    limit: number,
  ): Promise<readonly PurgeIntent[]>;
  summary(accountId: string): Promise<
    Readonly<{
      unfinished: number;
      active: number;
      failed: number;
      representative: PurgeIntent | null;
    }>
  >;
  observe(
    accountId: string,
    ids: readonly string[],
    since: Date,
  ): Promise<readonly PurgeIntent[]>;
  begin(intent: PurgeIntent): Promise<void>;
  due(
    now: Date,
    limit: number,
  ): Promise<readonly { id: string; operationId: string }[]>;
  claim(now: Date, token: string, until: Date): Promise<PurgeIntent | null>;
  objects(id: string): Promise<readonly PurgeObject[]>;
  readyToDelete(
    id: string,
    token: string,
    key: string,
    now: Date,
  ): Promise<boolean>;
  capture(id: string): Promise<void>;
  completeObject(
    id: string,
    token: string,
    key: string,
    deleteToken: string,
    now: Date,
  ): Promise<boolean>;
  finish(id: string, token: string, now: Date): Promise<boolean>;
  defer(
    id: string,
    token: string,
    now: Date,
    reason: string | null,
  ): Promise<void>;
  retry(id: string, now: Date): Promise<void>;
  snapshots(
    accountId: string,
    since: Date,
  ): Promise<readonly JobResultSnapshot[]>;
  prune(before: Date): Promise<void>;
}

export interface ObjectOperationRepository {
  beginWrite(
    id: string,
    runtime: string,
    owner: WriteOwner,
    now: Date,
  ): Promise<void>;
  endWrite(id: string): Promise<void>;
  recoverWrites(runtime: string): Promise<void>;
  registerKey(id: string, key: string): Promise<void>;
  canPublish(id: string): Promise<boolean>;
  claimDelete(
    key: string,
    token: string,
    writerId: string | null,
    now: Date,
    until: Date,
  ): Promise<boolean>;
  finishDelete(key: string, token: string): Promise<boolean>;
  releaseDelete(key: string, token: string): Promise<void>;
}

import type { WriteOwner } from "@repo/core/domain/purge/entity";
export interface OwnedObjectRead {
  readonly body: ReadableStream<Uint8Array>;
  readonly closed: Promise<void>;
  close(): Promise<void>;
}
export interface ObjectStorage {
  putOwnedBounded?(
    key: string,
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
    signal?: AbortSignal,
  ): Promise<{ bytes: number; sha256: string }>;
  openOwnedRead?(key: string, signal?: AbortSignal): Promise<OwnedObjectRead>;
  withOwner?<T>(owner: WriteOwner, operation: () => Promise<T>): Promise<T>;
  recoverOwners?(): Promise<void>;
  removeClaimed?(key: string): Promise<{ token: string }>;
  putBounded(
    key: string,
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
    signal?: AbortSignal,
  ): Promise<{ bytes: number; sha256: string }>;
  put(
    key: string,
    body: ReadableStream<Uint8Array>,
    expectedBytes: number,
  ): Promise<{ bytes: number; sha256: string }>;
  read(key: string, maxBytes?: number): Promise<Uint8Array>;
  stat(key: string): Promise<{ bytes: number }>;
  stream(
    key: string,
    range?: Readonly<{ start: number; end: number }>,
  ): Promise<ReadableStream<Uint8Array>>;
  remove(key: string): Promise<void>;
}

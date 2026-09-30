import type { WriteOwner } from "@repo/core/domain/purge/entity";

const readCloseUnproven = Symbol("ObjectReadCloseUnprovenError");

export class ObjectReadCloseUnprovenError extends Error {
  readonly [readCloseUnproven] = true;
  constructor() {
    super("原本ファイルの実終了を確認できません。");
  }
}

export function isObjectReadCloseUnprovenError(
  error: unknown,
): error is ObjectReadCloseUnprovenError {
  return (
    error instanceof ObjectReadCloseUnprovenError &&
    Object.getOwnPropertyDescriptor(error, readCloseUnproven)?.value === true
  );
}

export interface OwnedObjectRead {
  readonly body: ReadableStream<Uint8Array>;
  readonly closed: Promise<void>;
  close(): Promise<void>;
}
/** One open object, explicit positions, and closure only after its resource closes. */
export interface OwnedObjectRandomRead {
  readonly bytes: number;
  /** Serial exact reads of 1..64 KiB. Reading does not implicitly close at EOF. */
  readAt(offset: number, length: number): Promise<Uint8Array>;
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
  openOwnedRandomRead?(
    key: string,
    signal?: AbortSignal,
  ): Promise<OwnedObjectRandomRead>;
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

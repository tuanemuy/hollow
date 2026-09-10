export interface ObjectStorage {
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

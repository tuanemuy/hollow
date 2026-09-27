export interface ZipOwnedSource {
  readonly chunks: AsyncIterable<Uint8Array>;
  /** Resolve only after actual reader closure; rejection retains ownership. */
  close(): Promise<void>;
}

export interface ZipOwnedSink {
  write(chunk: Uint8Array): Promise<void>;
  finish(): Promise<void>;
  /** Resolve only after actual sink closure; rejection retains ownership. */
  close(): Promise<void>;
}

export interface ZipWriterEntry {
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
  open(signal: AbortSignal): Promise<ZipOwnedSource>;
}

export interface ZipWriter {
  upperBound(
    entries: readonly Pick<ZipWriterEntry, "name" | "bytes">[],
  ): number;
  write(
    input: Readonly<{
      entries: readonly ZipWriterEntry[];
      sink: ZipOwnedSink;
      signal: AbortSignal;
    }>,
  ): Promise<Readonly<{ bytes: number; sha256: string }>>;
}

export type ExportSource = Readonly<{
  id: string;
  mime: string;
  bytes: number;
}> &
  (
    | Readonly<{ kind: "object"; key: string; sha256: string }>
    | Readonly<{ kind: "inline"; data: Uint8Array }>
  );

/** Emits a data URI incrementally and verifies the entire current source before EOF. */
export interface ExportSourceReader {
  open(
    source: ExportSource,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>>;
}

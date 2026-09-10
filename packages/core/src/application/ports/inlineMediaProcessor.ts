import type { MediaMime } from "@repo/core/domain/asset/entity";

export interface InlineMediaProcessor {
  inspect(input: {
    body: ReadableStream<Uint8Array>;
    bytes: number;
    signal?: AbortSignal;
  }): Promise<
    Readonly<{
      mime: MediaMime;
      kind: "image" | "video";
      sanitizedSvg?: Uint8Array;
      removed: readonly string[];
    }>
  >;
}

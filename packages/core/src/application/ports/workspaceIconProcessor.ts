import type { IconMime } from "@repo/core/domain/workspace/icon";
export interface WorkspaceIconProcessor {
  process(
    input: Readonly<{
      body: ReadableStream<Uint8Array>;
      bytes: number;
      mime: IconMime;
      signal?: AbortSignal;
    }>,
  ): Promise<
    Readonly<{
      data: Uint8Array;
      sha256: string;
      width: number;
      height: number;
    }>
  >;
}

import type {
  LlmImageCodec,
  LlmImageOrientation,
} from "@repo/core/application/llm/ports";

export type ImageMetadata = Readonly<{
  version: 1;
  ok: true;
  codec: LlmImageCodec;
  sourceWidth: number;
  sourceHeight: number;
  orientation: LlmImageOrientation;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
export function normalizeImage(input: Uint8Array): Promise<
  Readonly<{
    png: Uint8Array;
    metadata: ImageMetadata;
  }>
>;

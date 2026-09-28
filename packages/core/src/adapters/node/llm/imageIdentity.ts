import { createHash } from "node:crypto";
import type { LlmImagePreparedSource } from "@repo/core/application/llm/ports";
import type { LlmSourceIdentity } from "@repo/core/domain/llm/entity";
import type { ImageMetadata } from "./imageCodec.mjs";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function imageIdentity(
  source: LlmSourceIdentity<"image">,
  metadata: ImageMetadata,
): Pick<LlmImagePreparedSource, "identity" | "inputIdentity"> {
  const sha256 = hash([
    "hollow.prepare",
    3,
    ["original", source.originalId, "image", source.sha256, source.bytes],
    "srgb-white-v1",
    [
      metadata.codec,
      metadata.sourceWidth,
      metadata.sourceHeight,
      metadata.orientation,
      1,
    ],
    [
      "image/png",
      metadata.width,
      metadata.height,
      metadata.bytes,
      metadata.sha256,
    ],
    [true, false, false],
  ]);
  return {
    identity: { kind: "prepared-image", preparationVersion: 3, sha256 },
    inputIdentity: {
      kind: "prepared-raster",
      ordinal: 0,
      sha256: hash(["hollow.raster", 3, sha256, 0]),
    },
  };
}

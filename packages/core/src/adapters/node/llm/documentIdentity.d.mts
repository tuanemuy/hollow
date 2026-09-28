import type {
  LlmDocumentCoverage,
  LlmDocumentNotice,
  LlmPreparedSegment,
} from "@repo/core/application/llm/ports";
import type {
  LlmDocumentFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
export function documentManifestHash(
  source: LlmSourceIdentity<LlmDocumentFormat>,
  coverage: LlmDocumentCoverage,
  notices: readonly LlmDocumentNotice[],
  segments: readonly LlmPreparedSegment[],
): string;
export function documentSegmentHash(
  manifestHash: string,
  ordinal: number,
  firstBlock: number,
  blockCount: number,
  html: string,
): string;

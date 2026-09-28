import type {
  LlmDocumentFormat,
  LlmFailure,
  LlmInputIdentity,
  LlmResponse,
  LlmSourceContract,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import type { PdfPageManifest } from "@repo/core/domain/llm/pdfPreview";

export type LlmPreparedSegment = Readonly<{
  identity: Extract<LlmInputIdentity, { kind: "prepared-segment" }>;
  html: string;
  firstBlock: number;
  blockCount: number;
}>;
export type LlmLegacyPreparedSource = Readonly<{
  kind: "text-blocks";
  preparationVersion: 1;
  segments: readonly LlmPreparedSegment[];
  blocks: number;
  notices: readonly string[];
  media: readonly Readonly<{ placeholder: string; occurrences: number }>[];
}>;
export type LlmDocumentUnit = Readonly<{
  ordinal: number;
  kind:
    | "body"
    | "header"
    | "footer"
    | "footnote"
    | "endnote"
    | "comment"
    | "sheet"
    | "slide"
    | "speaker-notes";
  firstBlock: number;
  blockCount: number;
}>;
export type LlmDocumentCoverage =
  | Readonly<{
      kind: "office-text";
      format: Exclude<LlmDocumentFormat, "pdf">;
      textComplete: true;
      units: readonly LlmDocumentUnit[];
      uninterpretedMedia: number;
    }>
  | Readonly<{
      kind: "pdf-text";
      pages: readonly Readonly<{
        ordinal: number;
        class: "text-covered" | "proven-blank";
        firstBlock: number;
        blockCount: number;
      }>[];
    }>;
export type LlmDocumentNotice = Readonly<{
  code: "OFFICE_MEDIA_UNINTERPRETED" | "OFFICE_HIDDEN_CONTENT_INCLUDED";
  unit: number;
  count: number;
}>;
export type LlmDocumentPreparedSource = Readonly<{
  kind: "text-blocks";
  preparationVersion: 2;
  identity: Readonly<{
    kind: "prepared-document";
    preparationVersion: 2;
    sha256: string;
  }>;
  coverage: LlmDocumentCoverage;
  segments: readonly LlmPreparedSegment[];
  blocks: number;
  notices: readonly LlmDocumentNotice[];
  media: readonly [];
}>;
export type LlmImageCodec = "jpeg" | "png" | "webp" | "gif";
export type LlmImageOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type LlmImageRaster = Readonly<{
  mimeType: "image/png";
  bytes: Uint8Array;
  width: number;
  height: number;
}>;
export type LlmImagePreparedSource = Readonly<{
  kind: "single-raster";
  preparationVersion: 3;
  identity: Readonly<{
    kind: "prepared-image";
    preparationVersion: 3;
    sha256: string;
  }>;
  inputIdentity: Extract<LlmInputIdentity, { kind: "prepared-raster" }>;
  raster: LlmImageRaster;
  coverage: Readonly<{
    kind: "single-frame";
    codec: LlmImageCodec;
    sourceWidth: number;
    sourceHeight: number;
    orientation: LlmImageOrientation;
    frames: 1;
    fullPixels: true;
    resized: false;
    cropped: false;
  }>;
  normalization: "srgb-white-v1";
}>;
export type LlmPreparedSource =
  | LlmLegacyPreparedSource
  | LlmDocumentPreparedSource
  | LlmImagePreparedSource
  | Readonly<{
      kind: "pdf-pages";
      preparationVersion: 4;
      manifest: PdfPageManifest;
    }>;
export type LlmSourceMedia = Readonly<{
  sourceUrl: string;
  placeholder: string;
}>;
export type LlmPrepareInput = Readonly<{ bytes: Uint8Array }> &
  (
    | (Extract<LlmSourceContract, { preparationVersion: 1 }> &
        Readonly<{ media?: readonly LlmSourceMedia[] }>)
    | (Extract<LlmSourceContract, { preparationVersion: 2 }> &
        Readonly<{ media?: never }>)
    | (Extract<LlmSourceContract, { preparationVersion: 3 }> &
        Readonly<{ media?: never }>)
    | (Extract<LlmSourceContract, { preparationVersion: 4 }> &
        Readonly<{ media?: never }>)
  );
export interface LlmSourcePreparer {
  prepare(
    input: LlmPrepareInput,
    signal: AbortSignal,
  ): Promise<LlmPreparedSource>;
}
export interface LlmSourceReader {
  read(
    key: string,
    identity: LlmSourceIdentity,
    signal: AbortSignal,
  ): Promise<Uint8Array>;
}
type LlmModelProfileBase = Readonly<{
  modelId: string;
  contextTokens: number;
  outputTokens: number;
  supportsMaxTokens: true;
  source: "live" | "adopted-default";
  checkedAt: Date;
}>;
export type LlmTextModelProfile = LlmModelProfileBase &
  Readonly<{ kind: "chat-text" }>;
export type LlmImageModelProfile = LlmModelProfileBase &
  Readonly<{
    kind: "chat-image";
    budget: Readonly<{
      kind: "resource-only";
      imageTokens: null;
      contextGuaranteed: false;
    }>;
  }>;
export type LlmModelProfile = LlmTextModelProfile | LlmImageModelProfile;
export interface LlmModelProfiles {
  inspect(
    input: Readonly<{ modelId: string; kind: LlmModelProfile["kind"] }>,
    signal: AbortSignal,
  ): Promise<LlmModelProfile>;
}
type LlmGenerateBase = Readonly<{
  dispatchId: string;
  credential: string;
  instruction: string;
}>;
export type LlmGenerateInput = LlmGenerateBase &
  (
    | Readonly<{
        kind: "chat-text";
        promptVersion: 1;
        model: LlmTextModelProfile;
        input: Readonly<{
          kind: "text-block";
          html: string;
          ordinal: number;
          segments: number;
        }>;
      }>
    | Readonly<{
        kind: "chat-image";
        promptVersion: 2;
        model: LlmImageModelProfile;
        input: LlmImageRaster & Readonly<{ kind: "single-raster" }>;
      }>
    | Readonly<{
        kind: "chat-image";
        promptVersion: 3;
        model: LlmImageModelProfile;
        input: LlmImageRaster &
          Readonly<{
            kind: "pdf-page";
            ordinal: number;
            pages: number;
          }>;
      }>
  );
export interface LlmGenerator {
  generate(input: LlmGenerateInput, signal: AbortSignal): Promise<LlmResponse>;
}
export interface LlmExecution {
  readonly runtimeId: string;
  start(
    jobId: string,
    accountId: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ): boolean;
  active(jobId: string): boolean;
  cancel(jobId: string): void;
  stop(): Promise<void>;
}
export interface LlmRuntimeOwnership {
  readonly runtimeId: string;
  predecessors(): readonly string[];
  assertReady(): void;
  acknowledge(runtimeId: string): Promise<void>;
}
export type LlmVerifiedMedia = Readonly<{
  placeholder: string;
  occurrences: number;
  assetUrl: string;
  kind: "image" | "video";
}>;
export interface LlmResultProcessor {
  restore(
    contents: readonly string[],
    media: readonly LlmVerifiedMedia[],
  ): string;
}
const brand = Symbol.for("hollow.llm-operation-error.v1");
export class LlmOperationError extends Error {
  readonly [brand] = true;
  constructor(
    readonly code: LlmFailure,
    readonly delivery: "not-sent" | "possible",
    readonly closed: boolean,
  ) {
    super(code);
    this.name = "LlmOperationError";
  }
}
const codes = new Set<LlmFailure>([
  "LLM_MONTHLY_LIMIT",
  "LLM_UNAVAILABLE",
  "LLM_UNCONFIGURED",
  "LLM_MODEL_UNAVAILABLE",
  "LLM_MODEL_INCOMPATIBLE",
  "LLM_CREDENTIAL_INVALID",
  "LLM_RATE_LIMIT",
  "LLM_CREDIT_REQUIRED",
  "LLM_RESOURCE_LIMIT",
  "LLM_SOURCE_CHANGED",
  "LLM_SOURCE_INVALID",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_DOCUMENT_NO_TEXT",
  "LLM_PDF_VISUAL_REQUIRED",
  "LLM_PDF_ORDER_UNPROVEN",
  "LLM_IMAGE_CORRUPT",
  "LLM_IMAGE_UNSUPPORTED",
  "LLM_IMAGE_MULTIFRAME",
  "LLM_TIMEOUT",
  "LLM_RESPONSE_INVALID",
  "LLM_RESPONSE_INCOMPLETE",
  "LLM_DELIVERY_UNKNOWN",
  "LLM_OWNERSHIP_UNKNOWN",
]);
export function isLlmOperationError(
  error: unknown,
): error is LlmOperationError {
  return (
    error instanceof Error &&
    brand in error &&
    error[brand] === true &&
    "code" in error &&
    typeof error.code === "string" &&
    [...codes].some((code) => code === error.code) &&
    "delivery" in error &&
    (error.delivery === "not-sent" || error.delivery === "possible") &&
    "closed" in error &&
    typeof error.closed === "boolean"
  );
}

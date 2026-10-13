import type { Original } from "@repo/core/domain/import/entity";
import type { ConversionJob } from "@repo/core/domain/job/entity";
import type {
  AudioChunkIdentity,
  AudioManifest,
  TranscriptSegmentIdentity,
} from "@repo/core/domain/llm/audio";
import type {
  LlmConversion,
  LlmDispatch,
  LlmDocumentFormat,
  LlmFailure,
  LlmFixedConversion,
  LlmInputIdentity,
  LlmOutcome,
  LlmQuotaReservation,
  LlmResponse,
  LlmSourceContract,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import type {
  PdfChoice,
  PdfPageIdentity,
  PdfPageManifest,
  PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import type { SourceBinding } from "@repo/core/domain/regeneration/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { SourceInputLease } from "../regeneration/services";
import type { AudioChunk, LlmSttModelProfile, SourceSink } from "./audioPorts";

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
export type LlmAudioPreparedSource = Readonly<{
  kind: "audio-transcript";
  preparationVersion: 5;
  manifest: AudioManifest;
  segments: readonly Readonly<{
    identity: TranscriptSegmentIdentity;
    html: string;
  }>[];
  notices: readonly string[];
}>;
export type LlmPreparedSource =
  | LlmAudioPreparedSource
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
export interface LlmNativeBirth {
  readonly birthId: string;
}
export interface LlmNativeInputOwner {
  reserve(signal?: AbortSignal): Promise<LlmNativeBirth>;
  reserveMany(
    count: 1 | 2,
    signal: AbortSignal,
  ): Promise<readonly LlmNativeBirth[]>;
  register(birth: LlmNativeBirth, pid: number): Promise<void>;
  closed(birth: LlmNativeBirth): Promise<void>;
}
export type LlmPrepareInput = Readonly<{
  bytes: Uint8Array;
  native?: LlmNativeInputOwner;
}> &
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
  readInto(
    key: string,
    identity: LlmSourceIdentity,
    sink: SourceSink,
    signal: AbortSignal,
  ): Promise<void>;
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
export type LlmChatModelProfile = LlmTextModelProfile | LlmImageModelProfile;
export type LlmModelProfile = LlmChatModelProfile | LlmSttModelProfile;
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
export interface LlmPredecessorInputProof {
  readonly receipt: Extract<SourceInputReceipt, { state: "closed" }>;
}
export interface LlmLeasedRuntimeOwnership extends LlmRuntimeOwnership {
  pendingInputProofs(runtimeId: string): readonly LlmPredecessorInputProof[];
  inputPredecessor(value: LlmConversion): LlmPredecessorInputProof | null;
  verifyPredecessorInput(
    proof: LlmPredecessorInputProof,
    value: LlmConversion,
  ): boolean;
  consumePredecessorInput(proof: LlmPredecessorInputProof): void;
}
export type LlmInputClaim = Readonly<{
  value: LlmConversion;
  lease: SourceInputLease | null;
}>;
export interface LlmInputStage {
  claim(): Promise<LlmInputClaim | null>;
  resume(): Promise<readonly LlmInputClaim[]>;
  lease(value: LlmConversion): SourceInputLease | null;
  prepare(
    value: LlmConversion,
    signal: AbortSignal,
  ): Promise<LlmPreparedSource>;
  finish(value: LlmConversion): Promise<void>;
  stop(): Promise<void>;
}
export interface LlmLocalRuntimeOwnership extends LlmLeasedRuntimeOwnership {
  nativeOwner(
    value: LlmConversion | PdfPreview,
    lease: SourceInputLease,
    page?: PdfPageIdentity,
  ): LlmNativeInputOwner;
  inputPredecessor(
    value: LlmConversion | PdfPreview,
  ): LlmPredecessorInputProof | null;
  verifyPredecessorInput(
    proof: LlmPredecessorInputProof,
    value: LlmConversion | PdfPreview,
  ): boolean;
}
export interface LlmLocalInputStage extends LlmInputStage {
  prepareAudio(
    value: Extract<LlmFixedConversion, { preparationVersion: 5 }>,
    signal: AbortSignal,
  ): Promise<AudioManifest>;
  readAudioChunk(
    value: Extract<LlmFixedConversion, { preparationVersion: 5 }>,
    identity: AudioChunkIdentity,
    signal: AbortSignal,
  ): Promise<AudioChunk>;
  claimPreview(): Promise<PdfPreview | null>;
  resumePreview(): Promise<readonly PdfPreview[]>;
  previewLease(value: PdfPreview): SourceInputLease | null;
  classify(
    value: LlmConversion | PdfPreview,
    signal: AbortSignal,
  ): Promise<PdfChoice>;
  redraw(
    value: LlmConversion,
    manifest: PdfPageManifest,
    page: PdfPageIdentity,
    signal: AbortSignal,
  ): Promise<LlmImageRaster>;
  finishPreview(value: PdfPreview): Promise<void>;
}

type EpochData<T, K extends keyof T> = T extends unknown
  ? Readonly<
      Omit<T, K> & { [P in K]: T[P] extends Date ? number : number | null }
    >
  : never;
export type DriveLlmData = EpochData<
  LlmFixedConversion,
  "createdAt" | "updatedAt" | "deadlineAt"
>;
export type DriveLlmDispatchData = EpochData<LlmDispatch, "intentAt">;
export type DriveLlmQuotaData = EpochData<
  LlmQuotaReservation,
  "createdAt" | "updatedAt" | "firstIntentAt"
>;
export type DriveLlmPrewrite = Readonly<{
  conversion: DriveLlmData;
  job: EpochData<ConversionJob, "createdAt" | "updatedAt" | "leaseUntil">;
  dispatches: readonly DriveLlmDispatchData[];
  quota: DriveLlmQuotaData;
  original: EpochData<Original, "createdAt">;
  binding: EpochData<SourceBinding, "createdAt">;
}>;
export type DriveLlmTerminalCall = Readonly<{
  base: DriveLlmData;
  outcome:
    | Exclude<LlmOutcome, { kind: "pending" | "failed" | "unknown" }>
    | Readonly<{
        kind: "failed";
        code: Exclude<
          LlmFailure,
          "LLM_OWNERSHIP_UNKNOWN" | "LLM_DELIVERY_UNKNOWN"
        >;
      }>
    | Readonly<{ kind: "unknown"; code: "LLM_DELIVERY_UNKNOWN" }>;
  epochMs: number;
  dispatches: readonly DriveLlmDispatchData[];
  quota: DriveLlmQuotaData;
}>;
export interface DriveLlmRecorder {
  beforeWrite(): Promise<void>;
  terminal(
    value: LlmConversion,
    outcome: Exclude<LlmOutcome, { kind: "pending" }>,
    now: Date,
  ): Promise<void>;
}
export interface LlmDriveInputStage extends LlmLocalInputStage {
  finalizeDrive(
    value: LlmConversion,
    signal: AbortSignal,
  ): Promise<LlmConversion>;
  commitDrive(
    value: LlmConversion,
    work: (
      u: HollowUnitOfWorkContext,
      recorder: DriveLlmRecorder,
    ) => Promise<void>,
  ): Promise<void>;
  recoverDriveCompletions(): Promise<void>;
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
  "LLM_AUDIO_CORRUPT",
  "LLM_AUDIO_UNSUPPORTED",
  "LLM_AUDIO_NO_TEXT",
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

import { BusinessRuleError } from "../error";
import type { Original } from "../import/entity";
import type {
  SourceAccess,
  SourceInputReceipt,
  SourceMemoryBytes,
} from "../regeneration/source";
import type {
  AudioChunkIdentity,
  AudioPlan,
  AudioRecipe,
  LlmTranscriptResponse,
  TranscriptSegmentIdentity,
} from "./audio";
import type {
  PdfCandidateModels,
  PdfChoice,
  PdfPageManifest,
} from "./pdfPreview";

export const LLM_LIMITS = {
  concurrency: 2,
  accountConcurrency: 1,
  accountQueued: 100,
  monthly: 30,
  jobMs: 30 * 60_000,
  prepareMs: 30_000,
  dispatchMs: 90_000,
  stopMs: 60_000,
  segmentBytes: 64 * 1024,
  segments: 16,
  responseBytes: 2 * 1024 * 1024,
  contentBytes: 64 * 1024,
  outputTokens: 8192,
  instructionBytes: 8 * 1024,
  responseBudget: 2 * 1024 * 1024,
  globalResponseBudget: 256 * 1024 * 1024,
  historyMs: 90 * 86400_000,
  imageDimension: 4096,
  imagePixels: 16_000_000,
  imageBytes: 8 * 1024 * 1024,
  requestBytes: 12 * 1024 * 1024,
} as const;

export type LlmLegacyFormat = "text" | "html" | "markdown";
export type LlmDocumentFormat = "docx" | "xlsx" | "pptx" | "pdf";
export type LlmSourceFormat =
  | LlmLegacyFormat
  | LlmDocumentFormat
  | "image"
  | "audio";
export type LlmSourceIdentity<F extends LlmSourceFormat = LlmSourceFormat> =
  Readonly<{
    kind: "original";
    originalId: string;
    sha256: string;
    bytes: number;
    format: F;
  }>;
export type LlmSourceContract =
  | Readonly<{
      source: LlmSourceIdentity<LlmLegacyFormat>;
      preparationVersion: 1;
      promptVersion: 1;
    }>
  | Readonly<{
      source: LlmSourceIdentity<LlmDocumentFormat>;
      preparationVersion: 2;
      promptVersion: 1;
    }>
  | Readonly<{
      source: LlmSourceIdentity<"image">;
      preparationVersion: 3;
      promptVersion: 2;
    }>
  | Readonly<{
      source: LlmSourceIdentity<"pdf">;
      preparationVersion: 4;
      promptVersion: 3;
      manifest: PdfPageManifest;
    }>
  | Readonly<{
      source: LlmSourceIdentity<"audio">;
      preparationVersion: 5;
      promptVersion: 4;
      audioRecipe: AudioRecipe;
    }>;
export function isLlmLegacyFormat(format: string): format is LlmLegacyFormat {
  return format === "text" || format === "html" || format === "markdown";
}
export function isLlmDocumentFormat(
  format: string,
): format is LlmDocumentFormat {
  return (
    format === "docx" ||
    format === "xlsx" ||
    format === "pptx" ||
    format === "pdf"
  );
}
export type LlmInputIdentity =
  | AudioChunkIdentity
  | TranscriptSegmentIdentity
  | Readonly<{
      kind: "prepared-segment";
      sha256: string;
      ordinal: number;
    }>
  | Readonly<{
      kind: "prepared-raster";
      sha256: string;
      ordinal: 0;
    }>
  | Readonly<{
      kind: "prepared-pdf-page";
      sha256: string;
      ordinal: number;
    }>;
export type LlmFailure =
  | "LLM_MONTHLY_LIMIT"
  | "LLM_UNAVAILABLE"
  | "LLM_UNCONFIGURED"
  | "LLM_MODEL_UNAVAILABLE"
  | "LLM_MODEL_INCOMPATIBLE"
  | "LLM_CREDENTIAL_INVALID"
  | "LLM_RATE_LIMIT"
  | "LLM_CREDIT_REQUIRED"
  | "LLM_RESOURCE_LIMIT"
  | "LLM_SOURCE_CHANGED"
  | "LLM_SOURCE_INVALID"
  | "LLM_DOCUMENT_ENCRYPTED"
  | "LLM_DOCUMENT_CORRUPT"
  | "LLM_DOCUMENT_UNSUPPORTED"
  | "LLM_DOCUMENT_NO_TEXT"
  | "LLM_PDF_VISUAL_REQUIRED"
  | "LLM_PDF_ORDER_UNPROVEN"
  | "LLM_AUDIO_CORRUPT"
  | "LLM_AUDIO_UNSUPPORTED"
  | "LLM_AUDIO_NO_TEXT"
  | "LLM_IMAGE_CORRUPT"
  | "LLM_IMAGE_UNSUPPORTED"
  | "LLM_IMAGE_MULTIFRAME"
  | "LLM_TIMEOUT"
  | "LLM_RESPONSE_INVALID"
  | "LLM_RESPONSE_INCOMPLETE"
  | "LLM_DELIVERY_UNKNOWN"
  | "LLM_OWNERSHIP_UNKNOWN";

export type LlmOwnership =
  | Readonly<{ state: "idle"; runtimeId: null; token: null }>
  | Readonly<{
      state: "active" | "unknown";
      runtimeId: string;
      token: string;
    }>
  | Readonly<{ state: "closed"; runtimeId: string; token: string }>;
export type LlmOutcome =
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "succeeded"; noteVersion: number }>
  | Readonly<{ kind: "failed"; code: LlmFailure }>
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{
      kind: "unknown";
      code: "LLM_DELIVERY_UNKNOWN" | "LLM_OWNERSHIP_UNKNOWN";
    }>;

type LlmConversionBase = Readonly<{
  access: SourceAccess;
  sourceMemoryBytes: SourceMemoryBytes;
  inputReceipt: SourceInputReceipt | null;
  jobId: string;
  accountId: string;
  noteId: string;
  commandId: string;
  requestDigest: string;
  operation: "import" | "regenerate";
  retryOf: string | null;
  sourceState: Original["state"];
  sourceCoverage: Original["coverage"];
  noteVersion: number;
  originalRevisionNo: number | null;
  credentialEpoch: number;
  instruction: string;
  admissionSequence: number;
  createdAt: Date;
  deadlineAt: Date;
  updatedAt: Date;
  owner: LlmOwnership;
  cancelGeneration: number;
  responseBudget: number;
  version: number;
}>;
export type LlmFixedConversion = LlmConversionBase &
  Readonly<{
    selection: "fixed";
    modelId: string;
    candidates?: never;
    phase:
      | "queued"
      | "preparing"
      | "dispatching"
      | "response-ready"
      | "finalizing"
      | "terminal";
    outcome: LlmOutcome;
  }> &
  (
    | (Exclude<LlmSourceContract, { preparationVersion: 4 | 5 }> &
        Readonly<{
          pdfProof: null;
          sourceOwnershipGeneration: null;
        }>)
    | Readonly<{
        source: LlmSourceIdentity<"pdf">;
        preparationVersion: 2;
        promptVersion: 1;
        pdfProof: Extract<PdfChoice, { kind: "strict-text" }>;
        sourceOwnershipGeneration: number;
      }>
    | (Extract<LlmSourceContract, { preparationVersion: 4 }> &
        Readonly<{
          pdfProof: Extract<PdfChoice, { kind: "pages" }>;
          sourceOwnershipGeneration: number;
        }>)
    | (Extract<LlmSourceContract, { preparationVersion: 5 }> &
        Readonly<{
          audioPlan: AudioPlan;
          pdfProof: null;
          sourceOwnershipGeneration: null;
        }>)
  );
export type LlmPendingPdfConversion = LlmConversionBase &
  Readonly<{
    selection: "pdf-pending";
    operation: "import";
    source: LlmSourceIdentity<"pdf">;
    candidates: PdfCandidateModels;
    sourceOwnershipGeneration: number;
    modelId?: never;
    preparationVersion?: never;
    promptVersion?: never;
    manifest?: never;
    pdfProof?: never;
  }> &
  (
    | Readonly<{
        phase: "queued" | "classifying";
        outcome: Extract<LlmOutcome, { kind: "pending" | "unknown" }>;
      }>
    | Readonly<{
        phase: "terminal";
        outcome: Exclude<LlmOutcome, { kind: "pending" | "succeeded" }>;
      }>
  );
export type LlmConversion = LlmFixedConversion | LlmPendingPdfConversion;

export type LlmResponse = Readonly<{
  content: string;
  finish: "stop";
  inputTokens: number | null;
  outputTokens: number | null;
}>;
type DispatchBase = Readonly<{
  jobId: string;
  ordinal: number;
  id: string;
  ownerToken: string;
  runtimeId: string;
}>;
type DispatchState<R> =
  | Readonly<{ state: "prepared"; intentAt: null; response: null }>
  | Readonly<{
      state: "intent" | "unknown" | "not-sent" | "scrubbed";
      intentAt: Date;
      response: null;
    }>
  | Readonly<{ state: "response"; intentAt: Date; response: R }>;
export type LlmDispatch = DispatchBase &
  (
    | (Readonly<{
        stage?: "structure";
        input: Exclude<LlmInputIdentity, AudioChunkIdentity>;
      }> &
        DispatchState<LlmResponse>)
    | (Readonly<{ stage: "transcribe"; input: AudioChunkIdentity }> &
        DispatchState<LlmTranscriptResponse>)
  );
export type LlmDispatchResponse = LlmResponse | LlmTranscriptResponse;
export type LlmQuotaReservation = Readonly<{
  jobId: string;
  accountId: string;
  month: string;
  createdAt: Date;
  updatedAt: Date;
}> &
  (
    | Readonly<{ state: "reserved"; firstIntentAt: null }>
    | Readonly<{ state: "consumed"; firstIntentAt: Date }>
    | Readonly<{ state: "released"; firstIntentAt: Date | null }>
  );
export type LlmQuotaUsage = Readonly<{
  month: string;
  reserved: number;
  consumed: number;
  updatedAt: Date;
}>;
export function llmMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}
export function llmInstruction(value: string): string {
  if (new TextEncoder().encode(value).byteLength > LLM_LIMITS.instructionBytes)
    throw new BusinessRuleError(
      "LLM_INSTRUCTION_LIMIT",
      "追加指示は8 KiB以内にしてください。",
    );
  return value;
}

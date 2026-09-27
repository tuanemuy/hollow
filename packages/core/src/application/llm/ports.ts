import type {
  LlmFailure,
  LlmInputIdentity,
  LlmResponse,
  LlmSourceFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";

export type LlmPreparedSegment = Readonly<{
  identity: LlmInputIdentity;
  html: string;
  firstBlock: number;
  blockCount: number;
}>;
export type LlmPreparedSource = Readonly<{
  segments: readonly LlmPreparedSegment[];
  blocks: number;
  notices: readonly string[];
  media: readonly Readonly<{ placeholder: string; occurrences: number }>[];
}>;
export type LlmSourceMedia = Readonly<{
  sourceUrl: string;
  placeholder: string;
}>;
export interface LlmSourcePreparer {
  prepare(
    input: Readonly<{
      bytes: Uint8Array;
      format: LlmSourceFormat;
      media?: readonly LlmSourceMedia[];
    }>,
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
export type LlmModelProfile = Readonly<{
  modelId: string;
  kind: "chat-text";
  contextTokens: number;
  outputTokens: number;
  supportsMaxTokens: true;
  source: "live" | "adopted-default";
  checkedAt: Date;
}>;
export interface LlmModelProfiles {
  inspect(modelId: string, signal: AbortSignal): Promise<LlmModelProfile>;
}
export type LlmGenerateInput = Readonly<{
  dispatchId: string;
  credential: string;
  model: LlmModelProfile;
  html: string;
  instruction: string;
  ordinal: number;
  segments: number;
}>;
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

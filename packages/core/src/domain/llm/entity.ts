import { BusinessRuleError } from "../error";
import type { Original } from "../import/entity";

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
} as const;

export type LlmSourceFormat = "text" | "html" | "markdown";
export type LlmSourceIdentity = Readonly<{
  kind: "original";
  originalId: string;
  sha256: string;
  bytes: number;
  format: LlmSourceFormat;
}>;
export type LlmInputIdentity = Readonly<{
  kind: "prepared-segment";
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

export type LlmConversion = Readonly<{
  jobId: string;
  accountId: string;
  noteId: string;
  commandId: string;
  requestDigest: string;
  operation: "import" | "regenerate";
  retryOf: string | null;
  source: LlmSourceIdentity;
  sourceState: Original["state"];
  sourceCoverage: Original["coverage"];
  noteVersion: number;
  originalRevisionNo: number | null;
  credentialEpoch: number;
  modelId: string;
  instruction: string;
  promptVersion: 1;
  admissionSequence: number;
  createdAt: Date;
  deadlineAt: Date;
  updatedAt: Date;
  phase:
    | "queued"
    | "preparing"
    | "dispatching"
    | "response-ready"
    | "finalizing"
    | "terminal";
  outcome: LlmOutcome;
  owner: LlmOwnership;
  cancelGeneration: number;
  responseBudget: number;
  version: number;
}>;

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
  input: LlmInputIdentity;
  ownerToken: string;
  runtimeId: string;
}>;
export type LlmDispatch = DispatchBase &
  (
    | Readonly<{ state: "prepared"; intentAt: null; response: null }>
    | Readonly<{
        state: "intent" | "unknown" | "not-sent" | "scrubbed";
        intentAt: Date;
        response: null;
      }>
    | Readonly<{ state: "response"; intentAt: Date; response: LlmResponse }>
  );
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

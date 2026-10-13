import type { SourceInputReceipt } from "../regeneration/source";
import type { AudioPlan } from "./audio";
import type {
  LlmConversion,
  LlmDispatch,
  LlmDispatchResponse,
  LlmFixedConversion,
  LlmQuotaReservation,
  LlmQuotaUsage,
} from "./entity";
import type { PdfChoice } from "./pdfPreview";

export type LlmExactClaim = Readonly<{
  candidate: LlmConversion;
  runtimeId: string;
  ownerToken: string;
  receipt: Extract<SourceInputReceipt, { state: "active" | "unknown" }> | null;
  now: Date;
}>;

export type LlmAdmission = Readonly<{ sequence: number; active: number }>;
export interface LlmConversionRepository {
  insert(value: LlmConversion): Promise<void>;
  find(jobId: string): Promise<LlmConversion | null>;
  command(accountId: string, commandId: string): Promise<LlmConversion | null>;
  activeForNote(noteId: string): Promise<LlmConversion | null>;
  replace(value: LlmConversion, expectedVersion: number): Promise<boolean>;
  sealAudio(
    input: Readonly<{
      jobId: string;
      expectedVersion: number;
      ownerToken: string;
      runtimeId: string;
      plan: Exclude<AudioPlan, { kind: "awaiting-manifest" }>;
      now: Date;
    }>,
  ): Promise<Extract<LlmFixedConversion, { preparationVersion: 5 }> | null>;
  sealPdf(
    input: Readonly<{
      jobId: string;
      expectedVersion: number;
      ownerToken: string;
      runtimeId: string;
      choice: PdfChoice;
      now: Date;
    }>,
  ): Promise<LlmFixedConversion | null>;
  claim(
    now: Date,
    runtimeId: string,
    ownerToken: string,
  ): Promise<LlmConversion | null>;
  claimCandidate(now: Date): Promise<LlmConversion | null>;
  claimExact(input: LlmExactClaim): Promise<LlmConversion | null>;
  owned(runtimeId: string): Promise<readonly LlmConversion[]>;
  admission(accountId: string, credentialEpoch: number): Promise<LlmAdmission>;
  admit(accountId: string): Promise<number>;
  queued(accountId: string): Promise<number>;
  cancelAccount(
    accountId: string,
    credentialEpoch: number,
    now: Date,
  ): Promise<number>;
  cancelNote(noteId: string, now: Date): Promise<number>;
  cancelScopeActor(
    workspaceId: string,
    accountId: string,
    now: Date,
  ): Promise<number>;
  prune(before: Date, limit: number): Promise<number>;
}
export interface LlmDispatchRepository {
  list(jobId: string): Promise<readonly LlmDispatch[]>;
  find(id: string): Promise<LlmDispatch | null>;
  prepare(value: LlmDispatch & { state: "prepared" }): Promise<void>;
  intent(id: string, ownerToken: string, now: Date): Promise<boolean>;
  response(
    id: string,
    ownerToken: string,
    value: LlmDispatchResponse,
  ): Promise<boolean>;
  fail(
    id: string,
    ownerToken: string,
    delivery: "not-sent" | "possible",
  ): Promise<boolean>;
  scrub(jobId: string): Promise<void>;
}
export interface LlmQuotaRepository {
  reserve(
    jobId: string,
    accountId: string,
    now: Date,
    limit: number,
  ): Promise<boolean>;
  reservation(jobId: string): Promise<LlmQuotaReservation | null>;
  consume(jobId: string, now: Date): Promise<boolean>;
  releaseUnsent(jobId: string, now: Date): Promise<boolean>;
  usage(accountId: string, month: string): Promise<LlmQuotaUsage | null>;
}

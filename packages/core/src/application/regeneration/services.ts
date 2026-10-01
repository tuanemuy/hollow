import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import type {
  LlmLegacyFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import type { DriveExecution, DriveServices } from "../integration/drive/ports";
import type { LlmLegacyPreparedSource, LlmSourceReader } from "../llm/ports";

export type ActiveInputReceipt = Extract<
  SourceInputReceipt,
  { state: "active" | "unknown" }
>;
export interface SourceInputLease {
  readonly receipt: ActiveInputReceipt;
}
export interface SourceInputProof {
  readonly receipt: Extract<SourceInputReceipt, { state: "closed" }>;
}
export interface RegenerationInput {
  open(receipt: ActiveInputReceipt): SourceInputLease;
  startRead(lease: SourceInputLease): void;
  endRead(lease: SourceInputLease): void;
  adopt(lease: SourceInputLease, bytes: Uint8Array): void;
  prepareText(
    lease: SourceInputLease,
    source: LlmSourceIdentity<LlmLegacyFormat>,
    signal: AbortSignal,
  ): Promise<LlmLegacyPreparedSource>;
  finish(lease: SourceInputLease, proofId: string): SourceInputProof;
  verify(proof: SourceInputProof, receipt: SourceInputReceipt): boolean;
  consume(proof: SourceInputProof): void;
  unknown(lease: SourceInputLease): void;
}
export type RegenerationSourceRequest = Readonly<{
  record: DriveBackupRecord;
  accessToken: string;
  resourceKey: string | null;
  signal: AbortSignal;
  checkCurrent(): Promise<void>;
}>;
export interface RegenerationSourceProvider {
  read(input: RegenerationSourceRequest): Promise<Uint8Array>;
  inspect(input: RegenerationSourceRequest): Promise<void>;
}
export type SourceExecution = DriveExecution &
  Required<Pick<DriveExecution, "confirmSourceAcknowledged">>;
function hasSourceAcknowledgement(
  execution: DriveExecution,
): execution is SourceExecution {
  return typeof execution.confirmSourceAcknowledged === "function";
}
export type RegenerationServices = Readonly<{
  input: RegenerationInput;
  local: LlmSourceReader;
  provider: RegenerationSourceProvider;
  drive: DriveServices & Readonly<{ execution: SourceExecution }>;
}>;
export function sourceStateInvalid(): never {
  throw new BusinessRuleError(
    "REGENERATION_SOURCE_INVALID",
    "再生成の取得元と終了状態を確認できません。",
  );
}
export function regenerationServices(
  input: RegenerationInput,
  local: LlmSourceReader,
  provider: RegenerationSourceProvider,
  drive: DriveServices,
): RegenerationServices {
  const execution = drive.execution;
  if (!hasSourceAcknowledgement(execution)) return sourceStateInvalid();
  return { input, local, provider, drive: { ...drive, execution } };
}

import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import type {
  LlmLegacyFormat,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import type {
  RegenerationConsumer,
  SourceInputReceipt,
} from "@repo/core/domain/regeneration/source";
import type { DriveExecution, DriveServices } from "../integration/drive/ports";
import type {
  LlmLegacyPreparedSource,
  LlmSourceMedia,
  LlmSourceReader,
} from "../llm/ports";

export type ActiveInputReceipt = Extract<
  SourceInputReceipt,
  { state: "active" | "unknown" }
>;
export interface SourceInputAdmission {
  readonly consumer: RegenerationConsumer;
}
export interface SourceInputLease {
  readonly receipt: ActiveInputReceipt;
}
export interface SourceInputProof {
  readonly receipt: Extract<SourceInputReceipt, { state: "closed" }>;
}
export interface RegenerationInput {
  tryReserveBegin(
    consumer: RegenerationConsumer,
  ):
    | Readonly<{ kind: "reserved"; admission: SourceInputAdmission }>
    | Readonly<{ kind: "busy" }>;
  reserveBegin(consumer: RegenerationConsumer): SourceInputAdmission;
  bindBegin(admission: SourceInputAdmission, receipt: ActiveInputReceipt): void;
  commitBegin(admission: SourceInputAdmission): SourceInputLease;
  holdBegin(admission: SourceInputAdmission): void;
  owns(lease: SourceInputLease): boolean;
  discard(lease: SourceInputLease): void;
  startRead(lease: SourceInputLease): void;
  endRead(lease: SourceInputLease): void;
  adopt(lease: SourceInputLease, bytes: Uint8Array): void;
  prepareText(
    lease: SourceInputLease,
    source: LlmSourceIdentity<LlmLegacyFormat>,
    signal: AbortSignal,
    media?: readonly LlmSourceMedia[],
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
}> &
  (
    | Readonly<{
        provider: RegenerationSourceProvider;
        drive: DriveServices & Readonly<{ execution: SourceExecution }>;
      }>
    | Readonly<{ provider?: never; drive?: never }>
  );
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

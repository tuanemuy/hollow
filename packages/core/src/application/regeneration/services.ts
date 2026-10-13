import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import type {
  LlmLegacyFormat,
  LlmSourceContract,
  LlmSourceIdentity,
} from "@repo/core/domain/llm/entity";
import type {
  PdfChoice,
  PdfPageIdentity,
  PdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import type {
  RegenerationConsumer,
  SourceInputReceipt,
} from "@repo/core/domain/regeneration/source";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "../execution/hollowUnitOfWork";
import type { DriveExecution, DriveServices } from "../integration/drive/ports";
import type { SourceSink } from "../llm/audioPorts";
import type {
  LlmExecution,
  LlmImageRaster,
  LlmLegacyPreparedSource,
  LlmLocalRuntimeOwnership,
  LlmNativeInputOwner,
  LlmPredecessorInputProof,
  LlmPreparedSource,
  LlmSourceMedia,
  LlmSourceReader,
} from "../llm/ports";
import type { DocumentExtractor, Extraction } from "../ports/documentExtractor";

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
export type LocalInputWork =
  | Readonly<{
      kind: "prepare-v1";
      contract: Extract<LlmSourceContract, { preparationVersion: 1 }>;
      media?: readonly LlmSourceMedia[];
    }>
  | Readonly<{
      kind: "prepare-v2";
      contract: Extract<LlmSourceContract, { preparationVersion: 2 }>;
    }>
  | Readonly<{
      kind: "prepare-v3";
      contract: Extract<LlmSourceContract, { preparationVersion: 3 }>;
      native: LlmNativeInputOwner;
    }>
  | Readonly<{
      kind: "prepare-v4";
      contract: Extract<LlmSourceContract, { preparationVersion: 4 }>;
      native: LlmNativeInputOwner;
    }>
  | Readonly<{
      kind: "classify-pdf";
      source: LlmSourceIdentity<"pdf">;
      native: LlmNativeInputOwner;
    }>
  | Readonly<{
      kind: "redraw-pdf";
      source: LlmSourceIdentity<"pdf">;
      manifest: PdfPageManifest;
      page: PdfPageIdentity;
      native: LlmNativeInputOwner;
    }>;
export type LocalInputResult =
  | Readonly<{
      kind: "prepare-v1";
      prepared: Extract<LlmPreparedSource, { preparationVersion: 1 }>;
    }>
  | Readonly<{
      kind: "prepare-v2";
      prepared: Extract<LlmPreparedSource, { preparationVersion: 2 }>;
    }>
  | Readonly<{
      kind: "prepare-v3";
      prepared: Extract<LlmPreparedSource, { preparationVersion: 3 }>;
    }>
  | Readonly<{
      kind: "prepare-v4";
      prepared: Extract<LlmPreparedSource, { preparationVersion: 4 }>;
    }>
  | Readonly<{ kind: "classify-pdf"; choice: PdfChoice }>
  | Readonly<{ kind: "redraw-pdf"; raster: LlmImageRaster }>;
export interface LocalRegenerationInput extends RegenerationInput {
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "prepare-v1" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "prepare-v1" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "prepare-v2" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "prepare-v2" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "prepare-v3" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "prepare-v3" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "prepare-v4" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "prepare-v4" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "classify-pdf" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "classify-pdf" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: Extract<LocalInputWork, { kind: "redraw-pdf" }>,
    signal: AbortSignal,
  ): Promise<Extract<LocalInputResult, { kind: "redraw-pdf" }>>;
  prepareWork(
    lease: SourceInputLease,
    work: LocalInputWork,
    signal: AbortSignal,
  ): Promise<LocalInputResult>;
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
export type MachineClaimResult =
  | Readonly<{ kind: "claimed"; value: MachineRegeneration }>
  | Readonly<{ kind: "no-claim" | "fenced" | "cancelled-fence" }>;
export interface MachineRegenerationInput extends LocalRegenerationInput {
  hasPendingBegin(admission: SourceInputAdmission): boolean;
  consumed(proof: SourceInputProof, lease: SourceInputLease): boolean;
  prepareMachine(
    lease: SourceInputLease,
    source: MachineRegeneration["source"],
    signal: AbortSignal,
  ): Promise<Extraction>;
  claimTransaction(
    admission: SourceInputAdmission,
    provider: HollowUnitOfWorkProvider,
    work: (u: HollowUnitOfWorkContext) => Promise<MachineClaimResult>,
  ): Promise<{ result: MachineClaimResult; lease: SourceInputLease | null }>;
}
export interface MachinePredecessorOwner {
  readonly receipt: Extract<SourceInputReceipt, { state: "closed" }>;
}
export type MachinePredecessor =
  | Readonly<{ kind: "input"; proof: LlmPredecessorInputProof }>
  | Readonly<{ kind: "owner"; proof: MachinePredecessorOwner }>;
export interface MachineRuntimeOwnership extends LlmLocalRuntimeOwnership {
  machinePredecessor(value: MachineRegeneration): MachinePredecessor | null;
  pendingMachinePredecessors(runtimeId: string): readonly MachinePredecessor[];
  verifyMachinePredecessor(
    predecessor: MachinePredecessor,
    value: MachineRegeneration,
  ): boolean;
  consumeMachinePredecessor(predecessor: MachinePredecessor): void;
}
export type MachineAdmission = Readonly<{
  candidate: MachineRegeneration;
  admission: SourceInputAdmission;
  receipt: ActiveInputReceipt;
}>;
export type MachineOwnedInput = Readonly<{
  value: MachineRegeneration;
  lease: SourceInputLease;
  proof: SourceInputProof | null;
}>;
export interface MachineProgress {
  admission(id: string): MachineAdmission | null;
  admissions(): readonly MachineAdmission[];
  retainAdmission(value: MachineAdmission): void;
  releaseAdmission(id: string): void;
  owned(id: string): MachineOwnedInput | null;
  inputs(): readonly MachineOwnedInput[];
  retainInput(value: MachineOwnedInput): void;
  releaseInput(id: string): void;
  pendingCompletion(id: string): MachineOwnedInput | null;
  awaitCompletion(value: MachineOwnedInput): Promise<void>;
  confirmCompletion(value: MachineOwnedInput): Promise<boolean>;
}
export interface MachineExecution extends LlmExecution {
  confirmClosed(jobId: string, proof: SourceInputProof): Promise<boolean>;
}
export type MachineServices = RegenerationServices &
  Readonly<{
    input: MachineRegenerationInput;
    local: LlmSourceReader;
    execution: MachineExecution;
    ownership: MachineRuntimeOwnership;
    progress: MachineProgress;
    extractor: DocumentExtractor;
    wake(): void;
  }>;
export type RegenerationSourceRequest = Readonly<{
  record: DriveBackupRecord;
  accessToken: string;
  resourceKey: string | null;
  signal: AbortSignal;
  checkCurrent(): Promise<void>;
}>;
export interface RegenerationSourceProvider {
  readInto(input: RegenerationSourceRequest, sink: SourceSink): Promise<void>;
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

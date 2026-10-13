import type { ObjectStorage } from "../ports/objectStorage";
import type { LlmAudioPreparer, LlmTranscriber } from "./audioPorts";
import type {
  LlmPdfClassifier,
  LlmPdfPagesPreparer,
} from "./pdfClassificationPorts";
import type {
  LlmDriveInputStage,
  LlmExecution,
  LlmGenerator,
  LlmInputStage,
  LlmLeasedRuntimeOwnership,
  LlmLocalInputStage,
  LlmLocalRuntimeOwnership,
  LlmModelProfiles,
  LlmResultProcessor,
  LlmRuntimeOwnership,
  LlmSourcePreparer,
  LlmSourceReader,
} from "./ports";

export type LlmServices = Readonly<{
  configured: boolean;
  audio?: Readonly<{ preparer: LlmAudioPreparer; transcriber: LlmTranscriber }>;
  storage: ObjectStorage;
  source: LlmSourceReader;
  preparer: LlmSourcePreparer;
  pdfClassifier: LlmPdfClassifier;
  pdfPages: LlmPdfPagesPreparer;
  profiles: LlmModelProfiles;
  generator: LlmGenerator;
  result: LlmResultProcessor;
  execution: LlmExecution;
  monthlyLimit: number;
  wake(): void;
}> &
  (
    | Readonly<{
        inputMode: "legacy-local";
        ownership: LlmRuntimeOwnership;
        inputStage?: never;
      }>
    | Readonly<{
        inputMode: "leased-text";
        ownership: LlmLeasedRuntimeOwnership;
        inputStage: LlmInputStage;
      }>
    | Readonly<{
        inputMode: "leased-local-v2";
        sourceMode?: never;
        ownership: LlmLocalRuntimeOwnership;
        inputStage: LlmLocalInputStage;
      }>
    | Readonly<{
        inputMode: "leased-local-v2";
        sourceMode: "drive";
        ownership: LlmLocalRuntimeOwnership;
        inputStage: LlmDriveInputStage;
      }>
  );

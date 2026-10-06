import type { ObjectStorage } from "../ports/objectStorage";
import type {
  LlmPdfClassifier,
  LlmPdfPagesPreparer,
} from "./pdfClassificationPorts";
import type {
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
        ownership: LlmLocalRuntimeOwnership;
        inputStage: LlmLocalInputStage;
      }>
  );

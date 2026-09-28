import type { ObjectStorage } from "../ports/objectStorage";
import type {
  LlmPdfClassifier,
  LlmPdfPagesPreparer,
} from "./pdfClassificationPorts";
import type {
  LlmExecution,
  LlmGenerator,
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
  ownership: LlmRuntimeOwnership;
  monthlyLimit: number;
  wake(): void;
}>;

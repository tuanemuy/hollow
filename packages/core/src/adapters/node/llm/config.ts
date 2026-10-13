import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { DriveServices } from "@repo/core/application/integration/drive/ports";
import type { AudioNativeTools } from "@repo/core/application/llm/audioPorts";
import {
  type LlmModelProfiles,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import type { LlmServices } from "@repo/core/application/llm/services";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import {
  type RegenerationSourceProvider,
  regenerationServices,
} from "@repo/core/application/regeneration/services";
import {
  createNodeRegeneration,
  type NodeRegenerationResources,
} from "../regeneration/config";
import { NodeRegenerationInput } from "../regeneration/input";
import { NodeLlmAudioPreparer } from "./audioPreparer";
import { validateAudioTools } from "./audioTools";
import { NodeLlmGenerator } from "./generator";
import { NodeLlmResultProcessor } from "./resultProcessor";
import { NodeLlmTranscriber } from "./transcriber";

export type NodeLlmOptions = Readonly<{
  shared?: NodeRegenerationResources;
  audioTools?: AudioNativeTools;
  source?: Readonly<{
    provider: RegenerationSourceProvider;
    drive: DriveServices;
  }>;
  storage: ObjectStorage;
  directory: string;
  workerPath: string;
  documentWorkerPath: string;
  imageChildPath: string;
  pdfPagesChildPath: string;
  profiles: LlmModelProfiles | undefined;
  monthlyLimit: string | undefined;
  wake(): void;
}>;
export async function createNodeLlm(
  base: HollowContainer,
  options: NodeLlmOptions,
): Promise<LlmServices> {
  const monthlyLimit =
    options.monthlyLimit === undefined
      ? 30
      : /^(0|[1-9][0-9]*)$/.test(options.monthlyLimit)
        ? Number(options.monthlyLimit)
        : Number.NaN;
  const validLimit = Number.isSafeInteger(monthlyLimit) && monthlyLimit >= 0;
  if (!validLimit) base.logger.error("LLM_MONTHLY_LIMIT_CONFIGURATION_INVALID");
  const shared =
    options.shared ?? (await createNodeRegeneration(base, options));
  const {
    ownership,
    local: source,
    preparer,
    pdfPages,
    pdfClassifier,
    input,
    execution,
  } = shared;
  if (options.audioTools) await validateAudioTools(options.audioTools);
  const audio = options.audioTools
    ? {
        preparer: new NodeLlmAudioPreparer(
          options.audioTools,
          options.directory,
        ),
        transcriber: new NodeLlmTranscriber(),
      }
    : undefined;
  const inputStage = new NodeRegenerationInput(
    options.source ? { ...base, drive: options.source.drive } : base,
    options.source
      ? regenerationServices(
          input,
          source,
          options.source.provider,
          options.source.drive,
        )
      : { input, local: source },
    audio?.preparer,
  );
  inputStage.configureRuntime(ownership.runtimeId, ownership);
  return {
    inputMode: "leased-local-v2",
    ...(audio ? { audio } : {}),
    ...(options.source ? { sourceMode: "drive" as const } : {}),
    inputStage,
    configured: validLimit && options.profiles !== undefined,
    monthlyLimit: validLimit ? monthlyLimit : 0,
    ownership,
    execution,
    storage: options.storage,
    source,
    preparer,
    pdfPages,
    pdfClassifier,
    generator: new NodeLlmGenerator(),
    result: new NodeLlmResultProcessor(),
    profiles: options.profiles ?? {
      inspect: async () => {
        throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
      },
    },
    wake: options.wake,
  };
}

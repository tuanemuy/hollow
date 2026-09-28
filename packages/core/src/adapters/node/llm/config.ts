import path from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import {
  type LlmModelProfiles,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import type { LlmServices } from "@repo/core/application/llm/services";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import { NodeLlmExecution } from "./execution";
import { NodeLlmGenerator } from "./generator";
import { NodeLlmResultProcessor } from "./resultProcessor";
import { NodeLlmRuntimeOwnership } from "./runtimeOwnership";
import { NodeLlmSourcePreparer } from "./sourcePreparer";
import { NodeLlmSourceReader } from "./sourceReader";

export type NodeLlmOptions = Readonly<{
  storage: ObjectStorage;
  directory: string;
  workerPath: string;
  documentWorkerPath: string;
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
  const ownership = await NodeLlmRuntimeOwnership.acquire(
    path.join(options.directory, ".llm-runtime"),
  );
  return {
    configured: validLimit && options.profiles !== undefined,
    monthlyLimit: validLimit ? monthlyLimit : 0,
    ownership,
    execution: new NodeLlmExecution(ownership, base.clock),
    storage: options.storage,
    source: new NodeLlmSourceReader(options.storage),
    preparer: new NodeLlmSourcePreparer(
      options.workerPath,
      options.documentWorkerPath,
    ),
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

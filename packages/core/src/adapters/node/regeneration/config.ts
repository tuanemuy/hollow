import path from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { DriveServices } from "@repo/core/application/integration/drive/ports";
import type { DocumentExtractor } from "@repo/core/application/ports/documentExtractor";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import type { MachineServices } from "@repo/core/application/regeneration/services";
import {
  type RegenerationSourceProvider,
  regenerationServices,
} from "@repo/core/application/regeneration/services";
import { sameMachineSource } from "@repo/core/domain/regeneration/machine";
import { IsolatedDocumentExtractor } from "../import/documentExtractor";
import { NodeLlmDocumentPreparer } from "../llm/documentPreparer";
import { NodeLlmExecution } from "../llm/execution";
import { NodeLlmPdfClassifier } from "../llm/pdfClassifier";
import { NodeLlmPdfPagesPreparer } from "../llm/pdfPagesPreparer";
import { NodeLlmRuntimeOwnership } from "../llm/runtimeOwnership";
import { NodeLlmSourcePreparer } from "../llm/sourcePreparer";
import { NodeLlmSourceReader } from "../llm/sourceReader";
import { NodeRegenerationMemory } from "./memory";
import { NodeMachineProgress } from "./runner";
export type NodeRegenerationOptions = Readonly<{
  extractor?: DocumentExtractor;
  storage: ObjectStorage;
  directory: string;
  workerPath: string;
  documentWorkerPath: string;
  imageChildPath: string;
  pdfPagesChildPath: string;
}>;
export async function createNodeRegeneration(
  c: HollowContainer,
  options: NodeRegenerationOptions,
) {
  const ownership = await NodeLlmRuntimeOwnership.acquire(
    path.join(options.directory, ".llm-runtime"),
  );
  const local = new NodeLlmSourceReader(options.storage);
  const preparer = new NodeLlmSourcePreparer(
    options.workerPath,
    options.documentWorkerPath,
    options.imageChildPath,
    options.pdfPagesChildPath,
  );
  const pdfPages = new NodeLlmPdfPagesPreparer(options.pdfPagesChildPath);
  const pdfClassifier = new NodeLlmPdfClassifier(
    new NodeLlmDocumentPreparer(options.documentWorkerPath),
    pdfPages,
  );
  const extractor = options.extractor ?? new IsolatedDocumentExtractor();
  const input = new NodeRegenerationMemory(
    preparer,
    pdfClassifier,
    pdfPages,
    extractor,
  );
  const verify = async (
    jobId: string,
    proof: import("@repo/core/application/regeneration/services").SourceInputProof,
  ) => {
    const owned = progress.owned(jobId);
    if (
      !owned ||
      owned.proof !== proof ||
      !input.consumed(proof, owned.lease) ||
      owned.value.owner.runtimeId !== proof.receipt.runtimeId ||
      owned.value.owner.token !== proof.receipt.token ||
      owned.lease.receipt.generation !== proof.receipt.generation
    )
      return false;
    return c.unitOfWorkProvider.run(async (u) => {
      const value = await u.machineRegenerations.find(jobId);
      return (
        !!value &&
        sameMachineSource(value, owned.value) &&
        value.phase === "terminal" &&
        value.outcome !== "unknown" &&
        value.owner.state === "closed" &&
        value.sourceMemoryBytes === 0 &&
        value.inputReceipt?.state === "closed" &&
        value.inputReceipt.proofId === proof.receipt.proofId &&
        value.inputReceipt.generation === proof.receipt.generation &&
        value.inputReceipt.consumer.kind === proof.receipt.consumer.kind &&
        value.inputReceipt.consumer.id === proof.receipt.consumer.id
      );
    });
  };
  const progress = new NodeMachineProgress(
    (value) =>
      !!value.proof &&
      (input.verify(value.proof, value.proof.receipt) ||
        input.consumed(value.proof, value.lease)),
    (value) =>
      value.proof
        ? verify(value.value.id, value.proof)
        : Promise.resolve(false),
  );
  const execution = new NodeLlmExecution(ownership, c.clock, verify);
  return {
    ownership,
    local,
    preparer,
    pdfPages,
    pdfClassifier,
    extractor,
    input,
    execution,
    progress,
  };
}
export type NodeRegenerationResources = Awaited<
  ReturnType<typeof createNodeRegeneration>
>;
export function createNodeMachine(
  shared: NodeRegenerationResources,
  wake: () => void,
  source?: Readonly<{
    provider: RegenerationSourceProvider;
    drive: DriveServices;
  }>,
): MachineServices {
  return source
    ? {
        ...shared,
        ...regenerationServices(
          shared.input,
          shared.local,
          source.provider,
          source.drive,
        ),
        input: shared.input,
        wake,
      }
    : { ...shared, wake };
}

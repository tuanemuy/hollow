import { BusinessRuleError } from "@repo/core/domain/error";
import { retainedBackupRecord } from "@repo/core/domain/integration/driveBackupRepository";
import { AUDIO_LIMITS } from "@repo/core/domain/llm/audio";
import { sourceBindingSchema } from "@repo/core/domain/regeneration/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import {
  driveLlmGeneration,
  findCurrentDriveSource,
  regenerationRecordState,
  requireRegenerationNote,
} from "../regeneration/current";
import { llmAdmissionSource } from "./admissionSource";
import { readyPdfPreview } from "./pdfPreview";
import { admitLlm } from "./request";

export type DriveLlmRequest = Readonly<{
  noteId: string;
  noteVersion: number;
  recordId: string;
  commandId: string;
  expectedEpoch: number;
  modelId: string;
  sttModelId?: string | undefined;
  instruction: string;
  confirmed: true;
  pdfPreviewId?: string | undefined;
}>;

export function driveLlmIntent(input: DriveLlmRequest) {
  return JSON.stringify([
    "drive-llm-request/v1",
    1,
    1,
    input.noteId,
    input.noteVersion,
    input.recordId,
    "llm",
    input.expectedEpoch,
    input.modelId,
    input.sttModelId ?? null,
    input.instruction,
    input.pdfPreviewId ?? null,
  ]);
}

export async function requestDriveLlmRegeneration(
  c: HollowContainer,
  token: string | null,
  input: DriveLlmRequest,
) {
  const service = c.llm;
  if (
    !service?.configured ||
    service.inputMode !== "leased-local-v2" ||
    service.sourceMode !== "drive" ||
    !c.openRouter
  )
    throw new BusinessRuleError(
      "LLM_UNCONFIGURED",
      "本文生成は現在利用できません。",
    );
  const digest = c.tokens.hash(driveLlmIntent(input));
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const { account, note } = await requireRegenerationNote(
      c,
      u,
      token,
      input.noteId,
    );
    if (await u.machineRegenerations.command(account.id, input.commandId))
      throw new ConflictError(
        "REGENERATION_COMMAND_CHANGED",
        "操作の内容が一致しません。",
      );
    const prior = await u.llmConversions.command(account.id, input.commandId);
    if (prior) {
      if (
        prior.noteId !== note.id ||
        prior.requestDigest !== digest ||
        prior.access.origin !== "drive-record"
      )
        throw new ConflictError(
          "REGENERATION_COMMAND_CHANGED",
          "操作の内容が一致しません。",
        );
      const connection = await u.openRouterConnections.find(account.id);
      if (
        connection?.state !== "linked" ||
        connection.epoch !== prior.credentialEpoch ||
        (connection.keyExpiresAt && connection.keyExpiresAt <= c.clock.now()) ||
        !(await findCurrentDriveSource(u, {
          consumer: { kind: "llm-conversion", id: prior.jobId },
          access: prior.access,
          executorId: account.id,
          noteId: note.id,
          originalId: prior.source.originalId,
          ownershipGeneration: await driveLlmGeneration(u, prior),
          source: prior.source,
          fingerprint: prior.requestDigest,
        }))
      )
        throw new BusinessRuleError(
          "REGENERATION_SOURCE_INVALID",
          "取得元は現在利用できません。",
        );
      return { jobId: prior.jobId, noteId: prior.noteId };
    }
    if (note.version !== input.noteVersion)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "本文が更新されました。最新の本文を確認してください。",
      );
    const record = await u.regenerationRecords.find(note.id, input.recordId);
    if (
      !record ||
      retainedBackupRecord(record) ||
      (await regenerationRecordState(u, note.id, record)).availability !==
        "available"
    )
      throw new BusinessRuleError(
        "REGENERATION_SOURCE_INVALID",
        "取得元は現在利用できません。",
      );
    const original = await u.imports.findOriginal(record.originalId);
    const drive = await u.driveConnections.find(record.accountId);
    const connection = await u.openRouterConnections.find(account.id);
    if (
      !original ||
      original.bytes >
        (original.format === "audio" ? AUDIO_LIMITS.sourceBytes : 52_428_800)
    )
      throw new BusinessRuleError(
        "LLM_FORMAT_UNAVAILABLE",
        "この形式は未提供です。",
      );
    const admission = llmAdmissionSource(
      original,
      input.modelId,
      input.sttModelId,
    );
    if (
      drive?.state !== "linked" ||
      drive.credential.subject !== record.subject
    )
      throw new BusinessRuleError(
        "REGENERATION_SOURCE_INVALID",
        "取得元は現在利用できません。",
      );
    if (
      connection?.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      (connection.keyExpiresAt && connection.keyExpiresAt <= c.clock.now())
    )
      throw new ConflictError(
        "OPENROUTER_CONNECTION_CHANGED",
        "現在の連携を確認してから、改めて変換を開始してください。",
      );
    if (
      original.state === "processing" ||
      (await u.llmConversions.activeForNote(note.id)) ||
      (await u.machineRegenerations.activeForNote(note.id))
    )
      throw new BusinessRuleError(
        "NOTE_PROCESSING",
        "変換中は再生成できません。",
      );
    const now = c.clock.now();
    const preview =
      original.format === "pdf"
        ? input.pdfPreviewId
          ? await readyPdfPreview(
              u,
              account.id,
              {
                previewId: input.pdfPreviewId,
                noteId: note.id,
                noteVersion: note.version,
                expectedEpoch: input.expectedEpoch,
                recordId: record.id,
              },
              now,
            )
          : null
        : null;
    if (original.format === "pdf" && !preview)
      throw new ConflictError(
        "LLM_PDF_PREVIEW_REQUIRED",
        "Drive原本の用途を確認してから開始してください。",
      );
    if (original.format !== "pdf" && input.pdfPreviewId)
      throw new ConflictError(
        "LLM_SOURCE_CHANGED",
        "原本の形式が更新されました。",
      );
    const jobId = c.idGenerator.next();
    const batchId = c.idGenerator.next();
    const binding = sourceBindingSchema.parse({
      id: c.idGenerator.next(),
      recordId: record.id,
      executorId: account.id,
      credentialOwnerId: record.accountId,
      noteId: note.id,
      originalId: original.id,
      subject: record.subject,
      driveEpoch: drive.epoch,
      ownershipGeneration: await u.driveBackupTransfers.sourceGeneration(
        note.id,
      ),
      fingerprint: digest,
      consumer: { kind: "llm-conversion", id: jobId },
      cancelGeneration: 0,
      version: 1,
      createdAt: now,
    });
    await u.regenerationBindings.insert(binding);
    await u.imports.insertBatch({
      requestedVisibility: "private",
      id: batchId,
      accountId: account.id,
      workspaceId:
        note.owner.kind === "workspace" ? note.owner.workspaceId : null,
      createdAt: now,
      useAi: true,
      cancelledAt: null,
    });
    await u.jobs.insert({
      id: jobId,
      batchId,
      originalId: original.id,
      accountId: account.id,
      noteId: note.id,
      noteVersion: note.version,
      useAi: true,
      createdAt: now,
      updatedAt: now,
      attempt: 0,
      retryOf: null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    await admitLlm(c, u, {
      jobId,
      accountId: account.id,
      commandId: input.commandId,
      requestDigest: digest,
      note,
      source: admission,
      operation: "regenerate",
      instruction: input.instruction,
      epoch: input.expectedEpoch,
      retryOf: null,
      sourceBinding: binding,
      ...(preview
        ? {
            pdf: {
              kind: "classified" as const,
              choice: preview.result,
              ownershipGeneration: preview.ownershipGeneration,
            },
          }
        : {}),
    });
    if (
      preview &&
      !(await u.llmPdfPreviews.consume(preview.id, preview.version, jobId, now))
    )
      throw new ConflictError(
        "LLM_PDF_PREVIEW_CHANGED",
        "用途確認が更新されました。確認し直してください。",
      );
    return { jobId, noteId: note.id };
  });
  service.wake();
  return result;
}

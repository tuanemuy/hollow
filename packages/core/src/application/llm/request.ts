import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import {
  isLlmDocumentFormat,
  isLlmLegacyFormat,
  LLM_LIMITS,
  type LlmConversion,
  type LlmFixedConversion,
  type LlmPendingPdfConversion,
  type LlmSourceContract,
  llmInstruction,
} from "@repo/core/domain/llm/entity";
import {
  type PdfCandidateModels,
  type PdfChoice,
  pdfChoiceMatchesSource,
} from "@repo/core/domain/llm/pdfPreview";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import type { Note } from "@repo/core/domain/note/entity";
import type { SourceBinding } from "@repo/core/domain/regeneration/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitNote, ensureRevisionHead } from "../note/commitNote";
import { requireNote } from "../workspace/access";
import { readyPdfPreview } from "./pdfPreview";

export async function admitLlm(
  container: HollowContainer,
  u: HollowUnitOfWorkContext,
  input: Readonly<{
    jobId: string;
    accountId: string;
    commandId: string;
    requestDigest: string;
    note: Note;
    original: Original;
    operation: "import" | "regenerate";
    modelId: string;
    instruction: string;
    epoch: number;
    retryOf: string | null;
    sourceBinding?: SourceBinding;
    pdf?: Readonly<
      | { kind: "pending"; candidates: PdfCandidateModels }
      | { kind: "classified"; choice: PdfChoice; ownershipGeneration: number }
    >;
  }>,
) {
  const service = container.llm;
  if (!service?.configured)
    throw new BusinessRuleError(
      "LLM_UNCONFIGURED",
      "本文生成は現在利用できません。",
    );
  const format = input.original.format;
  if (input.sourceBinding) {
    const binding = await u.regenerationBindings.find(input.sourceBinding.id);
    if (
      !binding ||
      binding.consumer.kind !== "llm-conversion" ||
      binding.consumer.id !== input.jobId ||
      binding.executorId !== input.accountId ||
      binding.noteId !== input.note.id ||
      binding.originalId !== input.original.id ||
      binding.fingerprint !== input.requestDigest ||
      binding.cancelGeneration !== 0
    )
      throw new ConflictError(
        "REGENERATION_SOURCE_INVALID",
        "取得元が更新されました。",
      );
  }
  const source = {
    kind: "original" as const,
    originalId: input.original.id,
    sha256: input.original.sha256,
    bytes: input.original.bytes,
  };
  let contract: Exclude<LlmSourceContract, { preparationVersion: 4 }>;
  if (isLlmLegacyFormat(format))
    contract = {
      source: { ...source, format },
      preparationVersion: 1,
      promptVersion: 1,
    };
  else if (isLlmDocumentFormat(format))
    contract = {
      source: { ...source, format },
      preparationVersion: 2,
      promptVersion: 1,
    };
  else if (format === "image")
    contract = {
      source: { ...source, format },
      preparationVersion: 3,
      promptVersion: 2,
    };
  else
    throw new BusinessRuleError(
      "LLM_FORMAT_UNAVAILABLE",
      "この形式は未提供です。",
    );
  if (
    (await u.llmConversions.queued(input.accountId)) >= LLM_LIMITS.accountQueued
  )
    throw new BusinessRuleError(
      "LLM_QUEUE_LIMIT",
      "待機中の変換が多いため、完了後にお試しください。",
    );
  const now = container.clock.now();
  const head = await ensureRevisionHead(u, input.note);
  const base = {
    access: input.sourceBinding
      ? { origin: "drive-record" as const, bindingId: input.sourceBinding.id }
      : { origin: "local-original" as const, bindingId: null },
    sourceMemoryBytes: 0 as const,
    inputReceipt: null,
    jobId: input.jobId,
    accountId: input.accountId,
    noteId: input.note.id,
    commandId: input.commandId,
    requestDigest: input.requestDigest,
    operation: input.operation,
    retryOf: input.retryOf,
    sourceState: input.original.state,
    sourceCoverage: input.original.coverage,
    noteVersion: input.note.version,
    originalRevisionNo: head.currentNo,
    credentialEpoch: input.epoch,
    instruction: llmInstruction(input.instruction),
    admissionSequence: await u.llmConversions.admit(input.accountId),
    createdAt: now,
    deadlineAt: new Date(now.getTime() + LLM_LIMITS.jobMs),
    updatedAt: now,
    phase: "queued" as const,
    outcome: { kind: "pending" as const },
    owner: { state: "idle" as const, token: null, runtimeId: null },
    cancelGeneration: 0,
    responseBudget: 0,
    version: 1,
  };
  let value: LlmConversion;
  if (format === "pdf") {
    const generation = await u.llmPdfPreviews.sourceGeneration(input.note.id);
    if (generation === null || !input.pdf)
      throw new ConflictError(
        "LLM_PDF_PREVIEW_REQUIRED",
        "PDFの用途を確認してから開始してください。",
      );
    const pdfSource = { ...source, format: "pdf" as const };
    if (input.pdf.kind === "pending") {
      if (input.operation !== "import")
        throw new ConflictError(
          "LLM_PDF_PREVIEW_REQUIRED",
          "PDFの用途を確認してから開始してください。",
        );
      value = {
        ...base,
        operation: "import",
        selection: "pdf-pending",
        source: pdfSource,
        candidates: input.pdf.candidates,
        sourceOwnershipGeneration: generation,
      } satisfies LlmPendingPdfConversion;
    } else {
      const choice = input.pdf.choice;
      if (
        input.pdf.ownershipGeneration !== generation ||
        !pdfChoiceMatchesSource(choice, pdfSource)
      )
        throw new ConflictError(
          "LLM_SOURCE_CHANGED",
          "原本が更新されました。用途を確認し直してください。",
        );
      const fixed = {
        ...base,
        selection: "fixed" as const,
        source: pdfSource,
        modelId: input.modelId,
        sourceOwnershipGeneration: generation,
      };
      value =
        choice.kind === "strict-text"
          ? {
              ...fixed,
              preparationVersion: 2,
              promptVersion: 1,
              pdfProof: choice,
            }
          : {
              ...fixed,
              preparationVersion: 4,
              promptVersion: 3,
              manifest: choice.manifest,
              pdfProof: choice,
            };
    }
  } else {
    if (input.pdf)
      throw new ConflictError(
        "LLM_SOURCE_CHANGED",
        "原本の形式が更新されました。",
      );
    value = {
      ...base,
      ...contract,
      selection: "fixed",
      modelId: input.modelId,
      pdfProof: null,
      sourceOwnershipGeneration: null,
    } satisfies LlmFixedConversion;
  }
  await u.llmConversions.insert(value);
  if (
    !(await u.llmQuota.reserve(
      value.jobId,
      value.accountId,
      now,
      service.monthlyLimit,
    ))
  ) {
    const failed: LlmConversion = {
      ...value,
      phase: "terminal",
      outcome: { kind: "failed", code: "LLM_MONTHLY_LIMIT" },
      version: 2,
    };
    if (!(await u.llmConversions.replace(failed, value.version)))
      throw new ConflictError(
        "LLM_REQUEST_CHANGED",
        "変換受付が更新されました。",
      );
    await u.imports.saveOriginal({
      ...input.original,
      activeJobId: value.jobId,
      state: value.operation === "regenerate" ? value.sourceState : "failed",
    });
    if (value.operation === "import")
      await commitNote(container, u, {
        previous: input.note,
        note: {
          ...input.note,
          display: completeDisplay(
            input.note.display,
            "conversion",
            value.jobId,
            false,
          ),
        },
        actor: { kind: "system", jobId: value.jobId },
        cause: "import",
      });
    return failed;
  }
  await u.imports.saveOriginal({
    ...input.original,
    activeJobId: value.jobId,
    state: "processing",
  });
  return value;
}

export type RegenerateLlmInput = Readonly<{
  noteId: string;
  noteVersion: number;
  commandId: string;
  expectedEpoch: number;
  modelId: string;
  instruction: string;
  confirmed: true;
  retryOf?: string | undefined;
  previewId?: string | undefined;
}>;
export async function requestLlmRegeneration(
  container: HollowContainer,
  token: string | null,
  input: RegenerateLlmInput,
) {
  const digest = container.tokens.hash(JSON.stringify(input));
  const result = await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    if (await u.machineRegenerations.command(account.id, input.commandId))
      throw new ConflictError(
        "REGENERATION_COMMAND_CHANGED",
        "操作の内容が一致しません。",
      );
    const prior = await u.llmConversions.command(account.id, input.commandId);
    if (prior) {
      if (prior.requestDigest !== digest)
        throw new ConflictError(
          "LLM_COMMAND_REUSED",
          "受付識別子は別の内容に使えません。",
        );
      await requireNote(
        u,
        await u.notes.findById(prior.noteId),
        account.id,
        "edit",
      );
      return { jobId: prior.jobId, noteId: prior.noteId };
    }
    if (!container.llm?.configured || !container.openRouter)
      throw new BusinessRuleError(
        "LLM_UNCONFIGURED",
        "本文生成は現在利用できません。",
      );
    const note = await requireNote(
      u,
      await u.notes.findById(input.noteId),
      account.id,
      "edit",
    );
    if (note.version !== input.noteVersion)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "本文が更新されました。最新の本文を確認してください。",
      );
    const original = await u.imports.findByNote(note.id);
    if (!original)
      throw new NotFoundError(
        "ORIGINAL_NOT_FOUND",
        "再生成できる原本がありません。",
      );
    const connection = await u.openRouterConnections.find(account.id);
    if (
      connection?.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      (connection.keyExpiresAt &&
        connection.keyExpiresAt <= container.clock.now())
    )
      throw new ConflictError(
        "OPENROUTER_CONNECTION_CHANGED",
        "現在の連携を確認してから、改めて変換を開始してください。",
      );
    const preview =
      original.format === "pdf"
        ? input.previewId
          ? await readyPdfPreview(
              u,
              account.id,
              { ...input, previewId: input.previewId },
              container.clock.now(),
            )
          : null
        : null;
    if (
      (original.format === "pdf" && !preview) ||
      (original.format !== "pdf" && input.previewId)
    )
      throw new ConflictError(
        "LLM_PDF_PREVIEW_REQUIRED",
        "PDFの用途を確認してから開始してください。",
      );
    if (input.retryOf) {
      const old = await u.llmConversions.find(input.retryOf);
      if (
        !old ||
        old.accountId !== account.id ||
        old.noteId !== note.id ||
        old.outcome.kind === "pending" ||
        old.outcome.kind === "succeeded" ||
        old.owner.state === "active" ||
        old.owner.state === "unknown"
      )
        throw new BusinessRuleError(
          "JOB_NOT_RETRYABLE",
          "この変換は再試行できません。",
        );
      const existing = await u.jobs.findRetry(old.jobId);
      if (existing) {
        const retry = await u.llmConversions.find(existing.id);
        if (
          !retry ||
          retry.accountId !== account.id ||
          retry.selection !== "fixed" ||
          retry.modelId !== input.modelId ||
          retry.instruction !== input.instruction ||
          retry.credentialEpoch !== input.expectedEpoch
        )
          throw new ConflictError(
            "LLM_RETRY_CHANGED",
            "この再試行は別の設定で受け付け済みです。",
          );
        return { jobId: existing.id, noteId: existing.noteId };
      }
    }
    if (
      original.state === "processing" ||
      (await u.llmConversions.activeForNote(note.id))
    )
      throw new BusinessRuleError(
        "NOTE_PROCESSING",
        "変換中は再生成できません。",
      );
    const now = container.clock.now();
    const batchId = container.idGenerator.next();
    const jobId = container.idGenerator.next();
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
      retryOf: input.retryOf ?? null,
      state: "queued",
      leaseToken: null,
      leaseUntil: null,
      failure: null,
    });
    await admitLlm(container, u, {
      jobId,
      accountId: account.id,
      commandId: input.commandId,
      requestDigest: digest,
      note,
      original,
      operation: "regenerate",
      modelId: input.modelId,
      instruction: input.instruction,
      epoch: input.expectedEpoch,
      retryOf: input.retryOf ?? null,
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
  container.llm?.wake();
  return result;
}

export async function retryLlmJob(
  container: HollowContainer,
  token: string | null,
  jobId: string,
) {
  const request = await container.unitOfWorkProvider.run(async (u) => {
    const account = await requireAccount(container, u.accounts, token);
    const old = await u.llmConversions.find(jobId);
    if (!old) return null;
    if (old.accountId !== account.id)
      throw new NotFoundError("JOB_NOT_FOUND", "処理が見つかりません。");
    if (old.access.origin !== "local-original")
      throw new ConflictError(
        "LLM_RETRY_SOURCE_CHANGED",
        "取得元と設定を確認し、新しい変換として開始してください。",
      );
    const note = await requireNote(
      u,
      await u.notes.findById(old.noteId),
      account.id,
      "edit",
    );
    const existing = await u.jobs.findRetry(jobId);
    if (existing) {
      const retry = await u.llmConversions.find(existing.id);
      const original = await u.imports.findByNote(note.id);
      if (
        !retry ||
        retry.accountId !== account.id ||
        retry.noteId !== note.id ||
        retry.retryOf !== old.jobId ||
        retry.credentialEpoch !== old.credentialEpoch ||
        original?.activeJobId !== retry.jobId ||
        original.id !== retry.source.originalId ||
        original.sha256 !== retry.source.sha256 ||
        original.bytes !== retry.source.bytes
      )
        throw new ConflictError(
          "LLM_RETRY_CHANGED",
          "再試行の取得元が更新されました。",
        );
      return { existing: { jobId: existing.id, noteId: existing.noteId } };
    }
    const connection = await u.openRouterConnections.find(account.id);
    if (
      connection?.state !== "linked" ||
      connection.epoch !== old.credentialEpoch
    )
      throw new ConflictError(
        "LLM_RETRY_NEW_CONNECTION",
        "連携が変わりました。元のモデルと追加指示を確認し、新しい変換として明示的に開始してください。",
      );
    if (note.version !== old.noteVersion)
      throw new ConflictError(
        "LLM_RETRY_BODY_CHANGED",
        "元の変換後に本文が変わりました。再生成画面で置き換えを確認してください。",
      );
    if (old.operation === "import" && old.outcome.kind === "failed") {
      const previous = await u.jobs.find(old.jobId);
      const original = await u.imports.findByNote(note.id);
      const batch = previous
        ? await u.imports.findBatch(previous.batchId)
        : null;
      if (
        old.phase !== "terminal" ||
        (old.owner.state !== "closed" && old.owner.state !== "idle") ||
        old.sourceMemoryBytes !== 0 ||
        (old.inputReceipt !== null && old.inputReceipt.state !== "closed") ||
        !previous ||
        previous.state !== "failed" ||
        previous.accountId !== account.id ||
        !batch ||
        batch.accountId !== account.id ||
        !original ||
        original.activeJobId !== old.jobId ||
        original.id !== old.source.originalId ||
        original.sha256 !== old.source.sha256 ||
        original.bytes !== old.source.bytes ||
        original.format !== old.source.format ||
        original.state === "processing" ||
        original.state === "ready" ||
        (await u.llmConversions.activeForNote(note.id))
      )
        throw new BusinessRuleError(
          "JOB_NOT_RETRYABLE",
          "この変換は再試行できません。",
        );
      if (
        old.source.format === "pdf" &&
        (await u.llmPdfPreviews.sourceGeneration(note.id)) !==
          old.sourceOwnershipGeneration
      )
        throw new ConflictError(
          "LLM_SOURCE_CHANGED",
          "原本の所有が更新されました。用途を確認し直してください。",
        );
      const now = container.clock.now();
      const nextId = container.idGenerator.next();
      const commandId = container.idGenerator.next();
      await u.jobs.insert({
        ...previous,
        id: nextId,
        noteVersion: note.version,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: old.jobId,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      });
      await admitLlm(container, u, {
        jobId: nextId,
        accountId: account.id,
        commandId,
        requestDigest: container.tokens.hash(
          JSON.stringify(["import-retry", old.jobId, commandId]),
        ),
        note,
        original,
        operation: "import",
        modelId:
          old.selection === "fixed" ? old.modelId : old.candidates.textModelId,
        instruction: old.instruction,
        epoch: old.credentialEpoch,
        retryOf: old.jobId,
        ...(old.selection === "pdf-pending"
          ? { pdf: { kind: "pending" as const, candidates: old.candidates } }
          : old.pdfProof !== null && old.sourceOwnershipGeneration !== null
            ? {
                pdf: {
                  kind: "classified" as const,
                  choice: old.pdfProof,
                  ownershipGeneration: old.sourceOwnershipGeneration,
                },
              }
            : {}),
      });
      return { existing: { jobId: nextId, noteId: note.id } };
    }
    if (old.selection !== "fixed" || old.source.format === "pdf")
      throw new ConflictError(
        "LLM_PDF_PREVIEW_REQUIRED",
        "再生成画面でPDFの用途とモデルを確認してください。",
      );
    return {
      input: {
        noteId: note.id,
        noteVersion: note.version,
        commandId: container.idGenerator.next(),
        expectedEpoch: old.credentialEpoch,
        modelId: old.modelId,
        instruction: old.instruction,
        confirmed: true as const,
        retryOf: old.jobId,
      },
    };
  });
  if (!request) return null;
  container.llm?.wake();
  return "existing" in request
    ? request.existing
    : requestLlmRegeneration(container, token, request.input);
}

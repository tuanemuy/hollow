import { BusinessRuleError } from "@repo/core/domain/error";
import { defaultOpenRouterModels } from "@repo/core/domain/integration/openRouter";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  type PdfClassificationFailure,
  type PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope, requireNote } from "../workspace/access";
import { sameInputReceipt } from "./inputStage";
import {
  isLlmObjectOwnershipUnprovenError,
  LlmObjectOwnershipUnprovenError,
} from "./ownershipError";
import {
  isLlmOperationError,
  type LlmLocalInputStage,
  type LlmLocalRuntimeOwnership,
  LlmOperationError,
  type LlmPredecessorInputProof,
} from "./ports";

async function previewSource(
  u: HollowUnitOfWorkContext,
  actor: string,
  noteId: string,
  now: Date,
) {
  const note = await requireNote(
    u,
    await u.notes.findById(noteId),
    actor,
    "edit",
  );
  const original = await u.imports.findByNote(note.id);
  if (!original || original.format !== "pdf")
    throw new NotFoundError("ORIGINAL_NOT_FOUND", "PDF原本を確認できません。");
  const connection = await u.openRouterConnections.find(actor);
  if (
    connection?.state !== "linked" ||
    (connection.keyExpiresAt && connection.keyExpiresAt <= now)
  )
    throw new ConflictError(
      "OPENROUTER_CONNECTION_CHANGED",
      "現在の連携を確認してください。",
    );
  const generation = await u.llmPdfPreviews.sourceGeneration(note.id);
  if (generation === null)
    throw new ConflictError("LLM_SOURCE_CHANGED", "原本が更新されました。");
  return { note, original, connection, generation };
}

export async function beginPdfPreview(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{
    noteId: string;
    noteVersion: number;
    expectedEpoch: number;
    commandId: string;
  }>,
) {
  const digest = container.tokens.hash(JSON.stringify(input));
  const result = await container.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(container, u.accounts, token);
    const prior = await u.llmPdfPreviews.command(actor.id, input.commandId);
    if (prior) {
      if (prior.requestDigest !== digest)
        throw new ConflictError(
          "LLM_COMMAND_REUSED",
          "受付識別子は別の内容に使えません。",
        );
      await requireNote(
        u,
        await u.notes.findById(prior.noteId),
        actor.id,
        "edit",
      );
      return { previewId: prior.id, noteId: prior.noteId };
    }
    if (!container.llm?.configured || !container.openRouter)
      throw new BusinessRuleError(
        "LLM_UNCONFIGURED",
        "本文生成は現在利用できません。",
      );
    const now = container.clock.now();
    const { note, original, connection, generation } = await previewSource(
      u,
      actor.id,
      input.noteId,
      now,
    );
    if (
      note.version !== input.noteVersion ||
      connection.epoch !== input.expectedEpoch
    )
      throw new ConflictError(
        "LLM_SOURCE_CHANGED",
        "本文または連携が更新されました。確認し直してください。",
      );
    if (
      original.state === "processing" ||
      (await u.llmConversions.activeForNote(note.id))
    )
      throw new BusinessRuleError(
        "NOTE_PROCESSING",
        "変換中は用途を確認できません。",
      );
    if (
      (await u.llmPdfPreviews.liveForNote(note.id)) ||
      (await u.llmPdfPreviews.liveForAccount(actor.id))
    )
      throw new BusinessRuleError(
        "LLM_PDF_PREVIEW_BUSY",
        "進行中の用途確認を終了してからお試しください。",
      );
    await u.llmPdfPreviews.prune(
      new Date(now.getTime() - PDF_LLM_LIMITS.receiptMs),
      PDF_LLM_LIMITS.receipts,
    );
    if (
      (await u.llmPdfPreviews.receipts(actor.id)) >= PDF_LLM_LIMITS.receipts ||
      (await u.llmConversions.queued(actor.id)) >= LLM_LIMITS.accountQueued
    )
      throw new BusinessRuleError(
        "LLM_QUEUE_LIMIT",
        "待機中の処理が多いため、完了後にお試しください。",
      );
    const preview: PdfPreview & { state: "queued" } = {
      id: container.idGenerator.next(),
      accountId: actor.id,
      noteId: note.id,
      source: {
        kind: "original",
        format: "pdf",
        originalId: original.id,
        sha256: original.sha256,
        bytes: original.bytes,
      },
      noteVersion: note.version,
      ownershipGeneration: generation,
      credentialEpoch: connection.epoch,
      commandId: input.commandId,
      requestDigest: digest,
      access: { origin: "local-original" as const, bindingId: null },
      sourceMemoryBytes: 0 as const,
      inputReceipt: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + PDF_LLM_LIMITS.previewMs),
      version: 1,
      cancelGeneration: 0,
      state: "queued",
      owner: { state: "idle", token: null, runtimeId: null },
    };
    await u.llmPdfPreviews.insert(preview);
    return { previewId: preview.id, noteId: note.id };
  });
  container.llm?.wake();
  return result;
}

export async function readyPdfPreview(
  u: HollowUnitOfWorkContext,
  accountId: string,
  input: Readonly<{
    previewId: string;
    noteId: string;
    noteVersion: number;
    expectedEpoch: number;
  }>,
  now: Date,
) {
  const preview = await u.llmPdfPreviews.find(input.previewId);
  if (
    !preview ||
    preview.accountId !== accountId ||
    preview.noteId !== input.noteId
  )
    throw new NotFoundError(
      "LLM_PDF_PREVIEW_NOT_FOUND",
      "用途確認が見つかりません。",
    );
  const current = await previewSource(u, accountId, input.noteId, now);
  if (
    preview.state !== "ready" ||
    preview.access.origin !== "local-original" ||
    preview.sourceMemoryBytes !== 0 ||
    preview.cancelGeneration ||
    preview.expiresAt <= now ||
    preview.noteVersion !== input.noteVersion ||
    current.note.version !== preview.noteVersion ||
    preview.credentialEpoch !== input.expectedEpoch ||
    current.connection.epoch !== preview.credentialEpoch ||
    current.generation !== preview.ownershipGeneration ||
    current.original.id !== preview.source.originalId ||
    current.original.sha256 !== preview.source.sha256 ||
    current.original.bytes !== preview.source.bytes
  )
    throw new ConflictError(
      "LLM_PDF_PREVIEW_CHANGED",
      "用途確認が更新または失効しました。確認し直してください。",
    );
  return preview;
}

export async function getPdfPreview(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ noteId: string; commandId: string }>,
) {
  return container.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(container, u.accounts, token);
    const note = await requireNote(
      u,
      await u.notes.findById(input.noteId),
      actor.id,
      "edit",
    );
    const value = await u.llmPdfPreviews.command(actor.id, input.commandId);
    if (!value || value.noteId !== input.noteId) return null;
    const now = container.clock.now();
    const original = await u.imports.findByNote(note.id);
    const connection = await u.openRouterConnections.find(actor.id);
    const generation = await u.llmPdfPreviews.sourceGeneration(note.id);
    const current =
      !!container.llm?.configured &&
      value.access.origin === "local-original" &&
      value.sourceMemoryBytes === 0 &&
      note.lifecycle.kind === "active" &&
      note.version === value.noteVersion &&
      generation === value.ownershipGeneration &&
      original?.id === value.source.originalId &&
      original.format === "pdf" &&
      original.sha256 === value.source.sha256 &&
      original.bytes === value.source.bytes &&
      connection?.state === "linked" &&
      connection.epoch === value.credentialEpoch &&
      (!connection.keyExpiresAt || connection.keyExpiresAt > now) &&
      !(await u.llmConversions.activeForNote(note.id));
    const usable =
      current &&
      value.state === "ready" &&
      value.cancelGeneration === 0 &&
      value.expiresAt > now;
    const settings =
      (await u.openRouterModels.find(actor.id)) ??
      defaultOpenRouterModels(actor.id, now);
    return {
      previewId: value.id,
      noteId: value.noteId,
      noteVersion: value.noteVersion,
      epoch: value.credentialEpoch,
      state: value.state,
      expired: value.expiresAt <= now,
      expiresAt: value.expiresAt.toISOString(),
      cancelRequested: value.cancelGeneration > 0,
      ownershipUnconfirmed: value.owner.state === "unknown",
      current,
      usable,
      purpose:
        usable && value.state === "ready" ? value.result.modelKind : null,
      defaultModelId:
        usable && value.state === "ready"
          ? value.result.modelKind === "chat-image"
            ? settings.image.modelId
            : settings.text.modelId
          : null,
      pages:
        usable && value.state === "ready"
          ? value.result.kind === "pages"
            ? value.result.manifest.total
            : value.result.pages
          : null,
      failure: value.state === "failed" ? value.code : null,
      jobId: value.state === "consumed" ? value.jobId : null,
    };
  });
}

export async function cancelPdfPreview(
  container: HollowContainer,
  token: string | null,
  previewId: string,
) {
  await container.unitOfWorkProvider.run(async (u) => {
    const actor = await requireAccount(container, u.accounts, token);
    const value = await u.llmPdfPreviews.find(previewId);
    if (!value || value.accountId !== actor.id)
      throw new NotFoundError(
        "LLM_PDF_PREVIEW_NOT_FOUND",
        "用途確認が見つかりません。",
      );
    await requireNote(
      u,
      await u.notes.findById(value.noteId),
      actor.id,
      "edit",
    );
    if (
      value.cancelGeneration ||
      !["queued", "running", "ready", "unknown"].includes(value.state)
    )
      return;
    const common = {
      ...value,
      cancelGeneration: value.cancelGeneration + 1,
      updatedAt: container.clock.now(),
      version: value.version + 1,
    };
    const next: PdfPreview =
      value.state === "queued" || value.state === "ready"
        ? { ...common, state: "cancelled", owner: value.owner }
        : common;
    if (!(await u.llmPdfPreviews.replace(next, value.version)))
      throw new ConflictError(
        "LLM_PDF_PREVIEW_CHANGED",
        "用途確認が更新されました。",
      );
  });
  container.llm?.execution.cancel(previewId);
  container.llm?.wake();
  return { ok: true };
}

const unproven = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
async function currentPreview(
  u: HollowUnitOfWorkContext,
  value: PdfPreview,
  now: Date,
  input?: LlmLocalInputStage,
) {
  const lease = input?.previewLease(value);
  const current = await u.llmPdfPreviews.find(value.id);
  const note = await u.notes.findById(value.noteId);
  const original = await u.imports.findOriginal(value.source.originalId);
  const actor = await u.accounts.findById(value.accountId);
  const connection = await u.openRouterConnections.find(value.accountId);
  if (
    !current ||
    current.access.origin !== "local-original" ||
    value.access.origin !== "local-original" ||
    (input
      ? !lease ||
        current.sourceMemoryBytes !== 52_428_800 ||
        value.sourceMemoryBytes !== 52_428_800 ||
        current.inputReceipt?.state !== "active" ||
        !sameInputReceipt(lease.receipt, current.inputReceipt) ||
        !sameInputReceipt(value.inputReceipt, current.inputReceipt)
      : current.sourceMemoryBytes !== 0 || value.sourceMemoryBytes !== 0) ||
    current.state !== "running" ||
    current.owner.state !== "active" ||
    current.owner.token !== value.owner.token ||
    current.owner.runtimeId !== value.owner.runtimeId ||
    current.cancelGeneration ||
    current.cancelGeneration !== value.cancelGeneration ||
    current.expiresAt <= now ||
    !note ||
    note.lifecycle.kind !== "active" ||
    note.version !== value.noteVersion ||
    (await u.llmPdfPreviews.sourceGeneration(note.id)) !==
      value.ownershipGeneration ||
    !actor ||
    actor.status !== "verified" ||
    !(await canScope(u, note.owner, actor.id, "edit")) ||
    (note.owner.kind === "workspace" &&
      (await u.workspaces.find(note.owner.workspaceId))?.state !== "active") ||
    !original ||
    original.noteId !== note.id ||
    original.format !== "pdf" ||
    original.sha256 !== value.source.sha256 ||
    original.bytes !== value.source.bytes ||
    connection?.state !== "linked" ||
    connection.epoch !== value.credentialEpoch ||
    (connection.keyExpiresAt && connection.keyExpiresAt <= now)
  )
    throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
  return { current, original };
}

function classificationFailure(
  error: LlmOperationError,
): PdfClassificationFailure {
  switch (error.code) {
    case "LLM_DOCUMENT_CORRUPT":
    case "LLM_DOCUMENT_ENCRYPTED":
    case "LLM_DOCUMENT_UNSUPPORTED":
    case "LLM_DOCUMENT_NO_TEXT":
    case "LLM_RESOURCE_LIMIT":
    case "LLM_TIMEOUT":
    case "LLM_SOURCE_CHANGED":
    case "LLM_UNAVAILABLE":
      return error.code;
    case "LLM_SOURCE_INVALID":
    case "LLM_CREDENTIAL_INVALID":
      return "LLM_SOURCE_CHANGED";
    default:
      return "LLM_UNAVAILABLE";
  }
}

async function processPreview(
  container: HollowContainer,
  value: PdfPreview & { state: "running" },
  signal: AbortSignal,
) {
  const service = container.llm;
  try {
    if (!service?.configured || !service.storage.withOwner)
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    const source = await container.unitOfWorkProvider.run((u) =>
      currentPreview(
        u,
        value,
        container.clock.now(),
        service.inputMode === "leased-local-v2"
          ? service.inputStage
          : undefined,
      ),
    );
    const result = await service.storage.withOwner(
      { kind: "llm-pdf-preview", id: value.id },
      async () => {
        try {
          if (service.inputMode === "leased-local-v2")
            return await service.inputStage.classify(value, signal);
          const bytes = await service.source.read(
            source.original.storageKey,
            value.source,
            signal,
          );
          return await service.pdfClassifier.classify(
            { bytes, source: value.source },
            signal,
          );
        } catch (error) {
          if (isLlmOperationError(error) && !error.closed)
            throw new LlmObjectOwnershipUnprovenError(
              value.id,
              "llm-pdf-preview",
            );
          throw error;
        }
      },
    );
    if (signal.aborted)
      throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
    await container.unitOfWorkProvider.run(async (u) => {
      const ended =
        service.inputMode === "leased-local-v2"
          ? await u.llmPdfPreviews.find(value.id)
          : value;
      if (
        !ended ||
        ended.state !== "running" ||
        ended.owner.token !== value.owner.token ||
        ended.owner.runtimeId !== value.owner.runtimeId ||
        (service.inputMode === "leased-local-v2" &&
          (ended.sourceMemoryBytes !== 0 ||
            ended.inputReceipt?.state !== "closed"))
      )
        throw unproven();
      const { current } = await currentPreview(u, ended, container.clock.now());
      if (
        !(await u.llmPdfPreviews.replace(
          {
            ...current,
            state: "ready",
            result,
            owner: { ...current.owner, state: "closed" },
            updatedAt: container.clock.now(),
            version: current.version + 1,
          },
          current.version,
        ))
      )
        throw unproven();
    });
  } catch (error) {
    if (
      service?.inputMode === "leased-local-v2" &&
      service.inputStage.previewLease(value)
    ) {
      try {
        await service.inputStage.finishPreview(value);
      } catch {
        throw unproven();
      }
    }
    const failure = isLlmOperationError(error)
      ? error
      : error instanceof BusinessRuleError && error.code === "OBJECT_FENCED"
        ? new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true)
        : isLlmObjectOwnershipUnprovenError(error)
          ? unproven()
          : unproven();
    let committed = false;
    await container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmPdfPreviews.find(value.id);
      if (
        !current ||
        current.owner.token !== value.owner.token ||
        current.owner.runtimeId !== value.owner.runtimeId
      )
        throw unproven();
      if (current.state !== "running" && current.state !== "unknown") {
        if (current.owner.state === "closed") {
          committed = true;
          return;
        }
        throw unproven();
      }
      const now = container.clock.now();
      const common = {
        ...current,
        updatedAt: now,
        version: current.version + 1,
      };
      const closed = { ...current.owner, state: "closed" as const };
      const next: PdfPreview = !failure.closed
        ? {
            ...common,
            state: "unknown",
            owner: { ...current.owner, state: "unknown" },
          }
        : current.cancelGeneration
          ? { ...common, state: "cancelled", owner: closed }
          : current.expiresAt <= now
            ? { ...common, state: "expired", owner: closed }
            : {
                ...common,
                state: "failed",
                owner: closed,
                code: classificationFailure(failure),
              };
      if (!(await u.llmPdfPreviews.replace(next, current.version)))
        throw unproven();
    });
    if (committed) return;
    if (!failure.closed) throw unproven();
  }
}

/** Called only after the runtime owner has proven the predecessor exited. */
export async function recoverPdfPreviews(
  u: HollowUnitOfWorkContext,
  predecessor: string,
  now: Date,
  ownership?: LlmLocalRuntimeOwnership,
): Promise<readonly LlmPredecessorInputProof[]> {
  const proofs: LlmPredecessorInputProof[] = [];
  for (const current of await u.llmPdfPreviews.owned(predecessor)) {
    if (current.state !== "running" && current.state !== "unknown")
      throw unproven();
    const common = {
      ...current,
      owner: { ...current.owner, state: "closed" as const },
      updatedAt: now,
      version: current.version + 1,
    };
    const next: PdfPreview = current.cancelGeneration
      ? { ...common, state: "cancelled" }
      : current.expiresAt <= now
        ? { ...common, state: "expired" }
        : { ...common, state: "failed", code: "LLM_UNAVAILABLE" };
    if (current.inputReceipt && current.sourceMemoryBytes !== 0) {
      const proof = ownership?.inputPredecessor(current);
      if (!proof || !ownership?.verifyPredecessorInput(proof, current))
        throw unproven();
      if (!(await u.llmPdfPreviews.replace(next, current.version)))
        throw unproven();
      const closedOwner = await u.llmPdfPreviews.find(current.id);
      if (
        !closedOwner ||
        closedOwner.owner.state !== "closed" ||
        closedOwner.version !== next.version ||
        closedOwner.state !== next.state
      )
        throw unproven();
      if (
        !(await u.llmPdfPreviews.replace(
          {
            ...closedOwner,
            inputReceipt: proof.receipt,
            sourceMemoryBytes: 0,
            updatedAt: now,
            version: closedOwner.version + 1,
          },
          closedOwner.version,
        ))
      )
        throw unproven();
      const closedInput = await u.llmPdfPreviews.find(current.id);
      if (!closedInput || !ownership.verifyPredecessorInput(proof, closedInput))
        throw unproven();
      proofs.push(proof);
    } else if (!(await u.llmPdfPreviews.replace(next, current.version)))
      throw unproven();
  }
  return proofs;
}

export async function sweepPdfPreviews(container: HollowContainer) {
  const service = container.llm;
  if (!service) return;
  service.ownership.assertReady();
  const owned = await container.unitOfWorkProvider.run((u) =>
    u.llmPdfPreviews.owned(service.execution.runtimeId),
  );
  for (const value of owned) {
    if (value.owner.state === "unknown") continue;
    const valid = await container.unitOfWorkProvider.run(async (u) => {
      try {
        await currentPreview(
          u,
          value,
          container.clock.now(),
          service.inputMode === "leased-local-v2" &&
            value.sourceMemoryBytes !== 0
            ? service.inputStage
            : undefined,
        );
        return true;
      } catch (error) {
        if (isLlmOperationError(error)) return false;
        throw error;
      }
    });
    if (!valid) service.execution.cancel(value.id);
  }
  await container.unitOfWorkProvider.run(async (u) => {
    const now = container.clock.now();
    for (const value of await u.llmPdfPreviews.sweepable(now, 100)) {
      if (value.state !== "queued" && value.state !== "ready") continue;
      if (
        !(await u.llmPdfPreviews.replace(
          {
            ...value,
            state: value.cancelGeneration ? "cancelled" : "expired",
            owner: value.owner,
            updatedAt: now,
            version: value.version + 1,
          },
          value.version,
        ))
      )
        throw unproven();
    }
  });
  const resumed =
    service.inputMode === "leased-local-v2"
      ? await service.inputStage.resumePreview()
      : [];
  for (let index = 0; index < LLM_LIMITS.concurrency; index++) {
    const value =
      resumed[index] ??
      (service.inputMode === "leased-local-v2"
        ? await service.inputStage.claimPreview()
        : await container.unitOfWorkProvider.run((u) =>
            u.llmPdfPreviews.claim(
              container.clock.now(),
              service.execution.runtimeId,
              container.idGenerator.next(),
            ),
          ));
    if (!value) break;
    if (value.state !== "running") throw unproven();
    const deadline = new Date(
      Math.min(
        value.expiresAt.getTime(),
        container.clock.now().getTime() + PDF_LLM_LIMITS.prepareMs,
      ),
    );
    if (
      !service.execution.start(value.id, value.accountId, deadline, (signal) =>
        processPreview(container, value, signal),
      )
    )
      throw unproven();
  }
}

import {
  defaultOpenRouterModels,
  type OpenRouterModel,
} from "@repo/core/domain/integration/openRouter";
import {
  isLlmDocumentFormat,
  isLlmLegacyFormat,
} from "@repo/core/domain/llm/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { isOpenRouterProviderError } from "../integration/openRouter/ports";
import {
  findCurrentDriveSource,
  requireRegenerationNote,
} from "../regeneration/current";

export function llmSourceAvailability(format: string | null) {
  if (format === null) return "no-original" as const;
  if (isLlmLegacyFormat(format)) return "legacy-text" as const;
  if (format === "image") return "image-gated" as const;
  if (format === "pdf") return "pdf-gated" as const;
  if (isLlmDocumentFormat(format)) return "office-text-gated" as const;
  return "not-provided" as const;
}

export async function getLlmNote(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{
    noteId: string;
    commandId?: string | undefined;
    recordId?: string | undefined;
  }>,
) {
  return container.unitOfWorkProvider.run(async (u) => {
    const { account, note } = await requireRegenerationNote(
      container,
      u,
      token,
      input.noteId,
    );
    const original = await u.imports.findByNote(note.id);
    const connection = await u.openRouterConnections.find(account.id);
    const settings =
      (await u.openRouterModels.find(account.id)) ??
      defaultOpenRouterModels(account.id, container.clock.now());
    const active = await u.llmConversions.activeForNote(note.id);
    const last = original?.activeJobId
      ? await u.llmConversions.find(original.activeJobId)
      : null;
    const own = last?.accountId === account.id ? last : null;
    const livePreview =
      original?.format === "pdf"
        ? await u.llmPdfPreviews.liveForNote(note.id)
        : null;
    let previewMatches =
      livePreview?.access.origin === "local-original" &&
      input.recordId === undefined;
    if (
      input.recordId !== undefined &&
      livePreview?.access.origin === "drive-record"
    ) {
      const binding = await u.regenerationBindings.find(
        livePreview.access.bindingId,
      );
      previewMatches =
        binding?.recordId === input.recordId &&
        livePreview.noteVersion === note.version &&
        livePreview.cancelGeneration === 0 &&
        livePreview.expiresAt > container.clock.now() &&
        connection?.state === "linked" &&
        connection.epoch === livePreview.credentialEpoch &&
        (!connection.keyExpiresAt ||
          connection.keyExpiresAt > container.clock.now()) &&
        !!(await findCurrentDriveSource(u, {
          consumer: { kind: "pdf-preview", id: livePreview.id },
          access: livePreview.access,
          executorId: account.id,
          noteId: note.id,
          originalId: livePreview.source.originalId,
          source: livePreview.source,
          ownershipGeneration: livePreview.ownershipGeneration,
          fingerprint: livePreview.requestDigest,
        }));
    }
    const receipt = input.commandId
      ? await u.llmConversions.command(account.id, input.commandId)
      : null;
    const linked =
      connection?.state === "linked" &&
      (!connection.keyExpiresAt ||
        connection.keyExpiresAt > container.clock.now());
    return {
      actorId: account.id,
      noteId: note.id,
      noteVersion: note.version,
      configured: !!container.llm?.configured,
      linked,
      epoch: connection?.epoch ?? 0,
      supported:
        !!original &&
        (original.format === "image" ||
          isLlmLegacyFormat(original.format) ||
          isLlmDocumentFormat(original.format)),
      availability: llmSourceAvailability(original?.format ?? null),
      format: original?.format ?? null,
      processing: !!active || original?.state === "processing",
      pdfClassification:
        own?.selection === "pdf-pending"
          ? ("pending" as const)
          : original?.format === "pdf"
            ? ("preview-required" as const)
            : null,
      pdfPreview:
        livePreview?.accountId === account.id && previewMatches
          ? { commandId: livePreview.commandId, previewId: livePreview.id }
          : null,
      modelKind:
        own?.selection === "pdf-pending"
          ? null
          : own?.selection === "fixed"
            ? own.preparationVersion === 3 || own.preparationVersion === 4
              ? ("chat-image" as const)
              : ("chat-text" as const)
            : original?.format === "pdf"
              ? null
              : original?.format === "image"
                ? ("chat-image" as const)
                : ("chat-text" as const),
      modelId:
        own?.selection === "pdf-pending"
          ? null
          : (own?.modelId ??
            (original?.format === "pdf"
              ? null
              : original?.format === "image"
                ? settings.image.modelId
                : settings.text.modelId)),
      instruction: own?.instruction ?? "",
      receipt:
        receipt?.noteId === note.id
          ? { jobId: receipt.jobId, outcome: receipt.outcome.kind }
          : null,
      job: own
        ? {
            id: own.jobId,
            operation: own.operation,
            outcome: own.outcome.kind,
            phase: own.phase,
            cancelRequested: own.cancelGeneration > 0,
            ownershipUnconfirmed: own.owner.state === "unknown",
            failure:
              own.outcome.kind === "failed" || own.outcome.kind === "unknown"
                ? own.outcome.code
                : null,
            epochChanged: own.credentialEpoch !== connection?.epoch,
            undoAvailable:
              own.operation === "regenerate" &&
              own.outcome.kind === "succeeded" &&
              own.outcome.noteVersion === note.version &&
              !active &&
              own.originalRevisionNo !== null &&
              !!(await u.revisions.find(note.id, own.originalRevisionNo)),
          }
        : null,
    };
  });
}

export async function listLlmModels(
  container: HollowContainer,
  token: string | null,
  kind: "chat-text" | "chat-image",
) {
  const actor = await container.unitOfWorkProvider.run((u) =>
    requireAccount(container, u.accounts, token),
  );
  const service = container.openRouter;
  if (!service) return { source: "unconfigured" as const, models: [] };
  let catalog: {
    source: "live" | "default-fallback";
    models: readonly OpenRouterModel[];
  };
  try {
    catalog = {
      source: "live" as const,
      models: await service.execution.run((signal) =>
        service.catalog.list(signal),
      ),
    };
  } catch (error) {
    if (!isOpenRouterProviderError(error)) throw error;
    catalog = {
      source: "default-fallback" as const,
      models: service.catalog.fallback(),
    };
  }
  await container.unitOfWorkProvider.run(async (u) => {
    const current = await requireAccount(container, u.accounts, token);
    if (actor.id !== current.id) throw new Error("LLM_ACTOR_CHANGED");
  });
  return {
    source: catalog.source,
    models: catalog.models
      .filter(
        (model) =>
          model.kinds.includes(kind) &&
          (kind !== "chat-image" || model.kinds.includes("chat-text")) &&
          (!model.expiresAt || model.expiresAt > container.clock.now()),
      )
      .map((model) => ({ id: model.id, name: model.name })),
  };
}

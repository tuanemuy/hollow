import {
  defaultOpenRouterModels,
  type OpenRouterAdoptedModel,
  type OpenRouterModel,
  type OpenRouterModelChoice,
  supportsOpenRouterChoice,
} from "@repo/core/domain/integration/openRouter";
import { requireAuthenticationContext } from "../../account/context";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import { ConflictError, NotFoundError } from "../../errors";
import { openRouterServices, requireOpenRouterActor } from "./connection";
import { isOpenRouterProviderError, type OpenRouterServices } from "./ports";

type ModelCatalog =
  | Readonly<{ source: "live"; models: readonly OpenRouterModel[] }>
  | Readonly<{
      source: "default-fallback";
      models: readonly OpenRouterAdoptedModel[];
    }>;

async function modelCatalog(
  service: OpenRouterServices,
): Promise<ModelCatalog> {
  try {
    return {
      source: "live",
      models: await service.execution.run((signal) =>
        service.catalog.list(signal),
      ),
    };
  } catch (error) {
    if (!isOpenRouterProviderError(error)) throw error;
    return { source: "default-fallback", models: service.catalog.fallback() };
  }
}

export async function getOpenRouterSettings(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const context = await requireOpenRouterActor(c, u, request);
    const connection = await u.openRouterConnections.find(
      context.actor.accountId,
    );
    const settings = await u.openRouterModels.find(context.actor.accountId);
    const admission = await u.llmConversions.admission(
      context.actor.accountId,
      connection?.epoch ?? 0,
    );
    const expired =
      connection?.keyExpiresAt !== null &&
      connection?.keyExpiresAt !== undefined &&
      connection.keyExpiresAt <= c.clock.now();
    return {
      actorId: context.actor.accountId,
      browserEpoch: context.browser.epoch,
      configured: !!c.openRouter?.protector.available(),
      state: expired
        ? ("needs_relink" as const)
        : (connection?.state ?? "unlinked"),
      epoch: connection?.epoch ?? 0,
      version: connection?.version ?? 1,
      linkedAt: connection?.linkedAt?.toISOString() ?? null,
      expiresAt: connection?.keyExpiresAt?.toISOString() ?? null,
      lastUsedAt: connection?.lastUsedAt?.toISOString() ?? null,
      models:
        settings ??
        defaultOpenRouterModels(context.actor.accountId, c.clock.now()),
      generationAvailable:
        !!c.llm?.configured && connection?.state === "linked" && !expired,
      admission,
    };
  });
}
export async function getOpenRouterAttempt(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const a = await u.openRouterAttempts.find(id);
    if (!a)
      throw new NotFoundError(
        "OPENROUTER_ATTEMPT_NOT_FOUND",
        "連携手続きが見つかりません。",
      );
    await requireAuthenticationContext(c, u, request, a);
    const connection = await u.openRouterConnections.find(a.actor.accountId);
    const completedCurrent =
      a.state === "completed" && connection?.epoch === a.resultEpoch;
    const admission = await u.llmConversions.admission(
      a.actor.accountId,
      a.expectedEpoch,
    );
    let uploadReturn: string | null = null;
    if (completedCurrent && a.returnTo.kind === "upload") {
      if (a.returnTo.workspaceId === null) uploadReturn = "/notes/import";
      else {
        const workspace = await u.workspaces.find(a.returnTo.workspaceId);
        const role = await u.workspaces.role(
          a.returnTo.workspaceId,
          a.actor.accountId,
        );
        if (
          workspace?.state === "active" &&
          (role === "owner" || role === "editor")
        )
          uploadReturn = `/notes/import?workspaceId=${encodeURIComponent(workspace.id)}`;
      }
    }
    return {
      id: a.id,
      version: a.version,
      state:
        a.expiresAt <= c.clock.now() &&
        a.state !== "completed" &&
        a.state !== "failed"
          ? ("expired" as const)
          : a.state,
      failure: a.state === "failed" ? a.failure : null,
      expiresAt: a.expiresAt.toISOString(),
      firstLink: completedCurrent && a.state === "completed" && a.firstLink,
      returnTo: a.returnTo,
      current: completedCurrent,
      uploadReturn,
      admission,
      needsConfirmation:
        a.state === "checking" &&
        (a.confirmedAdmissionSequence === null
          ? admission.active > 0
          : a.confirmedAdmissionSequence !== admission.sequence),
    };
  });
}
export async function listOpenRouterWaitingNotes(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
  afterId?: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const a = await u.openRouterAttempts.find(id);
    if (!a)
      throw new NotFoundError(
        "OPENROUTER_ATTEMPT_NOT_FOUND",
        "連携手続きが見つかりません。",
      );
    await requireAuthenticationContext(c, u, request, a);
    const connection = await u.openRouterConnections.find(a.actor.accountId);
    if (
      a.state !== "completed" ||
      !a.firstLink ||
      connection?.epoch !== a.resultEpoch
    )
      return { items: [], total: 0, next: null };
    return u.openRouterWaiting.list(a.actor.accountId, afterId, 50);
  });
}
export async function listOpenRouterModels(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  const context = await c.unitOfWorkProvider.run((u) =>
    requireOpenRouterActor(c, u, request),
  );
  const service = openRouterServices(c);
  const result = await modelCatalog(service);
  await c.unitOfWorkProvider.run((u) =>
    requireAuthenticationContext(c, u, request, context),
  );
  return {
    ...result,
    defaults: defaultOpenRouterModels(context.actor.accountId, c.clock.now()),
    generationAvailable: !!c.llm?.configured,
  };
}
export async function saveOpenRouterModels(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    expectedEpoch: number;
    expectedVersion: number;
    text: OpenRouterModelChoice & { kind: "chat-text" };
    image: OpenRouterModelChoice & { kind: "chat-image" };
    audio: OpenRouterModelChoice & { kind: "stt-transcription" };
  }>,
) {
  const service = openRouterServices(c);
  const context = await c.unitOfWorkProvider.run((u) =>
    requireOpenRouterActor(c, u, request),
  );
  const { models } = await modelCatalog(service);
  if (
    ![input.text, input.image, input.audio].every((choice) =>
      supportsOpenRouterChoice(models, choice, c.clock.now()),
    )
  )
    throw new ConflictError(
      "OPENROUTER_MODEL_UNAVAILABLE",
      "選択したモデルを現在の用途で利用できません。モデル一覧を更新してください。",
    );
  await c.unitOfWorkProvider.run(async (u) => {
    await requireAuthenticationContext(c, u, request, context);
    const connection = await u.openRouterConnections.find(
      context.actor.accountId,
    );
    const previous = await u.openRouterModels.find(context.actor.accountId);
    if (
      !connection ||
      connection.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      (connection.keyExpiresAt !== null &&
        connection.keyExpiresAt <= c.clock.now()) ||
      !previous ||
      previous.version !== input.expectedVersion
    )
      throw new ConflictError(
        "OPENROUTER_SETTINGS_CHANGED",
        "連携またはモデル設定が変わりました。画面を更新してください。",
      );
    if (
      !(await u.openRouterModels.replace(
        {
          ...previous,
          text: input.text,
          image: input.image,
          audio: input.audio,
          version: previous.version + 1,
          updatedAt: c.clock.now(),
        },
        previous.version,
      ))
    )
      throw new ConflictError(
        "OPENROUTER_SETTINGS_CHANGED",
        "モデル設定が変わりました。画面を更新してください。",
      );
  });
}

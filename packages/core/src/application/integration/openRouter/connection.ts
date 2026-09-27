import {
  defaultOpenRouterModels,
  OPENROUTER_ATTEMPT_MS,
  type OpenRouterAttempt,
  type OpenRouterConnection,
  type OpenRouterReturn,
} from "@repo/core/domain/integration/openRouter";
import {
  captureAuthentication,
  requireAuthenticationContext,
} from "../../account/context";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../errors";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import { isOpenRouterProviderError, OpenRouterProviderError } from "./ports";

const changed = () =>
  new ConflictError(
    "OPENROUTER_CONTEXT_CHANGED",
    "連携状況が変わりました。画面を開き直してください。",
  );
const expired = () =>
  new ForbiddenError(
    "OPENROUTER_EXPIRED",
    "連携手続きの期限が切れました。新しく開始してください。",
  );
export function openRouterServices(c: HollowContainer) {
  if (!c.openRouter?.protector.available())
    throw new ConflictError(
      "OPENROUTER_NOT_CONFIGURED",
      "OpenRouter連携は現在設定されていません。通常の取り込みは利用できます。",
    );
  return c.openRouter;
}
export async function requireOpenRouterActor(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
) {
  const context = await captureAuthentication(c, u, request);
  if (!context.actor)
    throw new UnauthorizedError("SIGN_IN_REQUIRED", "ログインしてください。");
  return { actor: context.actor, browser: context.browser };
}
async function current(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
  a: OpenRouterAttempt,
) {
  if (a.expiresAt <= c.clock.now()) throw expired();
  await requireAuthenticationContext(c, u, request, a);
  const connection = await u.openRouterConnections.find(a.actor.accountId);
  if (
    !connection ||
    connection.epoch !== a.expectedEpoch ||
    connection.version !== a.expectedVersion
  )
    throw changed();
  return connection;
}
async function replace(
  u: HollowUnitOfWorkContext,
  old: OpenRouterAttempt,
  value: OpenRouterAttempt,
) {
  if (!(await u.openRouterAttempts.replace(value, old.version)))
    throw changed();
  return value;
}
export async function beginOpenRouter(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    expectedEpoch: number;
    expectedVersion: number;
    confirmedReconnect: boolean;
    returnTo: OpenRouterReturn;
  }>,
) {
  const service = openRouterServices(c);
  const id = c.idGenerator.next();
  const correlation = c.tokens.generate();
  const verifier = c.tokens.generate();
  await c.unitOfWorkProvider.run(async (u) => {
    const context = await requireOpenRouterActor(c, u, request);
    const now = c.clock.now();
    const connection = await u.openRouterConnections.ensure(
      context.actor.accountId,
      now,
    );
    if (
      connection.epoch !== input.expectedEpoch ||
      connection.version !== input.expectedVersion
    )
      throw changed();
    if (connection.state !== "unlinked" && !input.confirmedReconnect)
      throw new ConflictError(
        "OPENROUTER_CONFIRM_REQUIRED",
        "再連携すると以前の連携で進行中のAI変換は取り消されます。確認して開始してください。",
      );
    if (
      (await u.openRouterAttempts.countRecent(
        context.browser.hash,
        new Date(now.getTime() - OPENROUTER_ATTEMPT_MS),
      )) >= 5 ||
      (await u.openRouterAttempts.countActive(context.browser.hash, now)) >= 3
    )
      throw new ConflictError(
        "OPENROUTER_RATE_LIMIT",
        "手続きが続いています。しばらく待ってからやり直してください。",
      );
    if (
      input.returnTo.kind === "upload" &&
      input.returnTo.workspaceId !== null
    ) {
      const workspace = await u.workspaces.find(input.returnTo.workspaceId);
      const role = await u.workspaces.role(
        input.returnTo.workspaceId,
        context.actor.accountId,
      );
      if (
        !workspace ||
        workspace.state !== "active" ||
        (role !== "owner" && role !== "editor")
      )
        throw new ForbiddenError(
          "OPENROUTER_RETURN_FORBIDDEN",
          "取り込み先を利用できません。",
        );
    }
    const expiresAt = new Date(now.getTime() + OPENROUTER_ATTEMPT_MS);
    await u.authBrowsers.ensure(context.browser.hash, expiresAt, now);
    await u.openRouterAttempts.insert({
      id,
      correlationHash: c.tokens.hash(correlation),
      ...context,
      expectedEpoch: connection.epoch,
      expectedVersion: connection.version,
      returnTo: input.returnTo,
      createdAt: now,
      expiresAt,
      version: 1,
      state: "pending",
      verifierEnvelope: service.protector.protect(verifier, {
        purpose: "verifier",
        accountId: context.actor.accountId,
        attemptId: id,
        browser: context.browser,
      }),
    });
  });
  return {
    id,
    authorizationUrl: await service.authorization.authorization({
      correlation,
      verifier,
    }),
  };
}

async function failExchange(
  c: HollowContainer,
  id: string,
  version: number,
  failure: "OPENROUTER_EXCHANGE_UNKNOWN" | "OPENROUTER_PROVIDER_REJECTED",
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const a = await u.openRouterAttempts.find(id);
    if (a?.state === "exchanging" && a.version === version)
      await replace(u, a, {
        ...a,
        state: "failed",
        failure,
        version: a.version + 1,
      });
  });
}
async function exchange(
  c: HollowContainer,
  a: OpenRouterAttempt & { state: "exchanging" },
  code: string,
  verifier: string,
  signal: AbortSignal,
) {
  const service = openRouterServices(c);
  try {
    return await service.authorization.exchange({ code, verifier, signal });
  } catch (error) {
    await failExchange(
      c,
      a.id,
      a.version,
      isOpenRouterProviderError(error) &&
        error.code === "OPENROUTER_PROVIDER_REJECTED"
        ? "OPENROUTER_PROVIDER_REJECTED"
        : "OPENROUTER_EXCHANGE_UNKNOWN",
    );
    throw new ConflictError(
      "OPENROUTER_EXCHANGE_UNKNOWN",
      "交換結果を確認できません。同じコードを再送せず、新しい連携手続きを開始してください。",
    );
  }
}
async function inspectAndPromote(
  c: HollowContainer,
  request: AuthenticationRequest,
  a: OpenRouterAttempt & { state: "checking" },
  credential: string,
  signal: AbortSignal,
) {
  const service = openRouterServices(c);
  let metadata: Awaited<
    ReturnType<typeof service.authorization.inspectCredential>
  >;
  try {
    metadata = await service.authorization.inspectCredential({
      credential,
      signal,
    });
  } catch (error) {
    if (
      isOpenRouterProviderError(error) &&
      error.code === "OPENROUTER_CREDENTIAL_INVALID"
    )
      await c.unitOfWorkProvider.run(async (u) => {
        const existing = await u.openRouterAttempts.find(a.id);
        if (existing?.state === "checking" && existing.version === a.version)
          await replace(u, existing, {
            ...existing,
            state: "failed",
            failure: "OPENROUTER_PROVIDER_REJECTED",
            version: existing.version + 1,
          });
      });
    throw error;
  }
  if (signal.aborted)
    throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
  return c.unitOfWorkProvider.run(async (u) => {
    if (signal.aborted)
      throw new OpenRouterProviderError("OPENROUTER_UNAVAILABLE");
    const existing = await u.openRouterAttempts.find(a.id);
    if (existing?.state !== "checking" || existing.version !== a.version)
      throw changed();
    const old = await current(c, u, request, existing);
    const now = c.clock.now();
    if (metadata.expiresAt !== null && metadata.expiresAt <= now)
      throw new OpenRouterProviderError("OPENROUTER_CREDENTIAL_INVALID");
    const epoch = old.epoch + 1;
    const value: OpenRouterConnection = {
      accountId: old.accountId,
      epoch,
      version: old.version + 1,
      state: "linked",
      credentialEnvelope: service.protector.protect(credential, {
        purpose: "credential",
        accountId: old.accountId,
        epoch,
      }),
      keyExpiresAt: metadata.expiresAt,
      providerUserId: metadata.providerUserId,
      linkedAt: now,
      everLinkedAt: old.everLinkedAt ?? now,
      lastUsedAt: null,
      updatedAt: now,
    };
    if (!(await u.openRouterConnections.replace(value, old.version)))
      throw changed();
    await u.openRouterModels.insertDefaults(
      defaultOpenRouterModels(old.accountId, now),
    );
    await u.openRouterAttempts.fenceAccount(old.accountId, a.id);
    await replace(u, existing, {
      ...existing,
      state: "completed",
      resultEpoch: epoch,
      firstLink: old.everLinkedAt === null,
      version: existing.version + 1,
    });
    return { id: existing.id };
  });
}

export async function completeOpenRouter(
  c: HollowContainer,
  request: AuthenticationRequest,
  correlation: string,
  code: string,
) {
  const service = openRouterServices(c);
  return service.execution.run(async (signal) => {
    const prepared = await c.unitOfWorkProvider.run(async (u) => {
      const a = await u.openRouterAttempts.findByCorrelation(
        c.tokens.hash(correlation),
      );
      if (!a) throw changed();
      if (a.state === "completed") {
        await requireAuthenticationContext(c, u, request, a);
        return { kind: "completed" as const, id: a.id };
      }
      await current(c, u, request, a);
      if (a.state !== "pending")
        throw new ConflictError(
          "OPENROUTER_CODE_CONSUMED",
          "この手続きのコードは再交換できません。結果を確認してください。",
        );
      const verifier = service.protector.reveal(a.verifierEnvelope, {
        purpose: "verifier",
        accountId: a.actor.accountId,
        attemptId: a.id,
        browser: a.browser,
      });
      const exchanging: OpenRouterAttempt & { state: "exchanging" } = {
        ...a,
        state: "exchanging",
        version: a.version + 1,
      };
      await replace(u, a, exchanging);
      return { kind: "exchange" as const, a: exchanging, verifier };
    });
    if (prepared.kind === "completed") return { id: prepared.id };
    const credential = await exchange(
      c,
      prepared.a,
      code,
      prepared.verifier,
      signal,
    );
    const checking = await c.unitOfWorkProvider.run(async (u) => {
      const a = await u.openRouterAttempts.find(prepared.a.id);
      if (a?.state !== "exchanging" || a.version !== prepared.a.version)
        throw changed();
      await current(c, u, request, a);
      const value: OpenRouterAttempt & { state: "checking" } = {
        ...a,
        state: "checking",
        candidateEnvelope: service.protector.protect(credential, {
          purpose: "candidate",
          accountId: a.actor.accountId,
          attemptId: a.id,
          browser: a.browser,
        }),
        version: a.version + 1,
      };
      await replace(u, a, value);
      return value;
    });
    return inspectAndPromote(c, request, checking, credential, signal);
  });
}
export async function retryOpenRouterMetadata(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
  expectedVersion: number,
) {
  const service = openRouterServices(c);
  return service.execution.run(async (signal) => {
    const a = await c.unitOfWorkProvider.run(async (u) => {
      const old = await u.openRouterAttempts.find(id);
      if (old?.state !== "checking" || old.version !== expectedVersion)
        throw changed();
      await current(c, u, request, old);
      const next = { ...old, version: old.version + 1 };
      await replace(u, old, next);
      return next;
    });
    const credential = service.protector.reveal(a.candidateEnvelope, {
      purpose: "candidate",
      accountId: a.actor.accountId,
      attemptId: a.id,
      browser: a.browser,
    });
    return inspectAndPromote(c, request, a, credential, signal);
  });
}
export async function cancelOpenRouterAttempt(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const a = await u.openRouterAttempts.find(id);
    if (!a) throw changed();
    await requireAuthenticationContext(c, u, request, a);
    if (a.state === "failed" || a.state === "completed") return;
    await replace(u, a, {
      ...a,
      state: "failed",
      failure: "OPENROUTER_CANCELLED",
      version: a.version + 1,
    });
  });
}
export async function unlinkOpenRouter(
  c: HollowContainer,
  request: AuthenticationRequest,
  expected: Readonly<{ epoch: number; version: number }>,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const context = await requireOpenRouterActor(c, u, request);
    const old = await u.openRouterConnections.ensure(
      context.actor.accountId,
      c.clock.now(),
    );
    if (old.epoch !== expected.epoch || old.version !== expected.version)
      throw changed();
    const value: OpenRouterConnection = {
      ...old,
      epoch: old.epoch + 1,
      version: old.version + 1,
      state: "unlinked",
      credentialEnvelope: null,
      keyExpiresAt: null,
      providerUserId: null,
      linkedAt: null,
      lastUsedAt: null,
      updatedAt: c.clock.now(),
    };
    if (!(await u.openRouterConnections.replace(value, old.version)))
      throw changed();
    await u.openRouterAttempts.fenceAccount(old.accountId, null);
  });
}

export async function checkOpenRouterConnection(
  c: HollowContainer,
  request: AuthenticationRequest,
  expected: Readonly<{ epoch: number; version: number }>,
) {
  const service = openRouterServices(c);
  const captured = await c.unitOfWorkProvider.run(async (u) => {
    const context = await requireOpenRouterActor(c, u, request);
    const connection = await u.openRouterConnections.find(
      context.actor.accountId,
    );
    if (
      !connection ||
      connection.state !== "linked" ||
      connection.epoch !== expected.epoch ||
      connection.version !== expected.version
    )
      throw changed();
    return { context, connection };
  });
  const credential = service.protector.reveal(
    captured.connection.credentialEnvelope,
    {
      purpose: "credential",
      accountId: captured.context.actor.accountId,
      epoch: captured.connection.epoch,
    },
  );
  let invalid = false;
  try {
    await service.execution.run((signal) =>
      service.authorization.inspectCredential({ credential, signal }),
    );
  } catch (error) {
    if (
      !isOpenRouterProviderError(error) ||
      error.code !== "OPENROUTER_CREDENTIAL_INVALID"
    )
      throw error;
    invalid = true;
  }
  await c.unitOfWorkProvider.run(async (u) => {
    await requireAuthenticationContext(c, u, request, captured.context);
    const now = await u.openRouterConnections.find(
      captured.context.actor.accountId,
    );
    if (
      !now ||
      now.state !== "linked" ||
      now.epoch !== expected.epoch ||
      now.version !== expected.version
    )
      throw changed();
    if (
      invalid &&
      !(await u.openRouterConnections.replace(
        {
          ...now,
          state: "needs_relink",
          version: now.version + 1,
          updatedAt: c.clock.now(),
        },
        now.version,
      ))
    )
      throw changed();
  });
}

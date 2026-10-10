import {
  AUTH_ATTEMPT_MS,
  AUTH_REAUTH_MS,
  type AuthFailure,
  type AuthIntent,
  type AuthReturn,
  type GoogleAttempt,
  type GoogleClaims,
  type GoogleIdentity,
} from "@repo/core/domain/account/authentication";
import type { Account } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, ForbiddenError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import {
  authContextChanged,
  captureAuthentication,
  requireAuthenticationContext,
  transitionSession,
} from "./context";
import { withCredentialUse } from "./deletionWorker";
import type { AuthenticationRequest } from "./ports";
import type { IssuedSession } from "./session";

export type GoogleCompletion = Readonly<{
  id: string;
  session?: IssuedSession;
  reauthProof?: string;
}>;
const expired = () =>
  new ForbiddenError(
    "AUTH_EXPIRED",
    "認証の有効期限が切れました。新しい認証手続きを開始してください。",
  );

export function googleAuthentication(c: HollowContainer) {
  if (!c.googleAuthentication || !c.googleAuthentication.protector.available())
    throw new ConflictError(
      "GOOGLE_NOT_CONFIGURED",
      "Google認証を現在利用できません。パスワード認証をご利用ください。",
    );
  return c.googleAuthentication;
}

export async function assertCurrentGoogleAttempt(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
  a: GoogleAttempt,
) {
  const now = c.clock.now();
  if (a.expiresAt <= now || ("claims" in a && a.claims.expiresAt <= now))
    throw expired();
  await requireAuthenticationContext(c, u, request, {
    browser: a.browser,
    actor: a.actor,
  });
}

export async function beginGoogleAuthentication(
  c: HollowContainer,
  request: AuthenticationRequest,
  mode: AuthIntent["mode"],
  returnTo: AuthReturn,
) {
  const google = googleAuthentication(c);
  const id = c.idGenerator.next();
  const state = c.tokens.generate();
  const nonce = c.tokens.generate();
  const verifier = c.tokens.generate();
  const a = await c.unitOfWorkProvider.run(async (u) => {
    const now = c.clock.now();
    const context = await captureAuthentication(c, u, request);
    if (mode !== "login" && !context.actor) throw authContextChanged();
    const intent: AuthIntent =
      mode === "login"
        ? { mode, actor: context.actor }
        : context.actor
          ? { mode, actor: context.actor }
          : (() => {
              throw authContextChanged();
            })();
    if (
      (await u.googleAttempts.countRecent(
        context.browser.hash,
        new Date(now.getTime() - AUTH_ATTEMPT_MS),
      )) >= 5 ||
      (await u.googleAttempts.countActive(context.browser.hash, now)) >= 3
    )
      throw new ConflictError(
        "AUTH_RATE_LIMIT",
        "認証の試行が続いています。しばらく待ってからやり直してください。",
      );
    const expiresAt = new Date(now.getTime() + AUTH_ATTEMPT_MS);
    await u.authBrowsers.ensure(context.browser.hash, expiresAt, now);
    const attempt: GoogleAttempt & { state: "pending" } = {
      id,
      ...intent,
      browser: context.browser,
      stateHash: c.tokens.hash(state),
      nonceHash: c.tokens.hash(nonce),
      returnTo,
      createdAt: now,
      expiresAt,
      version: 1,
      state: "pending",
      verifierEnvelope: google.protector.protect(verifier, {
        attemptId: id,
        mode,
        browser: context.browser,
      }),
    };
    await u.googleAttempts.insert(attempt);
    return attempt;
  });
  const authorizationUrl = await google.provider.authorization({
    state,
    nonce,
    verifier,
    mode: a.mode,
  });
  return { id, authorizationUrl };
}

async function replace(
  _c: HollowContainer,
  u: HollowUnitOfWorkContext,
  old: GoogleAttempt,
  state: GoogleAttempt,
) {
  if (!(await u.googleAttempts.replace(state, old.version)))
    throw authContextChanged();
  return state;
}

function identity(c: HollowContainer, claims: GoogleClaims): GoogleIdentity {
  return {
    issuer: claims.issuer,
    subject: claims.subject,
    linkedAt: c.clock.now(),
  };
}

async function finish(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  a: GoogleAttempt,
  account: Account,
): Promise<GoogleCompletion> {
  await u.accountDeletions.adoptGoogleCredentials({
    attemptId: a.id,
    expectedVersion: a.version,
    accountId: account.id,
  });
  const session =
    a.mode === "login"
      ? await transitionSession(
          c,
          u,
          { browser: a.browser, actor: a.actor },
          account,
        )
      : undefined;
  await replace(c, u, a, {
    ...a,
    state: "completed",
    resultAccountId: account.id,
    version: a.version + 1,
  });
  return { id: a.id, ...(session ? { session } : {}) };
}

export async function acceptGoogleClaims(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  a: GoogleAttempt & Readonly<{ claims: GoogleClaims }>,
): Promise<GoogleCompletion> {
  const linked = await u.authentication.findByGoogle(a.claims.subject);
  if (a.mode === "reauth") {
    if (
      !a.actor ||
      linked?.id !== a.actor.accountId ||
      linked.google?.subject !== a.claims.subject
    )
      throw new ForbiddenError(
        "AUTH_ACCOUNT_MISMATCH",
        "現在のGoogleアカウントで本人確認してください。",
      );
    const proof = c.tokens.generate();
    await replace(c, u, a, {
      ...a,
      state: "reauth-ready",
      proofHash: c.tokens.hash(proof),
      proofExpiresAt: new Date(
        Math.min(
          c.clock.now().getTime() + AUTH_REAUTH_MS,
          a.expiresAt.getTime(),
          a.claims.expiresAt.getTime(),
        ),
      ),
      version: a.version + 1,
    });
    return { id: a.id, reauthProof: proof };
  }
  if (linked) {
    if (a.mode === "link" && linked.id !== a.actor.accountId)
      throw new ConflictError(
        "AUTH_CONFLICT",
        "このGoogleアカウントは別のアカウントに連携されています。",
      );
    if (linked.status !== "verified")
      throw new ForbiddenError(
        "AUTH_UNVERIFIED",
        "先にメールアドレスを確認してください。",
      );
    return finish(c, u, a, linked);
  }
  let target =
    a.mode === "link"
      ? await u.accounts.findById(a.actor.accountId)
      : await u.accounts.findByEmail(a.claims.email);
  if (target) {
    if (target.status !== "verified")
      throw new ForbiddenError(
        "AUTH_UNVERIFIED",
        "先に通常の確認メールでメールアドレスを確認してください。",
      );
    if (target.google)
      throw new ConflictError(
        "AUTH_CONFLICT",
        "別のGoogleアカウントが連携されています。",
      );
    if (!a.claims.authoritative) {
      await replace(c, u, a, {
        ...a,
        state: "proof-required",
        targetAccountId: target.id,
        targetAuthVersion: target.authVersion,
        version: a.version + 1,
      });
      return { id: a.id };
    }
    if (
      !(await u.authentication.linkGoogle(
        target.id,
        target.authVersion,
        identity(c, a.claims),
      ))
    )
      throw authContextChanged();
    target = await u.accounts.findById(target.id);
    if (!target) throw authContextChanged();
  } else {
    if (a.mode !== "login") throw authContextChanged();
    target = await u.authentication.createGoogle({
      id: c.idGenerator.next(),
      email: a.claims.email,
      identity: identity(c, a.claims),
      now: c.clock.now(),
    });
  }
  return finish(c, u, a, target);
}

export async function rejectGoogleCallback(
  c: HollowContainer,
  request: AuthenticationRequest,
  state: string,
  failure: "AUTH_CANCELLED" | "AUTH_PROVIDER_REJECTED",
): Promise<{ id: string; cancelled: boolean }> {
  return c.unitOfWorkProvider.run(async (u) => {
    const a = await u.googleAttempts.findByState(c.tokens.hash(state));
    if (!a) throw expired();
    await assertCurrentGoogleAttempt(c, u, request, a);
    if (a.state === "pending") {
      await replace(c, u, a, {
        ...a,
        state: "failed",
        failure,
        version: a.version + 1,
      });
      return { id: a.id, cancelled: failure === "AUTH_CANCELLED" };
    }
    return {
      id: a.id,
      cancelled: a.state === "failed" && a.failure === "AUTH_CANCELLED",
    };
  });
}

export async function completeGoogleCallback(
  c: HollowContainer,
  request: AuthenticationRequest,
  state: string,
  code: string,
): Promise<GoogleCompletion> {
  const google = googleAuthentication(c);
  const claimed = await c.unitOfWorkProvider.run(async (u) => {
    const a = await u.googleAttempts.findByState(c.tokens.hash(state));
    if (!a) throw expired();
    await assertCurrentGoogleAttempt(c, u, request, a);
    if (a.state !== "pending") return { id: a.id, attempt: null };
    const next: GoogleAttempt & { state: "exchanging" } = {
      ...a,
      state: "exchanging",
      version: a.version + 1,
    };
    await replace(c, u, a, next);
    return { id: a.id, attempt: next };
  });
  const a = claimed.attempt;
  if (!a) return { id: claimed.id };
  return withCredentialUse(
    c,
    google.execution,
    google.provider,
    {
      provider: "google",
      operation: "callback",
      source: { kind: "google-attempt", id: a.id, version: a.version },
      authority: a.actor
        ? {
            kind: "account",
            accountId: a.actor.accountId,
            authVersion: a.actor.authVersion,
            browserHash: a.browser.hash,
            browserEpoch: a.browser.epoch,
          }
        : {
            kind: "unresolved-google",
            accountId: null,
            authVersion: null,
            browserHash: a.browser.hash,
            browserEpoch: a.browser.epoch,
          },
    },
    async (signal) => {
      let claims: GoogleClaims;
      try {
        const verifier = google.protector.reveal(a.verifierEnvelope, {
          attemptId: a.id,
          mode: a.mode,
          browser: a.browser,
        });
        claims = await google.provider.exchange({
          code,
          verifier,
          nonceHash: a.nonceHash,
          signal,
        });
      } catch {
        await c.unitOfWorkProvider.run(async (u) => {
          const current = await u.googleAttempts.find(a.id);
          if (current?.state === "exchanging" && current.version === a.version)
            await replace(c, u, current, {
              ...current,
              state: "failed",
              failure: "AUTH_EXCHANGE_UNKNOWN",
              version: current.version + 1,
            });
        });
        return { id: a.id };
      }
      try {
        return await c.unitOfWorkProvider.run(async (u) => {
          const current = await u.googleAttempts.find(a.id);
          if (
            !current ||
            current.state !== "exchanging" ||
            current.version !== a.version
          )
            throw authContextChanged();
          await assertCurrentGoogleAttempt(c, u, request, current);
          if (claims.expiresAt <= c.clock.now()) throw expired();
          const verified: GoogleAttempt & {
            state: "verified";
            claims: GoogleClaims;
          } = {
            ...current,
            state: "verified",
            claims,
            targetAccountId: null,
            targetAuthVersion: null,
            version: current.version + 1,
          };
          await replace(c, u, current, verified);
          return acceptGoogleClaims(c, u, verified);
        });
      } catch (cause) {
        if (cause instanceof ForbiddenError || cause instanceof ConflictError) {
          const failure: AuthFailure | null =
            cause.code === "AUTH_UNVERIFIED"
              ? "AUTH_UNVERIFIED"
              : cause.code === "AUTH_EXPIRED"
                ? "AUTH_EXPIRED"
                : cause.code === "AUTH_CONTEXT_CHANGED"
                  ? "AUTH_CONTEXT_CHANGED"
                  : cause.code === "AUTH_CONFLICT" ||
                      cause.code === "AUTH_ACCOUNT_MISMATCH"
                    ? "AUTH_CONFLICT"
                    : null;
          if (failure)
            await c.unitOfWorkProvider.run(async (u) => {
              const current = await u.googleAttempts.find(a.id);
              if (
                current?.state === "exchanging" &&
                current.version === a.version
              )
                await replace(c, u, current, {
                  ...current,
                  state: "failed",
                  failure,
                  version: current.version + 1,
                });
            });
        }
        throw cause;
      }
    },
  );
}

export async function getGoogleResult(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const a = await u.googleAttempts.find(id);
    if (
      !a ||
      a.expiresAt <= c.clock.now() ||
      a.browser.hash !== c.tokens.hash(request.browserToken)
    )
      throw expired();
    const current = await captureAuthentication(c, u, request);
    if (a.state === "completed" && a.mode === "login") {
      if (
        current.browser.epoch !== a.browser.epoch + 1 ||
        current.actor?.accountId !== a.resultAccountId
      )
        throw authContextChanged();
    } else if (a.state === "completed") {
      if (
        current.browser.epoch !== a.browser.epoch ||
        current.actor?.accountId !== a.resultAccountId ||
        current.actor.sessionHash !== a.actor?.sessionHash
      )
        throw authContextChanged();
    } else await assertCurrentGoogleAttempt(c, u, request, a);
    const target =
      a.state === "proof-required" && a.targetAccountId
        ? await u.accounts.findById(a.targetAccountId)
        : null;
    return {
      id: a.id,
      mode: a.mode,
      state: a.state,
      failure: a.state === "failed" ? a.failure : null,
      passwordProof: target?.passwordHash != null,
      returnTo: a.returnTo,
    };
  });
}

export async function finishGoogleProof(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
  a: GoogleAttempt &
    Readonly<{ state: "proof-required"; claims: GoogleClaims }>,
) {
  await assertCurrentGoogleAttempt(c, u, request, a);
  if (!a.targetAccountId || a.targetAuthVersion === null)
    throw authContextChanged();
  const target = await u.accounts.findById(a.targetAccountId);
  if (
    !target ||
    target.status !== "verified" ||
    target.authVersion !== a.targetAuthVersion ||
    target.google
  )
    throw authContextChanged();
  const bound = await u.authentication.findByGoogle(a.claims.subject);
  if (
    bound ||
    !(await u.authentication.linkGoogle(
      target.id,
      target.authVersion,
      identity(c, a.claims),
    ))
  )
    throw authContextChanged();
  const updated = await u.accounts.findById(target.id);
  if (!updated) throw authContextChanged();
  return finish(c, u, a, updated);
}

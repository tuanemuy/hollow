import { assertPassword } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, ForbiddenError } from "../errors";
import {
  authContextChanged,
  captureAuthentication,
  requireAuthenticationContext,
} from "./context";
import { assertCurrentGoogleAttempt } from "./google";
import type { AuthenticationRequest } from "./ports";

export async function loginMethods(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const context = await captureAuthentication(c, u, request);
    const account = context.actor
      ? await u.accounts.findById(context.actor.accountId)
      : null;
    if (!account) throw authContextChanged();
    return {
      password: account.passwordHash !== null,
      google: account.google !== null,
      version: account.authVersion,
      googleAvailable: Boolean(c.googleAuthentication?.protector.available()),
    };
  });
}

export async function changePassword(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    version: number;
    currentPassword: string;
    password: string;
    confirmation: string;
  }>,
) {
  assertPassword(input.password);
  if (input.password !== input.confirmation)
    throw new ForbiddenError(
      "PASSWORD_MISMATCH",
      "新しいパスワードが一致しません。",
    );
  const old = await c.unitOfWorkProvider.run(async (u) => {
    const context = await captureAuthentication(c, u, request);
    const account = context.actor
      ? await u.accounts.findById(context.actor.accountId)
      : null;
    if (!account?.passwordHash || account.authVersion !== input.version)
      throw authContextChanged();
    return { context, account };
  });
  if (
    !(await c.passwordHasher.verify(
      input.currentPassword,
      old.account.passwordHash ?? "",
    ))
  )
    throw new ForbiddenError(
      "INVALID_CREDENTIALS",
      "現在のパスワードを確認してください。",
    );
  const hash = await c.passwordHasher.hash(input.password);
  await c.unitOfWorkProvider.run(async (u) => {
    await requireAuthenticationContext(c, u, request, old.context);
    if (
      !(await u.authentication.setPassword(old.account.id, input.version, hash))
    )
      throw authContextChanged();
    await u.authentication.deleteOtherSessions(
      old.account.id,
      old.context.actor?.sessionHash ?? null,
    );
  });
}

export async function addPassword(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    attemptId: string;
    proof: string;
    password: string;
    confirmation: string;
  }>,
) {
  assertPassword(input.password);
  if (input.password !== input.confirmation)
    throw new ForbiddenError(
      "PASSWORD_MISMATCH",
      "新しいパスワードが一致しません。",
    );
  const hash = await c.passwordHasher.hash(input.password);
  await c.unitOfWorkProvider.run(async (u) => {
    const a = await u.googleAttempts.find(input.attemptId);
    if (
      !a ||
      a.state !== "reauth-ready" ||
      a.mode !== "reauth" ||
      !a.actor ||
      a.proofExpiresAt <= c.clock.now() ||
      a.proofHash !== c.tokens.hash(input.proof)
    )
      throw new ForbiddenError(
        "AUTH_PROOF_INVALID",
        "Googleで本人確認をやり直してください。",
      );
    await assertCurrentGoogleAttempt(c, u, request, a);
    const account = await u.accounts.findById(a.actor.accountId);
    if (
      !account ||
      account.passwordHash !== null ||
      account.google.subject !== a.claims.subject
    )
      throw authContextChanged();
    if (
      !(await u.authentication.setPassword(
        account.id,
        account.authVersion,
        hash,
      ))
    )
      throw authContextChanged();
    if (
      !(await u.googleAttempts.replace(
        {
          ...a,
          state: "completed",
          resultAccountId: account.id,
          version: a.version + 1,
        },
        a.version,
      ))
    )
      throw authContextChanged();
  });
}

export async function removeLoginMethod(
  c: HollowContainer,
  request: AuthenticationRequest,
  method: "google" | "password",
  version: number,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const context = await captureAuthentication(c, u, request);
    const account = context.actor
      ? await u.accounts.findById(context.actor.accountId)
      : null;
    if (!account || account.authVersion !== version) throw authContextChanged();
    if (!account.passwordHash || !account.google)
      throw new ConflictError(
        "AUTH_LAST_METHOD",
        "最後のログイン方法は解除できません。",
      );
    const updated =
      method === "google"
        ? await u.authentication.unlinkGoogle(account.id, version)
        : await u.authentication.setPassword(account.id, version, null);
    if (!updated) throw authContextChanged();
  });
}

export async function signOutOtherSessions(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const context = await captureAuthentication(c, u, request);
    if (!context.actor) throw authContextChanged();
    await u.authentication.deleteOtherSessions(
      context.actor.accountId,
      context.actor.sessionHash,
    );
  });
}

import {
  AUTH_ATTEMPT_MS,
  type AuthActor,
  type AuthBrowserBinding,
  sameAuthBrowser,
} from "@repo/core/domain/account/authentication";
import type { Account } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { AuthenticationRequest } from "./ports";
import {
  type IssuedSession,
  issueSession,
  SESSION_LIFETIME_MS,
} from "./session";

export type AuthenticationContext = Readonly<{
  browser: AuthBrowserBinding;
  actor: AuthActor | null;
}>;
export const authContextChanged = () =>
  new ConflictError(
    "AUTH_CONTEXT_CHANGED",
    "認証状況が変わりました。この画面を開き直してください。",
  );

export async function ensureAuthenticationBrowser(
  c: HollowContainer,
  token: string,
) {
  const now = c.clock.now();
  return c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure(
      c.tokens.hash(token),
      new Date(now.getTime() + SESSION_LIFETIME_MS),
      now,
    ),
  );
}

export async function captureAuthentication(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
): Promise<AuthenticationContext> {
  const browser = await u.authBrowsers.find(
    c.tokens.hash(request.browserToken),
  );
  if (!browser) throw authContextChanged();
  const sessionHash = request.sessionToken
    ? c.tokens.hash(request.sessionToken)
    : null;
  const session = sessionHash
    ? await u.accounts.findSession(sessionHash)
    : null;
  if (!session || session.expiresAt <= c.clock.now() || !sessionHash)
    return { browser, actor: null };
  if (session.browser && !sameAuthBrowser(session.browser, browser))
    throw authContextChanged();
  if (!session.browser) {
    if (!(await u.authBrowsers.bindLegacy(sessionHash, browser)))
      throw authContextChanged();
    await u.authBrowsers.ensure(browser.hash, session.expiresAt, c.clock.now());
  }
  const account = await u.accounts.findById(session.accountId);
  if (!account || account.status !== "verified") throw authContextChanged();
  return {
    browser,
    actor: {
      accountId: account.id,
      sessionHash,
      authVersion: account.authVersion,
    },
  };
}

export async function requireAuthenticationContext(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
  expected: AuthenticationContext,
) {
  const current = await captureAuthentication(c, u, request);
  if (
    !sameAuthBrowser(current.browser, expected.browser) ||
    current.actor?.accountId !== expected.actor?.accountId ||
    current.actor?.sessionHash !== expected.actor?.sessionHash ||
    current.actor?.authVersion !== expected.actor?.authVersion
  )
    throw authContextChanged();
  return current;
}

export async function transitionSession(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  context: AuthenticationContext,
  account: Account,
): Promise<IssuedSession> {
  const now = c.clock.now();
  const next = await u.authBrowsers.advance(
    context.browser,
    new Date(now.getTime() + SESSION_LIFETIME_MS),
    now,
  );
  if (!next) throw authContextChanged();
  if (context.actor) await u.accounts.deleteSession(context.actor.sessionHash);
  return issueSession(c, u.accounts, account, next);
}

export async function signOutAuthentication(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  await c.unitOfWorkProvider.run(async (u) => {
    const sessionHash = request.sessionToken
      ? c.tokens.hash(request.sessionToken)
      : null;
    const session = sessionHash
      ? await u.accounts.findSession(sessionHash)
      : null;
    const context =
      session?.browser ??
      (await u.authBrowsers.find(c.tokens.hash(request.browserToken)));
    if (
      context &&
      !(await u.authBrowsers.advance(
        context,
        new Date(c.clock.now().getTime() + AUTH_ATTEMPT_MS),
        c.clock.now(),
      ))
    )
      throw authContextChanged();
    if (sessionHash) await u.accounts.deleteSession(sessionHash);
  });
}

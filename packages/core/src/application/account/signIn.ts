import { accountEmail } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { UnauthorizedError } from "../errors";
import {
  authContextChanged,
  captureAuthentication,
  requireAuthenticationContext,
  transitionSession,
} from "./context";
import type { AuthenticationRequest } from "./ports";
import { issueSession } from "./session";

export async function signIn(
  container: HollowContainer,
  input: Readonly<{ email: string; password: string }>,
  request?: AuthenticationRequest,
) {
  const email = accountEmail(input.email);
  const snapshot = await container.unitOfWorkProvider.run(async (u) => ({
    account: await u.accounts.findByEmail(email),
    context: request
      ? await captureAuthentication(container, u, request)
      : null,
    throttle: await u.accounts.findThrottle(`signin:${email}`),
  }));
  if (
    snapshot.throttle &&
    snapshot.throttle.blockedUntil > container.clock.now()
  ) {
    throw new UnauthorizedError(
      snapshot.throttle.attempts >= 8 ? "SIGNIN_LOCKED" : "SIGNIN_WAIT",
      snapshot.throttle.attempts >= 8
        ? "サインインは一時的にロックされています。15分待ってからやり直してください。"
        : "しばらく待ってからサインインをやり直してください。",
    );
  }
  const valid = await container.passwordHasher.verify(
    input.password,
    snapshot.account?.passwordHash ?? "",
  );
  const outcome = await container.unitOfWorkProvider.run(async (u) => {
    const { accounts } = u;
    if (request && snapshot.context)
      await requireAuthenticationContext(
        container,
        u,
        request,
        snapshot.context,
      );
    const now = container.clock.now();
    const key = `signin:${email}`;
    const throttle = await accounts.findThrottle(key);
    if (throttle && throttle.blockedUntil > now) {
      return {
        error: new UnauthorizedError(
          throttle.attempts >= 8 ? "SIGNIN_LOCKED" : "SIGNIN_WAIT",
          throttle.attempts >= 8
            ? "サインインは一時的にロックされています。15分待ってからやり直してください。"
            : "しばらく待ってからサインインをやり直してください。",
        ),
      };
    }
    const account = await accounts.findByEmail(email);
    if (
      account?.id !== snapshot.account?.id ||
      account?.authVersion !== snapshot.account?.authVersion ||
      account?.passwordHash !== snapshot.account?.passwordHash
    )
      throw authContextChanged();
    if (!account || !account.passwordHash || !valid) {
      const attempts =
        !throttle ||
        now.getTime() - throttle.lastAttemptAt.getTime() > 15 * 60_000
          ? 1
          : throttle.attempts + 1;
      const delay =
        attempts >= 8
          ? 15 * 60_000
          : attempts < 3
            ? 0
            : 2 ** (attempts - 3) * 1000;
      await accounts.saveThrottle({
        key,
        attempts,
        blockedUntil: new Date(now.getTime() + delay),
        lastAttemptAt: now,
      });
      return {
        error: new UnauthorizedError(
          "INVALID_CREDENTIALS",
          "メールアドレスまたはパスワードを確認してください。",
        ),
      };
    }
    if (account.status !== "verified")
      return {
        error: new UnauthorizedError(
          "EMAIL_UNVERIFIED",
          "メールアドレスの確認が必要です。確認メールを再送できます。",
        ),
      };
    await accounts.deleteThrottle(key);
    return {
      session: snapshot.context
        ? await transitionSession(container, u, snapshot.context, account)
        : await issueSession(container, accounts, account),
    };
  });
  if (outcome.error) throw outcome.error;
  return outcome.session;
}

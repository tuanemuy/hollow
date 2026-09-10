import { accountEmail } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { UnauthorizedError } from "../errors";
import { issueSession } from "./session";

export async function signIn(
  container: HollowContainer,
  input: Readonly<{ email: string; password: string }>,
) {
  const email = accountEmail(input.email);
  const outcome = await container.unitOfWorkProvider.run(
    async ({ accounts }) => {
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
      const valid = await container.passwordHasher.verify(
        input.password,
        account?.passwordHash ?? "",
      );
      if (!account || !valid) {
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
      return { session: await issueSession(container, accounts, account) };
    },
  );
  if (outcome.error) throw outcome.error;
  return outcome.session;
}

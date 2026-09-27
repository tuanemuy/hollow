import { verifyAccount } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ForbiddenError } from "../errors";
import { captureAuthentication, transitionSession } from "./context";
import type { AuthenticationRequest } from "./ports";
import { type IssuedSession, issueSession } from "./session";

export async function verifyEmail(
  container: HollowContainer,
  token: string,
  browserToken: string | null,
  request?: AuthenticationRequest,
): Promise<IssuedSession | null> {
  return container.unitOfWorkProvider.run(async (u) => {
    const { accounts } = u;
    const authContext = request
      ? await captureAuthentication(container, u, request)
      : null;
    const verification = await accounts.findVerification(
      container.tokens.hash(token),
    );
    if (!verification)
      throw new ForbiddenError(
        "VERIFICATION_INVALID",
        "確認リンクが無効です。確認メールを再送してください。",
      );
    if (verification.consumedAt)
      throw new ForbiddenError(
        "VERIFICATION_USED",
        "このリンクは確認済みです。サインインしてください。",
      );
    const now = container.clock.now();
    if (verification.expiresAt <= now)
      throw new ForbiddenError(
        "VERIFICATION_EXPIRED",
        "確認リンクの有効期限が切れています。確認メールを再送してください。",
      );
    const account = await accounts.findById(verification.accountId);
    if (!account)
      throw new ForbiddenError(
        "VERIFICATION_INVALID",
        "確認リンクが無効です。",
      );
    const verified = verifyAccount(account, now);
    if (
      account.status === "unverified" &&
      !(await accounts.markVerified(account.id, account.authVersion, now))
    ) {
      throw new ForbiddenError(
        "VERIFICATION_INVALID",
        "確認リンクが無効です。",
      );
    }
    await accounts.saveVerification({ ...verification, consumedAt: now });
    return browserToken &&
      container.tokens.hash(browserToken) === verification.browserHash
      ? authContext
        ? transitionSession(container, u, authContext, verified)
        : issueSession(container, accounts, verified)
      : null;
  });
}

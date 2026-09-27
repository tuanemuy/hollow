import {
  type AuthChallenge,
  PASSWORD_RESET_MS,
} from "@repo/core/domain/account/authentication";
import { accountEmail, assertPassword } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ForbiddenError } from "../errors";
import { authContextChanged } from "./context";

export async function requestPasswordReset(c: HollowContainer, value: string) {
  const email = accountEmail(value);
  const token = c.tokens.generate();
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const now = c.clock.now();
    const key = `mail:${email}`;
    const throttle = await u.accounts.findThrottle(key);
    if (throttle && throttle.blockedUntil > now) return null;
    await u.accounts.saveThrottle({
      key,
      attempts: 1,
      blockedUntil: new Date(now.getTime() + 60_000),
      lastAttemptAt: now,
    });
    const account = await u.accounts.findByEmail(email);
    if (!account || account.status !== "verified") return null;
    if (account.passwordHash === null) return "google-only";
    const challenge: AuthChallenge = {
      purpose: "reset",
      tokenHash: c.tokens.hash(token),
      accountId: account.id,
      authVersion: account.authVersion,
      email,
      generation: await u.authChallenges.nextGeneration(account.id, "reset"),
      createdAt: now,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_MS),
      consumedAt: null,
    };
    await u.authChallenges.insert(challenge);
    return "reset";
  });
  if (result === "google-only")
    await c.mailer.send({
      to: email,
      subject: "ログイン方法のご案内",
      text: "このアカウントはGoogleでサインインできます。パスワードを追加する場合は、サインイン後に設定のログイン方法を開いてください。",
    });
  if (result === "reset") {
    const url = new URL("/reset-password", c.appUrl);
    url.searchParams.set("token", token);
    await c.mailer.send({
      to: email,
      subject: "パスワード再設定",
      text: `次のリンクから1時間以内に新しいパスワードを設定してください。\n${url}\n心当たりがない場合は操作しないでください。`,
    });
  }
  return { sent: true as const };
}

export async function resetPassword(
  c: HollowContainer,
  input: Readonly<{ token: string; password: string; confirmation: string }>,
) {
  assertPassword(input.password);
  if (input.password !== input.confirmation)
    throw new ForbiddenError(
      "PASSWORD_MISMATCH",
      "新しいパスワードが一致しません。",
    );
  const hash = await c.passwordHasher.hash(input.password);
  await c.unitOfWorkProvider.run(async (u) => {
    const challenge = await u.authChallenges.find(c.tokens.hash(input.token));
    if (
      !challenge ||
      challenge.purpose !== "reset" ||
      challenge.consumedAt ||
      challenge.expiresAt <= c.clock.now()
    )
      throw new ForbiddenError(
        "RESET_INVALID",
        "再設定リンクが無効または期限切れです。新しいメールを申請してください。",
      );
    const account = await u.accounts.findById(challenge.accountId);
    if (
      !account ||
      account.status !== "verified" ||
      account.passwordHash === null ||
      account.authVersion !== challenge.authVersion ||
      account.email !== challenge.email
    )
      throw authContextChanged();
    if (
      !(await u.authChallenges.consume(challenge.tokenHash, c.clock.now())) ||
      !(await u.authentication.setPassword(
        account.id,
        account.authVersion,
        hash,
      ))
    )
      throw authContextChanged();
    await u.authentication.deleteOtherSessions(account.id, null);
  });
}

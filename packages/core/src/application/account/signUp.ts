import {
  accountEmail,
  assertPassword,
  createAccount,
} from "@repo/core/domain/account/entity";
import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import type { HollowContainer } from "../di/hollowTypes";
import { ForbiddenError } from "../errors";
import type { Mail } from "../ports/mailer";

export const VERIFICATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

async function prepareVerification(
  container: HollowContainer,
  accounts: AccountRepository,
  accountId: string,
  email: string,
  browserToken: string,
): Promise<Mail> {
  const token = container.tokens.generate();
  await accounts.deleteVerifications(accountId);
  await accounts.saveVerification({
    tokenHash: container.tokens.hash(token),
    accountId,
    browserHash: container.tokens.hash(browserToken),
    expiresAt: new Date(
      container.clock.now().getTime() + VERIFICATION_LIFETIME_MS,
    ),
    consumedAt: null,
  });
  const link = new URL("/verify-email", container.appUrl);
  link.searchParams.set("token", token);
  return {
    to: email,
    subject: "Hollow のメールアドレスを確認",
    text: `以下のリンクからメールアドレスを確認してください。リンクは24時間有効です。\n\n${link.href}\n\n心当たりがない場合は、このメールを破棄してください。`,
  };
}

export async function signUp(
  container: HollowContainer,
  input: Readonly<{ email: string; password: string; termsAccepted: boolean }>,
): Promise<{ email: string; browserToken: string | null }> {
  if (!input.termsAccepted)
    throw new ForbiddenError("TERMS_REQUIRED", "利用規約に同意してください。");
  const email = accountEmail(input.email);
  assertPassword(input.password);
  const passwordHash = await container.passwordHasher.hash(input.password);
  const browserToken = container.tokens.generate();
  const outcome = await container.unitOfWorkProvider.run(
    async ({ accounts }) => {
      const existing = await accounts.findByEmail(email);
      const throttleKey = `mail:${email}`;
      const throttle = await accounts.findThrottle(throttleKey);
      const now = container.clock.now();
      if (throttle && throttle.blockedUntil > now)
        return { created: false, mail: null };
      await accounts.saveThrottle({
        key: throttleKey,
        attempts: 1,
        blockedUntil: new Date(now.getTime() + 60_000),
        lastAttemptAt: now,
      });
      if (existing)
        return {
          created: false,
          mail: {
            to: email,
            subject: "Hollow の登録について",
            text: "このアドレスは既に登録済みです。サインイン画面からサインインしてください。未確認の場合は確認メールの再送を選んでください。",
          },
        };
      const account = createAccount(
        container.idGenerator.next(),
        email,
        passwordHash,
        now,
      );
      await accounts.save(account);
      return {
        created: true,
        mail: await prepareVerification(
          container,
          accounts,
          account.id,
          email,
          browserToken,
        ),
      };
    },
  );
  if (outcome.mail) await container.mailer.send(outcome.mail);
  return { email, browserToken: outcome.created ? browserToken : null };
}

export async function resendVerification(
  container: HollowContainer,
  rawEmail: string,
): Promise<{ email: string; browserToken: string | null }> {
  const email = accountEmail(rawEmail);
  const browserToken = container.tokens.generate();
  const outcome = await container.unitOfWorkProvider.run(
    async ({ accounts }) => {
      const key = `mail:${email}`;
      const now = container.clock.now();
      const throttle = await accounts.findThrottle(key);
      if (throttle && throttle.blockedUntil > now)
        throw new ForbiddenError(
          "MAIL_RATE_LIMITED",
          "確認メールの再送は60秒お待ちください。",
        );
      await accounts.saveThrottle({
        key,
        attempts: 1,
        blockedUntil: new Date(now.getTime() + 60_000),
        lastAttemptAt: now,
      });
      const account = await accounts.findByEmail(email);
      if (!account || account.status === "verified") return null;
      return prepareVerification(
        container,
        accounts,
        account.id,
        email,
        browserToken,
      );
    },
  );
  if (outcome) await container.mailer.send(outcome);
  return { email, browserToken: outcome ? browserToken : null };
}

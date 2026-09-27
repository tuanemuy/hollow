import type { AuthBrowserBinding } from "@repo/core/domain/account/authentication";
import type { Account } from "@repo/core/domain/account/entity";
import type { AccountRepository } from "@repo/core/domain/account/ports/accountRepository";
import type { HollowContainer } from "../di/hollowTypes";
import { UnauthorizedError } from "../errors";

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export type UserView = Readonly<{ id: string; email: string }>;
export type IssuedSession = Readonly<{
  token: string;
  expiresAt: Date;
  user: UserView;
}>;

export async function issueSession(
  container: HollowContainer,
  accounts: AccountRepository,
  account: Account,
  browser?: AuthBrowserBinding,
): Promise<IssuedSession> {
  if (account.status !== "verified")
    throw new UnauthorizedError(
      "EMAIL_UNVERIFIED",
      "メールアドレスを確認してください。",
    );
  const token = container.tokens.generate();
  const expiresAt = new Date(
    container.clock.now().getTime() + SESSION_LIFETIME_MS,
  );
  await accounts.saveSession({
    tokenHash: container.tokens.hash(token),
    accountId: account.id,
    expiresAt,
    ...(browser ? { browser } : {}),
  });
  return { token, expiresAt, user: { id: account.id, email: account.email } };
}

export async function requireAccount(
  container: HollowContainer,
  accounts: AccountRepository,
  token: string | null,
): Promise<Account> {
  const session = token
    ? await accounts.findSession(container.tokens.hash(token))
    : null;
  if (!session || session.expiresAt <= container.clock.now())
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  const account = await accounts.findById(session.accountId);
  if (!account || account.status !== "verified")
    throw new UnauthorizedError("SESSION_REQUIRED", "サインインしてください。");
  return account;
}

export async function currentUser(
  container: HollowContainer,
  token: string | null,
): Promise<UserView | null> {
  if (!token) return null;
  return container.unitOfWorkProvider.run(async ({ accounts }) => {
    const session = await accounts.findSession(container.tokens.hash(token));
    if (!session || session.expiresAt <= container.clock.now()) return null;
    const account = await accounts.findById(session.accountId);
    return account?.status === "verified"
      ? { id: account.id, email: account.email }
      : null;
  });
}

export async function signOut(
  container: HollowContainer,
  token: string | null,
): Promise<void> {
  if (!token) return;
  await container.unitOfWorkProvider.run(({ accounts }) =>
    accounts.deleteSession(container.tokens.hash(token)),
  );
}

import type {
  AuthChallenge,
  GoogleAttempt,
  GoogleClaims,
} from "@repo/core/domain/account/authentication";
import type { AuthThrottle } from "@repo/core/domain/account/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { ForbiddenError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { authContextChanged } from "./context";
import { assertCurrentGoogleAttempt, finishGoogleProof } from "./google";
import type { AuthenticationRequest } from "./ports";

type ProofAttempt = GoogleAttempt &
  Readonly<{ state: "proof-required"; claims: GoogleClaims }>;

async function readProof(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
  id: string,
): Promise<ProofAttempt> {
  const a = await u.googleAttempts.find(id);
  if (
    !a ||
    a.state !== "proof-required" ||
    !a.targetAccountId ||
    a.targetAuthVersion === null
  )
    throw authContextChanged();
  await assertCurrentGoogleAttempt(c, u, request, a);
  const target = await u.accounts.findById(a.targetAccountId);
  if (
    !target ||
    target.status !== "verified" ||
    target.authVersion !== a.targetAuthVersion ||
    target.google
  )
    throw authContextChanged();
  return { ...a, state: "proof-required" };
}

function checkProofThrottle(t: AuthThrottle | null, now: Date) {
  if (t && t.blockedUntil > now)
    throw new ForbiddenError(
      "AUTH_PROOF_WAIT",
      "しばらく待ってから本人確認をやり直してください。",
    );
}

export async function proveGoogleWithPassword(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
  password: string,
) {
  const snapshot = await c.unitOfWorkProvider.run(async (u) => {
    const a = await readProof(c, u, request, id);
    if (!a.targetAccountId) throw authContextChanged();
    const target = await u.accounts.findById(a.targetAccountId);
    checkProofThrottle(
      await u.accounts.findThrottle(`google-proof:${a.targetAccountId}`),
      c.clock.now(),
    );
    return { a, hash: target?.passwordHash ?? null };
  });
  const valid = await c.passwordHasher.verify(password, snapshot.hash ?? "");
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const a = await readProof(c, u, request, id);
    if (a.version !== snapshot.a.version || !a.targetAccountId)
      throw authContextChanged();
    const target = await u.accounts.findById(a.targetAccountId);
    if (target?.passwordHash !== snapshot.hash) throw authContextChanged();
    const key = `google-proof:${a.targetAccountId}`;
    const now = c.clock.now();
    const throttle = await u.accounts.findThrottle(key);
    checkProofThrottle(throttle, now);
    if (!snapshot.hash || !valid) {
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
      await u.accounts.saveThrottle({
        key,
        attempts,
        lastAttemptAt: now,
        blockedUntil: new Date(now.getTime() + delay),
      });
      return { ok: false as const };
    }
    await u.accounts.deleteThrottle(key);
    return {
      ok: true as const,
      completion: await finishGoogleProof(c, u, request, a),
    };
  });
  if (!result.ok)
    throw new ForbiddenError(
      "INVALID_CREDENTIALS",
      "パスワードを確認してください。",
    );
  return result.completion;
}

export async function sendGoogleLinkProof(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
) {
  const token = c.tokens.generate();
  const recipient = await c.unitOfWorkProvider.run(async (u) => {
    const a = await readProof(c, u, request, id);
    if (!a.targetAccountId) throw authContextChanged();
    const target = await u.accounts.findById(a.targetAccountId);
    if (!target) throw authContextChanged();
    const now = c.clock.now();
    const key = `mail:${target.email}`;
    const throttle = await u.accounts.findThrottle(key);
    if (throttle && throttle.blockedUntil > now) return null;
    await u.accounts.saveThrottle({
      key,
      attempts: 1,
      blockedUntil: new Date(now.getTime() + 60_000),
      lastAttemptAt: now,
    });
    const challenge: AuthChallenge = {
      purpose: "google-link",
      tokenHash: c.tokens.hash(token),
      accountId: target.id,
      authVersion: target.authVersion,
      email: target.email,
      attemptId: a.id,
      subject: a.claims.subject,
      browser: a.browser,
      generation: await u.authChallenges.nextGeneration(
        target.id,
        "google-link",
      ),
      createdAt: now,
      expiresAt: new Date(
        Math.min(a.expiresAt.getTime(), a.claims.expiresAt.getTime()),
      ),
      consumedAt: null,
    };
    await u.authChallenges.insert(challenge);
    return target.email;
  });
  if (recipient) {
    const url = new URL("/auth/google-proof", c.appUrl);
    url.searchParams.set("token", token);
    await c.mailer.send({
      to: recipient,
      subject: "Googleログイン方法の追加確認",
      text: `Google認証を開始したブラウザで次のリンクを開き、追加を確認してください。\n${url}\n心当たりがない場合は操作しないでください。`,
    });
  }
  return { sent: true as const };
}

export async function proveGoogleWithMail(
  c: HollowContainer,
  request: AuthenticationRequest,
  token: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const challenge = await u.authChallenges.find(c.tokens.hash(token));
    if (
      !challenge ||
      challenge.purpose !== "google-link" ||
      challenge.consumedAt ||
      challenge.expiresAt <= c.clock.now() ||
      c.tokens.hash(request.browserToken) !== challenge.browser.hash
    )
      throw new ForbiddenError(
        "AUTH_PROOF_INVALID",
        "認証を開始したブラウザで、有効な確認リンクを開いてください。",
      );
    const a = await readProof(c, u, request, challenge.attemptId);
    const target = a.targetAccountId
      ? await u.accounts.findById(a.targetAccountId)
      : null;
    if (
      !target ||
      challenge.accountId !== target.id ||
      challenge.authVersion !== target.authVersion ||
      challenge.email !== target.email ||
      challenge.subject !== a.claims.subject ||
      challenge.browser.epoch !== a.browser.epoch
    )
      throw authContextChanged();
    if (!(await u.authChallenges.consume(challenge.tokenHash, c.clock.now())))
      throw authContextChanged();
    return finishGoogleProof(c, u, request, a);
  });
}

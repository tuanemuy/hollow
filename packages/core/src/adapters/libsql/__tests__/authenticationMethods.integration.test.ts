import { NodeAuthenticationExecution } from "@repo/core/adapters/node/authenticationExecution";
import {
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import {
  beginGoogleAuthentication,
  completeGoogleCallback,
} from "@repo/core/application/account/google";
import {
  addPassword,
  changePassword,
  loginMethods,
  removeLoginMethod,
  signOutOtherSessions,
} from "@repo/core/application/account/methods";
import type { AuthenticationRequest } from "@repo/core/application/account/ports";
import {
  proveGoogleWithMail,
  proveGoogleWithPassword,
  sendGoogleLinkProof,
} from "@repo/core/application/account/proof";
import {
  requestPasswordReset,
  resetPassword,
} from "@repo/core/application/account/resetPassword";
import {
  currentUser,
  issueSession,
} from "@repo/core/application/account/session";
import { signIn } from "@repo/core/application/account/signIn";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { Mail } from "@repo/core/application/ports/mailer";
import {
  AUTH_ATTEMPT_MS,
  AUTH_REAUTH_MS,
  GOOGLE_ISSUER,
  type GoogleClaims,
  PASSWORD_RESET_MS,
} from "@repo/core/domain/account/authentication";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("authentication method and proof transactions", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeAuthenticationExecution;
  let now: Date;
  let claims: GoogleClaims;
  let state: string;
  let browserToken: string;
  let mail: Mail[];
  const password = "synthetic-password-123";
  const nextPassword = "synthetic-next-password-456";
  const passwordInput = { password: nextPassword, confirmation: nextPassword };
  const invalidPasswordInputs = [
    {
      password: "short-1",
      confirmation: "short-1",
      code: "WEAK_PASSWORD",
    },
    {
      password: "onlyletterslongenough",
      confirmation: "onlyletterslongenough",
      code: "WEAK_PASSWORD",
    },
    {
      password: nextPassword,
      confirmation: "different-confirmation-789",
      code: "PASSWORD_MISMATCH",
    },
  ];

  beforeEach(async () => {
    base = await createTestContainer();
    execution = new NodeAuthenticationExecution();
    now = new Date("2026-09-27T13:00:00Z");
    claims = {
      issuer: GOOGLE_ISSUER,
      subject: "synthetic-method-subject",
      email: "methods@fixture.invalid",
      authoritative: false,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + AUTH_ATTEMPT_MS),
    };
    state = "";
    mail = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        send: async (message) => {
          mail.push(message);
        },
      }),
      clock: { now: () => now },
      passwordHasher: {
        hash: async (value) => `synthetic:${value}`,
        verify: async (value, hash) => hash === `synthetic:${value}`,
      },
      googleAuthentication: {
        execution,
        protector: {
          available: () => true,
          protect: () => "synthetic-envelope",
          reveal: () => "synthetic-verifier",
        },
        provider: {
          authorization: async (input) => {
            state = input.state;
            return "http://localhost:3000/contract-only";
          },
          exchange: async () => claims,
        },
      },
    };
    browserToken = c.tokens.generate();
    await ensureAuthenticationBrowser(c, browserToken);
  });

  afterEach(async () => {
    try {
      await execution.stop();
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base.close();
    }
  });

  const anonymous = (): AuthenticationRequest => ({
    browserToken,
    sessionToken: null,
  });
  const advance = (milliseconds: number) => {
    now = new Date(now.getTime() + milliseconds);
  };
  const account = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.accounts.findById(id));
  async function seed(email = claims.email) {
    const value = verifyAccount(
      createAccount(
        c.idGenerator.next(),
        email,
        await c.passwordHasher.hash(password),
        now,
      ),
      now,
    );
    await c.unitOfWorkProvider.run((u) => u.accounts.save(value));
    return value.id;
  }
  async function session(id: string, token = browserToken) {
    const binding = await ensureAuthenticationBrowser(c, token);
    const issued = await c.unitOfWorkProvider.run(async (u) => {
      const value = await u.accounts.findById(id);
      if (!value) throw new Error("fixture account missing");
      return issueSession(c, u.accounts, value, binding);
    });
    return {
      request: { browserToken: token, sessionToken: issued.token },
      issued,
    };
  }
  async function google(
    request = anonymous(),
    mode: "login" | "link" | "reauth" = "login",
  ) {
    const attempt = await beginGoogleAuthentication(c, request, mode, {
      kind: "methods",
    });
    const completion = await completeGoogleCallback(
      c,
      request,
      state,
      "synthetic-code",
    );
    return { attempt, completion };
  }
  async function googleOnly() {
    const { completion } = await google();
    if (!completion.session) throw new Error("fixture Google session missing");
    return {
      id: completion.session.user.id,
      request: { browserToken, sessionToken: completion.session.token },
    };
  }
  async function otherBrowser() {
    const token = c.tokens.generate();
    await ensureAuthenticationBrowser(c, token);
    return { browserToken: token, sessionToken: null };
  }
  function mailToken() {
    const message = mail.at(-1);
    const url = message?.text.match(/http:\/\/localhost:3000\/[^\s]+/u)?.[0];
    const token = url ? new URL(url).searchParams.get("token") : null;
    if (!token) throw new Error("fixture mail token missing");
    return token;
  }

  it("requires current password and original browser, then links and issues one session once", async () => {
    const id = await seed();
    const { attempt } = await google();
    await expect(
      proveGoogleWithPassword(c, await otherBrowser(), attempt.id, password),
    ).rejects.toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
    await expect(
      proveGoogleWithPassword(c, anonymous(), attempt.id, "wrong"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect((await account(id))?.google).toBeNull();
    const result = await proveGoogleWithPassword(
      c,
      anonymous(),
      attempt.id,
      password,
    );
    expect(result.session?.user.id).toBe(id);
    expect((await account(id))?.google?.subject).toBe(claims.subject);
    await expect(
      proveGoogleWithPassword(c, anonymous(), attempt.id, password),
    ).rejects.toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
    expect(
      await base.db.all(sql`select account_id from sessions`),
    ).toHaveLength(1);
  });

  it("does not accept password proof at the fixed parent deadline", async () => {
    const id = await seed();
    const { attempt } = await google();
    advance(AUTH_ATTEMPT_MS);
    await expect(
      proveGoogleWithPassword(c, anonymous(), attempt.id, password),
    ).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
    expect((await account(id))?.google).toBeNull();
  });

  it("does not consume mail in another browser and atomically consumes the original-browser proof once", async () => {
    const id = await seed();
    const { attempt } = await google();
    await sendGoogleLinkProof(c, anonymous(), attempt.id);
    const token = mailToken();
    await expect(
      proveGoogleWithMail(c, await otherBrowser(), token),
    ).rejects.toMatchObject({ code: "AUTH_PROOF_INVALID" });
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.authChallenges.find(c.tokens.hash(token)),
        )
      )?.consumedAt,
    ).toBeNull();
    const result = await proveGoogleWithMail(c, anonymous(), token);
    expect(result.session?.user.id).toBe(id);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.authChallenges.find(c.tokens.hash(token)),
        )
      )?.consumedAt,
    ).toEqual(now);
    await expect(
      proveGoogleWithMail(c, anonymous(), token),
    ).rejects.toMatchObject({ code: "AUTH_PROOF_INVALID" });
    expect(
      await base.db.all(sql`select account_id from sessions`),
    ).toHaveLength(1);
  });

  it("resending mail does not extend the parent deadline and expired mail never links", async () => {
    const id = await seed();
    const { attempt } = await google();
    await sendGoogleLinkProof(c, anonymous(), attempt.id);
    const first = mailToken();
    const initial = await c.unitOfWorkProvider.run((u) =>
      u.authChallenges.find(c.tokens.hash(first)),
    );
    advance(60_000);
    await sendGoogleLinkProof(c, anonymous(), attempt.id);
    const second = mailToken();
    expect(second === first).toBe(false);
    const resent = await c.unitOfWorkProvider.run((u) =>
      u.authChallenges.find(c.tokens.hash(second)),
    );
    expect(resent?.expiresAt).toEqual(initial?.expiresAt);
    advance(AUTH_ATTEMPT_MS - 60_000);
    await expect(
      proveGoogleWithMail(c, anonymous(), second),
    ).rejects.toMatchObject({ code: "AUTH_PROOF_INVALID" });
    expect((await account(id))?.google).toBeNull();
  });

  it("rejects linking another account's Google subject without changing either account, identity or session", async () => {
    const owner = await googleOnly();
    const actorId = await seed("other-methods@fixture.invalid");
    const actor = await session(actorId, c.tokens.generate());
    const beforeOwner = await account(owner.id);
    const beforeActor = await account(actorId);
    const beforeIdentities = await base.db.all(
      sql`select * from google_identities order by account_id`,
    );
    const beforeSessions = await base.db.all(
      sql`select * from sessions order by token_hash`,
    );
    expect(beforeIdentities).toHaveLength(1);
    expect(beforeSessions).toHaveLength(2);

    await expect(google(actor.request, "link")).rejects.toMatchObject({
      code: "AUTH_CONFLICT",
    });

    expect(await account(owner.id)).toEqual(beforeOwner);
    expect(await account(actorId)).toEqual(beforeActor);
    expect(
      await base.db.all(
        sql`select * from google_identities order by account_id`,
      ),
    ).toEqual(beforeIdentities);
    expect(
      await base.db.all(sql`select * from sessions order by token_hash`),
    ).toEqual(beforeSessions);
    expect((await currentUser(c, owner.request.sessionToken))?.id).toBe(
      owner.id,
    );
    expect((await currentUser(c, actor.issued.token))?.id).toBe(actorId);
  });

  it("rejects weak or mismatched added passwords without consuming reauth proof or changing credentials and sessions", async () => {
    const owner = await googleOnly();
    const other = await session(owner.id, c.tokens.generate());
    const { attempt, completion } = await google(owner.request, "reauth");
    if (!completion.reauthProof)
      throw new Error("fixture reauth proof missing");
    const input = {
      attemptId: attempt.id,
      proof: completion.reauthProof,
    };
    const beforeAccount = await account(owner.id);
    const beforeProof = await c.unitOfWorkProvider.run((u) =>
      u.googleAttempts.find(attempt.id),
    );
    const beforeIdentities = await base.db.all(
      sql`select * from google_identities order by account_id`,
    );
    const beforeSessions = await base.db.all(
      sql`select * from sessions order by token_hash`,
    );
    expect(beforeProof).toMatchObject({ state: "reauth-ready" });
    expect(beforeSessions).toHaveLength(2);

    for (const { code, ...invalid } of invalidPasswordInputs) {
      await expect(
        addPassword(c, owner.request, { ...input, ...invalid }),
      ).rejects.toMatchObject({ code });
      expect(await account(owner.id)).toEqual(beforeAccount);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.googleAttempts.find(attempt.id),
        ),
      ).toEqual(beforeProof);
      expect(
        await base.db.all(
          sql`select * from google_identities order by account_id`,
        ),
      ).toEqual(beforeIdentities);
      expect(
        await base.db.all(sql`select * from sessions order by token_hash`),
      ).toEqual(beforeSessions);
      expect((await currentUser(c, owner.request.sessionToken))?.id).toBe(
        owner.id,
      );
      expect((await currentUser(c, other.issued.token))?.id).toBe(owner.id);
    }

    await addPassword(c, owner.request, { ...input, ...passwordInput });
    expect((await account(owner.id))?.passwordHash).toBe(
      `synthetic:${nextPassword}`,
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.googleAttempts.find(attempt.id)),
    ).toMatchObject({ state: "completed" });
    expect(
      await base.db.all(sql`select * from sessions order by token_hash`),
    ).toEqual(beforeSessions);
  });

  it("adds a Google-only password only after new same-sub reauth and consumes proof once", async () => {
    const owner = await googleOnly();
    const originalSessions = await base.db.all(sql`select * from sessions`);
    const { attempt, completion } = await google(owner.request, "reauth");
    if (!completion.reauthProof)
      throw new Error("fixture reauth proof missing");
    expect(completion.session).toBeUndefined();
    const input = {
      attemptId: attempt.id,
      proof: completion.reauthProof,
      ...passwordInput,
    };
    await expect(
      addPassword(
        c,
        { ...owner.request, browserToken: (await otherBrowser()).browserToken },
        input,
      ),
    ).rejects.toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
    await addPassword(c, owner.request, input);
    expect(
      (await account(owner.id))?.passwordHash === `synthetic:${nextPassword}`,
    ).toBe(true);
    expect((await account(owner.id))?.google?.subject).toBe(claims.subject);
    expect(await base.db.all(sql`select * from sessions`)).toEqual(
      originalSessions,
    );
    await expect(addPassword(c, owner.request, input)).rejects.toMatchObject({
      code: "AUTH_PROOF_INVALID",
    });
  });

  it("rejects a different-sub reauth without adding a password", async () => {
    const owner = await googleOnly();
    claims = { ...claims, subject: "different-subject" };
    await expect(google(owner.request, "reauth")).rejects.toMatchObject({
      code: "AUTH_ACCOUNT_MISMATCH",
    });
    expect((await account(owner.id))?.passwordHash).toBeNull();
  });

  it("rejects expired five-minute reauth proof without consuming it", async () => {
    const owner = await googleOnly();
    const { attempt, completion } = await google(owner.request, "reauth");
    if (!completion.reauthProof)
      throw new Error("fixture reauth proof missing");
    advance(AUTH_REAUTH_MS);
    await expect(
      addPassword(c, owner.request, {
        attemptId: attempt.id,
        proof: completion.reauthProof,
        ...passwordInput,
      }),
    ).rejects.toMatchObject({ code: "AUTH_PROOF_INVALID" });
    expect((await account(owner.id))?.passwordHash).toBeNull();
  });

  it("allows only one concurrent removal at a shared version and preserves the last method and sessions", async () => {
    const id = await seed();
    claims = { ...claims, authoritative: true };
    const { completion } = await google();
    if (!completion.session) throw new Error("fixture session missing");
    const request = { browserToken, sessionToken: completion.session.token };
    const beforeSessions = await base.db.all(sql`select * from sessions`);
    const before = await loginMethods(c, request);
    const results = await Promise.allSettled([
      removeLoginMethod(c, request, "google", before.version),
      removeLoginMethod(c, request, "password", before.version),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status !== "rejected")
      throw new Error("fixture conflict missing");
    expect(failed.reason).toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
    const after = await loginMethods(c, request);
    expect(Number(after.password) + Number(after.google)).toBe(1);
    expect(after.version).toBe(before.version + 1);
    await expect(
      removeLoginMethod(
        c,
        request,
        after.password ? "password" : "google",
        after.version,
      ),
    ).rejects.toMatchObject({ code: "AUTH_LAST_METHOD" });
    expect(await base.db.all(sql`select * from sessions`)).toEqual(
      beforeSessions,
    );
    expect((await currentUser(c, request.sessionToken))?.id).toBe(id);
  });

  it("removing Google login preserves the complete existing Drive connection and current session", async () => {
    const id = await seed();
    claims = { ...claims, authoritative: true };
    const { completion } = await google();
    if (!completion.session) throw new Error("fixture session missing");
    const request = { browserToken, sessionToken: completion.session.token };
    await c.unitOfWorkProvider.run(async (u) => {
      const initial = await u.driveConnections.ensure(id, now);
      expect(
        await u.driveConnections.replace(
          {
            ...initial,
            state: "linked",
            epoch: 1,
            credentialVersion: 1,
            settingsVersion: 2,
            version: 2,
            credential: {
              subject: claims.subject,
              email: null,
              envelope: "synthetic-drive-envelope",
              scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
              accessExpiresAt: new Date(now.getTime() + 3_600_000),
              connectedAt: now,
            },
          },
          initial.version,
          "adopt",
        ),
      ).toBe(true);
    });
    const before = await base.db.all(
      sql`select * from drive_connections where account_id=${id}`,
    );
    expect(before).toHaveLength(1);
    const methods = await loginMethods(c, request);
    await removeLoginMethod(c, request, "google", methods.version);
    expect(
      await base.db.all(
        sql`select * from drive_connections where account_id=${id}`,
      ),
    ).toEqual(before);
    expect((await account(id))?.google).toBeNull();
    expect((await account(id))?.passwordHash).toBe(`synthetic:${password}`);
    expect((await currentUser(c, request.sessionToken))?.id).toBe(id);
  });

  it("rejects weak or mismatched changed passwords without changing credentials, version or sessions", async () => {
    const id = await seed();
    const own = await session(id);
    const other = await session(id, c.tokens.generate());
    const beforeAccount = await account(id);
    const methods = await loginMethods(c, own.request);
    const beforeSessions = await base.db.all(
      sql`select * from sessions order by token_hash`,
    );
    const beforeOwn = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findSession(c.tokens.hash(own.issued.token)),
    );
    expect(beforeSessions).toHaveLength(2);

    for (const { code, ...invalid } of invalidPasswordInputs) {
      await expect(
        changePassword(c, own.request, {
          version: methods.version,
          currentPassword: password,
          ...invalid,
        }),
      ).rejects.toMatchObject({ code });
      expect(await account(id)).toEqual(beforeAccount);
      expect(await loginMethods(c, own.request)).toEqual(methods);
      expect(
        await base.db.all(sql`select * from sessions order by token_hash`),
      ).toEqual(beforeSessions);
      expect((await currentUser(c, own.issued.token))?.id).toBe(id);
      expect((await currentUser(c, other.issued.token))?.id).toBe(id);
    }

    await changePassword(c, own.request, {
      version: methods.version,
      currentPassword: password,
      ...passwordInput,
    });
    expect((await account(id))?.passwordHash).toBe(`synthetic:${nextPassword}`);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(own.issued.token)),
      ),
    ).toEqual(beforeOwn);
    expect(await currentUser(c, other.issued.token)).toBeNull();
  });

  it("requires the old password, preserves current expiry and removes only other sessions on change", async () => {
    const id = await seed();
    const own = await session(id);
    const other = await session(id, c.tokens.generate());
    const initial = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findSession(c.tokens.hash(own.issued.token)),
    );
    const methods = await loginMethods(c, own.request);
    await expect(
      changePassword(c, own.request, {
        version: methods.version,
        currentPassword: "wrong",
        ...passwordInput,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect((await currentUser(c, other.issued.token))?.id).toBe(id);
    advance(60_000);
    await changePassword(c, own.request, {
      version: methods.version,
      currentPassword: password,
      ...passwordInput,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(own.issued.token)),
      ),
    ).toEqual(initial);
    expect(await currentUser(c, other.issued.token)).toBeNull();
    await expect(
      changePassword(c, own.request, {
        version: methods.version,
        currentPassword: nextPassword,
        ...passwordInput,
      }),
    ).rejects.toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
  });

  it("returns generic reset acknowledgement for unknown and unverified accounts, throttles mail, and does not expose existence", async () => {
    const unknown = await requestPasswordReset(c, "unknown@fixture.invalid");
    const unverified = createAccount(
      c.idGenerator.next(),
      "unverified@fixture.invalid",
      `synthetic:${password}`,
      now,
    );
    await c.unitOfWorkProvider.run((u) => u.accounts.save(unverified));
    expect(await requestPasswordReset(c, unverified.email)).toEqual(unknown);
    expect(unknown).toEqual({ sent: true });
    expect(mail).toEqual([]);
    await seed();
    expect(await requestPasswordReset(c, claims.email)).toEqual(unknown);
    expect(await requestPasswordReset(c, claims.email)).toEqual(unknown);
    expect(await requestPasswordReset(c, "unknown@fixture.invalid")).toEqual(
      unknown,
    );
    expect(mail).toHaveLength(1);
  });
  it("rejects tampered reset tokens and weak or mismatched passwords without consuming the valid challenge or sessions", async () => {
    const id = await seed();
    const own = await session(id);
    const before = await account(id);
    await requestPasswordReset(c, claims.email);
    const token = mailToken();
    await expect(
      resetPassword(c, { token: c.tokens.generate(), ...passwordInput }),
    ).rejects.toMatchObject({ code: "RESET_INVALID" });
    await expect(
      resetPassword(c, {
        token,
        password: "onlyletterslongenough",
        confirmation: "onlyletterslongenough",
      }),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
    await expect(
      resetPassword(c, {
        token,
        password: nextPassword,
        confirmation: "different-password-456",
      }),
    ).rejects.toMatchObject({ code: "PASSWORD_MISMATCH" });
    expect(await account(id)).toEqual(before);
    expect((await currentUser(c, own.issued.token))?.id).toBe(id);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.authChallenges.find(c.tokens.hash(token)),
        )
      )?.consumedAt,
    ).toBeNull();
    await resetPassword(c, { token, ...passwordInput });
    expect(await currentUser(c, own.issued.token)).toBeNull();
  });
  it("uses the same public credential error for Google-only and unknown email password signin", async () => {
    await googleOnly();
    const known = signIn(c, { email: claims.email, password });
    const unknown = signIn(c, { email: "unknown@fixture.invalid", password });
    await expect(known).rejects.toMatchObject({
      name: "UnauthorizedError",
      code: "INVALID_CREDENTIALS",
    });
    await expect(unknown).rejects.toMatchObject({
      name: "UnauthorizedError",
      code: "INVALID_CREDENTIALS",
    });
    expect(mail).toEqual([]);
  });

  it("resets the password once, invalidates every old session and preserves Google identity", async () => {
    const id = await seed();
    claims = { ...claims, authoritative: true };
    const { completion } = await google();
    if (!completion.session) throw new Error("fixture session missing");
    const other = await session(id, c.tokens.generate());
    await requestPasswordReset(c, claims.email);
    const token = mailToken();
    await resetPassword(c, { token, ...passwordInput });
    expect(await currentUser(c, completion.session.token)).toBeNull();
    expect(await currentUser(c, other.issued.token)).toBeNull();
    expect((await account(id))?.google?.subject).toBe(claims.subject);
    await expect(
      resetPassword(c, { token, ...passwordInput }),
    ).rejects.toMatchObject({ code: "RESET_INVALID" });
  });

  it("rejects reset at its one-hour boundary without changing credentials or sessions", async () => {
    const id = await seed();
    const own = await session(id);
    await requestPasswordReset(c, claims.email);
    const token = mailToken();
    advance(PASSWORD_RESET_MS);
    await expect(
      resetPassword(c, { token, ...passwordInput }),
    ).rejects.toMatchObject({ code: "RESET_INVALID" });
    expect((await account(id))?.passwordHash === `synthetic:${password}`).toBe(
      true,
    );
    expect((await currentUser(c, own.issued.token))?.id).toBe(id);
  });

  it("does not interchange google-link and reset challenges or consume either on wrong purpose", async () => {
    await seed();
    const { attempt } = await google();
    await sendGoogleLinkProof(c, anonymous(), attempt.id);
    const link = mailToken();
    await expect(
      resetPassword(c, { token: link, ...passwordInput }),
    ).rejects.toMatchObject({ code: "RESET_INVALID" });
    advance(60_000);
    await requestPasswordReset(c, claims.email);
    const reset = mailToken();
    await expect(
      proveGoogleWithMail(c, anonymous(), reset),
    ).rejects.toMatchObject({ code: "AUTH_PROOF_INVALID" });
    for (const token of [link, reset])
      expect(
        (
          await c.unitOfWorkProvider.run((u) =>
            u.authChallenges.find(c.tokens.hash(token)),
          )
        )?.consumedAt,
      ).toBeNull();
  });

  it("sends Google-only guidance without a reset challenge or password mutation", async () => {
    const owner = await googleOnly();
    const before = await account(owner.id);
    expect(await requestPasswordReset(c, claims.email)).toEqual({ sent: true });
    expect(mail).toHaveLength(1);
    expect(mail[0]?.text).toContain("Google");
    expect(mail[0]?.text).not.toContain("token=");
    expect(
      await base.db.all(sql`select token_hash from account_auth_challenges`),
    ).toHaveLength(0);
    expect(await account(owner.id)).toEqual(before);
  });

  it.each([
    "valid",
    "expired",
  ] as const)("deletes a %s bound session and accepts repeated signout without changing the account or other sessions", async (status) => {
    const id = await seed();
    const own = await session(id);
    const beforeAccount = await account(id);
    if (status === "expired") now = new Date(own.issued.expiresAt);
    expect(await currentUser(c, own.issued.token)).toEqual(
      status === "valid" ? own.issued.user : null,
    );
    const other = await session(id, c.tokens.generate());
    const beforeOther = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findSession(c.tokens.hash(other.issued.token)),
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(own.issued.token)),
      ),
    ).not.toBeNull();

    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(
        signOutAuthentication(c, own.request),
      ).resolves.toBeUndefined();
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.accounts.findSession(c.tokens.hash(own.issued.token)),
        ),
      ).toBeNull();
      expect(await currentUser(c, own.issued.token)).toBeNull();
      expect(await account(id)).toEqual(beforeAccount);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.accounts.findSession(c.tokens.hash(other.issued.token)),
        ),
      ).toEqual(beforeOther);
      expect((await currentUser(c, other.issued.token))?.id).toBe(id);
    }
  });

  it("signs out other devices without changing the current fixed session or methods", async () => {
    const id = await seed();
    const own = await session(id);
    const other = await session(id, c.tokens.generate());
    const before = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findSession(c.tokens.hash(own.issued.token)),
    );
    const methods = await loginMethods(c, own.request);
    await signOutOtherSessions(c, own.request);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(own.issued.token)),
      ),
    ).toEqual(before);
    expect(await currentUser(c, other.issued.token)).toBeNull();
    expect(await loginMethods(c, own.request)).toEqual(methods);
  });
});

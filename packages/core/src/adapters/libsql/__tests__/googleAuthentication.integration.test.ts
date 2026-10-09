import { NodeAuthenticationExecution } from "@repo/core/adapters/node/authenticationExecution";
import {
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import {
  beginGoogleAuthentication,
  completeGoogleCallback,
} from "@repo/core/application/account/google";
import type { GoogleOidc } from "@repo/core/application/account/ports";
import { currentUser } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  AUTH_ATTEMPT_MS,
  GOOGLE_ISSUER,
  type GoogleClaims,
} from "@repo/core/domain/account/authentication";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { googleAuthAttempts, googleIdentities } from "../authSchema";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("Google authentication application with isolated provider", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeAuthenticationExecution;
  let claims: GoogleClaims;
  let state = "";
  let browserToken = "";
  const now = new Date("2026-09-27T13:00:00Z");
  let exchange: ReturnType<typeof vi.fn<GoogleOidc["exchange"]>>;
  beforeEach(async () => {
    base = await createTestContainer();
    execution = new NodeAuthenticationExecution();
    claims = {
      issuer: GOOGLE_ISSUER,
      subject: "synthetic-subject",
      email: "google@fixture.invalid",
      authoritative: false,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
    };
    exchange = vi.fn(async () => claims);
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        send: async () => {},
      }),
      clock: { now: () => now },
      googleAuthentication: {
        execution,
        protector: {
          available: () => true,
          protect: () => "synthetic-protected-verifier",
          reveal: () => "synthetic-verifier",
        },
        provider: {
          authorization: async (input) => {
            state = input.state;
            return "http://localhost:3000/contract-only";
          },
          exchange,
        },
      },
    };
    browserToken = c.tokens.generate();
    await ensureAuthenticationBrowser(c, browserToken);
  });
  afterEach(async () => {
    await execution.stop();
    try {
      expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
    } finally {
      base.close();
    }
  });
  const request = () => ({ browserToken, sessionToken: null });
  async function begin() {
    return beginGoogleAuthentication(c, request(), "login", { kind: "notes" });
  }
  async function seed(verified: boolean) {
    const a = createAccount(
      c.idGenerator.next(),
      claims.email,
      "synthetic-password-hash",
      now,
    );
    await c.unitOfWorkProvider.run((u) =>
      u.accounts.save(verified ? verifyAccount(a, now) : a),
    );
    return a.id;
  }
  async function counts() {
    return {
      identities: (await base.db.select().from(googleIdentities)).length,
      sessions: (await base.db.select().from(sessions)).length,
      accounts: (await base.db.select().from(accounts)).length,
    };
  }

  it("creates a verified Google-only account and bound session without a fabricated password", async () => {
    const a = await begin();
    const result = await completeGoogleCallback(
      c,
      request(),
      state,
      "synthetic-code",
    );
    expect(Boolean(result.session)).toBe(true);
    const [row] = await base.db.select().from(accounts);
    expect(row?.passwordHash === null).toBe(true);
    expect(Boolean(row?.verifiedAt)).toBe(true);
    expect(await counts()).toEqual({ identities: 1, sessions: 1, accounts: 1 });
    const [stored] = await base.db.select().from(googleAuthAttempts);
    expect(stored?.state).toBe("completed");
    expect(stored?.verifierEnvelope === null && stored.claims === null).toBe(
      true,
    );
    expect((await currentUser(c, result.session?.token ?? null))?.id).toBe(
      row?.id,
    );
    expect(result.id).toBe(a.id);
  });
  it("rejects a tampered state without exchanging or consuming the original pending attempt", async () => {
    await begin();
    const before = await base.db.select().from(googleAuthAttempts);
    await expect(
      completeGoogleCallback(
        c,
        request(),
        `${state}-tampered`,
        "synthetic-code",
      ),
    ).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
    expect(exchange).toHaveBeenCalledTimes(0);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 0 });
    expect(await base.db.select().from(googleAuthAttempts)).toEqual(before);
    expect(
      (await completeGoogleCallback(c, request(), state, "synthetic-code"))
        .session,
    ).toBeDefined();
  });
  it("rejects a normal code callback at the exact attempt deadline before provider exchange", async () => {
    await begin();
    const before = await base.db.select().from(googleAuthAttempts);
    const expired: HollowContainer = {
      ...c,
      clock: { now: () => new Date(now.getTime() + AUTH_ATTEMPT_MS) },
    };
    await expect(
      completeGoogleCallback(expired, request(), state, "synthetic-code"),
    ).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
    expect(exchange).toHaveBeenCalledTimes(0);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 0 });
    expect(await base.db.select().from(googleAuthAttempts)).toEqual(before);
  });
  it("does not link or issue a session to an existing third-party account before proof", async () => {
    await seed(true);
    await begin();
    const result = await completeGoogleCallback(
      c,
      request(),
      state,
      "synthetic-code",
    );
    expect(result.session === undefined).toBe(true);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 1 });
    const [stored] = await base.db.select().from(googleAuthAttempts);
    expect(stored?.state).toBe("proof-required");
    expect(stored?.verifierEnvelope === null).toBe(true);
  });
  it("links an authoritative verified account while preserving its password", async () => {
    const id = await seed(true);
    claims = { ...claims, authoritative: true };
    await begin();
    const result = await completeGoogleCallback(
      c,
      request(),
      state,
      "synthetic-code",
    );
    expect(result.session?.user.id).toBe(id);
    const account = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findById(id),
    );
    expect(
      account?.passwordHash === "synthetic-password-hash" &&
        account.google !== null,
    ).toBe(true);
  });
  it("requires ordinary email verification before linking an unverified account", async () => {
    await seed(false);
    claims = { ...claims, authoritative: true };
    await begin();
    await expect(
      completeGoogleCallback(c, request(), state, "synthetic-code"),
    ).rejects.toMatchObject({ code: "AUTH_UNVERIFIED" });
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 1 });
  });
  it("resolves a linked subject before a changed email without rewriting either account", async () => {
    const originalEmail = claims.email;
    await begin();
    const first = await completeGoogleCallback(
      c,
      request(),
      state,
      "first-code",
    );
    if (!first.session) throw new Error("fixture session missing");
    const originalId = first.session.user.id;
    await signOutAuthentication(c, {
      browserToken,
      sessionToken: first.session.token,
    });
    claims = { ...claims, email: "other@fixture.invalid", authoritative: true };
    const otherId = await seed(true);
    await begin();
    const second = await completeGoogleCallback(
      c,
      request(),
      state,
      "next-code",
    );
    expect(second.session?.user.id).toBe(originalId);
    const [original, other] = await c.unitOfWorkProvider.run(async (u) => [
      await u.accounts.findById(originalId),
      await u.accounts.findById(otherId),
    ]);
    expect(original?.email === originalEmail).toBe(true);
    expect(other?.google === null).toBe(true);
    expect(await counts()).toEqual({ identities: 1, sessions: 1, accounts: 2 });
  });
  it("refuses a different subject for an already linked email without replacing the identity", async () => {
    const originalSubject = claims.subject;
    await begin();
    const first = await completeGoogleCallback(
      c,
      request(),
      state,
      "first-code",
    );
    if (!first.session) throw new Error("fixture session missing");
    const accountId = first.session.user.id;
    await signOutAuthentication(c, {
      browserToken,
      sessionToken: first.session.token,
    });
    claims = { ...claims, subject: "another-subject", authoritative: true };
    await begin();
    await expect(
      completeGoogleCallback(c, request(), state, "next-code"),
    ).rejects.toMatchObject({ code: "AUTH_CONFLICT" });
    const account = await c.unitOfWorkProvider.run((u) =>
      u.accounts.findById(accountId),
    );
    expect(account?.google?.subject === originalSubject).toBe(true);
    expect(await counts()).toEqual({ identities: 1, sessions: 0, accounts: 1 });
  });
  it("rechecks a password signup committed during exchange and requires third-party proof", async () => {
    exchange.mockImplementationOnce(async () => {
      await seed(true);
      return claims;
    });
    await begin();
    const result = await completeGoogleCallback(
      c,
      request(),
      state,
      "new-code",
    );
    expect(result.session === undefined).toBe(true);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 1 });
    const [stored] = await base.db.select().from(googleAuthAttempts);
    expect(stored?.state).toBe("proof-required");
  });
  it("records unknown exchange once, clears PKCE and never retries the same code", async () => {
    exchange.mockRejectedValue(new Error("synthetic timeout"));
    await begin();
    await completeGoogleCallback(c, request(), state, "synthetic-code");
    await completeGoogleCallback(c, request(), state, "synthetic-code");
    expect(exchange).toHaveBeenCalledTimes(1);
    const [row] = await base.db.select().from(googleAuthAttempts);
    expect(row?.state).toBe("failed");
    expect(row?.verifierEnvelope === null).toBe(true);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 0 });
  });
  it("rejects an old callback after browser ABA without issuing an account or session", async () => {
    await begin();
    await signOutAuthentication(c, request());
    await signOutAuthentication(c, request());
    await expect(
      completeGoogleCallback(c, request(), state, "synthetic-code"),
    ).rejects.toMatchObject({ code: "AUTH_CONTEXT_CHANGED" });
    expect(exchange).toHaveBeenCalledTimes(0);
    expect(await counts()).toEqual({ identities: 0, sessions: 0, accounts: 0 });
  });
});

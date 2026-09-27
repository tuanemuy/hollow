import {
  GOOGLE_ISSUER,
  type GoogleClaims,
  type GoogleIdentity,
} from "@repo/core/domain/account/authentication";
import { createAccount } from "@repo/core/domain/account/entity";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authBrowserContexts,
  googleAuthAttempts,
  googleIdentities,
} from "../authSchema";
import { accounts, sessions } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { createTestContainer, type TestContainer } from "./helpers";

describe("authentication schema and repository CAS", () => {
  let c: TestContainer;
  let uow: LibsqlHollowUnitOfWorkProvider;
  const now = new Date("2026-09-27T12:00:00.000Z");
  const expiry = new Date(now.getTime() + 600_000);
  const identity: GoogleIdentity = {
    issuer: GOOGLE_ISSUER,
    subject: "synthetic-subject",
    linkedAt: now,
  };

  beforeEach(async () => {
    c = await createTestContainer();
    uow = new LibsqlHollowUnitOfWorkProvider(c.db);
    await uow.run((u) =>
      u.accounts.save(
        createAccount(
          "account",
          "auth-schema@example.test",
          "synthetic-hash",
          now,
        ),
      ),
    );
  });
  afterEach(async () => {
    try {
      expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      c?.close();
    }
  });

  async function pending(mode: "login" | "reauth" = "login") {
    const browser = await uow.run((u) =>
      u.authBrowsers.ensure("synthetic-browser", expiry, now),
    );
    await c.db.insert(googleAuthAttempts).values({
      id: "attempt",
      stateHash: "synthetic-state-hash",
      nonceHash: "synthetic-nonce-hash",
      mode,
      ...(mode === "reauth"
        ? {
            actorAccountId: "account",
            actorSessionHash: "synthetic-session",
            actorAuthVersion: 1,
          }
        : {}),
      browserHash: browser.hash,
      browserEpoch: browser.epoch,
      returnTo: { kind: "notes" },
      createdAt: now,
      expiresAt: expiry,
      state: "pending",
      version: 1,
      verifierEnvelope: "synthetic-envelope",
    });
    return browser;
  }

  it("preserves a password seed and uses current authentication versions without stale account resurrection", async () => {
    const old = await uow.run((u) => u.accounts.findById("account"));
    expect(old).toMatchObject({
      passwordHash: "synthetic-hash",
      google: null,
      authVersion: 1,
    });
    if (!old) throw Error("fixture account");
    expect(
      await uow.run((u) => u.authentication.linkGoogle(old.id, 1, identity)),
    ).toBe(true);
    expect(
      await uow.run((u) =>
        u.authentication.setPassword(old.id, 1, "stale-hash"),
      ),
    ).toBe(false);
    expect(
      await uow.run((u) => u.authentication.setPassword(old.id, 2, null)),
    ).toBe(true);
    await expect(uow.run((u) => u.accounts.save(old))).rejects.toThrow();
    expect(await uow.run((u) => u.accounts.findById(old.id))).toMatchObject({
      passwordHash: null,
      google: identity,
      authVersion: 3,
    });
    expect(await uow.run((u) => u.authentication.unlinkGoogle(old.id, 3))).toBe(
      false,
    );
    expect(
      await uow.run((u) =>
        u.authentication.setPassword(old.id, 3, "replacement-hash"),
      ),
    ).toBe(true);
    expect(await uow.run((u) => u.authentication.unlinkGoogle(old.id, 4))).toBe(
      true,
    );
    expect(await uow.run((u) => u.accounts.findById(old.id))).toMatchObject({
      passwordHash: "replacement-hash",
      google: null,
      authVersion: 5,
    });
  });

  it("rejects removing either last method at the schema boundary", async () => {
    expect(
      await uow.run((u) => u.authentication.setPassword("account", 1, null)),
    ).toBe(false);
    await expect(
      c.db
        .update(accounts)
        .set({ passwordHash: null })
        .where(eq(accounts.id, "account")),
    ).rejects.toThrow();
    await uow.run((u) =>
      u.authentication.createGoogle({
        id: "google",
        email: "google@example.test",
        identity,
        now,
      }),
    );
    await expect(
      c.db
        .delete(googleIdentities)
        .where(eq(googleIdentities.accountId, "google")),
    ).rejects.toThrow();
    expect(
      await uow.run((u) => u.authentication.findByGoogle(identity.subject)),
    ).toMatchObject({
      id: "google",
      passwordHash: null,
      authVersion: 1,
      status: "verified",
    });
  });

  it("rejects duplicate Google identities atomically and prevents identity mutation", async () => {
    await uow.run((u) =>
      u.authentication.createGoogle({
        id: "google",
        email: "google@example.test",
        identity,
        now,
      }),
    );
    await expect(
      uow.run((u) =>
        u.authentication.createGoogle({
          id: "duplicate",
          email: "duplicate@example.test",
          identity,
          now,
        }),
      ),
    ).rejects.toThrow();
    expect(
      await c.db.select().from(accounts).where(eq(accounts.id, "duplicate")),
    ).toEqual([]);
    await expect(
      uow.run((u) => u.authentication.linkGoogle("account", 1, identity)),
    ).rejects.toThrow();
    expect(await uow.run((u) => u.accounts.findById("account"))).toMatchObject({
      authVersion: 1,
      google: null,
    });
    await expect(
      c.db
        .update(googleIdentities)
        .set({ subject: "other-subject" })
        .where(eq(googleIdentities.accountId, "google")),
    ).rejects.toThrow();
    await expect(
      c.db.insert(googleIdentities).values({
        accountId: "account",
        issuer: "https://invalid.example.test",
        subject: "other",
        linkedAt: now,
      }),
    ).rejects.toThrow();
  });

  it("keeps epoch stable on ensure and denies old bound sessions after CAS advance without deleting legacy sessions", async () => {
    const browser = await uow.run((u) =>
      u.authBrowsers.ensure("browser", expiry, now),
    );
    const later = new Date(expiry.getTime() + 60_000);
    expect(
      await uow.run((u) => u.authBrowsers.ensure(browser.hash, later, now)),
    ).toEqual(browser);
    await uow.run(async (u) => {
      await u.accounts.saveSession({
        tokenHash: "bound",
        accountId: "account",
        expiresAt: expiry,
        browser,
      });
      await u.accounts.saveSession({
        tokenHash: "legacy",
        accountId: "account",
        expiresAt: expiry,
      });
    });
    const before = await c.db
      .select()
      .from(sessions)
      .orderBy(sessions.tokenHash);
    expect(await uow.run((u) => u.accounts.findSession("bound"))).toMatchObject(
      { browser },
    );
    const next = await uow.run((u) =>
      u.authBrowsers.advance(browser, later, now),
    );
    expect(next).toEqual({ hash: browser.hash, epoch: 2 });
    expect(
      await uow.run((u) => u.authBrowsers.advance(browser, later, now)),
    ).toBeNull();
    expect(
      await uow.run((u) => u.authBrowsers.ensure(browser.hash, expiry, now)),
    ).toEqual(next);
    expect(await uow.run((u) => u.accounts.findSession("bound"))).toBeNull();
    expect(await uow.run((u) => u.accounts.findSession("legacy"))).toEqual({
      tokenHash: "legacy",
      accountId: "account",
      expiresAt: expiry,
    });
    expect(
      await c.db.select().from(sessions).orderBy(sessions.tokenHash),
    ).toEqual(before);
    await expect(
      uow.run((u) =>
        u.accounts.saveSession({
          tokenHash: "late-cookie",
          accountId: "account",
          expiresAt: expiry,
          browser,
        }),
      ),
    ).rejects.toThrow();
    expect(
      await c.db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, "late-cookie")),
    ).toEqual([]);
  });

  it("binds a legacy session once to the current browser and rejects stale or replacement bindings", async () => {
    const browser = await uow.run((u) =>
      u.authBrowsers.ensure("browser", expiry, now),
    );
    await uow.run((u) =>
      u.accounts.saveSession({
        tokenHash: "legacy",
        accountId: "account",
        expiresAt: expiry,
      }),
    );
    const next = await uow.run((u) =>
      u.authBrowsers.advance(browser, expiry, now),
    );
    if (!next) throw Error("fixture epoch");
    expect(
      await uow.run((u) => u.authBrowsers.bindLegacy("legacy", browser)),
    ).toBe(false);
    expect(
      await uow.run((u) => u.authBrowsers.bindLegacy("legacy", next)),
    ).toBe(true);
    const other = await uow.run((u) =>
      u.authBrowsers.ensure("other", expiry, now),
    );
    expect(
      await uow.run((u) => u.authBrowsers.bindLegacy("legacy", other)),
    ).toBe(false);
    await expect(
      c.db
        .update(sessions)
        .set({ browserHash: other.hash, browserEpoch: other.epoch })
        .where(eq(sessions.tokenHash, "legacy")),
    ).rejects.toThrow();
    await expect(
      c.db
        .update(sessions)
        .set({ browserHash: null, browserEpoch: null })
        .where(eq(sessions.tokenHash, "legacy")),
    ).rejects.toThrow();
    expect(
      await uow.run((u) => u.accounts.findSession("legacy")),
    ).toMatchObject({ browser: next, expiresAt: expiry });
  });

  it("pins referenced browser epochs and rejects rollback", async () => {
    const browser = await pending();
    expect(
      await uow.run((u) =>
        u.authBrowsers.prune(new Date(expiry.getTime() + 1), 100),
      ),
    ).toBe(0);
    await expect(
      c.db
        .delete(authBrowserContexts)
        .where(eq(authBrowserContexts.hash, browser.hash)),
    ).rejects.toThrow();
    await expect(
      c.db
        .update(authBrowserContexts)
        .set({ epoch: 1 })
        .where(eq(authBrowserContexts.hash, browser.hash)),
    ).rejects.toThrow();
    expect(await uow.run((u) => u.authBrowsers.find(browser.hash))).toEqual(
      browser,
    );
  });

  it.each([
    null,
    new Date(expiry.getTime() + 1),
  ])("requires a finite proof expiry within the parent attempt (%s)", async (proofExpiresAt) => {
    await pending("reauth");
    const ready = {
      state: "reauth-ready" as const,
      version: 2,
      verifierEnvelope: null,
      claims: {
        issuer: GOOGLE_ISSUER,
        subject: identity.subject,
        email: "auth-schema@example.test",
        authoritative: true,
        issuedAt: now,
        expiresAt: expiry,
      } satisfies GoogleClaims,
      proofHash: "synthetic-proof",
      proofExpiresAt,
    };
    const before = await c.db.select().from(googleAuthAttempts);
    await expect(
      c.db
        .update(googleAuthAttempts)
        .set(ready)
        .where(eq(googleAuthAttempts.id, "attempt")),
    ).rejects.toThrow();
    expect(await c.db.select().from(googleAuthAttempts)).toEqual(before);
    await c.db
      .update(googleAuthAttempts)
      .set({ ...ready, proofExpiresAt: new Date(now.getTime() + 300_000) })
      .where(eq(googleAuthAttempts.id, "attempt"));
    expect(
      await c.db
        .select({ state: googleAuthAttempts.state })
        .from(googleAuthAttempts),
    ).toEqual([{ state: "reauth-ready" }]);
  });

  it.each([
    ["missing verifier", { verifierEnvelope: null }],
    ["actor required for link", { mode: "link" as const }],
    ["zero browser epoch", { browserEpoch: 0 }],
    ["expiry at creation", { expiresAt: now }],
    [
      "expiry beyond ten minutes",
      { expiresAt: new Date(expiry.getTime() + 1) },
    ],
    ["pending proof", { proofHash: "synthetic-proof" }],
  ])("rejects malformed pending state: %s", async (_label, change) => {
    await pending();
    const before = await c.db.select().from(googleAuthAttempts);
    await expect(
      c.db
        .update(googleAuthAttempts)
        .set(change)
        .where(eq(googleAuthAttempts.id, "attempt")),
    ).rejects.toThrow();
    expect(await c.db.select().from(googleAuthAttempts)).toEqual(before);
  });
});

import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import { pruneAuthentication } from "@repo/core/application/account/prune";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { createAccount } from "@repo/core/domain/account/entity";
import { DRIVE_LIMITS } from "@repo/core/domain/integration/drive";
import type { OpenRouterAttempt } from "@repo/core/domain/integration/openRouter";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { authBrowserContexts, googleAuthAttempts } from "../authSchema";
import { sessions } from "../hollowSchema";
import { seedCredentialRetention } from "./credentialRetentionFixtures";
import { driveFixture, driveNow } from "./driveFixtures";

let base: Awaited<ReturnType<typeof driveFixture>>;
let owned: typeof base | undefined;
let c: HollowContainer;
let now: Date;
const day = 86_400_000;
beforeEach(async () => {
  base = await driveFixture();
  owned = base;
  await base.db
    .delete(authBrowserContexts)
    .where(eq(authBrowserContexts.hash, base.context.browserHash));
  now = new Date(driveNow);
  c = {
    ...createHollowContainer(base.db, "http://localhost:3000", {
      send: async () => {},
    }),
    clock: { now: () => now },
  };
  await c.unitOfWorkProvider.run((u) =>
    u.accounts.save(
      createAccount("account", "expiry@fixture.invalid", "synthetic", now),
    ),
  );
});
afterEach(async (context) => {
  const current = owned;
  owned = undefined;
  await current?.close(context.task.result?.state !== "fail");
});

it("does not reset a live cookie epoch, extends only retained reference lifetime and prunes after it ends", async () => {
  const token = c.tokens.generate();
  const first = await ensureAuthenticationBrowser(c, token);
  await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.advance(first, new Date(now.getTime() + 10_000), now),
  );
  now = new Date(now.getTime() + 10 * day);
  const repeated = await ensureAuthenticationBrowser(c, token);
  expect(repeated.epoch).toBe(2);
  now = new Date(now.getTime() + 20 * day);
  await pruneAuthentication(c);
  expect(
    (await c.unitOfWorkProvider.run((u) => u.authBrowsers.find(first.hash)))
      ?.epoch,
  ).toBe(2);
  now = new Date(now.getTime() + 10 * day + 1);
  await pruneAuthentication(c);
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.find(first.hash)),
  ).toBeNull();
});

it("bounds combined expired bound-session and context deletion while leaving legacy and active sessions unchanged", async () => {
  const expired = new Date(now.getTime() - 1);
  const browser = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure("expired-browser", expired, now),
  );
  const active = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure("active-browser", new Date(now.getTime() + day), now),
  );
  await c.unitOfWorkProvider.run(async (u) => {
    for (let index = 0; index < 4; index++)
      await u.accounts.saveSession({
        tokenHash: `expired-${index}`,
        accountId: "account",
        expiresAt: now,
        browser,
      });
    await u.accounts.saveSession({
      tokenHash: "legacy",
      accountId: "account",
      expiresAt: expired,
    });
    await u.accounts.saveSession({
      tokenHash: "active",
      accountId: "account",
      expiresAt: new Date(now.getTime() + day),
      browser: active,
    });
  });
  const old = await base.db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, "legacy"));
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.prune(now, 2)),
  ).toBe(2);
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.find(browser.hash)),
  ).not.toBeNull();
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.prune(now, 2)),
  ).toBe(2);
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.prune(now, 2)),
  ).toBe(1);
  const retainedLegacy = await base.db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, "legacy"));
  expect(JSON.stringify(retainedLegacy) === JSON.stringify(old)).toBe(true);
  expect(
    await c.unitOfWorkProvider.run((u) => u.accounts.findSession("active")),
  ).not.toBeNull();
  expect((await base.db.select().from(authBrowserContexts)).length).toBe(1);
});

it("retains exchanging until fixed expiry, then removes protected material without exchanging again", async () => {
  const browser = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure("browser", new Date(now.getTime() + day), now),
  );
  const attempt = {
    id: "attempt",
    mode: "login" as const,
    actor: null,
    browser,
    stateHash: "synthetic-state",
    nonceHash: "synthetic-nonce",
    returnTo: { kind: "notes" as const },
    createdAt: now,
    expiresAt: new Date(now.getTime() + 600_000),
    version: 1,
    state: "pending" as const,
    verifierEnvelope: "synthetic-envelope",
  };
  await c.unitOfWorkProvider.run(async (u) => {
    await u.googleAttempts.insert(attempt);
    await u.googleAttempts.replace(
      { ...attempt, state: "exchanging", version: 2 },
      1,
    );
  });
  await seedCredentialRetention(base.db, {
    provider: "google",
    operation: "callback",
    source: { kind: "google-attempt", id: attempt.id, version: 2 },
    authority: {
      kind: "unresolved-google",
      accountId: null,
      authVersion: null,
      browserHash: browser.hash,
      browserEpoch: browser.epoch,
    },
  });
  now = new Date(attempt.expiresAt.getTime() - 1);
  await pruneAuthentication(c);
  expect(
    (await c.unitOfWorkProvider.run((u) => u.googleAttempts.find(attempt.id)))
      ?.state,
  ).toBe("exchanging");
  now = new Date(attempt.expiresAt.getTime() + 1);
  await pruneAuthentication(c);
  expect((await base.db.select().from(googleAuthAttempts)).length).toBe(0);
});

it.each([
  "unknown",
  "unacknowledged",
] as const)("keeps expired Google material and its browser pin while credential use is %s", async (state) => {
  const browser = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure("held-browser", now, now),
  );
  const attempt = {
    id: "held-attempt",
    mode: "login" as const,
    actor: null,
    browser,
    stateHash: "held-state",
    nonceHash: "held-nonce",
    returnTo: { kind: "notes" as const },
    createdAt: now,
    expiresAt: new Date(now.getTime() + 600_000),
    version: 1,
    state: "pending" as const,
    verifierEnvelope: "synthetic-envelope",
  };
  await c.unitOfWorkProvider.run(async (u) => {
    await u.googleAttempts.insert(attempt);
    await u.googleAttempts.replace(
      { ...attempt, state: "exchanging", version: 2 },
      1,
    );
  });
  await seedCredentialRetention(
    base.db,
    {
      provider: "google",
      operation: "callback",
      source: { kind: "google-attempt", id: attempt.id, version: 2 },
      authority: {
        kind: "unresolved-google",
        accountId: null,
        authVersion: null,
        browserHash: browser.hash,
        browserEpoch: browser.epoch,
      },
    },
    state,
  );
  const before = await base.db.select().from(googleAuthAttempts);
  now = new Date(attempt.expiresAt.getTime() + 1);
  await pruneAuthentication(c);
  expect(await base.db.select().from(googleAuthAttempts)).toEqual(before);
  expect(
    await c.unitOfWorkProvider.run((u) => u.authBrowsers.find(browser.hash)),
  ).not.toBeNull();
});

function pruneBrowsers(limit = 100) {
  return c.unitOfWorkProvider.run((u) => u.authBrowsers.prune(now, limit));
}

function findBrowser(hash: string) {
  return c.unitOfWorkProvider.run((u) => u.authBrowsers.find(hash));
}

async function drivePin(kind: "attempt" | "control") {
  const context = {
    ...base.context,
    browserHash: "synthetic-drive-prune-browser",
  };
  const browser = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.ensure(
      context.browserHash,
      new Date(now.getTime() - 1),
      now,
    ),
  );
  if (kind === "attempt") {
    const value = await base.attempt(context);
    await c.unitOfWorkProvider.run((u) => u.driveAttempts.insert(value));
    return {
      browser,
      expiresAt: value.expiresAt,
      read: () =>
        c.unitOfWorkProvider.run((u) => u.driveAttempts.find(value.id)),
      prune: () =>
        c.unitOfWorkProvider.run((u) => u.driveAttempts.prune(now, 100)),
    };
  }
  const value = await base.control(
    { kind: "folder-create", phase: "queued" },
    context,
  );
  await c.unitOfWorkProvider.run((u) => u.driveControls.insert(value));
  return {
    browser,
    expiresAt: value.expiresAt,
    read: () => c.unitOfWorkProvider.run((u) => u.driveControls.find(value.id)),
    prune: () =>
      c.unitOfWorkProvider.run((u) => u.driveControls.prune(now, 100)),
  };
}

it.each([
  "attempt",
  "control",
] as const)("pins the Drive %s context across terminal phase and epoch changes until the 24h scrub", async (kind) => {
  const pin = await drivePin(kind);
  expect(await pruneBrowsers()).toBe(0);
  const advanced = await c.unitOfWorkProvider.run((u) =>
    u.authBrowsers.advance(pin.browser, new Date(now.getTime() - 1), now),
  );
  expect(advanced?.epoch).toBe(2);
  now = pin.expiresAt;
  expect(await pin.prune()).toBe(1);
  const terminal = await pin.read();
  expect(terminal?.data.phase).toBe("failed");
  expect(terminal?.context !== null && terminal?.context !== undefined).toBe(
    true,
  );
  expect(await pruneBrowsers()).toBe(0);

  now = new Date(pin.expiresAt.getTime() + DRIVE_LIMITS.receiptMs - 1);
  expect(await pin.prune()).toBe(0);
  expect(await pruneBrowsers()).toBe(0);
  now = new Date(now.getTime() + 1);
  expect(await pruneBrowsers()).toBe(0);
  expect(await pin.prune()).toBe(1);
  const scrubbed = await pin.read();
  expect(scrubbed?.context === null && scrubbed.data.phase === "failed").toBe(
    true,
  );
  expect(scrubbed?.terminalAt?.getTime()).toBe(pin.expiresAt.getTime());
  expect(await pruneBrowsers()).toBe(1);
  expect(await findBrowser(pin.browser.hash)).toBeNull();
  expect((await pin.read())?.context).toBeNull();
});

it.each([
  "google",
  "openrouter",
] as const)("keeps the existing %s reference after the Drive context is scrubbed", async (kind) => {
  const pin = await drivePin("attempt");
  now = pin.expiresAt;
  expect(await pin.prune()).toBe(1);
  now = new Date(now.getTime() + DRIVE_LIMITS.receiptMs);
  const createdAt = now;
  const expiresAt = new Date(now.getTime() + 600_000);
  if (kind === "google") {
    await c.unitOfWorkProvider.run((u) =>
      u.googleAttempts.insert({
        id: "synthetic-google-pin",
        mode: "login",
        actor: null,
        browser: pin.browser,
        stateHash: "synthetic-pin-state",
        nonceHash: "synthetic-pin-nonce",
        returnTo: { kind: "notes" },
        createdAt,
        expiresAt,
        version: 1,
        state: "pending",
        verifierEnvelope: "synthetic-verifier",
      }),
    );
  } else {
    const value: OpenRouterAttempt & { state: "pending" } = {
      id: base.id(),
      correlationHash: "synthetic-pin-correlation",
      actor: {
        accountId: base.context.accountId,
        sessionHash: base.context.sessionHash,
        authVersion: 1,
      },
      browser: pin.browser,
      expectedEpoch: 0,
      expectedVersion: 1,
      confirmedAdmissionSequence: null,
      returnTo: { kind: "settings" },
      createdAt,
      expiresAt,
      version: 1,
      state: "pending",
      verifierEnvelope: "synthetic-verifier",
    };
    await c.unitOfWorkProvider.run(async (u) => {
      await u.openRouterConnections.ensure(base.context.accountId, now);
      await u.openRouterAttempts.insert(value);
    });
  }
  expect(await pin.prune()).toBe(1);
  expect((await pin.read())?.context).toBeNull();
  expect(await pruneBrowsers()).toBe(0);
  now = new Date(expiresAt.getTime() + 1);
  if (kind === "google") {
    expect(
      await c.unitOfWorkProvider.run((u) => u.googleAttempts.prune(now, 100)),
    ).toBe(1);
  } else {
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.openRouterAttempts.prune(now, 100),
      ),
    ).toBe(1);
    expect(await pruneBrowsers()).toBe(0);
    now = new Date(createdAt.getTime() + day);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.openRouterAttempts.prune(now, 100),
      ),
    ).toBe(1);
  }
  expect(await pruneBrowsers()).toBe(1);
  expect(await findBrowser(pin.browser.hash)).toBeNull();
});

it("caps expired sessions and unpinned contexts together at 100 without deleting the Drive pin", async () => {
  const pin = await drivePin("control");
  await c.unitOfWorkProvider.run(async (u) => {
    for (let index = 0; index < 99; index++) {
      await u.accounts.saveSession({
        tokenHash: `synthetic-budget-${index}`,
        accountId: base.context.accountId,
        expiresAt: now,
        browser: pin.browser,
      });
    }
    for (let index = 0; index < 2; index++) {
      await u.authBrowsers.ensure(
        `synthetic-free-${index}`,
        new Date(now.getTime() - 1),
        now,
      );
    }
  });
  expect(await pruneBrowsers(0)).toBe(0);
  expect(await pruneBrowsers(1_000)).toBe(100);
  expect((await base.db.select().from(sessions)).length).toBe(0);
  expect((await base.db.select().from(authBrowserContexts)).length).toBe(2);
  expect(await pruneBrowsers(1_000)).toBe(1);
  expect((await base.db.select().from(authBrowserContexts)).length).toBe(1);
  expect((await findBrowser(pin.browser.hash))?.epoch).toBe(1);
  expect((await pin.read())?.data.phase).toBe("queued");
});

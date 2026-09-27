import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import { pruneAuthentication } from "@repo/core/application/account/prune";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { createAccount } from "@repo/core/domain/account/entity";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { authBrowserContexts, googleAuthAttempts } from "../authSchema";
import { sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

let base: TestContainer;
let c: HollowContainer;
let now: Date;
const day = 86_400_000;
beforeEach(async () => {
  base = await createTestContainer();
  now = new Date("2026-09-27T13:00:00Z");
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
afterEach(async () => {
  try {
    expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
  } finally {
    base.close();
  }
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
  expect(
    await base.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, "legacy")),
  ).toEqual(old);
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

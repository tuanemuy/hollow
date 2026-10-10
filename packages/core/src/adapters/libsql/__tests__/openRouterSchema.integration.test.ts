import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  defaultOpenRouterModels,
  OPENROUTER_ATTEMPT_MS,
  OPENROUTER_RECEIPT_MS,
  type OpenRouterAttempt,
  type OpenRouterConnection,
} from "@repo/core/domain/integration/openRouter";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, sessions } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import {
  openRouterAttempts,
  openRouterConnections,
  openRouterModelSettings,
} from "../openRouterSchema";
import { seedCredentialRetention } from "./credentialRetentionFixtures";
import { createTestContainer, type TestContainer } from "./helpers";

describe("OpenRouter schema, repository CAS and bounded retention", () => {
  let c: TestContainer;
  let uow: LibsqlHollowUnitOfWorkProvider;
  const now = new Date("2026-09-28T00:00:00Z");
  const expiresAt = new Date(now.getTime() + OPENROUTER_ATTEMPT_MS);
  const accountId = "synthetic-openrouter-account";
  const browserHash = "synthetic-openrouter-browser";
  const sessionHash = "synthetic-openrouter-session";

  beforeEach(async () => {
    c = await createTestContainer();
    uow = new LibsqlHollowUnitOfWorkProvider(c.db);
    await uow.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            accountId,
            "router@fixture.invalid",
            "synthetic-password-hash",
            now,
          ),
          now,
        ),
      );
      const browser = await u.authBrowsers.ensure(browserHash, expiresAt, now);
      await u.accounts.saveSession({
        tokenHash: sessionHash,
        accountId,
        expiresAt,
        browser,
      });
      await u.openRouterConnections.ensure(accountId, now);
    });
  });

  afterEach(async () => {
    try {
      expect(await c.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      c.close();
    }
  });

  async function refused(work: () => PromiseLike<unknown>) {
    try {
      await work();
      return false;
    } catch {
      return true;
    }
  }
  function candidate(): OpenRouterAttempt & { state: "pending" } {
    const id = c.idGenerator.next();
    return {
      id,
      correlationHash: `synthetic-correlation-${id}`,
      actor: { accountId, sessionHash, authVersion: 1 },
      browser: { hash: browserHash, epoch: 1 },
      expectedEpoch: 0,
      expectedVersion: 1,
      confirmedAdmissionSequence: null,
      returnTo: { kind: "settings" },
      createdAt: now,
      expiresAt,
      version: 1,
      state: "pending",
      verifierEnvelope: "synthetic-protected-verifier",
    };
  }
  async function pending() {
    const value = candidate();
    await uow.run((u) => u.openRouterAttempts.insert(value));
    return value;
  }
  async function checking() {
    const value = await pending();
    const exchanging: OpenRouterAttempt = {
      ...value,
      state: "exchanging",
      version: 2,
    };
    expect(
      await uow.run((u) => u.openRouterAttempts.replace(exchanging, 1)),
    ).toBe(true);
    const checked: OpenRouterAttempt & { state: "checking" } = {
      ...exchanging,
      state: "checking",
      candidateEnvelope: "synthetic-protected-candidate",
      version: 3,
    };
    expect(await uow.run((u) => u.openRouterAttempts.replace(checked, 2))).toBe(
      true,
    );
    return checked;
  }
  async function linked() {
    const initial = await uow.run((u) =>
      u.openRouterConnections.ensure(accountId, now),
    );
    const value: OpenRouterConnection & { state: "linked" } = {
      ...initial,
      state: "linked",
      epoch: 1,
      version: 2,
      credentialEnvelope: "synthetic-protected-credential",
      keyExpiresAt: null,
      providerUserId: null,
      linkedAt: now,
      everLinkedAt: now,
      lastUsedAt: null,
    };
    expect(
      await uow.run((u) => u.openRouterConnections.replace(value, 1)),
    ).toBe(true);
    return value;
  }
  async function rawAttempt(id: string) {
    const [row] = await c.db
      .select()
      .from(openRouterAttempts)
      .where(eq(openRouterAttempts.id, id));
    if (!row) throw new Error("synthetic attempt missing");
    return row;
  }

  it("ensures one initial connection, advances CAS epochs and preserves old authentication fields", async () => {
    const oldAccount = await c.db.select().from(accounts);
    const oldSessions = await c.db.select().from(sessions);
    const initial = await uow.run((u) =>
      u.openRouterConnections.ensure(accountId, now),
    );
    expect(
      initial.state === "unlinked" &&
        initial.epoch === 0 &&
        initial.version === 1 &&
        initial.credentialEnvelope === null,
    ).toBe(true);
    expect((await c.db.select().from(openRouterConnections)).length).toBe(1);
    const value = await linked();
    expect(
      await uow.run((u) => u.openRouterConnections.replace(value, 1)),
    ).toBe(false);
    expect(
      (
        await uow.run((u) =>
          u.openRouterConnections.ensure(accountId, expiresAt),
        )
      ).state,
    ).toBe("linked");
    const relink: OpenRouterConnection = {
      ...value,
      state: "needs_relink",
      version: 3,
    };
    expect(
      await uow.run((u) => u.openRouterConnections.replace(relink, 2)),
    ).toBe(true);
    const unlinked: OpenRouterConnection = {
      ...value,
      state: "unlinked",
      epoch: 2,
      version: 4,
      credentialEnvelope: null,
      keyExpiresAt: null,
      providerUserId: null,
      linkedAt: null,
      lastUsedAt: null,
    };
    expect(
      await uow.run((u) => u.openRouterConnections.replace(unlinked, 3)),
    ).toBe(true);
    const after = await uow.run((u) => u.openRouterConnections.find(accountId));
    expect(
      after?.epoch === 2 && after.everLinkedAt?.getTime() === now.getTime(),
    ).toBe(true);
    expect(
      JSON.stringify(await c.db.select().from(accounts)) ===
        JSON.stringify(oldAccount),
    ).toBe(true);
    expect(
      JSON.stringify(await c.db.select().from(sessions)) ===
        JSON.stringify(oldSessions),
    ).toBe(true);
  });

  it("rejects credential replacement without an epoch change, epoch rollback and first-link rewriting", async () => {
    const value = await linked();
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterConnections.replace(
            {
              ...value,
              version: 3,
              credentialEnvelope: "different-synthetic-envelope",
            },
            2,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterConnections.replace(
            { ...value, version: 3, epoch: 0 },
            2,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterConnections.replace(
            { ...value, version: 3, epoch: 2, everLinkedAt: expiresAt },
            2,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      (await uow.run((u) => u.openRouterConnections.find(accountId)))?.version,
    ).toBe(2);
  });

  it("rejects inconsistent connection shape and illegal version arithmetic at the DB boundary", async () => {
    await linked();
    for (const patch of [
      { version: 3, credentialEnvelope: null },
      { version: 3, credentialEnvelope: "" },
      { version: 3, linkedAt: null },
      { version: 3, everLinkedAt: null },
      { version: 4 },
    ])
      expect(
        await refused(() =>
          c.db
            .update(openRouterConnections)
            .set(patch)
            .where(eq(openRouterConnections.accountId, accountId)),
        ),
      ).toBe(true);
    expect(
      (await uow.run((u) => u.openRouterConnections.find(accountId)))?.version,
    ).toBe(2);
  });

  it("transitions pending through checking, scrubs prior secrets and rejects stale CAS", async () => {
    const value = await pending();
    expect(
      (
        await uow.run((u) =>
          u.openRouterAttempts.findByCorrelation(value.correlationHash),
        )
      )?.id === value.id,
    ).toBe(true);
    const exchanging: OpenRouterAttempt = {
      ...value,
      state: "exchanging",
      version: 2,
    };
    expect(
      await uow.run((u) => u.openRouterAttempts.replace(exchanging, 1)),
    ).toBe(true);
    expect(
      await uow.run((u) => u.openRouterAttempts.replace(exchanging, 1)),
    ).toBe(false);
    let row = await rawAttempt(value.id);
    expect(
      row.verifierEnvelope === null && row.candidateEnvelope === null,
    ).toBe(true);
    const next: OpenRouterAttempt = {
      ...exchanging,
      state: "checking",
      version: 3,
      candidateEnvelope: "synthetic-candidate",
    };
    expect(await uow.run((u) => u.openRouterAttempts.replace(next, 2))).toBe(
      true,
    );
    row = await rawAttempt(value.id);
    expect(
      row.verifierEnvelope === null && row.candidateEnvelope !== null,
    ).toBe(true);
    const done: OpenRouterAttempt = {
      ...next,
      state: "completed",
      version: 4,
      resultEpoch: 1,
      firstLink: true,
    };
    expect(await uow.run((u) => u.openRouterAttempts.replace(done, 3))).toBe(
      true,
    );
    row = await rawAttempt(value.id);
    expect(
      row.verifierEnvelope === null &&
        row.candidateEnvelope === null &&
        row.resultEpoch === 1 &&
        row.firstLink === true,
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.replace({ ...value, version: 5 }, 4),
        ),
      ),
    ).toBe(true);
  });

  it("permits metadata retry only with the same durable candidate and an advancing version", async () => {
    const value = await checking();
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.replace({ ...value, version: 4 }, 3),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.replace(
            {
              ...value,
              version: 5,
              candidateEnvelope: "replacement-synthetic-candidate",
            },
            4,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      (await uow.run((u) => u.openRouterAttempts.find(value.id)))?.version,
    ).toBe(4);
  });

  it("pins immutable actor, browser, expected connection, continuation and lifetime values", async () => {
    const value = await pending();
    const changes: readonly [string, string | number][] = [
      ["correlation_hash", "other-synthetic-correlation"],
      ["session_hash", "other-synthetic-session"],
      ["auth_version", 2],
      ["browser_epoch", 2],
      ["expected_epoch", 1],
      ["expected_version", 2],
      ["return_to", JSON.stringify({ kind: "upload", workspaceId: null })],
      ["created_at", now.getTime() + 1],
      ["expires_at", expiresAt.getTime() + 1],
    ];
    for (const [column, replacement] of changes) {
      expect(
        await refused(() =>
          c.db.run(
            sql`update openrouter_attempts set state='exchanging', verifier_envelope=null, version=2, ${sql.identifier(column)}=${replacement} where id=${value.id}`,
          ),
        ),
      ).toBe(true);
    }
    expect(
      (await uow.run((u) => u.openRouterAttempts.find(value.id)))?.state,
    ).toBe("pending");
  });

  it("rejects nonpending insertion, duplicate correlation and an altered ten-minute lifetime", async () => {
    const original = await pending();
    const row = await rawAttempt(original.id);
    expect(
      await refused(() =>
        c.db.insert(openRouterAttempts).values({
          ...row,
          id: c.idGenerator.next(),
          correlationHash: "synthetic-exchanging",
          state: "exchanging",
          verifierEnvelope: null,
        }),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.insert({
            ...original,
            id: c.idGenerator.next(),
          }),
        ),
      ),
    ).toBe(true);
    const fresh = candidate();
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.insert({
            ...fresh,
            expiresAt: new Date(expiresAt.getTime() + 1),
          }),
        ),
      ),
    ).toBe(true);
    expect((await c.db.select().from(openRouterAttempts)).length).toBe(1);
  });

  it("rejects absent or empty pending verifier and checking candidate instead of persisting unreadable state", async () => {
    const value = candidate();
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.insert({ ...value, verifierEnvelope: "" }),
        ),
      ),
    ).toBe(true);
    const good = await pending();
    expect(
      await refused(() =>
        c.db
          .update(openRouterAttempts)
          .set({ verifierEnvelope: null, version: 2 })
          .where(eq(openRouterAttempts.id, good.id)),
      ),
    ).toBe(true);
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.replace(
          { ...good, state: "exchanging", version: 2 },
          1,
        ),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.replace(
            { ...good, state: "checking", version: 3, candidateEnvelope: "" },
            2,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        c.db
          .update(openRouterAttempts)
          .set({ state: "checking", version: 3 })
          .where(eq(openRouterAttempts.id, good.id)),
      ),
    ).toBe(true);
  });

  it("rejects completed NULL proof fields and failed states with residual secret fields", async () => {
    const value = await checking();
    for (const patch of [
      {
        state: "completed" as const,
        version: 4,
        candidateEnvelope: null,
        resultEpoch: null,
        firstLink: true,
      },
      {
        state: "completed" as const,
        version: 4,
        candidateEnvelope: null,
        resultEpoch: 1,
        firstLink: null,
      },
      {
        state: "failed" as const,
        version: 4,
        failure: "OPENROUTER_CANCELLED" as const,
      },
      {
        state: "failed" as const,
        version: 4,
        candidateEnvelope: null,
        failure: null,
      },
    ])
      expect(
        await refused(() =>
          c.db
            .update(openRouterAttempts)
            .set(patch)
            .where(eq(openRouterAttempts.id, value.id)),
        ),
      ).toBe(true);
    expect(
      (await uow.run((u) => u.openRouterAttempts.find(value.id)))?.state,
    ).toBe("checking");
  });

  it("fences only other active account attempts and never revives a terminal attempt", async () => {
    const keep = await pending();
    const other = await checking();
    await uow.run((u) => u.openRouterAttempts.fenceAccount(accountId, keep.id));
    expect(
      (await uow.run((u) => u.openRouterAttempts.find(keep.id)))?.state,
    ).toBe("pending");
    const row = await rawAttempt(other.id);
    expect(
      row.state === "failed" &&
        row.failure === "OPENROUTER_CONNECTION_CHANGED" &&
        row.candidateEnvelope === null &&
        row.verifierEnvelope === null,
    ).toBe(true);
    await uow.run((u) => u.openRouterAttempts.fenceAccount(accountId, keep.id));
    expect((await rawAttempt(other.id)).version).toBe(row.version);
    expect(
      await refused(() =>
        uow.run((u) =>
          u.openRouterAttempts.replace(
            { ...other, version: row.version + 1 },
            row.version,
          ),
        ),
      ),
    ).toBe(true);
  });

  it("inserts defaults once and uses OCC without overwriting a saved choice", async () => {
    const defaults = defaultOpenRouterModels(accountId, now);
    await uow.run((u) => u.openRouterModels.insertDefaults(defaults));
    const changed = {
      ...defaults,
      version: 2,
      text: { kind: "chat-text" as const, modelId: "fixture/custom" },
      updatedAt: expiresAt,
    };
    expect(await uow.run((u) => u.openRouterModels.replace(changed, 1))).toBe(
      true,
    );
    expect(await uow.run((u) => u.openRouterModels.replace(changed, 1))).toBe(
      false,
    );
    await uow.run((u) => u.openRouterModels.insertDefaults(defaults));
    const saved = await uow.run((u) => u.openRouterModels.find(accountId));
    expect(
      saved?.version === 2 &&
        saved.text.modelId === "fixture/custom" &&
        saved.audio.kind === "stt-transcription",
    ).toBe(true);
    expect(
      await refused(() =>
        c.db
          .update(openRouterModelSettings)
          .set({ version: 3, defaultsVersion: 2 })
          .where(eq(openRouterModelSettings.accountId, accountId)),
      ),
    ).toBe(true);
    expect(
      await refused(() =>
        c.db
          .update(openRouterModelSettings)
          .set({ version: 3, textModel: "" })
          .where(eq(openRouterModelSettings.accountId, accountId)),
      ),
    ).toBe(true);
  });

  it("scrubs expired attempts and deletes receipts with a shared maximum of 100 rows per call", async () => {
    await uow.run(async (u) => {
      for (let i = 0; i < 101; i++)
        await u.openRouterAttempts.insert(candidate());
    });
    expect(
      await uow.run((u) => u.openRouterAttempts.countActive(browserHash, now)),
    ).toBe(101);
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.prune(new Date(expiresAt.getTime() - 1), 999),
      ),
    ).toBe(0);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(expiresAt, 999)),
    ).toBe(100);
    let rows = await c.db.select().from(openRouterAttempts);
    expect(
      rows.filter(
        (row) =>
          row.state === "failed" &&
          row.verifierEnvelope === null &&
          row.candidateEnvelope === null,
      ).length,
    ).toBe(100);
    expect(rows.filter((row) => row.state === "pending").length).toBe(1);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(expiresAt, 999)),
    ).toBe(1);
    const receiptEnd = new Date(now.getTime() + OPENROUTER_RECEIPT_MS);
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.prune(new Date(receiptEnd.getTime() - 1), 999),
      ),
    ).toBe(0);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(receiptEnd, 999)),
    ).toBe(100);
    rows = await c.db.select().from(openRouterAttempts);
    expect(rows.length).toBe(1);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(receiptEnd, 999)),
    ).toBe(1);
  });

  it.each([
    "pending",
    "exchanging",
    "checking",
    "completed",
    "failed",
  ] as const)("pins browser context while a %s attempt exists and releases it only after receipt deletion", async (state) => {
    let value: OpenRouterAttempt = await pending();
    if (state !== "pending")
      await seedCredentialRetention(c.db, {
        provider: "openrouter",
        operation: "callback",
        source: { kind: "openrouter-attempt", id: value.id, version: 1 },
        authority: {
          kind: "account",
          accountId,
          authVersion: 1,
          browserHash,
          browserEpoch: 1,
        },
      });
    if (state !== "pending") {
      value = { ...value, state: "exchanging", version: 2 };
      expect(await uow.run((u) => u.openRouterAttempts.replace(value, 1))).toBe(
        true,
      );
    }
    if (["checking", "completed", "failed"].includes(state)) {
      value = {
        ...value,
        state: "checking",
        version: 3,
        candidateEnvelope: "synthetic-candidate",
      };
      expect(await uow.run((u) => u.openRouterAttempts.replace(value, 2))).toBe(
        true,
      );
    }
    if (state === "completed" || state === "failed") {
      value =
        state === "completed"
          ? {
              ...value,
              state: "completed",
              version: 4,
              resultEpoch: 1,
              firstLink: true,
            }
          : {
              ...value,
              state: "failed",
              version: 4,
              failure: "OPENROUTER_CANCELLED",
            };
      expect(await uow.run((u) => u.openRouterAttempts.replace(value, 3))).toBe(
        true,
      );
    }
    await uow.run((u) => u.accounts.deleteSession(sessionHash));
    const afterExpiry = new Date(expiresAt.getTime() + 1);
    expect(await uow.run((u) => u.authBrowsers.prune(afterExpiry, 999))).toBe(
      0,
    );
    expect(
      (await uow.run((u) => u.authBrowsers.find(browserHash)))?.epoch,
    ).toBe(1);
    const receiptEnd = new Date(now.getTime() + OPENROUTER_RECEIPT_MS);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(receiptEnd, 100)),
    ).toBe(1);
    expect(await uow.run((u) => u.authBrowsers.prune(receiptEnd, 100))).toBe(1);
    expect(await uow.run((u) => u.authBrowsers.find(browserHash))).toBeNull();
  });

  it.each([
    "unknown",
    "unacknowledged",
  ] as const)("retains expired attempts and browser pins with %s credential use", async (state) => {
    const initial = await pending();
    await seedCredentialRetention(
      c.db,
      {
        provider: "openrouter",
        operation: "callback",
        source: { kind: "openrouter-attempt", id: initial.id, version: 1 },
        authority: {
          kind: "account",
          accountId,
          authVersion: 1,
          browserHash,
          browserEpoch: 1,
        },
      },
      state,
    );
    const exchanging = { ...initial, state: "exchanging" as const, version: 2 };
    expect(
      await uow.run((u) => u.openRouterAttempts.replace(exchanging, 1)),
    ).toBe(true);
    const before = await c.db.select().from(openRouterAttempts);
    expect(
      await uow.run((u) => u.openRouterAttempts.prune(expiresAt, 100)),
    ).toBe(0);
    const after = new Date(now.getTime() + OPENROUTER_RECEIPT_MS);
    expect(await uow.run((u) => u.openRouterAttempts.prune(after, 100))).toBe(
      0,
    );
    expect(await c.db.select().from(openRouterAttempts)).toEqual(before);
    expect(await uow.run((u) => u.authBrowsers.prune(after, 100))).toBe(1);
    expect(
      await uow.run((u) => u.authBrowsers.find(browserHash)),
    ).not.toBeNull();
  });
  it("does not infer never-started from an expired failure after exchange admission", async () => {
    const initial = await pending();
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.replace(
          { ...initial, state: "exchanging", version: 2 },
          1,
        ),
      ),
    ).toBe(true);
    const failed = {
      ...initial,
      state: "failed" as const,
      failure: "OPENROUTER_EXPIRED" as const,
      version: 3,
    };
    expect(await uow.run((u) => u.openRouterAttempts.replace(failed, 2))).toBe(
      true,
    );
    const before = await c.db.select().from(openRouterAttempts);
    expect(
      await uow.run((u) =>
        u.openRouterAttempts.prune(
          new Date(now.getTime() + OPENROUTER_RECEIPT_MS),
          100,
        ),
      ),
    ).toBe(0);
    expect(await c.db.select().from(openRouterAttempts)).toEqual(before);
  });

  it("keeps the browser prune budget at 100 including expired sessions and preserves legacy authentication", async () => {
    await uow.run(async (u) => {
      for (let i = 0; i < 100; i++)
        await u.authBrowsers.ensure(`synthetic-unused-browser-${i}`, now, now);
      await u.accounts.saveSession({
        tokenHash: "synthetic-legacy-session",
        accountId,
        expiresAt: now,
      });
    });
    const oldAccount = await c.db.select().from(accounts);
    const afterExpiry = new Date(expiresAt.getTime() + 1);
    expect(await uow.run((u) => u.authBrowsers.prune(afterExpiry, 999))).toBe(
      100,
    );
    expect((await c.db.select().from(sessions)).length).toBe(1);
    expect(
      (await c.db.all(sql`select browser_hash from auth_browser_contexts`))
        .length,
    ).toBe(2);
    expect(await uow.run((u) => u.authBrowsers.prune(afterExpiry, 999))).toBe(
      2,
    );
    expect((await c.db.select().from(sessions)).length).toBe(1);
    expect(
      JSON.stringify(await c.db.select().from(accounts)) ===
        JSON.stringify(oldAccount),
    ).toBe(true);
  });
});

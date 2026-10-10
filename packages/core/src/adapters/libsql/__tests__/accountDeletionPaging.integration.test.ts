import { setTimeout as delay } from "node:timers/promises";
import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { currentUser } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import type { AccountDeletionIntent } from "@repo/core/domain/account/deletion";
import type { AccountDeletionRepository } from "@repo/core/domain/account/ports/accountDeletionRepository";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFailed,
} from "vitest";
import {
  type AccountDeletionFixture,
  createAccountDeletionFixture,
} from "./accountDeletionFixtures";

class StepCommitResponseLost extends Error {
  constructor() {
    super("P5D_PAGE_COMMIT_RESPONSE_LOST");
  }
}
async function bounded<T>(work: Promise<T>): Promise<T> {
  const controller = new AbortController();
  try {
    return await Promise.race([
      work,
      delay(5_000, undefined, { signal: controller.signal }).then(() => {
        throw new Error("P5D_PAGE_BARRIER");
      }),
    ]);
  } finally {
    controller.abort();
  }
}
function barrier() {
  let entered = () => {};
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const resumed = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    ready: () => bounded(ready),
    release,
    async wait() {
      entered();
      await bounded(resumed);
    },
  };
}
type Page = Readonly<{
  intent: AccountDeletionIntent;
  result: Awaited<ReturnType<AccountDeletionRepository["step"]>>;
}>;

describe.sequential("P5d-F durable history cursor response loss", () => {
  let f: AccountDeletionFixture;
  let actor: Awaited<ReturnType<AccountDeletionFixture["account"]>>;
  let failed = false;
  beforeAll(async () => {
    f = await createAccountDeletionFixture("application");
    try {
      actor = await f.account("page-loss@p5d.fixture.test");
      await f.container.unitOfWorkProvider.run(async (u) => {
        for (let i = 0; i < 51; i++)
          await u.accounts.saveVerification({
            tokenHash: f.container.tokens.hash(f.container.tokens.generate()),
            browserHash: f.container.tokens.hash(f.container.tokens.generate()),
            accountId: actor.account.id,
            expiresAt: new Date(f.container.clock.now().getTime() + 60_000),
            consumedAt: null,
          });
      });
    } catch (error) {
      failed = true;
      f.fail();
      throw error;
    }
  }, 40_000);
  beforeEach(async () => {
    onTestFailed(() => {
      failed = true;
      f.fail();
    });
    await f.guard();
  });
  afterEach(async () => {
    if (!failed) await f.guard();
  });
  afterAll(async () => {
    await f?.close();
    if (f)
      process.stdout.write(
        'P5D_PAGE {"event":"fixture-closed","executionStopped":true,"clientClosed":true}\n',
      );
  }, 40_000);

  it("F02 resumes the exact saved 51-row cursor after one committed page response loss", async () => {
    const original = f.container.unitOfWorkProvider;
    const remaining = async () => {
      const row = (
        await f.client.execute("select count(*) n from email_verifications")
      ).rows[0];
      if (!row || typeof row.n !== "number") throw new Error("P5D_PAGE_COUNT");
      return row.n;
    };
    const emptyFamilies = async () => {
      const rows = (
        await f.client.execute(
          "select (select count(*) from notes) notes,(select count(*) from workspaces) workspaces,(select count(*) from account_deletion_credential_uses) uses,(select count(*) from account_deletion_credential_origins) origins,(select count(*) from openrouter_attempts) orAttempts,(select count(*) from openrouter_connections) orConnections,(select count(*) from google_auth_attempts) googleAttempts,(select count(*) from google_identities) googleIdentities,(select count(*) from drive_connections) driveConnections,(select count(*) from regeneration_source_bindings) sources,(select count(*) from object_writes) writes,(select count(*) from account_deletion_debts) debts,(select count(*) from account_deletion_purges) purges",
        )
      ).rows;
      expect(rows).toHaveLength(1);
      const row = rows[0];
      if (!row) throw new Error("P5D_PAGE_FAMILIES");
      for (const value of Object.values(row)) expect(value).toBe(0);
    };
    expect(await remaining()).toBe(51);
    await emptyFamilies();
    expect(
      await deleteAccount(f.container, actor.token, {
        email: actor.account.email,
      }),
    ).toEqual({ status: "accepted" });
    const identity = await original.run((u) =>
      u.accounts.identity(actor.account.id),
    );
    if (identity.kind !== "deleted") throw new Error("P5D_PAGE_ANCHOR");
    const intentId = identity.deletionId;
    const savedIntent = async () => {
      const intent = await original.run((u) =>
        u.accountDeletions.find(intentId),
      );
      if (!intent) throw new Error("P5D_PAGE_INTENT");
      return intent;
    };
    const snapshot = async () => ({
      intent: await savedIntent(),
      intentRows: (
        await f.client.execute({
          sql: "select * from account_deletions where id=?",
          args: [intentId],
        })
      ).rows,
      accountRows: (
        await f.client.execute({
          sql: "select * from accounts where id=?",
          args: [actor.account.id],
        })
      ).rows,
      identity: await original.run((u) =>
        u.accounts.identity(actor.account.id),
      ),
      remaining: await remaining(),
    });
    expect(await currentUser(f.container, actor.token)).toBeNull();
    expect(await savedIntent()).toMatchObject({
      state: "queued",
      version: 1,
      cursor: { table: "personal-notes", afterId: null },
      leaseToken: null,
      leaseUntil: null,
    });
    const held = barrier();
    const committedPages: Page[] = [];
    const releasedClaims: Parameters<AccountDeletionRepository["release"]>[] =
      [];
    const evidence: {
      snapshot: Awaited<ReturnType<typeof snapshot>> | null;
      page: Page | null;
    } = { snapshot: null, page: null };
    let faultArmed = true;
    let responseLosses = 0;
    const provider: HollowUnitOfWorkProvider = {
      async run<T>(fn: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
        const touched: {
          page: Page | null;
          release: Parameters<AccountDeletionRepository["release"]> | null;
        } = { page: null, release: null };
        const result = await original.run(async (u) => {
          const method = u.accountDeletions.step;
          const release = u.accountDeletions.release;
          u.accountDeletions.release = async (...args) => {
            await release.call(u.accountDeletions, ...args);
            if (touched.release) throw new Error("P5D_PAGE_RELEASE_REPEAT");
            touched.release = args;
          };
          u.accountDeletions.step = async (...args) => {
            const value = await method.call(u.accountDeletions, ...args);
            if (touched.page) throw new Error("P5D_PAGE_STEP_REPEAT");
            touched.page = { intent: args[0], result: value };
            return value;
          };
          try {
            return await fn(u);
          } finally {
            u.accountDeletions.step = method;
            u.accountDeletions.release = release;
          }
        });
        if (touched.release) {
          if (releasedClaims.length >= 1)
            throw new Error("P5D_PAGE_RELEASE_BOUND");
          releasedClaims.push(touched.release);
        }
        const page = touched.page;
        if (page) {
          if (committedPages.length >= 64)
            throw new Error("P5D_PAGE_WAKE_BOUND");
          committedPages.push(page);
          if (
            faultArmed &&
            page.intent.cursor.table === "email-verifications" &&
            page.result.progressed === 25 &&
            page.result.blocked === 0 &&
            !page.result.finished
          ) {
            faultArmed = false;
            evidence.page = page;
            evidence.snapshot = await snapshot();
            await held.wait();
            responseLosses++;
            throw new StepCommitResponseLost();
          }
        }
        return result;
      },
    };
    const faultContainer: HollowContainer = {
      ...f.container,
      unitOfWorkProvider: provider,
    };
    const wake = () => sweepAccountDeletions(faultContainer);
    let wakeCount = 0;
    while ((await savedIntent()).cursor.table !== "email-verifications") {
      if (++wakeCount > 64) throw new Error("P5D_PAGE_WAKE_BOUND");
      await wake();
      expect(await remaining()).toBe(51);
      expect((await savedIntent()).state).not.toBe("succeeded");
    }
    wakeCount++;
    const lostWake = wake();
    const settledWake = bounded(lostWake);
    try {
      await held.ready();
      const page = evidence.page;
      const saved = evidence.snapshot;
      if (!page || !saved || page.intent.state !== "running")
        throw new Error("P5D_PAGE_COMMIT_OBSERVATION");
      expect(page.intent.id).toBe(intentId);
      expect(page.intent.accountId).toBe(actor.account.id);
      expect(page.intent.leaseToken).not.toBeNull();
      expect(saved.remaining).toBe(26);
      expect(saved.intent).toMatchObject({
        id: intentId,
        state: "queued",
        version: page.intent.version + 1,
        cursor: { table: "email-verifications" },
        leaseToken: null,
        leaseUntil: null,
      });
      expect(saved.intent.cursor.afterId).not.toBeNull();
      expect(saved.identity).toEqual(identity);
      expect(saved.intent.fenceAuthVersion).toBe(actor.account.authVersion + 1);
      expect(saved.intentRows).toHaveLength(1);
      expect(saved.accountRows).toHaveLength(1);
      expect(saved.accountRows[0]).toMatchObject({
        state: "deleted",
        deletion_id: intentId,
        auth_version: saved.intent.fenceAuthVersion,
      });
      expect(releasedClaims).toHaveLength(0);
      expect(await snapshot()).toEqual(saved);
      expect(await currentUser(f.container, actor.token)).toBeNull();
      expect(await snapshot()).toEqual(saved);
    } finally {
      held.release();
      await settledWake;
    }
    if (!evidence.snapshot) throw new Error("P5D_PAGE_COMMIT_OBSERVATION");
    expect(responseLosses).toBe(1);
    if (!evidence.page || evidence.page.intent.state !== "running")
      throw new Error("P5D_PAGE_COMMIT_OBSERVATION");
    expect(releasedClaims).toEqual([
      [
        intentId,
        evidence.page.intent.leaseToken,
        f.container.clock.now(),
        "step-failed",
      ],
    ]);
    expect(await snapshot()).toEqual(evidence.snapshot);
    const resumed: HollowContainer = {
      ...f.container,
      unitOfWorkProvider: provider,
    };
    let previous = evidence.snapshot.intent;
    for (const count of [1, 0]) {
      if (++wakeCount > 64) throw new Error("P5D_PAGE_WAKE_BOUND");
      await sweepAccountDeletions(resumed);
      const next = await snapshot();
      expect(next.remaining).toBe(count);
      expect(next.intent.id).toBe(previous.id);
      expect(next.intent.fenceAuthVersion).toBe(previous.fenceAuthVersion);
      expect(next.intent.acceptedAt).toEqual(previous.acceptedAt);
      expect(next.intent.version).toBe(previous.version + 2);
      expect(next.intent.leaseToken).toBeNull();
      expect(next.intent.leaseUntil).toBeNull();
      if (count === 1) {
        expect(next.intent.cursor.table).toBe("email-verifications");
        expect(next.intent.cursor.afterId).not.toBeNull();
        if (!next.intent.cursor.afterId || !previous.cursor.afterId)
          throw new Error("P5D_PAGE_CURSOR");
        expect(next.intent.cursor.afterId > previous.cursor.afterId).toBe(true);
      } else
        expect(next.intent.cursor).toEqual({
          table: "google-identities",
          afterId: null,
        });
      expect(next.intent.state).toBe("queued");
      expect(next.identity).toEqual(identity);
      expect(await snapshot()).toEqual(next);
      previous = next.intent;
    }
    while ((await savedIntent()).state !== "succeeded") {
      if (++wakeCount > 64) throw new Error("P5D_PAGE_WAKE_BOUND");
      await sweepAccountDeletions(resumed);
      expect(await remaining()).toBe(0);
    }
    const terminal = await snapshot();
    expect(terminal.intent).toMatchObject({
      id: intentId,
      state: "succeeded",
      cursor: { table: "verify", afterId: null },
      leaseToken: null,
      leaseUntil: null,
    });
    expect(terminal.identity).toEqual(identity);
    const history = committedPages.filter(
      (page) => page.intent.cursor.table === "email-verifications",
    );
    expect(history.map((page) => page.result)).toEqual([
      { progressed: 25, blocked: 0, finished: false },
      { progressed: 25, blocked: 0, finished: false },
      { progressed: 1, blocked: 0, finished: false },
    ]);
    const final = committedPages.at(-1);
    expect(final?.intent.cursor.table).toBe("verify");
    expect(final?.result).toEqual({
      progressed: 0,
      blocked: 0,
      finished: true,
    });
    if (!final) throw new Error("P5D_PAGE_VERIFY");
    expect(terminal.intent.version).toBe(final.intent.version + 1);
    expect(terminal.remaining).toBe(0);
    expect(responseLosses).toBe(1);
    expect(releasedClaims).toHaveLength(1);
    await emptyFamilies();
    await f.guard();
  }, 40_000);
});

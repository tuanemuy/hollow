import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { currentUser } from "@repo/core/application/account/session";
import {
  beginOpenRouter,
  completeOpenRouter,
} from "@repo/core/application/integration/openRouter/connection";
import type { CredentialUse } from "@repo/core/domain/account/deletion";
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
  createMultipleCredentialDebtFixture,
  type MultipleCredentialDebtFixture,
} from "./accountDeletionMultipleCredentialDebtFixtures";

describe.sequential("P5d-E/F multiple native credential use obligations", () => {
  let f: MultipleCredentialDebtFixture;
  let actor: Awaited<ReturnType<MultipleCredentialDebtFixture["account"]>>;
  beforeAll(async () => {
    f = await createMultipleCredentialDebtFixture();
    try {
      actor = await f.account("multiple-native@p5d.fixture.test");
    } catch (error) {
      f.fail();
      throw error;
    }
  }, 40_000);
  beforeEach(async () => {
    onTestFailed(() => f.fail());
    await f.guard();
  });
  afterEach(async () => {
    if (!f.failed()) await f.guard();
  });
  afterAll(async () => {
    await f?.close();
  }, 40_000);

  it("EF01 reclaims a closed row while two original callers hold final verification then resumes the same intent", async () => {
    let checkpoint:
      | "entry"
      | "begin-three"
      | "callers-started"
      | "gates-ready"
      | "active-two"
      | "failed-attempts"
      | "third-rejection"
      | "third-saved"
      | "third-closed"
      | "third-proof"
      | "origin-empty"
      | "delete-accepted"
      | "anchor-intent"
      | "session-fence"
      | "attempt-page"
      | "attempt-membership"
      | "use-page"
      | "use-membership"
      | "verify-held"
      | "held-obligations"
      | "release-callers"
      | "ended-proof"
      | "retry-fence"
      | "final-verify-and-cleanup" = "entry";
    try {
      const original = f.nativeContainer.unitOfWorkProvider;
      const begin = () =>
        beginOpenRouter(f.container, actor.request, {
          expectedEpoch: 0,
          expectedVersion: 1,
          confirmedReconnect: false,
          returnTo: { kind: "settings" },
        });
      const correlation = (authorizationUrl: string) => {
        const callback = new URL(authorizationUrl).searchParams.get(
          "callback_url",
        );
        const token =
          callback && new URL(callback).searchParams.get("correlation");
        if (!token) throw new Error("P5D_MULTI_CORRELATION");
        return token;
      };
      checkpoint = "begin-three";
      const starts = [await begin(), await begin(), await begin()];
      const a = starts[0];
      const b = starts[1];
      const c = starts[2];
      if (!a || !b || !c) throw new Error("P5D_MULTI_SOURCES");
      const sources = starts.map((value) => value.id);
      const heldA = f.holdFailedCaller(a.id);
      const heldB = f.holdFailedCaller(b.id);
      const complete = (value: typeof a) =>
        completeOpenRouter(
          f.container,
          actor.request,
          correlation(value.authorizationUrl),
          "",
        );
      checkpoint = "callers-started";
      const callerA = complete(a);
      const rejectedA = expect(callerA).rejects.toMatchObject({
        code: "OPENROUTER_EXCHANGE_UNKNOWN",
      });
      const callerB = complete(b);
      const rejectedB = expect(callerB).rejects.toMatchObject({
        code: "OPENROUTER_EXCHANGE_UNKNOWN",
      });
      const allUses = async () => {
        const rows = (
          await f.client.execute(
            "select id from account_deletion_credential_uses order by id",
          )
        ).rows;
        const values: CredentialUse[] = [];
        for (const row of rows) {
          if (typeof row.id !== "string") throw new Error("P5D_MULTI_USE_ID");
          const id = row.id;
          const value = await original.run((u) =>
            u.accountDeletions.credentialUse(id),
          );
          if (!value) throw new Error("P5D_MULTI_USE_MISSING");
          values.push(value);
        }
        return values;
      };
      const bySource = (values: readonly CredentialUse[], source: string) => {
        const value = values.find(
          (row) => row.target.binding.source.id === source,
        );
        if (!value) throw new Error("P5D_MULTI_SOURCE_USE");
        return value;
      };
      const attempt = (id: string) =>
        original.run((u) => u.openRouterAttempts.find(id));
      const count = async (
        table:
          | "account_deletion_debts"
          | "account_deletion_credential_origins"
          | "account_deletion_purges",
      ) => {
        const row = (await f.client.execute(`select count(*) n from ${table}`))
          .rows[0];
        if (!row || typeof row.n !== "number")
          throw new Error("P5D_MULTI_COUNT");
        return row.n;
      };
      const active = (value: CredentialUse) => {
        expect(value).toMatchObject({
          state: "active",
          callerEnded: false,
          acknowledged: false,
          evidenceId: null,
        });
        expect(f.execution.closure(value.target)).toBeNull();
      };
      const closed = (value: CredentialUse) => {
        expect(value).toMatchObject({
          state: "closed",
          callerEnded: true,
          acknowledged: true,
        });
        expect(f.execution.closure(value.target)).toBeNull();
        expect(f.execution.unacknowledged()).toHaveLength(0);
      };
      const genuineConsumed = (value: CredentialUse) => {
        const records = f.receipts.filter(
          (row) => row.saved.target.id === value.target.id,
        );
        expect(records.map((row) => row.phase)).toEqual(["closure", "ack"]);
        const close = records[0];
        const ack = records[1];
        if (!close || !ack) throw new Error("P5D_MULTI_RECEIPTS");
        expect(close.proof).toBe(ack.proof);
        expect(close.saved).toMatchObject({
          state: "closed",
          callerEnded: true,
          acknowledged: false,
        });
        expect(ack.saved).toEqual(value);
        expect(f.execution.verify(ack.proof, value)).toBe(false);
      };
      let wakeCount = 0;
      const wake = async () => {
        if (++wakeCount > 64) throw new Error("P5D_MULTI_WAKE_BOUND");
        await sweepAccountDeletions(f.container);
      };
      try {
        checkpoint = "gates-ready";
        await Promise.all([heldA.ready(), heldB.ready()]);
        checkpoint = "active-two";
        const first = await allUses();
        expect(first).toHaveLength(2);
        const firstA = bySource(first, a.id);
        const firstB = bySource(first, b.id);
        active(firstA);
        active(firstB);
        checkpoint = "failed-attempts";
        for (const value of [a, b])
          expect(await attempt(value.id)).toMatchObject({
            state: "failed",
            failure: "OPENROUTER_PROVIDER_REJECTED",
          });
        checkpoint = "third-rejection";
        await expect(complete(c)).rejects.toMatchObject({
          code: "OPENROUTER_EXCHANGE_UNKNOWN",
        });
        checkpoint = "third-saved";
        const beforeDelete = await allUses();
        expect(beforeDelete).toHaveLength(3);
        expect(bySource(beforeDelete, a.id)).toEqual(firstA);
        expect(bySource(beforeDelete, b.id)).toEqual(firstB);
        const third = bySource(beforeDelete, c.id);
        checkpoint = "third-closed";
        closed(third);
        checkpoint = "third-proof";
        genuineConsumed(third);
        checkpoint = "origin-empty";
        expect(third.target.binding.provider).toBe("openrouter");
        expect(third.target.binding.authority.accountId).toBe(actor.account.id);
        expect(sources).toContain(third.target.binding.source.id);
        expect(await count("account_deletion_credential_origins")).toBe(0);
        checkpoint = "delete-accepted";
        expect(
          await deleteAccount(f.container, actor.token, {
            email: actor.account.email,
          }),
        ).toEqual({ status: "accepted" });
        checkpoint = "anchor-intent";
        const anchor = await original.run((u) =>
          u.accounts.identity(actor.account.id),
        );
        if (anchor.kind !== "deleted") throw new Error("P5D_MULTI_ANCHOR");
        const intent = async () => {
          const value = await original.run((u) =>
            u.accountDeletions.find(anchor.deletionId),
          );
          if (!value) throw new Error("P5D_MULTI_INTENT");
          return value;
        };
        const accepted = await intent();
        expect(accepted).toMatchObject({
          state: "queued",
          version: 1,
          cursor: { table: "personal-notes", afterId: null },
          leaseToken: null,
          leaseUntil: null,
        });
        checkpoint = "session-fence";
        expect(await currentUser(f.container, actor.token)).toBeNull();
        await expect(begin()).rejects.toMatchObject({
          code: "SIGN_IN_REQUIRED",
        });
        expect(await allUses()).toEqual(beforeDelete);
        checkpoint = "attempt-page";
        while ((await intent()).cursor.table !== "openrouter-attempts")
          await wake();
        await wake();
        const attemptPage = f.pages.at(-1);
        expect(attemptPage).toMatchObject({
          intent: { id: accepted.id, cursor: { table: "openrouter-attempts" } },
          result: { progressed: 1, blocked: 2, finished: false },
        });
        checkpoint = "attempt-membership";
        expect(await attempt(c.id)).toBeNull();
        for (const value of [a, b])
          expect(await attempt(value.id)).toMatchObject({
            state: "failed",
            failure: "OPENROUTER_PROVIDER_REJECTED",
          });
        expect(await allUses()).toEqual(beforeDelete);
        checkpoint = "use-page";
        while ((await intent()).cursor.table !== "credential-uses")
          await wake();
        await wake();
        expect(f.pages.at(-1)).toMatchObject({
          intent: { id: accepted.id, cursor: { table: "credential-uses" } },
          result: { progressed: 1, blocked: 2, finished: false },
        });
        checkpoint = "use-membership";
        expect(
          await original.run((u) =>
            u.accountDeletions.credentialUse(third.target.id),
          ),
        ).toBeNull();
        const stillHeld = await allUses();
        expect(stillHeld).toHaveLength(2);
        expect(bySource(stillHeld, a.id)).toEqual(firstA);
        expect(bySource(stillHeld, b.id)).toEqual(firstB);
        active(bySource(stillHeld, a.id));
        active(bySource(stillHeld, b.id));
        checkpoint = "verify-held";
        while ((await intent()).cursor.table !== "verify") await wake();
        await wake();
        const heldPage = f.pages.at(-1);
        if (!heldPage) throw new Error("P5D_MULTI_VERIFY_PAGE");
        expect(heldPage).toMatchObject({
          intent: { id: accepted.id, cursor: { table: "verify" } },
          result: { progressed: 0, blocked: 1, finished: true },
        });
        expect(await intent()).toEqual({
          ...heldPage.intent,
          state: "waiting-owner",
          version: heldPage.intent.version + 1,
          cursor: { table: "personal-notes", afterId: null },
          leaseToken: null,
          leaseUntil: null,
          nextAttemptAt: new Date(f.container.clock.now().getTime() + 2_000),
        });
        checkpoint = "held-obligations";
        expect(await allUses()).toEqual(stillHeld);
        expect(await count("account_deletion_debts")).toBe(0);
        expect(await count("account_deletion_credential_origins")).toBe(0);
        expect(f.execution.unacknowledged()).toHaveLength(0);
        checkpoint = "release-callers";
        heldA.release();
        heldB.release();
        await Promise.all([rejectedA, rejectedB]);
        checkpoint = "ended-proof";
        const ended = await allUses();
        expect(ended).toHaveLength(2);
        for (const before of [firstA, firstB]) {
          const value = bySource(ended, before.target.binding.source.id);
          expect(value.target).toEqual(before.target);
          expect(value.version).toBeGreaterThan(before.version);
          closed(value);
          genuineConsumed(value);
        }
        checkpoint = "retry-fence";
        const waiting = await intent();
        expect(waiting.state).toBe("waiting-owner");
        await wake();
        expect(await intent()).toEqual(waiting);
        f.advance();
        checkpoint = "final-verify-and-cleanup";
        while ((await intent()).state !== "succeeded") await wake();
        const finished = await intent();
        const finalPage = f.pages.at(-1);
        if (!finalPage) throw new Error("P5D_MULTI_FINAL_VERIFY");
        expect(finalPage).toMatchObject({
          intent: { id: accepted.id, cursor: { table: "verify" } },
          result: { progressed: 0, blocked: 0, finished: true },
        });
        expect(finished).toEqual({
          ...finalPage.intent,
          state: "succeeded",
          version: finalPage.intent.version + 1,
          cursor: { table: "verify", afterId: null },
          leaseToken: null,
          leaseUntil: null,
          nextAttemptAt: f.container.clock.now(),
        });
        expect(finished.accountId).toBe(accepted.accountId);
        expect(finished.fenceAuthVersion).toBe(accepted.fenceAuthVersion);
        expect(finished.acceptedAt).toEqual(accepted.acceptedAt);
        expect(
          await original.run((u) => u.accounts.identity(actor.account.id)),
        ).toEqual(anchor);
        expect(await allUses()).toHaveLength(0);
        for (const id of sources) expect(await attempt(id)).toBeNull();
        for (const table of [
          "account_deletion_debts",
          "account_deletion_credential_origins",
          "account_deletion_purges",
        ] as const)
          expect(await count(table)).toBe(0);
        const connection = await original.run((u) =>
          u.openRouterConnections.find(actor.account.id),
        );
        expect(connection).toMatchObject({
          state: "unlinked",
          credentialEnvelope: null,
          providerUserId: null,
          everLinkedAt: null,
        });
        expect(f.execution.unacknowledged()).toHaveLength(0);
        expect(f.receipts).toHaveLength(6);
        expect(wakeCount).toBeLessThanOrEqual(64);
      } finally {
        heldA.release();
        heldB.release();
        await Promise.allSettled([callerA, callerB, rejectedA, rejectedB]);
      }
    } catch (error) {
      try {
        process.stdout.write(
          `P5D_MULTI ${JSON.stringify({ event: "case-failure", case: "EF01", checkpoint })}\n`,
        );
      } catch {
        throw error;
      }
      throw error;
    }
  }, 40_000);
});

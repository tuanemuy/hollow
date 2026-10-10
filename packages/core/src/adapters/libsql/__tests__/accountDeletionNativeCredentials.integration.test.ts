import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
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
import { openRouterHttp } from "../../../../../../apps/web/app/presentation/openRouterHttp.node";
import {
  CredentialAckRollback,
  CredentialCommitLost,
  createNativeCredentialFixture,
  type NativeCredentialFixture,
} from "./accountDeletionNativeCredentialsFixtures";

describe.sequential("P5d-CR native OR whole caller resources0", () => {
  let f: NativeCredentialFixture;
  let actor: Awaited<ReturnType<NativeCredentialFixture["account"]>>;
  let retiring: typeof actor;
  beforeAll(async () => {
    f = await createNativeCredentialFixture();
    try {
      actor = await f.account("or-native-one@p5d.fixture.test");
      retiring = await f.account("or-native-two@p5d.fixture.test");
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

  const begin = (value: typeof actor) =>
    beginOpenRouter(f.container, value.request, {
      expectedEpoch: 0,
      expectedVersion: 1,
      confirmedReconnect: false,
      returnTo: { kind: "settings" },
    });
  const correlation = (authorizationUrl: string) => {
    const value = new URL(authorizationUrl).searchParams.get("callback_url");
    if (!value) throw new Error("P5D_CR_CALLBACK_URL");
    const token = new URL(value).searchParams.get("correlation");
    if (!token) throw new Error("P5D_CR_CORRELATION");
    return token;
  };
  const callback = (value: typeof actor, token: string, code?: string) => {
    const url = new URL("/auth/openrouter/callback", f.container.appUrl);
    url.searchParams.set("correlation", token);
    if (code !== undefined) url.searchParams.set("code", code);
    return openRouterHttp(
      new Request(url, {
        headers: {
          Cookie: `hollow_auth_browser=${value.request.browserToken}; hollow_session=${value.token}`,
        },
      }),
      f.container,
    );
  };
  const pending = () =>
    f.nativeContainer.unitOfWorkProvider.run((u) =>
      u.accountDeletions.pendingCredentialUses(
        "openrouter",
        null,
        f.execution.recoverableRuntimeIds(),
      ),
    );
  const saved = async (id: string) => {
    const value = await f.nativeContainer.unitOfWorkProvider.run((u) =>
      u.accountDeletions.credentialUse(id),
    );
    if (!value) throw new Error("P5D_CR_USE_MISSING");
    return value;
  };
  const closed = (value: CredentialUse, acknowledged: boolean) => {
    expect(value.state).toBe("closed");
    expect(value.callerEnded).toBe(true);
    expect(value.acknowledged).toBe(acknowledged);
  };
  const emptyCode = async () => {
    const started = await begin(actor);
    return { ...started, token: correlation(started.authorizationUrl) };
  };

  it("CR01 missing-code normal HTTP callback cancels without native use", async () => {
    const started = await begin(actor);
    const response = await callback(
      actor,
      correlation(started.authorizationUrl),
    );
    expect(response?.status).toBe(303);
    const attempt = await f.nativeContainer.unitOfWorkProvider.run((u) =>
      u.openRouterAttempts.find(started.id),
    );
    expect(attempt).toMatchObject({
      state: "failed",
      failure: "OPENROUTER_CANCELLED",
    });
    expect(await pending()).toHaveLength(0);
    expect(f.execution.unacknowledged()).toHaveLength(0);
    expect(
      (
        await f.client.execute(
          "select count(*) n from account_deletion_credential_uses",
        )
      ).rows[0]?.n,
    ).toBe(0);
  });

  it("CR02 internal empty-code awaits failed UoW and whole caller before genuine closed ACK", async () => {
    const started = await emptyCode();
    const held = f.holdFailedCaller();
    const completed = completeOpenRouter(
      f.container,
      actor.request,
      started.token,
      "",
    );
    const rejected = expect(completed).rejects.toMatchObject({
      code: "OPENROUTER_EXCHANGE_UNKNOWN",
    });
    try {
      await held.ready();
      const rows = await pending();
      expect(rows).toHaveLength(1);
      const value = rows[0];
      if (!value) throw new Error("P5D_CR_USE_MISSING");
      expect(value.state).toBe("active");
      expect(value.callerEnded).toBe(false);
      expect(f.execution.closure(value.target)).toBeNull();
      expect(f.execution.unacknowledged()).toHaveLength(0);
      const attempt = await f.nativeContainer.unitOfWorkProvider.run((u) =>
        u.openRouterAttempts.find(started.id),
      );
      expect(attempt?.state).toBe("failed");
    } finally {
      held.release();
    }
    await rejected;
    expect(await pending()).toHaveLength(0);
    expect(f.execution.unacknowledged()).toHaveLength(0);
    const rows = (
      await f.client.execute(
        "select state,caller_ended,acknowledged from account_deletion_credential_uses",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      state: "closed",
      caller_ended: 1,
      acknowledged: 1,
    });
    expect(
      (
        await f.client.execute(
          "select verifier_envelope,candidate_envelope from openrouter_attempts where id=?",
          [started.id],
        )
      ).rows[0],
    ).toMatchObject({ verifier_envelope: null, candidate_envelope: null });
  });

  it("CR03 closure commit response loss retains exact proof until saved read ACK", async () => {
    const started = await emptyCode();
    f.armCommitLoss("closure");
    await expect(
      completeOpenRouter(f.container, actor.request, started.token, ""),
    ).rejects.toBeInstanceOf(CredentialCommitLost);
    const proofs = f.execution.unacknowledged();
    expect(proofs).toHaveLength(1);
    const proof = proofs[0];
    if (!proof) throw new Error("P5D_CR_PROOF_MISSING");
    const before = await saved(proof.target.id);
    closed(before, false);
    expect(f.execution.verify(proof, before)).toBe(true);
    expect(f.execution.closure(proof.target)).toBe(proof);
    await sweepAccountDeletions(f.container);
    const after = await saved(proof.target.id);
    closed(after, true);
    expect(after.target).toEqual(before.target);
    if (after.state !== "closed" || before.state !== "closed")
      throw new Error("P5D_CR_CLOSED_STATE");
    expect(after.evidenceId).toBe(before.evidenceId);
    expect(f.execution.unacknowledged()).toHaveLength(0);
    expect(f.execution.closure(proof.target)).toBeNull();
  });

  it("CR04 ACK commit response loss consumes same saved evidence on intent-independent wake", async () => {
    const started = await emptyCode();
    f.armCommitLoss("ack");
    await expect(
      completeOpenRouter(f.container, actor.request, started.token, ""),
    ).rejects.toBeInstanceOf(CredentialCommitLost);
    const proof = f.execution.unacknowledged()[0];
    if (!proof) throw new Error("P5D_CR_PROOF_MISSING");
    expect(f.execution.unacknowledged()).toHaveLength(1);
    const before = await saved(proof.target.id);
    closed(before, true);
    expect(f.execution.verify(proof, before)).toBe(true);
    await sweepAccountDeletions(f.container);
    expect(await saved(proof.target.id)).toEqual(before);
    expect(f.execution.unacknowledged()).toHaveLength(0);
    expect(f.execution.recoverableRuntimeIds()).toHaveLength(1);
  });

  it("CR05 nonempty retirement fence rolls back ACK before commit and resumes the same resources0 proof", async () => {
    let releaseAck = () => {};
    try {
      const started = await begin(retiring);
      const held = f.holdCallbackPrepared();
      const response = callback(
        retiring,
        correlation(started.authorizationUrl),
        "p5d-self-nonempty-code",
      );
      let use: CredentialUse | undefined;
      try {
        await held.ready();
        const rows = await pending();
        expect(rows).toHaveLength(1);
        use = rows[0];
        if (!use) throw new Error("P5D_CR_USE_MISSING");
        expect(use.state).toBe("active");
        expect(use.callerEnded).toBe(false);
        expect(f.execution.closure(use.target)).toBeNull();
        expect(
          await deleteAccount(f.nativeContainer, retiring.token, {
            email: retiring.account.email,
          }),
        ).toEqual({ status: "accepted" });
        releaseAck = f.armAckRollback();
      } finally {
        held.release();
      }
      expect((await response)?.status).toBe(303);
      if (!use) throw new Error("P5D_CR_USE_MISSING");
      const proof = f.execution.unacknowledged()[0];
      if (!proof) throw new Error("P5D_CR_PROOF_MISSING");
      expect(f.execution.unacknowledged()).toEqual([proof]);
      const before = await saved(use.target.id);
      closed(before, false);
      expect(f.execution.verify(proof, before)).toBe(true);
      expect(f.execution.closure(before.target)).toBe(proof);
      expect(f.ackRollbacks()).toBe(1);
      const intent = async () =>
        (
          await f.client.execute({
            sql: "select * from account_deletions where account_id=?",
            args: [retiring.account.id],
          })
        ).rows[0];
      const debts = async () =>
        (
          await f.client.execute({
            sql: "select * from account_deletion_debts where intent_id in(select id from account_deletions where account_id=?) order by kind,owner_id",
            args: [retiring.account.id],
          })
        ).rows;
      const intentBefore = await intent();
      expect(intentBefore).toMatchObject({
        state: "queued",
        cursor_table: "personal-notes",
        cursor_after_id: null,
        version: 1,
        lease_token: null,
        lease_until: null,
      });
      const debtsBefore = await debts();
      expect(debtsBefore).toHaveLength(0);
      const attemptBefore = await f.nativeContainer.unitOfWorkProvider.run(
        (u) => u.openRouterAttempts.find(started.id),
      );
      expect(attemptBefore).not.toBeNull();
      const rejectedSweep = sweepAccountDeletions(f.container);
      await expect(rejectedSweep).rejects.toBeInstanceOf(SystemError);
      await expect(rejectedSweep).rejects.toMatchObject({
        code: SystemErrorCode.DatabaseError,
        cause: expect.any(CredentialAckRollback),
      });
      expect(f.ackRollbacks()).toBe(2);
      expect(await intent()).toEqual(intentBefore);
      expect(await debts()).toEqual(debtsBefore);
      expect(await saved(use.target.id)).toEqual(before);
      expect(f.execution.unacknowledged()).toEqual([proof]);
      expect(f.execution.unacknowledged()[0]).toBe(proof);
      expect(f.execution.closure(before.target)).toBe(proof);
      expect(f.execution.verify(proof, before)).toBe(true);
      expect(
        await f.nativeContainer.unitOfWorkProvider.run((u) =>
          u.openRouterAttempts.find(started.id),
        ),
      ).toEqual(attemptBefore);
      releaseAck();
      await sweepAccountDeletions(f.container);
      const after = await saved(use.target.id);
      closed(after, true);
      expect(after.target).toEqual(before.target);
      if (after.state !== "closed" || before.state !== "closed")
        throw new Error("P5D_CR_CLOSED_STATE");
      expect(after.evidenceId).toBe(before.evidenceId);
      expect(f.execution.verify(proof, after)).toBe(false);
      expect(f.execution.unacknowledged()).toHaveLength(0);
      expect(f.execution.closure(before.target)).toBeNull();
      const intentAfter = await intent();
      expect(intentAfter?.id).toBe(intentBefore?.id);
      expect(intentAfter?.version).toBeGreaterThan(1);
      expect(intentAfter?.cursor_table).toBe("uploads");
      expect(
        (
          await callback(
            retiring,
            correlation(started.authorizationUrl),
            "p5d-self-nonempty-code",
          )
        )?.status,
      ).toBe(303);
      expect(
        (
          await f.client.execute(
            "select count(*) n from account_deletion_credential_origins",
          )
        ).rows[0]?.n,
      ).toBe(0);
      expect(
        await deleteAccount(f.nativeContainer, actor.token, {
          email: actor.account.email,
        }),
      ).toEqual({ status: "accepted" });
      for (let n = 0; n < 64; n++) {
        await sweepAccountDeletions(f.container);
        f.advance();
      }
      const remaining = (
        await f.client.execute(
          "select state,failure,verifier_envelope,candidate_envelope from openrouter_attempts where account_id=?",
          [retiring.account.id],
        )
      ).rows;
      expect(remaining).toHaveLength(0);
      expect(
        (
          await f.client.execute(
            "select count(*) n from account_deletion_credential_uses",
          )
        ).rows[0]?.n,
      ).toBe(0);
    } finally {
      releaseAck();
    }
  }, 40_000);
});

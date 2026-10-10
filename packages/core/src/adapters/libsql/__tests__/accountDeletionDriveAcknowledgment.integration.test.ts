import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { currentUser } from "@repo/core/application/account/session";
import {
  beginDriveAuthorization,
  driveFolderConfirmation,
  exchangeDriveAuthorization,
} from "@repo/core/application/integration/drive/connection";
import type { DriveClosedProof } from "@repo/core/application/integration/drive/ports";
import {
  driveTarget,
  reconcileDriveClosures,
} from "@repo/core/application/integration/drive/runner";
import type { DriveAttempt } from "@repo/core/domain/integration/drive";
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
  createDriveAcknowledgmentFixture,
  type DriveAcknowledgmentFixture,
} from "./accountDeletionDriveAcknowledgmentFixtures";

describe.sequential("P5d-E/F Drive acknowledgment uncertainty", () => {
  let f: DriveAcknowledgmentFixture;
  let actor: Awaited<ReturnType<DriveAcknowledgmentFixture["account"]>>;
  let checkpoint:
    | "entry"
    | "begin-two"
    | "closed-counterpart"
    | "ack-before-invoke"
    | "retained-proof"
    | "delete-accepted"
    | "anchor-intent"
    | "session-fence"
    | "attempt-page"
    | "attempt-membership"
    | "verify-held"
    | "held-obligations"
    | "fault-on-reconcile"
    | "same-proof-ack"
    | "retry-fence"
    | "final-verify-and-cleanup" = "entry";
  let failureFrameSent = false;
  beforeAll(async () => {
    f = await createDriveAcknowledgmentFixture();
    try {
      actor = await f.account("drive-ack-native@p5d.fixture.test");
    } catch (error) {
      f.fail();
      throw error;
    }
  }, 40_000);
  beforeEach(async () => {
    checkpoint = "entry";
    failureFrameSent = false;
    onTestFailed(() => {
      f.fail();
      if (failureFrameSent) return;
      failureFrameSent = true;
      try {
        process.stdout.write(
          `P5D_DRIVE_ACK ${JSON.stringify({ event: "case-failure", case: "DA01", checkpoint })}\n`,
        );
      } catch {
        f.fail();
      }
    });
    await f.guard();
  });
  afterEach(async () => {
    if (!f.failed()) await f.guard();
  });
  afterAll(async () => {
    await f?.close();
  }, 40_000);

  it("DA01 retains an unacknowledged closed proof then acknowledges the same proof and resumes the same intent", async () => {
    const original = f.nativeContainer.unitOfWorkProvider;
    await original.run((u) =>
      u.driveConnections.ensure(actor.account.id, f.container.clock.now()),
    );
    const confirmation = await original.run((u) =>
      driveFolderConfirmation(u, actor.account.id, (value) =>
        f.container.tokens.hash(value),
      ),
    );
    const begin = () =>
      beginDriveAuthorization(f.container, actor.request, {
        commandId: f.container.idGenerator.next(),
        expectedEpoch: 0,
        expectedSettingsVersion: 1,
        confirmation,
        consent: false,
        chooseAccount: true,
      });
    checkpoint = "begin-two";
    const c = await begin();
    const a = await begin();
    const complete = (value: typeof a) => {
      if (!value.url) throw new Error("P5D_DRIVE_ACK_URL");
      const state = new URL(value.url).searchParams.get("state");
      if (!state) throw new Error("P5D_DRIVE_ACK_STATE");
      return exchangeDriveAuthorization(
        f.container,
        actor.request,
        { state, code: "" },
        f.services.runtimeGeneration,
      );
    };
    const attempt = async (id: string) => {
      const row = await original.run((u) => u.driveAttempts.find(id));
      if (!row || row.owner.state !== "closed")
        throw new Error("P5D_DRIVE_ACK_CLOSED_ROW");
      return row;
    };
    const target = (row: DriveAttempt) =>
      driveTarget("authorization", row.id, row.owner);
    const receipt = (row: DriveAttempt, proof: DriveClosedProof) => {
      const value = f.execution
        .acknowledgedReceipts(25)
        .find((entry) => entry.proof.target.id === row.id);
      if (!value) throw new Error("P5D_DRIVE_ACK_RECEIPT");
      expect(value.proof).not.toBe(proof);
      expect(value.proof.target).toEqual(proof.target);
      expect(value.proof.evidenceId).toBe(proof.evidenceId);
      expect(value.proof.source).toBe(proof.source);
      expect(f.execution.verifyAcknowledgedReceipt(value)).toBe(true);
      return value;
    };
    let wakes = 0;
    const wake = async () => {
      if (++wakes > 64) throw new Error("P5D_DRIVE_ACK_WAKE_BOUND");
      await sweepAccountDeletions(f.container);
    };
    checkpoint = "closed-counterpart";
    expect(await complete(c)).toEqual({ id: c.id, phase: "failed" });
    const rowC = await attempt(c.id);
    expect(rowC.data).toEqual({ phase: "failed", failure: "DRIVE_UNVERIFIED" });
    expect(f.nativeAcknowledgments).toHaveLength(1);
    const nativeC = f.nativeAcknowledgments[0];
    if (!nativeC) throw new Error("P5D_DRIVE_ACK_NATIVE_C");
    expect(nativeC.proof.source).toBe("local-close");
    expect(nativeC.proof.target).toEqual(target(rowC));
    expect(nativeC.caller).toBe("pending");
    const receiptC = receipt(rowC, nativeC.proof);
    expect(f.execution.caller(target(rowC))).toBe("untracked");
    checkpoint = "ack-before-invoke";
    f.fault(a.id);
    await expect(complete(a)).rejects.toBe(f.ackFault);
    const rowA = await attempt(a.id);
    expect(rowA.data).toEqual({ phase: "failed", failure: "DRIVE_UNVERIFIED" });
    expect(f.faultCalls).toHaveLength(1);
    const firstFault = f.faultCalls[0];
    if (!firstFault) throw new Error("P5D_DRIVE_ACK_FIRST_FAULT");
    expect(firstFault.row).toEqual(rowA);
    expect(firstFault.caller).toBe("pending");
    const proofA = firstFault.proof;
    const assertRetained = () => {
      const closure = f.execution.closure(target(rowA));
      expect(closure.kind).toBe("closed");
      if (closure.kind !== "closed")
        throw new Error("P5D_DRIVE_ACK_RETAINED_CLOSURE");
      expect(closure.proof).toBe(proofA);
      expect(proofA.source).toBe("local-close");
      expect(proofA.target).toEqual(target(rowA));
      expect(f.execution.unacknowledged(67)).toEqual([proofA]);
      expect(f.execution.unacknowledged(67)[0]).toBe(proofA);
      expect(f.execution.caller(target(rowA))).toBe("ended");
      expect(f.execution.hasPendingCallers()).toBe(false);
      expect(
        f.execution
          .acknowledgedReceipts(25)
          .some((value) => value.proof.target.id === a.id),
      ).toBe(false);
      expect(f.nativeAcknowledgments).toEqual([nativeC]);
    };
    checkpoint = "retained-proof";
    assertRetained();
    expect(await f.debts()).toHaveLength(0);
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
    if (anchor.kind !== "deleted") throw new Error("P5D_DRIVE_ACK_ANCHOR");
    const intent = async () => {
      const value = await original.run((u) =>
        u.accountDeletions.find(anchor.deletionId),
      );
      if (!value) throw new Error("P5D_DRIVE_ACK_INTENT");
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
    await expect(begin()).rejects.toMatchObject({ code: "SIGN_IN_REQUIRED" });
    checkpoint = "attempt-page";
    while ((await intent()).cursor.table !== "drive-attempts") await wake();
    expect(f.execution.verifyAcknowledgedReceipt(receiptC)).toBe(false);
    expect(f.drains).toHaveLength(1);
    expect(f.drains[0]?.receipt).toBe(receiptC);
    await wake();
    expect(f.pages.at(-1)).toMatchObject({
      intent: { id: accepted.id, cursor: { table: "drive-attempts" } },
      result: { progressed: 1, blocked: 1, finished: false },
    });
    expect(await original.run((u) => u.driveAttempts.find(c.id))).toBeNull();
    checkpoint = "attempt-membership";
    const debtRows = await f.debts();
    expect(debtRows).toHaveLength(1);
    expect(debtRows[0]).toMatchObject({
      intentId: accepted.id,
      kind: "drive-attempt",
      ownerId: a.id,
      locator: {
        table: "drive-attempts",
        id: a.id,
        version: rowA.version,
        runtimeId:
          rowA.owner.state === "closed" ? rowA.owner.runtimeGeneration : null,
        token: rowA.owner.state === "closed" ? rowA.owner.token : null,
        cancelGeneration: rowA.cancelGeneration,
      },
    });
    expect(await attempt(a.id)).toEqual(rowA);
    assertRetained();
    checkpoint = "verify-held";
    while ((await intent()).cursor.table !== "verify") await wake();
    await wake();
    const verify = f.pages.at(-1);
    if (!verify) throw new Error("P5D_DRIVE_ACK_VERIFY");
    expect(verify).toMatchObject({
      intent: { id: accepted.id, cursor: { table: "verify" } },
      result: { progressed: 0, blocked: 1, finished: true },
    });
    checkpoint = "held-obligations";
    const waiting = await intent();
    expect(waiting).toEqual({
      ...verify.intent,
      state: "waiting-owner",
      version: verify.intent.version + 1,
      cursor: { table: "personal-notes", afterId: null },
      leaseToken: null,
      leaseUntil: null,
      nextAttemptAt: new Date(f.container.clock.now().getTime() + 2_000),
    });
    expect(await f.debts()).toEqual(debtRows);
    expect(f.execution.acknowledgedReceipts(25)).toHaveLength(0);
    assertRetained();
    checkpoint = "fault-on-reconcile";
    await expect(reconcileDriveClosures(f.container)).rejects.toBe(f.ackFault);
    expect(f.faultCalls).toHaveLength(2);
    expect(f.faultCalls[1]?.proof).toBe(proofA);
    expect(f.faultCalls[1]?.row).toEqual(rowA);
    expect(f.faultCalls[1]?.caller).toBe("ended");
    expect(await attempt(a.id)).toEqual(rowA);
    expect(await intent()).toEqual(waiting);
    expect(await f.debts()).toEqual(debtRows);
    assertRetained();
    checkpoint = "same-proof-ack";
    f.releaseFault();
    expect(await reconcileDriveClosures(f.container)).toBe(1);
    expect(f.faultCalls).toHaveLength(2);
    expect(f.nativeAcknowledgments).toHaveLength(2);
    expect(f.nativeAcknowledgments[1]?.proof).toBe(proofA);
    expect(f.nativeAcknowledgments[1]?.caller).toBe("ended");
    expect(f.execution.unacknowledged(67)).toHaveLength(0);
    expect(f.execution.caller(target(rowA))).toBe("untracked");
    const receiptA = receipt(rowA, proofA);
    expect(await attempt(a.id)).toEqual(rowA);
    expect(await intent()).toEqual(waiting);
    expect(await f.debts()).toEqual(debtRows);
    checkpoint = "retry-fence";
    await wake();
    expect(await intent()).toEqual(waiting);
    expect(f.execution.verifyAcknowledgedReceipt(receiptA)).toBe(false);
    expect(f.drains).toHaveLength(2);
    expect(f.drains[1]?.receipt).toBe(receiptA);
    expect(await f.debts()).toEqual(debtRows);
    checkpoint = "final-verify-and-cleanup";
    f.advance();
    while ((await intent()).state !== "succeeded") await wake();
    expect(await intent()).toMatchObject({
      id: accepted.id,
      accountId: actor.account.id,
      state: "succeeded",
      cursor: { table: "verify", afterId: null },
      leaseToken: null,
      leaseUntil: null,
    });
    expect(f.pages.at(-1)?.result).toEqual({
      progressed: 0,
      blocked: 0,
      finished: true,
    });
    expect(await f.debts()).toHaveLength(0);
    expect(f.execution.acknowledgedReceipts(25)).toHaveLength(0);
    expect(f.execution.unacknowledged(67)).toHaveLength(0);
    for (const value of [a, c])
      expect(
        await original.run((u) => u.driveAttempts.find(value.id)),
      ).toBeNull();
    expect(await f.count("account_deletion_drive_acknowledgments")).toBe(0);
    expect(await f.count("account_deletion_credential_uses")).toBe(0);
    expect(await f.count("account_deletion_credential_origins")).toBe(0);
    expect(
      await original.run((u) => u.driveConnections.find(actor.account.id)),
    ).toMatchObject({
      state: "unlinked",
      epoch: 0,
      version: 3,
      credential: null,
      folder: null,
    });
    expect(await currentUser(f.container, actor.token)).toBeNull();
    expect(wakes).toBeLessThanOrEqual(64);
  }, 40_000);
});

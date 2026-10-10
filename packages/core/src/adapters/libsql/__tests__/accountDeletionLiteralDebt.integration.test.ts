import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { currentUser } from "@repo/core/application/account/session";
import {
  beginDriveAuthorization,
  driveFolderConfirmation,
  exchangeDriveAuthorization,
} from "@repo/core/application/integration/drive/connection";
import { driveTarget } from "@repo/core/application/integration/drive/runner";
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
  createLiteralDebtFixture,
  type LiteralDebtFixture,
} from "./accountDeletionLiteralDebtFixtures";

describe.sequential("P5d-E/F literal Drive caller debts", () => {
  let f: LiteralDebtFixture;
  let checkpoint:
    | "entry"
    | "begin-three"
    | "third-proof"
    | "gates-ready"
    | "active-two"
    | "delete-accepted"
    | "anchor-intent"
    | "session-fence"
    | "attempt-page"
    | "attempt-membership"
    | "verify-held"
    | "held-obligations"
    | "release-callers"
    | "ended-proof"
    | "retry-fence"
    | "final-verify-and-cleanup" = "entry";
  let failureFrameSent = false;
  let actor: Awaited<ReturnType<LiteralDebtFixture["account"]>>;
  beforeAll(async () => {
    f = await createLiteralDebtFixture();
    try {
      actor = await f.account("literal-native@p5d.fixture.test");
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
          `P5D_LITERAL ${JSON.stringify({ event: "case-failure", case: "LD01", checkpoint })}\n`,
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

  it("LD01 records two literal caller debts while a closed row progresses then resumes the same intent", async () => {
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
    checkpoint = "begin-three";
    const c = await begin();
    const a = await begin();
    const b = await begin();
    const complete = (value: typeof a) => {
      if (!value.url) throw new Error("P5D_LITERAL_URL");
      const state = new URL(value.url).searchParams.get("state");
      if (!state) throw new Error("P5D_LITERAL_STATE");
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
        throw new Error("P5D_LITERAL_CLOSED_ROW");
      return row;
    };
    const target = (row: DriveAttempt) =>
      driveTarget("authorization", row.id, row.owner);
    const nativeAcknowledgment = (row: DriveAttempt) => {
      const records = f.nativeAcknowledgments.filter(
        (record) => record.proof.target.id === row.id,
      );
      expect(records).toHaveLength(1);
      const record = records[0];
      if (!record) throw new Error("P5D_LITERAL_ACK");
      expect(record.proof.source).toBe("local-close");
      expect(record.proof.target).toEqual(target(row));
      expect(record.caller).toBe("pending");
      return record;
    };
    const receipt = (row: DriveAttempt) => {
      const value = f.execution
        .acknowledgedReceipts(25)
        .find((entry) => entry.proof.target.id === row.id);
      if (!value) throw new Error("P5D_LITERAL_RECEIPT");
      const ack = nativeAcknowledgment(row);
      expect(value.proof.target).toEqual(ack.proof.target);
      expect(value.proof.evidenceId).toBe(ack.proof.evidenceId);
      expect(value.proof.source).toBe(ack.proof.source);
      expect(f.execution.verifyAcknowledgedReceipt(value)).toBe(true);
      return value;
    };
    let wakes = 0;
    const wake = async () => {
      if (++wakes > 64) throw new Error("P5D_LITERAL_WAKE_BOUND");
      await sweepAccountDeletions(f.container);
    };
    checkpoint = "third-proof";
    expect(await complete(c)).toEqual({ id: c.id, phase: "failed" });
    const rowC = await attempt(c.id);
    expect(rowC.data).toEqual({ phase: "failed", failure: "DRIVE_UNVERIFIED" });
    const receiptC = receipt(rowC);
    expect(f.execution.caller(target(rowC))).toBe("untracked");
    const heldA = f.holdCaller(a.id);
    const heldB = f.holdCaller(b.id);
    const callerA = complete(a);
    void callerA.catch(() => {});
    let callerB: ReturnType<typeof complete> | null = null;
    try {
      checkpoint = "gates-ready";
      await heldA.ready();
      const rowA = await attempt(a.id);
      nativeAcknowledgment(rowA);
      expect(f.execution.caller(target(rowA))).toBe("pending");
      expect(f.execution.closure(target(rowA))).toEqual({ kind: "held" });
      callerB = complete(b);
      void callerB.catch(() => {});
      await heldB.ready();
      const rowB = await attempt(b.id);
      checkpoint = "active-two";
      for (const row of [rowA, rowB]) {
        expect(row.owner.state).toBe("closed");
        expect(row.data).toEqual({
          phase: "failed",
          failure: "DRIVE_UNVERIFIED",
        });
        nativeAcknowledgment(row);
        expect(f.execution.caller(target(row))).toBe("pending");
        expect(f.execution.closure(target(row))).toEqual({ kind: "held" });
      }
      expect(f.execution.hasPendingCallers()).toBe(true);
      expect(f.execution.acknowledgedReceipts(25)).toEqual([receiptC]);
      expect(f.execution.unacknowledged(67)).toHaveLength(0);
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
      if (anchor.kind !== "deleted") throw new Error("P5D_LITERAL_ANCHOR");
      const intent = async () => {
        const value = await original.run((u) =>
          u.accountDeletions.find(anchor.deletionId),
        );
        if (!value) throw new Error("P5D_LITERAL_INTENT");
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
      const page = f.pages.at(-1);
      expect(page).toMatchObject({
        intent: { id: accepted.id, cursor: { table: "drive-attempts" } },
        result: { progressed: 1, blocked: 2, finished: false },
      });
      expect(await original.run((u) => u.driveAttempts.find(c.id))).toBeNull();
      checkpoint = "attempt-membership";
      const debtRows = await f.debts();
      expect(debtRows).toHaveLength(2);
      expect(debtRows.map((row) => row.ownerId).sort()).toEqual(
        [a.id, b.id].sort(),
      );
      for (const row of [rowA, rowB]) {
        const debt = debtRows.find((value) => value.ownerId === row.id);
        expect(debt).toMatchObject({
          intentId: accepted.id,
          kind: "drive-attempt",
          locator: {
            table: "drive-attempts",
            id: row.id,
            version: row.version,
            runtimeId:
              row.owner.state === "closed" ? row.owner.runtimeGeneration : null,
            token: row.owner.state === "closed" ? row.owner.token : null,
            cancelGeneration: row.cancelGeneration,
          },
        });
        expect(await attempt(row.id)).toEqual(row);
      }
      checkpoint = "verify-held";
      while ((await intent()).cursor.table !== "verify") await wake();
      await wake();
      const verify = f.pages.at(-1);
      if (!verify) throw new Error("P5D_LITERAL_VERIFY");
      expect(verify).toMatchObject({
        intent: { id: accepted.id, cursor: { table: "verify" } },
        result: { progressed: 0, blocked: 1, finished: true },
      });
      checkpoint = "held-obligations";
      expect(await intent()).toEqual({
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
      checkpoint = "release-callers";
      heldA.release();
      heldB.release();
      expect(await callerA).toEqual({ id: a.id, phase: "failed" });
      expect(await callerB).toEqual({ id: b.id, phase: "failed" });
      checkpoint = "ended-proof";
      const receiptA = receipt(rowA);
      const receiptB = receipt(rowB);
      expect(f.execution.hasPendingCallers()).toBe(false);
      expect(f.execution.caller(target(rowA))).toBe("untracked");
      expect(f.execution.caller(target(rowB))).toBe("untracked");
      checkpoint = "retry-fence";
      const waiting = await intent();
      await wake();
      expect(await intent()).toEqual(waiting);
      for (const value of [receiptA, receiptB]) {
        expect(f.execution.verifyAcknowledgedReceipt(value)).toBe(false);
        expect(f.drains.some((entry) => entry.receipt === value)).toBe(true);
      }
      expect(f.drains).toHaveLength(3);
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
      for (const value of [a, b, c])
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
        version: 4,
        credential: null,
        folder: null,
      });
      expect(await currentUser(f.container, actor.token)).toBeNull();
      expect(wakes).toBeLessThanOrEqual(64);
    } finally {
      heldA.release();
      heldB.release();
      await Promise.allSettled(callerB ? [callerA, callerB] : [callerA]);
      f.restore();
    }
  }, 40_000);
});

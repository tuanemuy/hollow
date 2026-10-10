import { captureAuthentication } from "@repo/core/application/account/context";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import {
  beginDriveAuthorization,
  driveFolderConfirmation,
  exchangeDriveAuthorization,
} from "@repo/core/application/integration/drive/connection";
import {
  driveTarget,
  maintainDrive,
} from "@repo/core/application/integration/drive/runner";
import { DRIVE_LIMITS } from "@repo/core/domain/integration/drive";
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
  createDriveCapacityFixture,
  type DriveCapacityFixture,
} from "./accountDeletionDriveCapacityFixtures";

describe.sequential("P5d-E/F/G ordinary Drive capacity and matched prune", () => {
  let f: DriveCapacityFixture;
  let actor: Awaited<ReturnType<DriveCapacityFixture["account"]>>;
  let checkpoint:
    | "entry"
    | "ready67"
    | "capacity68"
    | "drain67"
    | "resume68"
    | "drain68"
    | "matched-prune" = "entry";
  let failureFrameSent = false;
  beforeAll(async () => {
    f = await createDriveCapacityFixture();
    try {
      actor = await f.account("drive-capacity@p5d.fixture.test");
    } catch (error) {
      f.fail();
      throw error;
    }
  }, 40_000);
  beforeEach(async () => {
    onTestFailed(() => {
      f.fail();
      if (failureFrameSent) return;
      failureFrameSent = true;
      try {
        process.stdout.write(
          `P5D_DRIVE_CAPACITY ${JSON.stringify({ event: "case-failure", case: "CA67", checkpoint, sourceFault: f.sourceFault() })}\n`,
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
  it("CA67 rejects preclaim at ready capacity then drains and resumes the same attempt before matched prune", async () => {
    const provider = f.container.unitOfWorkProvider;
    await provider.run((u) =>
      u.driveConnections.ensure(actor.account.id, f.container.clock.now()),
    );
    const begin = async () => {
      const confirmation = await provider.run(async (u) => {
        const context = await captureAuthentication(
          f.container,
          u,
          actor.request,
        );
        expect(context.actor?.accountId).toBe(actor.account.id);
        expect(context.actor?.authVersion).toBe(actor.account.authVersion);
        return driveFolderConfirmation(u, actor.account.id, (value) =>
          f.container.tokens.hash(value),
        );
      });
      return beginDriveAuthorization(f.container, actor.request, {
        commandId: f.container.idGenerator.next(),
        expectedEpoch: 0,
        expectedSettingsVersion: 1,
        confirmation,
        consent: false,
        chooseAccount: true,
      });
    };
    const complete = (value: Awaited<ReturnType<typeof begin>>) => {
      if (!value.url) throw new Error("P5D_DRIVE_CAPACITY_URL");
      const state = new URL(value.url).searchParams.get("state");
      if (!state) throw new Error("P5D_DRIVE_CAPACITY_STATE");
      return exchangeDriveAuthorization(
        f.container,
        actor.request,
        { state, code: "" },
        f.services.runtimeGeneration,
      );
    };
    const normalComplete = async (value: Awaited<ReturnType<typeof begin>>) => {
      expect(await complete(value)).toEqual({ id: value.id, phase: "failed" });
      const row = await provider.run((u) => u.driveAttempts.find(value.id));
      if (!row || row.owner.state !== "closed")
        throw new Error("P5D_DRIVE_CAPACITY_CLOSED_ROW");
      expect(row.data).toEqual({
        phase: "failed",
        failure: "DRIVE_UNVERIFIED",
      });
      expect(row.cancelGeneration).toBe(0);
      expect(row.terminalAt).toEqual(f.container.clock.now());
      const proof = f.nativeAcknowledgments.at(-1);
      if (!proof) throw new Error("P5D_DRIVE_CAPACITY_PROOF");
      expect(proof.source).toBe("local-close");
      expect(proof.target).toEqual(
        driveTarget("authorization", row.id, row.owner),
      );
      expect(f.execution.caller(proof.target)).toBe("untracked");
      expect(f.execution.hasPendingCallers()).toBe(false);
      expect(f.execution.unacknowledged(67)).toHaveLength(0);
    };
    checkpoint = "ready67";
    let windowAdvances = 0;
    for (let index = 0; index < 67; index++) {
      if (index > 0 && index % DRIVE_LIMITS.browserRecent === 0) {
        f.advanceWindow();
        windowAdvances++;
      }
      await normalComplete(await begin());
    }
    expect(windowAdvances).toBe(13);
    expect(f.nativeAcknowledgments).toHaveLength(67);
    expect(f.execution.acknowledgedReceipts(25)).toHaveLength(25);
    expect(await f.count("drive_authorization_attempts")).toBe(67);
    expect(await f.count("account_deletion_drive_acknowledgments")).toBe(0);
    checkpoint = "capacity68";
    const pending = await begin();
    const before = await provider.run((u) => u.driveAttempts.find(pending.id));
    if (!before) throw new Error("P5D_DRIVE_CAPACITY_PENDING");
    expect(before.owner).toEqual({ state: "none" });
    expect(before.data.phase).toBe("pending");
    await expect(complete(pending)).rejects.toMatchObject({
      code: "DRIVE_UNAVAILABLE",
    });
    expect(await provider.run((u) => u.driveAttempts.find(pending.id))).toEqual(
      before,
    );
    expect(f.nativeAcknowledgments).toHaveLength(67);
    expect(await maintainDrive(f.container, f.services.runtimeGeneration)).toBe(
      0,
    );
    expect(await f.count("drive_authorization_attempts")).toBe(68);
    const drain = async (expected: number, total: number) => {
      const page = f.execution.acknowledgedReceipts(25);
      expect(page).toHaveLength(expected);
      for (const receipt of page)
        expect(f.execution.verifyAcknowledgedReceipt(receipt)).toBe(true);
      await sweepAccountDeletions(f.container);
      expect(f.drains).toHaveLength(total);
      expect(
        f.drains.slice(total - expected).map((row) => row.receipt),
      ).toEqual(page);
      for (let index = 0; index < page.length; index++)
        expect(f.drains[total - expected + index]?.receipt).toBe(page[index]);
      for (const row of f.drains) {
        expect(row.read).toBe(true);
        expect(f.execution.verifyAcknowledgedReceipt(row.receipt)).toBe(false);
      }
      expect(await f.count("account_deletion_drive_acknowledgments")).toBe(
        total,
      );
      expect(await f.count("account_deletions")).toBe(0);
      expect(await f.count("account_deletion_debts")).toBe(0);
    };
    checkpoint = "drain67";
    await drain(25, 25);
    await drain(25, 50);
    await drain(17, 67);
    expect(f.execution.acknowledgedReceipts(25)).toHaveLength(0);
    expect(await provider.run((u) => u.driveAttempts.find(pending.id))).toEqual(
      before,
    );
    checkpoint = "resume68";
    await normalComplete(pending);
    expect(f.nativeAcknowledgments).toHaveLength(68);
    checkpoint = "drain68";
    await drain(1, 68);
    expect(f.execution.acknowledgedReceipts(25)).toHaveLength(0);
    expect(f.execution.unacknowledged(67)).toHaveLength(0);
    expect(f.execution.predecessors()).toHaveLength(0);
    expect(f.execution.hasPendingCallers()).toBe(false);
    expect(await f.count("drive_authorization_attempts")).toBe(68);
    expect(
      await provider.run((u) => u.driveConnections.find(actor.account.id)),
    ).toMatchObject({
      state: "unlinked",
      epoch: 0,
      version: 69,
      settingsVersion: 1,
      credential: null,
      folder: null,
    });
    checkpoint = "matched-prune";
    f.advanceHistory();
    expect(await maintainDrive(f.container, f.services.runtimeGeneration)).toBe(
      68,
    );
    expect(await f.count("drive_authorization_attempts")).toBe(0);
    expect(await f.count("account_deletion_drive_acknowledgments")).toBe(0);
    expect(await f.count("account_deletions")).toBe(0);
    expect(await f.count("account_deletion_debts")).toBe(0);
    expect(f.unitOfWorkCalls()).toBeLessThanOrEqual(1024);
    await f.guard();
  }, 40_000);
});

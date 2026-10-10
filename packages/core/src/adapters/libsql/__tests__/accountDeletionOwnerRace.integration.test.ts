import { deleteAccount } from "@repo/core/application/account/deletion";
import { currentUser } from "@repo/core/application/account/session";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { BusinessRuleError } from "@repo/core/domain/error";
import { createNote } from "@repo/core/domain/note/entity";
import type { Workspace } from "@repo/core/domain/workspace/entity";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFailed,
} from "vitest";
import {
  type AccountDeletionOwnerRaceFixture,
  createAccountDeletionOwnerRaceFixture,
} from "./accountDeletionOwnerRaceFixtures";

const workspaceState = (workspace: Workspace | null) =>
  workspace && {
    id: workspace.id,
    creatorId: workspace.creatorId,
    name: workspace.name,
    description: workspace.description,
    slug: workspace.slug,
    createdAt: workspace.createdAt,
    state: workspace.state,
    iconId: workspace.iconId,
  };

describe.sequential("P5d-B two-owner retirement race", () => {
  let f: AccountDeletionOwnerRaceFixture;
  beforeAll(async () => {
    f = await createAccountDeletionOwnerRaceFixture();
  }, 40_000);
  afterAll(async () => {
    await f?.close();
  }, 40_000);
  it("OR01 preserves an active owner when two original clients request retirement concurrently", async () => {
    let checkpoint = "entry";
    let observedRaceReceipt: Awaited<
      ReturnType<AccountDeletionOwnerRaceFixture["endRace"]>
    > | null = null;
    onTestFailed(() => {
      f.fail();
      process.stdout.write(
        `P5D_OWNER_RACE ${JSON.stringify({
          event: "case-failure",
          case: "OR01",
          checkpoint,
          sourceFault: f.sourceFault(),
          raceReceipt:
            observedRaceReceipt === null
              ? null
              : {
                  overlappingRequests:
                    typeof observedRaceReceipt.overlappingRequests === "boolean"
                      ? observedRaceReceipt.overlappingRequests
                      : null,
                  requested:
                    Number.isSafeInteger(observedRaceReceipt.requested) &&
                    observedRaceReceipt.requested >= 0 &&
                    observedRaceReceipt.requested <= 64
                      ? observedRaceReceipt.requested
                      : null,
                  actualOpened:
                    Number.isSafeInteger(observedRaceReceipt.actualOpened) &&
                    observedRaceReceipt.actualOpened >= 0 &&
                    observedRaceReceipt.actualOpened <= 64
                      ? observedRaceReceipt.actualOpened
                      : null,
                  completed:
                    Number.isSafeInteger(observedRaceReceipt.completed) &&
                    observedRaceReceipt.completed >= 0 &&
                    observedRaceReceipt.completed <= 64
                      ? observedRaceReceipt.completed
                      : null,
                  observerFault:
                    typeof observedRaceReceipt.observerFault === "boolean"
                      ? observedRaceReceipt.observerFault
                      : null,
                },
        })}\n`,
      );
    });
    const first = await f.account("first-owner@p5d.fixture.test");
    const second = await f.account("second-owner@p5d.fixture.test");
    const workspace = await createWorkspace(f.first, first.token, {
      name: "競合後も存続するスペース",
      description: "",
    });
    const noteId = f.first.idGenerator.next();
    await f.first.unitOfWorkProvider.run(async (u) => {
      await u.workspaces.join(
        workspace.id,
        second.account.id,
        "owner",
        f.first.clock.now(),
      );
      await u.notes.insert(
        createNote(
          {
            id: noteId,
            accountId: first.account.id,
            owner: { kind: "workspace", workspaceId: workspace.id },
            title: "存続する本文",
            html: "<p>二owner退会競合でも残す本文</p>",
            text: "二owner退会競合でも残す本文",
          },
          f.first.clock.now(),
        ),
      );
    });
    const snapshot = await f.first.unitOfWorkProvider.run(async (u) => ({
      note: await u.notes.findById(noteId),
      workspace: await u.workspaces.find(workspace.id),
      owners: await u.workspaces.ownerCount(workspace.id),
    }));
    expect(snapshot.note).not.toBeNull();
    expect(snapshot.owners).toBe(2);
    const revisionBefore = (
      await f.client.execute({
        sql: "select membership_revision from workspaces where id=?",
        args: [workspace.id],
      })
    ).rows[0]?.membership_revision;
    if (typeof revisionBefore !== "number")
      throw new Error("Missing workspace revision");
    checkpoint = "race";
    f.beginRace();
    const start = Promise.resolve();
    let settled = 0;
    let overlappingCallers = false;
    let calls = 0;
    const retire = (container: typeof f.first, account: typeof first) =>
      start.then(() => {
        calls++;
        if (calls === 2 && settled === 0) overlappingCallers = true;
        const original = deleteAccount(container, account.token, {
          email: account.account.email,
        });
        void original.then(
          () => {
            settled++;
          },
          () => {
            settled++;
          },
        );
        return original;
      });
    const results = await Promise.allSettled([
      retire(f.first, first),
      retire(f.second, second),
    ]);
    const receipt = await f.endRace();
    observedRaceReceipt = receipt;
    checkpoint = "RACE_CALLER_OVERLAP";
    expect(overlappingCallers).toBe(true);
    checkpoint = "RACE_TRANSACTION_RECEIPT";
    expect(receipt).toMatchObject({
      overlappingRequests: true,
      requested: 2,
      completed: 2,
      observerFault: false,
    });
    const winners = results.flatMap((result, index) =>
      result.status === "fulfilled" ? [index] : [],
    );
    const losers = results.flatMap((result, index) =>
      result.status === "rejected" ? [index] : [],
    );
    checkpoint = "RACE_WINNER_COUNT";
    expect(winners).toHaveLength(1);
    checkpoint = "RACE_LOSER_COUNT";
    expect(losers).toHaveLength(1);
    const winnerIndex = winners[0];
    const loserIndex = losers[0];
    if (winnerIndex === undefined || loserIndex === undefined)
      throw new Error("P5D_OWNER_RACE_RESULT");
    const result = results[winnerIndex];
    const refusal = results[loserIndex];
    if (result?.status !== "fulfilled" || refusal?.status !== "rejected")
      throw new Error("P5D_OWNER_RACE_RESULT");
    checkpoint = "RACE_ACCEPTED";
    expect(result.value).toEqual({ status: "accepted" });
    checkpoint = "RACE_REFUSAL_CLASS";
    if (refusal.reason instanceof BusinessRuleError) {
      expect(refusal.reason.code).toBe("WORKSPACE_LAST_OWNER");
    } else {
      expect(refusal.reason).toMatchObject({ code: "DATABASE_ERROR" });
    }
    const accounts = [first, second];
    const winner = accounts[winnerIndex];
    const loser = accounts[loserIndex];
    if (!winner || !loser) throw new Error("P5D_OWNER_RACE_RESULT");
    checkpoint = "fence";
    expect(await currentUser(f.first, winner.token)).toBeNull();
    expect(await currentUser(f.second, loser.token)).toMatchObject({
      id: loser.account.id,
    });
    const afterRace = await f.first.unitOfWorkProvider.run(async (u) => ({
      winner: await u.accounts.identity(winner.account.id),
      loser: await u.accounts.identity(loser.account.id),
      winnerRole: await u.workspaces.role(workspace.id, winner.account.id),
      loserRole: await u.workspaces.role(workspace.id, loser.account.id),
      owners: await u.workspaces.ownerCount(workspace.id),
      workspace: await u.workspaces.find(workspace.id),
      note: await u.notes.findById(noteId),
    }));
    expect(afterRace.winner).toMatchObject({
      kind: "deleted",
      id: winner.account.id,
    });
    expect(afterRace.loser).toEqual({
      kind: "active",
      id: loser.account.id,
      authVersion: loser.account.authVersion,
    });
    expect(afterRace.winnerRole).toBeNull();
    expect(afterRace.loserRole).toBe("owner");
    expect(afterRace.owners).toBe(1);
    expect(workspaceState(afterRace.workspace)).toEqual(
      workspaceState(snapshot.workspace),
    );
    expect(
      (
        await f.client.execute({
          sql: "select membership_revision from workspaces where id=?",
          args: [workspace.id],
        })
      ).rows[0]?.membership_revision,
    ).toBe(revisionBefore + 1);
    expect(afterRace.note).toEqual(snapshot.note);
    const intent = await f.client.execute({
      sql: "select d.account_id,d.fence_auth_version,d.state,d.cursor_table,d.cursor_after_id,d.version,a.auth_version,a.deletion_id,d.id from account_deletions d join accounts a on a.id=d.account_id",
      args: [],
    });
    expect(intent.rows).toHaveLength(1);
    expect(intent.rows[0]).toMatchObject({
      account_id: winner.account.id,
      fence_auth_version: winner.account.authVersion + 1,
      auth_version: winner.account.authVersion + 1,
      state: "queued",
      cursor_table: "personal-notes",
      cursor_after_id: null,
      version: 1,
    });
    expect(intent.rows[0]?.deletion_id).toBe(intent.rows[0]?.id);
    if (!(refusal.reason instanceof BusinessRuleError)) {
      checkpoint = "RACE_EXPLICIT_RETRY";
      const before = await f.first.unitOfWorkProvider.run(async (u) => ({
        winner: await u.accounts.identity(winner.account.id),
        loser: await u.accounts.identity(loser.account.id),
        owners: await u.workspaces.ownerCount(workspace.id),
        note: await u.notes.findById(noteId),
        role: await u.workspaces.role(workspace.id, loser.account.id),
      }));
      const container = loserIndex === 0 ? f.first : f.second;
      await expect(
        deleteAccount(container, loser.token, { email: loser.account.email }),
      ).rejects.toMatchObject({ code: "WORKSPACE_LAST_OWNER" });
      expect(
        await f.first.unitOfWorkProvider.run(async (u) => ({
          winner: await u.accounts.identity(winner.account.id),
          loser: await u.accounts.identity(loser.account.id),
          owners: await u.workspaces.ownerCount(workspace.id),
          note: await u.notes.findById(noteId),
          role: await u.workspaces.role(workspace.id, loser.account.id),
        })),
      ).toEqual(before);
      const after = await f.client.execute(
        "select id,account_id,state,version from account_deletions",
      );
      expect(after.rows).toEqual(
        intent.rows.map((row) => ({
          id: row.id,
          account_id: row.account_id,
          state: row.state,
          version: row.version,
        })),
      );
    }
    checkpoint = "final";
    await f.guard();
    expect(f.counters().unitOfWorkCalls).toBeLessThanOrEqual(32);
    expect(f.counters().methods).toBeLessThanOrEqual(4096);
    expect(f.counters().statements).toBeLessThanOrEqual(4096);
  }, 40_000);
});

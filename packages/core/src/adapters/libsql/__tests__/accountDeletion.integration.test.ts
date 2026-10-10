import { deleteAccount } from "@repo/core/application/account/deletion";
import { sweepAccountDeletions } from "@repo/core/application/account/deletionWorker";
import { currentUser } from "@repo/core/application/account/session";
import { getNote } from "@repo/core/application/note/getNote";
import { leaveWorkspace } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createNote } from "@repo/core/domain/note/entity";
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

describe.sequential("P5d-A B C F account retirement", () => {
  let f: AccountDeletionFixture;
  let retiring: Awaited<ReturnType<AccountDeletionFixture["account"]>>;
  let survivor: typeof retiring;
  let lastOwner: typeof retiring;
  let workspaceId: string;
  let sharedNoteId: string;
  let personalNoteId: string;
  beforeAll(async () => {
    f = await createAccountDeletionFixture("application");
    retiring = await f.account("retiring@p5d.fixture.test");
    survivor = await f.account("survivor@p5d.fixture.test");
    lastOwner = await f.account("last-owner@p5d.fixture.test");
    workspaceId = (
      await createWorkspace(f.container, retiring.token, {
        name: "存続スペース",
        description: "",
      })
    ).id;
    await createWorkspace(f.container, lastOwner.token, {
      name: "最後のオーナー",
      description: "",
    });
    sharedNoteId = f.container.idGenerator.next();
    personalNoteId = f.container.idGenerator.next();
    await f.container.unitOfWorkProvider.run(async (u) => {
      await u.workspaces.join(
        workspaceId,
        survivor.account.id,
        "owner",
        f.container.clock.now(),
      );
      await u.notes.insert(
        createNote(
          {
            id: sharedNoteId,
            accountId: retiring.account.id,
            owner: { kind: "workspace", workspaceId },
            title: "保存する本文",
            html: "<p>存続本文</p>",
            text: "存続本文",
          },
          f.container.clock.now(),
        ),
      );
      await u.notes.insert(
        createNote(
          {
            id: personalNoteId,
            accountId: retiring.account.id,
            owner: { kind: "personal", accountId: retiring.account.id },
            title: "回収する個人本文",
            html: "<p>個人本文</p>",
            text: "個人本文",
          },
          f.container.clock.now(),
        ),
      );
      for (let i = 0; i < 51; i++)
        await u.accounts.saveVerification({
          tokenHash: f.container.tokens.hash(f.container.tokens.generate()),
          accountId: retiring.account.id,
          browserHash: f.container.tokens.hash(f.container.tokens.generate()),
          expiresAt: new Date(f.container.clock.now().getTime() + 60_000),
          consumedAt: null,
        });
    });
  }, 40_000);
  beforeEach(async () => {
    onTestFailed(() => f.fail());
    await f.guard();
  });
  afterEach(async () => {
    await f.guard();
  });
  afterAll(async () => {
    await f?.close();
  }, 40_000);

  it("A01 email mismatch creates neither intent nor fence", async () => {
    await expect(
      deleteAccount(f.container, retiring.token, {
        email: survivor.account.email,
      }),
    ).rejects.toMatchObject({ code: "ACCOUNT_DELETION_EMAIL" });
    expect(await currentUser(f.container, retiring.token)).toMatchObject({
      id: retiring.account.id,
    });
    expect(
      (await f.client.execute("select count(*) n from account_deletions"))
        .rows[0]?.n,
    ).toBe(0);
  });

  it("B01 rejects the last active workspace owner atomically", async () => {
    await expect(
      deleteAccount(f.container, lastOwner.token, {
        email: lastOwner.account.email,
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_LAST_OWNER" });
    expect(await currentUser(f.container, lastOwner.token)).toMatchObject({
      id: lastOwner.account.id,
    });
    expect(
      (await f.client.execute("select count(*) n from account_deletions"))
        .rows[0]?.n,
    ).toBe(0);
  });

  it("A04 retires a linked Drive connection with monotonic credential and epoch versions", async () => {
    const linkedActor = await f.account("linked-retiring@p5d.fixture.test");
    const linked = await f.container.unitOfWorkProvider.run(async (u) => {
      const old = await u.driveConnections.ensure(
        linkedActor.account.id,
        f.container.clock.now(),
      );
      const now = f.container.clock.now();
      const next = {
        ...old,
        state: "linked" as const,
        epoch: old.epoch + 1,
        version: old.version + 1,
        credentialVersion: old.credentialVersion + 1,
        settingsVersion: old.settingsVersion + 1,
        updatedAt: now,
        credential: {
          subject: "local-retirement-subject",
          email: null,
          envelope: "opaque-fixture-not-read",
          scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
          accessExpiresAt: new Date(now.getTime() + 3600000),
          connectedAt: now,
        },
      };
      if (!(await u.driveConnections.replace(next, old.version, "adopt")))
        throw new Error("Drive fixture adoption rejected");
      return next;
    });
    await deleteAccount(f.container, linkedActor.token, {
      email: linkedActor.account.email,
    });
    let done = false;
    for (let index = 0; index < 90; index++) {
      await sweepAccountDeletions(f.container);
      const row = (
        await f.client.execute({
          sql: "select state from account_deletions where account_id=?",
          args: [linkedActor.account.id],
        })
      ).rows[0];
      if (row?.state === "succeeded") {
        done = true;
        break;
      }
      f.advance();
    }
    expect(done).toBe(true);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.driveConnections.find(linkedActor.account.id),
      ),
    ).toMatchObject({
      state: "unlinked",
      credential: null,
      folder: null,
      autoBackup: false,
      epoch: linked.epoch + 1,
      version: linked.version + 1,
      credentialVersion: linked.credentialVersion + 1,
      settingsVersion: linked.settingsVersion + 1,
    });
    expect(
      (await f.client.execute("select count(*) n from account_deletion_debts"))
        .rows[0]?.n,
    ).toBe(0);
  });

  it("A02 accepts despite a post-commit notification throw and keeps current workspace ownership", async () => {
    f.container = {
      ...f.container,
      purging: {
        wake() {
          throw new Error("P5d injected notification failure");
        },
      },
    };
    expect(
      await deleteAccount(f.container, retiring.token, {
        email: retiring.account.email,
      }),
    ).toEqual({ status: "accepted" });
    expect(await currentUser(f.container, retiring.token)).toBeNull();
    expect(
      (await getNote(f.container, survivor.token, sharedNoteId)).creatorDisplay,
    ).toEqual({ kind: "label", label: "退会した利用者" });
    await f.container.unitOfWorkProvider.run(async (u) => {
      expect(await u.accounts.identity(retiring.account.id)).toMatchObject({
        kind: "deleted",
        id: retiring.account.id,
      });
      expect(await u.accounts.identity("p5d-missing-account")).toEqual({
        kind: "missing",
      });
      expect(
        await u.workspaces.role(workspaceId, retiring.account.id),
      ).toBeNull();
      expect(await u.workspaces.role(workspaceId, survivor.account.id)).toBe(
        "owner",
      );
      expect(await u.workspaces.ownerCount(workspaceId)).toBe(1);
      expect(await u.notes.findById(sharedNoteId)).toMatchObject({
        owner: { kind: "workspace", workspaceId },
        creator: { kind: "account", accountId: retiring.account.id },
        html: "<p>存続本文</p>",
      });
    });
  });

  it("B02 rejects direct demotion of the remaining owner", async () => {
    await expect(
      f.container.unitOfWorkProvider.run((u) =>
        u.workspaces.membership(workspaceId, survivor.account.id, "viewer"),
      ),
    ).rejects.toThrow();
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.workspaces.ownerCount(workspaceId),
      ),
    ).toBe(1);
  });

  it("A03 a reused email belongs to a new identity without reassigning old authorship", async () => {
    const next = await f.account(retiring.account.email);
    expect(next.account.id).not.toBe(retiring.account.id);
    expect(await currentUser(f.container, next.token)).toMatchObject({
      id: next.account.id,
    });
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(sharedNoteId),
      ),
    ).toMatchObject({
      creator: { kind: "account", accountId: retiring.account.id },
    });
    expect(
      (await getNote(f.container, survivor.token, sharedNoteId)).creatorDisplay,
    ).toEqual({ kind: "label", label: "退会した利用者" });
    const leftNoteId = f.container.idGenerator.next();
    await f.container.unitOfWorkProvider.run(async (u) => {
      await u.workspaces.join(
        workspaceId,
        next.account.id,
        "editor",
        f.container.clock.now(),
      );
      await u.notes.insert(
        createNote(
          {
            id: leftNoteId,
            accountId: next.account.id,
            owner: { kind: "workspace", workspaceId },
            title: "脱退済みcreatorの本文",
            html: "<p>残す</p>",
            text: "残す",
          },
          f.container.clock.now(),
        ),
      );
    });
    await leaveWorkspace(f.container, next.token, { workspaceId });
    expect(
      (await getNote(f.container, survivor.token, leftNoteId)).creatorDisplay,
    ).toEqual({ kind: "unavailable" });
  });

  it("F01 drains 51 history rows through pages bounded at 25 and verifies residual zero", async () => {
    let previous = 51;
    let finished = false;
    for (let turn = 0; turn < 64; turn++) {
      await sweepAccountDeletions(f.container);
      await f.container.unitOfWorkProvider.run(async (u) => {
        const now = f.container.clock.now();
        const token = f.container.tokens.generate();
        const purge = await u.purges.claim(
          now,
          token,
          new Date(now.getTime() + 60_000),
        );
        if (!purge) return;
        expect(purge.noteId).toBe(personalNoteId);
        expect(purge.cause).toBe("account-deletion");
        expect(await u.purges.objects(purge.id)).toEqual([]);
        expect(await u.purges.finish(purge.id, token, now)).toBe(true);
      });
      const remaining = Number(
        (
          await f.client.execute({
            sql: "select count(*) n from email_verifications where account_id=?",
            args: [retiring.account.id],
          })
        ).rows[0]?.n,
      );
      expect(previous - remaining).toBeGreaterThanOrEqual(0);
      expect(previous - remaining).toBeLessThanOrEqual(25);
      previous = remaining;
      const state = (
        await f.client.execute({
          sql: "select state from account_deletions where account_id=?",
          args: [retiring.account.id],
        })
      ).rows[0]?.state;
      if (state === "succeeded") {
        finished = true;
        break;
      }
      f.advance();
    }
    expect(finished).toBe(true);
    expect(previous).toBe(0);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(personalNoteId),
      ),
    ).toBeNull();
    expect(
      (await f.client.execute("select count(*) n from account_deletion_debts"))
        .rows[0]?.n,
    ).toBe(0);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(sharedNoteId),
      ),
    ).toMatchObject({ html: "<p>存続本文</p>" });
  }, 40_000);
});

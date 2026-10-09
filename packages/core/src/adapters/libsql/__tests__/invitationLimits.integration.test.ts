import { randomBytes } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Client } from "@libsql/client";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  beginInvitation,
  copyInvitation,
  getInvitationLanding,
  issueInvitations,
  joinInvitation,
  listInvitations,
} from "@repo/core/application/workspace/invitations";
import {
  changeWorkspaceMember,
  getWorkspaceSettings,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import { invitationRecipients } from "@repo/core/domain/workspace/invitation";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { invitationIssueSchema } from "../../../../../../apps/web/app/presentation/invitationInput";
import { NodeTokenProtector } from "../../node/tokenProtector";
import {
  applyPragmas,
  createLibsqlClient,
  type Database,
  getDatabase,
} from "../client";

type Actor = { id: string; token: string; email: string };
const recipients = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}@example.test`);

describe("invitation admission limits and bounded membership pages", () => {
  let directory: string;
  let client: Client;
  let db: Database;
  let c: HollowContainer;
  let now: Date;
  let owner: Actor;
  let workspaceId: string;

  const actor = (email: string) =>
    c.unitOfWorkProvider.run(async (context) => {
      const account = verifyAccount(
        createAccount(
          c.idGenerator.next(),
          email,
          "fixture-password-hash",
          now,
        ),
        now,
      );
      await context.accounts.save(account);
      const session = await issueSession(c, context.accounts, account);
      return { id: account.id, token: session.token, email };
    });

  const membership = (who: Actor, role: WorkspaceRole) =>
    c.unitOfWorkProvider.run((context) =>
      context.workspaces.join(workspaceId, who.id, role, now),
    );

  const issue = (
    who: Actor,
    emails: readonly string[],
    role: WorkspaceRole = "editor",
    targetWorkspace = workspaceId,
    ownerConfirmed = role === "owner",
  ) =>
    issueInvitations(c, who.token, {
      workspaceId: targetWorkspace,
      emails,
      role,
      ownerConfirmed,
      requestId: c.idGenerator.next(),
    });

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "hollow-invitation-limits-test-"));
    await chmod(directory, 0o700);
    const keyFile = join(directory, "fixture.key");
    await writeFile(keyFile, randomBytes(32), { mode: 0o600, flag: "wx" });
    client = createLibsqlClient({
      url: `file:${join(directory, "fixture.db")}`,
    });
    await applyPragmas(client);
    db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dirname, "../migrations"),
    });
    now = new Date("2026-09-10T09:00:00.000Z");
    c = {
      ...createHollowContainer(db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      invitationDelivery: {
        protector: await NodeTokenProtector.load(keyFile),
        mailer: { async send() {} },
        wake() {},
      },
    };
    owner = await actor("owner@example.test");
    workspaceId = (
      await createWorkspace(c, owner.token, {
        name: "Limits fixture",
        description: "",
      })
    ).id;
  });

  afterEach(async () => {
    client?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it.each([
    "owner",
    "editor",
    "viewer",
  ] as const)("accepts ten and atomically rejects eleven recipients for the %s role at domain, transport and application boundaries", async (role) => {
    const ten = recipients(role, 10);
    const eleven = recipients(`${role}-overflow`, 11);
    expect(invitationRecipients(ten)).toHaveLength(10);
    expect(() => invitationRecipients(eleven)).toThrowError(
      expect.objectContaining({ code: "INVITATION_RECIPIENTS" }),
    );
    const input = {
      workspaceId,
      emails: ten,
      role,
      ownerConfirmed: role === "owner",
      requestId: c.idGenerator.next(),
    };
    expect(invitationIssueSchema.safeParse(input).success).toBe(true);
    expect(
      invitationIssueSchema.safeParse({ ...input, emails: eleven }).success,
    ).toBe(false);
    expect((await issueInvitations(c, owner.token, input)).ids).toHaveLength(
      10,
    );
    await expect(issue(owner, eleven, role)).rejects.toMatchObject({
      code: "INVITATION_RECIPIENTS",
    });
    expect(
      (await listInvitations(c, owner.token, { workspaceId })).items,
    ).toHaveLength(10);
    expect(
      await c.unitOfWorkProvider.run((context) =>
        context.invitations.rate(workspaceId, owner.id, now),
      ),
    ).toEqual({ workspace: 10, actor: 10 });
  });

  it("requires owner confirmation independently from a valid role-shaped transport payload", async () => {
    const input = {
      workspaceId,
      emails: ["unconfirmed@example.test"],
      role: "owner" as const,
      ownerConfirmed: false,
      requestId: c.idGenerator.next(),
    };
    expect(invitationIssueSchema.safeParse(input).success).toBe(true);
    await expect(issueInvitations(c, owner.token, input)).rejects.toMatchObject(
      { code: "WORKSPACE_OWNER_CONFIRM" },
    );
    for (const role of ["admin", "", 1, null])
      expect(invitationIssueSchema.safeParse({ ...input, role }).success).toBe(
        false,
      );
    expect(
      (await listInvitations(c, owner.token, { workspaceId })).items,
    ).toHaveLength(0);
  });

  it("admits a workspace's hundredth delivery across independent actors but rejects delivery 101 without charging the fresh actor", async () => {
    const senders: Actor[] = [owner];
    for (let index = 1; index < 6; index++) {
      const sender = await actor(`owner${index}@example.test`);
      await membership(sender, "owner");
      senders.push(sender);
    }
    for (const [index, sender] of senders.slice(0, 5).entries()) {
      await issue(sender, recipients(`sender${index}-first-`, 10));
      await issue(sender, recipients(`sender${index}-second-`, 10));
    }
    const fresh = senders[5];
    if (!fresh) throw new Error("Missing fixture actor");
    expect(
      await c.unitOfWorkProvider.run((context) =>
        context.invitations.rate(workspaceId, fresh.id, now),
      ),
    ).toEqual({ workspace: 100, actor: 0 });
    await expect(
      issue(fresh, ["delivery101@example.test"]),
    ).rejects.toMatchObject({ code: "INVITATION_RATE" });
    expect(
      await c.unitOfWorkProvider.run((context) =>
        context.invitations.rate(workspaceId, fresh.id, now),
      ),
    ).toEqual({ workspace: 100, actor: 0 });
    expect(
      await db.all(
        sql`SELECT count(*) n FROM workspace_invitations WHERE workspace_id=${workspaceId}`,
      ),
    ).toEqual([{ n: 100 }]);
    const elsewhere = (
      await createWorkspace(c, fresh.token, {
        name: "Independent workspace",
        description: "",
      })
    ).id;
    expect(
      (await issue(fresh, ["independent@example.test"], "viewer", elsewhere))
        .ids,
    ).toHaveLength(1);
    now = new Date(now.getTime() + 86400_000 - 1);
    await expect(
      issue(fresh, ["still-full@example.test"]),
    ).rejects.toMatchObject({ code: "INVITATION_RATE" });
    now = new Date(now.getTime() + 1);
    expect(
      (await issue(fresh, ["window-expired@example.test"])).ids,
    ).toHaveLength(1);
  });

  it("shares an actor's twenty-send window across workspaces and reopens at exactly one hour", async () => {
    const other = (
      await createWorkspace(c, owner.token, {
        name: "Actor second workspace",
        description: "",
      })
    ).id;
    await issue(owner, recipients("first-space-", 10));
    await issue(owner, recipients("second-space-", 10), "editor", other);
    const input = {
      workspaceId: other,
      emails: ["actor21@example.test"],
      role: "editor" as const,
      ownerConfirmed: false,
      requestId: c.idGenerator.next(),
    };
    await expect(issueInvitations(c, owner.token, input)).rejects.toMatchObject(
      { code: "INVITATION_RATE" },
    );
    now = new Date(now.getTime() + 3600_000 - 1);
    await expect(issueInvitations(c, owner.token, input)).rejects.toMatchObject(
      { code: "INVITATION_RATE" },
    );
    now = new Date(now.getTime() + 1);
    expect((await issueInvitations(c, owner.token, input)).ids).toHaveLength(1);
    expect(
      await c.unitOfWorkProvider.run((context) =>
        context.invitations.rate(other, owner.id, now),
      ),
    ).toEqual({ workspace: 11, actor: 1 });
  });

  it("serializes concurrent 100th and 101st admissions from different owners", async () => {
    const senders: Actor[] = [owner];
    for (let index = 1; index < 7; index++) {
      const sender = await actor(`racing-owner${index}@example.test`);
      await membership(sender, "owner");
      senders.push(sender);
    }
    for (const [index, sender] of senders.slice(0, 5).entries()) {
      await issue(sender, recipients(`race${index}-a-`, 10));
      await issue(sender, recipients(`race${index}-b-`, index === 4 ? 9 : 10));
    }
    const contenders = senders.slice(5);
    const results = await Promise.allSettled(
      contenders.map((sender, index) =>
        issue(sender, [`last-seat${index}@example.test`]),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({
      code: "INVITATION_RATE",
    });
    expect(
      await db.all(
        sql`SELECT count(*) n FROM workspace_invitations WHERE workspace_id=${workspaceId}`,
      ),
    ).toEqual([{ n: 100 }]);
  });

  it("reaches all 51 same-clock invites and all 51 same-clock members with distinct bounded pages", async () => {
    const accounts: Actor[] = [owner];
    for (let index = 0; index < 50; index++) {
      const member = await actor(`page-member${index}@example.test`);
      await membership(member, index < 2 ? "owner" : "viewer");
      accounts.push(member);
    }
    const senders = accounts.slice(0, 3);
    const issued: string[] = [];
    for (const [index, sender] of senders.entries()) {
      issued.push(
        ...(await issue(sender, recipients(`page-invite${index}-a-`, 10))).ids,
      );
      issued.push(
        ...(
          await issue(
            sender,
            recipients(`page-invite${index}-b-`, index === 2 ? 1 : 10),
          )
        ).ids,
      );
    }
    const first = await listInvitations(c, owner.token, { workspaceId });
    expect(first.items).toHaveLength(50);
    if (!first.nextCursor) throw new Error("Missing invitation page cursor");
    const second = await listInvitations(c, owner.token, {
      workspaceId,
      cursor: first.nextCursor,
    });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const combined = [...first.items, ...second.items];
    expect(new Set(combined.map((row) => row.id)).size).toBe(51);
    expect(combined.map((row) => row.id).sort()).toEqual(issued.sort());
    expect(
      combined.every(
        (row) => row.issuedAt === now.toISOString() && row.state === "pending",
      ),
    ).toBe(true);
    const memberFirst = await getWorkspaceSettings(c, owner.token, {
      workspaceId,
    });
    expect(memberFirst.members).toHaveLength(50);
    if (!memberFirst.nextCursor) throw new Error("Missing member page cursor");
    const memberSecond = await getWorkspaceSettings(c, owner.token, {
      workspaceId,
      cursor: memberFirst.nextCursor,
    });
    expect(memberSecond.members).toHaveLength(1);
    expect(memberSecond.nextCursor).toBeNull();
    const members = [...memberFirst.members, ...memberSecond.members];
    expect(new Set(members.map((row) => row.accountId)).size).toBe(51);
    expect(members.map((row) => row.accountId).sort()).toEqual(
      accounts.map((row) => row.id).sort(),
    );
    expect(
      members.every(
        (row) => row.joinedAt === now.toISOString() && row.displayName === null,
      ),
    ).toBe(true);
    expect(memberSecond.ownerCount).toBe(3);
    const viewer = accounts.at(-1);
    if (!viewer) throw new Error("Missing fixture viewer");
    expect(
      (await getWorkspaceSettings(c, viewer.token, { workspaceId })).members,
    ).toHaveLength(50);
    await expect(
      listInvitations(c, viewer.token, { workspaceId }),
    ).rejects.toMatchObject({ code: "WORKSPACE_OWNER_REQUIRED" });
  });

  it("consumes an existing member's invitation without changing their role or original join date", async () => {
    const member = await actor("existing-member@example.test");
    await membership(member, "viewer");
    const joinedAt = now.toISOString();
    const result = await issue(
      owner,
      ["a-different-address@example.test"],
      "owner",
    );
    const id = result.ids[0];
    if (!id) throw new Error("Missing invitation ID");
    const copied = await copyInvitation(c, owner.token, {
      workspaceId,
      id,
      generation: 1,
    });
    const raw = new URL(copied.url).searchParams.get("token");
    if (!raw) throw new Error("Missing fixture invitation token");
    const browserToken = c.tokens.generate();
    const continuation = await beginInvitation(c, raw, browserToken);
    const input = {
      continuationId: continuation.id,
      browserToken,
      confirmDifferentEmail: true,
    };
    expect((await getInvitationLanding(c, member.token, input)).status).toBe(
      "pending",
    );
    now = new Date(now.getTime() + 1000);
    await joinInvitation(c, member.token, input);
    await joinInvitation(c, member.token, input);
    const settings = await getWorkspaceSettings(c, member.token, {
      workspaceId,
    });
    expect(
      settings.members.find((row) => row.accountId === member.id),
    ).toMatchObject({ role: "viewer", joinedAt });
    expect(
      await c.unitOfWorkProvider.run((context) => context.invitations.find(id)),
    ).toMatchObject({
      state: "accepted",
      acceptedBy: member.id,
      envelope: null,
      tokenHash: null,
    });
    expect((await getInvitationLanding(c, member.token, input)).status).toBe(
      "joined",
    );
  });

  it("keeps a target actor's conversion and reference leases through same-role and owner-to-editor changes", async () => {
    const member = await actor("editing-owner@example.test");
    await membership(member, "owner");
    const pendingInvite = (
      await issue(member, ["pending-owner-invite@example.test"])
    ).ids[0];
    const { note } = await saveNote(c, member.token, {
      workspaceId,
      title: "Keep edit capability",
      html: "<p>Unchanged</p>",
    });
    const batchId = c.idGenerator.next();
    const originalId = c.idGenerator.next();
    const conversionId = c.idGenerator.next();
    const referenceId = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (context) => {
      await context.imports.insertBatch({
        requestedVisibility: "private",
        id: batchId,
        workspaceId,
        accountId: member.id,
        createdAt: now,
        useAi: false,
        cancelledAt: null,
      });
      await context.imports.insertOriginal({
        id: originalId,
        noteId: note.id,
        accountId: member.id,
        name: "fixture.txt",
        bytes: 1,
        storageKey: originalId,
        sha256: "0".repeat(64),
        format: "text",
        state: "processing",
        coverage: "complete",
        activeJobId: conversionId,
        createdAt: now,
      });
      await context.jobs.insert({
        id: conversionId,
        noteId: note.id,
        originalId,
        accountId: member.id,
        batchId,
        noteVersion: 0,
        createdAt: now,
        updatedAt: now,
        useAi: false,
        attempt: 1,
        retryOf: null,
        state: "running",
        leaseToken: "fixture-conversion-lease",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      });
      await context.references.insertJob({
        id: referenceId,
        noteId: note.id,
        noteVersion: 0,
        accountId: member.id,
        createdAt: now,
        updatedAt: now,
        attempt: 1,
        retryOf: null,
        total: 1,
        completed: 0,
        cancelRequested: false,
        state: "running",
        leaseToken: "fixture-reference-lease",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      });
      await context.references.saveSettings({
        noteId: note.id,
        enabled: true,
        activeJobId: referenceId,
        bundleId: null,
        sourcePath: null,
      });
    });
    const before = await db.all(sql`SELECT * FROM notes WHERE id=${note.id}`);
    for (const [expectedRole, role] of [
      ["owner", "owner"],
      ["owner", "editor"],
      ["editor", "editor"],
    ] as const) {
      await changeWorkspaceMember(c, owner.token, {
        workspaceId,
        accountId: member.id,
        expectedRole,
        role,
        ownerConfirmed: role === "owner",
      });
      await c.unitOfWorkProvider.run(async (context) => {
        expect(await context.jobs.find(conversionId)).toMatchObject({
          state: "running",
          leaseToken: "fixture-conversion-lease",
        });
        expect(await context.references.job(referenceId)).toMatchObject({
          state: "running",
          leaseToken: "fixture-reference-lease",
          cancelRequested: false,
        });
        expect(await context.imports.findOriginal(originalId)).toMatchObject({
          state: "processing",
          activeJobId: conversionId,
        });
        expect(await context.references.settings(note.id)).toMatchObject({
          activeJobId: referenceId,
        });
      });
      expect(
        await db.all(sql`SELECT * FROM notes WHERE id=${note.id}`),
      ).toEqual(before);
    }
    if (!pendingInvite) throw new Error("Missing pending fixture invitation");
    expect(
      await c.unitOfWorkProvider.run((context) =>
        context.invitations.find(pendingInvite),
      ),
    ).toMatchObject({ state: "issuer_lost", envelope: null });
    await c.unitOfWorkProvider.run(async (context) => {
      expect(
        await context.jobs.finish(
          conversionId,
          "fixture-conversion-lease",
          now,
          "succeeded",
        ),
      ).toBe(true);
      expect(
        await context.references.finish(
          referenceId,
          "fixture-reference-lease",
          now,
          "succeeded",
        ),
      ).toBe(true);
    });
  });
});

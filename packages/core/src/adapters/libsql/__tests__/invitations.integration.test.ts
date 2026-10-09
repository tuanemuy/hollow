import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setDisplayName } from "@repo/core/application/account/displayName";
import { issueSession } from "@repo/core/application/account/session";
import { signUp } from "@repo/core/application/account/signUp";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { controlReference } from "@repo/core/application/reference/read";
import { processOutboxEvents } from "@repo/core/application/workers/eventRelayWorker";
import { deliverOneInvitation } from "@repo/core/application/workspace/delivery";
import {
  beginInvitation,
  cancelInvitation,
  copyInvitation,
  declineInvitation,
  getInvitationLanding,
  issueInvitations,
  joinInvitation,
  resendInvitation,
} from "@repo/core/application/workspace/invitations";
import {
  changeWorkspaceMember,
  getWorkspaceSettings,
  leaveWorkspace,
  updateWorkspaceSettings,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { LocalInvitationMailer } from "../../node/invitationMailer";
import { FileObjectStorage } from "../../node/objectStorage";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { NodeTokenProtector } from "../../node/tokenProtector";
import { createTestContainer, type TestContainer } from "./helpers";

describe("workspace invitation lifecycle and current membership", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let now: Date;
  let a: { id: string; token: string };
  let b: { id: string; token: string };
  let w: string;
  let deliveries: number;
  let fail: boolean;
  let configuration: boolean;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(join(tmpdir(), "hollow-invite-test-"));
    await writeFile(join(dir, "key"), randomBytes(32), { mode: 0o600 });
    now = new Date("2026-09-10T09:00:00Z");
    deliveries = 0;
    fail = false;
    configuration = false;
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      passwordHasher: {
        async hash() {
          return "test-hash";
        },
        async verify() {
          return true;
        },
      },
      invitationDelivery: {
        protector: await NodeTokenProtector.load(join(dir, "key")),
        mailer: {
          async send() {
            if (configuration)
              throw new BusinessRuleError(
                "INVITATION_DELIVERY_CONFIGURATION",
                "config",
              );
            deliveries++;
            if (fail) throw Error("test-only failure");
          },
        },
        wake() {},
      },
    };
    const user = async (email: string) =>
      c.unitOfWorkProvider.run(async (x) => {
        const account = verifyAccount(
          createAccount(c.idGenerator.next(), email, "test-hash", now),
          now,
        );
        await x.accounts.save(account);
        const session = await issueSession(c, x.accounts, account);
        return { id: account.id, token: session.token };
      });
    a = await user("a@example.test");
    b = await user("b@example.test");
    w = (
      await createWorkspace(c, a.token, { name: "Members", description: "" })
    ).id;
  });
  afterEach(async () => {
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const issue = async (
    email = "b@example.test",
    role: "owner" | "editor" | "viewer" = "editor",
  ) => {
    const input = {
      workspaceId: w,
      emails: [email],
      role,
      ownerConfirmed: true,
      requestId: c.idGenerator.next(),
    };
    const r = await issueInvitations(c, a.token, input);
    const id = r.ids[0];
    if (!id) throw Error("id");
    const generation = (
      await c.unitOfWorkProvider.run((x) => x.invitations.find(id))
    )?.generation;
    if (!generation) throw Error("generation");
    const url = await copyInvitation(c, a.token, {
      workspaceId: w,
      id,
      generation,
    });
    const token = new URL(url.url).searchParams.get("token") ?? "";
    const browserToken = c.tokens.generate();
    const continuation = await beginInvitation(c, token, browserToken);
    return { input, id, token, continuationId: continuation.id, browserToken };
  };
  it.each([
    false,
    true,
  ])("rejoined editor never adopts old held reference success/failure=%s; new job succeeds", async (fail) => {
    const invitation = await issue();
    await joinInvitation(c, b.token, {
      ...invitation,
      confirmDifferentEmail: false,
    });
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((r) => {
      enter = r;
    });
    const held = new Promise<void>((r) => {
      release = r;
    });
    let first = true;
    c = {
      ...c,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage: new FileObjectStorage(dir),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: true, reason: null };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
          async fetch(url) {
            if (first) {
              first = false;
              enter();
              await held;
              if (fail)
                throw new BusinessRuleError(
                  "REFERENCE_FETCH",
                  "held fixture failure",
                );
            }
            return {
              finalUrl: url,
              contentType: "text/css",
              body: new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode("p{color:blue}"));
                  controller.close();
                },
              }),
            };
          },
        },
        wake() {},
      },
    };
    const note = (
      await saveNote(c, b.token, {
        workspaceId: w,
        title: "held",
        html: '<p>safe</p><link rel="stylesheet" href="https://public.example/a.css">',
      })
    ).note;
    const claim = () =>
      c.unitOfWorkProvider.run((x) =>
        x.references.claim(
          now,
          c.tokens.generate(),
          new Date(now.getTime() + 60_000),
        ),
      );
    const old = await claim();
    if (old?.state !== "running") throw Error("reference job");
    const pending = runReferenceJob(c, old, new AbortController().signal);
    await Promise.race([
      entered,
      pending.then(() => {
        throw Error("worker finished before fixture fetch");
      }),
    ]);
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "editor",
      role: null,
      ownerConfirmed: false,
    });
    now = new Date(now.getTime() + 61_000);
    const rejoin = await issue();
    await joinInvitation(c, b.token, {
      ...rejoin,
      confirmDifferentEmail: false,
    });
    const before = await c.unitOfWorkProvider.run(async (x) => ({
      note: await x.notes.findById(note.id),
      revisions: await x.revisions.list(note.id),
    }));
    release();
    await pending;
    expect(
      await c.unitOfWorkProvider.run(async (x) => ({
        note: await x.notes.findById(note.id),
        revisions: await x.revisions.list(note.id),
      })),
    ).toEqual(before);
    expect(
      await c.unitOfWorkProvider.run((x) => x.references.job(old.id)),
    ).toMatchObject({ state: "cancelled", failure: null });
    await controlReference(c, b.token, { noteId: note.id, action: "on" });
    const next = await claim();
    if (next?.state !== "running") throw Error("new reference job");
    expect(next.id).not.toBe(old.id);
    await runReferenceJob(c, next, new AbortController().signal);
    expect(
      await c.unitOfWorkProvider.run((x) => x.references.job(next.id)),
    ).toMatchObject({ state: "succeeded" });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(note.id)))?.html,
    ).toContain("color:blue");
  });
  it("owner admission is idempotent; ordinary GET never joins; consume response loss is recoverable", async () => {
    const i = await issue();
    expect((await issueInvitations(c, a.token, i.input)).ids).toEqual([i.id]);
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.role(w, b.id)),
    ).toBeNull();
    expect((await getInvitationLanding(c, b.token, i)).status).toBe("pending");
    await joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false });
    await joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false });
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.role(w, b.id)),
    ).toBe("editor");
    const row = await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id));
    expect(row?.envelope).toBeNull();
    expect(row?.tokenHash).toBeNull();
    await leaveWorkspace(c, b.token, { workspaceId: w });
    await expect(
      joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false }),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
  });
  it("displayed selectors reject another tab's continuation for join, decline and new signup", async () => {
    const first = await issue();
    const second = await issue("new-selection@example.test", "viewer");
    const wrong = {
      ...second,
      expected: { id: first.id, generation: 1 },
      confirmDifferentEmail: true,
    };
    await expect(joinInvitation(c, b.token, wrong)).rejects.toMatchObject({
      code: "INVITATION_SELECTION_CHANGED",
    });
    await expect(declineInvitation(c, b.token, wrong)).rejects.toMatchObject({
      code: "INVITATION_SELECTION_CHANGED",
    });
    await expect(
      signUp(
        c,
        {
          email: "new-selection@example.test",
          password: "valid-password-123",
          termsAccepted: true,
        },
        wrong,
      ),
    ).rejects.toMatchObject({ code: "INVITATION_SELECTION_CHANGED" });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.accounts.findByEmail("new-selection@example.test"),
      ),
    ).toBeNull();
    for (const id of [first.id, second.id])
      expect(
        await c.unitOfWorkProvider.run((x) => x.invitations.find(id)),
      ).toMatchObject({ state: "pending" });
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.role(w, b.id)),
    ).toBeNull();
    await joinInvitation(c, b.token, {
      ...second,
      expected: { id: second.id, generation: 1 },
      confirmDifferentEmail: true,
    });
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.role(w, b.id)),
    ).toBe("viewer");
    await expect(
      declineInvitation(c, b.token, {
        ...first,
        expected: { id: first.id, generation: 2 },
      }),
    ).rejects.toMatchObject({ code: "INVITATION_SELECTION_CHANGED" });
    await declineInvitation(c, b.token, {
      ...first,
      expected: { id: first.id, generation: 1 },
    });
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(first.id)),
    ).toMatchObject({ state: "declined", tokenHash: null });
  });
  it("normalizes duplicate recipients, excludes members, and atomically rejects rate overflow", async () => {
    const input = {
      workspaceId: w,
      emails: [" B@EXAMPLE.TEST ", "b@example.test", "a@example.test"],
      role: "viewer" as const,
      ownerConfirmed: false,
      requestId: c.idGenerator.next(),
    };
    expect(await issueInvitations(c, a.token, input)).toMatchObject({
      skipped: 1,
      ids: expect.any(Array),
    });
    for (let j = 0; j < 19; j++)
      await issueInvitations(c, a.token, {
        ...input,
        emails: [`user${j}@example.test`],
        requestId: c.idGenerator.next(),
      });
    await expect(
      issueInvitations(c, a.token, {
        ...input,
        emails: ["overflow@example.test"],
        requestId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "INVITATION_RATE" });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.rate(w, a.id, now)))
        .actor,
    ).toBe(20);
  });
  it("resend invalidates prior generation and does not slide continuation", async () => {
    const i = await issue();
    const old = await c.unitOfWorkProvider.run((x) =>
      x.invitations.continuation(i.continuationId),
    );
    now = new Date(now.getTime() + 61_000);
    expect(
      (await beginInvitation(c, i.token, i.browserToken, i.continuationId))
        .expiresAt,
    ).toEqual(old?.expiresAt);
    await resendInvitation(c, a.token, {
      workspaceId: w,
      id: i.id,
      requestId: c.idGenerator.next(),
      ownerConfirmed: false,
    });
    await expect(
      beginInvitation(c, i.token, i.browserToken),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await expect(
      joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false }),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
  });
  it("issuer owner-loss is irreversible; owner to editor retains note edit membership", async () => {
    const owner = await issue("b@example.test", "owner");
    await joinInvitation(c, b.token, {
      ...owner,
      confirmDifferentEmail: false,
    });
    const pending = await issue("pending@example.test");
    await changeWorkspaceMember(c, b.token, {
      workspaceId: w,
      accountId: a.id,
      role: "editor",
      expectedRole: "owner",
      ownerConfirmed: false,
    });
    await changeWorkspaceMember(c, b.token, {
      workspaceId: w,
      accountId: a.id,
      role: "owner",
      expectedRole: "editor",
      ownerConfirmed: true,
    });
    await expect(
      beginInvitation(c, pending.token, pending.browserToken),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.find(pending.id)))
        ?.state,
    ).toBe("issuer_lost");
  });
  it("two owner concurrent leave cannot remove last owner; self role denied", async () => {
    const i = await issue("b@example.test", "owner");
    await joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false });
    const results = await Promise.allSettled([
      leaveWorkspace(c, a.token, { workspaceId: w }),
      leaveWorkspace(c, b.token, { workspaceId: w }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.ownerCount(w)),
    ).toBe(1);
  });
  it("same email NEW signup verified+session, still not member; existing account never token login", async () => {
    const i = await issue("new@example.test");
    const r = await signUp(
      c,
      {
        email: "new@example.test",
        password: "test-password-123",
        termsAccepted: true,
      },
      i,
    );
    expect(r.session).toBeDefined();
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.role(w, r.session?.user.id ?? ""),
      ),
    ).toBeNull();
    now = new Date(now.getTime() + 61_000);
    const again = await signUp(
      c,
      {
        email: "new@example.test",
        password: "test-password-123",
        termsAccepted: true,
      },
      i,
    );
    expect(again.session).toBeUndefined();
  });
  it("different email signup remains unverified and cancelled-in-hash cannot create account", async () => {
    const i = await issue("new@example.test");
    const r = await signUp(
      c,
      {
        email: "different@example.test",
        password: "test-password-123",
        termsAccepted: true,
      },
      i,
    );
    expect(r.session).toBeUndefined();
    const c2 = {
      ...c,
      passwordHasher: {
        ...c.passwordHasher,
        async hash() {
          await cancelInvitation(c, a.token, {
            workspaceId: w,
            id: i.id,
            generation: 1,
          });
          return "hash";
        },
      },
    };
    await expect(
      signUp(
        c2,
        {
          email: "new@example.test",
          password: "test-password-123",
          termsAccepted: true,
        },
        i,
      ),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.accounts.findByEmail("new@example.test"),
      ),
    ).toBeNull();
  });
  it("browser binding, expiry boundary and explicit different-email confirmation", async () => {
    const i = await issue("someone@example.test");
    await expect(
      joinInvitation(c, b.token, {
        ...i,
        browserToken: "wrong",
        confirmDifferentEmail: true,
      }),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await expect(
      joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false }),
    ).rejects.toMatchObject({ code: "INVITATION_EMAIL_CONFIRM" });
    await joinInvitation(c, b.token, { ...i, confirmDifferentEmail: true });
  });
  it("settings expected version, same-value no op and unknown member join date", async () => {
    await setDisplayName(c, a.token, {
      value: "ワークスペース作成者😀",
      expectedVersion: 0,
    });
    await saveNote(c, a.token, {
      workspaceId: w,
      title: "Untouched",
      html: "<p>Settings do not edit notes</p>",
    });
    const oldNotes = JSON.stringify(
      (await base.client.execute("select * from notes")).rows,
    );
    const oldRevisions = JSON.stringify(
      (await base.client.execute("select * from note_revisions")).rows,
    );
    const before = await getWorkspaceSettings(c, a.token, { workspaceId: w });
    expect(before.members[0]?.joinedAt).toBe(now.toISOString());
    expect(before.members[0]?.displayName).toBe("ワークスペース作成者😀");
    await updateWorkspaceSettings(c, a.token, {
      workspaceId: w,
      settingsVersion: 0,
      name: "Renamed",
      description: "new",
    });
    await expect(
      updateWorkspaceSettings(c, a.token, {
        workspaceId: w,
        settingsVersion: 0,
        name: "Stale",
        description: "",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_SETTINGS_CHANGED" });
    await expect(
      updateWorkspaceSettings(c, b.token, {
        workspaceId: w,
        settingsVersion: 1,
        name: "No",
        description: "",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_OWNER_REQUIRED" });
    await updateWorkspaceSettings(c, a.token, {
      workspaceId: w,
      settingsVersion: 1,
      name: "Renamed",
      description: "new",
    });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w }))
        .settingsVersion,
    ).toBe(1);
    await createWorkspace(c, a.token, {
      name: "Other",
      description: "",
      slug: "taken-settings",
    });
    await expect(
      updateWorkspaceSettings(c, a.token, {
        workspaceId: w,
        settingsVersion: 1,
        name: "Collision",
        description: "",
        slug: "taken-settings",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_SLUG_TAKEN" });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w })).name,
    ).toBe("Renamed");
    await base.client.execute({
      sql: "insert into workspace_members (workspace_id,account_id,role,joined_at) values (?,?,'viewer',null)",
      args: [w, b.id],
    });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w })).members.find(
        (m) => m.accountId === b.id,
      )?.joinedAt,
    ).toBeNull();
    expect(
      JSON.stringify((await base.client.execute("select * from notes")).rows),
    ).toBe(oldNotes);
    expect(
      JSON.stringify(
        (await base.client.execute("select * from note_revisions")).rows,
      ),
    ).toBe(oldRevisions);
  });
  it("six finite I/O attempts backoff from prior failure, no rate refund", async () => {
    const i = await issue();
    fail = true;
    const delays = [60_000, 300_000, 900_000, 3600_000, 14400_000];
    for (let n = 0; n < 6; n++) {
      expect(await deliverOneInvitation(c)).toBe(true);
      const row = await c.unitOfWorkProvider.run((x) =>
        x.invitations.find(i.id),
      );
      expect(row?.attempts).toBe(n + 1);
      if (n < 5) {
        expect(row?.nextAttemptAt.getTime()).toBe(now.getTime() + delays[n]);
        expect(await deliverOneInvitation(c)).toBe(false);
        now = row?.nextAttemptAt ?? now;
      }
    }
    expect(deliveries).toBe(6);
    expect(await deliverOneInvitation(c)).toBe(false);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.rate(w, a.id, now)))
        .workspace,
    ).toBe(1);
  });
  it("configuration waiting spends no attempt, key absence cannot issue but cancel remains", async () => {
    const i = await issue();
    configuration = true;
    await deliverOneInvitation(c);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)))
        ?.attempts,
    ).toBe(0);
    const missing = {
      ...c,
      invitationDelivery: {
        ...c.invitationDelivery!,
        protector: await NodeTokenProtector.load(undefined),
      },
    };
    await expect(
      issueInvitations(missing, a.token, {
        workspaceId: w,
        emails: ["other@example.test"],
        role: "editor",
        ownerConfirmed: false,
        requestId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "INVITATION_KEY_UNAVAILABLE" });
    await cancelInvitation(missing, a.token, {
      workspaceId: w,
      id: i.id,
      generation: 1,
    });
    expect(deliveries).toBe(0);
  });
  it("protector AAD binding and wrong key rejects; successful delivery not repeated", async () => {
    const i = await issue();
    const row = await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id));
    expect(() =>
      c.invitationDelivery?.protector.reveal(row?.envelope ?? "", {
        invitationId: i.id,
        generation: 2,
      }),
    ).toThrow();
    await deliverOneInvitation(c);
    await deliverOneInvitation(c);
    expect(deliveries).toBe(1);
    expect(
      (
        await base.db.all(
          sql`select token_hash,envelope from workspace_invitations`,
        )
      ).length,
    ).toBe(1);
  });
  it("membership loss does not undo an already irreversible purge", async () => {
    const storage = new CoordinatedObjectStorage(
      join(dir, "purge"),
      c.unitOfWorkProvider,
      c.clock,
    );
    c = {
      ...c,
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    const invite = await issue();
    await joinInvitation(c, b.token, {
      ...invite,
      confirmDifferentEmail: false,
    });
    const { note } = await saveNote(c, b.token, {
      workspaceId: w,
      title: "Already fenced",
      html: "<p>Small isolated fixture</p>",
    });
    const trash = await trashNote(c, b.token, {
      id: note.id,
      version: note.version,
      cancelProcessing: false,
    });
    const purge = await requestNotePurge(c, b.token, trash);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(note.id)))
        ?.lifecycle.kind,
    ).toBe("purging");
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "editor",
      role: null,
      ownerConfirmed: false,
    });
    await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.notes.findById(note.id)),
    ).toBeNull();
    expect(
      (await c.unitOfWorkProvider.run((x) => x.purges.find(purge.id)))?.state,
    ).toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((x) => x.workspaces.role(w, b.id)),
    ).toBeNull();
  });
  it("edit loss fences only target actor jobs, preserves content and retained revision; rejoin cannot revive", async () => {
    const invite = await issue();
    await joinInvitation(c, b.token, {
      ...invite,
      confirmDifferentEmail: false,
    });
    const { note } = await saveNote(c, b.token, {
      workspaceId: w,
      title: "Keep",
      html: "<p>Original</p>",
    });
    const originalId = c.idGenerator.next();
    const jobId = c.idGenerator.next();
    const batchId = c.idGenerator.next();
    const refId = c.idGenerator.next();
    const otherRef = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (x) => {
      await x.imports.insertBatch({
        id: batchId,
        workspaceId: w,
        accountId: b.id,
        createdAt: now,
        useAi: false,
        cancelledAt: null,
      });
      await x.imports.insertOriginal({
        id: originalId,
        noteId: note.id,
        accountId: b.id,
        name: "own.txt",
        bytes: 7,
        storageKey: originalId,
        sha256: "0".repeat(64),
        format: "text",
        state: "processing",
        coverage: "complete",
        activeJobId: jobId,
        createdAt: now,
      });
      await x.jobs.insert({
        id: jobId,
        noteId: note.id,
        originalId,
        accountId: b.id,
        batchId,
        noteVersion: 0,
        createdAt: now,
        updatedAt: now,
        useAi: false,
        attempt: 1,
        retryOf: null,
        state: "running",
        leaseToken: "held",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      });
      const common = {
        noteId: note.id,
        noteVersion: 0,
        createdAt: now,
        updatedAt: now,
        attempt: 1,
        retryOf: null,
        total: 1,
        completed: 0,
        cancelRequested: false,
        state: "running" as const,
        leaseToken: "held",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      };
      await x.references.insertJob({ ...common, id: refId, accountId: b.id });
      await x.references.insertJob({
        ...common,
        id: otherRef,
        accountId: a.id,
      });
      await x.references.saveSettings({
        noteId: note.id,
        enabled: true,
        activeJobId: refId,
        bundleId: null,
        sourcePath: null,
      });
    });
    await base.db.run(
      sql`UPDATE notes SET display=${JSON.stringify({ style: "default", source: "automatic", initialization: { kind: "conversion", jobId } })} WHERE id=${note.id}`,
    );
    const before = await base.db.all(
      sql`SELECT title,html,updated_at,created_at,creator_id FROM notes WHERE id=${note.id}`,
    );
    const revisions = await base.db.all(
      sql`SELECT * FROM note_revisions WHERE note_id=${note.id}`,
    );
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "editor",
      role: "viewer",
      ownerConfirmed: false,
    });
    expect(
      await base.db.all(
        sql`SELECT title,html,updated_at,created_at,creator_id FROM notes WHERE id=${note.id}`,
      ),
    ).toEqual(before);
    expect(
      await base.db.all(
        sql`SELECT * FROM note_revisions WHERE note_id=${note.id}`,
      ),
    ).toEqual(revisions);
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "viewer",
      role: "editor",
      ownerConfirmed: false,
    });
    await c.unitOfWorkProvider.run(async (x) => {
      expect((await x.jobs.find(jobId))?.state).toBe("cancelled");
      expect(await x.jobs.finish(jobId, "held", now, "succeeded")).toBe(false);
      expect((await x.imports.findOriginal(originalId))?.state).toBe(
        "cancelled",
      );
      expect((await x.references.settings(note.id))?.activeJobId).toBeNull();
      expect((await x.references.job(refId))?.state).toBe("cancelled");
      expect(await x.references.finish(refId, "held", now, "succeeded")).toBe(
        false,
      );
      expect((await x.references.job(otherRef))?.state).toBe("running");
    });
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "editor",
      role: "editor",
      ownerConfirmed: false,
    });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.references.job(otherRef)))
        ?.state,
    ).toBe("running");
    const current = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(note.id),
    );
    expect(current?.version).toBe(1);
    const saved = await saveNote(c, a.token, {
      id: note.id,
      version: 1,
      title: "Keep",
      html: "<h2>Owner continues</h2>",
      wysOrigin: { revisionNo: 1, capturedNoteVersion: 0 },
    });
    expect(saved.note.html).toBe("<h2>Owner continues</h2>");
    expect(saved.wysContext).toMatchObject({ origin: { revisionNo: 1 } });
  });
  it("receipt payload mismatch, exact resend and continuation deadlines are non-destructive", async () => {
    const i = await issue();
    await expect(
      issueInvitations(c, a.token, { ...i.input, role: "viewer" }),
    ).rejects.toMatchObject({ code: "INVITATION_REQUEST_CHANGED" });
    now = new Date(now.getTime() + 59_999);
    await expect(
      resendInvitation(c, a.token, {
        workspaceId: w,
        id: i.id,
        requestId: c.idGenerator.next(),
        ownerConfirmed: false,
      }),
    ).rejects.toMatchObject({ code: "INVITATION_RESEND_RATE" });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)))
        ?.generation,
    ).toBe(1);
    now = new Date("2026-09-11T09:00:00Z");
    await expect(getInvitationLanding(c, b.token, i)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)))?.state,
    ).toBe("pending");
  });
  it("expired link is rejected before bounded secret cleanup and terminal metadata is not extended", async () => {
    const i = await issue();
    now = new Date(now.getTime() + 14 * 86400_000);
    await expect(
      beginInvitation(c, i.token, i.browserToken),
    ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await c.unitOfWorkProvider.run((x) =>
      x.invitations.expireAndPrune(now, 50),
    );
    const row = await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id));
    expect(row).toMatchObject({
      state: "expired",
      tokenHash: null,
      envelope: null,
    });
    now = new Date(now.getTime() + 91 * 86400_000);
    await c.unitOfWorkProvider.run((x) =>
      x.invitations.expireAndPrune(now, 50),
    );
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toBeNull();
  });
  it("a late generation-one mail success cannot mark a resent generation sent", async () => {
    const i = await issue();
    let started!: () => void;
    const entered = new Promise<void>((r) => {
      started = r;
    });
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const sending = {
      ...c,
      invitationDelivery: {
        ...c.invitationDelivery!,
        mailer: {
          async send() {
            started();
            await held;
          },
        },
      },
    };
    const work = deliverOneInvitation(sending);
    await entered;
    now = new Date(now.getTime() + 60_000);
    await resendInvitation(c, a.token, {
      workspaceId: w,
      id: i.id,
      requestId: c.idGenerator.next(),
      ownerConfirmed: false,
    });
    release();
    await work;
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toMatchObject({ generation: 2, deliveryState: "pending", attempts: 0 });
    await deliverOneInvitation(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toMatchObject({ generation: 2, deliveryState: "sent", attempts: 1 });
  });
  it("indexed actor loss terminalizes 5001 rows without materializing jobs or affecting another actor", async () => {
    const i = await issue();
    await joinInvitation(c, b.token, { ...i, confirmDifferentEmail: false });
    const { note } = await saveNote(c, b.token, {
      workspaceId: w,
      title: "Bulk fixture",
      html: "<p>Keep</p>",
    });
    await base.db.run(
      sql`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<5001) INSERT INTO reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state) SELECT '00000000-0000-7000-8000-'||printf('%012d',x),${note.id},${b.id},0,${now.getTime()},${now.getTime()},1,1,0,0,'queued' FROM n`,
    );
    await base.db.run(
      sql`INSERT INTO reference_jobs(id,note_id,account_id,note_version,created_at,updated_at,attempt,total,completed,cancel_requested,state) VALUES(${c.idGenerator.next()},${note.id},${a.id},0,${now.getTime()},${now.getTime()},1,1,0,0,'queued')`,
    );
    const start = performance.now();
    await changeWorkspaceMember(c, a.token, {
      workspaceId: w,
      accountId: b.id,
      expectedRole: "editor",
      role: "viewer",
      ownerConfirmed: false,
    });
    process.stdout.write(
      `${JSON.stringify({ observation: "indexed actor terminalization", rows: 5001, elapsedMs: performance.now() - start })}\n`,
    );
    expect(
      await base.db.all(
        sql`SELECT state,count(*) n FROM reference_jobs WHERE account_id=${b.id} GROUP BY state`,
      ),
    ).toEqual([{ state: "cancelled", n: 5001 }]);
    expect(
      await base.db.all(
        sql`SELECT state FROM reference_jobs WHERE account_id=${a.id}`,
      ),
    ).toEqual([{ state: "queued" }]);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.notes.findById(note.id)))?.html,
    ).toBe(note.html);
  });
  it("invitation event passes the persisted default decoder and wake without carrying secrets", async () => {
    const i = await issue();
    await issueInvitations(c, a.token, i.input);
    const seen: unknown[] = [];
    const dispatch = () =>
      processOutboxEvents({ ...base, clock: c.clock }, async (events) =>
        events.map((event) => {
          expect(event.type).toBe("InvitationQueued");
          seen.push(event.payload);
          return { kind: "success" as const, id: event.id };
        }),
      );
    expect((await dispatch()).processed).toBe(1);
    expect(seen).toEqual([{ invitationId: i.id, generation: 1 }]);
    expect((await dispatch()).processed).toBe(0);
  });
  it("actual 30-second delivery deadline aborts I/O and schedules from failure, not original due time", async () => {
    const i = await issue();
    let observed: AbortSignal | undefined;
    const start = performance.now();
    const bounded = {
      ...c,
      invitationDelivery: {
        ...c.invitationDelivery!,
        mailer: {
          async send(_id: string, _mail: unknown, signal: AbortSignal) {
            observed = signal;
            await new Promise<void>((_resolve, reject) =>
              signal.addEventListener(
                "abort",
                () => {
                  now = new Date(now.getTime() + 30_000);
                  reject(new Error("test aborted"));
                },
                { once: true },
              ),
            );
          },
        },
      },
    };
    await deliverOneInvitation(bounded);
    expect(observed?.aborted).toBe(true);
    expect(performance.now() - start).toBeGreaterThanOrEqual(29_000);
    const row = await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id));
    expect(row).toMatchObject({
      attempts: 1,
      deliveryState: "pending",
      leaseToken: null,
    });
    expect(row?.nextAttemptAt.getTime()).toBe(now.getTime() + 60_000);
  }, 45_000);
  it("accepted delivery snapshot survives ack loss, rename, URL change and template-like name text", async () => {
    await updateWorkspaceSettings(c, a.token, {
      workspaceId: w,
      settingsVersion: 0,
      name: "name {token} ?token=",
      description: "",
    });
    const i = await issue();
    const mailbox = join(dir, "mailbox");
    const local = new LocalInvitationMailer(mailbox);
    let loseAck = true;
    const sender = {
      ...c,
      invitationDelivery: {
        ...c.invitationDelivery!,
        mailer: {
          async send(...args: Parameters<typeof local.send>) {
            await local.send(...args);
            if (loseAck) throw Error("lost ack");
          },
        },
      },
    };
    await deliverOneInvitation(sender);
    const path = join(mailbox, `invitation-${i.id}-1.json`);
    const first = await readFile(path, "utf8");
    await updateWorkspaceSettings(c, a.token, {
      workspaceId: w,
      settingsVersion: 1,
      name: "Renamed",
      description: "",
    });
    now = new Date(now.getTime() + 60_000);
    loseAck = false;
    await deliverOneInvitation({
      ...sender,
      appUrl: "https://different.example.test",
    });
    expect(await readFile(path, "utf8")).toBe(first);
    expect(await readdir(mailbox)).toEqual([`invitation-${i.id}-1.json`]);
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toMatchObject({ attempts: 2, deliveryState: "sent" });
  });
  it("legacy unattempted snapshot is fixed before I/O; attempted unknown payload requires explicit recovery", async () => {
    const i = await issue();
    await base.db.run(
      sql`UPDATE workspace_invitations SET delivery_snapshot=NULL WHERE id=${i.id}`,
    );
    await deliverOneInvitation(c);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)))
        ?.deliverySnapshot,
    ).not.toBeNull();
    await base.db.run(
      sql`UPDATE workspace_invitations SET delivery_snapshot=NULL,delivery_state='pending' WHERE id=${i.id}`,
    );
    await deliverOneInvitation(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toMatchObject({
      attempts: 1,
      deliveryState: "failed",
      deliveryFailure: expect.stringContaining("旧配送の内容を確認できません"),
    });
    expect(deliveries).toBe(1);
    await expect(
      copyInvitation(c, a.token, { workspaceId: w, id: i.id, generation: 1 }),
    ).resolves.toHaveProperty("url");
    now = new Date(now.getTime() + 60_000);
    await resendInvitation(c, a.token, {
      workspaceId: w,
      id: i.id,
      requestId: c.idGenerator.next(),
      ownerConfirmed: false,
    });
    await deliverOneInvitation(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.invitations.find(i.id)),
    ).toMatchObject({ generation: 2, attempts: 1, deliveryState: "sent" });
  });
});

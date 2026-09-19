import { randomBytes } from "node:crypto";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getDisplayName,
  setDisplayName,
} from "@repo/core/application/account/displayName";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  readSharedNote,
  unlockShare,
} from "@repo/core/application/sharing/reading";
import {
  changeSharing,
  getShareLink,
  getSharing,
  rotateShareEnvelopes,
} from "@repo/core/application/sharing/settings";
import { requestWorkspaceDeletion } from "@repo/core/application/workspace/deletion";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createNote } from "@repo/core/domain/note/entity";
import {
  SHARE_GRANT_MS,
  SHARE_RATE_WINDOW_MS,
} from "@repo/core/domain/sharing/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { NodeSharePasswordWork } from "../../node/sharePasswordWork";
import { NodeShareTokenProtector } from "../../node/shareSecrets";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("limited sharing authoritative state", () => {
  let base: TestContainer;
  let c: HollowContainer & { sharing: NonNullable<HollowContainer["sharing"]> };
  let directory: string;
  let now: Date;
  let noteId: string;
  const actor = "00000000-0000-4000-8000-000000000001";
  const session = "sharing-test-session";
  const browser = "sharing-test-browser";
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(
      path.join(await realpath(tmpdir()), "hollow-sharing-integration-"),
    );
    await writeFile(path.join(directory, "first.key"), randomBytes(32), {
      mode: 0o600,
    });
    await writeFile(path.join(directory, "second.key"), randomBytes(32), {
      mode: 0o600,
    });
    now = new Date("2026-09-19T11:00:00Z");
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory,
          activeKeyId: "first",
          keyIds: ["first", "second"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    await base.db.insert(accounts).values({
      id: actor,
      email: "sharing@example.test",
      passwordHash: "test",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 30 * 86400_000),
    });
    noteId = (
      await saveNote(c, session, {
        title: "共有本文",
        html: "<p>現在の本文</p>",
      })
    ).note.id;
  });
  afterEach(async () => {
    await c.sharing?.passwordWork.stop();
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const view = () => getSharing(c, session, noteId);
  const change = async (
    operation: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, session, { expected: (await view()).expected, operation });
  const token = async () =>
    new URL(
      (await getShareLink(c, session, (await view()).expected)).url,
    ).pathname
      .split("/")
      .at(-1) ?? "";
  const limited = () => change({ kind: "visibility", visibility: "link" });
  const password = () =>
    change({ kind: "password", password: "exact password" });

  it("keeps link/grant and creator across moves, rejects stale move/share confirmation, and closes immediately on workspace deletion acceptance", async () => {
    const workspace = await createWorkspace(c, session, {
      name: "Isolated shared destination",
      description: "",
    });
    const destination = {
      kind: "workspace" as const,
      workspaceId: workspace.id,
    };
    const oldMove = await previewNoteMove(c, session, { noteId, destination });
    await password();
    await limited();
    await expect(moveNote(c, session, oldMove.expected)).rejects.toMatchObject({
      code: "MOVE_CHANGED",
    });
    const link = await token();
    await unlockShare(c, link, browser, "exact password");
    const oldShare = (await view()).expected;
    const grant = await c.unitOfWorkProvider.run((u) =>
      u.sharing.findGrant(noteId, c.tokens.hash(browser)),
    );
    const move = async (
      destination: Parameters<typeof previewNoteMove>[2]["destination"],
    ) =>
      moveNote(
        c,
        session,
        (await previewNoteMove(c, session, { noteId, destination })).expected,
      );
    await move(destination);
    expect(await readSharedNote(c, link, browser, session)).toMatchObject({
      kind: "content",
      canEdit: true,
      author: { kind: "unset" },
    });
    await move({ kind: "personal", accountId: actor });
    await expect(
      changeSharing(c, session, {
        expected: oldShare,
        operation: { kind: "visibility", visibility: "private" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.findGrant(noteId, c.tokens.hash(browser)),
      ),
    ).toEqual(grant);
    await move(destination);
    await requestWorkspaceDeletion(c, session, {
      workspaceId: workspace.id,
      requestId: c.idGenerator.next(),
      confirmation: workspace.name,
    });
    await expect(readSharedNote(c, link, browser)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
    await expect(
      unlockShare(c, link, browser, "exact password"),
    ).rejects.toMatchObject({ code: "SHARE_NOT_FOUND" });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
        ?.lifecycle.kind,
    ).toBe("active");
  });
  it("rechecks outside-transaction rendering and retries only one changed authorized snapshot", async () => {
    await limited();
    const link = await token();
    let inspections = 0;
    let onInspect = async () => {};
    const rendering: HollowContainer = {
      ...c,
      referencing: {
        processor: new NodeReferenceProcessor(),
        wake() {},
        fetcher: {
          async inspect() {
            throw Error("unused");
          },
          async fetch() {
            throw Error("unused");
          },
          async inspectMany() {
            inspections++;
            await onInspect();
            return [];
          },
        },
      },
    };
    onInspect = async () => {
      if (inspections === 1)
        await saveNote(c, session, {
          id: noteId,
          version: (await view()).expected.noteVersion,
          title: "New current title",
          html: "<p>new current body</p>",
        });
    };
    expect(await readSharedNote(rendering, link, null)).toMatchObject({
      kind: "content",
      title: "New current title",
    });
    expect(inspections).toBe(2);
    inspections = 0;
    onInspect = async () => {
      await saveNote(c, session, {
        id: noteId,
        version: (await view()).expected.noteVersion,
        title: `Changing ${inspections}`,
        html: "<p>changing body</p>",
      });
    };
    await expect(readSharedNote(rendering, link, null)).rejects.toMatchObject({
      code: "SHARE_SNAPSHOT_CHANGED",
    });
    expect(inspections).toBe(2);
    onInspect = async () => {
      await change({ kind: "visibility", visibility: "private" });
    };
    await expect(readSharedNote(rendering, link, null)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
  });

  it("prepares password protection privately and publishes the same token only on explicit limited visibility", async () => {
    const initial = await view();
    await password();
    expect(await view()).toMatchObject({
      visibility: "private",
      hasLink: true,
      hasPassword: true,
    });
    const prepared = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    await expect(
      getShareLink(c, session, (await view()).expected),
    ).rejects.toMatchObject({ code: "SHARE_LINK_HIDDEN" });
    await expect(
      changeSharing(c, session, {
        expected: initial.expected,
        operation: { kind: "visibility", visibility: "link" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect((await view()).visibility).toBe("private");
    await limited();
    const published = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    expect(published?.tokenEnvelope === prepared?.tokenEnvelope).toBe(true);
    expect(published?.passwordHash === prepared?.passwordHash).toBe(true);
    expect(await readSharedNote(c, await token(), null)).toEqual({
      kind: "gate",
    });
  });
  it("rolls back first private protection when key/hash work fails without partially issuing a link", async () => {
    const closed = await NodeShareTokenProtector.load({
      directory: path.join(directory, "absent"),
      activeKeyId: "first",
      keyIds: ["first"],
    });
    const noKey = { ...c, sharing: { ...c.sharing, protector: closed } };
    const expected = (await view()).expected;
    await expect(
      changeSharing(noKey, session, {
        expected,
        operation: { kind: "password", password: "exact password" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_KEY_UNAVAILABLE" });
    const noHash = {
      ...c,
      passwordHasher: {
        verify: c.passwordHasher.verify.bind(c.passwordHasher),
        async hash() {
          throw Error("isolated hash failure");
        },
      },
    };
    await expect(
      changeSharing(noHash, session, {
        expected,
        operation: { kind: "password", password: "exact password" },
      }),
    ).rejects.toThrow("isolated hash failure");
    expect(await view()).toMatchObject({
      visibility: "private",
      hasLink: false,
      hasPassword: false,
      expected: { shareVersion: 0 },
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({
      tokenHash: null,
      tokenEnvelope: null,
      passwordHash: null,
      grantEpoch: 0,
      linkGeneration: 0,
    });
  });
  it("initializes private once and share commands leave note/revision bytes unchanged", async () => {
    expect(await view()).toMatchObject({
      visibility: "private",
      hasLink: false,
      hasPassword: false,
    });
    const before = await base.client.execute({
      sql: "select * from notes where id=?",
      args: [noteId],
    });
    const revisions = await base.client.execute({
      sql: "select * from note_revisions where note_id=?",
      args: [noteId],
    });
    await limited();
    await password();
    const after = await base.client.execute({
      sql: "select * from notes where id=?",
      args: [noteId],
    });
    expect(after.rows).toEqual(before.rows);
    expect(
      (
        await base.client.execute({
          sql: "select * from note_revisions where note_id=?",
          args: [noteId],
        })
      ).rows,
    ).toEqual(revisions.rows);
    const raw = await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId));
    expect(raw?.tokenEnvelope?.includes(await token())).toBe(false);
    expect(
      JSON.stringify(await view()).includes(raw?.tokenHash ?? "unmatchable"),
    ).toBe(false);
  });
  it("normal save retains sharing and an old confirmation is rejected", async () => {
    await limited();
    await password();
    const before = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    const expected = (await view()).expected;
    await saveNote(c, session, {
      id: noteId,
      version: expected.noteVersion,
      title: "更新",
      html: "<p>更新済み</p>",
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toEqual(before);
    await expect(
      changeSharing(c, session, {
        expected,
        operation: { kind: "visibility", visibility: "private" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
  });
  it("rejects absent body and unauthorized edits without allocating a token", async () => {
    const empty = await saveNote(c, session, { title: "本文なし", html: "" });
    const expected = (await getSharing(c, session, empty.note.id)).expected;
    await expect(
      changeSharing(c, session, {
        expected,
        operation: { kind: "visibility", visibility: "link" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_BODY_REQUIRED" });
    await expect(
      changeSharing(c, null, {
        expected,
        operation: { kind: "visibility", visibility: "link" },
      }),
    ).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
    expect((await getSharing(c, session, empty.note.id)).hasLink).toBe(false);
  });
  it("uses fixed 24h grants and keeps them across trash restore only", async () => {
    await limited();
    await password();
    const link = await token();
    expect(await readSharedNote(c, link, null)).toEqual({ kind: "gate" });
    expect(await unlockShare(c, link, browser, "exact password")).toEqual({
      kind: "accepted",
    });
    const grant = await c.unitOfWorkProvider.run((u) =>
      u.sharing.findGrant(noteId, c.tokens.hash(browser)),
    );
    now = new Date(now.getTime() + SHARE_GRANT_MS - 1);
    expect((await readSharedNote(c, link, browser)).kind).toBe("content");
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.findGrant(noteId, c.tokens.hash(browser)),
      ),
    ).toEqual(grant);
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=${now.getTime()},purge_after=${now.getTime() + 86400_000},trash_operation_id='test-trash' where id=${noteId}`,
    );
    await expect(readSharedNote(c, link, browser)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
    await base.db.run(
      sql`update notes set lifecycle='active',trashed_at=null,purge_after=null,trash_operation_id=null where id=${noteId}`,
    );
    expect((await readSharedNote(c, link, browser)).kind).toBe("content");
    now = new Date(now.getTime() + 1);
    expect(await readSharedNote(c, link, browser)).toEqual({ kind: "gate" });
  });
  it("private retains token/password but revokes grants; private regeneration never publishes", async () => {
    await limited();
    await password();
    const old = await token();
    await unlockShare(c, old, browser, "exact password");
    await change({ kind: "visibility", visibility: "private" });
    await expect(readSharedNote(c, old, browser)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
    await expect(
      getShareLink(c, session, (await view()).expected),
    ).rejects.toMatchObject({ code: "SHARE_LINK_HIDDEN" });
    await limited();
    expect((await token()) === old).toBe(true);
    expect(await readSharedNote(c, old, browser)).toEqual({ kind: "gate" });
    await change({ kind: "visibility", visibility: "private" });
    await change({ kind: "regenerate" });
    expect(await view()).toMatchObject({
      visibility: "private",
      hasPassword: true,
    });
    await limited();
    expect((await token()) === old).toBe(false);
    await expect(readSharedNote(c, old, browser)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
  });
  it("password changes/removal revoke old grants and preserve exact unicode boundaries", async () => {
    await limited();
    await expect(
      change({ kind: "password", password: "あ".repeat(7) }),
    ).rejects.toMatchObject({ code: "SHARE_PASSWORD_LENGTH" });
    await expect(
      change({ kind: "password", password: "😀".repeat(257) }),
    ).rejects.toMatchObject({ code: "SHARE_PASSWORD_LENGTH" });
    await change({ kind: "password", password: "😀".repeat(256) });
    const link = await token();
    expect(await unlockShare(c, link, browser, "😀".repeat(256))).toEqual({
      kind: "accepted",
    });
    await password();
    expect(await readSharedNote(c, link, browser)).toEqual({ kind: "gate" });
    expect(await unlockShare(c, link, browser, " exact password")).toEqual({
      kind: "incorrect",
    });
    await change({ kind: "remove-password" });
    expect((await readSharedNote(c, link, null)).kind).toBe("content");
  });
  it("missing key does not stop hash reads or private revocation; finite rotation keeps token/grant", async () => {
    await limited();
    await password();
    const link = await token();
    await unlockShare(c, link, browser, "exact password");
    const before = await c.unitOfWorkProvider.run((u) =>
      u.sharing.findGrant(noteId, c.tokens.hash(browser)),
    );
    const closed = await NodeShareTokenProtector.load({
      directory: path.join(directory, "missing"),
      activeKeyId: "first",
      keyIds: ["first"],
    });
    const noKey = { ...c, sharing: { ...c.sharing, protector: closed } };
    expect((await readSharedNote(noKey, link, browser)).kind).toBe("content");
    await expect(
      getShareLink(noKey, session, (await view()).expected),
    ).rejects.toMatchObject({ code: "SHARE_KEY_UNAVAILABLE" });
    const rotated = {
      ...c,
      sharing: {
        ...c.sharing,
        protector: await NodeShareTokenProtector.load({
          directory,
          activeKeyId: "second",
          keyIds: ["first", "second"],
        }),
      },
    };
    expect(await rotateShareEnvelopes(rotated)).toEqual({
      rewritten: 1,
      next: null,
    });
    expect(
      (
        await getShareLink(rotated, session, (await view()).expected)
      ).url.endsWith(link),
    ).toBe(true);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.findGrant(noteId, c.tokens.hash(browser)),
      ),
    ).toEqual(before);
    await changeSharing(noKey, session, {
      expected: (await view()).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
    expect((await view()).visibility).toBe("private");
  });
  it("profile names are separate, OCC protected, and actual creator provenance is honest", async () => {
    await limited();
    const link = await token();
    expect(await readSharedNote(c, link, null)).toMatchObject({
      author: { kind: "unset" },
    });
    const before = await view();
    const profile = await getDisplayName(c, session);
    await setDisplayName(c, session, {
      value: "  実著者  ",
      expectedVersion: profile.version,
    });
    expect(await readSharedNote(c, link, null)).toMatchObject({
      author: { kind: "named", displayName: "実著者" },
    });
    expect((await view()).expected).toEqual(before.expected);
    await expect(
      setDisplayName(c, session, { value: "stale", expectedVersion: 0 }),
    ).rejects.toMatchObject({ code: "DISPLAY_NAME_CONFLICT" });
    await expect(
      setDisplayName(c, session, { value: "line\nbreak", expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "DISPLAY_NAME_INVALID" });
    await expect(
      setDisplayName(c, session, {
        value: "名".repeat(51),
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: "DISPLAY_NAME_LENGTH" });
    await setDisplayName(c, session, { value: " ", expectedVersion: 1 });
    expect(await readSharedNote(c, link, null)).toMatchObject({
      author: { kind: "unset" },
    });
    await base.db.run(
      sql`update notes set creator_id='missing-known-creator' where id=${noteId}`,
    );
    expect(await readSharedNote(c, link, null)).toMatchObject({
      author: { kind: "deleted" },
    });
    await base.db.run(sql`update notes set creator_id=null where id=${noteId}`);
    expect(await readSharedNote(c, link, null)).toMatchObject({
      author: { kind: "unknown" },
    });
  });
  it("new-row trigger rolls back and mandatory row cascades only with its note", async () => {
    const fresh = createNote(
      {
        id: c.idGenerator.next(),
        accountId: actor,
        title: "isolated",
        html: "",
        text: "",
      },
      now,
    );
    await expect(
      c.unitOfWorkProvider.run(async (u) => {
        await u.notes.insert(fresh);
        throw Error("rollback");
      }),
    ).rejects.toThrow();
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(fresh.id)),
    ).toBeNull();
    await c.unitOfWorkProvider.run((u) => u.notes.insert(fresh));
    await expect(
      base.db.run(sql`delete from note_sharing where note_id=${fresh.id}`),
    ).rejects.toThrow();
    await base.db.run(sql`delete from notes where id=${fresh.id}`);
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(fresh.id)),
    ).toBeNull();
    expect(
      (await base.client.execute("pragma foreign_key_check")).rows,
    ).toHaveLength(0);
  });
  it("reserves globally under concurrency with a fixed window and no success refund", async () => {
    const reserve = (b: string) =>
      c.unitOfWorkProvider.run((u) =>
        u.sharing.reservePassword(noteId, b, now),
      );
    const results = await Promise.all(
      Array.from({ length: 65 }, (_, i) => reserve(`browser-${i}`)),
    );
    expect(results.filter((r) => r.kind === "allowed")).toHaveLength(60);
    const one = results[0];
    if (one?.kind !== "allowed") throw Error("reservation");
    await c.unitOfWorkProvider.run((u) =>
      u.sharing.finishPassword(one.reservation, true, now),
    );
    const denied = await reserve("new");
    expect(denied.kind).toBe("blocked");
    now = new Date(now.getTime() + SHARE_RATE_WINDOW_MS - 1);
    expect(await reserve("new")).toEqual(denied);
    now = new Date(now.getTime() + 1);
    expect((await reserve("new")).kind).toBe("allowed");
  });
  it("persists browser blocks and whole-link reservations across a real connection restart", async () => {
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        c.unitOfWorkProvider.run((u) =>
          u.sharing.reservePassword(noteId, "restart-browser", now),
        ),
      ),
    );
    for (const reservation of reservations) {
      if (reservation.kind !== "allowed") throw Error("fixture");
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.finishPassword(reservation.reservation, false, now),
      );
    }
    for (let i = 0; i < 52; i++)
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.reservePassword(noteId, `other-${i}`, now),
      );
    const file = (await base.client.execute("pragma database_list")).rows.find(
      (row) => row.name === "main",
    )?.file;
    if (typeof file !== "string" || !file) throw Error("fixture database");
    base.client.close();
    const reopened = createLibsqlClient({ url: `file:${file}` });
    try {
      await applyPragmas(reopened);
      const restarted = createHollowContainer(getDatabase(reopened), c.appUrl, {
        async send() {},
      });
      const reserve = (subject: string) =>
        restarted.unitOfWorkProvider.run((u) =>
          u.sharing.reservePassword(noteId, subject, now),
        );
      const blocked = {
        kind: "blocked",
        retryAt: new Date(now.getTime() + SHARE_RATE_WINDOW_MS),
      };
      expect(await reserve("restart-browser")).toEqual(blocked);
      expect(await reserve("new-browser")).toEqual(blocked);
      now = new Date(now.getTime() + SHARE_RATE_WINDOW_MS - 1);
      expect(await reserve("restart-browser")).toEqual(blocked);
      now = new Date(now.getTime() + 1);
      expect((await reserve("restart-browser")).kind).toBe("allowed");
    } finally {
      reopened.close();
    }
  });
  it("prunes at most 100 expired grants and rates without removing live records", async () => {
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 101; i++) {
        await u.sharing.saveGrant({
          noteId,
          browserHash: `expired-${i}`,
          linkGeneration: 1,
          grantEpoch: 1,
          verifiedAt: new Date(now.getTime() - SHARE_GRANT_MS),
          expiresAt: now,
        });
      }
      await u.sharing.saveGrant({
        noteId,
        browserHash: "live",
        linkGeneration: 1,
        grantEpoch: 1,
        verifiedAt: now,
        expiresAt: new Date(now.getTime() + SHARE_GRANT_MS),
      });
    });
    const old = now.getTime() - SHARE_RATE_WINDOW_MS;
    for (let i = 0; i < 101; i++)
      await base.client.execute({
        sql: "insert into share_password_rates values(?,'browser',?,?,0,0,?,0)",
        args: [noteId, `expired-${i}`, old, old],
      });
    await base.client.execute({
      sql: "insert into share_password_rates values(?,'browser','live',?,8,?,?,0)",
      args: [noteId, old, now.getTime() + 1, old],
    });
    await c.unitOfWorkProvider.run((u) => u.sharing.prune(now));
    expect(
      (await base.client.execute("select count(*) n from share_grants")).rows[0]
        ?.n,
    ).toBe(2);
    expect(
      (await base.client.execute("select count(*) n from share_password_rates"))
        .rows[0]?.n,
    ).toBe(2);
    await c.unitOfWorkProvider.run((u) => u.sharing.prune(now));
    expect(
      (await base.client.execute("select browser_hash from share_grants")).rows,
    ).toEqual([{ browser_hash: "live" }]);
    expect(
      (
        await base.client.execute(
          "select subject_hash from share_password_rates",
        )
      ).rows,
    ).toEqual([{ subject_hash: "live" }]);
  });
  it("rejects a viewer mutation and an old editor confirmation after role ABA", async () => {
    const workspace = await createWorkspace(c, session, {
      name: "Role ABA",
      description: "",
    });
    const editor = "00000000-0000-4000-8000-000000000002";
    const editorSession = "sharing-editor-session";
    await base.db.insert(accounts).values({
      id: editor,
      email: "sharing-editor@example.test",
      passwordHash: "test",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(editorSession),
      accountId: editor,
      expiresAt: new Date(now.getTime() + SHARE_GRANT_MS),
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.join(workspace.id, editor, "editor", now),
    );
    const move = await previewNoteMove(c, session, {
      noteId,
      destination: { kind: "workspace", workspaceId: workspace.id },
    });
    await moveNote(c, session, move.expected);
    const expected = (await getSharing(c, editorSession, noteId)).expected;
    await changeWorkspaceMember(c, session, {
      workspaceId: workspace.id,
      accountId: editor,
      role: "viewer",
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    expect((await getSharing(c, editorSession, noteId)).canEdit).toBe(false);
    await expect(
      changeSharing(c, editorSession, {
        expected,
        operation: { kind: "visibility", visibility: "link" },
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await changeWorkspaceMember(c, session, {
      workspaceId: workspace.id,
      accountId: editor,
      role: "editor",
      expectedRole: "viewer",
      ownerConfirmed: false,
    });
    await expect(
      changeSharing(c, editorSession, {
        expected,
        operation: { kind: "visibility", visibility: "link" },
      }),
    ).rejects.toMatchObject({ code: "SHARE_CONFIRMATION_CHANGED" });
    expect((await view()).hasLink).toBe(false);
  });
  it("counts concurrent failures, blocks eighth for fixed 15min and never extends blocked requests", async () => {
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        c.unitOfWorkProvider.run((u) =>
          u.sharing.reservePassword(noteId, "same", now),
        ),
      ),
    );
    await Promise.all(
      reservations.map((r) =>
        r.kind === "allowed"
          ? c.unitOfWorkProvider.run((u) =>
              u.sharing.finishPassword(r.reservation, false, now),
            )
          : Promise.resolve(),
      ),
    );
    const denied = await c.unitOfWorkProvider.run((u) =>
      u.sharing.reservePassword(noteId, "same", now),
    );
    expect(denied).toEqual({
      kind: "blocked",
      retryAt: new Date(now.getTime() + SHARE_RATE_WINDOW_MS),
    });
    now = new Date(now.getTime() + SHARE_RATE_WINDOW_MS - 1);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.reservePassword(noteId, "same", now),
      ),
    ).toEqual(denied);
    now = new Date(now.getTime() + 1);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.sharing.reservePassword(noteId, "same", now),
        )
      ).kind,
    ).toBe("allowed");
  });
  it("rechecks password epoch after expensive verification", async () => {
    await limited();
    await password();
    const link = await token();
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    const held = {
      ...c,
      passwordHasher: {
        ...c.passwordHasher,
        async verify() {
          entered();
          await barrier;
          return true;
        },
      },
    };
    const result = unlockShare(held, link, browser, "test");
    await started;
    await change({ kind: "visibility", visibility: "private" });
    release();
    await expect(result).rejects.toMatchObject({ code: "SHARE_NOT_FOUND" });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.findGrant(noteId, c.tokens.hash(browser)),
      ),
    ).toBeNull();
  });
});

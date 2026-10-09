import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { getNote } from "@repo/core/application/note/getNote";
import {
  getNoteVersion,
  listRevisions,
  renderRevision,
  restoreRevision,
} from "@repo/core/application/note/history";
import { listNotes } from "@repo/core/application/note/listNotes";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import {
  getTrashIntent,
  listTrash,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import { getWysContext } from "@repo/core/application/note/wysContext";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import { readPublicNote } from "@repo/core/application/publication/reading";
import {
  controlReference,
  readReferences,
} from "@repo/core/application/reference/read";
import { readSharedNote } from "@repo/core/application/sharing/reading";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("personal trash and active authorization", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let now: Date;
  let token: string;
  let other: string;
  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-10T00:00:00Z");
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    async function user(email: string) {
      const registration = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const result = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registration.browserToken,
      );
      if (!result) throw Error("session");
      return result.token;
    }
    token = await user("trash-a@example.test");
    other = await user("trash-b@example.test");
  });
  afterEach(() => base.close());
  const create = async (title = "保存済み") =>
    (
      await saveNote(container, token, {
        title,
        html: '<p class="keep">本文</p>',
        importReferences: false,
      })
    ).note;
  async function snapshot(id: string) {
    return container.unitOfWorkProvider.run(async (c) => ({
      note: await c.notes.findById(id),
      revisions: await c.revisions.list(id),
      head: await c.revisions.head(id),
      pins: await c.assets.referenceIds(id, 0),
      settings: await c.references.settings(id),
    }));
  }
  it("preserves content, updatedAt, display, twenty-version state and relation rows while only advancing note version", async () => {
    const note = await create();
    const before = await snapshot(note.id);
    now = new Date(now.getTime() + 1234);
    const trashed = await trashNote(container, token, {
      id: note.id,
      version: note.version,
      cancelProcessing: false,
    });
    const middle = await snapshot(note.id);
    expect(middle.note).toEqual({
      ...before.note,
      lifecycle: {
        kind: "trashed",
        trashedAt: now,
        purgeAfter: new Date(trashed.purgeAfter),
        operationId: trashed.operationId,
      },
      version: note.version + 1,
    });
    expect({ ...middle, note: null }).toEqual({ ...before, note: null });
    expect(await listNotes(container, token)).toEqual([]);
    expect((await listTrash(container, token)).items).toMatchObject([
      { id: note.id, remainingDays: 30, canRestore: true },
    ]);
    await restoreNote(container, token, trashed);
    expect((await snapshot(note.id)).note).toEqual({
      ...before.note,
      version: note.version + 2,
    });
    expect((await listNotes(container, token)).map((n) => n.id)).toEqual([
      note.id,
    ]);
  });
  it("closes actual public and shared URLs on trash and restores both without replacing their identities or settings", async () => {
    container = {
      ...container,
      sharing: {
        protector: {
          protect: (value) => value,
          reveal: (envelope) => envelope,
          needsRotation: () => false,
        },
        passwordWork: { run: (operation) => operation(), async stop() {} },
      },
    };
    const note = await create();
    const profile = await getProfile(container, token);
    await saveProfile(container, token, {
      displayName: "削除の確認",
      handle: "trash-public",
      bio: "",
      nameVersion: profile.nameVersion,
      profileVersion: profile.profileVersion,
      confirmHandleChange: true,
    });
    await changeSharing(container, token, {
      expected: (await getSharing(container, token, note.id)).expected,
      operation: { kind: "visibility", visibility: "link" },
    });
    const sharedUrl = await getShareLink(
      container,
      token,
      (await getSharing(container, token, note.id)).expected,
    );
    const sharedToken = new URL(sharedUrl.url).pathname.split("/").at(-1);
    if (!sharedToken) throw Error("fixture share token missing");
    expect((await readSharedNote(container, sharedToken, null)).kind).toBe(
      "content",
    );
    await changeSharing(container, token, {
      expected: (await getSharing(container, token, note.id)).expected,
      operation: {
        kind: "visibility",
        visibility: "public",
        confirmPasswordRemoval: true,
      },
    });
    const identity = await container.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(note.id),
    );
    if (!identity) throw Error("fixture public identity missing");
    const originalPublic = await readPublicNote(container, identity);
    const originalShared = await readSharedNote(container, sharedToken, null);
    if (originalShared.kind !== "content")
      throw Error("fixture shared note missing");
    for (const style of ["original", "default"] as const) {
      const updated = await setDisplayStyle(container, token, {
        id: note.id,
        style,
      });
      const publicResult = await readPublicNote(container, identity);
      const sharedResult = await readSharedNote(container, sharedToken, null);
      expect(publicResult.display).toEqual(updated.display);
      expect(publicResult.html).toBe(originalPublic.html);
      expect(publicResult.path).toBe(originalPublic.path);
      expect(sharedResult).toMatchObject({
        kind: "content",
        display: updated.display,
        html: originalShared.html,
        canEdit: false,
      });
      expect((await getNote(container, token, note.id)).html).toBe(note.html);
    }
    const before = await container.unitOfWorkProvider.run(async (u) => ({
      identity: await u.publicNotes.find(note.id),
      settings: await u.sharing.find(note.id),
      note: await u.notes.findById(note.id),
      revisions: await u.revisions.list(note.id),
    }));
    if (!before.identity || !before.note)
      throw Error("fixture public note missing");
    const publicView = await readPublicNote(container, before.identity);
    expect((await readSharedNote(container, sharedToken, null)).kind).toBe(
      "content",
    );
    const trashed = await trashNote(container, token, {
      id: note.id,
      version: before.note.version,
      cancelProcessing: false,
    });
    await expect(
      readPublicNote(container, before.identity),
    ).rejects.toMatchObject({ code: "PUBLIC_TRASHED" });
    await expect(
      readSharedNote(container, sharedToken, null),
    ).rejects.toMatchObject({ code: "SHARE_NOT_FOUND" });
    expect((await listNotes(container, token)).map((item) => item.id)).toEqual(
      [],
    );
    expect(
      await container.unitOfWorkProvider.run(async (u) => ({
        identity: await u.publicNotes.find(note.id),
        settings: await u.sharing.find(note.id),
        revisions: await u.revisions.list(note.id),
      })),
    ).toEqual({
      identity: before.identity,
      settings: before.settings,
      revisions: before.revisions,
    });

    await restoreNote(container, token, trashed);
    expect((await readPublicNote(container, before.identity)).path).toBe(
      publicView.path,
    );
    expect((await readSharedNote(container, sharedToken, null)).kind).toBe(
      "content",
    );
    expect(
      (
        await getShareLink(
          container,
          token,
          (
            await getSharing(container, token, note.id)
          ).expected,
        )
      ).url,
    ).toBe(sharedUrl.url);
    expect(
      await container.unitOfWorkProvider.run(async (u) => ({
        identity: await u.publicNotes.find(note.id),
        settings: await u.sharing.find(note.id),
        note: await u.notes.findById(note.id),
        revisions: await u.revisions.list(note.id),
      })),
    ).toEqual({
      ...before,
      note: { ...before.note, version: before.note.version + 2 },
    });
  });

  it("rejects all normal note entrances while trashed and permits the same held revision on restore", async () => {
    const note = await create();
    const trashed = await trashNote(container, token, {
      id: note.id,
      version: note.version,
      cancelProcessing: false,
    });
    const calls = [
      () => getNote(container, token, note.id),
      () => getNoteVersion(container, token, note.id),
      () => listRevisions(container, token, note.id),
      () => getWysContext(container, token, note.id),
      () => renderNote(container, token, { noteId: note.id, html: note.html }),
      () =>
        renderRevision(container, token, { noteId: note.id, revisionNo: 1 }),
      () =>
        restoreRevision(container, token, {
          noteId: note.id,
          revisionNo: 1,
          expectedVersion: 1,
        }),
      () =>
        saveNote(container, token, {
          id: note.id,
          html: "<p>latest</p>",
          title: "latest",
        }),
      () =>
        setDisplayStyle(container, token, { id: note.id, style: "original" }),
      () => readReferences(container, token, note.id),
      () =>
        controlReference(container, token, { noteId: note.id, action: "on" }),
    ];
    for (const call of calls)
      await expect(call()).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await restoreNote(container, token, trashed);
    const context = await getWysContext(container, token, note.id);
    expect(context.version).toBe(2);
    expect(context.currentRevision?.capturedNoteVersion).toBe(0);
    const saved = await saveNote(container, token, {
      id: note.id,
      version: 0,
      title: note.title,
      html: "<p>WYS after restore</p>",
      wysOrigin: { revisionNo: 1, capturedNoteVersion: 0 },
    });
    expect(saved.note.version).toBe(3);
  });
  it("requires owner and current operation; stale confirmations and old undo cannot affect a newer trash generation", async () => {
    const note = await create();
    await expect(
      getTrashIntent(container, other, note.id),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await expect(
      trashNote(container, other, {
        id: note.id,
        version: 0,
        cancelProcessing: true,
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await saveNote(container, token, {
      id: note.id,
      title: "new",
      html: note.html,
    });
    await expect(
      trashNote(container, token, {
        id: note.id,
        version: 0,
        cancelProcessing: false,
      }),
    ).rejects.toMatchObject({ code: "TRASH_CHANGED" });
    const first = await trashNote(container, token, {
      id: note.id,
      version: 1,
      cancelProcessing: false,
    });
    await expect(restoreNote(container, other, first)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    expect((await listTrash(container, other)).items).toEqual([]);
    await restoreNote(container, token, first);
    const second = await trashNote(container, token, {
      id: note.id,
      version: 3,
      cancelProcessing: false,
    });
    await expect(restoreNote(container, token, first)).rejects.toMatchObject({
      code: "TRASH_CHANGED",
    });
    await restoreNote(container, token, second);
  });
  it("closes restoration at the exact clock boundary without deleting original records", async () => {
    const note = await create();
    const trashed = await trashNote(container, token, {
      id: note.id,
      version: 0,
      cancelProcessing: false,
    });
    now = new Date(new Date(trashed.purgeAfter).getTime() - 1);
    token = (
      await signIn(container, {
        email: "trash-a@example.test",
        password: "test-password-1234",
      })
    ).token;
    expect((await listTrash(container, token)).items[0]?.remainingDays).toBe(1);
    now = new Date(trashed.purgeAfter);
    expect((await listTrash(container, token)).items[0]).toMatchObject({
      remainingDays: 0,
      canRestore: false,
    });
    await expect(restoreNote(container, token, trashed)).rejects.toMatchObject({
      code: "TRASH_EXPIRED",
    });
    expect((await snapshot(note.id)).revisions).toHaveLength(1);
  });
  it("paginates only this owner's trash in deletion order with stable equal-time tie breaks", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 51; i++) {
      const note = await create(`page-${i}`);
      ids.push(note.id);
      await trashNote(container, token, {
        id: note.id,
        version: 0,
        cancelProcessing: false,
      });
    }
    const first = await listTrash(container, token);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).not.toBeNull();
    const cursor = JSON.parse(first.nextCursor ?? "{}");
    const second = await listTrash(container, token, {
      at: new Date(cursor.at),
      id: cursor.id,
    });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect([...first.items, ...second.items].map((n) => n.id)).toEqual(
      ids.sort().reverse(),
    );
    expect((await listTrash(container, other)).items).toEqual([]);
  });
  it("rechecks newly queued processing after confirmation and makes restore race single-use", async () => {
    const note = await create();
    const intent = await getTrashIntent(container, token, note.id);
    expect(intent.hasRunningJobs).toBe(false);
    await container.unitOfWorkProvider.run(async (c) => {
      const stored = await c.notes.findById(note.id);
      if (stored?.owner.kind !== "personal") throw Error("owner");
      await c.references.insertJob({
        id: container.idGenerator.next(),
        noteId: note.id,
        accountId: stored.owner.accountId,
        noteVersion: note.version,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: null,
        total: 0,
        completed: 0,
        cancelRequested: false,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      });
    });
    await expect(
      trashNote(container, token, {
        id: note.id,
        version: intent.version,
        cancelProcessing: false,
      }),
    ).rejects.toMatchObject({ code: "TRASH_PROCESSING" });
    expect((await getNote(container, token, note.id)).version).toBe(0);
    const deleted = await trashNote(container, token, {
      id: note.id,
      version: 0,
      cancelProcessing: true,
    });
    const outcomes = await Promise.allSettled([
      restoreNote(container, token, deleted),
      restoreNote(container, token, deleted),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getNote(container, token, note.id)).version).toBe(2);
  });
  it("rejects malformed persistent lifecycle tuples and leaves the active note intact", async () => {
    const note = await create();
    await expect(
      base.client.execute({
        sql: "update notes set lifecycle='trashed',trashed_at=1,trash_operation_id='test' where id=?",
        args: [note.id],
      }),
    ).rejects.toBeDefined();
    expect((await snapshot(note.id)).note?.lifecycle.kind).toBe("active");
  });
});

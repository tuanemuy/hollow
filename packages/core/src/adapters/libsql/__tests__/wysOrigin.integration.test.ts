import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { commitNote } from "@repo/core/application/note/commitNote";
import { getNote } from "@repo/core/application/note/getNote";
import {
  listRevisions,
  restoreRevision,
} from "@repo/core/application/note/history";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { getWysContext } from "@repo/core/application/note/wysContext";
import { editNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveNoteSchema } from "../../../../../../apps/web/app/presentation/hollowSchemas";
import { createTestContainer, type TestContainer } from "./helpers";

describe("WYS origin metadata in authorized note transactions", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let token: string;
  let other: string;
  let sequence: number;
  beforeEach(async () => {
    sequence = 0;
    base = await createTestContainer();
    const mail: string[] = [];
    container = createHollowContainer(base.db, "http://localhost:3000", {
      async send(message) {
        mail.push(message.text);
      },
    });
    async function account(email: string) {
      const registered = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mail.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registered.browserToken,
      );
      if (!session) throw Error("session");
      return session.token;
    }
    token = await account("wys-owner@example.test");
    other = await account("wys-other@example.test");
  });
  afterEach(() => base.close());
  const create = () =>
    saveNote(container, token, { title: "origin", html: "<p>original</p>" });
  async function currentRevision(id: string) {
    const head = await getWysContext(container, token, id);
    if (!head.currentRevision) throw Error("head");
    return head.currentRevision;
  }
  async function advance(id: string, count: number) {
    for (let i = 0; i < count; i++) {
      const next = sequence++;
      await saveNote(container, token, {
        id,
        title: `advance-${next}`,
        html: `<p>${next}</p>`,
      });
    }
  }
  it("captures immutable origin after same-owner stale base writes and carries it on later normal saves", async () => {
    const first = await create();
    const hint = await currentRevision(first.note.id);
    await advance(first.note.id, 2);
    const saved = await saveNote(container, token, {
      id: first.note.id,
      version: first.note.version,
      title: "converted",
      html: "<p>new transformed</p>",
      wysOrigin: hint,
    });
    expect(saved.wysContext).toMatchObject({
      currentRevision: { revisionNo: 4 },
      origin: { revisionNo: 1, available: true },
    });
    expect(
      (
        await container.unitOfWorkProvider.run((c) =>
          c.revisions.find(first.note.id, 1),
        )
      )?.capturedNoteVersion,
    ).toBe(0);
    expect(
      (await listRevisions(container, token, first.note.id)).items.find(
        (item) => item.revisionNo === 1,
      )?.capturedNoteVersion,
    ).toBe(hint.capturedNoteVersion);
    const later = await saveNote(container, token, {
      id: first.note.id,
      title: "later",
      html: "<p>later input</p>",
    });
    expect(later.wysContext.origin).toEqual(saved.wysContext.origin);
    expect(
      (await getWysContext(container, token, first.note.id)).origin,
    ).toEqual(saved.wysContext.origin);
  });
  it("refuses origin that this save would prune atomically; the adjacent retained origin succeeds", async () => {
    const first = await create();
    const oldest = await currentRevision(first.note.id);
    await advance(first.note.id, 1);
    const nextOldest = await currentRevision(first.note.id);
    await advance(first.note.id, 18);
    const before = await getNote(container, token, first.note.id);
    const revisions = await listRevisions(container, token, first.note.id);
    expect(revisions.items).toHaveLength(20);
    await expect(
      saveNote(container, token, {
        id: first.note.id,
        title: "blocked",
        html: "<p>must not commit</p>",
        wysOrigin: oldest,
      }),
    ).rejects.toMatchObject({ code: "WYS_ORIGIN_UNAVAILABLE" });
    expect(await getNote(container, token, first.note.id)).toEqual(before);
    expect(await listRevisions(container, token, first.note.id)).toEqual(
      revisions,
    );
    const saved = await saveNote(container, token, {
      id: first.note.id,
      title: "allowed",
      html: "<p>converted</p>",
      wysOrigin: nextOldest,
    });
    expect(saved.wysContext.origin).toEqual({ revisionNo: 2, available: true });
    expect(
      (await listRevisions(container, token, first.note.id)).items,
    ).toHaveLength(20);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.revisions.find(first.note.id, 1),
      ),
    ).toBeNull();
  });
  it("allows ordinary editing after origin is pruned, exposes unavailable, and never keeps 21 revisions", async () => {
    const first = await create();
    await saveNote(container, token, {
      id: first.note.id,
      title: "converted",
      html: "<p>converted</p>",
      wysOrigin: await currentRevision(first.note.id),
    });
    await advance(first.note.id, 20);
    expect(
      (await getWysContext(container, token, first.note.id)).origin,
    ).toEqual({ revisionNo: 1, available: false });
    const final = await saveNote(container, token, {
      id: first.note.id,
      title: "continues",
      html: "<p>continues</p>",
    });
    expect(final.wysContext.origin).toEqual({
      revisionNo: 1,
      available: false,
    });
    expect(
      (await listRevisions(container, token, first.note.id)).items,
    ).toHaveLength(20);
  });
  it("does not guard or bind an invalid hint for no-op and title-only writes", async () => {
    const first = await create();
    const hint = { revisionNo: 999, capturedNoteVersion: 999 };
    const noop = await saveNote(container, token, {
      id: first.note.id,
      title: first.note.title,
      html: first.note.html,
      wysOrigin: hint,
    });
    expect(noop.note.version).toBe(first.note.version);
    expect(noop.wysContext.origin).toBeNull();
    expect(
      (await listRevisions(container, token, first.note.id)).items,
    ).toHaveLength(1);
    const title = await saveNote(container, token, {
      id: first.note.id,
      title: "renamed",
      html: first.note.html,
      cause: "title",
      wysOrigin: hint,
    });
    expect(title.note.html).toBe(first.note.html);
    expect(title.wysContext.origin).toBeNull();
    expect(
      (await listRevisions(container, token, first.note.id)).items,
    ).toHaveLength(2);
    await expect(
      saveNote(container, token, {
        id: first.note.id,
        title: "renamed",
        html: "<p>actual body change</p>",
        cause: "title",
        wysOrigin: hint,
      }),
    ).rejects.toMatchObject({ code: "WYS_ORIGIN_UNAVAILABLE" });
  });
  it("inherits origin across style and system revisions without an extra retention pin", async () => {
    const first = await create();
    await saveNote(container, token, {
      id: first.note.id,
      title: "converted",
      html: "<p>converted</p>",
      wysOrigin: await currentRevision(first.note.id),
    });
    await setDisplayStyle(container, token, {
      id: first.note.id,
      style: "original",
    });
    await container.unitOfWorkProvider.run(async (context) => {
      const previous = await context.notes.findById(first.note.id);
      if (!previous) throw Error("note");
      await commitNote(container, context, {
        previous,
        note: editNote(
          previous,
          previous.title,
          "<p>worker result</p>",
          container.clock.now(),
        ),
        actor: { kind: "system", jobId: "test-job" },
        cause: "reference",
      });
    });
    expect(
      (await getWysContext(container, token, first.note.id)).origin,
    ).toEqual({ revisionNo: 1, available: true });
    const stored = await container.unitOfWorkProvider.run((c) =>
      c.revisions.list(first.note.id),
    );
    expect(stored.map((r) => r.originRevisionNo)).toEqual([1, 1, 1, null]);
    expect(
      (
        await base.client.execute(
          "SELECT count(*) as total FROM note_asset_references",
        )
      ).rows[0]?.total,
    ).toBe(0);
  });
  it("checks the exact immutable captured version and current owner before accepting a body conversion", async () => {
    const first = await create();
    const hint = await currentRevision(first.note.id);
    await expect(
      saveNote(container, token, {
        id: first.note.id,
        title: "bad",
        html: "<p>bad</p>",
        wysOrigin: {
          ...hint,
          capturedNoteVersion: hint.capturedNoteVersion + 1,
        },
      }),
    ).rejects.toMatchObject({ code: "WYS_ORIGIN_UNAVAILABLE" });
    await expect(
      saveNote(container, other, {
        id: first.note.id,
        title: "bad",
        html: "<p>bad</p>",
        wysOrigin: hint,
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await expect(
      getWysContext(container, other, first.note.id),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    expect(
      (await listRevisions(container, token, first.note.id)).items,
    ).toHaveLength(1);
  });
  it("keeps exact actor confirmation independent from a still-valid origin", async () => {
    const first = await create();
    const hint = await currentRevision(first.note.id);
    async function actorWrite(title: string) {
      await container.unitOfWorkProvider.run(async (c) => {
        const previous = await c.notes.findById(first.note.id);
        if (!previous) throw Error("note");
        await commitNote(container, c, {
          previous,
          note: editNote(previous, title, previous.html, container.clock.now()),
          actor: { kind: "user", accountId: "future-actor" },
          cause: "manual",
        });
      });
    }
    await actorWrite("other 1");
    const confirmation = (await getNote(container, token, first.note.id))
      .version;
    await actorWrite("other 2");
    const input = {
      id: first.note.id,
      version: 0,
      confirmedVersion: confirmation,
      title: "mine",
      html: "<p>mine</p>",
      wysOrigin: hint,
    };
    await expect(saveNote(container, token, input)).rejects.toMatchObject({
      code: "NOTE_CONFLICT",
    });
    const latest = (await getNote(container, token, first.note.id)).version;
    const saved = await saveNote(container, token, {
      ...input,
      confirmedVersion: latest,
    });
    expect(saved.wysContext.origin).toEqual({ revisionNo: 1, available: true });
  });
  it("restoration clears origin instead of inheriting a historical conversion hint", async () => {
    const first = await create();
    const converted = await saveNote(container, token, {
      id: first.note.id,
      title: "converted",
      html: "<p>converted</p>",
      wysOrigin: await currentRevision(first.note.id),
    });
    const restored = await restoreRevision(container, token, {
      noteId: first.note.id,
      revisionNo: 1,
      expectedVersion: converted.note.version,
    });
    expect(restored.html).toBe(first.note.html);
    expect(restored.wysContext.origin).toBeNull();
    const later = await saveNote(container, token, {
      id: first.note.id,
      title: "ordinary",
      html: "<p>ordinary</p>",
    });
    expect(later.wysContext.origin).toBeNull();
  });
  it("keeps new creation free of baselines and rejects revision hints without an existing id", async () => {
    const first = await create();
    expect(first.wysContext.currentRevision?.revisionNo).toBe(1);
    expect(first.wysContext.origin).toBeNull();
    await expect(
      saveNote(container, token, {
        title: "invalid",
        html: "<p>new</p>",
        wysOrigin: { revisionNo: 1, capturedNoteVersion: 0 },
      }),
    ).rejects.toMatchObject({ code: "WYS_ORIGIN_UNAVAILABLE" });
    expect(
      saveNoteSchema.safeParse({
        title: "new",
        html: "<p>new</p>",
        wysOrigin: { revisionNo: 1, capturedNoteVersion: 0 },
      }).success,
    ).toBe(false);
    for (const revisionNo of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        saveNoteSchema.safeParse({
          id: first.note.id,
          title: "x",
          html: "x",
          wysOrigin: { revisionNo, capturedNoteVersion: 0 },
        }).success,
      ).toBe(false);
    expect(
      (await base.client.execute("SELECT count(*) as total FROM notes")).rows[0]
        ?.total,
    ).toBe(1);
  });
});

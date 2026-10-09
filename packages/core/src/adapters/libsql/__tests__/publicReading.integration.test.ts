import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import { readPublicNote } from "@repo/core/application/publication/reading";
import { setWorkspacePublication } from "@repo/core/application/publication/workspace";
import { readSharedNote } from "@repo/core/application/sharing/reading";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createNote } from "@repo/core/domain/note/entity";
import type { ReferenceEntry } from "@repo/core/domain/reference/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { accounts, sessions } from "../hollowSchema";
import { LibsqlReferenceRepository } from "../repositories/referenceRepository";
import { createTestContainer, type TestContainer } from "./helpers";

describe("current public note identity and response adoption", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let now: Date;
  let noteId: string;
  const actor = "00000000-0000-4000-8000-000000000001";
  const session = "public-reading-fixture";
  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-20T00:00:00Z");
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      sharing: {
        protector: {
          protect: (token) => token,
          reveal: (envelope) => envelope,
          needsRotation: () => false,
        },
        passwordWork: { run: (operation) => operation(), async stop() {} },
      },
    };
    await base.db.insert(accounts).values({
      id: actor,
      email: "public-reading@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    const n = createNote(
      {
        id: c.idGenerator.next(),
        accountId: actor,
        title: "public title",
        html: '<p>current content</p><a href="https://example.test/normal">normal</a>',
        text: "current content",
      },
      now,
    );
    noteId = n.id;
    await c.unitOfWorkProvider.run((u) => u.notes.insert(n));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    base.close();
  });
  const profile = async (handle = "public-person") => {
    const p = await getProfile(c, session);
    return saveProfile(c, session, {
      displayName: "actual author",
      handle,
      bio: "bio",
      nameVersion: p.nameVersion,
      profileVersion: p.profileVersion,
      confirmHandleChange: true,
    });
  };
  const change = async (
    operation: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, session, {
      expected: (await getSharing(c, session, noteId)).expected,
      operation,
    });
  const publish = () =>
    change({
      kind: "visibility",
      visibility: "public",
      confirmPasswordRemoval: true,
    });
  const identity = async () => {
    const id = await c.unitOfWorkProvider.run((u) =>
      u.publicNotes.find(noteId),
    );
    if (!id) throw Error("identity");
    return id;
  };
  const read = async () => readPublicNote(c, await identity());
  const ledger = async () => {
    const common = {
      noteId,
      location: "private-source-location",
      assetId: "private-asset-id",
      finalUrl: "https://fixture.invalid/private-final-url",
      createdAt: now,
      updatedAt: now,
    };
    const entries: readonly ReferenceEntry[] = [
      {
        ...common,
        id: "private-image-entry",
        kind: "image",
        url: "https://fixture.invalid/image.png",
        current: true,
        state: "acquired",
        bytes: 42,
        reason: null,
      },
      {
        ...common,
        id: "private-css-entry",
        kind: "stylesheet",
        url: "https://fixture.invalid/style.css",
        current: true,
        state: "failed",
        bytes: 0,
        reason: "時間切れ",
      },
      {
        ...common,
        id: "private-data-entry",
        kind: "video",
        url: "data:video/mp4;base64,cHJpdmF0ZS1wYXlsb2Fk",
        current: false,
        state: "cancelled",
        bytes: 0,
        reason: "取消",
      },
    ];
    await c.unitOfWorkProvider.run(async (u) => {
      for (const [index, entry] of entries.entries()) {
        const createdAt = new Date(now.getTime() - entries.length + index);
        await u.references.saveEntry({
          ...entry,
          createdAt,
          updatedAt: createdAt,
        });
      }
    });
    return [
      {
        kind: "image",
        source: { kind: "url", url: "https://fixture.invalid/image.png" },
        current: true,
        state: "acquired",
        bytes: 42,
        reason: null,
      },
      {
        kind: "stylesheet",
        source: { kind: "url", url: "https://fixture.invalid/style.css" },
        current: true,
        state: "failed",
        bytes: 0,
        reason: "時間切れ",
      },
      {
        kind: "video",
        source: { kind: "data", mediaType: "video/mp4" },
        current: false,
        state: "cancelled",
        bytes: 0,
        reason: "取消",
      },
    ];
  };
  it("projects only the permanent public reference ledger after terminal job history is pruned", async () => {
    await profile();
    await publish();
    const expected = await ledger();
    const jobId = c.idGenerator.next();
    await c.unitOfWorkProvider.run((u) =>
      u.references.insertJob({
        id: jobId,
        noteId,
        accountId: actor,
        noteVersion: 0,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: null,
        total: 3,
        completed: 3,
        cancelRequested: false,
        state: "succeeded",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      }),
    );
    const before = await read();
    expect(before.references).toEqual(expected);
    const json = JSON.stringify(before.references);
    for (const hidden of [
      noteId,
      actor,
      jobId,
      "private-image-entry",
      "private-css-entry",
      "private-data-entry",
      "private-asset-id",
      "private-final-url",
      "private-source-location",
      "cHJpdmF0ZS1wYXlsb2Fk",
      now.toISOString(),
    ])
      expect(json).not.toContain(hidden);
    await c.unitOfWorkProvider.run((u) =>
      u.references.pruneJobs(new Date(now.getTime() + 91 * 86400_000)),
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.references.job(jobId)),
    ).toBeNull();
    expect((await read()).references).toEqual(expected);
  });
  it("adopts a reference-only change during public rendering and rejects repeated ledger contention", async () => {
    await profile();
    await publish();
    const expected = await ledger();
    const before = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    let inspections = 0;
    let repeated = false;
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
            if (inspections === 1 || repeated)
              await c.unitOfWorkProvider.run(async (u) => {
                const entry = (await u.references.entries(noteId)).find(
                  (e) => e.kind === "stylesheet",
                );
                if (!entry) throw Error("stylesheet ledger");
                await u.references.saveEntry({
                  ...entry,
                  reason: `${repeated ? "競合" : "再確認"}${inspections}`,
                });
              });
            return [];
          },
        },
      },
    };
    const selector = await identity();
    const content = await readPublicNote(rendering, selector);
    expect(content.references).toEqual([
      expected[0],
      { ...expected[1], reason: "再確認1" },
      expected[2],
    ]);
    expect(inspections).toBe(2);
    repeated = true;
    inspections = 0;
    await expect(readPublicNote(rendering, selector)).rejects.toMatchObject({
      code: "SHARE_SNAPSHOT_CHANGED",
    });
    expect(inspections).toBe(2);
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).toEqual(before);
  });
  it("requires current owner handle, atomically issues identity/token and leaves note bytes/version/time unchanged", async () => {
    const before = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    await expect(publish()).rejects.toMatchObject({
      code: "SHARE_PUBLIC_HANDLE_REQUIRED",
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    await profile();
    const shared = await publish();
    expect(shared.publicUrl).toMatch(/\/p\/[a-f0-9-]{36}\/1$/);
    const after = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    expect(after).toEqual({ ...before, visibility: "public" });
    expect(await read()).toMatchObject({
      title: "public title",
      author: { kind: "named", displayName: "actual author" },
      owner: { url: "/@public-person" },
    });
  });
  it("requires a current WS slug without issuing secrets or identity and keeps WS publication independent", async () => {
    const workspace = await createWorkspace(c, session, {
      name: "非公開WS",
      description: "内部説明",
    });
    const saved = await saveNote(c, session, {
      workspaceId: workspace.id,
      title: "個別公開",
      html: "<p>本文</p>",
    });
    const initial = await getSharing(c, session, saved.note.id);
    expect(initial.publicPrerequisite).toBe("slug");
    const before = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(saved.note.id),
    );
    await expect(
      changeSharing(c, session, {
        expected: initial.expected,
        operation: {
          kind: "visibility",
          visibility: "public",
          confirmPasswordRemoval: false,
        },
      }),
    ).rejects.toMatchObject({ code: "SHARE_PUBLIC_SLUG_REQUIRED" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(saved.note.id)),
    ).toEqual(before);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(saved.note.id)),
    ).toBeNull();
    const settings = await getWorkspaceSettings(c, session, {
      workspaceId: workspace.id,
    });
    await updateWorkspaceSettings(c, session, {
      workspaceId: workspace.id,
      settingsVersion: settings.settingsVersion,
      name: settings.name,
      description: settings.description,
      slug: "individual-public",
    });
    const fresh = await getSharing(c, session, saved.note.id);
    const published = await changeSharing(c, session, {
      expected: fresh.expected,
      operation: {
        kind: "visibility",
        visibility: "public",
        confirmPasswordRemoval: false,
      },
    });
    expect(published.publicUrl).toMatch(/\/p\/[a-f0-9-]{36}\/1$/);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspacePublications.find(workspace.id),
      ),
    ).toMatchObject({ pagePublic: false });
  });
  it("password removal requires confirmation and revokes grants without replacing an existing token", async () => {
    await profile();
    await change({ kind: "password", password: "fixture-password" });
    const before = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    await expect(
      change({
        kind: "visibility",
        visibility: "public",
        confirmPasswordRemoval: false,
      }),
    ).rejects.toMatchObject({ code: "SHARE_PUBLIC_PASSWORD_CONFIRM" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    await publish();
    const after = await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId));
    expect(after?.tokenHash).toBe(before?.tokenHash);
    expect(after?.linkGeneration).toBe(before?.linkGeneration);
    expect(after?.passwordHash).toBeNull();
    expect(after?.grantEpoch).toBe((before?.grantEpoch ?? 0) + 1);
  });
  it("private/link and republish preserve canonical identity but never revive an old access epoch", async () => {
    await profile();
    await publish();
    await ledger();
    const entries = vi.spyOn(LibsqlReferenceRepository.prototype, "entries");
    const original = await identity();
    await change({ kind: "visibility", visibility: "private" });
    entries.mockClear();
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(entries).not.toHaveBeenCalled();
    await publish();
    expect(await identity()).toEqual({ ...original, accessEpoch: 1 });
    await change({ kind: "visibility", visibility: "link" });
    entries.mockClear();
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(entries).not.toHaveBeenCalled();
    await publish();
    expect(await identity()).toEqual({ ...original, accessEpoch: 2 });
  });
  it("handle/SH04 do not change public URL and only current token can independently read public", async () => {
    await profile();
    await publish();
    const original = await identity();
    const oldUrl = (
      await getShareLink(
        c,
        session,
        (
          await getSharing(c, session, noteId)
        ).expected,
      )
    ).url;
    const oldToken = new URL(oldUrl).pathname.slice(3);
    expect((await readSharedNote(c, oldToken, null)).kind).toBe("content");
    await profile("renamed-person");
    await change({ kind: "regenerate" });
    expect(await identity()).toEqual(original);
    expect((await read()).owner?.url).toBe("/@renamed-person");
    await expect(readSharedNote(c, oldToken, null)).rejects.toMatchObject({
      code: "SHARE_NOT_FOUND",
    });
  });
  it("current ownership selects public page and private WS never contributes its metadata", async () => {
    await profile();
    await publish();
    const original = await identity();
    const ws = await createWorkspace(c, session, {
      name: "SECRET WORKSPACE",
      description: "SECRET DESCRIPTION",
      slug: "secret-workspace",
    });
    await base.db.run(
      sql`update notes set owner_workspace_id=${ws.id},owner_account_id=null,ownership_generation=ownership_generation+1 where id=${noteId}`,
    );
    expect(await identity()).toEqual(original);
    const hidden = await read();
    expect(hidden.owner).toBeNull();
    expect(JSON.stringify(hidden)).not.toContain("SECRET");
    expect(JSON.stringify(hidden)).not.toContain("secret-workspace");
    await setWorkspacePublication(c, session, {
      workspaceId: ws.id,
      pagePublic: true,
      settingsVersion: 0,
      publicationVersion: 0,
    });
    expect((await read()).owner).toEqual({
      label: "SECRET WORKSPACE",
      url: "/w/secret-workspace",
    });
    await setWorkspacePublication(c, session, {
      workspaceId: ws.id,
      pagePublic: false,
      settingsVersion: 0,
      publicationVersion: 1,
    });
    expect((await read()).owner).toBeNull();
  });
  it("returns only public trash as gone and restoration uses the same URL", async () => {
    await profile();
    await publish();
    const expected = await ledger();
    const entries = vi.spyOn(LibsqlReferenceRepository.prototype, "entries");
    const original = await identity();
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=${now.getTime()},purge_after=${now.getTime() + 86400_000},trash_operation_id='fixture' where id=${noteId}`,
    );
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_TRASHED" });
    expect(entries).not.toHaveBeenCalled();
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${noteId}`,
    );
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(entries).not.toHaveBeenCalled();
    await base.db.run(
      sql`update note_sharing set visibility='public' where note_id=${noteId}`,
    );
    await base.db.run(
      sql`update notes set lifecycle='active',trashed_at=null,purge_after=null,trash_operation_id=null where id=${noteId}`,
    );
    const restored = await read();
    expect(restored.path).toBe(`/p/${original.publicId}/1`);
    expect(restored.references).toEqual(expected);
    await base.db.run(
      sql`update notes set lifecycle='purging',trash_operation_id='fixture-purge' where id=${noteId}`,
    );
    entries.mockClear();
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(entries).not.toHaveBeenCalled();
  });
  it("rejects a revoke during rendering rather than adopting the old body", async () => {
    await profile();
    await publish();
    const actual = c.htmlSanitizer.render.bind(c.htmlSanitizer);
    let released = false;
    vi.spyOn(c.htmlSanitizer, "render").mockImplementation((...args) => {
      released = true;
      return actual(...args);
    });
    const run = c.unitOfWorkProvider.run.bind(c.unitOfWorkProvider);
    let changed = false;
    vi.spyOn(c.unitOfWorkProvider, "run").mockImplementation(async (fn) => {
      if (released && !changed) {
        changed = true;
        await base.db.run(
          sql`update note_sharing set visibility='private',version=version+1 where note_id=${noteId}`,
        );
      }
      return run(fn);
    });
    await expect(read()).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
  });
});

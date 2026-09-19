import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  checkHandle,
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  getWorkspacePublication,
  setWorkspacePublication,
} from "@repo/core/application/publication/workspace";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createNote } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("public identity, profile and publication boundaries", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let now: Date;
  const actor = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  const token = "publication-fixture-session";
  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-20T00:00:00Z");
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
    };
    await base.db.insert(accounts).values(
      [actor, other].map((id, i) => ({
        id,
        email: `publication-${i}@example.test`,
        passwordHash: "fixture",
        createdAt: now,
        verifiedAt: now,
      })),
    );
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(token),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
  });
  afterEach(() => base.close());
  const makeNote = async () => {
    const n = createNote(
      {
        id: c.idGenerator.next(),
        accountId: actor,
        title: "公開候補",
        html: "<p>本文</p>",
        text: "本文",
      },
      now,
    );
    await c.unitOfWorkProvider.run((u) => u.notes.insert(n));
    return n;
  };
  const identify = async (noteId: string) => {
    const identity = {
      noteId,
      publicId: c.idGenerator.next(),
      urlGeneration: 1,
      accessEpoch: 0,
      createdAt: now,
    };
    await c.unitOfWorkProvider.run((u) => u.publicNotes.create(identity));
    return identity;
  };
  const publish = async (noteId: string) =>
    base.db.run(
      sql`update note_sharing set visibility='public',link_generation=1,token_hash=${`fixture-${noteId}`},token_envelope='fixture' where note_id=${noteId}`,
    );
  const save = async (
    overrides: Partial<Parameters<typeof saveProfile>[2]> = {},
  ) => {
    const p = await getProfile(c, token);
    return saveProfile(c, token, {
      displayName: p.displayName ?? "",
      handle: p.handle,
      bio: p.bio,
      nameVersion: p.nameVersion,
      profileVersion: p.profileVersion,
      confirmHandleChange: true,
      ...overrides,
    });
  };
  it("requires identity, forbids standalone removal/rekey and permits the real note cascade", async () => {
    const n = await makeNote();
    await expect(publish(n.id)).rejects.toThrow();
    const identity = await identify(n.id);
    await publish(n.id);
    await expect(
      base.db.run(
        sql`delete from note_public_identities where note_id=${n.id}`,
      ),
    ).rejects.toThrow();
    await expect(
      base.db.run(
        sql`update note_public_identities set public_id='replacement' where note_id=${n.id}`,
      ),
    ).rejects.toThrow();
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${n.id}`,
    );
    await expect(
      base.db.run(
        sql`delete from note_public_identities where note_id=${n.id}`,
      ),
    ).rejects.toThrow();
    await c.unitOfWorkProvider.run((u) => u.publicNotes.revoke(n.id, 0));
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.publicNotes.resolve(identity.publicId, 1),
      ),
    ).toMatchObject({ ...identity, accessEpoch: 1 });
    await base.db.run(sql`delete from notes where id=${n.id}`);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(n.id)),
    ).toBeNull();
    expect(
      (await base.client.execute("pragma foreign_key_check")).rows,
    ).toHaveLength(0);
  });
  it("rolls back first identity and profile updates atomically", async () => {
    const n = await makeNote();
    await expect(
      c.unitOfWorkProvider.run(async (u) => {
        await u.publicNotes.create({
          noteId: n.id,
          publicId: c.idGenerator.next(),
          urlGeneration: 1,
          accessEpoch: 0,
          createdAt: now,
        });
        await u.publicProfiles.ensure(actor);
        throw new Error("fixture rollback");
      }),
    ).rejects.toThrow();
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(n.id)),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicProfiles.find(actor)),
    ).toBeNull();
  });
  it("saves real name/normalized handle/bio together and rejects either stale version without partial write", async () => {
    const p = await save({
      displayName: "本人",
      handle: "  Alice-26  ",
      bio: " 一行\n二行 ",
    });
    expect(p).toMatchObject({
      displayName: "本人",
      handle: "alice-26",
      bio: "一行\n二行",
      nameVersion: 1,
      profileVersion: 1,
      url: "/@alice-26",
    });
    for (const versions of [
      { nameVersion: 0, profileVersion: 1 },
      { nameVersion: 1, profileVersion: 0 },
    ])
      await expect(
        save({
          ...versions,
          displayName: "不採用",
          handle: "other-handle",
          bio: "不採用",
        }),
      ).rejects.toMatchObject({ code: "PROFILE_CHANGED" });
    expect(await getProfile(c, token)).toEqual(p);
  });
  it("requires explicit rename confirmation, permits old handle reuse and candidates never reserve", async () => {
    await save({ handle: "alice-name" });
    await expect(
      save({ handle: "changed-name", confirmHandleChange: false }),
    ).rejects.toMatchObject({ code: "PROFILE_HANDLE_CONFIRM" });
    await c.unitOfWorkProvider.run(async (u) => {
      await u.publicProfiles.ensure(other);
      const p = await u.publicProfiles.find(other);
      if (!p) throw Error("fixture");
      await u.publicProfiles.save({ ...p, handle: "taken-name" }, 0);
    });
    const check = await checkHandle(c, token, "taken-name");
    expect(check.available).toBe(false);
    expect(check.candidates).toHaveLength(3);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.publicProfiles.findByHandle(check.candidates[0] ?? ""),
      ),
    ).toBeNull();
    await save({ handle: "new-name" });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.publicProfiles.findByHandle("alice-name"),
      ),
    ).toBeNull();
    await c.unitOfWorkProvider.run(async (u) => {
      const p = await u.publicProfiles.find(other);
      if (!p) throw Error("fixture");
      expect(
        await u.publicProfiles.save({ ...p, handle: "alice-name" }, p.version),
      ).toBe(true);
    });
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.publicProfiles.findByHandle("alice-name"),
        )
      )?.accountId,
    ).toBe(other);
  });
  it("includes personally owned public trash in handle release guard without changing any note", async () => {
    await save({ handle: "alice-name" });
    const n = await makeNote();
    await identify(n.id);
    await publish(n.id);
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=${now.getTime()},purge_after=${now.getTime() + 86400_000},trash_operation_id='fixture-trash' where id=${n.id}`,
    );
    await expect(save({ handle: null })).rejects.toMatchObject({
      code: "PROFILE_PUBLIC_NOTES_REMAIN",
    });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.sharing.find(n.id)))?.visibility,
    ).toBe("public");
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${n.id}`,
    );
    expect((await save({ handle: null })).handle).toBeNull();
  });
  it("rejects foreign/nonready icon pointers and requires current verified session for adoption", async () => {
    await save({ handle: "alice-name" });
    const p = await getProfile(c, token);
    const id = c.idGenerator.next();
    await c.unitOfWorkProvider.run((u) =>
      u.profileIcons.create({
        id,
        accountId: actor,
        sessionHash: c.tokens.hash(token),
        profileVersion: p.profileVersion,
        inputBytes: 10,
        mime: "image/png",
        storageKey: `profile-icon-${id}`,
        bytes: 10,
        state: "awaiting",
        output: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30_000),
        nextAttemptAt: now,
      }),
    );
    await expect(
      base.db.run(
        sql`update account_public_profiles set icon_id=${id} where account_id=${actor}`,
      ),
    ).rejects.toThrow();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.publicProfiles.ensure(other);
      await u.profileIcons.processing(id, new Date(now.getTime() + 30_000));
      await u.profileIcons.writing(id, {
        bytes: 8,
        sha256: "a".repeat(64),
        width: 1,
        height: 1,
      });
    });
    await expect(
      base.db.run(
        sql`update account_public_profiles set icon_id=${id} where account_id=${actor}`,
      ),
    ).rejects.toThrow();
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.profileIcons.adopt(id, actor, p.profileVersion, now),
      ),
    ).toBe(true);
    await expect(
      base.db.run(
        sql`update account_public_profiles set icon_id=${id} where account_id=${other}`,
      ),
    ).rejects.toThrow();
    await expect(
      base.db.run(
        sql`update account_profile_icons set state='cleanup' where id=${id}`,
      ),
    ).rejects.toThrow();
    await expect(
      base.db.run(sql`delete from account_profile_icons where id=${id}`),
    ).rejects.toThrow();
  });
  it("keeps WS publication and note visibility independent and fences stale settings versions", async () => {
    const w = await createWorkspace(c, token, {
      name: "公開WS",
      description: "説明",
      slug: "public-workspace",
    });
    const before = await getWorkspacePublication(c, token, w.id);
    const published = await setWorkspacePublication(c, token, {
      workspaceId: w.id,
      pagePublic: true,
      settingsVersion: before.settingsVersion,
      publicationVersion: before.publicationVersion,
    });
    expect(published).toMatchObject({
      pagePublic: true,
      url: "http://localhost:3000/w/public-workspace",
      publicationVersion: 1,
    });
    await expect(
      base.db.run(sql`update workspaces set slug=null where id=${w.id}`),
    ).rejects.toThrow();
    await expect(
      setWorkspacePublication(c, token, {
        workspaceId: w.id,
        pagePublic: false,
        settingsVersion: before.settingsVersion,
        publicationVersion: 0,
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_PUBLICATION_CHANGED" });
    await setWorkspacePublication(c, token, {
      workspaceId: w.id,
      pagePublic: false,
      settingsVersion: before.settingsVersion,
      publicationVersion: 1,
    });
    await base.db.run(sql`update workspaces set slug=null where id=${w.id}`);
    await expect(
      setWorkspacePublication(c, token, {
        workspaceId: w.id,
        pagePublic: true,
        settingsVersion: before.settingsVersion,
        publicationVersion: 2,
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_PUBLIC_SLUG_REQUIRED" });
  });
  it("reserves exactly 30 browser / 300 global in fixed windows under concurrency without extending rejected windows", async () => {
    const reserve = (browser: string | null) =>
      c.unitOfWorkProvider.run((u) =>
        u.publicDiscoveryRates.reserve(browser, now),
      );
    const results = await Promise.all(
      Array.from({ length: 32 }, () => reserve("same-browser")),
    );
    expect(results.filter((x) => x === null)).toHaveLength(30);
    const blocked = new Date(now.getTime() + 60_000);
    expect(await reserve("same-browser")).toEqual(blocked);
    for (let i = 0; i < 270; i++) expect(await reserve(null)).toBeNull();
    expect(await reserve("new-browser")).toEqual(blocked);
    now = new Date(now.getTime() + 59_999);
    expect(await reserve("new-browser")).toEqual(blocked);
    now = new Date(now.getTime() + 1);
    expect(await reserve("same-browser")).toBeNull();
  });
});

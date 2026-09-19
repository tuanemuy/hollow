import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  acceptProfileIcon,
  beginProfileIcon,
  getProfileIcon,
  removeProfileIcon,
  sweepProfileIcons,
} from "@repo/core/application/publication/icons";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedWorkspaceIconProcessor } from "../../node/workspaceIconProcessor";
import { createWorkspaceIconRunner } from "../../node/workspaceIconRunner";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
describe("personal profile icon physical ownership", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let storage: CoordinatedObjectStorage;
  let dir: string;
  let now: Date;
  let png: Uint8Array;
  const actor = "00000000-0000-4000-8000-000000000001";
  const token = "profile-icon-fixture";
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(join(tmpdir(), "hollow-profile-icon-"));
    now = new Date("2026-09-20T00:00:00Z");
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
    };
    storage = new CoordinatedObjectStorage(
      dir,
      common.unitOfWorkProvider,
      common.clock,
    );
    c = {
      ...common,
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
      workspaceIcon: {
        processor: new IsolatedWorkspaceIconProcessor(),
        wake() {},
      },
    };
    await storage.recoverOwners();
    await base.db.insert(accounts).values({
      id: actor,
      email: "personal-icon@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(token),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    png = await sharp({
      create: { width: 64, height: 48, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const usage = () =>
    c.unitOfWorkProvider.run((u) =>
      u.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
    );
  const begin = async () =>
    beginProfileIcon(c, token, {
      profileVersion: (await getProfile(c, token)).profileVersion,
      bytes: png.length,
      mime: "image/png",
    });
  const upload = async () =>
    acceptProfileIcon(c, token, (await begin()).id, stream(png));
  it("reserves personal bytes, adopts current safe output and keeps old debt until actual removal", async () => {
    const first = await upload();
    if (!first.icon) throw Error("icon");
    const old = await c.unitOfWorkProvider.run((u) =>
      u.profileIcons.find(first.icon?.id ?? ""),
    );
    if (!old) throw Error("row");
    expect(await usage()).toBe(old.bytes);
    expect((await storage.read(old.storageKey)).length).toBe(old.bytes);
    const next = await upload();
    if (!next.icon) throw Error("icon");
    const newer = await c.unitOfWorkProvider.run((u) =>
      u.profileIcons.find(next.icon?.id ?? ""),
    );
    if (!newer) throw Error("row");
    expect(await usage()).toBe(old.bytes + newer.bytes);
    await expect(
      getProfileIcon(c, token, { iconId: old.id }),
    ).rejects.toMatchObject({ code: "PROFILE_ICON_NOT_FOUND" });
    await sweepProfileIcons(c);
    expect(await usage()).toBe(newer.bytes);
    await expect(stat(join(dir, old.storageKey))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await removeProfileIcon(c, token, next.profileVersion);
    expect(await usage()).toBe(newer.bytes);
    await sweepProfileIcons(c);
    expect(await usage()).toBe(0);
  });
  it("old handle and pointer cannot authorize a public icon after a rename or removal", async () => {
    const first = await upload();
    if (!first.icon) throw Error("icon");
    let p = await saveProfile(c, token, {
      displayName: "本人",
      handle: "first-name",
      bio: "",
      nameVersion: first.nameVersion,
      profileVersion: first.profileVersion,
      confirmHandleChange: true,
    });
    await expect(
      getProfileIcon(c, null, { handle: "first-name", iconId: first.icon.id }),
    ).resolves.toHaveProperty("storageKey");
    p = await saveProfile(c, token, {
      displayName: "本人",
      handle: "second-name",
      bio: "",
      nameVersion: p.nameVersion,
      profileVersion: p.profileVersion,
      confirmHandleChange: true,
    });
    await expect(
      getProfileIcon(c, null, { handle: "first-name", iconId: first.icon.id }),
    ).rejects.toMatchObject({ code: "PROFILE_ICON_NOT_FOUND" });
    await removeProfileIcon(c, token, p.profileVersion);
    await expect(
      getProfileIcon(c, null, { handle: "second-name", iconId: first.icon.id }),
    ).rejects.toMatchObject({ code: "PROFILE_ICON_NOT_FOUND" });
  });
  it("new profile version defeats late processing, retains existing pointer and cleans only new debt", async () => {
    const first = await upload();
    const pending = await begin();
    const processor = c.workspaceIcon?.processor;
    if (!processor) throw Error("processor");
    const process = processor.process.bind(processor);
    vi.spyOn(processor, "process").mockImplementationOnce(async (input) => {
      const result = await process(input);
      await saveProfile(c, token, {
        displayName: "changed",
        handle: null,
        bio: "",
        nameVersion: first.nameVersion,
        profileVersion: first.profileVersion,
        confirmHandleChange: true,
      });
      return result;
    });
    await expect(
      acceptProfileIcon(c, token, pending.id, stream(png)),
    ).rejects.toMatchObject({ code: "PROFILE_CHANGED" });
    expect((await getProfile(c, token)).icon).toEqual(first.icon);
    const before = await usage();
    await sweepProfileIcons(c);
    expect(await usage()).toBe(before - png.length);
  });
  it("current clock fences session expiry at each register/publish instead of reusing registration time", async () => {
    const row = await begin();
    await c.unitOfWorkProvider.run((u) =>
      u.profileIcons.processing(row.id, new Date(now.getTime() + 300_000)),
    );
    await c.unitOfWorkProvider.run((u) =>
      u.objectOperations.beginWrite(
        "fixture-writer",
        "fixture-runtime",
        { kind: "profile-icon-upload", id: row.id },
        now,
      ),
    );
    await base.client.execute({
      sql: "update sessions set expires_at=? where account_id=?",
      args: [now.getTime() + 1000, actor],
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.objectOperations.canPublish("fixture-writer", now),
      ),
    ).toBe(true);
    now = new Date(now.getTime() + 1000);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.objectOperations.canPublish("fixture-writer", now),
      ),
    ).toBe(false);
    await expect(
      c.unitOfWorkProvider.run((u) =>
        u.objectOperations.registerKey("fixture-writer", "new-key", now),
      ),
    ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
    await c.unitOfWorkProvider.run((u) =>
      u.objectOperations.endWrite("fixture-writer"),
    );
  });
  it("session revoked during actual write prevents late adoption; active writer blocks cleanup until finally", async () => {
    const row = await begin();
    const put = storage.putBounded.bind(storage);
    let release = () => {};
    let entered = () => {};
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    vi.spyOn(storage, "putBounded").mockImplementationOnce(async (...args) => {
      const result = await put(...args);
      entered();
      await new Promise<void>((r) => {
        release = r;
      });
      return result;
    });
    const pending = acceptProfileIcon(c, token, row.id, stream(png));
    const rejected = expect(pending).rejects.toBeDefined();
    await reached;
    await c.unitOfWorkProvider.run((u) =>
      u.accounts.deleteSession(c.tokens.hash(token)),
    );
    now = new Date(now.getTime() + 600_000);
    const bytes = await usage();
    await sweepProfileIcons(c);
    expect(await usage()).toBe(bytes);
    await expect(
      stat(join(dir, `profile-icon-${row.id}`)),
    ).resolves.toBeDefined();
    release();
    await rejected;
    await sweepProfileIcons(c);
    expect(await usage()).toBe(0);
    await expect(
      stat(join(dir, `profile-icon-${row.id}`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("remove failure keeps debt, retry removes exact old object without losing current icon", async () => {
    const one = await upload();
    const two = await upload();
    const before = await usage();
    vi.spyOn(storage, "removeClaimed").mockRejectedValueOnce(
      new Error("fixture remove"),
    );
    await sweepProfileIcons(c);
    expect(await usage()).toBe(before);
    expect((await getProfile(c, token)).icon).toEqual(two.icon);
    now = new Date(now.getTime() + 30_000);
    await sweepProfileIcons(c);
    expect(await usage()).toBeLessThan(before);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.profileIcons.find(one.icon?.id ?? ""),
      ),
    ).toBeNull();
  });
  it("quota and corrupt input preserve current profile and reservation until physical cleanup", async () => {
    const row = await begin();
    await base.client.execute({
      sql: "update account_profile_icons set bytes=? where id=?",
      args: [5 * 1024 ** 3, row.id],
    });
    await expect(begin()).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    await base.client.execute({
      sql: "update account_profile_icons set bytes=? where id=?",
      args: [png.length, row.id],
    });
    await expect(
      acceptProfileIcon(c, token, row.id, stream(new Uint8Array(png.length))),
    ).rejects.toMatchObject({ code: "ICON_CORRUPT" });
    expect((await getProfile(c, token)).icon).toBeNull();
    expect(await usage()).toBe(png.length);
    await sweepProfileIcons(c);
    expect(await usage()).toBe(0);
  });
  it("expired abandoned upload is reclaimed by the runner startup sweep without touching the current icon", async () => {
    const current = await upload();
    const currentBytes = await usage();
    const abandoned = await begin();
    expect(await usage()).toBe(currentBytes + png.length);
    now = new Date(now.getTime() + 600_001);
    await expect(
      acceptProfileIcon(c, token, abandoned.id, stream(png)),
    ).rejects.toBeDefined();
    const runner = createWorkspaceIconRunner(c, 60_000);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await runner.stop();
    expect(await usage()).toBe(currentBytes);
    expect((await getProfile(c, token)).icon).toEqual(current.icon);
    expect(
      await c.unitOfWorkProvider.run((u) => u.profileIcons.find(abandoned.id)),
    ).toBeNull();
  });
  it("caller cancellation cannot adopt an icon and cleanup retains the previous icon", async () => {
    const current = await upload();
    const currentBytes = await usage();
    const pending = await begin();
    const abort = new AbortController();
    abort.abort();
    await expect(
      acceptProfileIcon(c, token, pending.id, stream(png), abort.signal),
    ).rejects.toBeDefined();
    expect((await getProfile(c, token)).icon).toEqual(current.icon);
    await sweepProfileIcons(c);
    expect(await usage()).toBe(currentBytes);
    expect(
      await c.unitOfWorkProvider.run((u) => u.profileIcons.find(pending.id)),
    ).toBeNull();
  });
});

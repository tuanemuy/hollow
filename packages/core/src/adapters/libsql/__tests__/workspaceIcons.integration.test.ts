import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  acceptWorkspaceIcon,
  beginWorkspaceIcon,
  getWorkspaceIcon,
  sweepWorkspaceIcons,
} from "@repo/core/application/workspace/icons";
import {
  beginInvitation,
  cancelInvitation,
  copyInvitation,
  issueInvitations,
} from "@repo/core/application/workspace/invitations";
import {
  changeWorkspaceMember,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@repo/core/application/workspace/membership";
import {
  createWorkspace,
  getScopeUsage,
} from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedWorkspaceIconProcessor } from "../../node/workspaceIconProcessor";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data);
      c.close();
    },
  });
describe("workspace icon ownership, current setting and cleanup", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let storage: CoordinatedObjectStorage;
  let dir: string;
  let now: Date;
  let w: string;
  let a: { id: string; token: string };
  let b: { id: string; token: string };
  let png: Uint8Array;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(join(tmpdir(), "hollow-icon-test-"));
    now = new Date("2026-09-10T12:00:00Z");
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
      invitationDelivery: {
        protector: {
          protect(token) {
            return token;
          },
          reveal(token) {
            return token;
          },
        },
        mailer: { async send() {} },
        wake() {},
      },
    };
    await storage.recoverOwners();
    const user = (email: string) =>
      c.unitOfWorkProvider.run(async (x) => {
        const account = verifyAccount(
          createAccount(c.idGenerator.next(), email, "fixture", now),
          now,
        );
        await x.accounts.save(account);
        const s = await issueSession(c, x.accounts, account);
        return { id: account.id, token: s.token };
      });
    a = await user("icon-a@example.test");
    b = await user("icon-b@example.test");
    w = (
      await createWorkspace(c, a.token, {
        name: "Icon workspace",
        description: "keep",
      })
    ).id;
    png = await sharp({
      create: { width: 128, height: 96, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const begin = (settingsVersion = 0) =>
    beginWorkspaceIcon(c, a.token, {
      workspaceId: w,
      settingsVersion,
      bytes: png.length,
      mime: "image/png",
    });
  const upload = async (version = 0) => {
    const row = await begin(version);
    return acceptWorkspaceIcon(c, a.token, row.id, stream(png));
  };
  const usage = async () =>
    (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes;
  it("reserves once, stores safe output, exchanges current and only frees actual removed old object", async () => {
    const first = await upload();
    const old = await c.unitOfWorkProvider.run((x) =>
      x.workspaceIcons.find(first.iconId),
    );
    if (!old) throw Error("row");
    expect(await usage()).toBe(old.bytes);
    expect((await storage.read(old.storageKey)).length).toBe(old.bytes);
    const second = await upload(1);
    const next = await c.unitOfWorkProvider.run((x) =>
      x.workspaceIcons.find(second.iconId),
    );
    if (!next) throw Error("row");
    expect(await usage()).toBe(old.bytes + next.bytes);
    await expect(
      getWorkspaceIcon(c, a.token, { workspaceId: w, iconId: first.iconId }),
    ).rejects.toMatchObject({ code: "ICON_NOT_FOUND" });
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(next.bytes);
    await expect(stat(join(dir, old.storageKey))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      await getWorkspaceSettings(c, a.token, { workspaceId: w }),
    ).toMatchObject({
      settingsVersion: 2,
      iconId: second.iconId,
      name: "Icon workspace",
      description: "keep",
    });
  });
  it("nonowner cannot reserve; current owner/editor/viewer can read and nonmember/other workspace cannot", async () => {
    const first = await upload();
    await expect(
      beginWorkspaceIcon(c, b.token, {
        workspaceId: w,
        settingsVersion: 1,
        bytes: png.length,
        mime: "image/png",
      }),
    ).rejects.toMatchObject({ code: "WORKSPACE_OWNER_REQUIRED" });
    for (const role of ["owner", "editor", "viewer"] as const) {
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.join(w, b.id, role, now),
      );
      await expect(
        getWorkspaceIcon(c, b.token, { workspaceId: w, iconId: first.iconId }),
      ).resolves.toHaveProperty("storageKey");
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.membership(w, b.id, null),
      );
    }
    await expect(
      getWorkspaceIcon(c, b.token, { workspaceId: w, iconId: first.iconId }),
    ).rejects.toMatchObject({ code: "ICON_NOT_FOUND" });
    const other = (
      await createWorkspace(c, a.token, { name: "other", description: "" })
    ).id;
    await expect(
      getWorkspaceIcon(c, a.token, {
        workspaceId: other,
        iconId: first.iconId,
      }),
    ).rejects.toMatchObject({ code: "ICON_NOT_FOUND" });
  });
  it("same current pending invitation only; cancel and expected selector mismatch fail closed", async () => {
    const first = await upload();
    const issued = await issueInvitations(c, a.token, {
      workspaceId: w,
      emails: ["invited@example.test"],
      role: "viewer",
      ownerConfirmed: false,
      requestId: c.idGenerator.next(),
    });
    const id = issued.ids[0];
    if (!id) throw Error("id");
    const link = await copyInvitation(c, a.token, {
      workspaceId: w,
      id,
      generation: 1,
    });
    const token = new URL(link.url).searchParams.get("token");
    if (!token) throw Error("token");
    const browserToken = c.tokens.generate();
    const cont = await beginInvitation(c, token, browserToken);
    const invitation = {
      continuationId: cont.id,
      browserToken,
      expected: { id, generation: 1 },
    };
    await expect(
      getWorkspaceIcon(c, null, {
        workspaceId: w,
        iconId: first.iconId,
        invitation,
      }),
    ).resolves.toHaveProperty("storageKey");
    await expect(
      getWorkspaceIcon(c, null, {
        workspaceId: w,
        iconId: first.iconId,
        invitation: { ...invitation, expected: { id, generation: 2 } },
      }),
    ).rejects.toMatchObject({ code: "INVITATION_SELECTION_CHANGED" });
    await cancelInvitation(c, a.token, { workspaceId: w, id, generation: 1 });
    await expect(
      getWorkspaceIcon(c, null, {
        workspaceId: w,
        iconId: first.iconId,
        invitation,
      }),
    ).rejects.toBeDefined();
  });
  it("general setting wins over a held old icon processing result; old complete image remains", async () => {
    const first = await upload();
    const p = c.workspaceIcon?.processor;
    if (!p) throw Error("processor");
    const original = p.process.bind(p);
    let release = () => {};
    let entered = () => {};
    const enteredPromise = new Promise<void>((r) => {
      entered = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    vi.spyOn(p, "process").mockImplementation(async (input) => {
      const out = await original(input);
      entered();
      await gate;
      return out;
    });
    const row = await begin(1);
    const pending = acceptWorkspaceIcon(c, a.token, row.id, stream(png));
    const rejected = expect(pending).rejects.toMatchObject({
      code: "WORKSPACE_SETTINGS_CHANGED",
    });
    await enteredPromise;
    await updateWorkspaceSettings(c, a.token, {
      workspaceId: w,
      settingsVersion: 1,
      name: "new name",
      description: "latest",
    });
    release();
    await rejected;
    expect(
      await getWorkspaceSettings(c, a.token, { workspaceId: w }),
    ).toMatchObject({
      iconId: first.iconId,
      name: "new name",
      settingsVersion: 2,
    });
    await sweepWorkspaceIcons(c);
  });
  it.each([
    "editor",
    null,
  ] as const)("owner loss %s and return cannot revive old upload; new upload works", async (next) => {
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.join(w, b.id, "owner", now),
    );
    const p = c.workspaceIcon?.processor;
    if (!p) throw Error("processor");
    const original = p.process.bind(p);
    let release = () => {};
    let entered = () => {};
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    vi.spyOn(p, "process").mockImplementationOnce(async (input) => {
      const out = await original(input);
      entered();
      await gate;
      return out;
    });
    const row = await begin();
    const pending = acceptWorkspaceIcon(c, a.token, row.id, stream(png));
    const rejected = expect(pending).rejects.toBeDefined();
    await reached;
    await changeWorkspaceMember(c, b.token, {
      workspaceId: w,
      accountId: a.id,
      role: next,
      expectedRole: "owner",
      ownerConfirmed: true,
    });
    if (next === null) {
      await c.unitOfWorkProvider.run((x) =>
        x.workspaces.join(w, a.id, "owner", now),
      );
    } else {
      await changeWorkspaceMember(c, b.token, {
        workspaceId: w,
        accountId: a.id,
        role: "owner",
        expectedRole: "editor",
        ownerConfirmed: true,
      });
    }
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(png.length);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.workspaceIcons.find(row.id)))
        ?.state,
    ).toBe("cleanup");
    release();
    await rejected;
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(0);
    await expect(upload()).resolves.toHaveProperty("iconId");
  });
  it("two old reservations cannot overwrite the first successful icon", async () => {
    const x = await begin();
    const y = await begin();
    const done = await acceptWorkspaceIcon(c, a.token, x.id, stream(png));
    await expect(
      acceptWorkspaceIcon(c, a.token, y.id, stream(png)),
    ).rejects.toMatchObject({ code: "WORKSPACE_SETTINGS_CHANGED" });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w })).iconId,
    ).toBe(done.iconId);
  });
  it("cleanup failure retains charge and reason, later sweep actually removes only its object", async () => {
    const one = await upload();
    await upload(1);
    const before = await usage();
    const old = await c.unitOfWorkProvider.run((x) =>
      x.workspaceIcons.find(one.iconId),
    );
    if (!old) throw Error("row");
    const original = storage.removeClaimed.bind(storage);
    vi.spyOn(storage, "removeClaimed").mockRejectedValueOnce(
      new Error("fixture remove"),
    );
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(before);
    expect(
      (
        await base.client.execute({
          sql: "select failure from workspace_icons where id=?",
          args: [one.iconId],
        })
      ).rows[0]?.failure,
    ).toBe("ICON_CLEANUP_RETRY");
    await expect(stat(join(dir, old.storageKey))).resolves.toBeDefined();
    vi.mocked(storage.removeClaimed).mockImplementation(original);
    now = new Date(now.getTime() + 30_000);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(before - old.bytes);
  });
  it("store failure and corrupt conversion retain old icon and charges until cleanup", async () => {
    const first = await upload();
    const before = await usage();
    const row = await begin(1);
    vi.spyOn(storage, "putBounded").mockRejectedValueOnce(
      new Error("fixture store"),
    );
    await expect(
      acceptWorkspaceIcon(c, a.token, row.id, stream(png)),
    ).rejects.toBeDefined();
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w })).iconId,
    ).toBe(first.iconId);
    expect(await usage()).toBeGreaterThan(before);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(before);
    const bad = await begin(1);
    await expect(
      acceptWorkspaceIcon(
        c,
        a.token,
        bad.id,
        stream(new Uint8Array(png.length)),
      ),
    ).rejects.toMatchObject({ code: "ICON_CORRUPT" });
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(before);
  });
  it("quota is checked at reservation; no settings version change on reject", async () => {
    const held = await begin();
    await base.client.execute({
      sql: "update workspace_icons set bytes=? where id=?",
      args: [20 * 1024 ** 3, held.id],
    });
    await expect(begin()).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w }))
        .settingsVersion,
    ).toBe(0);
  });
  it("final output quota is rechecked after concurrent reservations without publishing", async () => {
    const row = await begin();
    const other = await begin();
    const processor = c.workspaceIcon?.processor;
    if (!processor) throw new Error("fixture processor");
    const actual = processor.process.bind(processor);
    vi.spyOn(processor, "process").mockImplementationOnce(async (input) => {
      const output = await actual(input);
      await base.client.execute({
        sql: "update workspace_icons set bytes=? where id=?",
        args: [20 * 1024 ** 3, other.id],
      });
      return output;
    });
    await expect(
      acceptWorkspaceIcon(c, a.token, row.id, stream(png)),
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    expect(
      (await getWorkspaceSettings(c, a.token, { workspaceId: w })).iconId,
    ).toBeNull();
    expect(
      (await c.unitOfWorkProvider.run((x) => x.workspaceIcons.find(row.id)))
        ?.state,
    ).toBe("cleanup");
  });
  it("role loss during actual put fences publication and retains bytes until writer finally and remove", async () => {
    await c.unitOfWorkProvider.run((x) =>
      x.workspaces.join(w, b.id, "owner", now),
    );
    const row = await begin();
    const actual = storage.putBounded.bind(storage);
    let release = () => {};
    let entered = () => {};
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    vi.spyOn(storage, "putBounded").mockImplementationOnce(async (...args) => {
      const result = await actual(...args);
      entered();
      await new Promise<void>((r) => {
        release = r;
      });
      return result;
    });
    const pending = acceptWorkspaceIcon(c, a.token, row.id, stream(png));
    const rejected = expect(pending).rejects.toBeDefined();
    await reached;
    await changeWorkspaceMember(c, b.token, {
      workspaceId: w,
      accountId: a.id,
      role: "editor",
      expectedRole: "owner",
      ownerConfirmed: true,
    });
    const bytes = await usage();
    expect(bytes).toBeGreaterThan(0);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(bytes);
    await expect(stat(join(dir, `icon-${row.id}`))).resolves.toBeDefined();
    release();
    await rejected;
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(0);
    await expect(stat(join(dir, `icon-${row.id}`))).rejects.toBeDefined();
    expect(
      (await getWorkspaceSettings(c, b.token, { workspaceId: w })).iconId,
    ).toBeNull();
  });
  it("awaiting expiration is exact; a live processing writer is not expired or freed", async () => {
    await begin();
    now = new Date(now.getTime() + 599_999);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(png.length);
    now = new Date(now.getTime() + 1);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(0);
    const live = await begin();
    await c.unitOfWorkProvider.run((x) =>
      x.workspaceIcons.processing(live.id, new Date(now.getTime() + 30_000)),
    );
    let release = () => {};
    let entered = () => {};
    const reached = new Promise<void>((r) => {
      entered = r;
    });
    const active = storage.withOwner(
      { kind: "icon-upload", id: live.id },
      async () => {
        entered();
        await new Promise<void>((r) => {
          release = r;
        });
      },
    );
    await reached;
    now = new Date(now.getTime() + 600_000);
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(png.length);
    release();
    await active;
    await sweepWorkspaceIcons(c);
    expect(await usage()).toBe(0);
  });
});

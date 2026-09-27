import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  NodeZipExecution,
  NodeZipTransfers,
} from "@repo/core/adapters/node/zip/lifetimes";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { previewZip } from "@repo/core/application/zip/preview";
import {
  cancelZip,
  getZip,
  lookupZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("ZIP admission fixes the selected set without generating files", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let root: string;
  let session: string;
  let noteId: string;
  let mail: string[];
  const unused = vi.fn((): never => {
    throw new Error("Generation is outside this fixture");
  });
  beforeEach(async () => {
    unused.mockClear();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-admission-test-"));
    mail = [];
    c = createHollowContainer(base.db, "http://localhost:3000", {
      async send(value) {
        mail.push(value.text);
      },
    });
    const storage = new CoordinatedObjectStorage(
      root,
      c.unitOfWorkProvider,
      c.clock,
    );
    await storage.recoverOwners();
    c = {
      ...c,
      logger: { info() {}, warn() {}, error() {} },
      zip: {
        writer: {
          upperBound: unused,
          async write() {
            return unused();
          },
        },
        names: { allocate: unused },
        documentWriter: {
          async plan() {
            return unused();
          },
        },
        sources: {
          async open() {
            return unused();
          },
          async openOwned() {
            return unused();
          },
        },
        execution: new NodeZipExecution(c.clock),
        transfers: new NodeZipTransfers(c.clock),
        disk: {
          async reserve() {
            return unused();
          },
        },
        capacity: {
          diskBytes: 4 * 1024 ** 3,
          protectedDiskBytes: 6 * 1024 ** 3,
          totalMs: 1_800_000,
          childMs: 120_000,
          assemblyMs: 120_000,
          deliveryMs: 600_000,
          leaseMs: 60_000,
          cleanupMs: 30_000,
        },
        defaultCss: "",
        wake() {},
      },
      importing: {
        storage,
        extractor: {
          async extract() {
            return unused();
          },
        },
        mediaValidator: {
          async validate() {
            return unused();
          },
        },
        async detectFormat() {
          return unused();
        },
        wake() {},
      },
    };
    session = await account("first");
    noteId = (
      await saveNote(c, session, {
        title: "表示できる題名",
        html: "<p>本文</p>",
      })
    ).note.id;
  });
  afterEach(async () => {
    await c.zip?.execution.stop();
    await c.zip?.transfers.stop();
    try {
      expect(unused).not.toHaveBeenCalled();
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(
        await base.db.all(
          sql`select id from zip_spools union all select id from zip_artifacts union all select id from zip_assemblies`,
        ),
      ).toEqual([]);
      expect(await readdir(root)).toEqual([".hollow-writer-owner"]);
    } finally {
      base.close();
      await rm(root, { recursive: true, force: true });
    }
  });
  async function account(name: string) {
    const pending = await signUp(c, {
      email: `${name}@zip-admission.test`,
      password: "test-password-1234",
      termsAccepted: true,
    });
    const url = mail.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!url) throw new Error("Missing fixture mail");
    const verified = await verifyEmail(
      c,
      new URL(url).searchParams.get("token") ?? "",
      pending.browserToken,
    );
    if (!verified) throw new Error("Missing fixture actor");
    return verified.token;
  }
  async function command(
    token: string,
    noteIds: readonly string[],
    format: "html" | "markdown" = "html",
  ) {
    const preview = await previewZip(c, token, { noteIds, format });
    return {
      noteIds,
      format,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
  }
  async function countRequests() {
    return base.db.all(sql`select id from zip_requests`);
  }

  it("previews 500 legal notes in pages of 50, fixes all targets, and rejects 501 before admission", async () => {
    const ids = [noteId];
    for (let index = 1; index < 500; index++) {
      ids.push(
        (
          await saveNote(c, session, {
            title: `対象 ${index}`,
            html: "<p>小さな本文</p>",
          })
        ).note.id,
      );
    }
    const tooMany = [...ids, c.idGenerator.next()];
    await expect(
      previewZip(c, session, { noteIds: tooMany, format: "html" }),
    ).rejects.toMatchObject({ code: "ZIP_SELECTION" });
    await expect(
      requestZip(c, session, {
        noteIds: tooMany,
        format: "html",
        confirmation: "unused",
        commandId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_SELECTION" });
    expect(await countRequests()).toEqual([]);
    const first = await previewZip(c, session, {
      noteIds: ids,
      format: "html",
    });
    const observed: string[] = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const page =
        offset === 0
          ? first
          : await previewZip(c, session, {
              noteIds: ids,
              format: "html",
              offset,
            });
      expect(page).toMatchObject({
        selected: 500,
        total: 500,
        excluded: 0,
        style: "saved",
        confirmation: first.confirmation,
      });
      expect(page.items).toHaveLength(50);
      expect(page.items.map((item) => item.ordinal)).toEqual(
        Array.from({ length: 50 }, (_, index) => offset + index),
      );
      expect(page.nextOffset).toBe(offset < 450 ? offset + 50 : null);
      observed.push(...page.items.map((item) => item.noteId));
    }
    expect(observed).toEqual(ids);
    const accepted = await requestZip(c, session, {
      noteIds: ids,
      format: "html",
      confirmation: first.confirmation,
      commandId: c.idGenerator.next(),
    });
    expect(accepted).toMatchObject({
      total: 500,
      state: "queued",
      finishedAt: null,
    });
    const targets = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.targets(accepted.id),
    );
    expect(targets.map((target) => target.targetNoteId)).toEqual(ids);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: accepted.id, generation: 1 }),
      ),
    ).toHaveLength(500);
    expect(await countRequests()).toHaveLength(1);
  }, 30_000);

  it("returns only eligible identities and titles while counting empty, invisible and missing exclusions", async () => {
    const other = await account("other");
    const hidden = (
      await saveNote(c, other, {
        title: "非公開の秘密題名",
        html: "<p>別利用者の本文</p>",
      })
    ).note.id;
    const empty = (
      await saveNote(c, session, { title: "本文なしの題名", html: "" })
    ).note.id;
    const absent = c.idGenerator.next();
    const ids = [empty, hidden, noteId, absent];
    const preview = await previewZip(c, session, {
      noteIds: ids,
      format: "markdown",
    });
    expect(preview).toMatchObject({
      selected: 4,
      total: 1,
      excluded: 3,
      nextOffset: null,
      style: "saved",
    });
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0]).toMatchObject({
      ordinal: 2,
      noteId,
      title: "表示できる題名",
    });
    const rendered = JSON.stringify(preview);
    for (const value of [
      hidden,
      empty,
      absent,
      "非公開の秘密題名",
      "本文なしの題名",
      "別利用者の本文",
    ])
      expect(rendered).not.toContain(value);
    const accepted = await requestZip(c, session, {
      noteIds: ids,
      format: "markdown",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    expect(accepted.total).toBe(1);
    const targets = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.targets(accepted.id),
    );
    expect(
      targets.map((target) => [target.ordinal, target.targetNoteId]),
    ).toEqual([[2, noteId]]);
  });

  it("does not create a parent when every selected note has an empty body", async () => {
    const empty = (await saveNote(c, session, { title: "空本文", html: "" }))
      .note.id;
    const preview = await previewZip(c, session, {
      noteIds: [empty],
      format: "html",
    });
    expect(preview).toMatchObject({
      selected: 1,
      total: 0,
      excluded: 1,
      items: [],
      nextOffset: null,
    });
    const input = {
      noteIds: [empty],
      format: "html" as const,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    await expect(requestZip(c, session, input)).rejects.toMatchObject({
      code: "ZIP_NO_TARGETS",
    });
    expect(await countRequests()).toEqual([]);
    expect(await lookupZip(c, session, input.commandId)).toBeNull();
  });

  it("enforces the same actor and global active slots across scope and format, releasing only after cancellation settles", async () => {
    const other = await account("other");
    const otherNote = (
      await saveNote(c, other, { title: "別利用者", html: "<p>本文</p>" })
    ).note.id;
    const workspace = await createWorkspace(c, session, {
      name: "移動しない範囲",
      description: "",
    });
    const workspaceNote = (
      await saveNote(c, session, {
        workspaceId: workspace.id,
        title: "共有範囲",
        html: "<p>本文</p>",
      })
    ).note.id;
    const own = await command(session, [workspaceNote], "markdown");
    const foreign = await command(other, [otherNote], "markdown");
    const first = await requestZip(
      c,
      session,
      await command(session, [noteId]),
    );
    await expect(requestZip(c, session, own)).rejects.toMatchObject({
      code: "ZIP_ACTIVE",
    });
    await expect(requestZip(c, other, foreign)).rejects.toMatchObject({
      code: "ZIP_BUSY",
    });
    expect(await countRequests()).toHaveLength(1);
    await cancelZip(c, session, first.id);
    await expect(requestZip(c, other, foreign)).rejects.toMatchObject({
      code: "ZIP_BUSY",
    });
    await pumpZip(c);
    expect((await getZip(c, session, first.id)).state).toBe("cancelled");
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipWork.active()),
    ).toBeNull();
    const next = await requestZip(c, other, foreign);
    expect(next).toMatchObject({ state: "queued", format: "markdown" });
    await expect(requestZip(c, session, own)).rejects.toMatchObject({
      code: "ZIP_BUSY",
    });
    await cancelZip(c, other, next.id);
    await pumpZip(c);
    const scoped = await requestZip(c, session, own);
    expect(scoped).toMatchObject({ state: "queued", format: "markdown" });
    expect(await countRequests()).toHaveLength(3);
  });

  it("converges concurrent same-command acceptance and rejects changed payload without another parent", async () => {
    const input = await command(session, [noteId]);
    const [first, second] = await Promise.all([
      requestZip(c, session, input),
      requestZip(c, session, input),
    ]);
    expect(second).toEqual(first);
    expect(await lookupZip(c, session, input.commandId)).toEqual(first);
    await expect(
      requestZip(c, session, { ...input, format: "markdown" }),
    ).rejects.toMatchObject({ code: "ZIP_COMMAND_CONFLICT" });
    expect(await countRequests()).toHaveLength(1);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.targets(first.id)),
    ).toHaveLength(1);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: first.id, generation: 1 }),
      ),
    ).toHaveLength(1);
  });
});

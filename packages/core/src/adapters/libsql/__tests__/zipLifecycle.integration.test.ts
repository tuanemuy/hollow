import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NodeTagNormalizer } from "@repo/core/adapters/node/browse/tagNormalizer";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planExportDocument } from "@repo/core/adapters/node/exportDocument/plan";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import { NodeZipDiskAdmission } from "@repo/core/adapters/node/zip/disk";
import {
  NodeZipExecution,
  NodeZipTransfers,
} from "@repo/core/adapters/node/zip/lifetimes";
import { NodeZipNames } from "@repo/core/adapters/node/zip/names";
import { NodeZipSourceReader } from "@repo/core/adapters/node/zip/sources";
import { NodeZipWriter } from "@repo/core/adapters/node/zip/writer";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { requestNotePurge } from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { trashNote } from "@repo/core/application/note/trash";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import {
  changeWorkspaceMember,
  leaveWorkspace,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { prepareZipDelivery } from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import {
  getZip,
  getZipDetails,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

type Actor = { token: string; id: string };
describe("ZIP lifecycle causes and preserved history", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let root: string;
  let owner: Actor;
  let member: Actor;
  let workspaceId: string;
  let noteId: string;
  let mail: string[];
  let now: Date;

  async function actor(email: string): Promise<Actor> {
    const pending = await signUp(c, {
      email,
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
    return { token: verified.token, id: verified.user.id };
  }
  beforeEach(async () => {
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-lifecycle-test-"));
    now = new Date();
    mail = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(value) {
          mail.push(value.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
      tagging: {
        normalizer: NodeTagNormalizer,
        read: {
          async read() {
            throw new Error("Unused tag reader");
          },
        },
      },
    };
    owner = await actor("zip-lifecycle-owner@example.test");
    member = await actor("zip-lifecycle-member@example.test");
    workspaceId = (
      await createWorkspace(c, owner.token, {
        name: "ZIP lifecycle",
        description: "",
      })
    ).id;
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspaceId, member.id, "editor"),
    );
    noteId = (
      await saveNote(c, owner.token, {
        workspaceId,
        title: "保存済み",
        html: "<p>original body</p>",
      })
    ).note.id;
    const storage = new CoordinatedObjectStorage(
      root,
      c.unitOfWorkProvider,
      c.clock,
    );
    await storage.recoverOwners();
    zip = {
      writer: NodeZipWriter,
      names: NodeZipNames,
      documentWriter: {
        async plan(input) {
          return planExportDocument(input);
        },
      },
      sources: new NodeZipSourceReader(
        storage,
        new FileExportSourceReader(root),
      ),
      execution: new NodeZipExecution(c.clock),
      transfers: new NodeZipTransfers(c.clock),
      disk: new NodeZipDiskAdmission(root, 6 * 1024 ** 3),
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
    };
    c = {
      ...c,
      zip,
      importing: {
        storage,
        extractor: {
          async extract() {
            throw new Error("Unused extractor");
          },
        },
        mediaValidator: { async validate() {} },
        async detectFormat() {
          return "html";
        },
        wake() {},
      },
    };
  });
  afterEach(async () => {
    await zip?.execution.stop();
    await zip?.transfers.stop();
    try {
      if (base) {
        expect(
          await base.db.all(sql`select id from object_writes where active=1`),
        ).toEqual([]);
        expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
      }
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });

  async function request(ids = [noteId], account = member) {
    const preview = await previewZip(c, account.token, {
      noteIds: ids,
      format: "html",
    });
    return requestZip(c, account.token, {
      noteIds: ids,
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  async function run(id: string) {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: id, generation: 1 }),
    );
    if (!value) throw new Error("Missing fixture run");
    return value;
  }
  const attempts = (id: string) =>
    c.unitOfWorkProvider.run((u) =>
      u.zipRequests.attempts({ requestId: id, generation: 1 }),
    );
  async function artifact(id: string) {
    const value = await run(id);
    if (!value.artifactId) throw new Error("Missing artifact id");
    const result = await c.unitOfWorkProvider.run((u) =>
      u.zipArtifacts.find(value.artifactId ?? ""),
    );
    if (!result) throw new Error("Missing artifact");
    return result;
  }
  async function finish(id: string, account = member, state = "succeeded") {
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await getZip(c, account.token, id)).state).toBe(state),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() => expect(zip.execution.active(`${id}:1`)).toBe(false));
  }
  async function published(ids = [noteId], account = member) {
    const job = await request(ids, account);
    await finish(job.id, account);
    return {
      job,
      run: await run(job.id),
      attempts: await attempts(job.id),
      artifact: await artifact(job.id),
    };
  }
  async function sibling(account = member) {
    return (
      await saveNote(c, account.token, {
        title: "正当な兄弟",
        html: "<p>unaffected sibling</p>",
      })
    ).note.id;
  }
  async function currentNote() {
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw new Error("Missing note");
    return note;
  }
  const removeMember = (role: "editor" | "viewer" = "editor") =>
    changeWorkspaceMember(c, owner.token, {
      workspaceId,
      accountId: member.id,
      role: null,
      expectedRole: role,
      ownerConfirmed: false,
    });

  it("cancels unfinished downgraded ordinals without failing/retrying them, while preserving siblings and readable completed artifacts", async () => {
    const prior = await published();
    const other = await sibling();
    const pending = await request([noteId, other]);
    await changeWorkspaceMember(c, owner.token, {
      workspaceId,
      accountId: member.id,
      role: "viewer",
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspaceId, member.id),
      ),
    ).toBe("viewer");
    expect((await run(pending.id)).exclusions).toEqual([
      { ordinal: 0, reason: "ZIP_CANCELLED" },
    ]);
    expect(
      (await attempts(pending.id)).map((row) => [
        row.ordinal,
        row.state,
        row.failure,
      ]),
    ).toEqual([
      [0, "cancelled", null],
      [1, "queued", null],
    ]);
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    expect((await artifact(prior.job.id)).state).toBe("ready");
    await expect(
      prepareZipDelivery(c, member.token, prior.job.id, 1),
    ).resolves.toHaveProperty("id");
    await finish(pending.id, member, "partial");
    expect((await attempts(pending.id)).map((row) => row.state)).toEqual([
      "cancelled",
      "succeeded",
    ]);
    expect(
      (await getZipDetails(c, member.token, pending.id, 1)).retryOrdinals,
    ).toEqual([]);
    const output = await artifact(pending.id);
    expect(
      (
        await c.unitOfWorkProvider.run((u) => u.zipArtifacts.entries(output.id))
      ).map((row) => row.liveNoteId),
    ).toEqual([other]);
  });

  it.each([
    "removed",
    "left",
  ] as const)("retires only the %s actor's completed artifact and does not resurrect it on rejoin", async (cause) => {
    const own = await published([noteId], owner);
    const prior = await published();
    if (cause === "removed") await removeMember();
    else await leaveWorkspace(c, member.token, { workspaceId });
    expect((await artifact(prior.job.id)).state).toBe("cleanup");
    expect((await artifact(own.job.id)).state).toBe("ready");
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspaceId, member.id, "editor"),
    );
    await expect(
      prepareZipDelivery(c, member.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    await expect(
      prepareZipDelivery(c, owner.token, own.job.id, 1),
    ).resolves.toHaveProperty("id");
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
  });

  it("keeps an artifact for a note moved out before the old workspace membership ends", async () => {
    const prior = await published();
    const destination = await createWorkspace(c, owner.token, {
      name: "Destination",
      description: "",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(destination.id, member.id, "viewer"),
    );
    const preview = await previewNoteMove(c, owner.token, {
      noteId,
      destination: { kind: "workspace", workspaceId: destination.id },
    });
    await moveNote(c, owner.token, preview.expected);
    await removeMember();
    expect((await currentNote()).owner).toEqual({
      kind: "workspace",
      workspaceId: destination.id,
    });
    expect((await artifact(prior.job.id)).state).toBe("ready");
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    await expect(
      prepareZipDelivery(c, member.token, prior.job.id, 1),
    ).resolves.toHaveProperty("id");
  });

  it.each([
    "title",
    "html",
    "style",
  ] as const)("excludes actual %s changes from active runs and retires completed bytes without rewriting success history", async (change) => {
    const prior = await published();
    const other = await sibling();
    const pending = await request([noteId, other]);
    const note = await currentNote();
    if (change === "style")
      await setDisplayStyle(c, owner.token, {
        id: noteId,
        style: note.display.style === "default" ? "original" : "default",
      });
    else
      await saveNote(c, owner.token, {
        id: noteId,
        version: note.version,
        title: change === "title" ? "変更した題名" : note.title,
        html: change === "html" ? "<p>changed body</p>" : note.html,
      });
    expect((await run(pending.id)).exclusions).toEqual([
      { ordinal: 0, reason: "ZIP_CONTENT_CHANGED" },
    ]);
    expect(
      (await attempts(pending.id)).map((row) => [row.state, row.failure]),
    ).toEqual([
      ["excluded", "ZIP_CONTENT_CHANGED"],
      ["queued", null],
    ]);
    expect((await artifact(prior.job.id)).state).toBe("cleanup");
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    await finish(pending.id, member, "partial");
    expect((await attempts(pending.id)).map((row) => row.state)).toEqual([
      "excluded",
      "succeeded",
    ]);
    expect(
      (await getZipDetails(c, member.token, pending.id, 1)).retryOrdinals,
    ).toEqual([]);
  });

  it("does not invalidate identical save/style or tag-only changes", async () => {
    const prior = await published();
    const pending = await request();
    const initialRun = await run(pending.id);
    const initialAttempts = await attempts(pending.id);
    const note = await currentNote();
    await saveNote(c, owner.token, {
      id: noteId,
      version: note.version,
      title: note.title,
      html: note.html,
    });
    await setDisplayStyle(c, owner.token, {
      id: noteId,
      style: note.display.style,
    });
    await changeNoteTags(c, owner.token, {
      noteId,
      expectedScope: { workspaceId },
      change: { kind: "create", name: "整理" },
    });
    expect(await run(pending.id)).toEqual(initialRun);
    expect(await attempts(pending.id)).toEqual(initialAttempts);
    expect((await artifact(prior.job.id)).state).toBe("ready");
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    expect(
      await c.unitOfWorkProvider.run((u) => u.tags.selected(noteId)),
    ).toHaveLength(1);
    await finish(pending.id);
    await expect(
      prepareZipDelivery(c, member.token, prior.job.id, 1),
    ).resolves.toHaveProperty("id");
  });

  it("trash and purge hooks cancel the affected ordinal once while preserving a live sibling and old successful attempts", async () => {
    const prior = await published();
    const other = await sibling();
    const pending = await request([noteId, other]);
    const note = await currentNote();
    const trashed = await trashNote(c, owner.token, {
      id: noteId,
      version: note.version,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, owner.token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    expect((await currentNote()).lifecycle).toEqual({
      kind: "purging",
      purgeId: purge.id,
    });
    expect((await run(pending.id)).exclusions).toEqual([
      { ordinal: 0, reason: "ZIP_CANCELLED" },
    ]);
    expect(
      (await attempts(pending.id)).map((row) => [row.state, row.failure]),
    ).toEqual([
      ["cancelled", null],
      ["queued", null],
    ]);
    expect((await artifact(prior.job.id)).state).toBe("cleanup");
    expect(await run(prior.job.id)).toEqual(prior.run);
    expect(await attempts(prior.job.id)).toEqual(prior.attempts);
    await finish(pending.id, member, "partial");
    expect((await attempts(pending.id)).map((row) => row.state)).toEqual([
      "cancelled",
      "succeeded",
    ]);
    expect(
      (await getZipDetails(c, member.token, pending.id, 1)).retryOrdinals,
    ).toEqual([]);
  });
});

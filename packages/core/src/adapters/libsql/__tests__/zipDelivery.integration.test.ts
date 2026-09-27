import { type FileHandle, mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
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
import { saveNote } from "@repo/core/application/note/saveNote";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { getZip, requestZip } from "@repo/core/application/zip/usecases";
import { pumpZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open) };
});

describe("ZIP delivery current authorization and owned close", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let now: Date;
  let session: string;
  let noteId: string;
  let mail: string[];
  const releases: (() => void)[] = [];
  const controllers: AbortController[] = [];
  const bodies: ReadableStream<Uint8Array>[] = [];
  const pending: Promise<unknown>[] = [];
  const handles: FileHandle[] = [];

  function gate() {
    let release = () => {};
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    releases.push(release);
    return { promise, release };
  }
  async function user(email: string) {
    const signup = await signUp(c, {
      email,
      password: "test-password-1234",
      termsAccepted: true,
    });
    const url = mail.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!url) throw new Error("Missing fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(url).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw new Error("Missing fixture account");
    return auth;
  }

  beforeEach(async () => {
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-delivery-test-"));
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
    };
    session = (await user("zip-delivery@example.test")).token;
    noteId = (
      await saveNote(c, session, {
        title: "配信",
        html: "<p>小さな保存済み本文</p>",
      })
    ).note.id;
    storage = new CoordinatedObjectStorage(root, c.unitOfWorkProvider, c.clock);
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
    for (const release of releases.splice(0)) release();
    for (const controller of controllers.splice(0)) controller.abort();
    await Promise.allSettled(bodies.splice(0).map((body) => body.cancel()));
    await Promise.allSettled(pending.splice(0));
    await zip?.execution.stop();
    await zip?.transfers.stop();
    vi.restoreAllMocks();
    for (const handle of handles.splice(0))
      if (handle.fd !== -1) await handle.close();
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
      vi.clearAllMocks();
    }
  });

  async function ready(noteIds = [noteId], token = session) {
    const preview = await previewZip(c, token, { noteIds, format: "html" });
    const job = await requestZip(c, token, {
      noteIds,
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await getZip(c, token, job.id)).state).toBe("succeeded"),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    const artifact = await c.unitOfWorkProvider.run(async (u) => {
      const run = await u.zipRequests.findRun({
        requestId: job.id,
        generation: 1,
      });
      return run?.artifactId ? u.zipArtifacts.find(run.artifactId) : null;
    });
    if (!artifact || artifact.state !== "ready")
      throw new Error("Missing ready fixture artifact");
    return { job, artifact };
  }
  async function get(id: string, token = session) {
    const controller = new AbortController();
    controllers.push(controller);
    const value = await getZipFile(c, token, id, controller.signal);
    bodies.push(value.body);
    return { ...value, controller };
  }
  const delivery = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(id));
  const activeOwners = (id: string) =>
    base.db.all(
      sql`select id from object_writes where kind='zip-delivery' and owner_id=${id} and active=1`,
    );

  it("admits two live transfers, rejects the same ID twice and refuses a third without leaking ownership", async () => {
    const { job } = await ready();
    const tickets = await Promise.all(
      [0, 1].map(() => prepareZipDelivery(c, session, job.id, 1)),
    );
    const [first, second] = tickets;
    if (!first || !second) throw new Error("Missing tickets");
    const a = await get(first.id);
    const b = await get(second.id);
    expect(new Set(zip.transfers.ids())).toEqual(
      new Set([first.id, second.id]),
    );
    await expect(get(first.id)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    await expect(
      prepareZipDelivery(c, session, job.id, 1),
    ).rejects.toMatchObject({
      code: "ZIP_DELIVERY_BUSY",
    });
    expect(await base.db.all(sql`select id from zip_deliveries`)).toHaveLength(
      2,
    );
    expect(
      await base.db.all(
        sql`select id from object_writes where kind='zip-delivery' and active=1`,
      ),
    ).toHaveLength(2);
    expect((await delivery(first.id))?.state).toBe("sending");
    expect((await delivery(second.id))?.state).toBe("sending");
    await Promise.all([a.body.cancel(), b.body.cancel()]);
    expect(zip.transfers.ids()).toEqual([]);
    expect((await delivery(first.id))?.state).toBe("closed");
    expect((await delivery(second.id))?.state).toBe("closed");
    const replacement = await prepareZipDelivery(c, session, job.id, 1);
    expect([first.id, second.id]).not.toContain(replacement.id);
    expect((await delivery(replacement.id))?.state).toBe("ready");
  });

  it.each([
    "cancel",
    "abort",
  ] as const)("retains runtime, DB delivery and object owner during real native close after %s", async (mode) => {
    const { job, artifact } = await ready();
    const ticket = await prepareZipDelivery(c, session, job.id, 1);
    const nativeClosing = gate();
    const allowClose = gate();
    let captured: FileHandle | undefined;
    const original = storage.openOwnedRead.bind(storage);
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (key, signal) => {
        const owned = await original(key, signal);
        if (key !== artifact.key) return owned;
        const call = vi.mocked(open).mock.results.at(-1);
        if (!call || call.type !== "return")
          throw new Error("Missing owned native file");
        const handle = await call.value;
        handles.push(handle);
        captured = handle;
        const nativeClose = handle.close.bind(handle);
        let sharedClose: Promise<void> | undefined;
        vi.spyOn(handle, "close").mockImplementation(() => {
          sharedClose ??= (async () => {
            nativeClosing.release();
            await allowClose.promise;
            await nativeClose();
          })();
          return sharedClose;
        });
        return owned;
      },
    );
    const response = await get(ticket.id);
    await nativeClosing.promise;
    let finished = false;
    if (mode === "cancel") {
      const cancelling = response.body.cancel().then(() => {
        finished = true;
      });
      pending.push(cancelling);
    } else response.controller.abort();
    await setImmediate();
    expect(finished).toBe(false);
    expect(captured?.fd).toBeGreaterThanOrEqual(0);
    expect(zip.transfers.ids()).toContain(ticket.id);
    expect((await delivery(ticket.id))?.state).not.toBe("closed");
    expect(await activeOwners(ticket.id)).toHaveLength(1);
    allowClose.release();
    await Promise.all(pending);
    await vi.waitFor(
      async () => expect((await delivery(ticket.id))?.state).toBe("closed"),
      { timeout: 5000, interval: 10 },
    );
    expect(captured?.fd).toBe(-1);
    expect(zip.transfers.ids()).not.toContain(ticket.id);
    expect(await activeOwners(ticket.id)).toEqual([]);
    if (mode === "cancel") expect(finished).toBe(true);
    else
      await expect(
        new Response(response.body).arrayBuffer(),
      ).rejects.toMatchObject({ code: "ZIP_DOWNLOAD_CANCELLED" });
  });

  it("rejects ticket and artifact expiry at equality before acquiring a storage reader", async () => {
    const { job, artifact } = await ready();
    const ticket = await prepareZipDelivery(c, session, job.id, 1);
    const opening = vi.spyOn(storage, "openOwnedRead");
    now = new Date(ticket.expiresAt);
    await expect(get(ticket.id)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    expect(opening).not.toHaveBeenCalled();
    expect(zip.transfers.ids()).toEqual([]);
    const replacement = await prepareZipDelivery(c, session, job.id, 1);
    expect(replacement.id).not.toBe(ticket.id);
    now = new Date(artifact.expiresAt);
    await expect(
      prepareZipDelivery(c, session, job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    await expect(get(replacement.id)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    expect(opening).not.toHaveBeenCalled();
  });

  it("rejects an entire two-note viewer ZIP when only the later included scope loses current read", async () => {
    const viewer = await user("zip-viewer@example.test");
    const workspaces = await Promise.all(
      ["first", "second"].map((name) =>
        createWorkspace(c, session, { name, description: "" }),
      ),
    );
    const ids: string[] = [];
    for (const workspace of workspaces) {
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.membership(workspace.id, viewer.user.id, "viewer"),
      );
      ids.push(
        (
          await saveNote(c, session, {
            workspaceId: workspace.id,
            title: workspace.name,
            html: "<p>private workspace body</p>",
          })
        ).note.id,
      );
    }
    const { job, artifact } = await ready(ids, viewer.token);
    const ticket = await prepareZipDelivery(c, viewer.token, job.id, 1);
    const second = workspaces[1];
    const first = workspaces[0];
    if (!second || !first) throw new Error("Missing workspace fixture");
    await changeWorkspaceMember(c, session, {
      workspaceId: second.id,
      accountId: viewer.user.id,
      role: null,
      expectedRole: "viewer",
      ownerConfirmed: false,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(first.id, viewer.user.id),
      ),
    ).toBe("viewer");
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.zipArtifacts.entries(artifact.id),
        )
      ).map((value) => value.liveNoteId),
    ).toEqual(ids);
    const opening = vi.spyOn(storage, "openOwnedRead");
    await expect(get(ticket.id, viewer.token)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    await expect(
      prepareZipDelivery(c, viewer.token, job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    expect(opening).not.toHaveBeenCalled();
    expect(zip.transfers.ids()).toEqual([]);
    expect(await activeOwners(ticket.id)).toEqual([]);
  });
});

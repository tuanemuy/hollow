import { access, type FileHandle, mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import { saveNote } from "@repo/core/application/note/saveNote";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { getZip, requestZip } from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open) };
});

describe("ZIP confirmed retirement is durable and waits for native readers", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let owner: { token: string; id: string };
  let viewer: { token: string; id: string };
  let workspaceId: string;
  let noteId: string;
  let mail: string[];
  const releases: (() => void)[] = [];
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
  async function account(name: string) {
    const signup = await signUp(c, {
      email: `${name}@zip-retirement.test`,
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
    return { token: auth.token, id: auth.user.id };
  }
  beforeEach(async () => {
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-retirement-test-"));
    mail = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(value) {
          mail.push(value.text);
        },
      }),
      logger: { info() {}, warn() {}, error() {} },
    };
    owner = await account("owner");
    viewer = await account("viewer");
    workspaceId = (
      await createWorkspace(c, owner.token, {
        name: "共有範囲",
        description: "",
      })
    ).id;
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspaceId, viewer.id, "viewer"),
    );
    noteId = (
      await saveNote(c, owner.token, {
        workspaceId,
        title: "同じ題名",
        html: "<p>変わらない本文</p>",
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
    await Promise.allSettled(bodies.splice(0).map((body) => body.cancel()));
    await Promise.allSettled(pending.splice(0));
    await zip?.execution.stop();
    await zip?.transfers.stop();
    vi.restoreAllMocks();
    for (const handle of handles.splice(0))
      if (handle.fd !== -1) await handle.close();
    try {
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base.close();
      await rm(root, { recursive: true, force: true });
      vi.clearAllMocks();
    }
  });
  async function artifact(id: string) {
    const value = await c.unitOfWorkProvider.run((u) =>
      u.zipArtifacts.find(id),
    );
    if (!value) throw new Error("Missing fixture artifact");
    return value;
  }
  async function ready(token = viewer.token) {
    const preview = await previewZip(c, token, {
      noteIds: [noteId],
      format: "html",
    });
    const job = await requestZip(c, token, {
      noteIds: [noteId],
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
    const run = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
    );
    if (!run?.artifactId) throw new Error("Missing fixture artifact id");
    const value = await artifact(run.artifactId);
    if (value.state !== "ready")
      throw new Error("Missing ready fixture artifact");
    const attempts = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.attempts(run),
    );
    return { job, run, attempts, artifact: value };
  }
  async function move(destination: NoteOwner) {
    const preview = await previewNoteMove(c, owner.token, {
      noteId,
      destination,
    });
    await moveNote(c, owner.token, preview.expected);
  }
  async function get(id: string, token = viewer.token) {
    const value = await getZipFile(c, token, id, new AbortController().signal);
    bodies.push(value.body);
    return value;
  }
  function faultyRead(mode: "failure" | "changed"): HollowContainer {
    const provider = c.unitOfWorkProvider;
    return {
      ...c,
      unitOfWorkProvider: {
        run(work) {
          return provider.run(async (u) => {
            const read = u.notes.findById.bind(u.notes);
            const spy = vi
              .spyOn(u.notes, "findById")
              .mockImplementation(async (id) => {
                if (mode === "failure")
                  throw new SystemError(
                    SystemErrorCode.ExternalApiError,
                    "Synthetic repository read unavailable",
                  );
                const note = await read(id);
                return note
                  ? { ...note, title: "現在値として観測した別の題名" }
                  : null;
              });
            try {
              return await work(u);
            } finally {
              spy.mockRestore();
            }
          });
        },
      },
    };
  }

  it.each([
    "prepare",
    "file",
  ] as const)("commits confirmed read loss at %s and cannot resurrect the old artifact when read returns", async (mode) => {
    const prior = await ready();
    const ticket = await prepareZipDelivery(c, viewer.token, prior.job.id, 1);
    await move({ kind: "personal", accountId: owner.id });
    expect((await artifact(prior.artifact.id)).state).toBe("ready");
    if (mode === "prepare")
      await expect(
        prepareZipDelivery(c, viewer.token, prior.job.id, 1),
      ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    else
      await expect(get(ticket.id)).rejects.toMatchObject({
        code: "ZIP_NOT_FOUND",
      });
    expect((await artifact(prior.artifact.id)).state).toBe("cleanup");
    await move({ kind: "workspace", workspaceId });
    await expect(
      prepareZipDelivery(c, viewer.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    await expect(get(ticket.id)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.findRun(prior.run)),
    ).toEqual(prior.run);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.attempts(prior.run)),
    ).toEqual(prior.attempts);
    expect((await getZip(c, viewer.token, prior.job.id)).available).toBe(false);
  });

  it("retires a confirmed content mismatch even after the injected current content view returns to its original value", async () => {
    const prior = await ready();
    await expect(
      prepareZipDelivery(faultyRead("changed"), viewer.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    expect((await artifact(prior.artifact.id)).state).toBe("cleanup");
    await expect(
      prepareZipDelivery(c, viewer.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.attempts(prior.run)),
    ).toEqual(prior.attempts);
  });

  it("does not retire an authentic artifact for missing authentication, another actor or a transient repository error", async () => {
    const prior = await ready();
    const ticket = await prepareZipDelivery(c, viewer.token, prior.job.id, 1);
    await expect(
      prepareZipDelivery(c, null, prior.job.id, 1),
    ).rejects.toThrow();
    await expect(
      getZipFile(c, null, ticket.id, new AbortController().signal),
    ).rejects.toThrow();
    await expect(
      prepareZipDelivery(c, owner.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    await expect(get(ticket.id, owner.token)).rejects.toMatchObject({
      code: "ZIP_NOT_FOUND",
    });
    await expect(
      prepareZipDelivery(faultyRead("failure"), viewer.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: SystemErrorCode.ExternalApiError });
    await expect(
      getZipFile(
        faultyRead("failure"),
        viewer.token,
        ticket.id,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: SystemErrorCode.ExternalApiError });
    expect(await artifact(prior.artifact.id)).toEqual(prior.artifact);
    const response = await get(ticket.id);
    expect(
      Buffer.from(await new Response(response.body).arrayBuffer()),
    ).toEqual(Buffer.from(await storage.read(prior.artifact.key)));
  });

  it("continues using an old artifact after a content-preserving move when its requester retains read", async () => {
    const prior = await ready(owner.token);
    const bytes = Buffer.from(await storage.read(prior.artifact.key));
    await move({ kind: "personal", accountId: owner.id });
    const ticket = await prepareZipDelivery(c, owner.token, prior.job.id, 1);
    const response = await get(ticket.id, owner.token);
    expect(
      Buffer.from(await new Response(response.body).arrayBuffer()),
    ).toEqual(bytes);
    expect(await artifact(prior.artifact.id)).toEqual(prior.artifact);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.findRun(prior.run)),
    ).toEqual(prior.run);
  });

  it("defers retirement cleanup while an existing delivery waits for its real native close", async () => {
    const prior = await ready();
    const ticket = await prepareZipDelivery(c, viewer.token, prior.job.id, 1);
    const closing = gate();
    const allow = gate();
    let captured: FileHandle | undefined;
    const original = storage.openOwnedRead.bind(storage);
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (key, signal) => {
        const owned = await original(key, signal);
        if (key !== prior.artifact.key) return owned;
        const call = vi.mocked(open).mock.results.at(-1);
        if (!call || call.type !== "return")
          throw new Error("Missing owned native file");
        const handle = await call.value;
        captured = handle;
        handles.push(handle);
        const native = handle.close.bind(handle);
        let shared: Promise<void> | undefined;
        vi.spyOn(handle, "close").mockImplementation(() => {
          shared ??= (async () => {
            closing.release();
            await allow.promise;
            await native();
          })();
          return shared;
        });
        return owned;
      },
    );
    const response = await get(ticket.id);
    await closing.promise;
    await move({ kind: "personal", accountId: owner.id });
    await expect(
      prepareZipDelivery(c, viewer.token, prior.job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    await sweepZip(c);
    expect((await artifact(prior.artifact.id)).state).toBe("cleanup");
    expect(captured?.fd).toBeGreaterThanOrEqual(0);
    expect(zip.transfers.ids()).toContain(ticket.id);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(ticket.id)))
        ?.state,
    ).not.toBe("closed");
    expect(
      await base.db.all(
        sql`select id from object_writes where kind='zip-delivery' and owner_id=${ticket.id} and active=1`,
      ),
    ).toHaveLength(1);
    await access(path.join(root, prior.artifact.key));
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBeGreaterThanOrEqual(prior.artifact.file.bytes);
    const cancelling = response.body.cancel();
    pending.push(cancelling);
    allow.release();
    await cancelling;
    await vi.waitFor(async () =>
      expect(
        (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(ticket.id)))
          ?.state,
      ).toBe("closed"),
    );
    expect(captured?.fd).toBe(-1);
    await sweepZip(c);
    expect((await artifact(prior.artifact.id)).state).toBe("removed");
    await expect(
      access(path.join(root, prior.artifact.key)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    expect(zip.transfers.ids()).toEqual([]);
  });
});

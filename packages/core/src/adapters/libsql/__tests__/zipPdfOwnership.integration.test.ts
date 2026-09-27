import { createHash } from "node:crypto";
import { type FileHandle, mkdtemp, open, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planExportDocument } from "@repo/core/adapters/node/exportDocument/plan";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import { planPdfDocument } from "@repo/core/adapters/node/pdf/document";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
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
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import { requestPdf } from "@repo/core/application/pdf/usecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import { previewZip } from "@repo/core/application/zip/preview";
import {
  cancelZip,
  getZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open) };
});

describe("ZIP PDF hold and native source ownership", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let pdf: NonNullable<HollowContainer["pdf"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let session: string;
  let noteId: string;
  let now: Date;
  let unknown: boolean;
  let releases: (() => void)[];
  let handles: { handle: FileHandle; nativeClose(): Promise<void> }[];
  const output = Buffer.from("%PDF-1.7\nsynthetic ownership bytes\n%%EOF\n");
  const digest = createHash("sha256").update(output).digest("hex");

  beforeEach(async () => {
    releases = [];
    handles = [];
    unknown = false;
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-pdf-owner-"));
    const mails: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(mail) {
          mails.push(mail.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
    };
    const signup = await signUp(c, {
      email: "zip-pdf-owner@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw Error("fixture account");
    session = auth.token;
    noteId = (
      await saveNote(c, session, { title: "PDF所有", html: "<p>保存本文</p>" })
    ).note.id;
    storage = new CoordinatedObjectStorage(root, c.unitOfWorkProvider, c.clock);
    await storage.recoverOwners();
    pdf = {
      writer: {
        async plan(input) {
          return planPdfDocument(input);
        },
      },
      sources: new FilePdfSourceReader(root),
      workspace: {
        reservation: () => 10,
        async writePack() {},
        async *readOutput() {
          yield output;
        },
        async remove() {
          return true;
        },
        async bytes() {
          return 100;
        },
      },
      supervisor: {
        profile: "synthetic-pdf-owner-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          signal.throwIfAborted();
          return {
            workspaceId: input.workspaceId,
            filename: input.plan.filename,
            bytes: output.length,
            sha256: digest,
          };
        },
      },
      execution: new NodePdfExecution(),
      transfers: new NodePdfTransfers(),
      capacity: {
        diskBytes: 100_000,
        outputBytes: 1000,
        nativeTempBytes: 1000,
        finalCopyBytes: 1000,
        totalMs: 120_000,
        renderMs: 30_000,
        termGraceMs: 3000,
        leaseMs: 60_000,
        cleanupDelayMs: 5000,
      },
      defaultCss: "",
      wake() {},
    };
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
      pdf,
      importing: {
        storage,
        extractor: {
          async extract() {
            throw Error("unused");
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
    for (const release of releases) release();
    const stopped = await Promise.allSettled([
      zip?.execution.stop(),
      zip?.transfers.stop(),
      pdf?.execution.stop(),
      pdf?.transfers.stop(),
    ]);
    vi.restoreAllMocks();
    for (const captured of handles)
      if (captured.handle.fd !== -1) await captured.nativeClose();
    expect(handles.every((captured) => captured.handle.fd === -1)).toBe(true);
    try {
      if (unknown)
        expect(stopped[0]).toMatchObject({
          status: "rejected",
          reason: { code: "ZIP_OWNERSHIP_UNKNOWN" },
        });
      else {
        expect(stopped.every((result) => result.status === "fulfilled")).toBe(
          true,
        );
        expect(await activeOwners()).toEqual([]);
      }
      expect(
        stopped.slice(1).every((result) => result.status === "fulfilled"),
      ).toBe(true);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
      vi.clearAllMocks();
    }
  });
  function gate() {
    let release = () => {};
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    releases.push(release);
    return { promise, release };
  }
  const activeOwners = () =>
    base.db.all<{ kind: string; owner_id: string }>(
      sql`select kind,owner_id from object_writes where active=1`,
    );
  const run = (id: string) =>
    c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: id, generation: 1 }),
    );
  const progress = async (id: string) =>
    c.unitOfWorkProvider.run(async (u) => {
      const attempt = (
        await u.zipRequests.attempts({ requestId: id, generation: 1 })
      )[0];
      if (!attempt) throw Error("fixture attempt");
      return { attempt, value: await u.zipPdf.find(attempt.id) };
    });
  async function request() {
    const preview = await previewZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
    });
    return requestZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  async function cache() {
    const request = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(request.id)),
        ).toMatchObject({ state: "succeeded" }),
      { timeout: 5000, interval: 10 },
    );
    const own = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(request.id),
    );
    if (!own || own.state !== "succeeded") throw Error("fixture PDF cache");
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(own.artifactId),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture artifact");
    await vi.waitFor(() =>
      expect(pdf.execution.active(artifact.computeId)).toBe(false),
    );
    return artifact;
  }
  function closeFault(key: string, fail: boolean) {
    const closing = gate();
    const allowClose = gate();
    let captured: FileHandle | undefined;
    const openOwned = storage.openOwnedRead.bind(storage);
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (sourceKey, signal) => {
        const owned = await openOwned(sourceKey, signal);
        if (sourceKey !== key) return owned;
        const call = vi.mocked(open).mock.results.at(-1);
        if (!call || call.type !== "return") throw Error("fixture native open");
        const handle = await call.value;
        const nativeClose = handle.close.bind(handle);
        handles.push({ handle, nativeClose });
        captured = handle;
        let shared: Promise<void> | undefined;
        vi.spyOn(handle, "close").mockImplementation(() => {
          shared ??= (async () => {
            closing.release();
            await allowClose.promise;
            if (fail) throw Error("synthetic native close failure");
            await nativeClose();
          })();
          return shared;
        });
        return owned;
      },
    );
    return { closing, allowClose, handle: () => captured };
  }

  it("retains PDF hold, source owner, stopping run and reservation while cancelled native close is gated", async () => {
    const artifact = await cache();
    const fault = closeFault(artifact.key, false);
    const job = await request();
    await pumpZip(c);
    await fault.closing.promise;
    expect(fault.handle()?.fd).toBeGreaterThanOrEqual(0);
    const active = await progress(job.id);
    expect(active.value?.hold?.state).toBe("reading");
    await cancelZip(c, session, job.id);
    const reserved = await c.unitOfWorkProvider.run((u) =>
      u.zipWork.reserved(),
    );
    expect(reserved.bytes).toBeGreaterThan(0);
    expect((await run(job.id))?.state).toBe("stopping");
    expect(zip.execution.active(`${job.id}:1`)).toBe(true);
    expect(await activeOwners()).toContainEqual({
      kind: "zip-source",
      owner_id: active.attempt.id,
    });
    expect((await progress(job.id)).value?.hold?.state).toBe("reading");
    await sweepZip(c);
    expect(await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).toEqual(
      reserved,
    );
    expect((await progress(job.id)).value?.hold?.state).toBe("reading");
    fault.allowClose.release();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect(fault.handle()?.fd).toBe(-1);
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect((await progress(job.id)).value).toBeNull();
    expect(await activeOwners()).toEqual([]);
    await sweepZip(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
  });

  it("retains an unknown native close and rejects stop without fabricating source release", async () => {
    const artifact = await cache();
    const fault = closeFault(artifact.key, true);
    const job = await request();
    await pumpZip(c);
    await fault.closing.promise;
    fault.allowClose.release();
    unknown = true;
    await vi.waitFor(
      async () =>
        expect(await run(job.id)).toMatchObject({
          state: "stopping",
          failure: "ZIP_OWNERSHIP_UNKNOWN",
        }),
      { timeout: 5000, interval: 10 },
    );
    await expect(zip.execution.stop()).rejects.toMatchObject({
      code: "ZIP_OWNERSHIP_UNKNOWN",
    });
    const active = await progress(job.id);
    expect(active.value?.hold?.state).toBe("reading");
    expect(fault.handle()?.fd).toBeGreaterThanOrEqual(0);
    expect(zip.execution.active(`${job.id}:1`)).toBe(true);
    expect(await activeOwners()).toContainEqual({
      kind: "zip-source",
      owner_id: active.attempt.id,
    });
    const reserved = await c.unitOfWorkProvider.run((u) =>
      u.zipWork.reserved(),
    );
    expect(reserved.bytes).toBeGreaterThan(0);
    await sweepZip(c);
    expect((await progress(job.id)).value?.hold?.state).toBe("reading");
    expect(await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).toEqual(
      reserved,
    );
  });

  it("commits trash and purge with an unopened hold, then reclaims physical PDF only after release", async () => {
    const poll = gate();
    vi.spyOn(zip.execution, "waitForPoll").mockImplementation(
      async (signal) => {
        await poll.promise;
        signal.throwIfAborted();
      },
    );
    const job = await request();
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await progress(job.id)).value?.demand.binding.phase).toBe(
          "waiting-pdf",
        ),
      { timeout: 5000, interval: 10 },
    );
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect((await progress(job.id)).value?.hold?.state).toBe("held"),
      { timeout: 5000, interval: 10 },
    );
    const active = await progress(job.id);
    if (!active.value?.hold) throw Error("fixture held PDF");
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(active.value?.hold?.artifactId ?? ""),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture PDF artifact");
    await vi.waitFor(() =>
      expect(pdf.execution.active(artifact.computeId)).toBe(false),
    );
    const opening = vi.spyOn(storage, "openOwnedRead");
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw Error("fixture note");
    const trashed = await trashNote(c, session, {
      id: noteId,
      version: note.version,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, session, trashed);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
        ?.lifecycle.kind,
    ).toBe("purging");
    await expect(
      requestPdf(c, session, { noteId, commandId: c.idGenerator.next() }),
    ).rejects.toMatchObject({ code: "PDF_NOT_FOUND" });
    const unavailable = await previewZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
    });
    expect(unavailable).toMatchObject({ items: [], total: 0, excluded: 1 });
    await expect(
      requestZip(c, session, {
        noteIds: [noteId],
        format: "pdf",
        confirmation: unavailable.confirmation,
        commandId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "ZIP_NO_TARGETS" });
    const holdVersion = active.value.hold.version;
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipPdf.claimCopy(
          active.attempt.id,
          holdVersion,
          { token: "fixture-copy", runtimeId: zip.execution.runtimeId },
          now,
        ),
      ),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.claimCleanup(
          now,
          "fixture-cleanup",
          new Date(now.getTime() + 60_000),
        ),
      ),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfArtifacts.find(artifact.id)),
    ).toMatchObject({
      key: artifact.key,
      generation: artifact.generation,
      reservedBytes: artifact.reservedBytes,
    });
    await sweepPdf(c);
    await sweepNotePurges(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)))?.state,
    ).not.toBe("succeeded");
    expect((await progress(job.id)).value?.hold?.state).toBe("held");
    expect(opening).not.toHaveBeenCalled();
    expect((await stat(path.join(root, artifact.key))).size).toBe(
      output.length,
    );
    poll.release();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect((await progress(job.id)).value).toBeNull();
    await sweepPdf(c);
    await sweepZip(c);
    now = new Date(now.getTime() + 60_000);
    await sweepNotePurges(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)))?.state,
    ).toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).toBeNull();
    await expect(stat(path.join(root, artifact.key))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

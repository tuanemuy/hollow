import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
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
import { saveNote } from "@repo/core/application/note/saveNote";
import { requestPdf } from "@repo/core/application/pdf/usecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { previewZipRetry, retryZip } from "@repo/core/application/zip/retry";
import {
  cancelZip,
  getZip,
  listZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip } from "@repo/core/application/zip/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import yauzl from "yauzl";
import { createTestContainer, type TestContainer } from "./helpers";

describe("PDF ZIP third demand and retained copy flow", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let pdf: NonNullable<HollowContainer["pdf"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let session: string;
  let noteId: string;
  let now: Date;
  let renders: number;
  let releases: (() => void)[];
  const output = Buffer.from(
    "%PDF-1.7\nsynthetic ZIP flow bytes only\n%%EOF\n",
  );
  const digest = createHash("sha256").update(output).digest("hex");
  beforeEach(async () => {
    releases = [];
    renders = 0;
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-pdf-flow-"));
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
      email: "zip-pdf-flow@example.test",
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
      await saveNote(c, session, { title: "PDF集合", html: "<p>保存本文</p>" })
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
        profile: "synthetic-zip-pdf-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          signal.throwIfAborted();
          renders++;
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
    const failures = stopped.filter((item) => item.status === "rejected");
    if (failures.length)
      throw new AggregateError(
        failures.map((item) => item.reason),
        "fixture ownership not closed",
      );
    try {
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });
  function gate() {
    let resolve: () => void = () => {};
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    releases.push(resolve);
    return { promise, release: resolve };
  }
  function blockPoll() {
    const held = gate();
    const spy = vi
      .spyOn(zip.execution, "waitForPoll")
      .mockImplementation(async (signal) => {
        await held.promise;
        signal.throwIfAborted();
      });
    return () => {
      spy.mockRestore();
      held.release();
    };
  }
  async function request(noteIds = [noteId]) {
    const preview = await previewZip(c, session, {
      noteIds,
      format: "pdf",
    });
    return requestZip(c, session, {
      noteIds,
      format: "pdf",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  async function progress(requestId: string) {
    return c.unitOfWorkProvider.run(async (u) => {
      const attempt = (
        await u.zipRequests.attempts({ requestId, generation: 1 })
      )[0];
      if (!attempt) throw Error("fixture attempt");
      return { attempt, progress: await u.zipPdf.find(attempt.id) };
    });
  }
  async function waiting(requestId: string) {
    try {
      await vi.waitFor(
        async () =>
          expect(
            (await progress(requestId)).progress?.demand.binding.phase,
          ).toBe("waiting-pdf"),
        { timeout: 5000, interval: 10 },
      );
    } catch (cause) {
      const current = await progress(requestId);
      const run = await getZip(c, session, requestId);
      throw new Error(
        JSON.stringify({
          phase: current.progress?.demand.binding.phase ?? null,
          attemptState: current.attempt.state,
          failure: current.attempt.failure,
          runState: run.state,
        }),
        { cause },
      );
    }
    const value = (await progress(requestId)).progress;
    if (!value) throw Error("fixture demand");
    return value;
  }
  async function published(requestId: string) {
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect((await progress(requestId)).progress?.hold?.state).toBe("held"),
      { timeout: 5000, interval: 10 },
    );
    const value = (await progress(requestId)).progress;
    if (!value?.hold) throw Error("fixture hold");
    await vi.waitFor(() =>
      expect(pdf.execution.active(value.demand.binding.computeId)).toBe(false),
    );
    expect(value.demand.binding.phase).toBe("copy-ready");
    return value;
  }
  async function complete(requestId: string) {
    await vi.waitFor(
      async () =>
        expect((await getZip(c, session, requestId)).state).toBe("succeeded"),
      { timeout: 6000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${requestId}:1`)).toBe(false),
    );
    const artifact = await c.unitOfWorkProvider.run(async (u) => {
      const run = await u.zipRequests.findRun({ requestId, generation: 1 });
      return run?.artifactId ? u.zipArtifacts.find(run.artifactId) : null;
    });
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture ZIP artifact");
    const bytes = Buffer.from(await storage.read(artifact.key));
    expect(bytes.length).toBe(artifact.file.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      artifact.file.sha256,
    );
    const entries = await new Promise<Map<string, Buffer>>(
      (resolve, reject) => {
        yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, archive) => {
          if (error) return reject(error);
          const result = new Map<string, Buffer>();
          archive.on("error", reject);
          archive.on("end", () => resolve(result));
          archive.on("entry", (entry: yauzl.Entry) => {
            expect(entry.compressionMethod).toBe(0);
            archive.openReadStream(entry, (readError, stream) => {
              if (readError || !stream) {
                archive.close();
                reject(readError ?? Error("missing stream"));
                return;
              }
              const chunks: Buffer[] = [];
              stream.on("data", (chunk: Buffer) => chunks.push(chunk));
              stream.on("error", (failure) => {
                archive.close();
                reject(failure);
              });
              stream.on("end", () => {
                result.set(entry.fileName, Buffer.concat(chunks));
                archive.readEntry();
              });
            });
          });
          archive.readEntry();
        });
      },
    );
    expect(entries.get("PDF集合.pdf")).toEqual(output);
    expect([...entries.keys()]).toEqual([
      "PDF集合.pdf",
      "hollow-export-report.txt",
    ]);
    expect((await progress(requestId)).progress).toBeNull();
    expect(
      await base.db.all(
        sql`select state from zip_pdf_holds where attempt_id in(select id from zip_attempts where request_id=${requestId})`,
      ),
    ).toEqual([{ state: "released" }]);
  }

  it("publishes third-demand hold then copies real storage into STORE without fake personal or anonymous requests", async () => {
    const release = blockPoll();
    const job = await request();
    await pumpZip(c);
    const demand = await waiting(job.id);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfDemands.find(demand.demand.binding.computeId, now),
      ),
    ).toMatchObject({ kind: "zip-child" });
    const held = await published(job.id);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.find(held.hold?.artifactId ?? ""),
      ),
    ).toMatchObject({
      state: "ready",
      generation: held.hold?.artifactGeneration,
    });
    expect(await base.db.all(sql`select count(*) n from pdf_requests`)).toEqual(
      [{ n: 0 }],
    );
    expect(
      await base.db.all(sql`select count(*) n from pdf_anonymous_requests`),
    ).toEqual([{ n: 0 }]);
    release();
    await complete(job.id);
    expect(renders).toBe(1);
  });

  it("keeps same-command receipts readable without permitting new PDF work after configuration disappears", async () => {
    const preview = await previewZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
    });
    const command = {
      noteIds: [noteId],
      format: "pdf" as const,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    const job = await requestZip(c, session, command);
    const { pdf: _pdf, ...withoutPdf } = c;
    expect(await requestZip(withoutPdf, session, command)).toEqual(job);
    await expect(
      previewZip(withoutPdf, session, { noteIds: [noteId], format: "pdf" }),
    ).rejects.toMatchObject({ code: "PDF_NOT_CONFIGURED" });
    await expect(
      requestZip(withoutPdf, session, {
        ...command,
        commandId: c.idGenerator.next(),
      }),
    ).rejects.toMatchObject({ code: "PDF_NOT_CONFIGURED" });
    expect(await listZip(withoutPdf, session, null)).toMatchObject({
      configured: true,
      availableFormats: ["html", "markdown"],
    });
    expect(await listZip(c, session, null)).toMatchObject({
      configured: true,
      availableFormats: ["html", "markdown", "pdf"],
    });
    await cancelZip(c, session, job.id);
    await pumpZip(c);
    const html = await previewZip(withoutPdf, session, {
      noteIds: [noteId],
      format: "html",
    });
    expect(html.total).toBe(1);
  });

  it("keeps successful PDF spools while explicitly retrying only the failed sibling", async () => {
    const broken = (
      await saveNote(c, session, { title: "失敗", html: "<p>失敗する本文</p>" })
    ).note.id;
    let fail = true;
    const render = pdf.supervisor.render.bind(pdf.supervisor);
    const renderer = vi
      .spyOn(pdf.supervisor, "render")
      .mockImplementation(async (input, signal) => {
        if (fail && input.plan.filename === "失敗.pdf")
          throw new BusinessRuleError(
            "PDF_RENDER_FAILED",
            "synthetic render failure",
          );
        return render(input, signal);
      });
    const job = await request([broken, noteId]);
    await pumpZip(c);
    await vi.waitFor(
      async () => {
        await sweepPdf(c);
        await pumpZip(c);
        expect((await getZip(c, session, job.id)).state).toBe("partial");
      },
      { timeout: 8000, interval: 20 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    const original = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
    );
    const before = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.latestAttempts(job.id),
    );
    expect(before.map((row) => row.state)).toEqual(["failed", "succeeded"]);
    const saved = before[1];
    fail = false;
    now = new Date(now.getTime() + 1000);
    const input = {
      id: job.id,
      generation: 1,
      mode: "failed" as const,
      ordinals: [0],
    };
    const preview = await previewZipRetry(c, session, input);
    const retried = await retryZip(c, session, {
      ...input,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    expect(retried.generation).toBe(2);
    await pumpZip(c);
    await vi.waitFor(
      async () => {
        await sweepPdf(c);
        await pumpZip(c);
        expect((await getZip(c, session, job.id)).state).toBe("succeeded");
      },
      { timeout: 6000, interval: 20 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:2`)).toBe(false),
    );
    expect(renderer.mock.calls.map(([input]) => input.plan.filename)).toEqual([
      "失敗.pdf",
      "PDF集合.pdf",
      "失敗.pdf",
    ]);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attemptsByIds([saved.id]),
      ),
    ).toEqual([saved]);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
      ),
    ).toEqual(original);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.zipRequests.latestAttempts(job.id),
        )
      ).map((row) => row.state),
    ).toEqual(["succeeded", "succeeded"]);
  }, 20000);

  it("waits within the same child deadline for the previous PDF workspace cleanup before the next ordinal", async () => {
    const second = await saveNote(c, session, {
      title: "次のPDF",
      html: "<p>次の本文</p>",
    });
    const release = blockPoll();
    const job = await request([noteId, second.note.id]);
    await pumpZip(c);
    await waiting(job.id);
    const first = await published(job.id);
    release();
    const attempts = () =>
      c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: job.id, generation: 1 }),
      );
    await vi.waitFor(
      async () => {
        const rows = await attempts();
        expect(rows[0].state).toBe("succeeded");
        expect(rows[1]).toMatchObject({ state: "running" });
        expect(rows[1].pdf).toBeUndefined();
      },
      { timeout: 5000, interval: 10 },
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(first.demand.binding.computeId),
      ),
    ).toMatchObject({ state: "closed", workspaceRemoved: false });
    const deadline = await c.unitOfWorkProvider.run(
      async (u) =>
        (await u.zipRequests.findRun({ requestId: job.id, generation: 1 }))
          ?.deadlineAt,
    );
    await sweepPdf(c);
    await vi.waitFor(
      async () => expect((await attempts())[1].pdf?.phase).toBe("waiting-pdf"),
      { timeout: 5000, interval: 10 },
    );
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
      { timeout: 6000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect(renders).toBe(2);
    expect((await attempts()).map((row) => [row.state, row.pdf])).toEqual([
      ["succeeded", undefined],
      ["succeeded", undefined],
    ]);
    expect(
      await c.unitOfWorkProvider.run(
        async (u) =>
          (await u.zipRequests.findRun({ requestId: job.id, generation: 1 }))
            ?.deadlineAt,
      ),
    ).toEqual(deadline);
  }, 15000);

  it("acquires the existing personal PDF cache into a bound hold without rendering again", async () => {
    const personal = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect(
          await c.unitOfWorkProvider.run((u) =>
            u.pdfRequests.find(personal.id),
          ),
        ).toMatchObject({ state: "succeeded" }),
      { timeout: 5000, interval: 10 },
    );
    const own = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(personal.id),
    );
    if (!own || own.state !== "succeeded") throw Error("fixture PDF cache");
    await vi.waitFor(() =>
      expect(pdf.execution.active(own.computeId ?? "")).toBe(false),
    );
    const held = gate();
    let opened = false;
    const open = storage.openOwnedRead.bind(storage);
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (key, signal) => {
        if (key.endsWith("_pdf")) {
          opened = true;
          await held.promise;
        }
        return open(key, signal);
      },
    );
    const job = await request();
    await pumpZip(c);
    await vi.waitFor(() => expect(opened).toBe(true), {
      timeout: 5000,
      interval: 10,
    });
    expect((await progress(job.id)).progress).toMatchObject({
      demand: { binding: { phase: "copying" } },
      hold: { artifactId: own.artifactId, state: "reading" },
    });
    expect(renders).toBe(1);
    held.release();
    await complete(job.id);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(personal.id)),
    ).toEqual(own);
  });

  it("finishes a pre-expiry hold across the PDF 24-hour boundary and serves the independent seven-day ZIP", async () => {
    const personal = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    await sweepPdf(c);
    await vi.waitFor(async () =>
      expect(
        await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(personal.id)),
      ).toMatchObject({ state: "succeeded" }),
    );
    const own = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(personal.id),
    );
    if (!own || own.state !== "succeeded") throw Error("fixture PDF cache");
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(own.artifactId),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture PDF artifact");
    await vi.waitFor(() =>
      expect(pdf.execution.active(artifact.computeId)).toBe(false),
    );
    now = new Date(artifact.expiresAt.getTime() - 100);
    const held = gate();
    let opened = false;
    const open = storage.openOwnedRead.bind(storage);
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (key, signal) => {
        if (key === artifact.key) {
          opened = true;
          await held.promise;
        }
        return open(key, signal);
      },
    );
    const job = await request();
    await pumpZip(c);
    await vi.waitFor(() => expect(opened).toBe(true));
    expect((await progress(job.id)).progress?.hold?.acquiredAt).toEqual(now);
    now = new Date(now.getTime() + 200);
    held.release();
    await complete(job.id);
    const result = await getZip(c, session, job.id);
    expect(result.available).toBe(true);
    expect(result.expiresAt).toBe(
      new Date(now.getTime() + 7 * 86400000).toISOString(),
    );
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfArtifacts.find(artifact.id)),
    ).toMatchObject({ state: "removed" });
    const ticket = await prepareZipDelivery(c, session, job.id, 1);
    const response = await getZipFile(
      c,
      session,
      ticket.id,
      new AbortController().signal,
    );
    expect(
      (await new Response(response.body).arrayBuffer()).byteLength,
    ).toBeGreaterThan(output.length);
    expect(renders).toBe(1);
  });

  it("allows held copy after logical retirement while rejecting new holds on the retired artifact", async () => {
    const release = blockPoll();
    const first = await request();
    await pumpZip(c);
    await waiting(first.id);
    const held = await published(first.id);
    if (!held.hold) throw Error("fixture held");
    const artifactId = held.hold.artifactId;
    const before = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(artifactId),
    );
    await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.retire(artifactId, now),
    );
    const retired = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(artifactId),
    );
    expect(retired).toMatchObject({
      state: "cleanup",
      key: before?.key,
      generation: before?.generation,
      reservedBytes: before?.reservedBytes,
    });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfArtifacts.claimCleanup(
          now,
          "test-cleanup",
          new Date(now.getTime() + 60_000),
        ),
      ),
    ).toBeNull();
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.find(held.demand.binding.computeId),
      ),
    ).toMatchObject({ state: "closed", workspaceRemoved: true });
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfArtifacts.find(artifactId)),
    ).toMatchObject({
      state: "cleanup",
      key: before?.key,
      generation: before?.generation,
      reservedBytes: before?.reservedBytes,
    });
    release();
    await complete(first.id);
    const releaseNext = blockPoll();
    const second = await request();
    await pumpZip(c);
    await waiting(second.id);
    const next = await progress(second.id);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipPdf.acquireCached(
          next.attempt.id,
          next.attempt.version,
          artifactId,
          now,
        ),
      ),
    ).toBe(false);
    expect((await progress(second.id)).progress?.hold).toBeNull();
    const nextHeld = await published(second.id);
    expect(nextHeld.hold?.artifactId).not.toBe(artifactId);
    releaseNext();
    await complete(second.id);
    expect(renders).toBe(2);
  }, 15_000);

  it("cancels only ZIP demand while the same compute still serves a legitimate personal request", async () => {
    const personal = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    const own = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(personal.id),
    );
    if (!own || own.state !== "queued") throw Error("fixture queued PDF");
    const computeId = own.computeId;
    if (!computeId) throw Error("fixture PDF computation");
    const release = blockPoll();
    const job = await request();
    await pumpZip(c);
    const demand = await waiting(job.id);
    expect(demand.demand.binding.computeId).toBe(own.computeId);
    await cancelZip(c, session, job.id);
    release();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.find(computeId)),
    ).toMatchObject({ state: "queued" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDemands.find(computeId, now)),
    ).toMatchObject({ kind: "account" });
    await sweepPdf(c);
    await vi.waitFor(
      async () =>
        expect(
          await c.unitOfWorkProvider.run((u) =>
            u.pdfRequests.find(personal.id),
          ),
        ).toMatchObject({ state: "succeeded" }),
      { timeout: 5000, interval: 10 },
    );
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect((await progress(job.id)).progress).toBeNull();
    expect(renders).toBe(1);
  });
});

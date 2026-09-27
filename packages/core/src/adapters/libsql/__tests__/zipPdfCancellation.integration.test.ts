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
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import type { PdfAnonymousTicketClaims } from "@repo/core/application/pdf/anonymousPorts";
import {
  anonymousPdfStatus,
  requestAnonymousPdf,
} from "@repo/core/application/pdf/anonymousUsecases";
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

describe("ZIP PDF waiting cancellation and independent anonymous demand", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let pdf: NonNullable<HollowContainer["pdf"]>;
  let root: string;
  let session: string;
  let noteId: string;
  let now: Date;
  let unknown: boolean;
  let failUnknown: boolean;
  let renderSignal: AbortSignal | null;
  let renderStarted: boolean;
  let renderFinished: boolean;
  let workspaceRemovals: number;
  let releaseRender: () => void;
  const output = Buffer.from("%PDF-1.7\nsynthetic cancellation bytes\n%%EOF\n");
  const digest = createHash("sha256").update(output).digest("hex");
  const access = {
    kind: "link" as const,
    token: "a".repeat(43),
    browser: "b".repeat(43),
  };

  beforeEach(async () => {
    unknown = false;
    failUnknown = false;
    renderSignal = null;
    renderStarted = false;
    renderFinished = false;
    workspaceRemovals = 0;
    now = new Date();
    const renderGate = new Promise<void>((resolve) => {
      releaseRender = resolve;
    });
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-pdf-cancel-"));
    const mails: string[] = [];
    const tickets = new Map<string, PdfAnonymousTicketClaims>();
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(mail) {
          mails.push(mail.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
      pdfAnonymousTicketSigner: {
        activeKeyId: () => "fixture",
        sign(claims) {
          const ticket = `fixture-ticket-${tickets.size + 1}`;
          tickets.set(ticket, claims);
          return ticket;
        },
        verify: (ticket) => tickets.get(ticket) ?? null,
      },
    };
    const signup = await signUp(c, {
      email: "zip-pdf-cancel@example.test",
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
      await saveNote(c, session, { title: "PDF需要", html: "<p>保存本文</p>" })
    ).note.id;
    const storage = new CoordinatedObjectStorage(
      root,
      c.unitOfWorkProvider,
      c.clock,
    );
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
          workspaceRemovals++;
          return true;
        },
        async bytes() {
          return 100;
        },
      },
      supervisor: {
        profile: "synthetic-pdf-cancel-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          renderStarted = true;
          renderSignal = signal;
          try {
            await renderGate;
            if (failUnknown)
              throw new SystemError(
                SystemErrorCode.PdfOwnershipUnknown,
                "Synthetic renderer ownership uncertainty",
              );
            signal.throwIfAborted();
            return {
              workspaceId: input.workspaceId,
              filename: input.plan.filename,
              bytes: output.length,
              sha256: digest,
            };
          } finally {
            renderFinished = true;
          }
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
    releaseRender();
    const stopped = await Promise.allSettled([
      zip?.execution.stop(),
      zip?.transfers.stop(),
      pdf?.execution.stop(),
      pdf?.transfers.stop(),
    ]);
    if (renderStarted) expect(renderFinished).toBe(true);
    try {
      if (unknown)
        expect(stopped[0]).toMatchObject({
          status: "rejected",
          reason: { code: "ZIP_EXECUTION_UNPROVEN" },
        });
      else
        expect(stopped.every((item) => item.status === "fulfilled")).toBe(true);
      expect(
        stopped.slice(1).every((item) => item.status === "fulfilled"),
      ).toBe(true);
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
    }
  });
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
      return u.zipPdf.find(attempt.id);
    });
  async function waitingZip() {
    const preview = await previewZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
    });
    const job = await requestZip(c, session, {
      noteIds: [noteId],
      format: "pdf",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await progress(job.id))?.demand.binding.phase).toBe(
          "waiting-pdf",
        ),
      { timeout: 5000, interval: 10 },
    );
    const demand = await progress(job.id);
    if (!demand) throw Error("fixture demand");
    return { job, demand, computeId: demand.demand.binding.computeId };
  }
  async function render() {
    await sweepPdf(c);
    await vi.waitFor(() => expect(renderStarted).toBe(true), {
      timeout: 5000,
      interval: 10,
    });
  }

  it("keeps the last waiting demand bound until the fake renderer really finishes after abort", async () => {
    const { job, computeId } = await waitingZip();
    await render();
    await cancelZip(c, session, job.id);
    await vi.waitFor(() => expect(renderSignal?.aborted).toBe(true), {
      timeout: 5000,
      interval: 10,
    });
    expect(renderFinished).toBe(false);
    expect(await run(job.id)).toMatchObject({
      state: "stopping",
      finishedAt: null,
    });
    expect((await progress(job.id))?.demand.binding.computeId).toBe(computeId);
    expect(pdf.execution.active(computeId)).toBe(true);
    expect(zip.execution.active(`${job.id}:1`)).toBe(true);
    const compute = await c.unitOfWorkProvider.run((u) =>
      u.pdfComputations.find(computeId),
    );
    expect(compute).toMatchObject({
      state: "stopping",
      workspaceRemoved: false,
    });
    expect(compute?.reservedBytes).toBeGreaterThan(0);
    await sweepPdf(c);
    await sweepZip(c);
    expect(workspaceRemovals).toBe(0);
    expect((await progress(job.id))?.demand.binding.computeId).toBe(computeId);
    releaseRender();
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect(renderFinished).toBe(true);
    expect(pdf.execution.active(computeId)).toBe(false);
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect(await progress(job.id)).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.find(computeId)),
    ).toMatchObject({ state: "closed" });
  }, 15_000);

  it("detaches only cancelled ZIP while a legitimate anonymous sibling continues on the same compute", async () => {
    await c.unitOfWorkProvider.run(async (u) => {
      const sharing = await u.sharing.find(noteId);
      if (!sharing) throw Error("fixture sharing");
      expect(
        await u.sharing.save(
          {
            ...sharing,
            visibility: "link",
            linkGeneration: 1,
            tokenHash: c.tokens.hash(access.token),
            tokenEnvelope: "synthetic-only",
            grantEpoch: 1,
            version: sharing.version + 1,
          },
          sharing.version,
        ),
      ).toBe(true);
    });
    const { job, computeId } = await waitingZip();
    const anonymous = await requestAnonymousPdf(
      c,
      access,
      c.idGenerator.next(),
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDemands.find(computeId, now)),
    ).toMatchObject({ kind: "anonymous" });
    await render();
    await cancelZip(c, session, job.id);
    await vi.waitFor(
      () => expect(zip.execution.active(`${job.id}:1`)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect(await progress(job.id)).toBeNull();
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect(renderSignal?.aborted).toBe(false);
    expect(renderFinished).toBe(false);
    expect(pdf.execution.active(computeId)).toBe(true);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.find(computeId)),
    ).toMatchObject({ state: "running" });
    releaseRender();
    await vi.waitFor(
      async () =>
        expect(
          await anonymousPdfStatus(c, access, anonymous.ticket),
        ).toMatchObject({ kind: "ready" }),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() => expect(pdf.execution.active(computeId)).toBe(false));
    expect(renderFinished).toBe(true);
    expect(await base.db.all(sql`select count(*) n from pdf_requests`)).toEqual(
      [{ n: 0 }],
    );
    expect(
      await base.db.all(sql`select state from pdf_anonymous_requests`),
    ).toEqual([{ state: "succeeded" }]);
  }, 15_000);

  it("keeps typed PDF unknown fenced with the ZIP binding and rejects normal ZIP stop", async () => {
    failUnknown = true;
    unknown = true;
    const { job, computeId } = await waitingZip();
    await render();
    releaseRender();
    await vi.waitFor(
      () => expect(pdf.execution.active(computeId)).toBe(false),
      { timeout: 5000, interval: 10 },
    );
    expect(renderFinished).toBe(true);
    await vi.waitFor(
      async () =>
        expect(await run(job.id)).toMatchObject({
          state: "stopping",
          failure: "ZIP_EXECUTION_UNPROVEN",
          finishedAt: null,
        }),
      { timeout: 5000, interval: 10 },
    );
    await expect(zip.execution.stop()).rejects.toMatchObject({
      code: "ZIP_EXECUTION_UNPROVEN",
    });
    expect(zip.execution.active(`${job.id}:1`)).toBe(true);
    expect((await progress(job.id))?.demand.binding.computeId).toBe(computeId);
    const compute = await c.unitOfWorkProvider.run((u) =>
      u.pdfComputations.find(computeId),
    );
    expect(compute).toMatchObject({
      state: "stopping",
      workspaceRemoved: false,
    });
    expect(compute?.reservedBytes).toBeGreaterThan(0);
    await sweepPdf(c);
    await sweepZip(c);
    expect(workspaceRemovals).toBe(0);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.find(computeId)),
    ).toEqual(compute);
    expect((await progress(job.id))?.demand.binding.computeId).toBe(computeId);
    expect((await run(job.id))?.state).toBe("stopping");
  }, 15_000);
});

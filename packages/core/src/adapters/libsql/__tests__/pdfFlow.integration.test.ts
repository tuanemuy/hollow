import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planPdfDocument } from "@repo/core/adapters/node/pdf/document";
import { NodePdfExecution } from "@repo/core/adapters/node/pdf/execution";
import { FilePdfSourceReader } from "@repo/core/adapters/node/pdf/source";
import { NodePdfTransfers } from "@repo/core/adapters/node/pdf/transfers";
import { signOut } from "@repo/core/application/account/session";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import { getPdfFile } from "@repo/core/application/pdf/delivery";
import type { PdfRenderInput } from "@repo/core/application/pdf/ports";
import {
  cancelPdf,
  listPdf,
  lookupPdf,
  preparePdfDelivery,
  requestPdf,
} from "@repo/core/application/pdf/usecases";
import { sweepPdf } from "@repo/core/application/pdf/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pdfHttp } from "../../../../../../apps/web/app/presentation/pdfHttp.node";
import { createTestContainer, type TestContainer } from "./helpers";

describe("authenticated PDF request, worker, retained file and delivery", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let pdf: NonNullable<HollowContainer["pdf"]>;
  let root: string;
  let token: string;
  let noteId: string;
  let actorId: string;
  let now: Date;
  let renders: number;
  let removed: number;
  let failRemove: boolean;
  let renderHook:
    | ((input: PdfRenderInput, signal: AbortSignal) => Promise<void>)
    | null;
  const output = new TextEncoder().encode(
    "%PDF-1.7\nsynthetic service integration payload\n%%EOF\n",
  );
  const digest = createHash("sha256").update(output).digest("hex");
  beforeEach(async () => {
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-pdf-flow-"));
    now = new Date();
    renders = 0;
    removed = 0;
    failRemove = false;
    renderHook = null;
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
      email: "pdf-flow@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      signup.browserToken,
    );
    if (!auth) throw Error("fixture");
    token = auth.token;
    actorId = auth.user.id;
    noteId = (
      await saveNote(c, token, {
        title: "現在のPDF",
        html: "<p>現在の本文</p>",
      })
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
          if (failRemove) throw Error("injected-remove");
          removed++;
          return true;
        },
        async bytes() {
          return 100;
        },
      },
      supervisor: {
        profile: "synthetic-renderer-v1",
        async recover() {},
        async stop() {},
        async render(input, signal) {
          renders++;
          await renderHook?.(input, signal);
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
        diskBytes: 100000,
        outputBytes: 1000,
        nativeTempBytes: 1000,
        finalCopyBytes: 1000,
        totalMs: 120000,
        renderMs: 30000,
        termGraceMs: 3000,
        leaseMs: 60000,
        cleanupDelayMs: 5000,
      },
      defaultCss: "",
      wake() {},
    };
    c = {
      ...c,
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
    await pdf?.execution.stop();
    await pdf?.transfers.stop();
    base?.close();
    if (root) await rm(root, { recursive: true, force: true });
  });
  const request = () =>
    requestPdf(c, token, { noteId, commandId: c.idGenerator.next() });
  async function finish(commandId: string) {
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect((await lookupPdf(c, token, commandId))?.state).toBe("succeeded");
      },
      { timeout: 3000, interval: 10 },
    );
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]);
      },
      { timeout: 3000, interval: 10 },
    );
  }
  it("uses one durable command and one computation, publishes real storage bytes and reuses cache", async () => {
    const first = await request();
    expect(
      (await requestPdf(c, token, { noteId, commandId: first.commandId })).id,
    ).toBe(first.id);
    const sibling = await request();
    expect(sibling.id).not.toBe(first.id);
    await finish(first.commandId);
    expect(renders).toBe(1);
    expect(await lookupPdf(c, token, sibling.commandId)).toMatchObject({
      state: "succeeded",
      available: true,
    });
    const delivery = await preparePdfDelivery(c, token, first.id);
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    expect(pdf.transfers.ids()).toEqual([delivery.id]);
    expect(
      new Uint8Array(await new Response(result.body).arrayBuffer()),
    ).toEqual(output);
    expect(pdf.transfers.ids()).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(delivery.id)),
    ).toMatchObject({ state: "closed" });
    const cached = await request();
    expect(cached.state).toBe("succeeded");
    expect(cached.expiresAt).toBe(
      (await lookupPdf(c, token, first.commandId))?.expiresAt,
    );
    expect(renders).toBe(1);
  });
  it("keeps account demand after logout while rejecting old-session retrieval", async () => {
    const job = await request();
    await signOut(c, token);
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(job.id)),
        ).toMatchObject({ state: "succeeded", accountId: actorId });
      },
      { timeout: 3000, interval: 10 },
    );
    await expect(lookupPdf(c, token, job.commandId)).rejects.toBeDefined();
  });
  it("cancels one sibling without stopping the other and never revives a cancelled request", async () => {
    const first = await request();
    const second = await request();
    expect(await cancelPdf(c, token, first.id)).toMatchObject({
      state: "cancelled",
    });
    await finish(second.commandId);
    expect(await lookupPdf(c, token, first.commandId)).toMatchObject({
      state: "cancelled",
    });
    expect(renders).toBe(1);
  });
  it("does not publish a late generation after its final demand was cancelled", async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    renderHook = async () => {
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    const job = await request();
    await sweepPdf(c);
    await started;
    await cancelPdf(c, token, job.id);
    await sweepPdf(c);
    release();
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
        ).toEqual([]);
      },
      { timeout: 3000, interval: 10 },
    );
    expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
      state: "cancelled",
      available: false,
    });
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toBeDefined();
  });
  it("rejects changed content after the delivery reader opens and releases only after actual close", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            for await (const chunk of original.read(source, signal)) {
              const note = await c.unitOfWorkProvider.run((u) =>
                u.notes.findById(noteId),
              );
              if (!note) throw Error("fixture");
              await saveNote(c, token, {
                id: noteId,
                version: note.version,
                title: "変更後",
                html: "<p>変更後</p>",
              });
              yield chunk;
            }
          },
        },
      },
    };
    await expect(
      getPdfFile(c, token, delivery.id, new AbortController().signal),
    ).rejects.toMatchObject({ code: "PDF_CONTENT_CHANGED" });
    await vi.waitFor(() => expect(pdf.transfers.ids()).toEqual([]));
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(delivery.id)),
    ).toMatchObject({ state: "closed" });
  });
  it("closes disconnected delivery, rejects replay, and preserves the retained artifact", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    await expect(
      getPdfFile(c, token, delivery.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await result.body.cancel();
    expect(pdf.transfers.ids()).toEqual([]);
    expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
      state: "succeeded",
      available: true,
    });
    expect((await preparePdfDelivery(c, token, job.id)).id).not.toBe(
      delivery.id,
    );
  });
  it("keeps reader slot and storage owner until actual source close, including stop", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    let release!: () => void;
    let closing!: () => void;
    const closeGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const closeStarted = new Promise<void>((resolve) => {
      closing = resolve;
    });
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            try {
              yield* original.read(source, signal);
            } finally {
              closing();
              await closeGate;
            }
          },
        },
      },
    };
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    let cancelled = false;
    let stopped = false;
    const cancel = result.body.cancel().then(() => {
      cancelled = true;
    });
    try {
      await closeStarted;
      expect(pdf.transfers.ids()).toEqual([delivery.id]);
      expect(cancelled).toBe(false);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "sending" });
      const stop = pdf.transfers.stop().then(() => {
        stopped = true;
      });
      await Promise.resolve();
      expect(stopped).toBe(false);
      release();
      await cancel;
      await stop;
      expect(pdf.transfers.ids()).toEqual([]);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "closed" });
    } finally {
      release();
      await cancel;
    }
  });
  it("retains cleanup debt and does not admit a new compute until physical removal", async () => {
    renderHook = async () => {
      throw new BusinessRuleError(
        "PDF_RESOURCE_CAPACITY",
        "synthetic capacity",
      );
    };
    failRemove = true;
    const job = await request();
    await sweepPdf(c);
    await vi.waitFor(async () => {
      expect(await lookupPdf(c, token, job.commandId)).toMatchObject({
        state: "failed",
        failure: "PDF_RESOURCE_CAPACITY",
      });
    });
    await sweepPdf(c);
    expect(removed).toBe(0);
    await expect(request()).rejects.toMatchObject({ code: "PDF_BUSY" });
    failRemove = false;
    now = new Date(now.getTime() + 5001);
    await sweepPdf(c);
    expect(removed).toBeGreaterThan(0);
    renderHook = null;
    expect((await request()).state).toBe("queued");
  });
  it("keeps unknown renderer ownership fenced until explicitly verified boot recovery", async () => {
    renderHook = async () => {
      throw new SystemError(
        SystemErrorCode.PdfOwnershipUnknown,
        "synthetic ownership uncertainty",
      );
    };
    const job = await request();
    const sibling = await request();
    await sweepPdf(c);
    await vi.waitFor(async () => {
      const rows = await c.unitOfWorkProvider.run((u) =>
        u.pdfComputations.unfinished(),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.state).toBe("stopping");
      const row = rows[0];
      if (!row) throw Error("fixture");
      expect(pdf.execution.active(row.id)).toBe(false);
    });
    await sweepPdf(c);
    expect(removed).toBe(0);
    await expect(request()).rejects.toMatchObject({ code: "PDF_STOPPING" });
    for (const target of [job, sibling]) {
      expect(await lookupPdf(c, token, target.commandId)).toMatchObject({
        state: "failed",
        failure: "PDF_OWNERSHIP_UNKNOWN",
      });
      expect(
        await requestPdf(c, token, { noteId, commandId: target.commandId }),
      ).toMatchObject({
        state: "failed",
        failure: "PDF_OWNERSHIP_UNKNOWN",
      });
      await expect(
        requestPdf(c, token, {
          noteId,
          commandId: c.idGenerator.next(),
          retryOf: target.id,
        }),
      ).rejects.toMatchObject({ code: "PDF_STOPPING" });
    }
    await c.unitOfWorkProvider.run(async (u) => {
      const compute = (await u.pdfComputations.unfinished())[0];
      if (!compute) throw Error("fixture");
      expect(compute.reservedBytes).toBeGreaterThan(0);
      expect(compute.workspaceRemoved).toBe(false);
      expect(
        await u.pdfRequests.succeed(compute.id, c.idGenerator.next(), now),
      ).toBe(0);
    });
    await pdf.supervisor.recover();
    await c.importing?.storage.recoverOwners?.();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.pdfDeliveries.recover(now);
      await u.pdfComputations.recover(now);
    });
    await sweepPdf(c);
    expect(removed).toBeGreaterThan(0);
    expect((await lookupPdf(c, token, job.commandId))?.state).toBe("failed");
    renderHook = null;
    expect((await request()).state).toBe("queued");
  });
  it("retries a failed request explicitly with the current saved snapshot and keeps the old result", async () => {
    renderHook = async () => {
      throw new BusinessRuleError(
        "PDF_RESOURCE_CAPACITY",
        "synthetic capacity",
      );
    };
    const job = await request();
    await sweepPdf(c);
    await vi.waitFor(async () => {
      expect((await lookupPdf(c, token, job.commandId))?.state).toBe("failed");
      expect(
        await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
      ).toEqual([]);
    });
    const old = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(job.id),
    );
    if (!old) throw Error("fixture");
    await vi.waitFor(() =>
      expect(old.computeId && pdf.execution.active(old.computeId)).toBe(false),
    );
    await sweepPdf(c);
    const current = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!current) throw Error("fixture");
    await saveNote(c, token, {
      id: noteId,
      version: current.version,
      title: "再試行時の現在タイトル",
      html: "<p>再試行時の保存済み本文</p>",
    });
    renderHook = null;
    const retry = await requestPdf(c, token, {
      noteId,
      commandId: c.idGenerator.next(),
      retryOf: job.id,
    });
    expect(retry.id).not.toBe(job.id);
    expect(retry.title).toBe("再試行時の現在タイトル");
    await finish(retry.commandId);
    const row = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(retry.id),
    );
    expect(row).toMatchObject({
      retryOf: job.id,
      targetNoteId: noteId,
      state: "succeeded",
    });
    expect(row?.sourceIdentity).not.toBe(old.sourceIdentity);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(job.id)),
    ).toEqual(old);
    expect(renders).toBe(2);
  });
  it("keeps 24-hour artifact and 90-day history deadlines fixed", async () => {
    const job = await request();
    await finish(job.commandId);
    const ready = await lookupPdf(c, token, job.commandId);
    if (!ready?.expiresAt) throw Error("fixture");
    now = new Date(Date.parse(ready.expiresAt) - 1);
    expect((await lookupPdf(c, token, job.commandId))?.available).toBe(true);
    now = new Date(ready.expiresAt);
    expect((await lookupPdf(c, token, job.commandId))?.available).toBe(false);
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
      code: "PDF_EXPIRED",
    });
    await sweepPdf(c);
    const fresh = await request();
    expect(fresh.state).toBe("queued");
    await finish(fresh.commandId);
    expect(
      Date.parse((await lookupPdf(c, token, fresh.commandId))?.expiresAt ?? ""),
    ).toBe(now.getTime() + 86400000);
    expect((await lookupPdf(c, token, job.commandId))?.expiresAt).toBe(
      ready.expiresAt,
    );
    now = new Date(Date.parse(job.historyExpiresAt));
    token = (
      await signIn(c, {
        email: "pdf-flow@example.test",
        password: "test-password-1234",
      })
    ).token;
    expect((await listPdf(c, token)).items.map((item) => item.id)).toEqual([
      fresh.id,
    ]);
    expect(await lookupPdf(c, token, job.commandId)).toBeNull();
    now = new Date(fresh.historyExpiresAt);
    expect((await listPdf(c, token)).items).toEqual([]);
    expect(await lookupPdf(c, token, fresh.commandId)).toBeNull();
  });
  it("bounds authenticated delivery to 120 seconds and the original artifact expiry", async () => {
    const job = await request();
    await finish(job.commandId);
    const ready = await lookupPdf(c, token, job.commandId);
    if (!ready?.expiresAt) throw Error("fixture");
    const first = await preparePdfDelivery(c, token, job.id);
    expect(Date.parse(first.expiresAt) - now.getTime()).toBe(120000);
    const result = await getPdfFile(
      c,
      token,
      first.id,
      new AbortController().signal,
    );
    await result.body.cancel();
    now = new Date(Date.parse(ready.expiresAt) - 30000);
    const nearEnd = await preparePdfDelivery(c, token, job.id);
    expect(nearEnd.expiresAt).toBe(ready.expiresAt);
    expect((await lookupPdf(c, token, job.commandId))?.expiresAt).toBe(
      ready.expiresAt,
    );
    now = new Date(ready.expiresAt);
    await expect(
      getPdfFile(c, token, nearEnd.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
      code: "PDF_EXPIRED",
    });
  });
  it("aborts an expired sending delivery but waits for actual close before release and reprepare", async () => {
    const job = await request();
    await finish(job.commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const original = pdf.sources;
    let release!: () => void;
    let closing!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      closing = resolve;
    });
    c = {
      ...c,
      pdf: {
        ...pdf,
        sources: {
          async *read(source, signal) {
            try {
              yield* original.read(source, signal);
            } finally {
              closing();
              await gate;
            }
          },
        },
      },
    };
    const result = await getPdfFile(
      c,
      token,
      delivery.id,
      new AbortController().signal,
    );
    now = new Date(delivery.expiresAt);
    await sweepPdf(c);
    await started;
    try {
      expect(pdf.transfers.ids()).toEqual([delivery.id]);
      expect(
        await c.unitOfWorkProvider.run((u) =>
          u.pdfDeliveries.find(delivery.id),
        ),
      ).toMatchObject({ state: "sending" });
      await expect(preparePdfDelivery(c, token, job.id)).rejects.toMatchObject({
        code: "PDF_DELIVERY_BUSY",
      });
    } finally {
      release();
    }
    await vi.waitFor(() => expect(pdf.transfers.ids()).toEqual([]));
    await expect(new Response(result.body).arrayBuffer()).rejects.toBeDefined();
    const next = await preparePdfDelivery(c, token, job.id);
    expect(next.id).not.toBe(delivery.id);
    expect(Date.parse(next.expiresAt) - now.getTime()).toBe(120000);
  });
  it("uses strict authenticated HTTP, native MIME and disposition, and rejects HEAD/Range", async () => {
    const commandId = c.idGenerator.next();
    const create = (cookie: boolean, origin = "http://localhost:3000") =>
      new Request(`http://localhost:3000/api/notes/${noteId}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(cookie ? { Cookie: `hollow_session=${token}` } : {}),
        },
        body: JSON.stringify({ commandId }),
      });
    expect((await pdfHttp(create(false), c))?.status).toBe(401);
    expect(
      (await pdfHttp(create(true, "https://other.example"), c))?.status,
    ).toBe(403);
    const accepted = await pdfHttp(create(true), c);
    expect(accepted?.status).toBe(200);
    const job = await lookupPdf(c, token, commandId);
    if (!job) throw Error("fixture");
    const replay = await pdfHttp(create(true), c);
    expect(await replay?.json()).toMatchObject({ id: job.id });
    await finish(commandId);
    const delivery = await preparePdfDelivery(c, token, job.id);
    const headers = { Cookie: `hollow_session=${token}` };
    const url = `http://localhost:3000${delivery.url}`;
    expect(
      (await pdfHttp(new Request(url, { method: "HEAD", headers }), c))?.status,
    ).toBe(405);
    expect(
      (
        await pdfHttp(
          new Request(url, { headers: { ...headers, Range: "bytes=0-4" } }),
          c,
        )
      )?.status,
    ).toBe(416);
    const response = await pdfHttp(new Request(url, { headers }), c);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("application/pdf");
    expect(response?.headers.get("Content-Disposition")).toContain(
      "attachment;",
    );
    expect(response?.headers.get("Cache-Control")).toContain("no-store");
    if (!response) throw Error("fixture");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(output);
    const watch = new URLSearchParams();
    for (let i = 0; i < 51; i++) watch.append("watch", c.idGenerator.next());
    expect(
      (
        await pdfHttp(
          new Request(`http://localhost:3000/api/pdf-activity?${watch}`, {
            headers,
          }),
          c,
        )
      )?.status,
    ).toBe(422);
  });
  it("rejects empty saved content without admitting a computation", async () => {
    const empty = (await saveNote(c, token, { title: "空のノート", html: "" }))
      .note.id;
    await expect(
      requestPdf(c, token, { noteId: empty, commandId: c.idGenerator.next() }),
    ).rejects.toMatchObject({ code: "PDF_EMPTY" });
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfComputations.unfinished()),
    ).toEqual([]);
  });
  it("holds two actual readers, rejects duplicate request preparation, and expires ready tickets", async () => {
    const first = await request();
    await finish(first.commandId);
    const second = await request();
    const third = await request();
    const a = await preparePdfDelivery(c, token, first.id);
    const b = await preparePdfDelivery(c, token, second.id);
    await expect(preparePdfDelivery(c, token, first.id)).rejects.toMatchObject({
      code: "PDF_DELIVERY_BUSY",
    });
    await expect(preparePdfDelivery(c, token, third.id)).rejects.toMatchObject({
      code: "PDF_DELIVERY_BUSY",
    });
    const one = await getPdfFile(c, token, a.id, new AbortController().signal);
    const two = await getPdfFile(c, token, b.id, new AbortController().signal);
    expect(pdf.transfers.ids()).toHaveLength(2);
    await one.body.cancel();
    await two.body.cancel();
    expect(pdf.transfers.ids()).toEqual([]);
    const ticket = await preparePdfDelivery(c, token, third.id);
    now = new Date(Date.parse(ticket.expiresAt));
    await expect(
      getPdfFile(c, token, ticket.id, new AbortController().signal),
    ).rejects.toBeDefined();
    await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.expireReady(now));
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(ticket.id)),
    ).toMatchObject({ state: "closed", expiresAt: new Date(ticket.expiresAt) });
    await sweepPdf(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfDeliveries.find(ticket.id)),
    ).toBeNull();
  });
});

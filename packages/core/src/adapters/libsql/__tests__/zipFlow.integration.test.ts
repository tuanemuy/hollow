import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { planExportDocument } from "@repo/core/adapters/node/exportDocument/plan";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "@repo/core/adapters/node/inlineMediaProcessor";
import { NodeZipDiskAdmission } from "@repo/core/adapters/node/zip/disk";
import {
  NodeZipExecution,
  NodeZipTransfers,
} from "@repo/core/adapters/node/zip/lifetimes";
import { NodeZipNames } from "@repo/core/adapters/node/zip/names";
import { createZipRunner } from "@repo/core/adapters/node/zip/runner";
import { NodeZipSourceReader } from "@repo/core/adapters/node/zip/sources";
import { NodeZipWriter } from "@repo/core/adapters/node/zip/writer";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { previewZipRetry, retryZip } from "@repo/core/application/zip/retry";
import {
  cancelZip,
  getZip,
  getZipDetails,
  lookupZip,
  requestZip,
} from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import { BusinessRuleError } from "@repo/core/domain/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import yauzl from "yauzl";
import { zipHttp } from "../../../../../../apps/web/app/presentation/zipHttp.node";
import { createTestContainer, type TestContainer } from "./helpers";

describe("durable HTML/Markdown ZIP vertical flow", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let zip: NonNullable<HollowContainer["zip"]>;
  let storage: CoordinatedObjectStorage;
  let root: string;
  let session: string;
  let noteId: string;
  let now: Date;
  beforeEach(async () => {
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(path.join(os.tmpdir(), "hollow-zip-flow-"));
    const mail: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(value) {
          mail.push(value.text);
        },
      }),
      clock: { now: () => now },
      logger: { info() {}, warn() {}, error() {} },
    };
    const pending = await signUp(c, {
      email: "zip-flow@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const url = mail.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!url) throw Error("fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(url).searchParams.get("token") ?? "",
      pending.browserToken,
    );
    if (!auth) throw Error("fixture account");
    session = auth.token;
    noteId = (
      await saveNote(c, session, { title: "東京", html: "<p>保存した本文</p>" })
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
      sources: {
        async open() {
          throw Error("unused media");
        },
        async openOwned() {
          throw Error("unused media");
        },
      },
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
    zip = {
      ...zip,
      sources: new NodeZipSourceReader(
        storage,
        new FileExportSourceReader(root),
      ),
    };
    c = {
      ...c,
      zip,
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
    await zip?.execution.stop();
    await zip?.transfers.stop();
    base?.close();
    if (root) await rm(root, { recursive: true, force: true });
  });
  async function request(format: "html" | "markdown") {
    const preview = await previewZip(c, session, { noteIds: [noteId], format });
    return requestZip(c, session, {
      noteIds: [noteId],
      format,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
  }
  it.each([
    "html",
    "markdown",
  ] as const)("publishes real STORE bytes for %s after all owners close", async (format) => {
    const job = await request(format);
    expect(job.finishedAt).toBeNull();
    await pumpZip(c);
    await vi.waitFor(
      async () =>
        expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect((await getZip(c, session, job.id)).finishedAt).toBe(
      now.toISOString(),
    );
    const artifact = await c.unitOfWorkProvider.run(async (u) => {
      const run = await u.zipRequests.findRun({
        requestId: job.id,
        generation: 1,
      });
      return run?.artifactId ? u.zipArtifacts.find(run.artifactId) : null;
    });
    if (!artifact || artifact.state !== "ready")
      throw Error("missing ready artifact");
    const bytes = Buffer.from(await storage.read(artifact.key));
    expect(bytes.byteLength).toBe(artifact.file.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      artifact.file.sha256,
    );
    const entries = await new Promise<string[]>((resolve, reject) => {
      yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, value) => {
        if (error) return reject(error);
        const names: string[] = [];
        value.on("error", reject);
        value.on("end", () => resolve(names));
        value.on("entry", (entry: yauzl.Entry) => {
          expect(entry.compressionMethod).toBe(0);
          names.push(entry.fileName);
          value.readEntry();
        });
        value.readEntry();
      });
    });
    expect(entries).toEqual([
      `東京.${format === "html" ? "html" : "md"}`,
      "hollow-export-report.txt",
    ]);
    for (let repeat = 0; repeat < 2; repeat++) {
      const ticket = await prepareZipDelivery(c, session, job.id, 1);
      const delivered = await getZipFile(
        c,
        session,
        ticket.id,
        new AbortController().signal,
      );
      expect(
        Buffer.from(await new Response(delivered.body).arrayBuffer()),
      ).toEqual(bytes);
      expect(zip.transfers.ids()).toEqual([]);
      expect(
        (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(ticket.id)))
          ?.state,
      ).toBe("closed");
    }
    expect((await lookupZip(c, session, job.commandId))?.id).toBe(job.id);
    await sweepZip(c);
    expect(
      await base.db.all(sql`select id from object_writes where active=1`),
    ).toEqual([]);
    expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(artifact.file.bytes);
  });
  it("cancels queued work without publishing or retaining the global run", async () => {
    const job = await request("html");
    await cancelZip(c, session, job.id);
    await pumpZip(c);
    expect((await getZip(c, session, job.id)).state).toBe("cancelled");
    expect((await getZip(c, session, job.id)).finishedAt).toBe(
      now.toISOString(),
    );
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipWork.active()),
    ).toBeNull();
    expect((await request("markdown")).state).toBe("queued");
  });
  it("purges its real spools and artifact before detaching live references, retaining historical success", async () => {
    const job = await request("html");
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    const ticket = await prepareZipDelivery(c, session, job.id, 1);
    const stream = await getZipFile(
      c,
      session,
      ticket.id,
      new AbortController().signal,
    );
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw Error("missing fixture note");
    const trashed = await trashNote(c, session, {
      id: noteId,
      version: note.version,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, session, trashed);
    await sweepNotePurges(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)))?.state,
    ).not.toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).not.toBeNull();
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.targets(job.id)))[0]
        ?.liveNoteId,
    ).toBe(noteId);
    await stream.body.cancel();
    await sweepZip(c);
    now = new Date(now.getTime() + 60_000);
    await sweepNotePurges(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.purges.find(purge.id)))?.state,
    ).toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).toBeNull();
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.targets(job.id)))[0]
        ?.liveNoteId,
    ).toBeNull();
    expect((await getZip(c, session, job.id)).state).toBe("succeeded");
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
  });
  it("delivers a partial ZIP with a safe failure report and retries only the failed child while retaining successful spool identity and original history", async () => {
    const second = (
      await saveNote(c, session, { title: "broken", html: "<p>second</p>" })
    ).note.id;
    let fail = true;
    const privateFailure = "synthetic failure: provider-secret fixture-token";
    c = {
      ...c,
      zip: {
        ...zip,
        documentWriter: {
          async plan(input) {
            if (fail && input.title === "broken")
              throw new BusinessRuleError(
                "EXPORT_DOCUMENT_INVALID",
                privateFailure,
              );
            return planExportDocument(input);
          },
        },
      },
    };
    const preview = await previewZip(c, session, {
      noteIds: [noteId, second],
      format: "html",
    });
    const job = await requestZip(c, session, {
      noteIds: [noteId, second],
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("partial"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    const partial = await getZip(c, session, job.id, 1);
    expect(partial).toMatchObject({
      state: "partial",
      succeeded: 1,
      failed: 1,
      available: true,
    });
    const delivery = await prepareZipDelivery(c, session, job.id, 1);
    const delivered = await getZipFile(
      c,
      session,
      delivery.id,
      new AbortController().signal,
    );
    const bytes = Buffer.from(await new Response(delivered.body).arrayBuffer());
    const documents = await new Promise<
      Readonly<{ name: string; text: string }>[]
    >((resolve, reject) => {
      yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, archive) => {
        if (error) return reject(error);
        const entries: Readonly<{ name: string; text: string }>[] = [];
        archive.on("error", reject);
        archive.on("end", () => resolve(entries));
        archive.on("entry", (entry: yauzl.Entry) => {
          expect(entry.compressionMethod).toBe(0);
          archive.openReadStream(entry, (error, stream) => {
            if (error) return reject(error);
            const chunks: Buffer[] = [];
            stream.on("error", reject);
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
            stream.on("end", () => {
              entries.push({
                name: entry.fileName,
                text: Buffer.concat(chunks).toString("utf8"),
              });
              archive.readEntry();
            });
          });
        });
        archive.readEntry();
      });
    });
    expect(documents.map((entry) => entry.name)).toEqual([
      "東京.html",
      "hollow-export-report.txt",
    ]);
    expect(documents[0]?.text).toContain("保存した本文");
    expect(documents[1]?.text).toBe(
      "Hollow export report\n2\t書き出しに失敗\n",
    );
    expect(JSON.stringify(documents)).not.toContain(privateFailure);
    expect(JSON.stringify(documents)).not.toContain("EXPORT_DOCUMENT_INVALID");
    expect(JSON.stringify(documents)).not.toContain("<p>second</p>");
    expect(zip.transfers.ids()).toEqual([]);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(delivery.id)))
        ?.state,
    ).toBe("closed");
    const previous = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.find(job.id),
    );
    const previousRun = await getZip(c, session, job.id, 1);
    const oldSuccess = (
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: job.id, generation: 1 }),
      )
    )[0];
    fail = false;
    now = new Date(now.getTime() + 1000);
    const input = {
      id: job.id,
      generation: 1,
      ordinals: [1],
      mode: "failed" as const,
    };
    const confirmation = (await previewZipRetry(c, session, input))
      .confirmation;
    const command = { ...input, confirmation, commandId: c.idGenerator.next() };
    const [retried, concurrent] = await Promise.all([
      retryZip(c, session, command),
      retryZip(c, session, command),
    ]);
    expect(concurrent).toEqual(retried);
    expect(retried.finishedAt).toBeNull();
    expect((await retryZip(c, session, command)).generation).toBe(
      retried.generation,
    );
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:2`)).toBe(false),
    );
    const details = await getZipDetails(c, session, job.id, 2);
    expect(
      details.items.map((item) => [
        item.ordinal,
        item.origin,
        item.attemptNumber,
      ]),
    ).toEqual([
      [0, "reused", 1],
      [1, "attempt", 2],
    ]);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.zipRequests.attempts({ requestId: job.id, generation: 1 }),
        )
      )[0],
    ).toEqual(oldSuccess);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipRequests.find(job.id)))
        ?.historyExpiresAt,
    ).toEqual(previous?.historyExpiresAt);
    expect(new Date(details.job.historyExpiresAt).getTime()).toBe(
      (previous?.historyExpiresAt.getTime() ?? 0) + 1000,
    );
    expect((await getZip(c, session, job.id, 1)).finishedAt).toBe(
      previousRun.finishedAt,
    );
    expect(details.job.finishedAt).toBe(now.toISOString());
    await expect(
      base.db.run(
        sql`update zip_runs set finished_at=finished_at+1 where request_id=${job.id} and generation=1`,
      ),
    ).rejects.toThrow();
  });
  it("reassembles a strictly smaller set after a content change fences the first assembly", async () => {
    const second = (
      await saveNote(c, session, { title: "kept", html: "<p>same</p>" })
    ).note.id;
    const preview = await previewZip(c, session, {
      noteIds: [noteId, second],
      format: "html",
    });
    const job = await requestZip(c, session, {
      noteIds: [noteId, second],
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    let calls = 0;
    c = {
      ...c,
      zip: {
        ...zip,
        writer: {
          ...NodeZipWriter,
          async write(input) {
            calls++;
            if (calls === 1) {
              const note = await c.unitOfWorkProvider.run((u) =>
                u.notes.findById(noteId),
              );
              if (!note) throw Error("fixture note");
              await saveNote(c, session, {
                id: noteId,
                title: note.title,
                html: "<p>changed after spool</p>",
                version: note.version,
              });
            }
            return NodeZipWriter.write(input);
          },
        },
      },
    };
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("partial"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect(calls).toBe(2);
    const details = await getZipDetails(c, session, job.id, 1);
    expect(details.items.map((item) => item.state)).toEqual([
      "excluded",
      "succeeded",
    ]);
    const run = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
    );
    expect(run?.exclusions).toEqual([
      { ordinal: 0, reason: "ZIP_CONTENT_CHANGED" },
    ]);
    expect(
      await base.db.all(
        sql`select id from zip_assemblies where request_id=${job.id} and storage_key is not null`,
      ),
    ).toEqual([]);
    expect(
      await base.db.all(sql`select id from object_writes where active=1`),
    ).toEqual([]);
  });
  it("settles an assembly size failure without publishing, reclaims its closed writer capacity and admits new work", async () => {
    let copiedBytes = 0;
    let writes = 0;
    c = {
      ...c,
      zip: {
        ...zip,
        writer: {
          upperBound: NodeZipWriter.upperBound,
          async write(input) {
            writes++;
            const entry = input.entries[0];
            if (!entry) throw Error("missing assembly source");
            const source = await entry.open(input.signal);
            try {
              for await (const chunk of source.chunks) {
                await input.sink.write(chunk);
                copiedBytes += chunk.byteLength;
              }
            } finally {
              await source.close();
            }
            throw new BusinessRuleError(
              "ZIP_TOO_LARGE",
              "ZIPに含める内容が1GBを超えています。対象を分割してください。",
            );
          },
        },
      },
    };
    const job = await request("html");
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("failed"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect(writes).toBe(1);
    expect(copiedBytes).toBeGreaterThan(0);
    expect(await getZip(c, session, job.id)).toMatchObject({
      state: "failed",
      failure: "ZIP_TOO_LARGE",
      available: false,
      finishedAt: now.toISOString(),
    });
    const run = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
    );
    expect(run).toMatchObject({
      state: "failed",
      failure: "ZIP_TOO_LARGE",
      artifactId: null,
      lease: null,
    });
    await expect(
      prepareZipDelivery(c, session, job.id, 1),
    ).rejects.toMatchObject({ code: "ZIP_NOT_FOUND" });
    expect(await base.db.all(sql`select id from zip_artifacts`)).toEqual([]);
    expect(
      await base.db.all(sql`select id from object_writes where active=1`),
    ).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipWork.active()),
    ).toBeNull();
    const refs = await c.unitOfWorkProvider.run((u) =>
      u.zipSpools.refs({ requestId: job.id, generation: 1 }),
    );
    const spool = refs[0]?.spool;
    if (refs.length !== 1 || !spool || spool.state !== "ready")
      throw Error("missing retryable successful spool");
    expect(copiedBytes).toBe(spool.result.bytes);
    expect(refs[0]?.ref.purpose).toBe("retry");
    const assemblies = await base.db.all<{ id: string }>(
      sql`select id from zip_assemblies where request_id=${job.id}`,
    );
    const assemblyId = assemblies[0]?.id;
    if (assemblies.length !== 1 || !assemblyId)
      throw Error("missing failed assembly");
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipWork.assembly(assemblyId)),
    ).toMatchObject({ state: "closed", outcome: "failure" });
    await sweepZip(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipWork.assembly(assemblyId)),
    ).toMatchObject({ state: "closed", key: null, reservedBytes: 0 });
    expect(await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).toEqual(
      { bytes: spool.result.bytes, unmaterializedBytes: 0 },
    );
    expect((await readdir(root)).sort()).toEqual([
      ".hollow-writer-owner",
      spool.key,
    ]);
    c = { ...c, zip };
    const next = await request("markdown");
    expect(next).toMatchObject({ state: "queued" });
    await cancelZip(c, session, next.id);
    await pumpZip(c);
    expect((await getZip(c, session, next.id)).state).toBe("cancelled");
    expect((await getZip(c, session, job.id)).failure).toBe("ZIP_TOO_LARGE");
    now = new Date(job.historyExpiresAt);
    await sweepZip(c);
    expect(await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).toEqual(
      { bytes: 0, unmaterializedBytes: 0 },
    );
    expect(await readdir(root)).toEqual([".hollow-writer-owner"]);
    expect(zip.transfers.ids()).toEqual([]);
    expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
  });
  it("retries pure assembly failure as a new parent without fabricating successful attempts", async () => {
    c = {
      ...c,
      zip: {
        ...zip,
        writer: {
          upperBound: NodeZipWriter.upperBound,
          async write() {
            throw new BusinessRuleError(
              "ZIP_WRITE_FAILED",
              "synthetic assembly failure",
            );
          },
        },
      },
    };
    const original = await request("html");
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, original.id)).state).toBe("failed"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${original.id}:1`)).toBe(false),
    );
    c = { ...c, zip };
    now = new Date(now.getTime() + 1000);
    const input = {
      id: original.id,
      generation: 1,
      mode: "assembly" as const,
      ordinals: [],
    };
    const preview = await previewZipRetry(c, session, input);
    const retried = await retryZip(c, session, {
      ...input,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    expect(retried.id).not.toBe(original.id);
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, retried.id)).state).toBe("succeeded"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${retried.id}:1`)).toBe(false),
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipRequests.attempts({ requestId: retried.id, generation: 1 }),
      ),
    ).toEqual([]);
    expect((await getZipDetails(c, session, retried.id, 1)).items).toHaveLength(
      1,
    );
    expect(
      (await getZipDetails(c, session, retried.id, 1)).items[0]?.origin,
    ).toBe("reused");
    expect((await getZip(c, session, original.id)).state).toBe("failed");
  });
  it("serves strict authenticated ZIP HTTP admission, status and native repeated downloads", async () => {
    const headers = {
      cookie: `hollow_session=${session}`,
      origin: c.appUrl,
      "content-type": "application/json",
    };
    const call = (route: string, input?: unknown, custom = headers) =>
      zipHttp(
        new Request(`${c.appUrl}${route}`, {
          headers: custom,
          ...(input === undefined
            ? {}
            : { method: "POST", body: JSON.stringify(input) }),
        }),
        c,
      );
    const unavailable = await call("/api/zip/preview", {
      noteIds: [noteId],
      format: "pdf",
    });
    expect(unavailable?.status).toBe(422);
    expect(await unavailable?.json()).toMatchObject({
      error: { code: "PDF_NOT_CONFIGURED" },
    });
    const history = await call("/api/zip/requests");
    expect(await history?.json()).toMatchObject({
      configured: true,
      availableFormats: ["html", "markdown"],
      items: [],
      next: null,
    });
    expect(
      (
        await call(
          "/api/zip/preview",
          { noteIds: [noteId], format: "html" },
          { ...headers, origin: "http://other.test" },
        )
      )?.status,
    ).toBe(403);
    const checked = await call("/api/zip/preview", {
      noteIds: [noteId],
      format: "html",
    });
    expect(checked?.status).toBe(200);
    const preview = await previewZip(c, session, {
      noteIds: [noteId],
      format: "html",
    });
    const input = {
      noteIds: [noteId],
      format: "html",
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    };
    const first = await call("/api/zip/requests", input);
    expect(first?.status).toBe(200);
    const initial: unknown = await first?.json();
    const repeated = await call("/api/zip/requests", input);
    expect(await repeated?.json()).toEqual(initial);
    expect(
      (await call("/api/zip/requests", { ...input, format: "markdown" }))
        ?.status,
    ).toBe(409);
    const job = await lookupZip(c, session, input.commandId);
    if (!job) throw Error("missing receipt");
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect(
      (await call(`/api/zip/requests/${job.id}/details?generation=1`))?.status,
    ).toBe(200);
    expect((await call("/api/zip/requests?unknown=1"))?.status).toBe(422);
    expect(
      (
        await call(`/api/zip/requests/${job.id}`, undefined, {
          ...headers,
          cookie: "",
        })
      )?.status,
    ).toBe(401);
    let prior: Uint8Array | null = null;
    for (let index = 0; index < 2; index++) {
      const ticket = await prepareZipDelivery(c, session, job.id, 1);
      const result = await call(ticket.path);
      expect(result?.status).toBe(200);
      expect(result?.headers.get("content-type")).toBe("application/zip");
      expect(result?.headers.get("cache-control")).toBe("private, no-store");
      if (!result) throw Error("missing ZIP response");
      const bytes = new Uint8Array(await result.arrayBuffer());
      if (prior) expect(bytes).toEqual(prior);
      prior = bytes;
      expect(zip.transfers.ids()).toEqual([]);
      expect(
        (await c.unitOfWorkProvider.run((u) => u.zipDeliveries.find(ticket.id)))
          ?.state,
      ).toBe("closed");
    }
    expect(
      (
        await zipHttp(
          new Request(`${c.appUrl}/api/zip/requests`, { method: "HEAD" }),
          c,
        )
      )?.status,
    ).toBe(405);
  });
  it("expires the seven-day artifact and prunes ninety-day shells only after real cleanup", async () => {
    const job = await request("html");
    await pumpZip(c);
    await vi.waitFor(async () =>
      expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    const run = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.findRun({ requestId: job.id, generation: 1 }),
    );
    if (!run?.publishedAt || !run.artifactId) throw Error("fixture artifact");
    now = new Date(run.publishedAt.getTime() + 7 * 86400000);
    expect((await getZip(c, session, job.id)).available).toBe(false);
    await expect(prepareZipDelivery(c, session, job.id, 1)).rejects.toThrow();
    await sweepZip(c);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.zipArtifacts.find(run.artifactId ?? ""),
        )
      )?.state,
    ).toBe("removed");
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    now = new Date(run.historyExpiresAt);
    for (let pass = 0; pass < 4; pass++) await sweepZip(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipRequests.find(job.id)),
    ).toBeNull();
    expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
  });
  it.each([
    "html",
    "markdown",
  ] as const)("embeds stored image bytes in portable %s while the dedicated runner owns the job", async (format) => {
    if (!c.importing) throw Error("fixture storage");
    c = {
      ...c,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        ...c.importing,
        mediaValidator: new IsolatedMediaValidator(),
      },
    };
    const png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const draft = await createMediaDraft(c, session);
    const upload = await beginMediaUpload(c, session, {
      draftId: draft.id,
      name: "source.png",
      bytes: png.byteLength,
    });
    const accepted = await acceptMediaUpload(
      c,
      session,
      upload.uploadId,
      new ReadableStream({
        start(controller) {
          controller.enqueue(png);
          controller.close();
        },
      }),
    );
    const note = (
      await saveNote(c, session, {
        title: "保存画像",
        html: `<p>日本語</p><img src="${accepted.asset.url}" alt="画像">`,
        draftId: draft.id,
      })
    ).note;
    const preview = await previewZip(c, session, {
      noteIds: [note.id],
      format,
    });
    const job = await requestZip(c, session, {
      noteIds: [note.id],
      format,
      confirmation: preview.confirmation,
      commandId: c.idGenerator.next(),
    });
    const runner = createZipRunner(c);
    try {
      await vi.waitFor(
        async () =>
          expect((await getZip(c, session, job.id)).state).toBe("succeeded"),
        { timeout: 5000 },
      );
      const ticket = await prepareZipDelivery(c, session, job.id, 1);
      const result = await getZipFile(
        c,
        session,
        ticket.id,
        new AbortController().signal,
      );
      const bytes = Buffer.from(await new Response(result.body).arrayBuffer());
      const documents = await new Promise<string[]>((resolve, reject) => {
        yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, archive) => {
          if (error) return reject(error);
          const texts: string[] = [];
          archive.on("error", reject);
          archive.on("end", () => resolve(texts));
          archive.on("entry", (entry: yauzl.Entry) => {
            archive.openReadStream(entry, (error, stream) => {
              if (error) return reject(error);
              const chunks: Buffer[] = [];
              stream.on("data", (chunk: Buffer) => chunks.push(chunk));
              stream.on("error", reject);
              stream.on("end", () => {
                texts.push(Buffer.concat(chunks).toString("utf8"));
                archive.readEntry();
              });
            });
          });
          archive.readEntry();
        });
      });
      expect(documents[0]).toContain(
        `data:image/png;base64,${png.toString("base64")}`,
      );
      expect(documents[0]).not.toContain(`/api/notes/${note.id}/assets/`);
      expect(documents[0]).toContain("日本語");
      expect(zip.transfers.ids()).toEqual([]);
    } finally {
      await runner.stop();
    }
    expect(
      await base.db.all(sql`select id from object_writes where active=1`),
    ).toEqual([]);
  });
});

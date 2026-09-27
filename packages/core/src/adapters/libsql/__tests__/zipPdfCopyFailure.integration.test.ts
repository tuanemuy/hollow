import { createHash } from "node:crypto";
import { type FileHandle, mkdtemp, open, rm } from "node:fs/promises";
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
import type { OwnedObjectRead } from "@repo/core/application/ports/objectStorage";
import { previewZip } from "@repo/core/application/zip/preview";
import { getZip, requestZip } from "@repo/core/application/zip/usecases";
import { pumpZip, sweepZip } from "@repo/core/application/zip/worker";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open) };
});

describe("ZIP PDF copy short and changed hash failures", () => {
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
  let sources: {
    owned: OwnedObjectRead;
    body: ReadableStream<Uint8Array>;
    handle: FileHandle;
  }[];
  const output = Buffer.from("%PDF-1.7\nsynthetic copy failure bytes\n%%EOF\n");
  const digest = createHash("sha256").update(output).digest("hex");

  beforeEach(async () => {
    sources = [];
    renders = 0;
    now = new Date();
    base = await createTestContainer();
    root = await mkdtemp(
      path.join(os.tmpdir(), "hollow-zip-pdf-copy-failure-"),
    );
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
      email: "zip-pdf-copy@example.test",
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
      await saveNote(c, session, { title: "PDF複製", html: "<p>保存本文</p>" })
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
        profile: "synthetic-pdf-copy-v1",
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
    const stopped = await Promise.allSettled([
      zip?.execution.stop(),
      zip?.transfers.stop(),
      pdf?.execution.stop(),
      pdf?.transfers.stop(),
    ]);
    for (const source of sources) {
      if (!source.body.locked) await source.body.cancel();
      await source.owned.close();
      await source.owned.closed;
      expect(source.handle.fd).toBe(-1);
    }
    vi.restoreAllMocks();
    try {
      expect(stopped.every((item) => item.status === "fulfilled")).toBe(true);
      expect(
        await base.db.all(sql`select id from object_writes where active=1`),
      ).toEqual([]);
      expect(await base.db.all(sql`pragma foreign_key_check`)).toEqual([]);
    } finally {
      base?.close();
      if (root) await rm(root, { recursive: true, force: true });
      vi.clearAllMocks();
    }
  });
  async function cachedSiblings() {
    const first = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    const second = await requestPdf(c, session, {
      noteId,
      commandId: c.idGenerator.next(),
    });
    await sweepPdf(c);
    await vi.waitFor(
      async () => {
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(first.id)),
        ).toMatchObject({ state: "succeeded" });
        expect(
          await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(second.id)),
        ).toMatchObject({ state: "succeeded" });
      },
      { timeout: 5000, interval: 10 },
    );
    const original = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(first.id),
    );
    const sibling = await c.unitOfWorkProvider.run((u) =>
      u.pdfRequests.find(second.id),
    );
    if (
      !original ||
      original.state !== "succeeded" ||
      !sibling ||
      sibling.state !== "succeeded"
    )
      throw Error("fixture siblings");
    expect(original.artifactId).toBe(sibling.artifactId);
    const artifact = await c.unitOfWorkProvider.run((u) =>
      u.pdfArtifacts.find(original.artifactId),
    );
    if (!artifact || artifact.state !== "ready")
      throw Error("fixture PDF cache");
    await vi.waitFor(() =>
      expect(pdf.execution.active(artifact.computeId)).toBe(false),
    );
    return { original, sibling, artifact };
  }

  it.each([
    "short",
    "hash",
  ] as const)("fails the ZIP child for %s data after native close without changing PDF siblings", async (mode) => {
    const { original, sibling, artifact } = await cachedSiblings();
    const openOwned = storage.openOwnedRead.bind(storage);
    let changed = false;
    let sourceClosed = false;
    vi.spyOn(storage, "openOwnedRead").mockImplementation(
      async (key, signal) => {
        const owned = await openOwned(key, signal);
        if (key !== artifact.key || !key.endsWith("_pdf")) return owned;
        const call = vi.mocked(open).mock.results.at(-1);
        if (!call || call.type !== "return")
          throw Error("fixture native PDF source");
        const handle = await call.value;
        const body = owned.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              if (changed || !chunk.byteLength) {
                controller.enqueue(chunk);
                return;
              }
              changed = true;
              if (mode === "short") controller.enqueue(chunk.slice(1));
              else {
                const copy = chunk.slice();
                copy[0] = (copy[0] ?? 0) ^ 1;
                controller.enqueue(copy);
              }
            },
          }),
        );
        void owned.closed.then(
          () => {
            sourceClosed = true;
          },
          () => {},
        );
        sources.push({ owned, body, handle });
        return { body, close: owned.close, closed: owned.closed };
      },
    );
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
        expect((await getZip(c, session, job.id)).state).toBe("failed"),
      { timeout: 5000, interval: 10 },
    );
    await vi.waitFor(() =>
      expect(zip.execution.active(`${job.id}:1`)).toBe(false),
    );
    expect(changed).toBe(true);
    expect(sourceClosed).toBe(true);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.handle.fd).toBe(-1);
    const attempts = await c.unitOfWorkProvider.run((u) =>
      u.zipRequests.attempts({ requestId: job.id, generation: 1 }),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      state: "failed",
      failure: "ZIP_SOURCE_CHANGED",
      result: null,
    });
    const attempt = attempts[0];
    if (!attempt) throw Error("fixture ZIP attempt");
    expect(
      await c.unitOfWorkProvider.run((u) => u.zipPdf.find(attempt.id)),
    ).toBeNull();
    expect(
      await base.db.all(
        sql`select state from zip_pdf_holds where attempt_id=${attempt.id}`,
      ),
    ).toEqual([{ state: "released" }]);
    expect(
      await base.db.all(
        sql`select state,result from zip_spools where attempt_id=${attempt.id}`,
      ),
    ).toEqual([{ state: "cleanup", result: null }]);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.zipSpools.refs({ requestId: job.id, generation: 1 }),
      ),
    ).toEqual([]);
    expect(await base.db.all(sql`select id from zip_artifacts`)).toEqual([]);
    expect(
      await base.db.all(sql`select id from object_writes where active=1`),
    ).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(original.id)),
    ).toEqual(original);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfRequests.find(sibling.id)),
    ).toEqual(sibling);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfArtifacts.find(artifact.id)),
    ).toEqual(artifact);
    expect(Buffer.from(await storage.read(artifact.key))).toEqual(output);
    expect(renders).toBe(1);
    await sweepZip(c);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.zipWork.reserved())).bytes,
    ).toBe(0);
    expect(
      await c.unitOfWorkProvider.run((u) => u.pdfArtifacts.find(artifact.id)),
    ).toEqual(artifact);
  });
});

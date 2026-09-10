import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { createImportRunner } from "@repo/core/adapters/node/importRunner";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload as acceptAnyUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  cancelImport,
  reimportNote,
  retryImport,
} from "@repo/core/application/import/controlJobs";
import {
  commitImportResult,
  runImportJob,
} from "@repo/core/application/import/processJob";
import {
  listImports,
  originalDownload,
} from "@repo/core/application/import/readImports";
import { getNote } from "@repo/core/application/note/getNote";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getTrashIntent,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import type { ConversionJob } from "@repo/core/domain/job/entity";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importHttp } from "../../../../../../apps/web/app/presentation/importHttp.node";
import { createLibsqlClient, getDatabase } from "../client";
import { originals, uploadReservations } from "../hollowSchema";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { LibsqlJobRepository } from "../repositories/jobRepository";
import { outboxEvents } from "../schema";
import { createTestContainer, type TestContainer } from "./helpers";

async function acceptUpload(...args: Parameters<typeof acceptAnyUpload>) {
  const result = await acceptAnyUpload(...args);
  if (!result.noteId || !result.jobId)
    throw new Error("Expected normal note upload");
  return { noteId: result.noteId, jobId: result.jobId };
}

describe("durable personal imports", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let token: string;
  let otherToken: string;
  let directory: string;
  let now: Date;
  let wakes: number;
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(path.join(os.tmpdir(), "hollow-import-test-"));
    now = new Date("2026-09-06T00:00:00Z");
    wakes = 0;
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      importing: {
        storage: new FileObjectStorage(directory),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake: () => {
          wakes++;
        },
      },
    };
    async function user(email: string) {
      const registration = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw new Error("Missing mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        registration.browserToken,
      );
      if (!session) throw new Error("Missing session");
      return session.token;
    }
    token = await user("import-a@example.test");
    otherToken = await user("import-b@example.test");
  });
  afterEach(async () => {
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const stream = (bytes: Uint8Array) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
  async function upload(name = "sample.txt", text = "日本語の取り込み") {
    const bytes = new TextEncoder().encode(text);
    const batch = await beginUpload(container, token, {
      files: [{ name, bytes: bytes.length }],
      useAi: true,
    });
    const row = batch.files[0];
    if (!row) throw new Error("Missing reservation");
    const result = await acceptUpload(container, token, row.id, stream(bytes));
    if (!result.noteId || !result.jobId)
      throw new Error("Expected note upload");
    return {
      noteId: result.noteId,
      jobId: result.jobId,
      batchId: batch.batchId,
      reservationId: row.id,
    };
  }
  async function claim() {
    return container.unitOfWorkProvider.run(({ jobs }) =>
      jobs.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 90_000),
      ),
    );
  }
  const output = {
    kind: "extracted" as const,
    extraction: {
      html: "<p>converted</p>",
      coverage: "complete" as const,
      notices: [],
    },
  };
  it("hard-cancels only the trashed conversion and rejects its late success/failure even after restore", async () => {
    const target = await upload();
    const sibling = await upload();
    const job = await claim();
    if (!job) throw Error("job");
    const note = await getNote(container, token, target.noteId);
    expect(
      (await getTrashIntent(container, token, note.id)).hasRunningJobs,
    ).toBe(true);
    await expect(
      trashNote(container, token, {
        id: note.id,
        version: note.version,
        cancelProcessing: false,
      }),
    ).rejects.toMatchObject({ code: "TRASH_PROCESSING" });
    const before = await container.unitOfWorkProvider.run((c) =>
      c.revisions.list(note.id),
    );
    const deleted = await trashNote(container, token, {
      id: note.id,
      version: note.version,
      cancelProcessing: true,
    });
    const original = await container.unitOfWorkProvider.run((c) =>
      c.imports.findByNote(note.id),
    );
    if (!original) throw Error("original");
    await expect(
      originalDownload(container, token, original.id),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    for (const method of ["GET", "HEAD"]) {
      const response = await importHttp(
        new Request(
          `http://localhost:3000/api/hollow/originals/${original.id}`,
          {
            method,
            headers: {
              cookie: `hollow_session=${token}`,
              Range: "bytes=99999999-",
            },
          },
        ),
        container,
      );
      expect(response?.status).toBe(404);
    }
    await expect(reimportNote(container, token, note.id)).rejects.toMatchObject(
      { code: "NOTE_NOT_FOUND" },
    );
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect(
      await commitImportResult(container, job, {
        kind: "failed",
        reason: "late failure",
      }),
    ).toBe(false);
    expect(
      await container.unitOfWorkProvider.run((c) => c.jobs.find(job.id)),
    ).toMatchObject({ state: "cancelled", failure: null, leaseToken: null });
    expect(
      await container.unitOfWorkProvider.run((c) => c.jobs.find(sibling.jobId)),
    ).toMatchObject({ state: "queued" });
    await restoreNote(container, token, deleted);
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect(await getNote(container, token, note.id)).toMatchObject({
      html: note.html,
      updatedAt: note.updatedAt,
      status: "cancelled",
      display: {
        style: note.display.style,
        initialization: { kind: "complete" },
      },
    });
    expect(
      await container.unitOfWorkProvider.run((c) => c.revisions.list(note.id)),
    ).toEqual(before);
    await expect(retryImport(container, token, job.id)).rejects.toMatchObject({
      code: "JOB_NOT_RETRYABLE",
    });
    const restarted = await reimportNote(container, token, note.id);
    expect(restarted.jobId).not.toBe(job.id);
    const next = await claim();
    if (!next) throw Error("sibling");
    expect(next.id).toBe(sibling.jobId);
    expect(await commitImportResult(container, next, output)).toBe(true);
    const last = await claim();
    if (!last) throw Error("reimport");
    expect(last.id).toBe(restarted.jobId);
    expect(await commitImportResult(container, last, output)).toBe(true);
    expect(
      await new Response(
        (await originalDownload(container, token, original.id)).stream,
      ).text(),
    ).toBe("日本語の取り込み");
  });

  it("atomically accepts original, note, queued job and outbox, then extracts and downloads", async () => {
    const accepted = await upload();
    expect(wakes).toBe(1);
    const note = await getNote(container, token, accepted.noteId);
    expect(note.status).toBe("processing");
    expect(note.html).toBe("");
    expect(
      (await base.db.select().from(outboxEvents)).some(
        (e) => e.eventType === "ImportQueued",
      ),
    ).toBe(true);
    await expect(
      saveNote(container, token, {
        id: note.id,
        title: "changed",
        html: "<p>no</p>",
      }),
    ).rejects.toMatchObject({ code: "NOTE_PROCESSING" });
    const job = await claim();
    if (!job) throw new Error("No job");
    await runImportJob(container, job);
    const ready = await getNote(container, token, note.id);
    expect(ready.status).toBe("ready");
    expect(ready.html).toContain("日本語の取り込み");
    if (!ready.original) throw new Error("No source");
    const download = await originalDownload(
      container,
      token,
      ready.original.id,
    );
    expect(await new Response(download.stream).text()).toBe("日本語の取り込み");
  });
  it("holds failed-upload quota until real cleanup succeeds, including retry and absent objects", async () => {
    const io = container.importing;
    if (!io) throw Error("import IO");
    const batch = await beginUpload(container, token, {
      files: [{ name: "x.txt", bytes: 3 }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw Error("reservation");
    const detect = vi
      .spyOn(io, "detectFormat")
      .mockRejectedValueOnce(new Error("test detection failure"));
    const remove = vi
      .spyOn(io.storage, "remove")
      .mockRejectedValueOnce(new Error("test deletion failure"));
    await expect(
      acceptUpload(
        container,
        token,
        row.id,
        stream(new TextEncoder().encode("abc")),
      ),
    ).rejects.toThrow("test deletion failure");
    const reservation = await container.unitOfWorkProvider.run((c) =>
      c.imports.findReservation(row.id),
    );
    if (!reservation) throw Error("reservation");
    expect(await io.storage.stat(reservation.storageKey)).toMatchObject({
      bytes: 3,
    });
    expect((await listImports(container, token)).usedBytes).toBe(3);
    await base.db
      .update(uploadReservations)
      .set({ bytes: IMPORT_LIMITS.quotaBytes })
      .where(eq(uploadReservations.id, row.id));
    await expect(
      beginUpload(container, token, {
        files: [{ name: "blocked.txt", bytes: 1 }],
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_QUOTA" });
    now = new Date(reservation.expiresAt.getTime() + 6 * 60_000);
    const keys = await container.unitOfWorkProvider.run((c) =>
      c.imports.expireReservations(now),
    );
    expect(keys).toContain(reservation.storageKey);
    await io.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run((c) =>
      c.imports.markStorageCleaned(reservation.storageKey),
    );
    expect((await listImports(container, token)).usedBytes).toBe(0);
    await io.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run((c) =>
      c.imports.markStorageCleaned(reservation.storageKey),
    );
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.imports.expireReservations(now),
      ),
    ).not.toContain(reservation.storageKey);
    await expect(
      beginUpload(container, token, {
        files: [{ name: "accepted.txt", bytes: 1 }],
        useAi: false,
      }),
    ).resolves.toBeDefined();
    detect.mockRestore();
    remove.mockRestore();
  });
  it("reserves quota and rejects aggregate batch/count/stream mismatches", async () => {
    await expect(
      beginUpload(container, token, {
        files: Array.from({ length: 101 }, () => ({ name: "x", bytes: 1 })),
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_COUNT" });
    await expect(
      beginUpload(container, token, {
        files: Array.from({ length: 3 }, () => ({
          name: "x.wav",
          bytes: 200 * 1024 * 1024,
        })),
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_BATCH_SIZE" });
    const batch = await beginUpload(container, token, {
      files: [{ name: "x.txt", bytes: 3 }],
      useAi: false,
    });
    const r = batch.files[0];
    if (!r) throw new Error("No reservation");
    await expect(
      acceptUpload(container, token, r.id, stream(new Uint8Array(4))),
    ).rejects.toMatchObject({ code: "IMPORT_SIZE" });
    expect((await listImports(container, token)).usedBytes).toBe(0);
    expect(
      (await listImports(container, token)).batches[0]?.uploads[0]?.state,
    ).toBe("failed");
    await base.db
      .update(uploadReservations)
      .set({ state: "awaiting", bytes: IMPORT_LIMITS.quotaBytes })
      .where(eq(uploadReservations.id, r.id));
    await expect(
      beginUpload(container, token, {
        files: [{ name: "small.txt", bytes: 1 }],
        useAi: true,
      }),
    ).rejects.toMatchObject({ code: "IMPORT_QUOTA" });
  });
  it("isolates source, job history, upload, retry and cancel ownership", async () => {
    const a = await upload();
    const note = await getNote(container, token, a.noteId);
    expect((await listImports(container, otherToken)).batches).toHaveLength(0);
    await expect(
      originalDownload(container, otherToken, note.original?.id ?? ""),
    ).rejects.toMatchObject({ code: "ORIGINAL_NOT_FOUND" });
    await expect(
      cancelImport(container, otherToken, a.batchId),
    ).rejects.toMatchObject({ code: "IMPORT_NOT_FOUND" });
    await expect(
      retryImport(container, otherToken, a.jobId),
    ).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
    await expect(
      acceptUpload(
        container,
        otherToken,
        a.reservationId,
        stream(new Uint8Array(1)),
      ),
    ).rejects.toMatchObject({ code: "UPLOAD_NOT_FOUND" });
  });
  it("recovers queued work without wakeup using startup and periodic sweep", async () => {
    const a = await upload();
    const runner = createImportRunner(container, {
      intervalMs: 25,
      concurrency: 1,
    });
    try {
      await expect
        .poll(async () => (await getNote(container, token, a.noteId)).status, {
          timeout: 10000,
        })
        .toBe("ready");
    } finally {
      await runner.stop();
    }
  });
  it("allows only one of two atomic DB claims and fences expired workers", async () => {
    const a = await upload();
    const repo1 = new LibsqlJobRepository(base.db);
    const file = (await base.client.execute("PRAGMA database_list")).rows[0]
      ?.file;
    if (typeof file !== "string") throw new Error("No database file");
    const otherClient = createLibsqlClient({ url: `file:${file}` });
    const repo2 = new LibsqlJobRepository(getDatabase(otherClient));
    const claims = await Promise.all([
      repo1.claim(now, "worker-a", new Date(now.getTime() + 1000)),
      repo2.claim(now, "worker-b", new Date(now.getTime() + 1000)),
    ]).finally(() => otherClient.close());
    expect(claims.filter(Boolean)).toHaveLength(1);
    const old = claims.find(Boolean);
    if (!old) throw new Error("No claimed job");
    now = new Date(now.getTime() + 1001);
    const replacement = await claim();
    if (!replacement) throw new Error("No reclaimed job");
    expect(replacement.attempt).toBe(2);
    expect(await commitImportResult(container, old, output)).toBe(false);
    expect(await commitImportResult(container, replacement, output)).toBe(true);
    expect(await commitImportResult(container, replacement, output)).toBe(
      false,
    );
    expect((await getNote(container, token, a.noteId)).version).toBe(1);
  });
  it("recovers a queued import after closing and reopening the database resource without a wakeup", async () => {
    const accepted = await upload();
    const file = (await base.client.execute("PRAGMA database_list")).rows[0]
      ?.file;
    if (typeof file !== "string") throw new Error("No database file");
    base.client.close();
    const reopened = createLibsqlClient({ url: `file:${file}` });
    container = {
      ...container,
      unitOfWorkProvider: new LibsqlHollowUnitOfWorkProvider(
        getDatabase(reopened),
      ),
    };
    const runner = createImportRunner(container, { intervalMs: 20 });
    try {
      await expect
        .poll(
          async () => (await getNote(container, token, accepted.noteId)).status,
        )
        .toBe("ready");
      const restored = await getNote(container, token, accepted.noteId);
      expect(restored.html).toContain("日本語の取り込み");
      if (!restored.original) throw new Error("No original");
      const download = await originalDownload(
        container,
        token,
        restored.original.id,
      );
      expect(await new Response(download.stream).text()).toBe(
        "日本語の取り込み",
      );
    } finally {
      await runner.stop();
      reopened.close();
    }
  });
  it("cancels queued children but lets running work finish; retries once as a new job", async () => {
    const a = await upload();
    const b = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await cancelImport(container, token, a.batchId);
    expect(await commitImportResult(container, job, output)).toBe(true);
    await cancelImport(container, token, b.batchId);
    expect((await getNote(container, token, b.noteId)).status).toBe(
      "cancelled",
    );
    const retries = await Promise.all([
      reimportNote(container, token, b.noteId),
      reimportNote(container, token, b.noteId),
    ]);
    expect(retries[0]?.jobId).toBe(retries[1]?.jobId);
    expect(retries[0]?.jobId).not.toBe(b.jobId);
    expect(
      (await listImports(container, token)).batches.find(
        (x) => x.id === b.batchId,
      )?.active,
    ).toBe(true);
  });
  it("retains corrupt/encrypted originals with failed jobs and no false empty success", async () => {
    for (const file of ["corrupt.docx", "generated-encrypted.pdf"]) {
      const bytes = await readFile(
        new URL(
          `../../node/import/__tests__/fixtures/${file}`,
          import.meta.url,
        ),
      );
      const batch = await beginUpload(container, token, {
        files: [{ name: file, bytes: bytes.length }],
        useAi: true,
      });
      const row = batch.files[0];
      if (!row) throw new Error("No reservation");
      const accepted = await acceptUpload(
        container,
        token,
        row.id,
        stream(bytes),
      );
      const job = await claim();
      if (job) await runImportJob(container, job);
      const note = await getNote(container, token, accepted.noteId);
      expect(note.status).toBe("failed");
      expect(note.display.initialization.kind).toBe("complete");
      expect(note.original?.bytes).toBe(bytes.length);
    }
  });
  it("distinguishes needs-AI and explicit no-AI failure while preserving original", async () => {
    for (const useAi of [true, false]) {
      const bytes = await readFile(
        new URL(
          "../../node/import/__tests__/fixtures/generated-image.pdf",
          import.meta.url,
        ),
      );
      const batch = await beginUpload(container, token, {
        files: [{ name: "scan.pdf", bytes: bytes.length }],
        useAi,
      });
      const row = batch.files[0];
      if (!row) throw new Error("No reservation");
      const a = await acceptUpload(container, token, row.id, stream(bytes));
      const job = await claim();
      if (!job) throw new Error("No job");
      await runImportJob(container, job);
      const note = await getNote(container, token, a.noteId);
      expect(note.status).toBe(useAi ? "needs_ai" : "failed");
      expect(note.display).toMatchObject({
        style: "default",
        source: "automatic",
        initialization: { kind: "complete" },
      });
      expect(note.html).toBe("");
      expect(note.visibility).toBe("private");
    }
  });
  it("validates real media before needs-AI/no-AI and preserves failed originals across retry", async () => {
    for (const extension of [
      "png",
      "jpg",
      "gif",
      "webp",
      "wav",
      "flac",
      "mp3",
      "ogg",
      "m4a",
    ]) {
      const original = await readFile(
        new URL(
          `../../node/import/__tests__/fixtures/media-valid.${extension}`,
          import.meta.url,
        ),
      );
      for (const variant of ["valid-ai", "valid-no-ai", "truncated"] as const) {
        const bytes =
          variant === "truncated"
            ? original.subarray(0, Math.floor(original.length * 0.8))
            : original;
        const batch = await beginUpload(container, token, {
          files: [{ name: `media.${extension}`, bytes: bytes.length }],
          useAi: variant !== "valid-no-ai",
        });
        const row = batch.files[0];
        if (!row) throw new Error("No reservation");
        const accepted = await acceptUpload(
          container,
          token,
          row.id,
          stream(bytes),
        );
        const job = await claim();
        if (job) await runImportJob(container, job);
        const note = await getNote(container, token, accepted.noteId);
        expect(note.status).toBe(
          variant === "valid-ai" ? "needs_ai" : "failed",
        );
        expect(note.visibility).toBe("private");
        expect(note.html).toBe("");
        if (!note.original) throw new Error("No original");
        const download = await originalDownload(
          container,
          token,
          note.original.id,
        );
        expect(
          Buffer.from(await new Response(download.stream).arrayBuffer()),
        ).toEqual(bytes);
        if (variant === "truncated") {
          expect(
            note.original.notices.some((n) => n.message.includes("破損")),
          ).toBe(true);
          await retryImport(container, token, accepted.jobId);
          const retried = await claim();
          if (!retried) throw new Error("No retry");
          await runImportJob(container, retried);
          expect(
            (await getNote(container, token, accepted.noteId)).status,
          ).toBe("failed");
        }
      }
    }
  }, 30000);
  it("preserves mixed PDF text and permanent notices after 90-day job prune", async () => {
    const bytes = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/generated-mixed.pdf",
        import.meta.url,
      ),
    );
    const batch = await beginUpload(container, token, {
      files: [{ name: "mixed.pdf", bytes: bytes.length }],
      useAi: false,
    });
    const row = batch.files[0];
    if (!row) throw new Error("No reservation");
    const a = await acceptUpload(container, token, row.id, stream(bytes));
    const job = await claim();
    if (!job) throw new Error("No job");
    await runImportJob(container, job);
    const before = await getNote(container, token, a.noteId);
    expect(before.status).toBe("ready");
    expect(before.original?.coverage).toBe("partial");
    expect(before.original?.notices.length).toBeGreaterThan(0);
    await container.unitOfWorkProvider.run(({ imports }) =>
      imports.pruneHistory(new Date(now.getTime() + 91 * 86400_000)),
    );
    expect(
      (await getNote(container, token, a.noteId)).original?.notices,
    ).toEqual(before.original?.notices);
  });
  it("rejects completion after owner/version or active job changes", async () => {
    const a = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await base.db
      .update(originals)
      .set({ activeJobId: "new-job" })
      .where(eq(originals.noteId, a.noteId));
    expect(await commitImportResult(container, job, output)).toBe(false);
    expect((await getNote(container, token, a.noteId)).html).toBe("");
  });
  it("expires upload reservations without leaking quota", async () => {
    await beginUpload(container, token, {
      files: [{ name: "never.txt", bytes: 10 }],
      useAi: true,
    });
    now = new Date(now.getTime() + 61 * 60_000);
    const keys = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.expireReservations(now),
    );
    expect(keys).toHaveLength(0);
    expect((await listImports(container, token)).usedBytes).toBe(10);
    now = new Date(now.getTime() + 5 * 60_000);
    const cleanup = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.expireReservations(now),
    );
    expect(cleanup).toHaveLength(1);
    for (const key of cleanup) {
      await container.importing?.storage.remove(key);
      await container.unitOfWorkProvider.run((c) =>
        c.imports.markStorageCleaned(key),
      );
    }
    expect((await listImports(container, token)).usedBytes).toBe(0);
  });
  it("guards stale heartbeat and reports repeated crash timeout", async () => {
    await upload();
    let job: ConversionJob | null = null;
    for (let i = 0; i < 4; i++) {
      job = await claim();
      now = new Date(now.getTime() + 90_001);
    }
    if (!job || job.state !== "running") throw new Error("No job");
    expect(
      await container.unitOfWorkProvider.run(({ jobs }) =>
        jobs.heartbeat(
          job.id,
          job.leaseToken ?? "",
          now,
          new Date(now.getTime() + 10000),
        ),
      ),
    ).toBe(false);
    const latest = await claim();
    if (!latest) throw new Error("No job");
    await runImportJob(container, latest);
    expect(
      (await listImports(container, token)).batches[0]?.jobs[0]?.failure,
    ).toContain("タイムアウト");
  });
  it("preserves manual edits when retrying an old failed conversion", async () => {
    const accepted = await upload();
    const job = await claim();
    if (!job) throw new Error("No job");
    await commitImportResult(container, job, {
      kind: "failed",
      reason: "broken",
    });
    await saveNote(container, token, {
      id: accepted.noteId,
      title: "manual",
      html: "<p>my edited text</p>",
    });
    await expect(
      retryImport(container, token, accepted.jobId),
    ).rejects.toMatchObject({ code: "IMPORT_EDITED" });
    expect((await getNote(container, token, accepted.noteId)).html).toContain(
      "my edited text",
    );
  });
  it("replays unaccepted-object cleanup after cancellation and a deletion-before-ack crash", async () => {
    const batch = await beginUpload(container, token, {
      files: [{ name: "orphan.txt", bytes: 3 }],
      useAi: true,
    });
    const row = batch.files[0];
    if (!row || !container.importing) throw new Error("No upload");
    const reservation = await container.unitOfWorkProvider.run(({ imports }) =>
      imports.findReservation(row.id),
    );
    if (!reservation) throw new Error("No reservation");
    await container.importing.storage.put(
      reservation.storageKey,
      stream(new Uint8Array([65, 66, 67])),
      3,
    );
    await cancelImport(container, token, batch.batchId);
    now = new Date(now.getTime() + 70 * 60_000);
    const collect = () =>
      container.unitOfWorkProvider.run(({ imports }) =>
        imports.expireReservations(now),
      );
    expect(await collect()).toContain(reservation.storageKey);
    await container.importing.storage.remove(reservation.storageKey);
    expect(await collect()).toContain(reservation.storageKey);
    await container.importing.storage.remove(reservation.storageKey);
    await container.unitOfWorkProvider.run(({ imports }) =>
      imports.markStorageCleaned(reservation.storageKey),
    );
    expect(await collect()).not.toContain(reservation.storageKey);
    expect((await listImports(container, token)).quotaBytes).toBe(
      IMPORT_LIMITS.quotaBytes,
    );
  });
});

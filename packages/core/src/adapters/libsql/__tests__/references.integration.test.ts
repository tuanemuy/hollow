import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import { renderNote } from "@repo/core/application/asset/references";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
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
import { listImports } from "@repo/core/application/import/readImports";
import { sealUpload } from "@repo/core/application/import/sealBundle";
import { getNote } from "@repo/core/application/note/getNote";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { settleAbandonedDisplays } from "@repo/core/application/note/settleDisplay";
import {
  getTrashIntent,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import {
  resolveBundlePath,
  runReferenceJob,
} from "@repo/core/application/reference/processJob";
import { storageUsage } from "@repo/core/application/reference/quota";
import {
  controlReference,
  readReferences,
} from "@repo/core/application/reference/read";
import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { editNote } from "@repo/core/domain/note/entity";
import {
  REFERENCE_LIMITS,
  referenceBytesAfterAcceptance,
} from "@repo/core/domain/reference/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { FileObjectStorage } from "../../node/objectStorage";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { createReferenceRunner } from "../../node/referenceRunner";
import { assets } from "../hollowSchema";
import { referenceObjects } from "../referenceSchema";
import { browseFixture } from "./browseFixture";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
const text = (s: string) => new TextEncoder().encode(s);
// Independent CC0 fixture: 482 input bytes become 520 after safe SVG serialization.
const expandingSvg =
  text(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100">
  <defs>
    <linearGradient id="tone"><stop stop-color="#175aa6"/><stop offset="1" stop-color="#24ad80"/></linearGradient>
    <clipPath id="round"><rect x="4" y="4" width="172" height="92" rx="12"/></clipPath>
  </defs>
  <g clip-path="url(#round)"><rect width="180" height="100" fill="url(#tone)"/><circle cx="150" cy="18" r="26" fill="#ffc745"/><path d="M15 85 60 30 90 62 125 28 170 85Z" fill="white"/></g>
</svg>
`);
describe("durable reference ingestion", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let dir: string;
  let token: string;
  let other: string;
  let now: Date;
  let png: Uint8Array;
  let requests: string[];
  let resources: Map<string, Uint8Array>;
  let beforeFetch: ((url: string) => Promise<void>) | null;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-reference-test-"));
    now = new Date("2026-09-06T00:00:00Z");
    requests = [];
    resources = new Map();
    beforeFetch = null;
    png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const mails: string[] = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
      browsing: browseFixture,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage: new FileObjectStorage(dir),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: !url.includes("127.0.0.1"), reason: null };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({
              url,
              allowed: !url.includes("127.0.0.1"),
              reason: url.includes("127.0.0.1") ? "REFERENCE_PRIVATE" : null,
            }));
          },
          async fetch(url) {
            requests.push(url);
            await beforeFetch?.(url);
            const bytes = resources.get(url);
            if (!bytes)
              throw new BusinessRuleError("REFERENCE_FETCH", "取得失敗");
            return {
              body: stream(bytes),
              finalUrl: url,
              contentType: "application/octet-stream",
            };
          },
        },
        wake() {},
      },
    };
    async function user(email: string) {
      const r = await signUp(container, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const session = await verifyEmail(
        container,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!session) throw Error("session");
      return session.token;
    }
    token = await user("references-a@example.test");
    other = await user("references-b@example.test");
    resources.set("https://public.example/image.png", png);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function claim() {
    const job = await container.unitOfWorkProvider.run((c) =>
      c.references.claim(
        now,
        container.tokens.generate(),
        new Date(now.getTime() + 60_000),
      ),
    );
    if (job?.state !== "running") throw Error("no reference job");
    return job;
  }
  async function run() {
    const job = await claim();
    await runReferenceJob(container, job, new AbortController().signal);
    return job;
  }
  async function imported(html: string, enabled = true) {
    const bytes = text(html);
    const batch = await beginUpload(container, token, {
      files: [{ name: "style.html", bytes: bytes.length }],
      useAi: false,
      importReferences: enabled,
    });
    const accepted = await acceptUpload(
      container,
      token,
      batch.files[0]?.id ?? "",
      stream(bytes),
    );
    const conversion = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "style-convert", new Date(now.getTime() + 60_000)),
    );
    if (!conversion || !accepted.noteId) throw Error("conversion");
    await runImportJob(container, conversion);
    return { id: accepted.noteId, batchId: batch.batchId, conversion };
  }
  it("classifies only initial safe conversion and first stylesheet results", async () => {
    const plain = await imported('<h1 class="decorated">semantic only</h1>');
    expect((await getNote(container, token, plain.id)).display).toMatchObject({
      style: "default",
      source: "automatic",
      initialization: { kind: "complete" },
    });
    const inline = await imported('<p style="color:red">inline</p>');
    expect((await getNote(container, token, inline.id)).display.style).toBe(
      "original",
    );
    resources.set("https://public.example/style.css", text("p{color:blue}"));
    const raw =
      '<p>remote</p><link rel="stylesheet" href="https://public.example/style.css">';
    const remote = await imported(raw);
    expect((await getNote(container, token, remote.id)).display).toMatchObject({
      style: "default",
      initialization: { kind: "reference" },
    });
    await run();
    expect((await getNote(container, token, remote.id)).display).toMatchObject({
      style: "original",
      initialization: { kind: "complete" },
    });
    const off = await imported(raw, false);
    expect((await getNote(container, token, off.id)).display.style).toBe(
      "default",
    );
    await controlReference(container, token, { noteId: off.id, action: "on" });
    await run();
    expect((await getNote(container, token, off.id)).display.style).toBe(
      "default",
    );
    await saveNote(container, token, {
      id: inline.id,
      title: "plain later",
      html: "<p>plain</p>",
    });
    expect((await getNote(container, token, inline.id)).display.style).toBe(
      "original",
    );
  });
  it.each([
    false,
    true,
  ])("hard-cancels delayed references without late %s commit or sibling cancellation", async (fail) => {
    const raw =
      '<p>safe</p><link rel="stylesheet" href="https://public.example/late.css">';
    resources.set("https://public.example/late.css", text("p{color:blue}"));
    const target = await imported(raw);
    const sibling = await imported(raw);
    const job = await claim();
    expect(job.noteId).toBe(target.id);
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((r) => {
      enter = r;
    });
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    beforeFetch = async () => {
      enter();
      await barrier;
      if (fail) throw new BusinessRuleError("REFERENCE_FETCH", "late failure");
    };
    const pending = runReferenceJob(
      container,
      job,
      new AbortController().signal,
    );
    await entered;
    const note = await getNote(container, token, target.id);
    const before = await container.unitOfWorkProvider.run(async (c) => ({
      revisions: await c.revisions.list(target.id),
      entries: await c.references.entries(target.id),
    }));
    expect(
      (await getTrashIntent(container, token, target.id)).hasRunningJobs,
    ).toBe(true);
    const deleted = await trashNote(container, token, {
      id: target.id,
      version: note.version,
      cancelProcessing: true,
    });
    await restoreNote(container, token, deleted);
    release();
    await pending;
    beforeFetch = null;
    expect(
      await container.unitOfWorkProvider.run((c) => c.references.job(job.id)),
    ).toMatchObject({ state: "cancelled", failure: null, leaseToken: null });
    expect(
      await container.unitOfWorkProvider.run(async (c) => ({
        revisions: await c.revisions.list(target.id),
        entries: await c.references.entries(target.id),
      })),
    ).toEqual(before);
    expect(await getNote(container, token, target.id)).toMatchObject({
      html: note.html,
      title: note.title,
      updatedAt: note.updatedAt,
      display: {
        style: note.display.style,
        initialization: { kind: "complete" },
      },
    });
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.activeForNote(sibling.id),
      ),
    ).toHaveLength(1);
    await run();
    expect(
      (await readReferences(container, token, sibling.id)).entries.some(
        (e) => e.state === "acquired",
      ),
    ).toBe(true);
    await controlReference(container, token, {
      noteId: target.id,
      action: "on",
    });
    await run();
    expect((await getNote(container, token, target.id)).html).toContain(
      "color:blue",
    );
    expect((await getNote(container, token, target.id)).display.style).toBe(
      note.display.style,
    );
  });
  it("finishes no-HTML-change failures, queued cancellation and claim exhaustion once", async () => {
    const raw =
      '<p>missing</p><link rel="stylesheet" href="https://public.example/missing.css">';
    const missing = await imported(raw);
    await run();
    const failed = await getNote(container, token, missing.id);
    expect(failed.display).toMatchObject({
      style: "default",
      initialization: { kind: "complete" },
    });
    resources.set("https://public.example/missing.css", text("p{color:red}"));
    await controlReference(container, token, {
      noteId: missing.id,
      action: "retry",
    });
    await run();
    expect((await getNote(container, token, missing.id)).display.style).toBe(
      "default",
    );
    const cancelled = await imported(raw);
    await controlReference(container, token, {
      noteId: cancelled.id,
      action: "cancel",
    });
    expect(
      (await getNote(container, token, cancelled.id)).display.initialization
        .kind,
    ).toBe("complete");
    const exhausted = await imported(raw);
    let job = await claim();
    for (let i = 0; i < 3; i++) {
      now = new Date(now.getTime() + 61_000);
      job = await claim();
    }
    await runReferenceJob(container, job, new AbortController().signal);
    expect(
      (await readReferences(container, token, exhausted.id)).job?.state,
    ).toBe("failed");
    expect(
      (await getNote(container, token, exhausted.id)).display.initialization
        .kind,
    ).toBe("complete");
  });
  it("preserves recorded initial decoration on supersession and manual selection against late jobs", async () => {
    const raw =
      '<p style="color:red">initial</p><link rel="stylesheet" href="https://public.example/slow.css">';
    resources.set(
      "https://public.example/slow.css",
      text("p{background:blue}"),
    );
    const edited = await imported(raw);
    await saveNote(container, token, {
      id: edited.id,
      title: "changed",
      html: "<p>no decoration</p>",
    });
    expect((await getNote(container, token, edited.id)).display).toMatchObject({
      style: "original",
      initialization: { kind: "complete", reason: "interrupted" },
    });
    const chosen = await imported(raw);
    let changed = false;
    beforeFetch = async () => {
      if (changed) return;
      changed = true;
      await setDisplayStyle(container, token, {
        id: chosen.id,
        style: "default",
      });
    };
    await run();
    expect((await getNote(container, token, chosen.id)).display).toMatchObject({
      style: "default",
      source: "user",
    });
    beforeFetch = null;
    await run();
    const final = await getNote(container, token, chosen.id);
    expect(final.html).toContain("background:blue");
    expect(final.display).toMatchObject({ style: "default", source: "user" });
  });
  it("style-only commands keep latest body and body saves keep user settings, with current authorization", async () => {
    const saved = await saveNote(container, token, {
      title: "first",
      html: "<p>first</p>",
    });
    await saveNote(container, token, {
      id: saved.note.id,
      title: "latest",
      html: "<p>latest</p>",
    });
    const style = await setDisplayStyle(container, token, {
      id: saved.note.id,
      style: "original",
    });
    expect(style).toMatchObject({
      title: "latest",
      html: "<p>latest</p>",
      display: { style: "original", source: "user" },
    });
    await saveNote(container, token, {
      id: saved.note.id,
      version: 0,
      title: "later",
      html: "<p>later</p>",
    });
    expect((await getNote(container, token, saved.note.id)).display.style).toBe(
      "original",
    );
    await expect(
      setDisplayStyle(container, other, {
        id: saved.note.id,
        style: "default",
      }),
    ).rejects.toBeDefined();
    await expect(
      setDisplayStyle(container, null, { id: saved.note.id, style: "default" }),
    ).rejects.toBeDefined();
    expect((await getNote(container, token, saved.note.id)).display.style).toBe(
      "original",
    );
  });
  it("terminates failed and cancelled conversion initialization without blocking import retry", async () => {
    const bytes = text("<p>retry</p>");
    const batch = await beginUpload(container, token, {
      files: [{ name: "a.html", bytes: bytes.length }],
      useAi: false,
    });
    const accepted = await acceptUpload(
      container,
      token,
      batch.files[0]?.id ?? "",
      stream(bytes),
    );
    if (!accepted.noteId) throw Error("note");
    await cancelImport(container, token, batch.batchId);
    expect(
      (await getNote(container, token, accepted.noteId)).display.initialization
        .kind,
    ).toBe("complete");
    await expect(
      retryImport(container, token, accepted.jobId ?? ""),
    ).rejects.toMatchObject({ code: "JOB_NOT_RETRYABLE" });
    await reimportNote(container, token, accepted.noteId);
    const job = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "retry-convert", new Date(now.getTime() + 60_000)),
    );
    if (!job) throw Error("job");
    await commitImportResult(container, job, {
      kind: "failed",
      reason: "test failure",
    });
    await expect(retryImport(container, token, job.id)).resolves.toMatchObject({
      noteId: accepted.noteId,
    });
  });
  it("keeps a manually selected style while rescheduling a still-processing conversion at the latest version", async () => {
    const bytes = text('<p style="color:red">conversion keeps user</p>');
    const batch = await beginUpload(container, token, {
      files: [{ name: "a.html", bytes: bytes.length }],
      useAi: false,
    });
    const accepted = await acceptUpload(
      container,
      token,
      batch.files[0]?.id ?? "",
      stream(bytes),
    );
    if (!accepted.noteId) throw Error("note");
    const old = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "old", new Date(now.getTime() + 60_000)),
    );
    if (!old) throw Error("old");
    await setDisplayStyle(container, token, {
      id: accepted.noteId,
      style: "default",
    });
    await runImportJob(container, old);
    const latest = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "latest", new Date(now.getTime() + 60_000)),
    );
    if (!latest) throw Error("latest");
    expect(latest.noteVersion).toBe(1);
    await runImportJob(container, latest);
    const final = await getNote(container, token, accepted.noteId);
    expect(final.html).toContain("conversion keeps user");
    expect(final.display).toMatchObject({
      style: "default",
      source: "user",
      initialization: { kind: "complete" },
    });
  });
  it("settles only terminal or missing initialization jobs and never a live lease or user choice", async () => {
    const source =
      '<p style="color:red">recover</p><link rel="stylesheet" href="https://public.example/recover.css">';
    const pending = await imported(source);
    expect(await settleAbandonedDisplays(container)).toBe(0);
    const job = await claim();
    expect(await settleAbandonedDisplays(container)).toBe(0);
    await container.unitOfWorkProvider.run((c) =>
      c.references.finish(
        job.id,
        job.leaseToken,
        now,
        "failed",
        "interrupted process",
      ),
    );
    expect(await settleAbandonedDisplays(container)).toBe(1);
    expect((await getNote(container, token, pending.id)).display).toMatchObject(
      {
        style: "original",
        initialization: { kind: "complete", reason: "interrupted" },
      },
    );
    await setDisplayStyle(container, token, {
      id: pending.id,
      style: "default",
    });
    expect(await settleAbandonedDisplays(container)).toBe(0);
    expect((await getNote(container, token, pending.id)).display.source).toBe(
      "user",
    );
    await controlReference(container, token, {
      noteId: pending.id,
      action: "cancel",
    });
    const missing = await imported(source);
    await container.unitOfWorkProvider.run(async (c) => {
      const note = await c.notes.findById(missing.id);
      if (!note) throw Error("note");
      await c.notes.save(
        {
          ...note,
          display: {
            style: "default",
            source: "automatic",
            initialization: {
              kind: "reference",
              jobId: container.idGenerator.next(),
              decorated: false,
            },
          },
        },
        note.version,
      );
    });
    expect(await settleAbandonedDisplays(container)).toBe(1);
    expect((await getNote(container, token, missing.id)).display.style).toBe(
      "default",
    );
  });
  it("excludes an unverified owner's pending notes before the bounded limit and settles after re-verification", async () => {
    const raw =
      '<p>pending</p><link rel="stylesheet" href="https://public.example/pending.css">';
    const one = await imported(raw);
    const job = await claim();
    await container.unitOfWorkProvider.run((c) =>
      c.references.finish(job.id, job.leaseToken, now, "failed", "recovery"),
    );
    const owner = await container.unitOfWorkProvider.run(async (c) => {
      const note = await c.notes.findById(one.id);
      if (note?.owner.kind !== "personal") throw Error("owner");
      const account = await c.accounts.findById(note.owner.accountId);
      if (!account) throw Error("account");
      await c.accounts.save({
        ...account,
        status: "unverified",
        verifiedAt: null,
      });
      return account;
    });
    const second = await saveNote(container, other, {
      title: "eligible",
      html: "<p>eligible</p>",
    });
    await container.unitOfWorkProvider.run(async (c) => {
      const note = await c.notes.findById(second.note.id);
      if (!note) throw Error("note");
      await c.notes.save(
        {
          ...note,
          display: {
            style: "default",
            source: "automatic",
            initialization: {
              kind: "reference",
              jobId: container.idGenerator.next(),
              decorated: false,
            },
          },
        },
        note.version,
      );
      expect((await c.notes.unsettledDisplays(1)).map((n) => n.id)).toEqual([
        second.note.id,
      ]);
    });
    expect(await settleAbandonedDisplays(container)).toBe(1);
    await container.unitOfWorkProvider.run(async (c) => {
      expect(
        (await c.notes.findById(one.id))?.display.initialization.kind,
      ).toBe("reference");
      await c.accounts.save(owner);
    });
    expect(await settleAbandonedDisplays(container)).toBe(1);
  });
  it("preserves a body update that lands while a style-only command awaits outside-transaction DNS", async () => {
    const saved = await saveNote(container, token, {
      title: "old",
      html: '<p style="background:url(https://public.example/bg.png)">old</p>',
    });
    const fetcher = container.referencing?.fetcher;
    if (!fetcher) throw Error("fetcher");
    let release!: () => void;
    let observed!: () => void;
    const started = new Promise<void>((resolve) => {
      observed = resolve;
    });
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(fetcher, "inspectMany").mockImplementationOnce(async (urls) => {
      observed();
      await waiting;
      return urls.map((url) => ({ url, allowed: true, reason: null }));
    });
    const styling = setDisplayStyle(container, token, {
      id: saved.note.id,
      style: "original",
    });
    await started;
    await saveNote(container, token, {
      id: saved.note.id,
      title: "concurrent newest",
      html: "<p>concurrent newest</p>",
    });
    release();
    expect(await styling).toMatchObject({
      title: "concurrent newest",
      html: "<p>concurrent newest</p>",
      display: { style: "original", source: "user" },
    });
  });
  it("boot discovers an initial stylesheet without wake delivery and fixes the setting exactly once", async () => {
    resources.set("https://public.example/boot.css", text("p{color:red}"));
    const pending = await imported(
      '<p>boot</p><link rel="stylesheet" href="https://public.example/boot.css">',
    );
    const runner = createReferenceRunner(container, 30);
    try {
      await expect
        .poll(
          async () =>
            (await getNote(container, token, pending.id)).display.style,
        )
        .toBe("original");
      expect(
        (await getNote(container, token, pending.id)).display.initialization
          .kind,
      ).toBe("complete");
    } finally {
      await runner.stop();
    }
    expect(requests.filter((url) => url.endsWith("/boot.css"))).toHaveLength(1);
  });
  it.each([
    "partial",
    "cancelled",
  ] as const)("initial %s results retain acquired safe CSS and finalize only once", async (outcome) => {
    resources.set("https://public.example/one.css", text("p{color:red}"));
    const initial = await imported(
      '<p>partial</p><link rel="stylesheet" href="https://public.example/one.css"><link rel="stylesheet" href="https://public.example/two.css">',
    );
    if (outcome === "cancelled")
      beforeFetch = async () => {
        await controlReference(container, token, {
          noteId: initial.id,
          action: "cancel",
        });
      };
    await run();
    const final = await getNote(container, token, initial.id);
    expect(final.display).toMatchObject({
      style: "original",
      source: "automatic",
      initialization: { kind: "complete" },
    });
    expect(final.html).toContain("color:red");
    const ledger = await readReferences(container, token, initial.id);
    expect(ledger.job).toMatchObject({
      state: outcome === "cancelled" ? "cancelled" : "succeeded",
      failure: null,
    });
    expect(
      ledger.entries.find((entry) => entry.url.endsWith("/two.css"))?.state,
    ).toBe(outcome === "cancelled" ? "cancelled" : "failed");
  });
  it("streams validated media into same-note committed assets, preserves provenance and current-ref authorization", async () => {
    const saved = await saveNote(container, token, {
      title: "日本語",
      html: '<p>本文</p><img src="https://public.example/image.png">',
    });
    expect(
      (await readReferences(container, token, saved.note.id)).job?.state,
    ).toBe("queued");
    await run();
    const note = await getNote(container, token, saved.note.id);
    expect(note.html).toContain(`/api/notes/${note.id}/assets/`);
    const rows = await base.db.select().from(assets);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      draftId: null,
      sourceNoteId: note.id,
      committedToNote: true,
    });
    const url = container.htmlSanitizer.assetUrls(note.html)[0];
    const ref = parseAssetUrl(url ?? "");
    if (!ref) throw Error("asset");
    expect((await getAsset(container, token, ref)).bytes).toBe(png.length);
    await expect(getAsset(container, other, ref)).rejects.toBeDefined();
    await saveNote(container, token, {
      id: note.id,
      title: note.title,
      html: "<p>removed</p>",
    });
    await expect(getAsset(container, token, ref)).rejects.toBeDefined();
    await saveNote(container, token, {
      id: note.id,
      title: note.title,
      html: note.html,
    });
    expect((await getAsset(container, token, ref)).bytes).toBe(png.length);
    expect(requests).toHaveLength(1);
    await expect(
      saveNote(container, token, { title: "borrow", html: note.html }),
    ).rejects.toBeDefined();
  });
  it("retains failures and opt-out candidates; later on retries only missing resources", async () => {
    const saved = await saveNote(container, token, {
      title: "off",
      html: '<img src="https://public.example/image.png"><img src="https://public.example/missing.png">',
      importReferences: false,
    });
    expect(
      (await readReferences(container, token, saved.note.id)).job,
    ).toBeNull();
    expect(requests).toEqual([]);
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "on",
    });
    await run();
    let ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries
        .filter((e) => e.current)
        .map((e) => e.state)
        .sort(),
    ).toEqual(["acquired", "failed"]);
    expect(ledger.job?.state).toBe("succeeded");
    resources.set("https://public.example/missing.png", png);
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "on",
    });
    await run();
    ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "acquired"),
    ).toHaveLength(2);
    expect(requests.filter((x) => x.endsWith("/image.png"))).toHaveLength(1);
  });
  it("reuses acquired same-note source URLs and CSS on stale editor saves without refetching or borrowing", async () => {
    resources.set(
      "https://public.example/site.css",
      text(".local{position:absolute;left:12px;top:8px;width:20px;color:red}"),
    );
    const original =
      '<link rel="stylesheet" href="https://public.example/site.css"><div class="local">日本語</div><img src="https://public.example/image.png">';
    const saved = await saveNote(container, token, {
      title: "reuse",
      html: original,
    });
    await run();
    const acquired = await getNote(container, token, saved.note.id);
    expect(acquired.html).toContain("position:absolute");
    const assetCount = (await base.db.select().from(assets)).length;
    const again = await saveNote(container, token, {
      id: saved.note.id,
      title: "later tab",
      html: original,
    });
    expect(again.note.html).toContain(`/api/notes/${saved.note.id}/assets/`);
    expect(again.note.html).toContain("position:absolute");
    expect(
      (await readReferences(container, token, saved.note.id)).job,
    ).toBeNull();
    expect((await base.db.select().from(assets)).length).toBe(assetCount);
    expect(requests).toHaveLength(2);
    const otherNote = await saveNote(container, token, {
      title: "independent",
      html: original,
      importReferences: false,
    });
    expect(otherNote.note.html).not.toContain(
      `/api/notes/${saved.note.id}/assets/`,
    );
    expect(otherNote.note.html).not.toContain("position:absolute");
    await expect(
      saveNote(container, other, {
        id: saved.note.id,
        title: "deny",
        html: original,
      }),
    ).rejects.toBeDefined();
  });
  it("fences two claims and stale workers, retaining manual edits and cleaning staged objects", async () => {
    const saved = await saveNote(container, token, {
      title: "race",
      html: '<img src="https://public.example/image.png">',
    });
    const claims = await Promise.all([
      container.unitOfWorkProvider.run((c) =>
        c.references.claim(now, "one", new Date(now.getTime() + 60_000)),
      ),
      container.unitOfWorkProvider.run((c) =>
        c.references.claim(now, "two", new Date(now.getTime() + 60_000)),
      ),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const old = claims.find(Boolean);
    if (!old) throw Error("claim");
    now = new Date(now.getTime() + 61_000);
    const newer = await claim();
    await runReferenceJob(container, old, new AbortController().signal);
    expect(await base.db.select().from(assets)).toHaveLength(0);
    beforeFetch = async () => {
      await saveNote(container, token, {
        id: saved.note.id,
        title: "manual",
        html: "<p>手編集</p>",
      });
    };
    await runReferenceJob(container, newer, new AbortController().signal);
    expect((await getNote(container, token, saved.note.id)).html).toBe(
      "<p>手編集</p>",
    );
    expect(await base.db.select().from(assets)).toHaveLength(0);
    expect(
      (await base.db.select().from(referenceObjects)).every(
        (o) => o.state === "cleaned",
      ),
    ).toBe(true);
  });
  it("waits for current acquisition on ordinary cancel, preserves its result, and cancels unstarted targets", async () => {
    resources.set("https://public.example/second.png", png);
    const saved = await saveNote(container, token, {
      title: "cancel",
      html: '<img src="https://public.example/image.png"><img src="https://public.example/second.png">',
    });
    beforeFetch = async () => {
      await controlReference(container, token, {
        noteId: saved.note.id,
        action: "cancel",
      });
    };
    await run();
    const ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job?.state).toBe("cancelled");
    expect(ledger.job?.failure).toBeNull();
    expect(
      ledger.entries
        .filter((e) => e.current)
        .map((e) => e.state)
        .sort(),
    ).toEqual(["acquired", "cancelled"]);
    expect(requests).toHaveLength(1);
    expect(await base.db.select().from(assets)).toHaveLength(1);
  });
  it("keeps companion bundles across opt-out, seals failed siblings and resolves parent paths without escaping", async () => {
    const html = text(
      '<p>同梱</p><img src="../images/a.png"><link rel="stylesheet" href="../styles/a.css">',
    );
    const css = text("p{color:purple}");
    const batch = await beginUpload(container, token, {
      files: [
        { name: "index.html", path: "pages/index.html", bytes: html.length },
        {
          name: "a.png",
          path: "images/a.png",
          role: "companion",
          bytes: png.length,
        },
        {
          name: "a.css",
          path: "styles/a.css",
          role: "companion",
          bytes: css.length,
        },
        { name: "missing.png", role: "companion", bytes: 10 },
      ],
      useAi: false,
      importReferences: false,
    });
    const first = batch.files[0];
    if (!first) throw Error("batch");
    const note = await acceptUpload(container, token, first.id, stream(html));
    await acceptUpload(container, token, batch.files[1]?.id ?? "", stream(png));
    await acceptUpload(container, token, batch.files[2]?.id ?? "", stream(css));
    await sealUpload(container, token, batch.batchId);
    const conversion = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "conversion", new Date(now.getTime() + 60_000)),
    );
    if (!conversion) throw Error("conversion");
    await runImportJob(container, conversion);
    if (!note.noteId) throw Error("note");
    expect((await readReferences(container, token, note.noteId)).enabled).toBe(
      false,
    );
    await controlReference(container, token, {
      noteId: note.noteId,
      action: "on",
    });
    await run();
    expect((await getNote(container, token, note.noteId)).html).toContain(
      "/assets/",
    );
    expect(requests).toEqual([]);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.companions(batch.batchId),
      ),
    ).toHaveLength(2);
    expect(
      resolveBundlePath("pages/index.html", "../../escape.png"),
    ).toBeNull();
  });
  it("validates small data images before display", async () => {
    const uri = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    const saved = await saveNote(container, token, {
      title: "data",
      html: `<img src="${uri}">`,
    });
    expect(
      (
        await renderNote(container, token, {
          noteId: saved.note.id,
          html: saved.note.html,
        })
      ).assetUrls,
    ).toEqual([]);
    await run();
    const note = await getNote(container, token, saved.note.id);
    expect(
      (await renderNote(container, token, { noteId: note.id, html: note.html }))
        .assetUrls,
    ).toContain(uri);
    expect(await base.db.select().from(assets)).toHaveLength(0);
  });
  it("reclaims only sealed orphan companions after real deletion, retaining pending/off-note sources and failed cleanup quota", async () => {
    const batch = await beginUpload(container, token, {
      files: [
        { name: "body.txt", bytes: 3 },
        { name: "image.png", bytes: png.length, role: "companion" },
      ],
      useAi: false,
      importReferences: false,
    });
    const body = batch.files[0];
    const image = batch.files[1];
    const io = container.importing;
    if (!body || !image || !io) throw Error("batch");
    await acceptUpload(container, token, image.id, stream(png));
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.orphanCompanions(),
      ),
    ).toHaveLength(0);
    // Even an inconsistent early seal cannot reclaim an outstanding body reservation.
    await container.unitOfWorkProvider.run((c) =>
      c.references.sealBundle(batch.batchId),
    );
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.orphanCompanions(),
      ),
    ).toHaveLength(0);
    await expect(
      acceptUpload(container, token, body.id, stream(text("abc"))),
    ).rejects.toMatchObject({ code: "UPLOAD_CANCELLED" });
    const orphans = await container.unitOfWorkProvider.run((c) =>
      c.references.orphanCompanions(),
    );
    expect(orphans).toHaveLength(1);
    const companion = orphans[0];
    if (!companion) throw Error("companion");
    const remove = io.storage.remove.bind(io.storage);
    const deletion = vi
      .spyOn(io.storage, "remove")
      .mockRejectedValue(new Error("test delete failure"));
    const errors = vi
      .spyOn(container.logger, "error")
      .mockImplementation(() => {});
    const first = createReferenceRunner(container, 1000);
    try {
      await vi.waitFor(() => expect(deletion).toHaveBeenCalled());
      expect((await listImports(container, token)).usedBytes).toBe(png.length);
      expect(await io.storage.stat(companion.storageKey)).toMatchObject({
        bytes: png.length,
      });
    } finally {
      await first.stop();
    }
    deletion.mockImplementation(remove);
    const second = createReferenceRunner(container, 1000);
    try {
      await vi.waitFor(async () =>
        expect((await listImports(container, token)).usedBytes).toBe(0),
      );
    } finally {
      await second.stop();
    }
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.companions(batch.batchId),
      ),
    ).toHaveLength(0);
    await expect(io.storage.stat(companion.storageKey)).rejects.toBeDefined();
    deletion.mockRestore();
    errors.mockRestore();
    const retained = await beginUpload(container, token, {
      files: [
        { name: "retain.txt", bytes: 3 },
        { name: "retain.png", bytes: png.length, role: "companion" },
      ],
      useAi: false,
      importReferences: false,
    });
    const noteFile = retained.files[0];
    const source = retained.files[1];
    if (!noteFile || !source) throw Error("retained");
    await acceptUpload(container, token, noteFile.id, stream(text("abc")));
    await acceptUpload(container, token, source.id, stream(png));
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.orphanCompanions(),
      ),
    ).toHaveLength(0);
    expect(
      await container.unitOfWorkProvider.run((c) =>
        c.references.companions(retained.batchId),
      ),
    ).toHaveLength(1);
  });
  it("sanitizes small data SVG with import off, cuts large decoded data into assets, and rejects corruption", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10" fill="red" onclick="alert(1)"/></svg>';
    const large = svg.replace(
      "<script>",
      `<desc>${"日本語".repeat(5000)}</desc><script>`,
    );
    const uri = (value: string) =>
      `data:image/svg+xml;base64,${Buffer.from(value).toString("base64")}`;
    const smallUri = uri(svg);
    const saved = await saveNote(container, token, {
      title: "safe data",
      html: `<img src="${smallUri}"><img src="${uri(large)}"><img src="data:image/png;base64,YmFk">`,
      importReferences: false,
    });
    await run();
    const note = await getNote(container, token, saved.note.id);
    const ledger = await readReferences(container, token, note.id);
    expect(ledger.enabled).toBe(false);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "acquired"),
    ).toHaveLength(2);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "failed"),
    ).toHaveLength(1);
    const safe = ledger.entries.find((e) => e.url === smallUri)?.finalUrl;
    if (!safe) throw Error("safe SVG");
    const decoded = new NodeReferenceProcessor().decodeDataUri(safe);
    expect(new TextDecoder().decode(decoded.bytes)).not.toMatch(
      /script|onclick/,
    );
    expect(new TextDecoder().decode(decoded.bytes)).toContain("viewBox");
    expect(await base.db.select().from(assets)).toHaveLength(1);
    const rendered = await renderNote(container, token, {
      noteId: note.id,
      html: note.html,
      externalReading: false,
    });
    expect(rendered.assetUrls).toHaveLength(2);
    expect(rendered.html).not.toContain("YmFk");
    expect(requests).toHaveLength(0);
  });
  it("records queued cancellation and preserves the last in-flight result without assigning a failure", async () => {
    const saved = await saveNote(container, token, {
      title: "cancel boundaries",
      html: '<img src="https://public.example/image.png">',
    });
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "cancel",
    });
    let ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job).toMatchObject({ state: "cancelled", failure: null });
    expect(ledger.entries.filter((e) => e.current).map((e) => e.state)).toEqual(
      ["cancelled"],
    );
    expect(requests).toEqual([]);
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "retry",
    });
    beforeFetch = async () => {
      await controlReference(container, token, {
        noteId: saved.note.id,
        action: "cancel",
      });
    };
    await run();
    ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job).toMatchObject({
      state: "cancelled",
      failure: null,
      completed: 1,
    });
    expect(ledger.entries.filter((e) => e.current).map((e) => e.state)).toEqual(
      ["acquired"],
    );
    expect(await base.db.select().from(assets)).toHaveLength(1);
  });
  it("uses current target count rather than historical failures and includes CSS in the 200 target budget", async () => {
    const html = Array.from(
      { length: 201 },
      (_, i) => `<img src="https://public.example/${i}.png">`,
    ).join("");
    const saved = await saveNote(container, token, {
      title: "budget",
      html,
      importReferences: false,
    });
    let ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "limited"),
    ).toHaveLength(1);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "budget",
      importReferences: true,
      html: '<img src="https://public.example/image.png"><link rel="stylesheet" href="https://public.example/style.css">',
    });
    resources.set("https://public.example/style.css", text("p{color:blue}"));
    await run();
    ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.entries.filter((e) => e.current)).toHaveLength(2);
    expect(
      ledger.entries.filter((e) => !e.current).length,
    ).toBeGreaterThanOrEqual(201);
    expect(
      ledger.entries
        .filter((e) => e.current)
        .every((e) => e.state === "acquired"),
    ).toBe(true);
  });
  it("reserves acquired targets before new entries regardless of order and restores removed slots without counting dependencies", async () => {
    const links = Array.from({ length: 200 }, (_, i) => {
      const url = `https://public.example/count-${i}.css`;
      resources.set(url, text("p{color:blue}"));
      return `<link rel="stylesheet" href="${url}">`;
    });
    const extra =
      '<link rel="stylesheet" href="https://public.example/new.css">';
    resources.set("https://public.example/new.css", text("p{color:red}"));
    const saved = await saveNote(container, token, {
      title: "200 CSS",
      html: `${links.join("")}<p>count</p>`,
    });
    await run();
    expect(requests).toHaveLength(200);
    requests.length = 0;
    const dependencies =
      '<p style="background:url(https://public.example/dependency.png)">count</p>';
    for (const html of [
      extra + links.join(""),
      links.join("") + extra,
      extra + extra + links.join(""),
    ]) {
      await saveNote(container, token, {
        id: saved.note.id,
        title: "200 CSS",
        html: dependencies + html,
      });
      const ledger = await readReferences(container, token, saved.note.id);
      expect(
        ledger.entries.filter((e) => e.current && e.state === "acquired"),
      ).toHaveLength(200);
      expect(
        ledger.entries.filter((e) => e.current && e.state === "external"),
      ).toHaveLength(1);
      expect(
        ledger.entries.find((e) => e.current && e.url.endsWith("/new.css")),
      ).toMatchObject({
        state: "limited",
        reason: expect.stringContaining("200"),
      });
      expect(ledger.job).toBeNull();
      expect(requests).toHaveLength(0);
    }
    await saveNote(container, token, {
      id: saved.note.id,
      title: "slot returned",
      html: dependencies + extra + links.slice(1).join(""),
    });
    await run();
    expect(requests).toEqual(["https://public.example/new.css"]);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "mixed",
      html:
        dependencies +
        '<img src="https://public.example/image.png">' +
        extra +
        links.slice(2).join(""),
    });
    await run();
    const ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "acquired"),
    ).toHaveLength(200);
    expect(
      ledger.entries.filter((e) => e.current && e.kind === "image"),
    ).toHaveLength(1);
    expect(requests).toEqual([
      "https://public.example/new.css",
      "https://public.example/image.png",
    ]);
  }, 20_000);

  it("records discovered CSS dependencies and known blocked reasons without fetching or consuming acquisition slots", async () => {
    resources.set(
      "https://public.example/deps.css",
      text(
        "p{background:url(https://public.example/bg.png)}@font-face{font-family:test;src:url(https://public.example/font.woff2)}",
      ),
    );
    const saved = await saveNote(container, token, {
      title: "dependency reasons",
      html: '<link rel="stylesheet" href="https://public.example/deps.css"><p style="background:url(http://127.0.0.1/private.png)">private</p><div style="background:url(../unresolved.png)">relative</div>',
    });
    let ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.find(
        (e) => e.kind === "background" && e.url.includes("127.0.0.1"),
      ),
    ).toMatchObject({
      state: "external",
      reason: expect.stringContaining("内部"),
    });
    expect(
      ledger.entries.find((e) => e.url === "../unresolved.png"),
    ).toMatchObject({
      state: "external",
      reason: expect.stringContaining("解決できない"),
    });
    await run();
    const loaded = await getNote(container, token, saved.note.id);
    for (const action of [null, "off", "on"] as const) {
      if (action)
        await controlReference(container, token, {
          noteId: saved.note.id,
          action,
        });
      ledger = await readReferences(container, token, saved.note.id);
      expect(
        ledger.entries.filter((e) => e.current && e.state === "external"),
      ).toHaveLength(4);
      expect(
        ledger.entries.find((e) => e.current && e.kind === "font"),
      ).toMatchObject({
        url: "https://public.example/font.woff2",
        reason: expect.stringContaining("前回の確認"),
      });
      expect(requests).toEqual(["https://public.example/deps.css"]);
    }
    await saveNote(container, token, {
      id: saved.note.id,
      title: "same",
      html: loaded.html,
    });
    ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.filter((e) => e.current && e.state === "external"),
    ).toHaveLength(4);
    expect(ledger.job).toBeNull();
    await saveNote(container, token, {
      id: saved.note.id,
      title: "removed",
      html: "<p>removed CSS</p>",
    });
    ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.entries.filter((e) => e.current)).toHaveLength(0);
    expect(ledger.entries.filter((e) => e.state === "external")).toHaveLength(
      4,
    );
  });

  it("refetches a removed stylesheet when reintroduced but reuses currently available CSS on old raw saves", async () => {
    const raw =
      '<p>restore CSS</p><link rel="stylesheet" href="https://public.example/restore.css"><img src="https://public.example/image.png">';
    resources.set("https://public.example/restore.css", text("p{color:blue}"));
    const saved = await saveNote(container, token, {
      title: "CSS lifecycle",
      html: raw,
    });
    await run();
    requests.length = 0;
    await saveNote(container, token, {
      id: saved.note.id,
      title: "reuse",
      html: raw,
    });
    expect((await getNote(container, token, saved.note.id)).html).toContain(
      "color:blue",
    );
    expect(
      (await readReferences(container, token, saved.note.id)).job,
    ).toBeNull();
    expect(await base.db.select().from(assets)).toHaveLength(1);
    await saveNote(container, token, {
      id: saved.note.id,
      title: "remove",
      html: "<p>removed</p>",
    });
    await saveNote(container, token, {
      id: saved.note.id,
      title: "reintroduce",
      html: raw,
    });
    let ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.find((e) => e.current && e.kind === "stylesheet"),
    ).toMatchObject({ state: "unattempted", bytes: 0 });
    expect(ledger.job?.state).toBe("queued");
    await run();
    ledger = await readReferences(container, token, saved.note.id);
    expect(
      ledger.entries.find((e) => e.current && e.kind === "stylesheet")?.state,
    ).toBe("acquired");
    expect((await getNote(container, token, saved.note.id)).html).toContain(
      "color:blue",
    );
    expect(requests).toEqual(["https://public.example/restore.css"]);
    expect(await base.db.select().from(assets)).toHaveLength(1);
  });

  it("recovers legacy empty acquired markers while retaining genuinely materialized empty stylesheets", async () => {
    const url = "https://public.example/legacy.css";
    const raw = `<p>legacy</p><link rel="stylesheet" href="${url}">`;
    resources.set(url, text("p{color:blue}"));
    const saved = await saveNote(container, token, {
      title: "legacy marker",
      html: raw,
    });
    await run();
    await container.unitOfWorkProvider.run(async (c) => {
      const note = await c.notes.findById(saved.note.id);
      if (!note) throw Error("note");
      await c.notes.save(
        editNote(
          note,
          note.title,
          `<p>legacy</p><style data-hollow-stylesheet="${url}"></style>`,
          now,
        ),
        note.version,
      );
    });
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "retry",
    });
    expect(
      (await readReferences(container, token, saved.note.id)).job?.state,
    ).toBe("queued");
    await run();
    expect((await getNote(container, token, saved.note.id)).html).toContain(
      "color:blue",
    );
    expect(requests.filter((request) => request === url)).toHaveLength(2);

    const empty = "https://public.example/empty.css";
    resources.set(empty, text("/* no declarations */"));
    const emptyRaw = `<p>empty stylesheet</p><link rel="stylesheet" href="${empty}">`;
    const otherNote = await saveNote(container, token, {
      title: "empty stylesheet",
      html: emptyRaw,
    });
    await run();
    const rendered = await getNote(container, token, otherNote.note.id);
    expect(
      container.referencing?.processor.styles(rendered.html)[0],
    ).toMatchObject({ materialized: true, css: "" });
    await saveNote(container, token, {
      id: otherNote.note.id,
      title: "still empty",
      html: emptyRaw,
    });
    await controlReference(container, token, {
      noteId: otherNote.note.id,
      action: "on",
    });
    expect(
      (await readReferences(container, token, otherNote.note.id)).job,
    ).toBeNull();
    expect(requests.filter((request) => request === empty)).toHaveLength(1);
  });

  async function reserveExcept(remaining: number) {
    for (let i = 0; i < 12; i++)
      await beginUpload(container, token, {
        useAi: false,
        files: [
          { name: "a.wav", bytes: 200 * 1024 ** 2 },
          { name: "b.wav", bytes: 200 * 1024 ** 2 },
        ],
      });
    await beginUpload(container, token, {
      useAi: false,
      files: [
        { name: "a.wav", bytes: 160 * 1024 ** 2 },
        { name: "b.wav", bytes: 160 * 1024 ** 2 - remaining },
      ],
    });
  }
  async function usage(noteId: string) {
    return container.unitOfWorkProvider.run(async (c) => {
      const note = await c.notes.findById(noteId);
      if (note?.owner.kind !== "personal") throw Error("owner");
      return storageUsage(c, note.owner, now);
    });
  }
  it("accounts for actual expanded SVG bytes in quota, ledger and the next resource budget", async () => {
    if (!container.referencing || !container.importing)
      throw Error("reference IO");
    expect(expandingSvg.length).toBe(482);
    resources.set("https://public.example/expand.svg", expandingSvg);
    resources.set("https://public.example/next.mp4", png);
    const fetch = vi.spyOn(container.referencing.fetcher, "fetch");
    const saved = await saveNote(container, token, {
      title: "SVG final bytes",
      html: '<img src="https://public.example/expand.svg"><video src="https://public.example/next.mp4"></video>',
    });
    await run();
    const ledger = await readReferences(container, token, saved.note.id);
    const entry = ledger.entries.find((e) => e.kind === "image" && e.current);
    expect(entry).toMatchObject({ state: "acquired", bytes: 520 });
    const [asset] = await base.db.select().from(assets);
    if (!asset) throw Error("asset");
    expect(asset?.bytes).toBe(520);
    expect(
      (await container.importing.storage.read(asset.storageKey)).length,
    ).toBe(520);
    expect(await usage(saved.note.id)).toBe(520);
    expect(fetch.mock.calls[1]?.[1].maxBytes).toBe(
      REFERENCE_LIMITS.bytes - 520,
    );
    expect(
      referenceBytesAfterAcceptance(
        REFERENCE_LIMITS.bytes - 520,
        520,
        20 * 1024 ** 2,
      ),
    ).toBe(REFERENCE_LIMITS.bytes);
    expect(() =>
      referenceBytesAfterAcceptance(
        REFERENCE_LIMITS.bytes - 482,
        520,
        20 * 1024 ** 2,
      ),
    ).toThrow(expect.objectContaining({ code: "REFERENCE_SIZE" }));
    fetch.mockRestore();
  });

  it("rejects SVG expansion without free quota and retains failed cleanup until actual object deletion", async () => {
    if (!container.importing) throw Error("storage");
    const storage = container.importing.storage;
    resources.set("https://public.example/expand.svg", expandingSvg);
    const saved = await saveNote(container, token, {
      title: "SVG quota",
      html: '<img src="https://public.example/expand.svg">',
    });
    await reserveExcept(expandingSvg.length);
    const remove = vi
      .spyOn(storage, "remove")
      .mockRejectedValue(new Error("injected storage unavailable"));
    const logger = vi
      .spyOn(container.logger, "error")
      .mockImplementation(() => {});
    await run();
    const ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.entries.find((e) => e.current)).toMatchObject({
      state: "failed",
      bytes: 0,
      reason: expect.stringContaining("安全化後"),
    });
    expect(await base.db.select().from(assets)).toHaveLength(0);
    expect(await usage(saved.note.id)).toBe(IMPORT_LIMITS.quotaBytes);
    const [object] = await base.db.select().from(referenceObjects);
    if (!object) throw Error("object");
    expect(object?.state).toBe("written");
    expect((await storage.read(object.id)).length).toBe(482);
    await expect(
      beginUpload(container, token, {
        useAi: false,
        files: [{ name: "no-room.txt", bytes: 1 }],
      }),
    ).rejects.toMatchObject({ code: "IMPORT_QUOTA" });
    remove.mockRestore();
    now = new Date(now.getTime() + 11 * 60_000);
    const runner = createReferenceRunner(container, 20);
    try {
      await expect
        .poll(
          async () => (await base.db.select().from(referenceObjects))[0]?.state,
        )
        .toBe("cleaned");
      expect(await usage(saved.note.id)).toBe(IMPORT_LIMITS.quotaBytes - 482);
      await expect(storage.read(object.id)).rejects.toBeDefined();
    } finally {
      await runner.stop();
      logger.mockRestore();
    }
  });

  it("serializes competing SVG growth reservations and never commits both over quota", async () => {
    resources.set("https://public.example/expand.svg", expandingSvg);
    const first = await saveNote(container, token, {
      title: "first SVG",
      html: '<img src="https://public.example/expand.svg">',
    });
    const second = await saveNote(container, token, {
      title: "second SVG",
      html: '<img src="https://public.example/expand.svg">',
    });
    await reserveExcept(520 + 482);
    const one = await claim();
    const two = await claim();
    const processor = container.inlineMedia;
    if (!processor) throw Error("media processor");
    let inspected = 0;
    let releaseFirst!: () => void;
    let releaseBoth!: () => void;
    const firstInspected = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const bothInspected = new Promise<void>((resolve) => {
      releaseBoth = resolve;
    });
    container = {
      ...container,
      inlineMedia: {
        async inspect(input) {
          const out = await processor.inspect(input);
          if (++inspected === 1) releaseFirst();
          if (inspected === 2) releaseBoth();
          await bothInspected;
          return out;
        },
      },
    };
    const runningOne = runReferenceJob(
      container,
      one,
      new AbortController().signal,
    );
    await firstInspected;
    const runningTwo = runReferenceJob(
      container,
      two,
      new AbortController().signal,
    );
    await Promise.all([runningOne, runningTwo]);
    const entries = (
      await Promise.all(
        [first, second].map((n) => readReferences(container, token, n.note.id)),
      )
    ).flatMap((l) => l.entries.filter((e) => e.current));
    expect(entries.filter((e) => e.state === "acquired")).toHaveLength(1);
    expect(entries.filter((e) => e.state === "failed")).toHaveLength(1);
    expect(await base.db.select().from(assets)).toHaveLength(1);
    expect(await usage(first.note.id)).toBe(IMPORT_LIMITS.quotaBytes - 482);
  });

  it("limits running execution independently from queued age and resumes successful parts through retry", async () => {
    resources.set("https://public.example/second.png", png);
    const saved = await saveNote(container, token, {
      title: "deadline",
      html: '<img src="https://public.example/image.png"><img src="https://public.example/second.png">',
    });
    now = new Date(now.getTime() + 2 * 3600_000);
    let calls = 0;
    beforeFetch = async () => {
      if (++calls === 1) {
        await container.unitOfWorkProvider.run(async (c) => {
          const settings = await c.references.settings(saved.note.id);
          const current = settings?.activeJobId
            ? await c.references.job(settings.activeJobId)
            : null;
          if (current?.state === "running")
            await c.references.heartbeat(
              current.id,
              current.leaseToken,
              now,
              new Date(now.getTime() + 6 * 60_000),
              0,
            );
        });
        now = new Date(now.getTime() + 5 * 60_000);
      }
    };
    await run();
    let ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job?.state).toBe("failed");
    expect(
      ledger.entries
        .filter((e) => e.current)
        .map((e) => e.state)
        .sort(),
    ).toEqual(["acquired", "unattempted"]);
    beforeFetch = null;
    await controlReference(container, token, {
      noteId: saved.note.id,
      action: "retry",
    });
    await run();
    ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job?.state).toBe("succeeded");
    expect(requests.filter((u) => u.endsWith("/image.png"))).toHaveLength(1);
  });
  it("discovers a queued reference job on boot without outbox delivery and keeps its permanent ledger after pruning", async () => {
    const saved = await saveNote(container, token, {
      title: "wake",
      html: '<img src="https://public.example/image.png">',
    });
    const runner = createReferenceRunner(container, 20);
    try {
      await expect
        .poll(
          async () =>
            (await readReferences(container, token, saved.note.id)).job?.state,
        )
        .toBe("succeeded");
    } finally {
      await runner.stop();
    }
    await container.unitOfWorkProvider.run((c) =>
      c.references.pruneJobs(new Date(now.getTime() + 91 * 86400_000)),
    );
    const ledger = await readReferences(container, token, saved.note.id);
    expect(ledger.job).toBeNull();
    expect(ledger.entries.some((e) => e.state === "acquired")).toBe(true);
  });
  it("counts companion physical originals plus acquired assets and rejects companion-only or ambiguous manifests", async () => {
    await expect(
      beginUpload(container, token, {
        files: [{ name: "a.png", bytes: png.length, role: "companion" }],
        useAi: false,
      }),
    ).rejects.toMatchObject({ code: "COMPANION_ONLY" });
    const html = text('<p>bundle</p><img src="a.png">');
    const batch = await beginUpload(container, token, {
      files: [
        { name: "index.html", bytes: html.length },
        { name: "a.png", bytes: png.length, role: "companion" },
        { name: "a.png", bytes: png.length, role: "companion" },
      ],
      useAi: false,
    });
    const accepted = await acceptUpload(
      container,
      token,
      batch.files[0]?.id ?? "",
      stream(html),
    );
    await acceptUpload(container, token, batch.files[1]?.id ?? "", stream(png));
    await acceptUpload(container, token, batch.files[2]?.id ?? "", stream(png));
    const conversion = await container.unitOfWorkProvider.run((c) =>
      c.jobs.claim(now, "convert", new Date(now.getTime() + 60_000)),
    );
    if (!conversion || !accepted.noteId) throw Error("note");
    await runImportJob(container, conversion);
    await run();
    const ledger = await readReferences(container, token, accepted.noteId);
    expect(ledger.entries.find((e) => e.current)?.reason).toContain("重複");
    expect((await listImports(container, token)).usedBytes).toBe(
      html.length + 2 * png.length,
    );
  });
});

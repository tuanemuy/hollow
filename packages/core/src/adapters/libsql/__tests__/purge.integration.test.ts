import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signIn } from "@repo/core/application/account/signIn";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { retryImport } from "@repo/core/application/import/controlJobs";
import { runImportJob } from "@repo/core/application/import/processJob";
import { listImports } from "@repo/core/application/import/readImports";
import {
  listNotePurges as readPurgePage,
  requestNotePurge,
  retryNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { notePurges } from "../purgeSchema";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
async function listNotePurges(container: HollowContainer, token: string) {
  const unfinished = await readPurgePage(container, token, {
    scope: "unfinished",
  });
  const completed = await readPurgePage(container, token, {
    scope: "completed",
  });
  return {
    items: [...unfinished.items, ...completed.items].sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    ),
  };
}
describe("irreversible purge, object ownership and physical capacity", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let token: string;
  let other: string;
  let storage: CoordinatedObjectStorage;
  let now: Date;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-purge-test-"));
    now = new Date("2026-09-10T00:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    storage = new CoordinatedObjectStorage(
      dir,
      common.unitOfWorkProvider,
      common.clock,
    );
    c = {
      ...common,
      inlineMedia: new IsolatedInlineMediaProcessor(),
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    async function user(email: string) {
      const r = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const result = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!result) throw Error("session");
      return result.token;
    }
    token = await user("purge-a@example.test");
    other = await user("purge-b@example.test");
    await storage.recoverOwners();
  });
  afterEach(async () => {
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function readSeed(
    count: number,
    state: "queued" | "succeeded",
    at = now,
  ) {
    const note = (
      await saveNote(c, token, {
        title: "read fixture",
        html: "<p>retained</p>",
      })
    ).note;
    const owner = await c.unitOfWorkProvider.run(
      async (x) => (await x.notes.findById(note.id))?.owner,
    );
    if (owner?.kind !== "personal") throw Error("fixture owner");
    const values = Array.from({ length: count }, () => ({
      id: c.idGenerator.next(),
      noteId: c.idGenerator.next(),
      accountId: owner.accountId,
      operationId: c.idGenerator.next(),
      title: "page fixture",
      cause: "manual" as const,
      state,
      createdAt: at,
      updatedAt: at,
      nextAttemptAt: at,
      leaseToken: null,
      leaseUntil: null,
      completed: 0,
      total: 0,
      failure: null,
    }));
    for (let i = 0; i < values.length; i += 40)
      await base.db.insert(notePurges).values(values.slice(i, i + 40));
    return values;
  }
  it("keeps a real old failed request reachable before 100 newer successes and permits its manual recovery", async () => {
    const note = (
      await saveNote(c, token, { title: "old failed", html: "<p>source</p>" })
    ).note;
    const receipt = await trash(note.id, note.version);
    const p = await requestNotePurge(c, token, receipt);
    await c.unitOfWorkProvider.run(async (x) => {
      await x.purges.claim(now, "read-lease", new Date(now.getTime() + 60000));
      await x.purges.defer(p.id, "read-lease", now, "test storage failure");
    });
    await readSeed(100, "succeeded", new Date(now.getTime() + 1));
    const page = await readPurgePage(c, token);
    expect(page.items.map((p) => p.id)).toEqual([p.id]);
    expect(page.summary).toMatchObject({ unfinished: 1, active: 0, failed: 1 });
    expect((await readPurgePage(c, other)).items).toEqual([]);
    const history = await readPurgePage(c, token, { scope: "completed" });
    expect(history.items).toHaveLength(50);
    expect(history.nextCursor).not.toBeNull();
    await retryNotePurge(c, token, p);
    await sweepNotePurges(c);
    const after = await readPurgePage(c, token, {
      watch: [p.id],
      requests: [{ noteId: note.id, operationId: receipt.operationId }],
    });
    expect(after.items).toEqual([]);
    expect(after.summary.unfinished).toBe(0);
    expect(after.observed).toEqual([
      expect.objectContaining({ id: p.id, state: "succeeded" }),
    ]);
    expect(after.requests[0]?.purge?.id).toBe(p.id);
  });
  it("pages all 101 same-time unfinished rows by immutable createdAt and id, separately from successful history", async () => {
    const rows = await readSeed(101, "queued");
    await readSeed(101, "succeeded");
    for (const scope of ["unfinished", "completed"] as const) {
      let cursor: { at: string; id: string } | undefined;
      const ids: string[] = [];
      for (let n = 0; n < 3; n++) {
        const result = await readPurgePage(c, token, { scope, cursor });
        expect(result.items.length).toBe(n === 2 ? 1 : 50);
        expect(result.summary.active).toBe(101);
        ids.push(...result.items.map((p) => p.id));
        cursor = result.nextCursor ?? undefined;
      }
      expect(cursor).toBeUndefined();
      expect(new Set(ids).size).toBe(101);
      if (scope === "unfinished")
        expect(ids).toEqual(
          rows
            .map((p) => p.id)
            .sort()
            .reverse(),
        );
    }
  });
  it("observes only the same owner and exact receipt generation and separates old unfinished from the 90 day success cutoff", async () => {
    const old = new Date(now.getTime() - 91 * 86400000);
    const [pending] = await readSeed(1, "queued", old);
    const [expired] = await readSeed(1, "succeeded", old);
    const [boundary] = await readSeed(
      1,
      "succeeded",
      new Date(now.getTime() - 90 * 86400000),
    );
    if (!pending || !expired || !boundary) throw Error("fixture");
    const request = {
      noteId: pending.noteId,
      operationId: pending.operationId,
    };
    const page = await readPurgePage(c, token, {
      watch: [pending.id, expired.id, boundary.id, pending.id],
      requests: [request, { ...request, operationId: c.idGenerator.next() }],
    });
    expect(page.items.map((p) => p.id)).toEqual([pending.id]);
    expect(page.observed.map((p) => p.id).sort()).toEqual(
      [pending.id, boundary.id].sort(),
    );
    expect(page.requests.map((r) => r.purge?.id ?? null)).toEqual([
      pending.id,
      null,
    ]);
    expect(
      (await readPurgePage(c, token, { scope: "completed" })).items.map(
        (p) => p.id,
      ),
    ).toEqual([boundary.id]);
    const denied = await readPurgePage(c, other, {
      watch: [pending.id],
      requests: [request],
    });
    expect(denied.observed).toEqual([]);
    expect(denied.requests[0]?.purge).toBeNull();
    expect(denied.summary.unfinished).toBe(0);
  });
  it("recovers a durable writer only after its actual child process crashes, then reclaims its published object", async () => {
    const note = await saveNote(c, token, {
      title: "crash",
      html: "<p>kept</p>",
    });
    const draft = await createMediaDraft(c, token, note.note.id);
    const upload = await beginMediaUpload(c, token, {
      draftId: draft.id,
      name: "crash.png",
      bytes: 4,
    });
    const root = path.join(dir, "crashed-runtime");
    const dbFile = (await base.client.execute("pragma database_list")).rows[0]
      ?.file;
    if (typeof dbFile !== "string") throw Error("missing fixture DB");
    const core = path.resolve(import.meta.dirname, "../../..");
    const loader = path.resolve(
      import.meta.dirname,
      "../../../../../../apps/web/node_modules/tsx/dist/esm/index.mjs",
    );
    const script = `
      import {createLibsqlClient,getDatabase} from ${JSON.stringify(`${core}/adapters/libsql/client.ts`)};
      import {LibsqlHollowUnitOfWorkProvider} from ${JSON.stringify(`${core}/adapters/libsql/hollowUnitOfWork.ts`)};
      import {CoordinatedObjectStorage} from ${JSON.stringify(`${core}/adapters/node/coordinatedObjectStorage.ts`)};
      const client=createLibsqlClient({url:${JSON.stringify(`file:${dbFile}`)}});
      const storage=new CoordinatedObjectStorage(${JSON.stringify(root)},new LibsqlHollowUnitOfWorkProvider(getDatabase(client)),{now:()=>new Date(${JSON.stringify(now.toISOString())})});
      await storage.withOwner({kind:'media-upload',id:${JSON.stringify(upload.uploadId)}},async()=>{
        await storage.put(${JSON.stringify(`${upload.uploadId}_source`)},new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3,4]));c.close()}}),4);
        process.send({ready:true}); await new Promise(()=>{});
      });`;
    const child = spawn(
      process.execPath,
      ["--import", loader, "--input-type=module", "-e", script],
      { stdio: ["ignore", "ignore", "pipe", "ipc"] },
    );
    let diagnostic = "";
    child.stderr?.on("data", (bytes) => {
      diagnostic += String(bytes);
    });
    const exited = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(Error("child startup timeout")),
          5000,
        );
        child.once("message", () => {
          clearTimeout(timeout);
          resolve();
        });
        child.once("exit", () => {
          clearTimeout(timeout);
          reject(Error(diagnostic || "child exited"));
        });
      });
      await requestNotePurge(
        c,
        token,
        await trash(note.note.id, note.note.version),
      );
      expect(
        (
          await base.client.execute(
            "select count(*) n from object_writes where active=1",
          )
        ).rows[0]?.n,
      ).toBe(1);
      expect(
        await readFile(path.join(root, `${upload.uploadId}_source`)),
      ).toEqual(Buffer.from([1, 2, 3, 4]));
      child.kill("SIGKILL");
      await exited;
      expect(
        (
          await base.client.execute(
            "select count(*) n from object_writes where active=1",
          )
        ).rows[0]?.n,
      ).toBe(1);
      const recovered = new CoordinatedObjectStorage(
        root,
        c.unitOfWorkProvider,
        c.clock,
      );
      await recovered.recoverOwners();
      if (!c.importing) throw Error("missing fixture import context");
      c = { ...c, importing: { ...c.importing, storage: recovered } };
      await sweepNotePurges(c);
      expect((await listNotePurges(c, token)).items[0]?.state).toBe(
        "succeeded",
      );
      expect((await listImports(c, token)).usedBytes).toBe(0);
      await expect(
        readFile(path.join(root, `${upload.uploadId}_source`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
      await exited;
    }
  });
  const create = async () =>
    (
      await saveNote(c, token, {
        title: "削除専用",
        html: "<p>saved</p>",
        importReferences: false,
      })
    ).note;
  const trash = async (id: string, version: number) =>
    trashNote(c, token, { id, version, cancelProcessing: true });
  async function upload(noteId?: string) {
    const bytes = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const draft = await createMediaDraft(c, token, noteId);
    const r = await beginMediaUpload(c, token, {
      draftId: draft.id,
      name: "image.png",
      bytes: bytes.length,
    });
    const result = await acceptMediaUpload(c, token, r.uploadId, stream(bytes));
    return { ...result, draft, bytes };
  }
  async function convertNext() {
    const job = await c.unitOfWorkProvider.run((x) =>
      x.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 60_000)),
    );
    if (!job) throw new Error("expected queued conversion");
    await runImportJob(c, job);
    return job;
  }
  it("moves only the deleted batch child to a minimal snapshot while siblings and shared companions remain live", async () => {
    const a = new TextEncoder().encode("<p>first</p>");
    const b = new TextEncoder().encode("<p>second</p>");
    const css = new TextEncoder().encode("p { color: blue }");
    const batch = await beginUpload(c, token, {
      useAi: false,
      importReferences: false,
      files: [
        { name: "first.html", bytes: a.length },
        { name: "second.html", bytes: b.length },
        { name: "shared.css", bytes: css.length, role: "companion" },
      ],
    });
    const first = await acceptUpload(c, token, batch.files[0]!.id, stream(a));
    const second = await acceptUpload(c, token, batch.files[1]!.id, stream(b));
    await acceptUpload(c, token, batch.files[2]!.id, stream(css));
    const job = await convertNext();
    const deletedId = job.noteId;
    const deleted = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(deletedId),
    );
    if (!deleted) throw new Error("missing note");
    const receipt = await trash(deleted.id, deleted.version);
    await requestNotePurge(c, token, receipt);
    await sweepNotePurges(c);
    const partial = (await listImports(c, token)).batches.find(
      (x) => x.id === batch.batchId,
    )!;
    expect(partial.jobs).toHaveLength(2);
    expect(new Set(partial.jobs.map((x) => x.id)).size).toBe(2);
    expect(partial.jobs.find((x) => x.id === job.id)).toMatchObject({
      state: "succeeded",
      targetDeleted: true,
      targetAvailable: false,
      createdAt: job.createdAt.toISOString(),
    });
    expect(partial.active).toBe(true);
    expect((await listImports(c, other)).batches).toEqual([]);
    await expect(retryImport(c, token, job.id)).rejects.toMatchObject({
      code: "JOB_NOT_FOUND",
    });
    expect((await storage.read(batch.files[2]!.id)).length).toBe(css.length);
    await convertNext();
    const complete = (await listImports(c, token)).batches.find(
      (x) => x.id === batch.batchId,
    )!;
    expect(complete.active).toBe(false);
    expect(complete.jobs.map((x) => x.state)).toEqual([
      "succeeded",
      "succeeded",
    ]);
    expect(complete.jobs.map((x) => x.id)).toEqual(
      partial.jobs.map((x) => x.id),
    );
    const liveId = first.noteId === deletedId ? second.noteId : first.noteId;
    const live = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(liveId!),
    );
    if (!live) throw new Error("sibling lost");
    await requestNotePurge(c, token, await trash(live.id, live.version));
    await sweepNotePurges(c);
    await expect(storage.stat(batch.files[2]!.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
    const final = (await listImports(c, token)).batches.find(
      (x) => x.id === batch.batchId,
    )!;
    expect(final.jobs).toHaveLength(2);
    expect(final.jobs.every((x) => x.targetDeleted)).toBe(true);
    expect((await listImports(c, token)).usedBytes).toBe(0);
    const snapshots = await c.unitOfWorkProvider.run((x) =>
      x.purges.snapshots(job.accountId, new Date(0)),
    );
    expect(snapshots).toHaveLength(2);
    expect(Object.keys(snapshots[0]!).sort()).toEqual(
      [
        "id",
        "kind",
        "accountId",
        "batchId",
        "retryOf",
        "name",
        "state",
        "failure",
        "attempt",
        "completed",
        "total",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    await c.unitOfWorkProvider.run((x) =>
      x.purges.prune(new Date(now.getTime() + 90 * 86400_000 + 1)),
    );
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.snapshots(job.accountId, new Date(0)),
      ),
    ).toEqual([]);
  });
  it("shares deletion claims across DI clients and rejects stale purge lease and deletion tokens", async () => {
    const note = await create();
    const a = await upload(note.id);
    const receipt = await trash(note.id, note.version);
    const p = await requestNotePurge(c, token, receipt);
    const first = await c.unitOfWorkProvider.run((x) =>
      x.purges.claim(now, "one", new Date(now.getTime() + 1000)),
    );
    expect(first?.id).toBe(p.id);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.claim(now, "two", new Date(now.getTime() + 1000)),
      ),
    ).toBeNull();
    now = new Date(now.getTime() + 1001);
    const second = await c.unitOfWorkProvider.run((x) =>
      x.purges.claim(now, "two", new Date(now.getTime() + 60_000)),
    );
    expect(second?.id).toBe(p.id);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.readyToDelete(p.id, "one", `${a.asset.id}_source`, now),
      ),
    ).toBe(false);
    const otherStorage = new CoordinatedObjectStorage(
      dir,
      c.unitOfWorkProvider,
      c.clock,
    );
    await otherStorage.recoverOwners();
    const key = `${a.asset.id}_source`;
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.objectOperations.claimDelete(
          key,
          "held",
          null,
          now,
          new Date(now.getTime() + 60_000),
        ),
      ),
    ).toBe(true);
    await expect(otherStorage.removeClaimed(key)).rejects.toMatchObject({
      code: "OBJECT_BUSY",
    });
    await c.unitOfWorkProvider.run((x) =>
      x.objectOperations.releaseDelete(key, "held"),
    );
    const deleted = await otherStorage.removeClaimed(key);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.completeObject(p.id, "one", key, deleted.token, now),
      ),
    ).toBe(false);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.completeObject(p.id, "two", key, "wrong", now),
      ),
    ).toBe(false);
    expect((await listImports(c, token)).usedBytes).toBe(a.bytes.length);
    expect(
      await c.unitOfWorkProvider.run((x) =>
        x.purges.completeObject(p.id, "two", key, deleted.token, now),
      ),
    ).toBe(true);
    expect(
      await c.unitOfWorkProvider.run((x) => x.purges.finish(p.id, "two", now)),
    ).toBe(true);
    expect((await listImports(c, token)).usedBytes).toBe(0);
  });
  it("captures history-only/unreferenced/bound assets, removes all revisions, preserves unrelated notes and drafts", async () => {
    const note = await create();
    const media = await upload(note.id);
    const spare = await upload(note.id);
    const unrelated = await upload();
    const otherNote = await create();
    let saved = (
      await saveNote(c, token, {
        id: note.id,
        title: note.title,
        html: `<img src="${media.asset.url}" alt="保存">`,
        draftId: media.draft.id,
        importReferences: false,
      })
    ).note;
    saved = (
      await saveNote(c, token, {
        id: note.id,
        title: note.title,
        html: "<p>current</p>",
        importReferences: false,
      })
    ).note;
    const before = (await listImports(c, token)).usedBytes;
    const receipt = await trash(note.id, saved.version);
    const p = await requestNotePurge(c, token, receipt);
    expect(await requestNotePurge(c, token, receipt)).toEqual(p);
    await expect(requestNotePurge(c, other, receipt)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    await expect(restoreNote(c, token, receipt)).rejects.toMatchObject({
      code: "TRASH_CHANGED",
    });
    expect((await listImports(c, token)).usedBytes).toBe(before);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]).toMatchObject({
      id: p.id,
      state: "succeeded",
      total: 2,
      completed: 2,
    });
    expect(
      await c.unitOfWorkProvider.run((x) => x.notes.findById(note.id)),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((x) => x.revisions.list(note.id)),
    ).toEqual([]);
    expect(
      await c.unitOfWorkProvider.run((x) => x.notes.findById(otherNote.id)),
    ).not.toBeNull();
    for (const id of [media.asset.id, spare.asset.id])
      await expect(storage.stat(`${id}_source`)).rejects.toMatchObject({
        code: "ENOENT",
      });
    expect((await storage.stat(`${unrelated.asset.id}_source`)).bytes).toBe(
      unrelated.bytes.length,
    );
    expect((await listImports(c, token)).usedBytes).toBe(
      unrelated.bytes.length,
    );
    expect((await listNotePurges(c, other)).items).toEqual([]);
  });
  it("keeps a last companion while sibling acceptance is pending and does not delete it when the sibling becomes a note", async () => {
    const body = new TextEncoder().encode("<p>source</p>");
    const css = new TextEncoder().encode("p {color:blue}");
    const batch = await beginUpload(c, token, {
      useAi: false,
      importReferences: false,
      files: [
        { name: "one.html", bytes: body.length },
        { name: "two.html", bytes: body.length },
        { name: "shared.css", bytes: css.length, role: "companion" },
      ],
    });
    const [one, two, companion] = batch.files;
    if (!one || !two || !companion) throw new Error("fixture");
    const first = await acceptUpload(c, token, one.id, stream(body));
    await acceptUpload(c, token, companion.id, stream(css));
    await convertNext();
    if (!first.noteId) throw new Error("note");
    const note = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(first.noteId!),
    );
    if (!note) throw new Error("note");
    await requestNotePurge(c, token, await trash(note.id, note.version));
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("queued");
    expect((await storage.stat(companion.id)).bytes).toBe(css.length);
    const later = await acceptUpload(c, token, two.id, stream(body));
    expect(later.noteId).toBeTruthy();
    now = new Date(now.getTime() + 3000);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("succeeded");
    expect((await storage.stat(companion.id)).bytes).toBe(css.length);
    await convertNext();
    expect((await listImports(c, token)).batches[0]?.jobs).toHaveLength(2);
  });
  it("allows a legitimate SVG cleanup/re-put by its own attempt, counts final bytes once and purges the committed asset", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="blue"/></svg>',
    );
    c = {
      ...c,
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: true, reason: null };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
          async fetch(url) {
            return {
              body: stream(svg),
              finalUrl: url,
              contentType: "image/svg+xml",
            };
          },
        },
        wake() {},
      },
    };
    const saved = await saveNote(c, token, {
      title: "SVG",
      html: '<img src="https://example.test/a.svg" alt="blue">',
      importReferences: true,
    });
    const job = await c.unitOfWorkProvider.run((x) =>
      x.references.claim(now, "svg", new Date(now.getTime() + 60_000)),
    );
    if (job?.state !== "running") throw new Error("reference job");
    await runReferenceJob(c, job, new AbortController().signal);
    const entries = await c.unitOfWorkProvider.run((x) =>
      x.references.entries(saved.note.id),
    );
    expect(entries[0]?.state).toBe("acquired");
    const asset = await c.unitOfWorkProvider.run((x) =>
      x.assets.find(entries[0]?.assetId ?? ""),
    );
    if (!asset) throw new Error("asset");
    expect((await storage.stat(asset.storageKey)).bytes).toBe(asset.bytes);
    expect((await listImports(c, token)).usedBytes).toBe(asset.bytes);
    const latest = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(saved.note.id),
    );
    if (!latest) throw new Error("note");
    await requestNotePurge(c, token, await trash(latest.id, latest.version));
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("succeeded");
    expect((await listImports(c, token)).usedBytes).toBe(0);
    await expect(storage.stat(asset.storageKey)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("holds a real streaming put until completion, fences publish, and never treats the first absence as writer completion", async () => {
    const note = await create();
    const draft = await createMediaDraft(c, token, note.id);
    const r = await beginMediaUpload(c, token, {
      draftId: draft.id,
      name: "pending.png",
      bytes: 4,
    });
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const body = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
        value.enqueue(new Uint8Array([1, 2]));
      },
      pull() {
        started();
      },
    });
    const task = storage.withOwner(
      { kind: "media-upload", id: r.uploadId },
      () => storage.put(`${r.uploadId}_source`, body, 4),
    );
    const outcome = task.then(
      () => "published",
      (error) => String(error.code),
    );
    await entered;
    await requestNotePurge(c, token, await trash(note.id, note.version));
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("queued");
    expect((await listImports(c, token)).usedBytes).toBe(4);
    controller?.enqueue(new Uint8Array([3, 4]));
    controller?.close();
    expect(await outcome).toBe("OBJECT_FENCED");
    await expect(storage.stat(`${r.uploadId}_source`)).rejects.toMatchObject({
      code: "ENOENT",
    });
    now = new Date(now.getTime() + 3000);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("succeeded");
    expect((await listImports(c, token)).usedBytes).toBe(0);
  });
  it("retains reference reservation provenance across history pruning, rejects old upsert and cleans after the old attempt ends", async () => {
    const note = await create();
    const owner = await c.unitOfWorkProvider.run((x) =>
      x.notes.findById(note.id),
    );
    if (owner?.owner.kind !== "personal") throw new Error("owner");
    const accountId = owner.owner.accountId;
    const jobId = c.idGenerator.next();
    const object = {
      id: c.idGenerator.next(),
      jobId,
      accountId,
      bytes: 4,
      state: "reserved" as const,
      createdAt: now,
    };
    await c.unitOfWorkProvider.run(async (x) => {
      await x.references.insertJob({
        id: jobId,
        noteId: note.id,
        accountId,
        noteVersion: note.version,
        createdAt: now,
        updatedAt: now,
        attempt: 1,
        retryOf: null,
        total: 1,
        completed: 0,
        cancelRequested: false,
        state: "running",
        leaseToken: "ref",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      });
      await x.references.saveObject(object);
    });
    let ready!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((r) => {
      ready = r;
    });
    const wait = new Promise<void>((r) => {
      release = r;
    });
    const task = storage.withOwner(
      { kind: "reference-job", id: jobId },
      async () => {
        await storage.put(object.id, stream(new Uint8Array([1, 2, 3, 4])), 4);
        ready();
        await wait;
        await expect(
          storage.put(object.id, stream(new Uint8Array([1, 2, 3, 4])), 4),
        ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
        await expect(
          c.unitOfWorkProvider.run((x) =>
            x.references.saveObject({ ...object, state: "written" }),
          ),
        ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      },
    );
    await entered;
    await requestNotePurge(c, token, await trash(note.id, note.version));
    await c.unitOfWorkProvider.run((x) =>
      x.references.pruneJobs(new Date(now.getTime() + 91 * 86400_000)),
    );
    expect(
      await c.unitOfWorkProvider.run((x) => x.references.job(jobId)),
    ).not.toBeNull();
    await sweepNotePurges(c);
    expect((await listImports(c, token)).usedBytes).toBe(4);
    release();
    await task;
    now = new Date(now.getTime() + 3000);
    await sweepNotePurges(c);
    expect((await listImports(c, token)).usedBytes).toBe(0);
    await expect(storage.stat(object.id)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      c.unitOfWorkProvider.run((x) =>
        x.references.saveObject({ ...object, state: "written" }),
      ),
    ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
    const snapshots = await c.unitOfWorkProvider.run((x) =>
      x.purges.snapshots(accountId, new Date(0)),
    );
    expect(snapshots[0]).toMatchObject({
      id: jobId,
      state: "cancelled",
      failure: null,
    });
    expect(
      await c.unitOfWorkProvider.run((x) => x.references.objects(jobId)),
    ).toEqual([]);
  });
  it("retains quota on removal failure and retries the same irreversible intent", async () => {
    const note = await create();
    const a = await upload(note.id);
    const receipt = await trash(note.id, note.version);
    const p = await requestNotePurge(c, token, receipt);
    const remove = storage.removeClaimed.bind(storage);
    let fail = true;
    storage.removeClaimed = async (key) => {
      if (fail) throw Error("storage unavailable");
      return remove(key);
    };
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("failed");
    expect((await listImports(c, token)).usedBytes).toBe(a.bytes.length);
    await expect(restoreNote(c, token, receipt)).rejects.toMatchObject({
      code: "TRASH_CHANGED",
    });
    fail = false;
    await retryNotePurge(c, token, p);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("succeeded");
    expect((await listImports(c, token)).usedBytes).toBe(0);
  });
  it("does not let a failed first intent starve a later note and boot sweep requires no wake event", async () => {
    const first = await create();
    const a = await upload(first.id);
    const second = await create();
    await requestNotePurge(c, token, await trash(first.id, first.version));
    now = new Date(now.getTime() + 1);
    await requestNotePurge(c, token, await trash(second.id, second.version));
    const remove = storage.removeClaimed.bind(storage);
    storage.removeClaimed = async (key) => {
      if (key === `${a.asset.id}_source`)
        throw new Error("test-only removal failure");
      return remove(key);
    };
    await sweepNotePurges(c);
    expect(
      (await listNotePurges(c, token)).items.find((x) => x.noteId === first.id)
        ?.state,
    ).toBe("failed");
    await sweepNotePurges(c);
    expect(
      (await listNotePurges(c, token)).items.find((x) => x.noteId === second.id)
        ?.state,
    ).toBe("succeeded");
    expect((await listImports(c, token)).usedBytes).toBe(a.bytes.length);
    storage.removeClaimed = remove;
    now = new Date(now.getTime() + 30_000);
    await sweepNotePurges(c);
    expect((await listImports(c, token)).usedBytes).toBe(0);
  });
  it("closes restore at the exact deadline and performs session-free sweep", async () => {
    const n = await create();
    const r = await trash(n.id, n.version);
    now = new Date(r.purgeAfter);
    token = (
      await signIn(c, {
        email: "purge-a@example.test",
        password: "test-password-1234",
      })
    ).token;
    await expect(restoreNote(c, token, r)).rejects.toMatchObject({
      code: "TRASH_EXPIRED",
    });
    await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((x) => x.purges.forNote(n.id)),
    ).toMatchObject({ state: "succeeded", cause: "expired", accountId: null });
    expect((await listNotePurges(c, token)).items).toEqual([]);
  });
  it("does not release a pending writer on absence or cancellation; rejects its second put and converges after finally", async () => {
    const n = await create();
    const draft = await createMediaDraft(c, token, n.id);
    const r = await beginMediaUpload(c, token, {
      draftId: draft.id,
      name: "pending.png",
      bytes: 4,
    });
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const task = storage.withOwner(
      { kind: "media-upload", id: r.uploadId },
      async () => {
        entered();
        await wait;
        await expect(
          storage.put(`${r.uploadId}_safe`, stream(new Uint8Array(4)), 4),
        ).rejects.toMatchObject({ code: "OBJECT_FENCED" });
      },
    );
    await started;
    const t = await trash(n.id, n.version);
    const p = await requestNotePurge(c, token, t);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]?.state).toBe("queued");
    expect((await listImports(c, token)).usedBytes).toBe(4);
    release();
    await task;
    now = new Date(now.getTime() + 3000);
    await sweepNotePurges(c);
    expect((await listNotePurges(c, token)).items[0]).toMatchObject({
      id: p.id,
      state: "succeeded",
    });
    expect((await listImports(c, token)).usedBytes).toBe(0);
  });
});

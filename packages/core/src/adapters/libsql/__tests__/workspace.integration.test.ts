import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import { getAsset } from "@repo/core/application/asset/access";
import { renderNote } from "@repo/core/application/asset/references";
import {
  acceptMediaUpload,
  beginMediaUpload,
  createMediaDraft,
} from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  cancelImport,
  reimportNote,
  retryImport,
} from "@repo/core/application/import/controlJobs";
import { commitImportResult } from "@repo/core/application/import/processJob";
import {
  listImports,
  requireOriginal,
} from "@repo/core/application/import/readImports";
import {
  confirmEmptyTrash,
  prepareEmptyTrash,
  sweepEmptyTrash,
} from "@repo/core/application/note/emptyTrash";
import { getNote } from "@repo/core/application/note/getNote";
import { listRevisions } from "@repo/core/application/note/history";
import {
  beginNotePurge,
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import {
  listTrash,
  restoreNote,
  trashNote,
} from "@repo/core/application/note/trash";
import { runReferenceJob } from "@repo/core/application/reference/processJob";
import { readReferences } from "@repo/core/application/reference/read";
import {
  checkWorkspaceSlug,
  createWorkspace,
  getScopeUsage,
  listScopedNotes,
  listWorkspaces,
} from "@repo/core/application/workspace/usecases";
import {
  capacityLimit,
  workspaceFields,
  workspaceSlug,
} from "@repo/core/domain/workspace/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinatedObjectStorage } from "../../node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "../../node/import/documentExtractor";
import { IsolatedMediaValidator } from "../../node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "../../node/inlineMediaProcessor";
import { NodeReferenceProcessor } from "../../node/reference/referenceProcessor";
import { createTestContainer, type TestContainer } from "./helpers";

const stream = (s: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(s);
      c.close();
    },
  });
describe("workspace scope, actor policy and capacity", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let now: Date;
  let a: { id: string; token: string };
  let b: { id: string; token: string };
  let w: string;
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-workspace-test-"));
    now = new Date("2026-09-10T07:00:00Z");
    const mails: string[] = [];
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    const storage = new CoordinatedObjectStorage(
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
    await storage.recoverOwners();
    async function user(email: string) {
      const r = await signUp(c, {
        email,
        password: "test-password-1234",
        termsAccepted: true,
      });
      const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
      if (!link) throw Error("mail");
      const s = await verifyEmail(
        c,
        new URL(link).searchParams.get("token") ?? "",
        r.browserToken,
      );
      if (!s) throw Error("session");
      return { id: s.user.id, token: s.token };
    }
    a = await user("workspace-a@example.test");
    b = await user("workspace-b@example.test");
    w = (
      await createWorkspace(c, a.token, {
        name: " W 日本語 ",
        description: " 非公開 ",
        slug: "workspace-one",
      })
    ).id;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const member = (role: "owner" | "editor" | "viewer" | null) =>
    c.unitOfWorkProvider.run((x) => x.workspaces.membership(w, b.id, role));
  const note = (workspaceId = w, html = "<p>本文</p>") =>
    saveNote(c, a.token, { title: "same", html, workspaceId });
  async function imported(workspaceId = w) {
    const bytes = new TextEncoder().encode("<p>import source</p>");
    const batch = await beginUpload(c, a.token, {
      workspaceId,
      useAi: false,
      files: [{ name: "source.html", bytes: bytes.length }],
    });
    const upload = batch.files[0];
    if (!upload) throw Error("upload");
    const result = await acceptUpload(c, a.token, upload.id, stream(bytes));
    if (!result.noteId || !result.jobId) throw Error("note");
    return { batch, result: { noteId: result.noteId, jobId: result.jobId } };
  }
  it("creates an owner scope, validates codepoints/slugs and enforces concurrent creator limits", async () => {
    const listed = await listWorkspaces(c, a.token);
    expect(listed.items[0]).toMatchObject({
      id: w,
      name: "W 日本語",
      description: "非公開",
      role: "owner",
    });
    expect((await listWorkspaces(c, b.token)).items).toEqual([]);
    expect(
      workspaceFields({
        name: "😀".repeat(100),
        description: "字".repeat(2000),
      }).name.length,
    ).toBe(200);
    expect(() =>
      workspaceFields({ name: "😀".repeat(101), description: "" }),
    ).toThrow();
    for (const slug of [
      "ab",
      "a".repeat(64),
      "-abc",
      "abc-",
      "日本語",
      "admin",
    ])
      expect(() => workspaceSlug(slug)).toThrow();
    expect(workspaceSlug("admin-tools")).toBe("admin-tools");
    const occupied = await checkWorkspaceSlug(c, a.token, {
      slug: "workspace-one",
    });
    expect(occupied.available).toBe(false);
    expect(occupied.suggestions).toHaveLength(3);
    const raced = await Promise.allSettled(
      [1, 2].map(() =>
        createWorkspace(c, a.token, {
          name: "race",
          description: "",
          slug: "race-slug",
        }),
      ),
    );
    expect(raced.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (let i = 0; i < 17; i++)
      await createWorkspace(c, a.token, {
        name: `limit ${i}`,
        description: "",
      });
    const limit = await Promise.allSettled(
      [1, 2].map(() =>
        createWorkspace(c, a.token, { name: "last", description: "" }),
      ),
    );
    expect(limit.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await listWorkspaces(c, a.token)).items).toHaveLength(20);
  });
  it("pages 51 equal timestamps by scope without leaking titles or accepting foreign cursors", async () => {
    await c.unitOfWorkProvider.run(async (x) => {
      for (let i = 0; i < 51; i++)
        await x.notes.insert({
          id: c.idGenerator.next(),
          owner: { kind: "workspace", workspaceId: w },
          creator: { kind: "account", accountId: a.id },
          lifecycle: { kind: "active" },
          title: `same-${i}`,
          html: "",
          visibility: "private",
          status: "ready",
          version: 0,
          createdAt: now,
          updatedAt: now,
          display: {
            style: "default",
            source: "automatic",
            initialization: { kind: "complete", reason: "blank" },
          },
        });
    });
    await saveNote(c, a.token, { title: "personal", html: "<p>personal</p>" });
    const first = await listScopedNotes(c, a.token, { workspaceId: w });
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();
    const second = await listScopedNotes(c, a.token, {
      workspaceId: w,
      cursor: first.nextCursor ?? "",
    });
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map((n) => n.id)).size,
    ).toBe(51);
    expect(
      (await listScopedNotes(c, a.token)).items.map((n) => n.title),
    ).toEqual(["personal"]);
    await expect(
      listScopedNotes(c, a.token, { cursor: first.nextCursor ?? "" }),
    ).rejects.toThrow();
    await expect(
      listScopedNotes(c, b.token, { workspaceId: w }),
    ).rejects.toThrow();
  });
  it("separates viewer reads, current editor writes, exact actor confirmation and revoked recovery", async () => {
    const saved = await note();
    await expect(getNote(c, b.token, saved.note.id)).rejects.toThrow();
    await member("viewer");
    expect((await getNote(c, b.token, saved.note.id)).scope?.canEdit).toBe(
      false,
    );
    await expect(
      saveNote(c, b.token, { id: saved.note.id, title: "x", html: "<p>x</p>" }),
    ).rejects.toThrow();
    await expect(
      setDisplayStyle(c, b.token, { id: saved.note.id, style: "original" }),
    ).rejects.toThrow();
    await expect(
      listTrash(c, b.token, undefined, { workspaceId: w }),
    ).rejects.toThrow();
    await member("editor");
    const edited = await saveNote(c, b.token, {
      id: saved.note.id,
      version: saved.note.version,
      title: "editor",
      html: "<p>edit</p>",
    });
    expect(edited.note.creator).toEqual({ kind: "account", accountId: a.id });
    await expect(
      saveNote(c, a.token, {
        id: saved.note.id,
        version: saved.note.version,
        title: "old",
        html: "<p>old</p>",
      }),
    ).rejects.toThrow();
    const confirmed = await saveNote(c, a.token, {
      id: saved.note.id,
      version: saved.note.version,
      confirmedVersion: edited.note.version,
      title: "confirm",
      html: "<p>confirm</p>",
    });
    await saveNote(c, b.token, {
      id: saved.note.id,
      title: "later",
      html: "<p>later</p>",
    });
    await expect(
      saveNote(c, a.token, {
        id: saved.note.id,
        version: saved.note.version,
        confirmedVersion: confirmed.note.version,
        title: "stale",
        html: "<p>stale</p>",
      }),
    ).rejects.toThrow();
    await member(null);
    await expect(getNote(c, b.token, saved.note.id)).rejects.toThrow();
    expect((await getNote(c, a.token, saved.note.id)).title).toBe("later");
  });
  it.each([
    "viewer",
    null,
  ] as const)("rejects further saves after an editor becomes %s without changing the current note or twenty retained revisions", async (role) => {
    await member("editor");
    let saved = (await note()).note;
    for (let index = 1; index < 20; index++) {
      saved = (
        await saveNote(c, b.token, {
          id: saved.id,
          version: saved.version,
          title: `保存済み ${index}`,
          html: `<p>保存済み ${index}</p>`,
          cause: "autosave",
        })
      ).note;
    }
    expect((await getNote(c, b.token, saved.id)).scope?.canEdit).toBe(true);
    const before = await getNote(c, a.token, saved.id);
    const history = await listRevisions(c, a.token, saved.id);
    expect(history.items).toHaveLength(20);
    const snapshot = () =>
      c.unitOfWorkProvider.run(async (context) => ({
        note: await context.notes.findById(saved.id),
        head: await context.revisions.head(saved.id),
        revisions: await context.revisions.list(saved.id),
      }));
    const retained = await snapshot();
    const unsaved = {
      id: saved.id,
      version: saved.version,
      confirmedVersion: saved.version,
      title: "権限喪失後の未保存タイトル",
      html: '<p class="latest" data-local="retained">未保存の日本語😀</p>',
    };

    await member(role);
    for (const cause of ["autosave", "manual"] as const) {
      await expect(
        saveNote(c, b.token, { ...unsaved, cause }),
      ).rejects.toMatchObject({
        code: "NOTE_NOT_FOUND",
        message: expect.stringContaining("ダウンロード"),
      });
      expect(await getNote(c, a.token, saved.id)).toEqual(before);
      expect(await listRevisions(c, a.token, saved.id)).toEqual(history);
      expect(await snapshot()).toEqual(retained);
    }
    if (role === "viewer") {
      const readable = await getNote(c, b.token, saved.id);
      expect(readable.html).toBe(saved.html);
      expect(readable.scope?.canEdit).toBe(false);
      expect(await listRevisions(c, b.token, saved.id)).toEqual(history);
    } else {
      await expect(getNote(c, b.token, saved.id)).rejects.toMatchObject({
        code: "NOTE_NOT_FOUND",
      });
      await expect(listRevisions(c, b.token, saved.id)).rejects.toMatchObject({
        code: "NOTE_NOT_FOUND",
      });
    }
  });
  it("captures import scope, preserves creator/uploader, and reimports as a different editor's new job", async () => {
    const { batch, result } = await imported();
    await cancelImport(c, a.token, batch.batchId);
    await member("editor");
    const original = await c.unitOfWorkProvider.run((x) =>
      x.imports.findByNote(result.noteId),
    );
    if (!original) throw Error("original");
    expect((await requireOriginal(c, b.token, original.id)).accountId).toBe(
      a.id,
    );
    await member("viewer");
    expect((await requireOriginal(c, b.token, original.id)).id).toBe(
      original.id,
    );
    await member(null);
    await expect(
      requireOriginal(c, b.token, original.id),
    ).rejects.toMatchObject({ code: "ORIGINAL_NOT_FOUND" });
    await member("editor");
    await expect(retryImport(c, b.token, result.jobId)).rejects.toThrow();
    const next = await reimportNote(c, b.token, result.noteId);
    const job = await c.unitOfWorkProvider.run((x) => x.jobs.find(next.jobId));
    expect(job?.accountId).toBe(b.id);
    expect(job?.batchId).not.toBe(batch.batchId);
    expect(
      (await listImports(c, b.token, { workspaceId: w })).batches,
    ).toHaveLength(1);
    expect(
      (await listImports(c, a.token, { workspaceId: w })).batches,
    ).toHaveLength(1);
    expect((await getNote(c, a.token, result.noteId)).creator).toEqual({
      kind: "account",
      accountId: a.id,
    });
    await member(null);
    const claimed = await c.unitOfWorkProvider.run((x) =>
      x.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 60_000)),
    );
    if (!claimed) throw Error("claim");
    expect(
      await commitImportResult(c, claimed, {
        kind: "failed",
        reason: "not applied",
      }),
    ).toBe(false);
    expect(
      (await c.unitOfWorkProvider.run((x) => x.jobs.find(claimed.id)))?.state,
    ).toBe("cancelled");
  });
  it("keeps media draft creator-private while current and exact-history assets follow membership", async () => {
    const saved = await note();
    await member("editor");
    const draft = await createMediaDraft(c, a.token, saved.note.id);
    const png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    const upload = await beginMediaUpload(c, a.token, {
      draftId: draft.id,
      name: "image.png",
      bytes: png.length,
    });
    const accepted = await acceptMediaUpload(
      c,
      a.token,
      upload.uploadId,
      stream(png),
    );
    await expect(
      getAsset(c, b.token, {
        scope: "drafts",
        scopeId: draft.id,
        assetId: accepted.asset.id,
      }),
    ).rejects.toThrow();
    const added = await saveNote(c, a.token, {
      id: saved.note.id,
      draftId: draft.id,
      title: saved.note.title,
      html: `<img src="${accepted.asset.url}" alt="image">`,
    });
    const ref = {
      scope: "notes" as const,
      scopeId: saved.note.id,
      assetId: accepted.asset.id,
    };
    expect((await getAsset(c, b.token, ref)).id).toBe(accepted.asset.id);
    expect(
      (
        await renderNote(c, b.token, {
          noteId: saved.note.id,
          html: added.note.html,
        })
      ).html,
    ).toContain(accepted.asset.id);
    const revisions = await listRevisions(c, b.token, saved.note.id);
    const historical = {
      ...ref,
      scope: "history" as const,
      revisionNo: revisions.currentRevisionNo,
    };
    await saveNote(c, a.token, {
      id: saved.note.id,
      title: saved.note.title,
      html: "<p>removed</p>",
    });
    await expect(getAsset(c, b.token, ref)).rejects.toThrow();
    expect((await getAsset(c, b.token, historical)).id).toBe(accepted.asset.id);
    await member("viewer");
    expect((await getAsset(c, b.token, historical)).id).toBe(accepted.asset.id);
    await member(null);
    await expect(getAsset(c, b.token, ref)).rejects.toThrow();
    await expect(getAsset(c, b.token, historical)).rejects.toThrow();
  });
  it("does not bind an unbound draft into another capacity scope, or authorize an old purge after role loss", async () => {
    const saved = await note();
    const draft = await createMediaDraft(c, a.token);
    await expect(
      saveNote(c, a.token, {
        id: saved.note.id,
        draftId: draft.id,
        title: "wrong scope",
        html: "<p>changed</p>",
      }),
    ).rejects.toThrow();
    expect((await getNote(c, a.token, saved.note.id)).html).toBe(
      saved.note.html,
    );
    expect(
      (await c.unitOfWorkProvider.run((x) => x.assets.findDraft(draft.id)))
        ?.noteId,
    ).toBeNull();
    await member("editor");
    const removed = await trashNote(c, b.token, {
      id: saved.note.id,
      version: saved.note.version,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, b.token, removed);
    await member(null);
    await expect(requestNotePurge(c, b.token, removed)).rejects.toThrow();
    expect(
      (await c.unitOfWorkProvider.run((x) => x.purges.find(purge.id)))?.state,
    ).toBe("queued");
  });
  it("uses the current editor for reference acquisition and cancels a late revoked result without changing the shared body", async () => {
    const png = await readFile(
      new URL(
        "../../node/import/__tests__/fixtures/media-valid.png",
        import.meta.url,
      ),
    );
    let revoke = false;
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
            if (revoke) await member(null);
            return {
              body: stream(png),
              finalUrl: url,
              contentType: "image/png",
            };
          },
        },
        wake() {},
      },
    };
    const saved = await note();
    await member("editor");
    const first = await saveNote(c, b.token, {
      id: saved.note.id,
      title: "reference",
      html: '<img src="https://fixture.example/one.png">',
      importReferences: true,
    });
    const claim = async () => {
      const job = await c.unitOfWorkProvider.run((x) =>
        x.references.claim(
          now,
          c.tokens.generate(),
          new Date(now.getTime() + 60_000),
        ),
      );
      if (job?.state !== "running") throw Error("reference claim");
      return job;
    };
    const job = await claim();
    expect(job.accountId).toBe(b.id);
    await runReferenceJob(c, job, new AbortController().signal);
    const entry = (
      await readReferences(c, a.token, first.note.id)
    ).entries.find((e) => e.kind === "image");
    expect(entry?.state).toBe("acquired");
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(png.length);
    expect((await getScopeUsage(c, b.token)).usage.usedBytes).toBe(0);
    const later = await saveNote(c, b.token, {
      id: saved.note.id,
      title: "second",
      html: '<img src="https://fixture.example/two.png">',
      importReferences: true,
    });
    revoke = true;
    const late = await claim();
    await runReferenceJob(c, late, new AbortController().signal);
    expect((await getNote(c, a.token, saved.note.id)).html).toBe(
      later.note.html,
    );
    expect(
      (await c.unitOfWorkProvider.run((x) => x.references.job(late.id)))?.state,
    ).toBe("cancelled");
    expect(
      (await c.unitOfWorkProvider.run((x) => x.references.objects(late.id)))
        .length,
    ).toBe(0);
  });
  it("isolates trash/empty and keeps body revisions unchanged, with a system-only expiry initiator", async () => {
    const saved = await note();
    const personal = await saveNote(c, a.token, {
      title: "keep",
      html: "<p>keep</p>",
    });
    const removed = await trashNote(c, a.token, {
      id: saved.note.id,
      version: saved.note.version,
      cancelProcessing: true,
    });
    expect((await listTrash(c, a.token)).items).toHaveLength(0);
    expect(
      (await listTrash(c, a.token, undefined, { workspaceId: w })).items,
    ).toHaveLength(1);
    await restoreNote(c, a.token, removed);
    const restored = await getNote(c, a.token, saved.note.id);
    expect(restored.html).toBe(saved.note.html);
    expect(restored.updatedAt).toBe(saved.note.updatedAt);
    await trashNote(c, a.token, {
      id: saved.note.id,
      version: restored.version,
      cancelProcessing: true,
    });
    const prepared = await prepareEmptyTrash(c, a.token, { workspaceId: w });
    if (prepared.kind !== "prepared") throw Error("prepare");
    expect(prepared.total).toBe(1);
    await confirmEmptyTrash(c, a.token, prepared);
    await sweepEmptyTrash(c);
    await sweepNotePurges(c);
    expect((await getNote(c, a.token, personal.note.id)).title).toBe("keep");
    const due = await note();
    const trashed = await trashNote(c, a.token, {
      id: due.note.id,
      version: due.note.version,
      cancelProcessing: true,
    });
    now = new Date(now.getTime() + 30 * 86400_000);
    await c.unitOfWorkProvider.run((x) =>
      beginNotePurge(c, x, trashed, "expired"),
    );
    const p = await c.unitOfWorkProvider.run((x) =>
      x.purges.forNote(due.note.id),
    );
    expect(p).toMatchObject({
      cause: "expired",
      accountId: null,
      workspaceId: w,
    });
  });
  it("counts accepted scope reservations, rejects races at the scope boundary, and does not charge uploader's personal space", async () => {
    expect(capacityLimit({ kind: "workspace", workspaceId: w })).toBe(
      20 * 1024 ** 3,
    );
    const batch = await beginUpload(c, a.token, {
      workspaceId: w,
      useAi: false,
      files: [{ name: "held.txt", bytes: 100 }],
    });
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(100);
    expect((await getScopeUsage(c, a.token)).usage.usedBytes).toBe(0);
    await base.db.run(
      sql`update upload_reservations set bytes=${20 * 1024 ** 3 - 1} where batch_id=${batch.batchId}`,
    );
    const raced = await Promise.allSettled(
      [1, 2].map(() =>
        beginUpload(c, a.token, {
          workspaceId: w,
          useAi: false,
          files: [{ name: "last.txt", bytes: 1 }],
        }),
      ),
    );
    expect(raced.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(20 * 1024 ** 3);
    await cancelImport(c, a.token, batch.batchId);
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(20 * 1024 ** 3);
  });
  it("charges a companion once per holding scope and retains the final cleanup charge through storage failure", async () => {
    const w2 = (
      await createWorkspace(c, b.token, {
        name: "other owner",
        description: "",
      })
    ).id;
    const css = new TextEncoder().encode("p { color: blue }");
    const body = new TextEncoder().encode("<p>bundle</p>");
    const batch = await beginUpload(c, a.token, {
      workspaceId: w,
      useAi: false,
      importReferences: false,
      files: [
        { name: "first.html", bytes: body.length },
        { name: "second.html", bytes: body.length },
        { name: "style.css", role: "companion", bytes: css.length },
      ],
    });
    const ids: string[] = [];
    for (const file of batch.files) {
      const r = await acceptUpload(
        c,
        a.token,
        file.id,
        stream(file.name.endsWith("css") ? css : body),
      );
      if (r.noteId) ids.push(r.noteId);
    }
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(css.length + body.length * 2);
    const other = await saveNote(c, b.token, {
      workspaceId: w2,
      title: "other",
      html: "<p>other</p>",
    });
    await c.unitOfWorkProvider.run((x) =>
      x.references.saveSettings({
        noteId: other.note.id,
        bundleId: batch.batchId,
        sourcePath: "other.html",
        enabled: false,
        activeJobId: null,
      }),
    );
    expect(
      (await getScopeUsage(c, b.token, { workspaceId: w2 })).usage.usedBytes,
    ).toBe(css.length);
    const deleteNote = async (token: string, id: string) => {
      const n = await getNote(c, token, id);
      const t = await trashNote(c, token, {
        id,
        version: n.version,
        cancelProcessing: true,
      });
      await requestNotePurge(c, token, t);
      await sweepNotePurges(c);
    };
    for (const id of ids) await deleteNote(a.token, id);
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(0);
    expect(
      (await getScopeUsage(c, b.token, { workspaceId: w2 })).usage.usedBytes,
    ).toBe(css.length);
    const storage = c.importing?.storage;
    if (!storage?.removeClaimed) throw Error("storage");
    const failure = vi
      .spyOn(storage, "removeClaimed")
      .mockRejectedValueOnce(Error("self storage failure"));
    await deleteNote(b.token, other.note.id);
    expect(failure).toHaveBeenCalledOnce();
    expect(
      (await getScopeUsage(c, b.token, { workspaceId: w2 })).usage.usedBytes,
    ).toBe(css.length);
    now = new Date(now.getTime() + 31_000);
    await sweepNotePurges(c);
    expect(
      (await getScopeUsage(c, b.token, { workspaceId: w2 })).usage.usedBytes,
    ).toBe(0);
    expect(
      (
        await c.unitOfWorkProvider.run((x) =>
          x.references.companions(batch.batchId),
        )
      ).length,
    ).toBe(0);
  });
  it("retains unbound media reservations and unadopted reference objects in the captured scope after cancellation", async () => {
    const draft = await createMediaDraft(c, a.token, undefined, w);
    await beginMediaUpload(c, a.token, {
      draftId: draft.id,
      name: "held.png",
      bytes: 71,
    });
    const n = await note();
    const jobId = c.idGenerator.next();
    const key = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (x) => {
      await x.references.insertJob({
        id: jobId,
        noteId: n.note.id,
        accountId: a.id,
        noteVersion: n.note.version,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: null,
        total: 1,
        completed: 0,
        cancelRequested: false,
        state: "running",
        leaseToken: "self-reference",
        leaseUntil: new Date(now.getTime() + 60_000),
        failure: null,
      });
      await x.references.saveObject({
        id: key,
        jobId,
        workspaceId: w,
        accountId: a.id,
        bytes: 83,
        state: "written",
        createdAt: now,
      });
      await x.references.finish(jobId, "self-reference", now, "cancelled");
    });
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(154);
    expect((await getScopeUsage(c, a.token)).usage.usedBytes).toBe(0);
    await base.db.run(
      sql`update media_uploads set state='failed',storage_cleaned=0 where draft_id=${draft.id}`,
    );
    now = new Date(now.getTime() + 25 * 3600_000);
    expect(
      (await getScopeUsage(c, a.token, { workspaceId: w })).usage.usedBytes,
    ).toBe(154);
  });
});

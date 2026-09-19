import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import { accounts, sessions } from "@repo/core/adapters/libsql/hollowSchema";
import { workspaceMembers } from "@repo/core/adapters/libsql/workspaceSchema";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { IsolatedExportDocumentWriter } from "@repo/core/adapters/node/exportDocument/writer";
import { NodeExportLifetime } from "@repo/core/adapters/node/exportLifetime";
import { FileExportSourceReader } from "@repo/core/adapters/node/exportSourceReader";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { IsolatedInlineMediaProcessor } from "@repo/core/adapters/node/inlineMediaProcessor";
import { NodeReferenceProcessor } from "@repo/core/adapters/node/reference/referenceProcessor";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  getExportFile,
  prepareExport,
  sweepExports,
} from "@repo/core/application/export/usecases";
import {
  moveNote,
  previewNoteMove,
} from "@repo/core/application/move/usecases";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { trashNote } from "@repo/core/application/note/trash";
import {
  requestWorkspaceDeletion,
  sweepWorkspaceDeletions,
} from "@repo/core/application/workspace/deletion";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { DEFAULT_DOCUMENT_CSS } from "@repo/core/lib/defaultDocumentStyle";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportHttp } from "@/presentation/exportHttp.node";

describe("single current document export flow", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let noteId: string;
  let now: Date;
  const actor = "00000000-0000-4000-8000-000000000001";
  const session = "a".repeat(43);
  const token = "b".repeat(43);
  const browser = "c".repeat(43);
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(os.tmpdir(), "hollow-export-flow-"));
    now = new Date("2026-09-19T14:00:00Z");
    const common = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send() {},
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
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
      inlineMedia: new IsolatedInlineMediaProcessor(),
      referencing: {
        processor: new NodeReferenceProcessor(),
        fetcher: {
          async inspect(url) {
            return { url, allowed: false, reason: "fixture" };
          },
          async inspectMany(urls) {
            return urls.map((url) => ({
              url,
              allowed: false,
              reason: "fixture",
            }));
          },
          async fetch() {
            throw Error("external body fetch forbidden");
          },
        },
        wake() {},
      },
      exporting: {
        writer: new IsolatedExportDocumentWriter(
          path.resolve("apps/web/dist/server/export/document.mjs"),
        ),
        sources: new FileExportSourceReader(dir),
        lifetime: new NodeExportLifetime(),
        diskLimit: 2 * 1024 * 1024 * 1024,
        defaultCss: DEFAULT_DOCUMENT_CSS,
        wake() {},
      },
    };
    await storage.recoverOwners();
    await base.db.insert(accounts).values({
      id: actor,
      email: "export-flow@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400000),
    });
    noteId = (
      await saveNote(c, session, {
        title: "実ファイル / test",
        html: '<h1>現在の本文</h1><p><a href="https://example.test/page">通常リンク</a></p>',
      })
    ).note.id;
  });
  afterEach(async () => {
    await c.exporting?.lifetime.stop();
    await sweepExports(c);
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const access = () => ({ kind: "account" as const, noteId, session });
  async function settle() {
    await c.exporting?.lifetime.stop();
    await c.unitOfWorkProvider.run((u) => u.exports.recover(c.clock.now()));
    await sweepExports(c);
  }
  async function limited(password = false) {
    await base.db.run(
      sql`update note_sharing set visibility='link',version=version+1,link_generation=1,token_hash=${c.tokens.hash(token)},token_envelope='fixture-only',password_hash=${password ? "fixture" : null} where note_id=${noteId}`,
    );
    if (password)
      await c.unitOfWorkProvider.run((u) =>
        u.sharing.saveGrant({
          noteId,
          browserHash: c.tokens.hash(browser),
          linkGeneration: 1,
          grantEpoch: 0,
          verifiedAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        }),
      );
    return { kind: "link" as const, token, browser };
  }
  async function published() {
    await limited();
    const identity = {
      noteId,
      publicId: c.idGenerator.next(),
      urlGeneration: 1,
      accessEpoch: 0,
      createdAt: now,
    };
    await c.unitOfWorkProvider.run((u) => u.publicNotes.create(identity));
    await base.db.run(
      sql`update note_sharing set visibility='public',password_hash=null where note_id=${noteId}`,
    );
    return {
      kind: "public" as const,
      publicId: identity.publicId,
      urlGeneration: 1,
      browser,
    };
  }
  it("public preparation preserves the existing /s nonce and does not allocate an operation or password grant", async () => {
    const pub = await published();
    const url = `http://localhost:3000/s/export-public/${pub.publicId}/1`;
    const existing = await exportHttp(
      new Request(url, {
        headers: { cookie: `hollow_share_browser=${browser}` },
      }),
      c,
    );
    expect(existing?.status).toBe(200);
    expect(existing?.headers.has("set-cookie")).toBe(false);
    expect(await existing?.text()).toContain('value="markdown"');
    const absent = await exportHttp(new Request(url), c);
    expect(absent?.status).toBe(403);
    expect(absent?.headers.has("set-cookie")).toBe(false);
    const native = await exportHttp(
      new Request(url, {
        headers: {
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": "document",
          "sec-fetch-site": "none",
        },
      }),
      c,
    );
    expect(native?.status).toBe(200);
    expect(native?.headers.get("set-cookie")).toContain("Path=/s;");
    const duplicate = await exportHttp(
      new Request(url, {
        headers: {
          cookie: `hollow_share_browser=${browser}; hollow_share_browser=${"d".repeat(43)}`,
        },
      }),
      c,
    );
    expect(duplicate?.status).toBe(403);
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
    expect(
      await base.db.all(sql`select note_id from share_grants`),
    ).toHaveLength(0);
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${noteId}`,
    );
    const revoked = await exportHttp(
      new Request(url, {
        headers: {
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": "document",
          "sec-fetch-site": "none",
        },
      }),
      c,
    );
    expect(revoked?.status).toBe(404);
    expect(revoked?.headers.has("set-cookie")).toBe(false);
  });
  it("public native POST returns one attachment redirect and binds the actually sent nonce", async () => {
    const pub = await published();
    const url = `http://localhost:3000/s/export-public/${pub.publicId}/1`;
    const response = await exportHttp(
      new Request(url, {
        method: "POST",
        headers: {
          cookie: `hollow_share_browser=${browser}`,
          origin: "null",
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": "document",
          "sec-fetch-site": "same-origin",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "format=html",
      }),
      c,
    );
    expect(response?.status).toBe(303);
    const location = response?.headers.get("location");
    if (!location) throw Error("fixture redirect");
    const changed = await exportHttp(
      new Request(`http://localhost:3000${location}`, {
        headers: { cookie: `hollow_share_browser=${"d".repeat(43)}` },
      }),
      c,
    );
    expect(changed?.status).toBe(404);
    const good = await exportHttp(
      new Request(`http://localhost:3000${location}`, {
        headers: { cookie: `hollow_share_browser=${browser}` },
      }),
      c,
    );
    expect(good?.status).toBe(200);
    expect(good?.headers.get("content-disposition")).toContain("attachment;");
    expect(await good?.text()).toContain("現在の本文");
  });
  it("public and link share one fixed browser-note window without authority rebinding", async () => {
    const pub = await published();
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 5; i++)
        expect(
          await u.exports.reserveDownload(noteId, c.tokens.hash(browser), now),
        ).toBeNull();
    });
    const ready = await prepareExport(c, pub, "markdown");
    await expect(
      getExportFile(c, { kind: "link", token, browser }, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
    const file = await getExportFile(c, pub, ready.operationId);
    await new Response(file.body).text();
    await expect(
      prepareExport(c, { kind: "link", token, browser }, "html"),
    ).rejects.toMatchObject({ code: "EXPORT_RATE_LIMIT" });
    await expect(prepareExport(c, pub, "html")).rejects.toMatchObject({
      code: "EXPORT_RATE_LIMIT",
    });
  });
  it("public private/republic invalidates prior access epoch while canonical remains", async () => {
    const pub = await published();
    const ready = await prepareExport(c, pub, "html");
    await base.db.run(
      sql`update note_sharing set visibility='private',version=version+1 where note_id=${noteId}`,
    );
    await c.unitOfWorkProvider.run((u) => u.publicNotes.revoke(noteId, 0));
    await base.db.run(
      sql`update note_sharing set visibility='public',version=version+1 where note_id=${noteId}`,
    );
    await expect(
      getExportFile(c, pub, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)))
        ?.publicId,
    ).toBe(pub.publicId);
  });
  it("an existing six-use link window survives the first public preparation GET", async () => {
    const pub = await published();
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 6; i++)
        expect(
          await u.exports.reserveDownload(noteId, c.tokens.hash(browser), now),
        ).toBeNull();
    });
    const url = `http://localhost:3000/s/export-public/${pub.publicId}/1`;
    const page = await exportHttp(
      new Request(url, {
        headers: { cookie: `hollow_share_browser=${browser}` },
      }),
      c,
    );
    expect(page?.status).toBe(200);
    expect(page?.headers.has("set-cookie")).toBe(false);
    const response = await exportHttp(
      new Request(url, {
        method: "POST",
        headers: {
          cookie: `hollow_share_browser=${browser}`,
          origin: "http://localhost:3000",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "format=html",
      }),
      c,
    );
    expect(response?.status).toBe(429);
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
    expect(c.exporting?.lifetime.ids()).toHaveLength(0);
  });
  it("the final shared browser-note rate slot admits only one parallel public/link operation", async () => {
    const pub = await published();
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 5; i++)
        await u.exports.reserveDownload(noteId, c.tokens.hash(browser), now);
    });
    const variants = [pub, { kind: "link" as const, token, browser }];
    const results = await Promise.allSettled(
      variants.map((v) => prepareExport(c, v, "html")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected")
        expect(result.reason).toMatchObject({ code: "EXPORT_RATE_LIMIT" });
      else {
        const authority = variants[index];
        if (!authority) throw Error("fixture authority");
        const file = await getExportFile(
          c,
          authority,
          result.value.operationId,
        );
        expect(await new Response(file.body).text()).toContain("現在の本文");
      }
    }
  });
  it("public preparation preserves a ready old link operation without rebinding its authority", async () => {
    const pub = await published();
    const link = { kind: "link" as const, token, browser };
    const ready = await prepareExport(c, link, "markdown");
    const page = await exportHttp(
      new Request(`http://localhost:3000/s/export-public/${pub.publicId}/1`, {
        headers: { cookie: `hollow_share_browser=${browser}` },
      }),
      c,
    );
    expect(page?.headers.has("set-cookie")).toBe(false);
    await expect(
      getExportFile(c, pub, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
    const file = await getExportFile(c, link, ready.operationId);
    expect(await new Response(file.body).text()).toContain("現在の本文");
  });
  it("parallel first public nonces bind the submitted cookie only and expire orphaned ready output", async () => {
    const pub = await published();
    const url = `http://localhost:3000/s/export-public/${pub.publicId}/1`;
    const pages = await Promise.all(
      [0, 1].map(() =>
        exportHttp(
          new Request(url, {
            headers: {
              "sec-fetch-mode": "navigate",
              "sec-fetch-dest": "document",
              "sec-fetch-site": "none",
            },
          }),
          c,
        ),
      ),
    );
    const cookies = pages.map(
      (r) => r?.headers.get("set-cookie")?.split(";")[0],
    );
    const [first, second] = cookies;
    if (!first || !second) throw Error("fixture cookies");
    expect(first).not.toBe(second);
    const ready = await exportHttp(
      new Request(url, {
        method: "POST",
        headers: {
          cookie: first,
          origin: "http://localhost:3000",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "format=html",
      }),
      c,
    );
    expect(ready?.status).toBe(303);
    const location = ready?.headers.get("location");
    if (!location) throw Error("fixture location");
    const stale = await exportHttp(
      new Request(`http://localhost:3000${location}`, {
        headers: { cookie: second },
      }),
      c,
    );
    expect(stale?.status).toBe(404);
    expect(stale?.headers.has("location")).toBe(false);
    expect(c.exporting?.lifetime.ids()).toHaveLength(1);
    now = new Date(now.getTime() + 120001);
    await sweepExports(c);
    expect(c.exporting?.lifetime.ids()).toHaveLength(0);
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
  });
  it.each([
    "html",
    "markdown",
  ] as const)("uses the real bundled worker and returns a portable %s file", async (format) => {
    const ready = await prepareExport(c, access(), format);
    const output = await getExportFile(c, access(), ready.operationId);
    const content = await new Response(output.body).text();
    expect(content).toContain("現在の本文");
    expect(content).toContain("https://example.test/page");
    expect(content).not.toContain("data-hollow-link");
    if (ready.notices.length) expect(content).toContain("書き出しについて");
    expect(output.file.bytes).toBe(Buffer.byteLength(content));
    await settle();
    expect(
      (await readdir(dir)).filter((name) => name.startsWith("export-")),
    ).toHaveLength(0);
    expect(
      (await base.db.all(sql`select * from export_operations`)).length,
    ).toBe(0);
  });
  it("rejects another session and changed content without treating the operation ID as authority", async () => {
    const ready = await prepareExport(c, access(), "html");
    await expect(
      getExportFile(c, { ...access(), session: null }, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note) throw Error("fixture");
    await saveNote(c, session, {
      id: noteId,
      version: note.version,
      title: "changed",
      html: "<p>new body</p>",
    });
    await expect(
      getExportFile(c, access(), ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_CHANGED" });
  });
  it("refuses an empty current body before allocating an operation", async () => {
    noteId = (await saveNote(c, session, { title: "empty", html: "" })).note.id;
    await expect(prepareExport(c, access(), "html")).rejects.toMatchObject({
      code: "EXPORT_EMPTY",
    });
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
  });
  it.each([
    "changed",
    "trashed",
  ] as const)("does not adopt output when the current note is %s during generation", async (mutation) => {
    const service = c.exporting;
    if (!service) throw Error("fixture");
    const plan = service.writer.plan.bind(service.writer);
    vi.spyOn(service.writer, "plan").mockImplementationOnce(async (...args) => {
      const output = await plan(...args);
      const note = await c.unitOfWorkProvider.run((u) =>
        u.notes.findById(noteId),
      );
      if (!note) throw Error("fixture");
      if (mutation === "changed")
        await saveNote(c, session, {
          id: noteId,
          version: note.version,
          title: "late",
          html: "<p>late body</p>",
        });
      else
        await trashNote(c, session, {
          id: noteId,
          version: note.version,
          cancelProcessing: true,
        });
      return output;
    });
    await expect(prepareExport(c, access(), "html")).rejects.toBeDefined();
    expect(
      await base.db.all(
        sql`select id from export_operations where state in ('ready','sending')`,
      ),
    ).toHaveLength(0);
    await settle();
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
    expect(
      (await readdir(dir)).filter((name) => name.startsWith("export-")),
    ).toHaveLength(0);
  });
  it.each([
    "missing",
    "sha",
  ] as const)("rejects a %s source during real stream generation and reclaims its spool", async (fault) => {
    const service = c.exporting;
    if (!service) throw Error("fixture");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>';
    noteId = (
      await saveNote(c, session, {
        title: "source fault",
        html: `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`,
        importReferences: false,
      })
    ).note.id;
    const reader = service.sources.open.bind(service.sources);
    vi.spyOn(service.sources, "open").mockImplementationOnce(
      async (source, signal) => {
        if (source.kind !== "inline") throw Error("fixture");
        if (fault === "sha")
          await writeFile(path.join(dir, "source-fixture"), source.data);
        return reader(
          {
            id: source.id,
            mime: source.mime,
            bytes: source.bytes,
            kind: "object",
            key: "source-fixture",
            sha256: "0".repeat(64),
          },
          signal,
        );
      },
    );
    await expect(prepareExport(c, access(), "html")).rejects.toBeDefined();
    expect(
      await base.db.all(
        sql`select id from export_operations where state in ('ready','sending')`,
      ),
    ).toHaveLength(0);
    await settle();
    expect(
      await base.db.all(sql`select id from export_operations`),
    ).toHaveLength(0);
    expect(
      (await readdir(dir)).filter((name) => name.startsWith("export-")),
    ).toHaveLength(0);
  });
  it.each([
    "html",
    "markdown",
  ] as const)("includes isolated removal notices in the actual %s file", async (format) => {
    noteId = (
      await saveNote(c, session, {
        title: "notice",
        html: '<p>本文を維持</p><img src="https://example.test/unavailable.png">',
        importReferences: false,
      })
    ).note.id;
    const ready = await prepareExport(c, access(), format);
    const output = await getExportFile(c, access(), ready.operationId);
    const content = await new Response(output.body).text();
    expect(content).toContain("本文を維持");
    expect(content).toContain("書き出しについて");
    expect(content).toContain(
      "未取得または許可されていない媒体参照を除去しました。",
    );
    expect(content).not.toContain("https://example.test/unavailable.png");
    expect(Buffer.byteLength(content)).toBe(output.file.bytes);
  });
  it("allows a current viewer and refuses the same prepared output after membership removal", async () => {
    const viewer = "00000000-0000-4000-8000-000000000002";
    const viewerSession = "v".repeat(43);
    await base.db.insert(accounts).values({
      id: viewer,
      email: "viewer@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(viewerSession),
      accountId: viewer,
      expiresAt: new Date(now.getTime() + 86400000),
    });
    const ws = await createWorkspace(c, session, {
      name: "viewer export",
      description: "",
    });
    await base.db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      accountId: viewer,
      role: "viewer",
      joinedAt: now,
    });
    await moveNote(
      c,
      session,
      (
        await previewNoteMove(c, session, {
          noteId,
          destination: { kind: "workspace", workspaceId: ws.id },
        })
      ).expected,
    );
    const input = { ...access(), session: viewerSession };
    const ready = await prepareExport(c, input, "markdown");
    const output = await getExportFile(c, input, ready.operationId);
    expect(await new Response(output.body).text()).toContain("現在の本文");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await prepareExport(c, input, "html");
    await base.db.run(
      sql`delete from workspace_members where workspace_id=${ws.id} and account_id=${viewer}`,
    );
    await expect(
      getExportFile(c, input, second.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
  });
  it.each([
    "html",
    "markdown",
  ] as const)("embeds legitimately saved small inline SVG without an asset row in %s", async (format) => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>';
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    noteId = (
      await saveNote(c, session, {
        title: "inline",
        html: `<p>inline</p><img src="${uri}" alt="safe">`,
        importReferences: false,
      })
    ).note.id;
    expect(await base.db.all(sql`select id from assets`)).toHaveLength(0);
    const ready = await prepareExport(c, access(), format);
    const output = await getExportFile(c, access(), ready.operationId);
    const content = await new Response(output.body).text();
    expect(content).toContain("data:image/svg+xml;base64,");
    expect(content).not.toContain("/media/");
  });
  it("allows same-content current move and excludes it from deleting the old workspace", async () => {
    const ws = await createWorkspace(c, session, {
      name: "old export workspace",
      description: "",
    });
    await moveNote(
      c,
      session,
      (
        await previewNoteMove(c, session, {
          noteId,
          destination: { kind: "workspace", workspaceId: ws.id },
        })
      ).expected,
    );
    const ready = await prepareExport(c, access(), "html");
    await moveNote(
      c,
      session,
      (
        await previewNoteMove(c, session, {
          noteId,
          destination: { kind: "personal", accountId: actor },
        })
      ).expected,
    );
    await requestWorkspaceDeletion(c, session, {
      workspaceId: ws.id,
      requestId: c.idGenerator.next(),
      confirmation: "old export workspace",
    });
    await sweepWorkspaceDeletions(c);
    const output = await getExportFile(c, access(), ready.operationId);
    expect(await new Response(output.body).text()).toContain("現在の本文");
  });
  it("binds limited output to browser, original link and current password grant", async () => {
    const link = await limited(true);
    const ready = await prepareExport(c, link, "markdown");
    await expect(
      getExportFile(c, { ...link, browser: "different" }, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
    await base.db.run(
      sql`update note_sharing set grant_epoch=grant_epoch+1 where note_id=${noteId}`,
    );
    await expect(
      getExportFile(c, link, ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_NOT_FOUND" });
  });
  it("inspects at most 200 external references at prepare, adoption and delayed GET without body fetching", async () => {
    const referencing = c.referencing;
    if (!referencing) throw Error("fixture");
    noteId = (
      await saveNote(c, session, {
        title: "bounded references",
        html: Array.from(
          { length: 201 },
          (_, i) => `<img src="https://example.test/image-${i}.png">`,
        ).join(""),
        importReferences: false,
      })
    ).note.id;
    const inspected: number[] = [];
    c = {
      ...c,
      referencing: {
        ...referencing,
        fetcher: {
          ...referencing.fetcher,
          async inspectMany(urls) {
            inspected.push(urls.length);
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
        },
      },
    };
    const ready = await prepareExport(c, access(), "html");
    const output = await getExportFile(c, access(), ready.operationId);
    const content = await new Response(output.body).text();
    expect(inspected).toEqual([200, 200, 200]);
    expect(content).toContain("image-199.png");
    expect(content).not.toContain("image-200.png");
    expect(content).toContain("書き出しについて");
  });
  it("rejects authenticated HEAD and Range without consuming the ready download", async () => {
    const ready = await prepareExport(c, access(), "markdown");
    const url = `http://localhost:3000/api/notes/${noteId}/exports/${ready.operationId}`;
    const headers = { cookie: `hollow_session=${session}` };
    expect(
      (await exportHttp(new Request(url, { method: "HEAD", headers }), c))
        ?.status,
    ).toBe(405);
    expect(
      (
        await exportHttp(
          new Request(url, { headers: { ...headers, range: "bytes=0-1" } }),
          c,
        )
      )?.status,
    ).toBe(416);
    const response = await exportHttp(new Request(url, { headers }), c);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response?.headers.get("content-disposition")).toContain(
      "filename*=UTF-8''",
    );
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    expect(await response?.text()).toContain("現在の本文");
  });
  it("invalidates output when external inspection changes without fetching external bodies", async () => {
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!note || !c.referencing) throw Error("fixture");
    await saveNote(c, session, {
      id: noteId,
      version: note.version,
      title: "external",
      html: '<img src="https://example.test/image.png">',
    });
    let allowed = true;
    const fetcher = {
      ...c.referencing.fetcher,
      async inspectMany(urls: readonly string[]) {
        return urls.map((url) => ({ url, allowed, reason: null }));
      },
    };
    c = { ...c, referencing: { ...c.referencing, fetcher } };
    const ready = await prepareExport(c, access(), "html");
    allowed = false;
    await expect(
      getExportFile(c, access(), ready.operationId),
    ).rejects.toMatchObject({ code: "EXPORT_CHANGED" });
  });
  it("recovers orphan spool with durable disk debt and no owner capacity charge", async () => {
    const before = await c.unitOfWorkProvider.run((u) =>
      u.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
    );
    const ready = await prepareExport(c, access(), "html");
    const op = await c.unitOfWorkProvider.run((u) =>
      u.exports.find(ready.operationId),
    );
    expect(op?.reservedBytes).toBeGreaterThan(0);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.capacity.usedBytes({ kind: "personal", accountId: actor }, now),
      ),
    ).toBe(before);
    await settle();
    expect(
      await c.unitOfWorkProvider.run((u) => u.exports.find(ready.operationId)),
    ).toBeNull();
  });
  it("keeps disk reservation after a physical remove fault and retries after backoff", async () => {
    const ready = await prepareExport(c, access(), "html");
    const storage = c.importing?.storage;
    if (!storage?.removeClaimed) throw Error("fixture");
    await c.unitOfWorkProvider.run((u) =>
      u.exports.retire(ready.operationId, now),
    );
    const fault = vi
      .spyOn(storage, "removeClaimed")
      .mockRejectedValueOnce(new Error("fixture remove failure"));
    await sweepExports(c);
    const debt = await c.unitOfWorkProvider.run((u) =>
      u.exports.find(ready.operationId),
    );
    expect(debt?.state).toBe("cleanup");
    expect(debt?.reservedBytes).toBeGreaterThan(0);
    expect(
      (await readdir(dir)).filter((n) => n.startsWith("export-")),
    ).toHaveLength(1);
    await sweepExports(c);
    expect(fault).toHaveBeenCalledTimes(1);
    fault.mockRestore();
    now = new Date(now.getTime() + 5000);
    await sweepExports(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.exports.find(ready.operationId)),
    ).toBeNull();
    expect(
      (await readdir(dir)).filter((n) => n.startsWith("export-")),
    ).toHaveLength(0);
  });
  it("purge waits for the active export reader and removes its spool after actual close", async () => {
    const ready = await prepareExport(c, access(), "html");
    const output = await getExportFile(c, access(), ready.operationId);
    const original = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (!original) throw Error("fixture");
    await trashNote(c, session, {
      id: noteId,
      version: original.version,
      cancelProcessing: true,
    });
    const trashed = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    if (trashed?.lifecycle.kind !== "trashed") throw Error("fixture");
    await requestNotePurge(c, session, {
      id: noteId,
      operationId: trashed.lifecycle.operationId,
    });
    await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).not.toBeNull();
    expect(
      (await readdir(dir)).filter((n) => n.startsWith("export-")),
    ).toHaveLength(1);
    await output.body.cancel();
    await c.exporting?.lifetime.stop();
    now = new Date(now.getTime() + 60000);
    for (let i = 0; i < 3; i++) await sweepNotePurges(c);
    expect(
      await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.exports.find(ready.operationId)),
    ).toBeNull();
    expect(
      (await readdir(dir)).filter((n) => n.startsWith("export-")),
    ).toHaveLength(0);
  });
  it("uses strict native form metadata, never grants HEAD or cross-origin mutations", async () => {
    await limited();
    const url = `http://localhost:3000/s/${token}/exports`;
    const post = (headers: Record<string, string>) =>
      exportHttp(
        new Request(url, {
          method: "POST",
          headers: {
            cookie: `hollow_share_browser=${browser}`,
            "content-type": "application/x-www-form-urlencoded",
            ...headers,
          },
          body: "format=html",
        }),
        c,
      );
    expect((await post({ origin: "null" }))?.status).toBe(403);
    const response = await post({
      origin: "null",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    });
    expect(response?.status).toBe(303);
    const location = response?.headers.get("location");
    expect(Boolean(location?.startsWith(`/s/${token}/exports/`))).toBe(true);
    if (!location) throw Error("missing download redirect");
    const download = await exportHttp(
      new Request(new URL(location, url), {
        headers: { cookie: `hollow_share_browser=${browser}` },
      }),
      c,
    );
    expect(download?.status).toBe(200);
    expect(download?.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(await download?.text()).toContain("現在の本文");
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 5; i++)
        expect(
          await u.exports.reserveDownload(noteId, c.tokens.hash(browser), now),
        ).toBeNull();
    });
    const limitedResponse = await post({ origin: "http://localhost:3000" });
    expect(limitedResponse?.status).toBe(429);
    expect(limitedResponse?.headers.get("retry-after")).toBe("60");
    expect(await limitedResponse?.text()).not.toContain("実ファイル / test");
    expect(
      (await exportHttp(new Request(url, { method: "HEAD" }), c))?.status,
    ).toBe(404);
    const app = `http://localhost:3000/api/notes/${noteId}/exports`;
    expect(
      (
        await exportHttp(
          new Request(app, {
            method: "POST",
            headers: {
              origin: "https://evil.example",
              "content-type": "application/json",
              cookie: `hollow_session=${session}`,
            },
            body: '{"format":"html"}',
          }),
          c,
        )
      )?.status,
    ).toBe(403);
  });
});

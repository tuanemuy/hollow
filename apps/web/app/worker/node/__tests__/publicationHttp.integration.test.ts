import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import {
  accounts,
  assets,
  noteAssetReferences,
  sessions,
} from "@repo/core/adapters/libsql/hollowSchema";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import { setDisplayStyle } from "@repo/core/application/note/setDisplayStyle";
import { saveProfile } from "@repo/core/application/publication/profile";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicationHttp } from "@/presentation/publicationHttp.node";
import { sharingHttp } from "@/presentation/sharingHttp.node";

describe("public full SSR and current media HTTP", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let dir: string;
  let noteId: string;
  let assetId: string;
  let session: string;
  let canonical: string;
  const app = "http://localhost:3000";
  beforeEach(async () => {
    base = await createTestContainer();
    dir = await mkdtemp(path.join(tmpdir(), "hollow-public-http-"));
    c = {
      ...createHollowContainer(base.db, app, { async send() {} }),
      sharing: {
        protector: {
          protect: (t) => t,
          reveal: (t) => t,
          needsRotation: () => false,
        },
        passwordWork: { run: (f) => f(), async stop() {} },
      },
      importing: {
        storage: new FileObjectStorage(dir),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    const actor = c.idGenerator.next();
    session = c.tokens.generate();
    assetId = c.idGenerator.next();
    const now = c.clock.now();
    await base.db.insert(accounts).values({
      id: actor,
      email: "public-http@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    await saveProfile(c, session, {
      displayName: "著者HTTP",
      handle: "public-http",
      bio: "",
      nameVersion: 0,
      profileVersion: 0,
      confirmHandleChange: false,
    });
    noteId = (
      await saveNote(c, session, {
        title: "SSR <title>",
        html: "<p>FULL BODY MARKER</p>",
      })
    ).note.id;
    const storage = c.importing?.storage;
    if (!storage) throw Error("storage");
    const stored = await storage.put(
      "fixture-media",
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      3,
    );
    await base.db.insert(assets).values({
      id: assetId,
      accountId: actor,
      draftId: null,
      sourceNoteId: noteId,
      sourceJobId: "fixture",
      storageKey: "fixture-media",
      bytes: 3,
      sha256: stored.sha256,
      mime: "image/png",
      kind: "image",
      createdAt: now,
      unreferencedAt: null,
      committedToNote: true,
      state: "ready",
    });
    await base.db
      .insert(noteAssetReferences)
      .values({ noteId, assetId, version: 0 });
    await base.db.run(
      sql`update notes set html=${`<p>FULL BODY MARKER</p><img src="/api/notes/${noteId}/assets/${assetId}"><script>forbidden()</script>`} where id=${noteId}`,
    );
    const published = await changeSharing(c, session, {
      expected: (await getSharing(c, session, noteId)).expected,
      operation: {
        kind: "visibility",
        visibility: "public",
        confirmPasswordRemoval: false,
      },
    });
    if (!published.publicUrl) throw Error("url");
    canonical = published.publicUrl;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    base.close();
    await rm(dir, { recursive: true, force: true });
  });
  const request = (suffix = "", init?: RequestInit) =>
    new Request(canonical + suffix, init);
  const http = async (suffix = "", init?: RequestInit) => {
    const response = await publicationHttp(request(suffix, init), c);
    if (!response) throw Error("route");
    return response;
  };
  const privatize = async () =>
    changeSharing(c, session, {
      expected: (await getSharing(c, session, noteId)).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
  it("serves parent metadata and independent full SSR document identically for ordinary and crawler UAs", async () => {
    const parent = await http();
    expect(parent.status).toBe(200);
    const body = await parent.text();
    expect(body).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(body).toContain('property="og:title"');
    expect(body).toContain("SSR &lt;title&gt;");
    expect(body).toContain("本文を別画面で開く");
    expect(body).toContain(`src="${new URL(canonical).pathname}/document"`);
    expect(body).not.toContain("srcdoc=");
    const document = await http("/document");
    const html = await document.text();
    expect(html).toContain("FULL BODY MARKER");
    expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(html).toContain(`${new URL(canonical).pathname}/assets/${assetId}`);
    expect(html).not.toContain("forbidden()");
    expect(html).not.toContain(`/api/notes/${noteId}`);
    expect(document.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    const bot = await http("/document", {
      headers: { "user-agent": "Googlebot" },
    });
    expect(await bot.text()).toBe(html);
    expect(parent.headers.get("x-robots-tag")).toBe("index, follow");
    expect(parent.headers.get("cache-control")).toBe("no-store");
  });
  it("keeps the public parent and isolated document free of editor controls even for the owner", async () => {
    for (const suffix of ["", "/document"]) {
      const response = await http(suffix, {
        headers: { cookie: `hollow_session=${session}` },
      });
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain("編集する");
      expect(html).not.toContain(`/notes/${noteId}/edit`);
      expect(html).not.toContain("共有設定");
    }
  });
  it("retains /s noindex even when its current token reaches the same public note", async () => {
    const link = (
      await getShareLink(
        c,
        session,
        (
          await getSharing(c, session, noteId)
        ).expected,
      )
    ).url;
    const response = await sharingHttp(new Request(link), c);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response?.text()).toContain("FULL BODY MARKER");
  });
  it("both display styles stay inside the independent document and never style the parent", async () => {
    await base.db.run(
      sql`update notes set html=${"<style>body{color:rgb(12,34,56)}</style><p>STYLE BODY</p>"} where id=${noteId}`,
    );
    const original = await setDisplayStyle(c, session, {
      id: noteId,
      style: "original",
    });
    expect(original.display.style).toBe("original");
    const parent = await (await http()).text();
    const source = await (await http("/document")).text();
    expect(parent).not.toContain("rgb(12,34,56)");
    expect(source).toContain("rgb(12,34,56)");
    expect(source).toContain("STYLE BODY");
    expect(parent).toContain('sandbox="allow-same-origin"');
    await setDisplayStyle(c, session, { id: noteId, style: "default" });
    const normal = await (await http("/document")).text();
    expect(normal).toContain("STYLE BODY");
    expect(normal).not.toBe(source);
    expect(await (await http()).text()).not.toContain("rgb(12,34,56)");
  });
  it("current internal media GET/HEAD/range succeeds without exposing source IDs and rechecks before 416", async () => {
    const url = `/assets/${assetId}`;
    const full = await http(url);
    expect(full.status).toBe(200);
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    const head = await http(url, { method: "HEAD" });
    expect(head.headers.get("content-length")).toBe("3");
    expect(await head.text()).toBe("");
    const range = await http(url, { headers: { range: "bytes=1-2" } });
    expect(range.status).toBe(206);
    expect(new Uint8Array(await range.arrayBuffer())).toEqual(
      new Uint8Array([2, 3]),
    );
    expect(
      (await http(url, { headers: { range: "bytes=99-100" } })).status,
    ).toBe(416);
    await privatize();
    expect(
      (await http(url, { headers: { range: "bytes=99-100" } })).status,
    ).toBe(404);
  });
  it("private and trash errors have no title/body metadata, and invalid suffix/query cannot select another source", async () => {
    for (const suffix of [
      "/history",
      "/document?revision=1",
      "/assets/not-an-id",
    ])
      expect((await http(suffix)).status).toBe(404);
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=1,purge_after=2,trash_operation_id='fixture' where id=${noteId}`,
    );
    const gone = await http();
    expect(gone.status).toBe(410);
    expect(await gone.text()).not.toContain("FULL BODY MARKER");
    await base.db.run(
      sql`update note_sharing set visibility='private' where note_id=${noteId}`,
    );
    const hidden = await http();
    expect(hidden.status).toBe(404);
    expect(await hidden.text()).not.toContain("SSR &lt;title&gt;");
  });
  it("returns generic 404 without prior public metadata or sitemap identity after complete row removal", async () => {
    await base.db.transaction(async (tx) => {
      await tx.run(
        sql`delete from note_asset_references where note_id=${noteId}`,
      );
      await tx.run(sql`delete from assets where source_note_id=${noteId}`);
      await tx.run(sql`delete from notes where id=${noteId}`);
    });
    const gone = await http();
    expect(gone.status).toBe(404);
    const body = await gone.text();
    expect(body).not.toContain("FULL BODY MARKER");
    expect(body).not.toContain("SSR &lt;title&gt;");
    expect(body).toBe(await (await http("/missing")).text());
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    expect((await http("/document")).status).toBe(404);
  });
  it("revoke after storage opens closes the old stream and does not adopt bytes", async () => {
    const storage = c.importing?.storage;
    if (!storage) throw Error("storage");
    const original = storage.stream.bind(storage);
    let cancelled = false;
    vi.spyOn(storage, "stream").mockImplementationOnce(async (...args) => {
      const actual = await original(...args);
      await actual.cancel();
      await privatize();
      return new ReadableStream({
        cancel() {
          cancelled = true;
        },
      });
    });
    expect((await http(`/assets/${assetId}`)).status).toBe(404);
    expect(cancelled).toBe(true);
  });
});

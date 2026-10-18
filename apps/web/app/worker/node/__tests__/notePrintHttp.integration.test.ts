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
import { NodeReferenceProcessor } from "@repo/core/adapters/node/reference/referenceProcessor";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import { saveProfile } from "@repo/core/application/publication/profile";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NOTE_PRINT_SCRIPT_HASH,
  readingPrintNotice,
} from "@/presentation/notePrint";
import { notePrintHttp } from "@/presentation/notePrintHttp.node";
import { publicationHttp } from "@/presentation/publicationHttp.node";
import { sharingHttp } from "@/presentation/sharingHttp.node";

describe("note print view HTTP", () => {
  let base: TestContainer;
  let c: HollowContainer & {
    sharing: NonNullable<HollowContainer["sharing"]>;
  };
  let directory: string;
  let noteId: string;
  let assetId: string;
  let owner: string;
  let stranger: string;
  const app = "http://localhost:3000";
  const navigation = {
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
  };
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(path.join(tmpdir(), "hollow-print-http-"));
    c = {
      ...createHollowContainer(base.db, app, { async send() {} }),
      sharing: {
        protector: {
          protect: (t) => t,
          reveal: (t) => t,
          needsRotation: () => false,
        },
        passwordWork: new NodeSharePasswordWork(),
      },
      importing: {
        storage: new FileObjectStorage(directory),
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: new IsolatedMediaValidator(),
        detectFormat,
        wake() {},
      },
    };
    const now = c.clock.now();
    const accountIds = [c.idGenerator.next(), c.idGenerator.next()];
    [owner, stranger] = [c.tokens.generate(), c.tokens.generate()];
    for (const [index, id] of accountIds.entries()) {
      await base.db.insert(accounts).values({
        id,
        email: `print-${index}@example.test`,
        passwordHash: "fixture",
        createdAt: now,
        verifiedAt: now,
      });
      await base.db.insert(sessions).values({
        tokenHash: c.tokens.hash(index ? stranger : owner),
        accountId: id,
        expiresAt: new Date(now.getTime() + 86400_000),
      });
    }
    await saveProfile(c, owner, {
      displayName: "印刷の著者",
      handle: "print-owner",
      bio: "",
      nameVersion: 0,
      profileVersion: 0,
      confirmHandleChange: false,
    });
    noteId = (
      await saveNote(c, owner, {
        title: 'Print "title" <one>',
        html: "<p>PRINT BODY MARKER</p>",
      })
    ).note.id;
    assetId = c.idGenerator.next();
    const stored = await c.importing?.storage.put(
      "print-media",
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      3,
    );
    if (!stored) throw Error("storage");
    await base.db.insert(assets).values({
      id: assetId,
      accountId: accountIds[0] ?? "",
      draftId: null,
      sourceNoteId: noteId,
      sourceJobId: "fixture",
      storageKey: "print-media",
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
      sql`update notes set html=${`<p>PRINT BODY MARKER</p><img src="/api/notes/${noteId}/assets/${assetId}"><p onclick="forbidden()">x</p><script>forbidden()</script>`} where id=${noteId}`,
    );
  });
  afterEach(async () => {
    await c.sharing.passwordWork.stop();
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const change = async (
    operation: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, owner, {
      expected: (await getSharing(c, owner, noteId)).expected,
      operation,
    });
  const appPrint = async (init: RequestInit = {}, id = noteId) => {
    const response = await notePrintHttp(
      new Request(`${app}/notes/${id}/print`, init),
      c,
    );
    if (!response) throw Error("route");
    return response;
  };
  const expectPrintable = async (response: Response, media: string) => {
    expect(response.status).toBe(200);
    const policy = response.headers.get("content-security-policy") ?? "";
    expect(policy).toContain(`script-src '${NOTE_PRINT_SCRIPT_HASH}';`);
    expect(policy).toContain(`img-src ${app}${media};`);
    expect(policy).toContain(
      "frame-ancestors 'none'; sandbox allow-same-origin allow-scripts allow-modals",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const html = await response.text();
    expect(html).toContain(
      "<title>Print &quot;title&quot; &lt;one&gt;</title>",
    );
    expect(html).toContain("PRINT BODY MARKER");
    expect(html).toContain(`<img src="${media}">`);
    expect(html).not.toContain("forbidden()");
    expect(html).toContain('<button type="button">印刷する</button>');
    expect(html).not.toContain("印刷できません");
    return html;
  };

  it("prints the owner's saved body with internal media under the hashed script", async () => {
    const html = await expectPrintable(
      await appPrint({
        headers: { cookie: `hollow_session=${owner}`, ...navigation },
      }),
      `/api/notes/${noteId}/assets/${assetId}`,
    );
    expect(html).toContain(`<a href="/notes/${noteId}">ノートに戻る</a>`);
    const head = await appPrint({
      method: "HEAD",
      headers: { cookie: `hollow_session=${owner}` },
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const post = await appPrint({
      method: "POST",
      headers: { cookie: `hollow_session=${owner}` },
    });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    expect(
      await notePrintHttp(new Request(`${app}/notes/${noteId}`), c),
    ).toBeNull();
  });

  const backToDetail = async (response: Response, id = noteId) => {
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`/notes/${id}`);
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(await response.text()).toBe("");
  };

  it("sends a missing session back to the note detail", async () => {
    await backToDetail(await appPrint());
  });

  it("sends another account back to the note detail", async () => {
    await backToDetail(
      await appPrint({ headers: { cookie: `hollow_session=${stranger}` } }),
    );
  });

  it("sends an unknown note back to its detail URL", async () => {
    const unknown = c.idGenerator.next();
    await backToDetail(
      await appPrint(
        { headers: { cookie: `hollow_session=${owner}` } },
        unknown,
      ),
      unknown,
    );
  });

  it("sends a trashed note back to the note detail", async () => {
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=1,purge_after=2,trash_operation_id='fixture' where id=${noteId}`,
    );
    await backToDetail(
      await appPrint({ headers: { cookie: `hollow_session=${owner}` } }),
    );
  });

  it("sends an empty body back to the note detail instead of printing", async () => {
    await base.db.run(sql`update notes set html='' where id=${noteId}`);
    await backToDetail(
      await appPrint({ headers: { cookie: `hollow_session=${owner}` } }),
    );
  });

  it("shows external images only when this app or the reader opened the print view", async () => {
    const external = "https://images.example/photo.png";
    const reading = {
      ...c,
      referencing: {
        processor: new NodeReferenceProcessor(),
        wake() {},
        fetcher: {
          async inspect() {
            throw Error("unused");
          },
          async fetch() {
            throw Error("unused");
          },
          async inspectMany(urls: readonly string[]) {
            return urls.map((url) => ({ url, allowed: true, reason: null }));
          },
        },
      },
    };
    await base.db.run(
      sql`update notes set html=${`<p>PRINT BODY MARKER</p><img src="${external}">`} where id=${noteId}`,
    );
    const imageSources = async (site: string) => {
      const response = await notePrintHttp(
        new Request(`${app}/notes/${noteId}/print`, {
          headers: {
            cookie: `hollow_session=${owner}`,
            ...navigation,
            "sec-fetch-site": site,
          },
        }),
        reading,
      );
      expect(response?.status).toBe(200);
      return (
        /img-src ([^;]+);/.exec(
          response?.headers.get("content-security-policy") ?? "",
        )?.[1] ?? ""
      );
    };
    expect(await imageSources("same-origin")).toContain(external);
    expect(await imageSources("none")).toContain(external);
    expect(await imageSources("cross-site")).not.toContain(external);
  });

  it("prints a public note anonymously and follows the public page's availability", async () => {
    const published = await change({
      kind: "visibility",
      visibility: "public",
      confirmPasswordRemoval: false,
    });
    if (!published.publicUrl) throw Error("url");
    const publicPath = new URL(published.publicUrl).pathname;
    const http = async (suffix: string) => {
      const response = await publicationHttp(
        new Request(published.publicUrl + suffix),
        c,
      );
      if (!response) throw Error("route");
      return response;
    };
    const page = await (await http("")).text();
    expect(page).toContain(`<a href="${publicPath}/print">印刷する</a>`);
    expect(page).toContain(readingPrintNotice);
    const html = await expectPrintable(
      await http("/print"),
      `${publicPath}/assets/${assetId}`,
    );
    expect(html).toContain(`<a href="${publicPath}">ノートに戻る</a>`);
    await base.db.run(
      sql`update notes set lifecycle='trashed',trashed_at=1,purge_after=2,trash_operation_id='fixture' where id=${noteId}`,
    );
    const trashed = await http("/print");
    expect(trashed.status).toBe(410);
    expect(await trashed.text()).not.toContain("PRINT BODY MARKER");
    await base.db.run(
      sql`update notes set lifecycle='active',trashed_at=null,purge_after=null,trash_operation_id=null where id=${noteId}`,
    );
    await change({ kind: "visibility", visibility: "private" });
    const hidden = await http("/print");
    expect(hidden.status).toBe(404);
    expect(await hidden.text()).not.toContain("PRINT BODY MARKER");
  });

  it("prints a link-shared note behind its password and stops after the link is regenerated", async () => {
    await change({ kind: "visibility", visibility: "link" });
    const link = (
      await getShareLink(
        c,
        owner,
        (
          await getSharing(c, owner, noteId)
        ).expected,
      )
    ).url;
    const token = new URL(link).pathname.slice(3);
    const http = async (suffix: string, init: RequestInit = {}) => {
      const response = await sharingHttp(new Request(link + suffix, init), c);
      if (!response) throw Error("route");
      return response;
    };
    const page = await (await http("")).text();
    expect(page).toContain(`<a href="/s/${token}/print">印刷する</a>`);
    expect(page).toContain(readingPrintNotice);
    const first = await http("/print");
    expect(first.headers.get("set-cookie")).toMatch(
      /^hollow_share_browser=[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Lax; Path=\/s/,
    );
    const html = await expectPrintable(first, `/s/${token}/assets/${assetId}`);
    expect(html).toContain(`<a href="/s/${token}">ノートに戻る</a>`);

    const password = "print password value";
    await change({ kind: "password", password });
    const browser = c.tokens.generate();
    const cookie = `hollow_share_browser=${browser}`;
    const gated = await http("/print", { headers: { cookie } });
    expect(gated.status).toBe(303);
    expect(gated.headers.get("location")).toBe(`/s/${token}`);
    expect(await gated.text()).toBe("");
    const unlocked = await http("/unlock", {
      method: "POST",
      headers: {
        origin: app,
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ password }),
    });
    expect(unlocked.status).toBe(303);
    await expectPrintable(
      await http("/print", { headers: { cookie } }),
      `/s/${token}/assets/${assetId}`,
    );

    await change({ kind: "regenerate" });
    const stale = await http("/print", { headers: { cookie } });
    expect(stale.status).toBe(404);
    expect(await stale.text()).not.toContain("PRINT BODY MARKER");
  });

  it("omits the print links on public and shared pages whose body is empty and sends their print views back", async () => {
    const published = await change({
      kind: "visibility",
      visibility: "public",
      confirmPasswordRemoval: false,
    });
    if (!published.publicUrl) throw Error("url");
    await base.db.run(sql`update notes set html='' where id=${noteId}`);
    const page = await (
      await publicationHttp(new Request(published.publicUrl), c)
    )?.text();
    expect(page).toContain("ダウンロード");
    expect(page).not.toContain("/print");
    expect(page).not.toContain(readingPrintNotice);
    const publicPrint = await publicationHttp(
      new Request(`${published.publicUrl}/print`),
      c,
    );
    expect(publicPrint?.status).toBe(303);
    expect(publicPrint?.headers.get("location")).toBe(
      new URL(published.publicUrl).pathname,
    );
    const link = (
      await getShareLink(
        c,
        owner,
        (
          await getSharing(c, owner, noteId)
        ).expected,
      )
    ).url;
    const shared = await (await sharingHttp(new Request(link), c))?.text();
    expect(shared).toContain("HTMLを書き出す");
    expect(shared).not.toContain("/print");
    expect(shared).not.toContain(readingPrintNotice);
    const sharedPrint = await sharingHttp(new Request(`${link}/print`), c);
    expect(sharedPrint?.status).toBe(303);
    expect(sharedPrint?.headers.get("location")).toBe(new URL(link).pathname);
  });
});

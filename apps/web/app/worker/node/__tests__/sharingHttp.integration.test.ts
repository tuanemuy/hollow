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
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guardResourceRequest } from "@/presentation/resourceRequestGuard.node";
import { sharingHttp } from "@/presentation/sharingHttp.node";

describe("anonymous sharing HTTP boundary", () => {
  let base: TestContainer;
  let c: HollowContainer & {
    importing: NonNullable<HollowContainer["importing"]>;
    sharing: NonNullable<HollowContainer["sharing"]>;
  };
  let directory: string;
  let noteId: string;
  let link: string;
  let session: string;
  let browser: string;
  let actor: string;
  let assetId: string;
  const app = "http://localhost:3000";
  const password = "http test password";
  beforeEach(async () => {
    base = await createTestContainer();
    directory = await mkdtemp(path.join(tmpdir(), "hollow-sharing-http-"));
    const common = createHollowContainer(base.db, app, { async send() {} });
    c = {
      ...common,
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
    actor = c.idGenerator.next();
    session = c.tokens.generate();
    browser = c.tokens.generate();
    assetId = c.idGenerator.next();
    const now = c.clock.now();
    await base.db.insert(accounts).values({
      id: actor,
      email: "http-sharing@example.test",
      passwordHash: "fixture",
      createdAt: now,
      verifiedAt: now,
    });
    await base.db.insert(sessions).values({
      tokenHash: c.tokens.hash(session),
      accountId: actor,
      expiresAt: new Date(now.getTime() + 86400_000),
    });
    noteId = (
      await saveNote(c, session, {
        title: "HTTP secret title",
        html: "<p>Saved body marker</p>",
      })
    ).note.id;
    await change({ kind: "visibility", visibility: "link" });
    link = (
      await getShareLink(
        c,
        session,
        (
          await getSharing(c, session, noteId)
        ).expected,
      )
    ).url;
    const stored = await c.importing.storage.put(
      "asset",
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
      storageKey: "asset",
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
      sql`update notes set html=${`<p>Saved body marker</p><img src="/api/notes/${noteId}/assets/${assetId}">`} where id=${noteId}`,
    );
  });
  afterEach(async () => {
    await c.sharing?.passwordWork.stop();
    base.close();
    await rm(directory, { recursive: true, force: true });
  });
  const change = async (
    operation: Parameters<typeof changeSharing>[2]["operation"],
  ) =>
    changeSharing(c, session, {
      expected: (await getSharing(c, session, noteId)).expected,
      operation,
    });
  const request = (suffix = "", init: RequestInit = {}) =>
    new Request(link + suffix, init);
  const grantCookie = () => `hollow_share_browser=${browser}`;
  const unlock = (value = password) =>
    request("/unlock", {
      method: "POST",
      headers: {
        origin: app,
        cookie: grantCookie(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ password: value }),
    });
  async function response(req: Request, container = c) {
    const value = await sharingHttp(req, container);
    if (!value) throw Error("unhandled");
    return value;
  }

  it("includes the authorized persistent ledger in the reader shell and keeps denied pages free of it", async () => {
    const original = "https://resources.example/reader-source.css";
    const reason = "見つかりません。装飾を取り込めませんでした。";
    const entryId = c.idGenerator.next();
    const now = c.clock.now();
    await c.unitOfWorkProvider.run((u) =>
      u.references.saveEntry({
        id: entryId,
        noteId,
        kind: "stylesheet",
        url: original,
        location: "PRIVATE_LOCATION_MARKER",
        current: true,
        state: "failed",
        reason,
        assetId: null,
        finalUrl: "PRIVATE_STORAGE_MARKER",
        bytes: 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const readable = await response(request());
    const html = await readable.text();
    expect(html).toContain('href="#reference-ledger"');
    expect(html).toContain("現在 1 件 · 取得済み 0 件 · 未取得 1 件");
    expect(html).toContain(original);
    expect(html).toContain(reason);
    expect(html).not.toContain(entryId);
    expect(html).not.toContain("PRIVATE_LOCATION_MARKER");
    expect(html).not.toContain("PRIVATE_STORAGE_MARKER");
    await change({ kind: "password", password });
    const gate = await response(
      request("", { headers: { cookie: grantCookie() } }),
    );
    const gated = await gate.text();
    expect(gated).not.toContain(original);
    expect(gated).not.toContain(reason);
    expect(gated).not.toContain("参照リソース");
    expect((await response(unlock())).status).toBe(303);
    const unlocked = await response(
      request("", { headers: { cookie: grantCookie() } }),
    );
    expect(await unlocked.text()).toContain(original);
    await change({ kind: "password", password: "new password value" });
    const revoked = await response(
      request("", { headers: { cookie: grantCookie() } }),
    );
    expect(await revoked.text()).not.toContain(original);
    await change({ kind: "visibility", visibility: "private" });
    const denied = await response(
      request("", { headers: { cookie: grantCookie() } }),
    );
    expect(denied.status).toBe(404);
    expect(await denied.text()).not.toContain(original);
  });

  it("accepts no-referrer native POST only with all three same-origin navigation metadata headers", async () => {
    await change({ kind: "password", password });
    const headers = {
      origin: "null",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      cookie: grantCookie(),
      "content-type": "application/x-www-form-urlencoded",
    };
    const post = (extra: HeadersInit) =>
      request("/unlock", {
        method: "POST",
        headers: extra,
        body: new URLSearchParams({ password }),
      });
    for (const [key, value] of [
      ["origin", null],
      ["origin", "https://other.invalid"],
      ["sec-fetch-site", null],
      ["sec-fetch-site", "same-site"],
      ["sec-fetch-site", "cross-site"],
      ["sec-fetch-site", "none"],
      ["sec-fetch-site", "SAME-ORIGIN"],
      ["sec-fetch-mode", null],
      ["sec-fetch-mode", "cors"],
      ["sec-fetch-dest", null],
      ["sec-fetch-dest", "iframe"],
    ] as const) {
      const h = new Headers(headers);
      if (value === null) h.delete(key);
      else h.set(key, value);
      expect((await response(post(h))).status).toBe(403);
    }
    const result = await response(post(headers));
    expect(result.status).toBe(303);
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(result.headers.get("content-security-policy")).toContain(
      "script-src 'none'",
    );
  });

  it("serves identical saved SSR to normal browsers and bots with no-store/noindex/isolation", async () => {
    const normal = await response(request());
    const bot = await response(
      request("", { headers: { "user-agent": "fixturebot" } }),
    );
    expect(normal.status).toBe(200);
    expect(bot.status).toBe(200);
    const html = await normal.text();
    expect(await bot.text()).toBe(html);
    expect(html.includes("Saved body marker")).toBe(true);
    expect(html.includes('sandbox="allow-same-origin"')).toBe(true);
    expect(html.includes("表示名未設定")).toBe(true);
    expect(html.includes("http-sharing@example.test")).toBe(false);
    expect(html.includes("編集する")).toBe(false);
    expect(normal.headers.get("cache-control")).toContain("no-store");
    expect(normal.headers.get("x-robots-tag")).toContain("noindex");
    expect(normal.headers.get("referrer-policy")).toBe("no-referrer");
    const member = await response(
      request("", { headers: { cookie: `hollow_session=${session}` } }),
    );
    expect((await member.text()).includes("編集する")).toBe(true);
  });
  it("gate has no private metadata, successful POST issues fixed browser cookie and 303", async () => {
    await change({ kind: "password", password });
    const gate = await response(request());
    const html = await gate.text();
    expect(
      html.includes("HTTP secret title") ||
        html.includes("Saved body marker") ||
        html.includes("著者:"),
    ).toBe(false);
    expect(
      gate.headers
        .get("set-cookie")
        ?.includes("HttpOnly; SameSite=Lax; Path=/s; Max-Age=86400"),
    ).toBe(true);
    expect((await response(unlock("wrong"))).status).toBe(422);
    const ok = await response(unlock());
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location") === new URL(link).pathname).toBe(true);
    const result = await response(
      request("", { headers: { cookie: grantCookie() } }),
    );
    expect((await result.text()).includes("Saved body marker")).toBe(true);
    expect(result.headers.has("set-cookie")).toBe(false);
  });
  it("rejects Origin, missing cookie, oversized/duplicate/unknown body without reflection", async () => {
    await change({ kind: "password", password });
    const denied = await response(
      request("/unlock", {
        method: "POST",
        headers: { origin: "https://other.invalid", cookie: grantCookie() },
        body: password,
      }),
    );
    expect(denied.status).toBe(403);
    const missing = await response(
      request("/unlock", {
        method: "POST",
        headers: {
          origin: app,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ password }),
      }),
    );
    expect(missing.status).toBe(400);
    for (const body of [
      `password=${"x".repeat(5000)}`,
      "password=a&password=b",
      "password=a&extra=marker",
    ]) {
      const result = await response(
        request("/unlock", {
          method: "POST",
          headers: {
            origin: app,
            cookie: grantCookie(),
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        }),
      );
      expect(result.status).toBe(422);
      expect((await result.text()).includes(body)).toBe(false);
    }
  });
  it("authorizes current media for GET/HEAD/Range and authorizes before 416", async () => {
    const path = `/assets/${assetId}`;
    const get = await response(request(path));
    expect(get.status).toBe(200);
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    const head = await response(request(path, { method: "HEAD" }));
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("3");
    expect(await head.text()).toBe("");
    const range = await response(
      request(path, { headers: { range: "bytes=1-2" } }),
    );
    expect(range.status).toBe(206);
    expect(new Uint8Array(await range.arrayBuffer())).toEqual(
      new Uint8Array([2, 3]),
    );
    expect(
      (await response(request(path, { headers: { range: "bytes=99-" } })))
        .status,
    ).toBe(416);
    await change({ kind: "visibility", visibility: "private" });
    const denied = await response(
      request(path, { headers: { range: "bytes=99-" } }),
    );
    expect(denied.status).toBe(404);
    expect(denied.headers.has("content-range")).toBe(false);
  });
  it("rejects history-only, other-note, old token and non-current path variants", async () => {
    await base.db.run(
      sql`update note_asset_references set version=1 where note_id=${noteId} and asset_id=${assetId}`,
    );
    expect((await response(request(`/assets/${assetId}`))).status).toBe(404);
    expect(
      (await response(request(`/assets/${c.idGenerator.next()}`))).status,
    ).toBe(404);
    for (const suffix of [
      "/original",
      `/revisions/1/assets/${assetId}`,
      `/drafts/${assetId}`,
    ])
      expect((await response(request(suffix))).status).toBe(404);
    await change({ kind: "regenerate" });
    expect((await response(request())).status).toBe(404);
  });
  it("rechecks after stat including invalid Range and after stream open, cancelling revoked stream", async () => {
    const storage = c.importing.storage;
    const afterStat = {
      ...c,
      importing: {
        ...c.importing,
        storage: {
          ...storage,
          put: storage.put.bind(storage),
          putBounded: storage.putBounded.bind(storage),
          read: storage.read.bind(storage),
          remove: storage.remove.bind(storage),
          stream: storage.stream.bind(storage),
          async stat(key: string) {
            const info = await storage.stat(key);
            await change({ kind: "visibility", visibility: "private" });
            return info;
          },
        },
      },
    };
    const denied = await response(
      request(`/assets/${assetId}`, { headers: { range: "bytes=99-" } }),
      afterStat,
    );
    expect(denied.status).toBe(404);
    expect(denied.headers.has("content-range")).toBe(false);
    await change({ kind: "visibility", visibility: "link" });
    let cancelled = false;
    const afterStream = {
      ...c,
      importing: {
        ...afterStat.importing,
        storage: {
          ...afterStat.importing.storage,
          stat: storage.stat.bind(storage),
          async stream() {
            await change({ kind: "visibility", visibility: "private" });
            return new ReadableStream<Uint8Array>({
              cancel() {
                cancelled = true;
              },
            });
          },
        },
      },
    };
    expect(
      (await response(request(`/assets/${assetId}`), afterStream)).status,
    ).toBe(404);
    expect(cancelled).toBe(true);
  });
  it("busy returns retryable 503; logs and error HTML never contain injected cause/path marker", async () => {
    await change({ kind: "password", password });
    const logs: unknown[] = [];
    const marker = "artificial-secret-marker";
    const failed = {
      ...c,
      logger: {
        info() {},
        warn() {},
        error(...entry: unknown[]) {
          logs.push(entry);
        },
      },
      sharing: {
        ...c.sharing,
        passwordWork: {
          async run<T>(): Promise<T> {
            throw new SystemError(
              SystemErrorCode.SharePasswordBusy,
              "safe",
              new Error(marker + link),
            );
          },
          async stop() {},
        },
      },
    };
    const result = await response(unlock(), failed);
    expect(result.status).toBe(503);
    expect(result.headers.get("retry-after")).toBe("3");
    expect((await result.text()).includes(marker)).toBe(false);
    expect(
      JSON.stringify(logs).includes(marker) ||
        JSON.stringify(logs).includes(link),
    ).toBe(false);
  });
  it("resource guard admits only exact same-origin shared media subresources", async () => {
    expect(
      await guardResourceRequest(
        request(`/assets/${assetId}`, {
          headers: {
            "sec-fetch-dest": "image",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBeNull();
    expect(
      (
        await guardResourceRequest(
          request("", {
            headers: {
              "sec-fetch-dest": "image",
              "sec-fetch-site": "same-origin",
            },
          }),
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await guardResourceRequest(
          request(`/assets/${assetId}`, {
            headers: {
              "sec-fetch-dest": "image",
              "sec-fetch-site": "cross-site",
            },
          }),
        )
      )?.status,
    ).toBe(403);
  });
});

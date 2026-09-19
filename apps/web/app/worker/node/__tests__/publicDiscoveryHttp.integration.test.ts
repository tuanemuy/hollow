import { randomUUID } from "node:crypto";
import {
  createTestContainer,
  type TestContainer,
} from "@repo/core/adapters/libsql/__tests__/helpers";
import { LibsqlPublicDiscoverySnapshot } from "@repo/core/adapters/libsql/publicDiscoverySnapshot";
import { projectNote } from "@repo/core/adapters/node/browse/projection";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { createNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { publicDiscoveryHttp } from "@/presentation/publicDiscoveryHttp.node";

describe("public discovery native HTTP", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let account: string;
  let noteId: string;
  let publicId: string;
  let now: Date;
  const browser = "d".repeat(43);
  beforeEach(async () => {
    b = await createTestContainer();
    account = randomUUID();
    now = new Date("2026-09-20T00:00:00Z");
    const read = new LibsqlPublicDiscoverySnapshot(
      `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`,
      { now: () => now },
    );
    c = {
      ...createHollowContainer(b.db, "http://localhost:3000", {
        async send() {},
      }),
      clock: { now: () => now },
      publicDiscovery: { execute: (r) => read.read(r), async stop() {} },
    };
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [
        account,
        `${account}@example.test`,
        "fixture",
        now.getTime(),
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "insert into account_public_profiles(account_id,handle,bio,version) values(?,?,?,0)",
      args: [account, "http-person", "<script>bio text</script>"],
    });
    const n = createNote(
      {
        id: randomUUID(),
        accountId: account,
        title: "public title",
        html: "<p>current Tokyo content</p>",
        text: "",
      },
      now,
    );
    noteId = n.id;
    publicId = randomUUID();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.notes.insert(n);
      await u.browseIndex.save(n.id, n.version, projectNote(n));
      await u.publicNotes.create({
        noteId,
        publicId,
        urlGeneration: 1,
        accessEpoch: 0,
        createdAt: now,
      });
    });
    await b.client.execute({
      sql: "update note_sharing set visibility='public',link_generation=1,token_hash='synthetic',token_envelope='synthetic' where note_id=?",
      args: [noteId],
    });
  });
  afterEach(() => b.close());
  const get = (
    pathname: string,
    headers: Record<string, string> = {},
    method = "GET",
  ) =>
    publicDiscoveryHttp(
      new Request(`http://localhost:3000${pathname}`, {
        method,
        headers: { cookie: `hollow_public_browser=${browser}`, ...headers },
      }),
      c,
    );
  it("serves initial profile indexable but discover and native filtered results noindex", async () => {
    const response = await get("/@http-person");
    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-robots-tag")).toBe("index, follow");
    const body = await response?.text();
    expect(body).toContain("http://localhost:3000/@http-person");
    expect(body).toContain(`/p/${publicId}/1`);
    expect(body).toContain("&lt;script&gt;bio text&lt;/script&gt;");
    expect(body).not.toContain("<script>");
    expect(body).not.toContain(`${account}@example.test`);
    const filtered = await get("/@http-person?q=Tokyo&from=&until=&zone=UTC");
    expect(filtered?.status).toBe(200);
    expect(filtered?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await filtered?.text()).toContain("公開ノート 1 件");
    const all = await get("/discover");
    expect(all?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it("keeps zero results distinct from invalid search, busy and missing profile", async () => {
    expect(await (await get("/discover?q=nonexistent"))?.text()).toContain(
      "条件に一致する公開ノートはありません",
    );
    expect((await get("/discover?q=x"))?.status).toBe(422);
    expect((await get("/@missing"))?.status).toBe(404);
    c = {
      ...c,
      publicDiscovery: {
        async execute() {
          throw new SystemError(SystemErrorCode.PublicSearchBusy, "busy");
        },
        async stop() {},
      },
    };
    const busy = await get("/discover");
    expect(busy?.status).toBe(503);
    expect(busy?.headers.get("retry-after")).toBe("3");
    expect(await busy?.text()).not.toContain("公開ノート 0 件");
  });
  it("uses fixed browser windows under concurrent requests without denial extension", async () => {
    const responses = await Promise.all(
      Array.from({ length: 31 }, () => get("/discover")),
    );
    expect(responses.filter((r) => r?.status === 200)).toHaveLength(30);
    expect(responses.filter((r) => r?.status === 429)).toHaveLength(1);
    now = new Date(now.getTime() + 59999);
    expect((await get("/discover"))?.headers.get("retry-after")).toBe("1");
    now = new Date(now.getTime() + 1);
    expect((await get("/discover"))?.status).toBe(200);
  });
  it("sitemap uses only global bucket, valid XML and current canonical/handle", async () => {
    const index = await get("/sitemap.xml");
    expect(index?.headers.get("content-type")).toContain("application/xml");
    expect(await index?.text()).toContain("/sitemap/notes/0.xml");
    const leaf = await get("/sitemap/notes/0.xml");
    const xml = await leaf?.text();
    expect(xml).toContain(`/p/${publicId}/1`);
    expect(xml).not.toContain("/document");
    expect(xml).not.toContain("/s/");
    expect(
      (
        await b.client.execute(
          "select count(*) total from public_discovery_rates where kind='browser'",
        )
      ).rows[0]?.total,
    ).toBe(0);
    await b.client.execute({
      sql: "update note_sharing set visibility='private' where note_id=?",
      args: [noteId],
    });
    expect((await get("/sitemap/notes/0.xml"))?.status).toBe(404);
  });
  it("bounds transport and method and does not dispatch media to search", async () => {
    expect(
      await get("/@http-person/icons/00000000-0000-4000-8000-000000000001"),
    ).toBeNull();
    expect((await get("/discover", {}, "POST"))?.status).toBe(405);
    expect((await get("/discover?q=aa&q=bb"))?.status).toBe(422);
    expect((await get("/discover?workerPath=evil"))?.status).toBe(422);
    expect((await get("/sitemap.xml?x=1"))?.status).toBe(404);
    const head = await get("/discover", {}, "HEAD");
    expect(head?.status).toBe(200);
    expect(await head?.text()).toBe("");
    expect(
      (
        await get("/discover", {
          cookie: `hollow_public_browser=${browser}; hollow_public_browser=${browser}`,
        })
      )?.status,
    ).toBe(422);
  });
  it("shows owner banner only for the current unique verified session and leaves public results unchanged", async () => {
    const session = "v".repeat(43);
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [c.tokens.hash(session), account, now.getTime() + 1000],
    });
    const cookie = `hollow_public_browser=${browser}; hollow_session=${session}`;
    const owner = await get("/@http-person", { cookie });
    expect(await owner?.text()).toContain("これは外部向けの公開ページです");
    const duplicate = await get("/@http-person", {
      cookie: `${cookie}; hollow_session=${session}`,
    });
    const duplicateBody = await duplicate?.text();
    expect(duplicateBody).not.toContain("外部向けの公開表示");
    expect(duplicateBody).toContain("公開ノート 1 件");
    now = new Date(now.getTime() + 1000);
    const expired = await get("/@http-person", { cookie });
    const body = await expired?.text();
    expect(body).not.toContain("外部向けの公開表示");
    expect(body).toContain("公開ノート 1 件");
    expect(body).not.toContain(c.tokens.hash(session));
  });
});

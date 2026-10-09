import { randomUUID } from "node:crypto";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type {
  PublicDiscoveryConditions,
  PublicDiscoveryScope,
} from "@repo/core/application/publication/ports";
import { createNote } from "@repo/core/domain/note/entity";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectNote } from "../../node/browse/projection";
import { NodeTagNormalizer } from "../../node/browse/tagNormalizer";
import { LibsqlPublicDiscoverySnapshot } from "../publicDiscoverySnapshot";
import { createTestContainer, type TestContainer } from "./helpers";

describe("finite current public discovery snapshot", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let read: LibsqlPublicDiscoverySnapshot;
  let account: string;
  const now = new Date("2026-09-20T00:00:00Z");
  const conditions: PublicDiscoveryConditions = {
    query: "",
    tags: [],
    zone: "Asia/Tokyo",
  };
  beforeEach(async () => {
    b = await createTestContainer();
    account = randomUUID();
    c = createHollowContainer(b.db, "http://localhost", { async send() {} });
    await b.client.execute({
      sql: "insert into accounts(id,email,password_hash,created_at,verified_at) values(?,?,?,?,?)",
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
      args: [account, "public-person", "bio"],
    });
    read = new LibsqlPublicDiscoverySnapshot(
      `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`,
    );
  });
  afterEach(() => b.close());
  async function note(
    title: string,
    html = "<p>東京駅 Cloudflare</p>",
    published = true,
    date = now,
  ) {
    const n = createNote(
      { id: randomUUID(), accountId: account, title, html, text: "" },
      date,
    );
    const id = randomUUID();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.notes.insert(n);
      await u.browseIndex.save(n.id, n.version, projectNote({ title, html }));
      if (published)
        await u.publicNotes.create({
          noteId: n.id,
          publicId: id,
          urlGeneration: 1,
          accessEpoch: 0,
          createdAt: now,
        });
    });
    if (published)
      await b.client.execute({
        sql: "update note_sharing set visibility='public',link_generation=1,token_hash=?,token_envelope=? where note_id=?",
        args: [`synthetic-hash-${id}`, `synthetic-envelope-${id}`, n.id],
      });
    return { ...n, path: `/p/${id}/1` };
  }
  async function page(
    overrides: Partial<PublicDiscoveryConditions> = {},
    scope: PublicDiscoveryScope = { kind: "all" },
  ) {
    const r = await read.read({
      kind: "list",
      scope,
      conditions: { ...conditions, ...overrides },
    });
    if (r.kind !== "list") throw Error();
    return r.page;
  }
  it("filters private rows before count, search, snippet and facets", async () => {
    await note("secret search", "<p>hidden secret</p>", false);
    const visible = await note("公開 title");
    const p = await page({ query: "東京駅 cloud" });
    expect(p.total).toBe(1);
    expect(p.items[0]?.path).toBe(visible.path);
    expect(JSON.stringify(p)).not.toContain("hidden");
    expect(p.items[0]?.excerpt.some((x) => x.match)).toBe(true);
    expect((await page({ query: "secret" })).total).toBe(0);
  });
  it("keeps 50 keyset pages and rejects cursor reuse with other conditions", async () => {
    for (let i = 0; i < 51; i++) await note(`public ${i}`);
    const first = await page();
    expect(first.items).toHaveLength(50);
    const next = await page({ cursor: first.nextCursor ?? "" });
    expect(next.items).toHaveLength(1);
    expect(first.items.some((n) => n.path === next.items[0]?.path)).toBe(false);
    await expect(
      page({ query: "public", cursor: first.nextCursor ?? "" }),
    ).rejects.toMatchObject({ code: "PUBLIC_CURSOR" });
  });
  it("resolves current owner handle and real author independently, never old handle", async () => {
    await note("authored");
    const p = await page({}, { kind: "profile", handle: "public-person" });
    expect(p.owner).toMatchObject({
      title: "表示名未設定",
      description: "bio",
    });
    expect(p.items[0]?.author).toEqual({ kind: "unset" });
    expect(p.items[0]?.authorUrl).toBe("/@public-person");
    await b.client.execute({
      sql: "update account_public_profiles set handle='renamed',version=version+1 where account_id=?",
      args: [account],
    });
    await expect(
      page({}, { kind: "profile", handle: "public-person" }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect((await page({}, { kind: "profile", handle: "renamed" })).total).toBe(
      1,
    );
  });
  it("uses updated half-open civil range and validates timezone/calendar", async () => {
    await note("inside", undefined, true, new Date("2026-09-19T15:00:00Z"));
    await note("outside", undefined, true, new Date("2026-09-20T15:00:00Z"));
    expect(
      (await page({ from: "2026-09-20", until: "2026-09-21" })).items.map(
        (x) => x.title,
      ),
    ).toEqual(["inside"]);
    await expect(page({ from: "2026-02-30" })).rejects.toMatchObject({
      code: "PUBLIC_DATE",
    });
    await expect(page({ zone: "+09:00" })).rejects.toMatchObject({
      code: "PUBLIC_DATE",
    });
  });
  it("selects normalized tag names and excludes private-only tag facets", async () => {
    const n = await note("tags");
    const hidden = await note("private", undefined, false);
    for (const [row, name] of [
      [n, "Ｔｅｓｔ"],
      [hidden, "secret"],
    ] as const) {
      const id = randomUUID();
      await b.client.execute({
        sql: "insert into tags(id,scope_key,name,normalized_key,meaning_version) values(?,?,?,?,?)",
        args: [
          id,
          `p:${account}`,
          name,
          NodeTagNormalizer.key(name),
          NodeTagNormalizer.version,
        ],
      });
      await b.client.execute({
        sql: "insert into note_tags(note_id,tag_id) values(?,?)",
        args: [row.id, id],
      });
    }
    const p = await page({ tags: ["test"] });
    expect(p.total).toBe(1);
    expect(p.items[0]?.tags).toEqual(["Ｔｅｓｔ"]);
    expect((await page()).tags.map((t) => t.name)).toEqual(["Ｔｅｓｔ"]);
  });
  it("sitemaps include only current identities and handles, revoke immediately", async () => {
    const n = await note("visible");
    await note("hidden", undefined, false);
    expect(await read.read({ kind: "sitemap-index" })).toEqual({
      kind: "sitemap-index",
      paths: ["/sitemap/notes/0.xml", "/sitemap/profiles/0.xml"],
    });
    expect(
      await read.read({ kind: "sitemap-leaf", catalogue: "notes", page: 0 }),
    ).toEqual({
      kind: "sitemap-leaf",
      entries: [{ path: n.path, lastmod: now.toISOString() }],
    });
    await b.client.execute({
      sql: "update note_sharing set visibility='private' where note_id=?",
      args: [n.id],
    });
    expect((await page()).total).toBe(0);
    await expect(
      read.read({ kind: "sitemap-leaf", catalogue: "notes", page: 0 }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
  });
  it("missing current projection is preparing failure, never empty success", async () => {
    const n = await note("visible");
    await b.client.execute({
      sql: "delete from note_projections where note_id=?",
      args: [n.id],
    });
    await expect(page()).rejects.toMatchObject({ code: "SEARCH_PREPARING" });
  });
  it("501 current public notes form exact 500 and 1 sitemap leaves without duplicate or truncation", async () => {
    const paths = new Set<string>();
    for (let i = 0; i < 501; i++) paths.add((await note(`leaf ${i}`)).path);
    const index = await read.read({ kind: "sitemap-index" });
    expect(index).toEqual({
      kind: "sitemap-index",
      paths: [
        "/sitemap/notes/0.xml",
        "/sitemap/notes/1.xml",
        "/sitemap/profiles/0.xml",
      ],
    });
    const first = await read.read({
      kind: "sitemap-leaf",
      catalogue: "notes",
      page: 0,
    });
    const last = await read.read({
      kind: "sitemap-leaf",
      catalogue: "notes",
      page: 1,
    });
    if (first.kind !== "sitemap-leaf" || last.kind !== "sitemap-leaf")
      throw Error("leaf");
    expect(first.entries).toHaveLength(500);
    expect(last.entries).toHaveLength(1);
    expect(
      new Set([...first.entries, ...last.entries].map((entry) => entry.path)),
    ).toEqual(paths);
    await expect(
      read.read({ kind: "sitemap-leaf", catalogue: "notes", page: 2 }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
  });
  it("moves current ownership without changing canonical and hides private WS metadata", async () => {
    const n = await note("moved");
    const ws = randomUUID();
    await b.client.execute({
      sql: "insert into workspaces(id,creator_id,name,description,slug,created_at,state) values(?,?,?,?,?,?,'active')",
      args: [
        ws,
        account,
        "private WS name",
        "private description",
        "public-workspace",
        now.getTime(),
      ],
    });
    await b.client.execute({
      sql: "update notes set owner_account_id=null,owner_workspace_id=?,ownership_generation=ownership_generation+1 where id=?",
      args: [ws, n.id],
    });
    expect(
      (await page({}, { kind: "profile", handle: "public-person" })).total,
    ).toBe(0);
    const all = await page();
    expect(all.items[0]?.path).toBe(n.path);
    expect(JSON.stringify(all)).not.toContain("private WS name");
    expect(all.items[0]?.authorUrl).toBe("/@public-person");
    await expect(
      page({}, { kind: "workspace", slug: "public-workspace" }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    await b.client.execute({
      sql: "insert into workspace_public_settings(workspace_id,page_public,version) values(?,1,0)",
      args: [ws],
    });
    expect(
      (await page({}, { kind: "workspace", slug: "public-workspace" })).owner,
    ).toMatchObject({
      title: "private WS name",
      description: "private description",
    });
    await b.client.execute({
      sql: "update workspaces set slug='renamed-workspace',settings_version=settings_version+1 where id=?",
      args: [ws],
    });
    await expect(
      page({}, { kind: "workspace", slug: "public-workspace" }),
    ).rejects.toMatchObject({ code: "PUBLIC_NOT_FOUND" });
    expect(
      (await page({}, { kind: "workspace", slug: "renamed-workspace" }))
        .items[0]?.path,
    ).toBe(n.path);
  });
  it("viewer is display-only and an expiring session is rejected by adoption's current clock", async () => {
    await note("public");
    const url = `file:${String((await b.client.execute("pragma database_list")).rows[0]?.file)}`;
    await b.client.execute({
      sql: "insert into sessions(token_hash,account_id,expires_at) values(?,?,?)",
      args: ["fixture-viewer", account, now.getTime() + 1000],
    });
    const request = {
      kind: "list" as const,
      scope: { kind: "profile" as const, handle: "public-person" },
      conditions,
      viewerSessionHash: "fixture-viewer",
    };
    const stable = await new LibsqlPublicDiscoverySnapshot(url, {
      now: () => now,
    }).read(request);
    expect(stable).toMatchObject({
      kind: "list",
      page: {
        total: 1,
        viewer: {
          kind: "owner",
          settingsUrl: "/settings/profile",
          workUrl: "/notes",
        },
      },
    });
    let checks = 0;
    const expired = await new LibsqlPublicDiscoverySnapshot(url, {
      now: () => new Date(now.getTime() + (checks++ === 0 ? 0 : 1000)),
    }).read(request);
    expect(expired).toMatchObject({
      kind: "list",
      page: { total: 1, viewer: null },
    });
    expect(JSON.stringify(expired)).not.toContain("fixture-viewer");
  });
  it("rate windows persist across repo reconstruction, global cap stays separate and prune removes at most 100", async () => {
    for (let i = 0; i < 102; i++)
      await c.unitOfWorkProvider.run((u) =>
        u.publicDiscoveryRates.reserve(`fixture-${i}`, now),
      );
    const reopened = createHollowContainer(b.db, "http://localhost", {
      async send() {},
    });
    for (let i = 0; i < 29; i++)
      expect(
        await reopened.unitOfWorkProvider.run((u) =>
          u.publicDiscoveryRates.reserve("fixture-0", now),
        ),
      ).toBeNull();
    expect(
      await reopened.unitOfWorkProvider.run((u) =>
        u.publicDiscoveryRates.reserve(
          "fixture-0",
          new Date(now.getTime() + 50000),
        ),
      ),
    ).toEqual(new Date(now.getTime() + 60000));
    await reopened.unitOfWorkProvider.run((u) =>
      u.publicDiscoveryRates.prune(new Date(now.getTime() + 60000)),
    );
    expect(
      (
        await b.client.execute(
          "select count(*) count from public_discovery_rates",
        )
      ).rows[0]?.count,
    ).toBe(3);
    expect(
      await reopened.unitOfWorkProvider.run((u) =>
        u.publicDiscoveryRates.reserve(
          "fixture-0",
          new Date(now.getTime() + 60000),
        ),
      ),
    ).toBeNull();
  });
});

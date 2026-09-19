import type {
  PublicDiscoveryResponse,
  PublicNoteCard,
} from "@repo/core/application/publication/ports";
import { describe, expect, it } from "vitest";
import {
  renderPublicDiscovery,
  renderPublicSitemap,
} from "./publicDiscoveryHtml";

type Page = Extract<PublicDiscoveryResponse, { kind: "list" }>["page"];
const id = "12345678-1234-4123-8123-123456789abc";
const assetId = "22345678-1234-4123-8123-123456789abc";
const anotherId = "32345678-1234-4123-8123-123456789abc";
const card: PublicNoteCard = {
  path: `/p/${id}/1`,
  title: "ノートの題名",
  updatedAt: "2026-09-20T01:02:03.000Z",
  author: { kind: "named", displayName: "作成者" },
  authorUrl: "/@creator",
  titleParts: [
    { text: "ノートの", match: false },
    { text: "題名", match: true },
  ],
  excerpt: [{ text: "現在の本文", match: false }],
  thumbnailUrl: `/p/${id}/1/assets/${assetId}`,
  tags: ["設計", "読み物"],
};
const profileOwner = {
  kind: "profile" as const,
  title: "所有者",
  path: "/@owner",
  description: "現在の自己紹介\n二行目",
  iconUrl: `/@owner/icons/${assetId}`,
  handle: "owner",
};
const page: Page = {
  owner: profileOwner,
  viewer: null,
  items: [card],
  total: 1,
  nextCursor: null,
  tags: [
    { name: "設計", count: 1 },
    { name: "読み物", count: 1 },
  ],
  conditions: { query: "", tags: [], zone: "Asia/Tokyo" },
};
const hrefs = (body: string) =>
  [...body.matchAll(/href="([^"]*)"/g)].map(
    (match) =>
      new URL(
        (match[1] ?? "").replaceAll("&amp;", "&"),
        "https://hollow.example",
      ),
  );

describe("public discovery HTML", () => {
  it("renders current profile data and creator independently of the owner", () => {
    const output = renderPublicDiscovery(page);
    expect(output.title).toBe("所有者");
    expect(output.canonical).toBe("/@owner");
    expect(output.description).toBe(page.owner.description);
    expect(output.body).toContain("現在の自己紹介\n二行目");
    expect(output.body).toContain('href="/@creator">作成者</a>');
    expect(output.body).toContain(
      `<img class="pd-icon" src="/@owner/icons/${assetId}"`,
    );
    expect(output.body).toContain("<mark>題名</mark>");
    expect(output.image).toBe(card.thumbnailUrl);
    expect(output.index).toBe(true);
  });
  it("indexes only the initial profile/workspace page", () => {
    expect(
      renderPublicDiscovery({
        ...page,
        owner: {
          kind: "workspace",
          title: "制作室",
          path: "/w/studio",
          description: "WS紹介",
          iconUrl: null,
          slug: "studio",
        },
      }).index,
    ).toBe(true);
    expect(
      renderPublicDiscovery({
        ...page,
        owner: {
          kind: "all",
          title: "公開ノート",
          path: "/discover",
          description: "全公開",
          iconUrl: null,
        },
      }).index,
    ).toBe(false);
    for (const condition of [
      { query: "本文" },
      { tags: ["設計"] },
      { from: "2026-09-01" },
      { until: "2026-10-01" },
      { cursor: "next-cursor" },
    ]) {
      expect(
        renderPublicDiscovery({
          ...page,
          conditions: { ...page.conditions, ...condition },
        }).index,
      ).toBe(false);
    }
  });
  it("uses the fixed workspace route and current metadata", () => {
    const output = renderPublicDiscovery({
      ...page,
      owner: {
        kind: "workspace",
        title: "制作室",
        path: "/w/studio",
        description: "現在のWS紹介",
        iconUrl: `/w/studio/icons/${assetId}`,
        slug: "studio",
      },
    });
    expect(output.canonical).toBe("/w/studio");
    expect(output.body).toContain('action="/w/studio"');
    expect(output.body).toContain("現在のWS紹介");
    expect(output.body).toContain("ワークスペースの公開ページ");
  });
  it("keeps every filter and all tags in next links but replaces the cursor", () => {
    const conditions = {
      query: '本文 "&<',
      tags: ["設計", "a&b"],
      from: "2026-09-01",
      until: "2026-10-01",
      zone: "Asia/Tokyo",
      cursor: "old",
    };
    const output = renderPublicDiscovery({
      ...page,
      conditions,
      nextCursor: "new&cursor=2",
    });
    const nextMatch = /rel="next" href="([^"]*)"/.exec(output.body);
    expect(nextMatch).not.toBeNull();
    const next = new URL(
      (nextMatch?.[1] ?? "").replaceAll("&amp;", "&"),
      "https://hollow.example",
    );
    expect(next.pathname).toBe("/@owner");
    expect(next.searchParams.get("q")).toBe(conditions.query);
    expect(next.searchParams.getAll("tag")).toEqual(conditions.tags);
    expect(next.searchParams.get("from")).toBe(conditions.from);
    expect(next.searchParams.get("until")).toBe(conditions.until);
    expect(next.searchParams.get("zone")).toBe(conditions.zone);
    expect(next.searchParams.get("cursor")).toBe("new&cursor=2");
    expect(output.body).toContain("同じ条件の最初のページ");
  });
  it("preserves query/date/zone in facets and removes a stale cursor", () => {
    const output = renderPublicDiscovery({
      ...page,
      conditions: {
        ...page.conditions,
        query: "本文",
        tags: ["設計"],
        from: "2026-09-01",
        until: "2026-10-01",
        cursor: "old",
      },
    });
    const added = hrefs(output.body).find(
      (url) => url.searchParams.getAll("tag").join(",") === "設計,読み物",
    );
    expect(added?.searchParams.get("q")).toBe("本文");
    expect(added?.searchParams.get("from")).toBe("2026-09-01");
    expect(added?.searchParams.get("until")).toBe("2026-10-01");
    expect(added?.searchParams.get("zone")).toBe("Asia/Tokyo");
    expect(added?.searchParams.has("cursor")).toBe(false);
    expect(output.body).toContain("解除: #設計");
  });
  it("provides native GET fields, multiple selected tags and half-open date labels", () => {
    const output = renderPublicDiscovery({
      ...page,
      conditions: {
        ...page.conditions,
        tags: ["設計", "索引候補外の選択"],
        from: "2026-09-01",
        cursor: "old",
      },
    });
    expect(output.body).toContain('method="get" action="/@owner"');
    for (const field of ["q", "tag", "from", "until", "zone"])
      expect(output.body).toContain(`name="${field}"`);
    expect(output.body).toContain('value="設計" checked');
    expect(output.body).toContain('value="索引候補外の選択" checked');
    expect(output.body).not.toContain('name="cursor"');
    expect(output.body).toContain("開始日（当日を含む）");
    expect(output.body).toContain("終了日（当日を含まない）");
    expect(output.body).toContain("1ページ最大50件");
  });
  it("distinguishes an empty public profile, no matches, and an empty cursor page", () => {
    const empty = renderPublicDiscovery({
      ...page,
      total: 0,
      items: [],
      tags: [],
    });
    expect(empty.body).toContain("公開ノートはまだありません");
    expect(empty.body).toContain(
      "ワークスペース所有のノートは、この個人の公開ページには並びません",
    );
    const filtered = renderPublicDiscovery({
      ...page,
      total: 0,
      items: [],
      conditions: { ...page.conditions, query: "不存在" },
    });
    expect(filtered.body).toContain("条件に一致する公開ノートはありません");
    expect(filtered.body).toContain("条件を緩めてください");
    const ended = renderPublicDiscovery({
      ...page,
      total: 5,
      items: [],
      conditions: { ...page.conditions, cursor: "old" },
    });
    expect(ended.body).toContain("公開ノート 5 件");
    expect(ended.body).toContain("この続きに表示できるノートはありません");
    expect(ended.body).not.toContain("条件に一致する公開ノートはありません");
  });
  it.each([
    [{ kind: "unset" } as const, "表示名未設定"],
    [{ kind: "deleted" } as const, "退会した利用者"],
    [{ kind: "unknown" } as const, "作成者不明"],
  ])("renders the author state %j without substituting the page owner", (author, label) => {
    const output = renderPublicDiscovery({
      ...page,
      items: [{ ...card, author }],
    });
    expect(output.body).toContain(label);
    if (author.kind !== "unset")
      expect(output.body).not.toContain('href="/@creator"');
  });
  it("escapes all variable text and attributes, including highlighted content", () => {
    const payload = '<img src=x onerror="bad()">&\'';
    const output = renderPublicDiscovery({
      ...page,
      owner: { ...profileOwner, title: payload, description: payload },
      items: [
        {
          ...card,
          titleParts: [{ text: payload, match: true }],
          excerpt: [{ text: payload, match: false }],
          author: { kind: "named", displayName: payload },
          tags: [payload],
        },
      ],
      tags: [{ name: payload, count: 1 }],
      conditions: { ...page.conditions, query: payload, tags: [payload] },
    });
    expect(output.body).not.toContain(payload);
    expect(output.body).toContain(
      "&lt;img src=x onerror=&quot;bad()&quot;&gt;&amp;&#39;",
    );
    expect(output.body).not.toContain("<script");
    expect(output.body).not.toContain('onerror="bad()"');
    expect(output.title).toBe(payload);
  });
  it.each([
    "//evil.example/x",
    "https://evil.example/x",
    "javascript:alert(1)",
    "/api/notes/private",
    `/p/${id}/2`,
    `/p/${id}/1/document`,
    `/p/${id}/1?secret=1`,
    `/p/${id}/1#fragment`,
    `/p/${id}/1/../1`,
    `/p/${id}/1\n`,
  ])("refuses invalid required note path %s", (path) => {
    expect(() =>
      renderPublicDiscovery({ ...page, items: [{ ...card, path }] }),
    ).toThrow("Invalid public discovery response");
  });
  it("refuses a page whose route does not match its owner identity", () => {
    expect(() =>
      renderPublicDiscovery({
        ...page,
        owner: { ...profileOwner, path: "/@other-owner" },
      }),
    ).toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "//evil.example/image",
    "https://evil.example/image",
    "data:image/png;base64,AA==",
    `/api/profile/icons/${assetId}`,
    `/p/${anotherId}/1/assets/${assetId}`,
    `/p/${id}/1/assets/${assetId}?x=1`,
    `/p/${id}/1/assets/${assetId}\n`,
  ])("omits an unsafe or differently bound thumbnail %s", (thumbnailUrl) => {
    const output = renderPublicDiscovery({
      ...page,
      owner: { ...profileOwner, iconUrl: null },
      items: [{ ...card, thumbnailUrl }],
    });
    expect(output.image).toBeNull();
    expect(output.body).not.toContain('<img class="pd-thumbnail"');
    expect(output.body).toContain("現在の本文");
  });
  it("omits private/different profile icons and unsafe author links", () => {
    const output = renderPublicDiscovery({
      ...page,
      owner: { ...profileOwner, iconUrl: `/@another/icons/${assetId}` },
      items: [
        {
          ...card,
          thumbnailUrl: null,
          authorUrl: "https://evil.example/author",
        },
      ],
    });
    expect(output.image).toBeNull();
    expect(output.body).not.toContain('<img class="pd-icon"');
    expect(output.body).not.toContain("evil.example");
    expect(output.body).toContain("著者: 作成者");
  });
  it("falls back only to the current owner icon for metadata", () => {
    expect(
      renderPublicDiscovery({
        ...page,
        items: [{ ...card, thumbnailUrl: null }],
      }).image,
    ).toBe(page.owner.iconUrl);
  });
  it("rejects overfull pages rather than silently truncating", () => {
    expect(() =>
      renderPublicDiscovery({
        ...page,
        items: Array.from({ length: 51 }, () => card),
        total: 51,
      }),
    ).toThrow();
  });
});

describe("public sitemap XML", () => {
  it("renders a leaf with absolute loc and only supplied lastmod", () => {
    const xml = renderPublicSitemap(
      {
        kind: "sitemap-leaf",
        entries: [
          { path: card.path, lastmod: card.updatedAt },
          { path: "/@owner", lastmod: null },
          { path: "/w/studio", lastmod: null },
        ],
      },
      "https://hollow.example:8443/",
    );
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(`<loc>https://hollow.example:8443${card.path}</loc>`);
    expect(xml).toContain(`<lastmod>${card.updatedAt}</lastmod>`);
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(xml).toContain("<urlset xmlns=");
    expect(xml.endsWith("</urlset>")).toBe(true);
  });
  it("renders the fixed catalogue index paths including zero", () => {
    const xml = renderPublicSitemap(
      {
        kind: "sitemap-index",
        paths: [
          "/sitemap/notes/0.xml",
          "/sitemap/profiles/1.xml",
          "/sitemap/workspaces/2.xml",
        ],
      },
      "http://localhost:3000",
    );
    expect(xml).toContain("<sitemapindex xmlns=");
    expect(xml).toContain(
      "<loc>http://localhost:3000/sitemap/notes/0.xml</loc>",
    );
    expect(xml.endsWith("</sitemapindex>")).toBe(true);
  });
  it("XML-escapes URL characters instead of interpolating markup", () => {
    const xml = renderPublicSitemap(
      { kind: "sitemap-index", paths: ["/sitemap/notes/0.xml"] },
      "https://a&b.example",
    );
    expect(xml).toContain("https://a&amp;b.example/sitemap/notes/0.xml");
    expect(xml).not.toContain("a&b.example");
  });
  it.each([
    "ftp://example.test",
    "javascript:alert(1)",
    "//example.test",
    "https://user:pass@example.test",
    "https://example.test/base",
    "https://example.test/?x=1",
    "https://example.test/#x",
    "https://example.test/\n",
    "https:\\example.test",
  ])("rejects non-origin appUrl %s", (appUrl) => {
    expect(() =>
      renderPublicSitemap({ kind: "sitemap-index", paths: [] }, appUrl),
    ).toThrow();
  });
  it.each([
    "/discover",
    "/s/token",
    "/api/notes/private",
    `/p/${id}/1/document`,
    `/p/${id}/1/assets/${assetId}`,
    "/@owner?tag=x",
    "https://evil.example/@owner",
    "//evil.example/@owner",
    "/@owner\n",
  ])("rejects a non-canonical leaf path %s", (path) => {
    expect(() =>
      renderPublicSitemap(
        { kind: "sitemap-leaf", entries: [{ path, lastmod: null }] },
        "https://hollow.example",
      ),
    ).toThrow();
  });
  it.each([
    "/sitemap.xml",
    "/sitemap/notes/-1.xml",
    "/sitemap/notes/01.xml",
    "/sitemap/notes/9007199254740992.xml",
    "/sitemap/notes/1.xml?x=1",
    "/sitemap/notes/1.xml/extra",
    "//evil.example/map.xml",
    "/sitemap/notes/0.xml\n",
  ])("rejects invalid index path %s", (path) => {
    expect(() =>
      renderPublicSitemap(
        { kind: "sitemap-index", paths: [path] },
        "https://hollow.example",
      ),
    ).toThrow();
  });
  it.each([
    "2026-02-30T00:00:00.000Z",
    "2026-13-01T00:00:00.000Z",
    "2026-09-20T00:00:00Z</lastmod><x>",
    "not-a-date",
    "2026-09-20T00:00:00Z\n",
  ])("rejects invalid lastmod %s", (lastmod) => {
    expect(() =>
      renderPublicSitemap(
        { kind: "sitemap-leaf", entries: [{ path: card.path, lastmod }] },
        "https://hollow.example",
      ),
    ).toThrow();
  });
  it("allows 500 leaf entries and 50,000 index entries, refusing overflow", () => {
    const entries = Array.from({ length: 500 }, () => ({
      path: card.path,
      lastmod: null,
    }));
    expect(
      renderPublicSitemap(
        { kind: "sitemap-leaf", entries },
        "https://hollow.example",
      ).match(/<url>/g),
    ).toHaveLength(500);
    expect(() =>
      renderPublicSitemap(
        {
          kind: "sitemap-leaf",
          entries: [...entries, { path: card.path, lastmod: null }],
        },
        "https://hollow.example",
      ),
    ).toThrow("配信設定");
    const paths = Array.from(
      { length: 50_000 },
      (_, index) => `/sitemap/notes/${index}.xml`,
    );
    expect(
      renderPublicSitemap(
        { kind: "sitemap-index", paths },
        "https://hollow.example",
      ).match(/<sitemap>/g),
    ).toHaveLength(50_000);
    expect(() =>
      renderPublicSitemap(
        {
          kind: "sitemap-index",
          paths: [...paths, "/sitemap/notes/50000.xml"],
        },
        "https://hollow.example",
      ),
    ).toThrow("配信設定");
  });
  it("refuses an actual UTF-8 XML output exceeding 50 MiB rather than returning a prefix", () => {
    const paths = Array.from(
      { length: 50_000 },
      (_, index) => `/sitemap/notes/${index}.xml`,
    );
    const appUrl = `https://${"a".repeat(1100)}.example`;
    expect(() =>
      renderPublicSitemap({ kind: "sitemap-index", paths }, appUrl),
    ).toThrow("配信設定");
  });
});

import type {
  ExportDocumentInput,
  ExportDocumentPlan,
} from "@repo/core/application/export/document";
import { marked } from "marked";
import { describe, expect, it } from "vitest";
import { exportFilename } from "./filename";
import { planExportDocument } from "./plan";

const input = (
  overrides: Partial<ExportDocumentInput> = {},
): ExportDocumentInput => ({
  noteId: "note-123",
  title: "文書",
  html: "<p>本文</p>",
  style: "original",
  defaultCss: "p{color:navy}",
  appUrl: "https://hollow.example/",
  format: "html",
  media: [],
  external: { images: [], media: [], backgrounds: [], fonts: [] },
  ...overrides,
});
const materialize = (plan: ExportDocumentPlan) =>
  plan.segments
    .map((segment) =>
      segment.kind === "text" ? segment.value : "data:image/png;base64,YWJj",
    )
    .join("");

describe("export document plan", () => {
  it.each([
    "html",
    "markdown",
  ] as const)("separates safe export notices from user content in %s", (format) => {
    const plan = planExportDocument(
      input({
        format,
        html: '<p>本文のまま</p><img src="/internal-unavailable"><img src="https://external.example/safe.png">',
        external: {
          images: ["https://external.example/safe.png"],
          media: [],
          backgrounds: [],
          fonts: [],
        },
      }),
    );
    const output = materialize(plan);
    expect(output).toContain("本文のまま");
    expect(output).toContain("書き出しについて");
    expect(output).toContain(
      "未取得または許可されていない媒体参照を除去しました。",
    );
    expect(output).toContain(
      "後日の変更やオフライン時の表示は保証されません。",
    );
    expect(output).not.toContain("/internal-unavailable");
    expect(plan.maxBytes).toBe(Buffer.byteLength(output));
  });
  it("produces one safe UTF-8 HTML document and exact bytes", () => {
    const plan = planExportDocument(
      input({
        title: '<安全> & "文書"',
        html: '<h1>題名</h1><p>本文<script>bad()</script><img src="javascript:bad()" onerror="bad()"></p>',
      }),
    );
    const html = materialize(plan);
    expect(html).toContain('<!doctype html><html><head><meta charset="utf-8">');
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("&lt;安全&gt; &amp; &quot;文書&quot;");
    expect(html).not.toMatch(/<script|onerror|javascript:|bad\(\)/);
    expect(plan.maxBytes).toBe(Buffer.byteLength(html));
    expect(plan.mime).toBe("text/html; charset=utf-8");
  });
  it("keeps ordinary links, relative pages, fragments and token-shaped user text", () => {
    const html = materialize(
      planExportDocument(
        input({
          html: '<p>https://hollow.example/s/user-written-token</p><a href="/s/user-written-token">link</a><a href="#part">part</a><a href="mailto:a@example.com">mail</a><a href="javascript:x">bad</a>',
        }),
      ),
    );
    expect(html).toContain(
      'href="https://hollow.example/s/user-written-token"',
    );
    expect(html).toContain('href="#part"');
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain("https://hollow.example/s/user-written-token</p>");
    expect(html).not.toContain("javascript:");
  });
  it("counts each image, poster, srcset, background and font slot without base64", () => {
    const plan = planExportDocument(
      input({
        html: '<style>@font-face{font-family:test;src:url(/asset)}p{background:url(/asset)}</style><p><img src="/asset" srcset="/asset 1x, /asset 2x"><video poster="/asset"></video></p>',
        media: [{ id: "image", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    expect(
      plan.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(6);
    expect(JSON.stringify(plan.segments)).not.toContain("YWJj");
    expect(plan.maxBytes).toBe(Buffer.byteLength(materialize(plan)));
  });
  it("removes unapproved/internal media and permits only category-approved external media", () => {
    const html = materialize(
      planExportDocument(
        input({
          html: '<img src="/api/history/a"><img src="/s/secret/assets/a"><img src="https://cdn.example/a"><video src="https://cdn.example/a"></video><style>p{background:url(https://blocked.example/x)}</style>',
          external: {
            images: ["https://cdn.example/a"],
            media: [],
            backgrounds: [],
            fonts: [],
          },
        }),
      ),
    );
    expect(html).toContain('src="https://cdn.example/a"');
    expect(html).not.toMatch(
      /api\/history|\/s\/secret|blocked\.example|<video src/,
    );
  });
  it("never accepts uninspected data URI and accepts inspected slots", () => {
    expect(() =>
      planExportDocument(
        input({ html: '<img src="data:image/png;base64,YWJj">' }),
      ),
    ).toThrow(/画像/);
    const plan = planExportDocument(
      input({
        html: '<img src="data:image/png;base64,YWJj">',
        media: [
          {
            id: "inline",
            url: "data:image/png;base64,YWJj",
            mime: "image/png",
            bytes: 3,
          },
        ],
      }),
    );
    expect(
      plan.segments.some(
        (segment) => segment.kind === "media" && segment.id === "inline",
      ),
    ).toBe(true);
  });
  it("selects current default/original styles and rejects unsafe CSS", () => {
    const source =
      '<style>p{color:red;background:url(javascript:bad)}</style><p style="color:green;behavior:url(https://bad.example)">hello</p>';
    const original = materialize(planExportDocument(input({ html: source })));
    expect(original).toContain("color:red");
    expect(original).toContain("color:green");
    expect(original).not.toMatch(/behavior|javascript/);
    const fallback = materialize(
      planExportDocument(input({ html: source, style: "default" })),
    );
    expect(fallback).toContain("color:navy");
    expect(fallback).not.toMatch(/color:red|color:green/);
  });
  it("does not confuse user text, attributes or CSS content with generated slots", () => {
    const collision = "https://hollow-export-0.invalid/slot/0/end";
    const plan = planExportDocument(
      input({
        title: collision,
        html: `<p title="${collision}">${collision}</p><style>p::before{content:"${collision}"}</style><img src="/asset">`,
        defaultCss: collision,
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    expect(
      plan.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(1);
    expect(materialize(plan)).toContain(collision);
  });
  it("escapes Markdown text/code/links and retains unsupported safe HTML", () => {
    const md = materialize(
      planExportDocument(
        input({
          format: "markdown",
          html: '<h2>Title</h2><p>[text] *literal* &lt;b&gt; <strong>bold</strong> <a href="https://example.com/a(b)?x=1&amp;y=2" title="a &quot;quote&quot;">link</a></p><pre><code>a```b\nc</code></pre><table><tr><td>cell</td></tr></table>',
        }),
      ),
    );
    expect(md).toContain("## Title");
    expect(md).toContain("\\[text\\] \\*literal\\* \\<b\\>");
    expect(md).toContain("**bold**");
    expect(md).toContain("https://example.com/a(b)?x=1&amp;y=2");
    expect(md).toContain("````\na```b\nc\n````");
    expect(md).toContain("<table>");
  });
  it("shares Markdown image definitions and avoids user label collisions", () => {
    const plan = planExportDocument(
      input({
        format: "markdown",
        html: '<p>hollow-asset-1<img src="/asset" alt="[image]"><img src="/asset" alt="again"></p>',
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    const md = materialize(plan);
    expect(md).toContain("![\\[image\\]][hollow-asset-2]");
    expect(md).toContain("![again][hollow-asset-2]");
    expect(
      plan.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(1);
    expect(plan.maxBytes).toBe(Buffer.byteLength(md));
  });
  it("keeps attributed images and picture as safe HTML with media slots", () => {
    const plan = planExportDocument(
      input({
        format: "markdown",
        html: '<img src="/asset" width="20"><picture><source srcset="/asset 1x"><img src="/asset"></picture>',
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    expect(materialize(plan)).toContain('width="20"');
    expect(materialize(plan)).toContain("<picture>");
    expect(
      plan.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(3);
  });
  it("keeps the existing byte boundary without new node/depth rejection and rejects unsafe expansion", () => {
    expect(() =>
      planExportDocument(input({ html: "あ".repeat(280_000) })),
    ).toThrow();
    expect(() =>
      planExportDocument(
        input({ html: `${"<i>".repeat(130)}x${"</i>".repeat(130)}` }),
      ),
    ).not.toThrow();
    expect(() =>
      planExportDocument(input({ html: "<br>".repeat(10_001) })),
    ).not.toThrow();
    expect(() =>
      planExportDocument(
        input({
          html: '<img src="/x">',
          media: [
            {
              id: "m",
              url: "/x",
              mime: "image/png",
              bytes: Number.MAX_SAFE_INTEGER,
            },
          ],
        }),
      ),
    ).toThrow();
  });
  it("serializes deep fallback HTML and dense legal documents without recursive stack growth", () => {
    const depth = 800;
    const html = `${"<section>".repeat(depth)}deep${"</section>".repeat(depth)}`;
    for (const format of ["html", "markdown"] as const) {
      const plan = planExportDocument(input({ html, format }));
      const output = materialize(plan);
      expect(output).toContain("deep");
      expect(output.match(/<section>/g)?.length).toBe(depth);
    }
    const dense = planExportDocument(input({ html: "<br>".repeat(15000) }));
    expect(materialize(dense).match(/<br>/g)?.length).toBe(15000);
  });
  it("handles empty title, path/CRLF, reserved names and bounded Unicode filenames", () => {
    expect(exportFilename("... ", "note-123", "html")).toBe("note-123.html");
    expect(exportFilename("CON", "n", "markdown")).toBe("_CON.md");
    expect(exportFilename("a\r\nb/../c\\d", "n", "html")).not.toMatch(
      /[\r\n/\\]/,
    );
    expect(
      Buffer.byteLength(exportFilename("😀".repeat(100), "n", "html")),
    ).toBeLessThanOrEqual(185);
  });
  it("does not double-encode URL percents or reinterpret literal text entities", () => {
    const md = materialize(
      planExportDocument(
        input({
          format: "markdown",
          html: '<p>&amp;copy; &amp;#60; A<span>B</span>C <a href="https://example.com/%E3%81%82?x=1&amp;copy;=2">link</a><code> </code><strong> spaced </strong></p>',
        }),
      ),
    );
    const rendered = marked.parse(md, { async: false });
    expect(rendered).toContain("&amp;copy; &amp;#60;");
    expect(rendered).toContain("A<span>B</span>C");
    expect(rendered).toContain("/%E3%81%82?x=1&amp;copy;=2");
    expect(rendered).toContain("<code> </code>");
    expect(rendered).toContain("<strong> spaced </strong>");
  });
  it("does not replace marker-shaped user text formed by sanitizing or Markdown conversion", () => {
    const collision = "https://hollow-export-0.invalid/slot/0/end";
    const html = planExportDocument(
      input({
        html: '<p>https://hollow-export-<script>discard()</script>0.invalid/slot/0/end</p><img src="/asset">',
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    expect(materialize(html)).toContain(collision);
    expect(
      html.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(1);
    const md = planExportDocument(
      input({
        format: "markdown",
        html: '<pre><code>https://hollow-export-</code><code>0.invalid/slot/0/end</code></pre><img src="/asset">',
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes: 3 }],
      }),
    );
    expect(materialize(md)).toContain(collision);
    expect(
      md.segments.filter((segment) => segment.kind === "media"),
    ).toHaveLength(1);
  });
  it.each([
    0, 1, 2, 3, 4, 5, 6, 7,
  ])("counts base64 expansion exactly for %i media bytes", (bytes) => {
    const plan = planExportDocument(
      input({
        html: '<img src="/asset"><img src="/asset">',
        media: [{ id: "m", url: "/asset", mime: "image/png", bytes }],
      }),
    );
    const actual = plan.segments
      .map((segment) =>
        segment.kind === "text"
          ? segment.value
          : `data:image/png;base64,${Buffer.alloc(bytes).toString("base64")}`,
      )
      .join("");
    expect(plan.maxBytes).toBe(Buffer.byteLength(actual));
  });
});

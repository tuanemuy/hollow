import { describe, expect, it } from "vitest";
import { NodeHtmlSanitizer } from "../htmlSanitizer";
import { parseHtml } from "./htmlDocument";
import { NodeReferenceProcessor } from "./referenceProcessor";

const processor = new NodeReferenceProcessor();
const image =
  "/api/notes/12345678-1234-4123-8123-123456789abc/assets/12345678-1234-4123-8123-123456789def";
describe("reference document preparation and replacement", () => {
  it("canonicalizes a mixed-case data scheme before candidate classification", () => {
    const result = processor.prepare('<img src="DaTa:image/png;base64,YQ==">');
    expect(result.candidates).toContainEqual({
      url: "data:image/png;base64,YQ==",
      kind: "image",
      location: "img[0]@src",
    });
    expect(result.html).toContain('src="data:image/png;base64,YQ=="');
  });
  it("extracts only bounded stylesheet markers, retaining empty CSS and final bases", () => {
    expect(
      processor.styles(
        '<style>.plain{color:red}</style><style data-hollow-stylesheet="theme.css"></style><style data-hollow-stylesheet="https://origin.test/a.css" data-hollow-stylesheet-base="https://cdn.test/path/a.css">p{color:blue}</style><div data-hollow-stylesheet="ignored.css">bad</div>',
      ),
    ).toEqual([
      { url: "theme.css", css: "", finalUrl: "theme.css", materialized: false },
      {
        url: "https://origin.test/a.css",
        css: "p{color:blue}",
        finalUrl: "https://cdn.test/path/a.css",
        materialized: true,
      },
    ]);
    expect(
      processor.styles(
        '<style data-hollow-stylesheet="theme.css" data-hollow-stylesheet-base="bundle:dir/theme.css">p{color:red}</style>',
      )[0]?.finalUrl,
    ).toBe("bundle:dir/theme.css");
    expect(
      processor.styles(
        '<style data-hollow-stylesheet="javascript:alert(1)">p{color:red}</style>',
      ),
    ).toEqual([]);
    expect(() => processor.styles("x".repeat(800 * 1024 + 1))).toThrow();
    expect(
      processor.styles(
        `${"<i></i>".repeat(10_001)}<style data-hollow-stylesheet="x.css"></style>`,
      ),
    ).toEqual([]);
  });
  it("retains off/failed stylesheet markers and canonical media candidates", () => {
    const result = processor.prepare(
      '<link rel="stylesheet" href="styles/a.css"><p>日本語</p><img src="images/a.png"><video src="movie.mp4" poster="poster.png"></video>',
    );
    expect(result.html).toContain('data-hollow-stylesheet="styles/a.css"');
    expect(
      result.candidates.map((candidate) => [candidate.kind, candidate.url]),
    ).toEqual(
      expect.arrayContaining([
        ["stylesheet", "styles/a.css"],
        ["image", "images/a.png"],
        ["video", "movie.mp4"],
        ["image", "poster.png"],
      ]),
    );
    expect(processor.prepare(result.html).candidates).toEqual(
      result.candidates,
    );
  });
  it("embeds stylesheet success in its marker and resolves from redirect final URL", () => {
    const initial =
      '<link rel="stylesheet" href="https://origin.test/a.css"><div class="a">text</div>';
    const result = processor.rewrite(initial, new Map(), [
      {
        url: "https://origin.test/a.css",
        finalUrl: "https://cdn.test/path/a.css",
        css: '.a{background:image-set("../a.png" 1x,url(b.png) 2x)}@font-face{font-family:x;src:url(../font.woff2)}',
      },
    ]);
    expect(result.html).toContain(
      'data-hollow-stylesheet="https://origin.test/a.css"',
    );
    expect(
      result.candidates.map((candidate) => [candidate.kind, candidate.url]),
    ).toEqual(
      expect.arrayContaining([
        ["background", "https://cdn.test/a.png"],
        ["background", "https://cdn.test/path/b.png"],
        ["font", "https://cdn.test/font.woff2"],
      ]),
    );
    expect(processor.prepare(result.html).html).toBe(result.html);
  });
  it("rewrites srcset/picture/source/poster and preserves descriptors", () => {
    const result = processor.rewrite(
      '<picture><source srcset="a.png 1x, b.png 2x"><img src="a.png" srcset="a.png 320w, b.png 640w"></picture><video poster="b.png"><source src="v.mp4"></video>',
      new Map([
        ["a.png", image],
        ["b.png", image],
        ["v.mp4", image],
      ]),
      [],
    );
    expect(result.html).not.toMatch(/(?:a\.png|b\.png|v\.mp4)/);
    expect(result.html).toContain(`${image} 320w`);
    expect(result.html).toContain(`${image} 2x`);
    expect(
      result.candidates.filter((candidate) => candidate.kind === "image"),
    ).toHaveLength(6);
  });
  it("sanitizes before exposing HTML but reports dangerous inputs", () => {
    const result = processor.prepare(
      '<script>alert(1)</script><form action="/logout"><input></form><img src="javascript:alert(1)" onerror="x"><a href="javascript:alert(1)">危険</a>',
    );
    expect(result.html).not.toMatch(/script|onerror|javascript:|<form|<input/);
    expect(result.notices.length).toBeGreaterThan(0);
    expect(
      result.notices.some(
        (notice) =>
          notice.source === "javascript:alert(1)" &&
          notice.code === "REFERENCE_URL",
      ),
    ).toBe(true);
  });
  it("does not allow a stylesheet string to close its HTML style element", () => {
    const result = processor.rewrite(
      '<link rel="stylesheet" href="https://cdn.test/a.css"><p>x</p>',
      new Map(),
      [
        {
          url: "https://cdn.test/a.css",
          finalUrl: "https://cdn.test/a.css",
          css: 'p::after{content:"</style><img src=x onerror=alert(1)>"}',
        },
      ],
    );
    expect(result.html).not.toContain("</style><img");
    expect(
      parseHtml(processor.prepare(result.html).html).elements.some(
        (element) => element.name === "img",
      ),
    ).toBe(false);
  });
  it("decodes binary data URI without UTF-8 string conversion and checks encoding", () => {
    const bytes = Uint8Array.from([0, 255, 127, 200]);
    const uri = processor.encodeDataUri(bytes, "image/png");
    expect(processor.decodeDataUri(uri)).toEqual({ bytes, mime: "image/png" });
    expect(processor.decodeDataUri("data:image/png,%00%FF").bytes).toEqual(
      Uint8Array.from([0, 255]),
    );
    for (const invalid of [
      "data:text/html;base64,PHNjcmlwdD4=",
      "data:image/png;base64,@@@",
      "data:image/png;base64,AAAA=",
      "data:image/png,%zz",
      "data:image/png,",
    ])
      expect(() => processor.decodeDataUri(invalid)).toThrow();
    expect(
      processor.decodeCss(new TextEncoder().encode("/* 日本語 */")),
    ).toContain("日本語");
    expect(() => processor.decodeCss(Uint8Array.of(255))).toThrow();
    expect(() =>
      processor.decodeCss(new Uint8Array(1024 * 1024 + 1)),
    ).toThrow();
  });
});

describe("CSS gate on real HTML and inline declaration sets", () => {
  it.each([
    "0",
    "0px",
    "0px 0px",
    "0.0",
    "0%",
    "-0.0px +0% 0.00px 0",
    "0e0px",
  ])("normalizes equivalent zero %s only for comparison", (inset) => {
    const result = processor.prepare(
      '<style>.x{position:fixed}</style><div class="x" style="inset:' +
        inset +
        ';color:red">x</div>',
    );
    expect(result.html).not.toContain("position:fixed");
    expect(result.html).toContain("color:red");
    expect(
      result.notices.some((notice) => notice.code === "REFERENCE_CSS_OVERLAY"),
    ).toBe(true);
  });
  it.each([
    "100.0vw;height:100.00vh",
    "100.00%;height:1e2%",
    String.raw`100.0V\57;height:100.00VH`,
  ])("normalizes equivalent viewport/percentage dimensions %s", (dimensions) => {
    const result = processor.prepare(
      "<style>.x{position:absolute;width:" +
        dimensions +
        '}</style><div class="x">x</div>',
    );
    expect(result.html).not.toContain("position:absolute");
  });
  it("combines child/descendant/id/compound selectors and keeps distinct targets apart", () => {
    const combined = processor.prepare(
      '<style>#parent > .x{position:absolute}section .fill{inset:0}</style><section id="parent"><p class="x fill">x</p></section>',
    );
    expect(combined.html).not.toContain("position:absolute");
    const distinct = processor.prepare(
      '<style>.x{position:absolute;top:8px;left:12px;width:120.0px;height:24.00px;transform:translateX(2.0px)}.fill{inset:0;display:grid}.row{display:flex;--ink:red;color:var(--ink)}</style><div class="fill"><p class="x">caption</p><p class="row">row</p></div>',
    );
    expect(distinct.html).toContain("position:absolute");
    expect(distinct.html).toContain("width:120.0px");
    expect(distinct.html).toContain("translateX(2.0px)");
    expect(distinct.notices).toHaveLength(0);
  });
  it("does not hide dangerous earlier declarations behind later non-important values", () => {
    const result = processor.prepare(
      '<style>.x{position:fixed!important;position:relative}.x{inset:0}</style><p class="x">x</p>',
    );
    expect(result.html).not.toContain("position:");
  });
  it("explicitly records conservative loss for valid local inset-zero and overridden rules", () => {
    for (const css of [
      ".x{position:absolute;inset:0}",
      ".x{position:fixed;position:relative;inset:0}",
    ]) {
      const result = processor.prepare(
        "<style>.parent{position:relative;width:120px;height:24px}" +
          css +
          '</style><div class="parent"><p class="x">caption</p></div>',
      );
      expect(
        result.notices.some(
          (notice) => notice.code === "REFERENCE_CSS_OVERLAY",
        ),
      ).toBe(true);
      expect(result.html).not.toContain("inset:0");
    }
  });
  it("drops dynamic placement, unknown selectors, temporal and root/nested unknown syntax", () => {
    const result = processor.prepare(
      '<style>???;@unknown x{p{position:fixed}}.x{position:var(--p,absolute);bottom:calc(1px);inset:0;--ink:red;color:var(--ink)}.x:hover{position:absolute;color:blue}.x{& .y{position:fixed}animation:move 1s} @media screen{@import "hidden.css";???;} </style><p class="x">x</p>',
    );
    expect(result.html).not.toMatch(
      /position:|bottom:|animation:|@unknown|@import|\?\?\?/,
    );
    expect(result.html).toContain("--ink:red;color:var(--ink)");
    expect(result.html).toContain("color:blue");
    expect(result.notices.length).toBeGreaterThan(3);
  });
  it("merges conditional branches conservatively and rejects escaped import/Raw URL functions", () => {
    const result = processor.prepare(
      String.raw`<style>@\69mport "a.css";@media screen{.x{position:fixed}}@supports(display:grid){.x{inset:0}}.x{mask:u\72l(https://private.test/a.svg);color:red}</style><p class="x">x</p>`,
    );
    expect(result.html).not.toMatch(/import|position:|mask:/);
    expect(result.html).toContain("color:red");
    expect(
      result.notices.some((notice) => notice.code === "REFERENCE_CSS_RAW"),
    ).toBe(true);
  });
  it("rejects oversized input but skips decoration without losing body at DOM/CSS/AST/matching limits", () => {
    expect(() => processor.prepare("x".repeat(800 * 1024 + 1))).toThrow();
    for (const input of [
      `${"<div>".repeat(130)}本文${"</div>".repeat(130)}`,
      `${"<br>".repeat(10_001)}本文`,
      `<style>/*${"x".repeat(512 * 1024)}*/</style>本文`,
      `<style>${"p{a:b}".repeat(18_000)}</style><p>本文</p>`,
      "<style>" +
        ".x{position:relative}".repeat(500) +
        "</style>" +
        '<p class="x">本文</p>'.repeat(2000),
    ]) {
      const result = processor.prepare(input);
      expect(result.html).toContain("本文");
      expect(
        result.notices.some((notice) => notice.code === "REFERENCE_CSS_BUDGET"),
      ).toBe(true);
      expect(result.html).not.toContain("position:");
    }
  });
  it("embeds bundle CSS while retaining its unrenderable relative background/font notices", () => {
    const result = processor.rewrite(
      '<link rel="stylesheet" href="styles/a.css"><p>本文</p>',
      new Map(),
      [
        {
          url: "styles/a.css",
          finalUrl: "bundle:folder/styles/a.css",
          css: "p{color:red;background:url(../bg.png)}@font-face{font-family:x;src:url(font.woff2)}",
        },
      ],
    );
    expect(result.html).toContain("color:red");
    expect(
      result.candidates.some(
        (candidate) => candidate.url === "bundle:folder/bg.png",
      ),
    ).toBe(true);
    expect(
      result.notices.some(
        (notice) => notice.code === "REFERENCE_BUNDLE_EXTERNAL",
      ),
    ).toBe(true);
    const rendered = NodeHtmlSanitizer.render(result.html, new Set());
    expect(rendered.html).not.toContain("url(bundle:");
    expect(rendered.html).toContain("color:red");
  });
  it("omits oversized fetched decoration while preserving the body and retryable marker", () => {
    const result = processor.rewrite(
      '<link rel="stylesheet" href="https://cdn.test/a.css"><p>本文</p>',
      new Map(),
      [
        {
          url: "https://cdn.test/a.css",
          finalUrl: "https://cdn.test/a.css",
          css: `/*${"x".repeat(1024 * 1024)}*/`,
        },
      ],
    );
    expect(result.html).toContain("本文");
    expect(result.html).toContain(
      'data-hollow-stylesheet="https://cdn.test/a.css"',
    );
    expect(
      result.notices.some((notice) => notice.code === "REFERENCE_CSS_BUDGET"),
    ).toBe(true);
  });
});

describe("exact render authorization for attributes, responsive media and CSS", () => {
  it("keeps data URI canonical but renders it only after validation authorization", () => {
    const uri = "data:image/png;base64,AP8=";
    const source =
      '<picture><source srcset="' +
      uri +
      ' 1x, https://external.test/image.png 2x"><img src="' +
      uri +
      '"></picture>';
    expect(NodeHtmlSanitizer.sanitize(source).html).toContain(uri);
    expect(NodeHtmlSanitizer.render(source, new Set()).html).not.toContain(uri);
    const rendered = NodeHtmlSanitizer.render(source, new Set([uri]));
    expect(rendered.html).toContain(uri);
    expect(rendered.html).not.toContain("https://external.test");
    expect(rendered.assetUrls).toEqual([uri]);
  });
  it("only renders exact authorized external categories and strips passive CSS requests", () => {
    const source =
      '<style>p{background:image-set("https://ok.test/bg.png" 1x,url(https://private.test/no.png) 2x)}@font-face{font-family:ok;src:url(https://ok.test/font.woff2)}</style><p style="background:url(https://ok.test/bg.png)">x</p><img src="https://ok.test/image.png" srcset="https://ok.test/image.png 1x, https://private.test/image.png 2x"><video src="https://ok.test/movie.mp4" poster="https://private.test/poster.png"></video>';
    const result = NodeHtmlSanitizer.render(source, new Set(), {
      images: ["https://ok.test/image.png"],
      media: ["https://ok.test/movie.mp4"],
      backgrounds: ["https://ok.test/bg.png"],
      fonts: ["https://ok.test/font.woff2"],
    });
    expect(result.html).not.toContain("private.test");
    expect(result.html).toContain("https://ok.test/image.png 1x");
    expect(result.html).toContain("https://ok.test/movie.mp4");
    expect(result.html).toContain("https://ok.test/font.woff2");
    expect(result.externalSources.images).toEqual([
      "https://ok.test/image.png",
    ]);
    expect(NodeHtmlSanitizer.render(source, new Set()).html).not.toContain(
      "https://ok.test/",
    );
  });
  it("keeps canonical links but makes all iframe navigation inert from the first HTML", () => {
    const source =
      '<a href="https://example.com/" target="_top">日本語リンク</a><a href="javascript:alert(1)">no</a><form action="/logout">x</form>';
    expect(NodeHtmlSanitizer.sanitize(source).html).toContain(
      'href="https://example.com/"',
    );
    const result = NodeHtmlSanitizer.render(source, new Set());
    expect(result.html).not.toMatch(/href=|target=|javascript:|<form/);
    expect(result.links).toEqual([
      {
        id: "link-0",
        url: "https://example.com/",
        label: "https://example.com/",
      },
    ]);
  });
});

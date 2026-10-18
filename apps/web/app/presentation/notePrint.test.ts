import { createHash } from "node:crypto";
import { DEFAULT_DOCUMENT_CSS } from "@repo/core/lib/defaultDocumentStyle";
import { describe, expect, it } from "vitest";
import {
  NOTE_PRINT_SCRIPT,
  NOTE_PRINT_SCRIPT_HASH,
  type NotePrintSource,
  notePrintDocument,
  notePrintResponse,
} from "./notePrint";

const origin = "https://hollow.test";
const source: NotePrintSource = {
  title: 'Q3 "plan" <draft>',
  html: '<p>BODY MARKER</p><img src="https://hollow.test/api/notes/n/assets/a" loading="lazy">',
  assetUrls: ["/api/notes/n/assets/a"],
  externalSources: {
    images: ["https://images.example/a.png"],
    media: [],
    backgrounds: [],
    fonts: [],
  },
  displayStyle: "default",
};
const directives = (policy: string) =>
  new Map(
    policy.split(";").map((part) => {
      const [name = "", ...values] = part.trim().split(/\s+/);
      return [name, values.join(" ")] as const;
    }),
  );

describe("note print document", () => {
  it("admits exactly the bundled print script by its hash", () => {
    expect(NOTE_PRINT_SCRIPT_HASH).toBe(
      `sha256-${createHash("sha256").update(NOTE_PRINT_SCRIPT).digest("base64")}`,
    );
    const document = notePrintDocument(source, origin, "/notes/n");
    expect(directives(document.contentSecurityPolicy).get("script-src")).toBe(
      `'${NOTE_PRINT_SCRIPT_HASH}'`,
    );
    const scripts = [...document.html.matchAll(/<script>([^<]*)<\/script>/g)];
    expect(scripts.map((match) => match[1])).toEqual([NOTE_PRINT_SCRIPT]);
    expect(document.html.indexOf("<script>")).toBeLessThan(
      document.html.indexOf("<body>"),
    );
  });

  it("keeps the note body policy and isolates the top-level document", () => {
    const policy = directives(
      notePrintDocument(source, origin, "/notes/n").contentSecurityPolicy,
    );
    expect(policy.get("default-src")).toBe("'none'");
    for (const name of [
      "object-src",
      "frame-src",
      "connect-src",
      "form-action",
      "base-uri",
      "frame-ancestors",
    ])
      expect(policy.get(name)).toBe("'none'");
    expect(policy.get("img-src")).toBe(
      "https://hollow.test/api/notes/n/assets/a https://images.example/a.png",
    );
    expect(policy.get("sandbox")).toBe(
      "allow-same-origin allow-scripts allow-modals",
    );
  });

  it("titles the document after the note and renders the body under a screen-only toolbar", () => {
    const { html } = notePrintDocument(
      source,
      origin,
      '/s/token"><script>x()</script>',
    );
    expect(html).toContain("<title>Q3 &quot;plan&quot; &lt;draft&gt;</title>");
    expect(html).toContain(
      `<style>${DEFAULT_DOCUMENT_CSS}</style><style>@media screen{body{margin-inline:max(24px,calc((100% - 680px) / 2))}}</style></head>`,
    );
    expect(html).toContain(
      '<a href="/s/token&quot;&gt;&lt;script&gt;x()&lt;/script&gt;">ノートに戻る</a>',
    );
    expect(html).toContain('<button type="button">印刷する</button>');
    expect(html).toContain("@media print{:host{display:none!important}}");
    expect(html.indexOf("<hollow-print-bar>")).toBeLessThan(
      html.indexOf("BODY MARKER"),
    );
    expect(html).toContain(`</hollow-print-bar>${source.html}</body>`);
  });

  it("omits the default stylesheet when the note keeps its original display", () => {
    const { html } = notePrintDocument(
      { ...source, displayStyle: "original" },
      origin,
      "/notes/n",
    );
    expect(html).not.toContain(DEFAULT_DOCUMENT_CSS);
    expect(html).toContain("BODY MARKER");
  });

  it.each([
    "",
    "  \n ",
  ])("refuses to print an empty body (%j) without loading media or scripts", (html) => {
    const document = notePrintDocument({ ...source, html }, origin, "/notes/n");
    const policy = directives(document.contentSecurityPolicy);
    expect(policy.get("script-src")).toBe("'none'");
    expect(policy.get("img-src")).toBe("'none'");
    expect(document.html).not.toContain("<script>");
    expect(document.html).not.toContain("印刷する</button>");
    expect(document.html).toContain("本文が空のため印刷できません。");
    expect(document.html).toContain('<a href="/notes/n">ノートに戻る</a>');
  });

  it("answers HEAD without a body and keeps the response private", async () => {
    const response = notePrintResponse(
      new Request("https://hollow.test/notes/n/print", { method: "HEAD" }),
      source,
      origin,
      "/notes/n",
    );
    expect(await response.text()).toBe("");
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    });
    const get = notePrintResponse(
      new Request("https://hollow.test/notes/n/print"),
      source,
      origin,
      "/notes/n",
    );
    expect(await get.text()).toBe(
      notePrintDocument(source, origin, "/notes/n").html,
    );
  });
});

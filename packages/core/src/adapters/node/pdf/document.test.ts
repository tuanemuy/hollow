import {
  PDF_DOCUMENT_PROFILE,
  type PdfDocumentInput,
  type PdfDocumentPlan,
} from "@repo/core/application/pdf/document";
import { describe, expect, it } from "vitest";
import { planPdfDocument } from "./document";

const image = "/api/notes/note-1/assets/image-1";
const base: PdfDocumentInput = {
  noteId: "note-1",
  title: "日本語のノート",
  html: "<h1>保存済み本文</h1>",
  style: "default",
  defaultCss: "body{color:#222}p{line-height:1.7}",
  appUrl: "https://hollow.example",
  media: [],
};
const render = (plan: PdfDocumentPlan) =>
  plan.segments
    .map((segment) =>
      segment.kind === "text" ? segment.value : `[MEDIA:${segment.id}]`,
    )
    .join("");
const plan = (input: Partial<PdfDocumentInput> = {}) =>
  planPdfDocument({ ...base, ...input });

describe("planPdfDocument", () => {
  it("emits a static HTML document and default presentation without body mutation", () => {
    const input = {
      ...base,
      title: '<unsafe & "title">',
      html: '<style>p{color:red}</style><p style="color:blue">日本語 &amp; text</p><table><tr><td>表</td></tr></table><pre><code>let x = 1;</code></pre>',
    };
    const before = JSON.stringify(input);
    const result = planPdfDocument(input);
    const html = render(result);
    expect(result.profile).toBe(PDF_DOCUMENT_PROFILE);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("&lt;unsafe &amp; &quot;title&quot;&gt;");
    expect(html).toContain("body{color:#222}");
    expect(html).not.toContain("color:red");
    expect(html).not.toContain("color:blue");
    expect(html).toContain("<td>表</td>");
    expect(html).toContain("<code>let x = 1;</code>");
    expect(result.mediaIds).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("preserves safe original CSS and registered background/font slots only", () => {
    const font = "/api/notes/note-1/assets/font-1";
    const result = plan({
      style: "original",
      html: `<style>@import 'https://external.example/style';@font-face{font-family:Note;src:url('${font}')}p{color:red;background-image:url('${image}');animation:spin 1s}</style><p style="font-weight:bold">元の装飾</p>`,
      media: [
        { id: "image", url: image, mime: "image/png", bytes: 50 },
        { id: "font", url: font, mime: "font/woff2", bytes: 100 },
      ],
    });
    const html = render(result);
    expect(html).toContain("color:red");
    expect(html).toContain("font-weight:bold");
    expect(html).toContain("[MEDIA:image]");
    expect(html).toContain("[MEDIA:font]");
    expect(html).not.toContain("@import");
    expect(html).not.toContain("animation:");
    expect(html).not.toContain("external.example");
    expect(html).not.toContain("body{color:#222}");
    expect(new Set(result.mediaIds)).toEqual(new Set(["image", "font"]));
  });

  it("uses opaque slots for inspected inline and picture sources without base64", () => {
    const inline = "data:image/png;base64,AA==";
    const result = plan({
      html: `<picture><source srcset="${image} 2x"><img src="${inline}" alt="画像"></picture><img src="${image}">`,
      media: [
        { id: "inline", url: inline, mime: "image/png", bytes: 1 },
        { id: "image", url: image, mime: "image/png", bytes: 999999999999 },
        { id: "unused", url: "/unused", mime: "image/png", bytes: 2 },
      ],
    });
    expect(result.segments.filter((s) => s.kind === "media")).toHaveLength(3);
    expect(new Set(result.mediaIds)).toEqual(new Set(["inline", "image"]));
    expect(render(result)).not.toContain("base64");
    expect(render(result)).not.toContain(image);
    expect(render(result)).not.toContain("hollow-pdf-plan-");
  });

  it("replaces video with its current image poster and static notice", () => {
    const result = plan({
      html: `<video src="/video" poster="${image}" autoplay controls width="320"><source src="/video">利用者の説明</video>`,
      media: [
        { id: "poster", url: image, mime: "image/png", bytes: 10 },
        { id: "video", url: "/video", mime: "video/mp4", bytes: 100 },
      ],
    });
    const html = render(result);
    expect(html).toContain("[MEDIA:poster]");
    expect(html).toContain("利用者の説明");
    expect(html).toContain("PDFには映像を収録していません");
    expect(html).not.toMatch(/<(video|source)\b/);
    expect(html).not.toContain("/video");
    expect(result.mediaIds).toEqual(["poster"]);
  });

  it("shows video without a permitted poster as a notice without fetching", () => {
    const result = plan({
      html: '<video poster="https://external.example/poster" src="https://external.example/video"></video>',
    });
    expect(render(result)).toContain("PDFには映像を収録していません");
    expect(render(result)).not.toContain("external.example");
    expect(result.mediaIds).toEqual([]);
  });

  it("removes active external/data/file references and unsafe HTML/CSS", () => {
    const result = plan({
      style: "original",
      html: '<script>evil()</script><iframe src="https://external.example/frame"></iframe><form action="https://external.example/form"><input></form><img src="file:///secret" onerror="evil()"><img src="data:image/png;base64,AA=="><img src="https://external.example/image"><p style="background:url(https://external.example/bg);color:green;behavior:url(x)">安全な本文</p>',
    });
    const html = render(result);
    expect(html).not.toMatch(/<(script|iframe|form|input)\b/);
    expect(html).not.toMatch(/onerror|evil\(\)|file:|base64|external\.example/);
    expect(html).toContain("color:green");
    expect(html).toContain("安全な本文");
    expect(result.mediaIds).toEqual([]);
  });

  it("keeps unavailable image descriptions as static text without broken renderer images", () => {
    const result = plan({
      html: '<p>保存本文</p><img src="https://external.example/missing" alt="未取得 &lt;script&gt;説明&lt;/script&gt;"><img alt="元から参照なし"><img src="file:///secret">',
    });
    const html = render(result);
    expect(html).not.toMatch(/<img\b|<script\b|external\.example|file:/);
    expect(html).toContain("保存本文");
    expect(html).toContain("未取得 &lt;script&gt;説明&lt;/script&gt;");
    expect(html).toContain("元から参照なし");
    expect(result.mediaIds).toEqual([]);
    expect(result.notices).toContain(
      "未取得または許可されていない媒体参照を除去しました。",
    );
  });

  it("preserves ordinary links and token-like user text, not javascript links", () => {
    const result = plan({
      html: '<a href="https://example.com/opaque-token">token-like text</a><a href="/notes/ordinary">通常ページ</a><a href="mailto:person@example.com">メール</a><a href="#section">節</a><a href="javascript:evil()">危険な先</a><p>https://127.0.0.1:1234/user-written-text</p>',
    });
    const html = render(result);
    expect(html).toContain('href="https://example.com/opaque-token"');
    expect(html).toContain('href="https://hollow.example/notes/ordinary"');
    expect(html).toContain('href="mailto:person@example.com"');
    expect(html).toContain('href="#section"');
    expect(html).toContain("token-like text");
    expect(html).toContain("https://127.0.0.1:1234/user-written-text");
    expect(html).not.toContain("javascript:");
  });

  it("does not turn user marker-like strings joined by sanitation into slots", () => {
    const userMarker = "https://hollow-pdf-plan-1.invalid/slot/0/end";
    const result = plan({
      html: `<p>https://hollow-pdf-plan-0.invalid/slot/0/end ${userMarker.replace("pdf-plan", "pdf<script>removed</script>-plan")}</p><img src="${image}">`,
      media: [{ id: "image", url: image, mime: "image/png", bytes: 10 }],
    });
    expect(result.segments.filter((s) => s.kind === "media")).toEqual([
      { kind: "media", id: "image" },
    ]);
    expect(render(result)).toContain(userMarker);
  });

  it("keeps deep legal text and more than 200 registered images", () => {
    const media = Array.from({ length: 201 }, (_, i) => ({
      id: `m${i}`,
      url: `/image/${i}`,
      mime: "image/png",
      bytes: 1,
    }));
    const result = plan({
      html: `${"<div>".repeat(160)}深い本文${"</div>".repeat(160)}${media.map((slot) => `<img src="${slot.url}">`).join("")}`,
      media,
    });
    expect(render(result)).toContain("深い本文");
    expect(result.mediaIds).toHaveLength(201);
  });

  it("rejects ambiguous slot IDs and URLs", () => {
    const slot = { id: "a", url: image, mime: "image/png", bytes: 1 };
    expect(() => plan({ media: [slot, { ...slot, url: "/other" }] })).toThrow();
    expect(() => plan({ media: [slot, { ...slot, id: "b" }] })).toThrow();
  });

  it.each([
    ["", "note-1.pdf"],
    ["../CON\r\n/path", ".._CON___path.pdf"],
    ["CON", "_CON.pdf"],
    [" ... ", "note-1.pdf"],
    ["é", "é.pdf"],
  ])("uses a safe PDF filename for %s", (title, filename) => {
    expect(plan({ title }).filename).toBe(filename);
  });

  it("bounds the filename by UTF-8 bytes and sanitizes default CSS", () => {
    const result = plan({
      title: "日".repeat(200),
      defaultCss:
        "@import 'https://external.example';body{color:red;background:url(file:///secret)}",
    });
    expect(Buffer.byteLength(result.filename)).toBeLessThanOrEqual(184);
    expect(result.filename).toMatch(/\.pdf$/);
    expect(render(result)).not.toMatch(/external\.example|file:/);
    expect(render(result)).toContain("color:red");
  });
});

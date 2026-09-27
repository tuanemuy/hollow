import type { LlmVerifiedMedia } from "@repo/core/application/llm/ports";
import { MAX_HTML_BYTES } from "@repo/core/domain/note/entity";
import { describe, expect, it } from "vitest";
import { NodeLlmResultProcessor } from "./resultProcessor";

const processor = new NodeLlmResultProcessor();
const placeholder = "[[hollow-media:00000001-0000-4000-8000-000000000001]]";
const unknown = "[[hollow-media:00000002-0000-4000-8000-000000000002]]";
const assetUrl =
  "/api/notes/00000001-0000-4000-8000-000000000001/assets/00000002-0000-4000-8000-000000000002";
const image: LlmVerifiedMedia = {
  placeholder,
  occurrences: 1,
  assetUrl,
  kind: "image",
};
const invalid = {
  code: "LLM_RESPONSE_INVALID",
  delivery: "possible",
  closed: true,
};
const oversized = {
  code: "LLM_RESOURCE_LIMIT",
  delivery: "possible",
  closed: true,
};
const entity = (value: string) =>
  value.replaceAll("[", "&#91;").replaceAll("]", "&#93;");

describe("NodeLlmResultProcessor", () => {
  it("restores repeated verified images across segments while retaining text order", () => {
    const result = processor.restore(
      [`<p>前${placeholder}中</p>`, `<p>${placeholder}後</p>`],
      [{ ...image, occurrences: 2 }],
    );
    expect(result).toBe(
      `<p>前<img src="${assetUrl}" alt="">中</p>\n<p><img src="${assetUrl}" alt="">後</p>`,
    );
  });

  it("restores a verified video and entity-encoded marker as elements, not generated URLs", () => {
    expect(
      processor.restore(
        [`<p>${entity(placeholder)}</p>`],
        [{ ...image, kind: "video" }],
      ),
    ).toBe(`<p><video controls="" src="${assetUrl}"></video></p>`);
  });

  it.each([
    unknown,
    entity(unknown),
  ])("rejects unknown raw or entity-decoded markers (%#)", (value) => {
    expect(() => processor.restore([`<p>${value}</p>`], [])).toThrow(
      expect.objectContaining(invalid),
    );
  });

  it("rejects a missing expected occurrence across the entire result", () => {
    expect(() =>
      processor.restore(
        ["<p>前</p>", `<p>${placeholder}</p>`],
        [{ ...image, occurrences: 2 }],
      ),
    ).toThrow(expect.objectContaining(invalid));
  });

  it("rejects extra occurrences across segments instead of deduplicating them", () => {
    expect(() =>
      processor.restore([placeholder, placeholder], [image]),
    ).toThrow(expect.objectContaining(invalid));
  });

  it.each([
    placeholder,
    entity(placeholder),
  ])("rejects attribute markers even when their expected count could otherwise match (%#)", (value) => {
    expect(() =>
      processor.restore([`<p title="${value}">${placeholder}</p>`], [image]),
    ).toThrow(expect.objectContaining(invalid));
  });

  it.each([
    "[[hollow-media:invalid]]",
    "[[hollow-media:",
  ])("rejects malformed reserved markers (%#)", (value) => {
    expect(() => processor.restore([`<p>${value}</p>`], [])).toThrow(
      expect.objectContaining(invalid),
    );
  });

  it("does not preserve generated media, CSS, or unverified copies of owned URLs", () => {
    const result = processor.restore(
      [
        `<p src="https://synthetic.invalid/a" srcset="https://synthetic.invalid/b 2x" poster="https://synthetic.invalid/c" background="https://synthetic.invalid/d" style="background:url(https://synthetic.invalid/e)">本文${placeholder}</p>` +
          `<img src="${assetUrl}"><video src="https://synthetic.invalid/v"></video><audio src="https://synthetic.invalid/a"></audio><source src="https://synthetic.invalid/s">` +
          '<style>@import "https://synthetic.invalid/css";</style><link rel="stylesheet" href="https://synthetic.invalid/css"><script>fetch("https://synthetic.invalid/")</script><iframe src="https://synthetic.invalid/"></iframe><object data="https://synthetic.invalid/"></object><embed src="https://synthetic.invalid/"><template><img src="https://synthetic.invalid/"></template>',
      ],
      [image],
    );
    expect(result).toBe(`<p>本文<img src="${assetUrl}" alt=""></p>`);
  });

  it("preserves ordinary heading, table, code and escaped text structure", () => {
    const source =
      "<h2>見出し</h2><table><tbody><tr><td>値</td></tr></tbody></table><pre><code>&lt;img&gt; &amp; text</code></pre>";
    expect(processor.restore([source], [])).toBe(source);
  });

  it("rejects duplicate mapping identities", () => {
    expect(() => processor.restore([placeholder], [image, image])).toThrow(
      expect.objectContaining(invalid),
    );
  });

  it("rejects draft-scoped media even when its URL shape is otherwise valid", () => {
    expect(() =>
      processor.restore(
        [placeholder],
        [{ ...image, assetUrl: assetUrl.replace("/notes/", "/drafts/") }],
      ),
    ).toThrow(expect.objectContaining(invalid));
  });

  it.each([
    `<script>${unknown}</script>`,
    `<template><p>${entity(unknown)}</p></template>`,
    `<!--${unknown}-->`,
    `<style>/*${unknown}*/</style>`,
    `<video><span>${unknown}</span></video>`,
  ])("rejects unknown markers in discarded elements or comments rather than hiding them (%#)", (source) => {
    expect(() => processor.restore([source], [])).toThrow(
      expect.objectContaining(invalid),
    );
  });

  it.each([
    `<p>${unknown.toUpperCase()}${placeholder}</p>`,
    `<p>${placeholder}${unknown.toUpperCase()}</p>`,
    `<p title="${entity(unknown.toUpperCase())}">${placeholder}</p>`,
  ])("rejects case-altered reserved prefixes in text and attributes (%#)", (source) => {
    expect(() => processor.restore([source], [image])).toThrow(
      expect.objectContaining(invalid),
    );
  });

  it.each([
    "https://synthetic.invalid/image.png",
    "/api/notes/invalid/assets/invalid",
  ])("rejects noncanonical asset URL shapes (%#)", (value) => {
    expect(() =>
      processor.restore([placeholder], [{ ...image, assetUrl: value }]),
    ).toThrow(expect.objectContaining(invalid));
  });

  it("accepts exactly 800 KiB of UTF-8 output without truncating text", () => {
    expect(MAX_HTML_BYTES).toBe(800 * 1024);
    const content = `${"日".repeat(Math.floor(MAX_HTML_BYTES / 3))}${"a".repeat(MAX_HTML_BYTES % 3)}`;
    const result = processor.restore([content], []);
    expect(Buffer.byteLength(result)).toBe(MAX_HTML_BYTES);
    expect(result === content).toBe(true);
  });

  it("rejects one byte above the input limit and includes segment separators", () => {
    expect(() =>
      processor.restore(["a".repeat(MAX_HTML_BYTES), ""], []),
    ).toThrow(expect.objectContaining(oversized));
  });

  it("accepts exact serialized output boundary and rejects entity expansion above it", () => {
    const count = MAX_HTML_BYTES / 5;
    expect(Buffer.byteLength(processor.restore(["&".repeat(count)], []))).toBe(
      MAX_HTML_BYTES,
    );
    expect(() => processor.restore(["&".repeat(count + 1)], [])).toThrow(
      expect.objectContaining(oversized),
    );
  });

  it("checks the output limit again after verified media expansion", () => {
    const replacement = `<img src="${assetUrl}" alt="">`;
    const prefix = "a".repeat(MAX_HTML_BYTES - Buffer.byteLength(replacement));
    const result = processor.restore([`${prefix}${placeholder}`], [image]);
    expect(Buffer.byteLength(result)).toBe(MAX_HTML_BYTES);
    expect(() =>
      processor.restore([`${prefix}a${placeholder}`], [image]),
    ).toThrow(expect.objectContaining(oversized));
  });
});

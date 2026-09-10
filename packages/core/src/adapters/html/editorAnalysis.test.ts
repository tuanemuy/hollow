import {
  editedText,
  projectText,
} from "@repo/core/application/note/editorText";
import { describe, expect, it } from "vitest";
import { NodeHtmlSanitizer } from "../node/htmlSanitizer";
import { diagnoseHtml, HtmlVisualSession } from "./editorAnalysis";

const source = (raw: string) => {
  const canonical = NodeHtmlSanitizer.sanitize(raw).html;
  return {
    generation: "test",
    canonical,
    rendered: canonical,
    document: `<!doctype html><html><head></head><body>${canonical}</body></html>`,
  };
};
describe("HTML text projection", () => {
  for (const html of [
    "<table><tr><td>同じ</td><td>同じ</td></tr></table>",
    "<p>alpha\r\nbeta</p><p>alpha\r\nbeta</p>",
    "<pre>\nline1\nline2</pre><p>outside</p>",
    "😀<table>&#x1F600;<tr><td>😀&nbsp;&amp;漢</td></tr>😀</table>😀",
    "<p><b>bold<i>nested</b>tail</i>end</p>",
  ])
    it(`projects ${html.slice(0, 40)}`, () => {
      const input = source(html);
      const session = new HtmlVisualSession(input);
      expect(session.projection.issues).toEqual([]);
      expect(session.patch("test", [])).toBe(input.canonical);
    });
  it("preserves unedited CRLF and attributes, restores empty ID", () => {
    const session = new HtmlVisualSession(
      source(
        '<p data-hollow-text="fake">alpha\r\nbeta</p><p>outside\rkeep</p>',
      ),
    );
    expect(
      session.patch("test", [{ id: "t0", before: "alpha\r\nbeta", after: "" }]),
    ).toBe('<p data-hollow-text="fake"></p><p>outside\rkeep</p>');
    expect(
      session.patch("test", [{ id: "t0", before: "", after: "<tag>" }]),
    ).toContain("&lt;tag&gt;");
    expect(() => session.patch("wrong", [])).toThrow();
    expect(() =>
      session.patch("test", [{ id: "t1", before: "stale", after: "bad" }]),
    ).toThrow();
  });
  it("preserves source for unchanged display and prefix", () => {
    expect(projectText("a\r\nb\rc")).toEqual({
      display: "a\nb\nc",
      offsets: [0, 1, 3, 4, 5, 6],
    });
    expect(editedText("\r\nline\r\nkeep", "line\nkeep", "\r\n")).toBe(
      "\r\nline\r\nkeep",
    );
    expect(editedText("\r\nline", "next", "\r\n")).toBe("\r\nnext");
    expect(() => projectText("abc", "\n")).toThrow();
  });
  it("does not call optional tags an error and bounds diagnostics/resources", () => {
    expect(diagnoseHtml("<table><tr><td>A<td>B</table>")).toEqual([]);
    expect(diagnoseHtml('<p x="a" x="b">')).toEqual([
      expect.objectContaining({ code: "duplicate-attribute", line: 1 }),
    ]);
    expect(() => diagnoseHtml("x".repeat(800 * 1024 + 1))).toThrow();
    expect(() => diagnoseHtml("<div>".repeat(130))).toThrow();
  });
});

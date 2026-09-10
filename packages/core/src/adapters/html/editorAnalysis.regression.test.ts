import {
  editedText,
  projectText,
} from "@repo/core/application/note/editorText";
import type { VisualSource } from "@repo/core/application/ports/htmlEditor";
import { describe, expect, it } from "vitest";
import { diagnoseHtml, HtmlVisualSession } from "./editorAnalysis";

const source = (canonical: string, rendered = canonical): VisualSource => ({
  generation: "regression",
  canonical,
  rendered,
  document: `<!doctype html><html><head></head><body>${rendered}</body></html>`,
});

describe("HTML editor source and atomic patch regressions", () => {
  it("preserves raw entities, attribute spelling and pre/CRLF when unchanged", () => {
    const raw =
      "<PRE title='raw &amp; value'>\r\n&#x65e5;&amp;本\r\n次</PRE><p>末&#12290;</p>";
    const session = new HtmlVisualSession(source(raw));
    expect(session.patch("regression", [])).toBe(raw);
    const text = session.projection.texts[0];
    expect(text).toBeDefined();
    if (!text) throw new Error("missing projected text");
    expect(text.prefix).toBe("\r\n");
    const display = projectText(text.value, text.prefix).display;
    expect(
      session.patch("regression", [
        {
          id: text.id,
          before: text.value,
          after: editedText(text.value, display, text.prefix),
        },
      ]),
    ).toBe(raw);
    expect(session.projection.issues).toEqual([]);
  });

  it("serializes every latest text value while leaving untouched source verbatim", () => {
    const session = new HtmlVisualSession(
      source("<p>A</p><b>B</b><i>&#x65e5;</i>"),
    );
    expect(
      session.patch("regression", [
        { id: "t0", before: "A", after: "first" },
        { id: "t1", before: "B", after: "second" },
      ]),
    ).toBe("<p>first</p><b>second</b><i>&#x65e5;</i>");
    expect(
      session.patch("regression", [
        { id: "t0", before: "first", after: "<&>" },
      ]),
    ).toBe("<p>&lt;&amp;&gt;</p><b>second</b><i>&#x65e5;</i>");
  });

  it.each([
    [{ id: "t1", before: "stale", after: "bad" }],
    [{ id: "missing", before: "B", after: "bad" }],
    [{ id: "t0", before: "A", after: "duplicate" }],
  ])("rejects the whole patch batch before any mutation: %j", (tail) => {
    const session = new HtmlVisualSession(source("<p>A</p><p>B</p>"));
    expect(() =>
      session.patch("regression", [
        { id: "t0", before: "A", after: "must not leak" },
        tail,
      ]),
    ).toThrow("編集対象");
    expect(session.patch("regression", [])).toBe("<p>A</p><p>B</p>");
    expect(
      session.patch("regression", [{ id: "t0", before: "A", after: "ok" }]),
    ).toBe("<p>ok</p><p>B</p>");
  });

  it("rejects stale generation atomically", () => {
    const session = new HtmlVisualSession(source("<p>A</p>"));
    expect(() =>
      session.patch("old", [{ id: "t0", before: "A", after: "bad" }]),
    ).toThrow("世代");
    expect(session.patch("regression", [])).toBe("<p>A</p>");
  });

  it("excludes stylesheet and script text from editable IDs", () => {
    const raw =
      '<style data-hollow-stylesheet="https://example.com/a.css">p{color:red}</style><script>const x=1;</script><p>editable</p>';
    const session = new HtmlVisualSession(source(raw));
    expect(session.projection.texts.map(({ value }) => value)).toEqual([
      "editable",
    ]);
    expect(
      session.patch("regression", [
        { id: "t0", before: "editable", after: "changed" },
      ]),
    ).toBe(raw.replace("editable", "changed"));
  });

  it("rejects changed rendered text, structure and document placement", () => {
    expect(() => new HtmlVisualSession(source("<p>A</p>", "<p>B</p>"))).toThrow(
      "文字",
    );
    expect(
      () => new HtmlVisualSession(source("<p>A</p>", "<div>A</div>")),
    ).toThrow("構造");
    expect(
      () =>
        new HtmlVisualSession({
          ...source("<p>A</p>"),
          document: "<body>other</body>",
        }),
    ).toThrow("投影");
  });
});

describe("HTML editor resource and diagnostic regressions", () => {
  it("counts UTF-8 bytes, accepts exactly 800 KiB and rolls oversized patches back", () => {
    const limit = 800 * 1024;
    const textBytes = limit - "<p></p>".length;
    const text =
      "日".repeat(Math.floor(textBytes / 3)) + "x".repeat(textBytes % 3);
    const raw = `<p>${text}</p>`;
    expect(new TextEncoder().encode(raw).byteLength).toBe(limit);
    expect(diagnoseHtml(raw)).toEqual([]);
    expect(() => diagnoseHtml(`${raw}日`)).toThrow("800 KB");
    const session = new HtmlVisualSession(source(raw));
    expect(() =>
      session.patch("regression", [
        { id: "t0", before: text, after: `${text}日` },
      ]),
    ).toThrow("800 KB");
    expect(session.patch("regression", [])).toBe(raw);
    expect(
      session.patch("regression", [{ id: "t0", before: text, after: "回復" }]),
    ).toBe("<p>回復</p>");
  });

  it("enforces the 10000-node and depth-128 boundaries", () => {
    expect(diagnoseHtml("<i></i>".repeat(9999))).toEqual([]);
    expect(() => diagnoseHtml("<i></i>".repeat(10000))).toThrow("要素数");
    expect(diagnoseHtml("<div>".repeat(128) + "</div>".repeat(128))).toEqual(
      [],
    );
    expect(() =>
      diagnoseHtml("<div>".repeat(129) + "</div>".repeat(129)),
    ).toThrow("深さ");
  });

  it("bounds correspondence matching even below the DOM and byte limits", () => {
    expect(
      new HtmlVisualSession(source("<p>x</p>".repeat(1414))).projection.issues,
    ).toEqual([]);
    expect(
      () => new HtmlVisualSession(source("<p>x</p>".repeat(1415))),
    ).toThrow("照合上限");
  });

  it("accepts optional closures and raw text, and locates actual syntax errors", () => {
    expect(
      diagnoseHtml(
        '<ul><li>first<li>second</ul><script>if (a < b) x = "<p>";</script>',
      ),
    ).toEqual([]);
    const raw = '<p>normal</p>\n<div a="1" a="2">text</div>';
    const diagnostics = diagnoseHtml(raw);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "duplicate-attribute",
      line: 2,
    });
    const diagnostic = diagnostics[0];
    if (!diagnostic) throw new Error("missing diagnostic");
    expect(diagnostic.offset).toBe(raw.indexOf("\n") + diagnostic.column);
    expect(diagnostic.column).toBeGreaterThan(1);
  });
});

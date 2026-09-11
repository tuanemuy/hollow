import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HighlightedText, limitTextParts } from "./TextPreview";

describe("safe typed browse preview", () => {
  it("renders HTML-like content as text and creates only trusted marks", () => {
    const html = renderToStaticMarkup(
      <HighlightedText
        parts={[
          { text: '<img src=x onerror="alert(1)">', match: false },
          { text: "<script>&日本語</script>", match: true },
        ]}
      />,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain(
      "<mark>&lt;script&gt;&amp;日本語&lt;/script&gt;</mark>",
    );
  });
  it("limits excerpts to 160 codepoints without splitting a surrogate pair or trusting markup", () => {
    const result = limitTextParts(
      [
        { text: "𠮷".repeat(159), match: false },
        { text: "<見出し", match: true },
      ],
      160,
    );
    expect(result).toEqual([
      { text: "𠮷".repeat(159), match: false },
      { text: "<", match: true },
    ]);
    const html = renderToStaticMarkup(
      <HighlightedText
        parts={[{ text: "𠮷".repeat(161), match: true }]}
        excerpt
      />,
    );
    expect(html).toBe(`<mark>${"𠮷".repeat(160)}</mark>`);
  });
  it("keeps empty parts out and preserves matching state across boundaries", () => {
    expect(
      limitTextParts(
        [
          { text: "", match: true },
          { text: "abc", match: false },
          { text: "def", match: true },
        ],
        4,
      ),
    ).toEqual([
      { text: "abc", match: false },
      { text: "d", match: true },
    ]);
    expect(
      renderToStaticMarkup(
        <HighlightedText
          parts={[
            { text: "", match: true },
            { text: "名前", match: false },
          ]}
        />,
      ),
    ).toBe("名前");
  });
});

import {
  exactTerm,
  searchMatch,
  searchQuery,
} from "@repo/core/domain/browse/query";
import { describe, expect, it } from "vitest";
import { projectNote, projectText } from "./projection";

describe("browse projection", () => {
  it("keeps canonical unchanged and reads HTML5 text boundaries", () => {
    const html =
      "<table><tr><td>日<b>本</b></td><td>語&amp;</td></tr></table><pre>\nCR\r\nLF</pre>";
    const p = projectNote({ title: "Ｔｉｔｌｅ", html });
    expect(p.sourceHtml).toBe(html);
    expect(p.body.display).toBe("日本\n語&\nCR\nLF");
    expect(p.title.normalized).toBe("title");
  });
  it("excludes structural hidden and allows visibility override", () => {
    const p = projectNote({
      title: "",
      html: '<p hidden="false">omit</p><p style="display:none!important;display:block">omit</p><p style="visibility:hidden">omit<span style="visibility:visible">visible</span></p><p style="display:none;display:var(--x)">unknown</p><style>x</style><script>x</script>',
    });
    expect(p.body.display).toBe("visible\nunknown");
  });
  it("does not treat invalid later declaration as a winner", () => {
    expect(
      projectNote({
        title: "",
        html: '<p style="display:none;display:nonsense">omit</p><p aria-hidden="true">shown</p>',
      }).body.display,
    ).toBe("shown");
  });
  it("maps normalization expansions and combines linear runs", () => {
    const p = projectText("xﬁe\u0301日本😀");
    expect(p.normalized).toBe("xfié日本😀");
    expect(p.segments.length).toBeLessThan(7);
    expect(projectText("a".repeat(10000)).segments).toEqual([
      [0, 10000, 0, 10000],
    ]);
  });
  it("rejects resource overflow without truncation", () => {
    expect(() =>
      projectNote({ title: "", html: "x".repeat(819201) }),
    ).toThrow();
    expect(() =>
      projectNote({
        title: "",
        html: "<div>".repeat(130) + "x" + "</div>".repeat(130),
      }),
    ).toThrow();
  });
  it("separates ascii prefix from non-ascii substring", () => {
    const q = searchQuery("日本TestAPI");
    expect(q.terms).toEqual([
      { kind: "text", value: "日本" },
      { kind: "ascii", value: "testapi" },
    ]);
    expect(exactTerm("contest testapi", { kind: "ascii", value: "test" })).toBe(
      8,
    );
    expect(searchMatch(q)).toContain("atestapi*");
    expect(() => searchQuery("a")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { tagName, tagScopeKey } from "./entity";

describe("tag values", () => {
  it("trims Unicode space and counts codepoints rather than UTF-16 units", () => {
    expect(tagName("　 tag \n")).toBe("tag");
    expect(tagName("😀".repeat(50))).toHaveLength(100);
    expect(() => tagName("😀".repeat(51))).toThrow();
    expect(() => tagName(" \n ")).toThrow();
  });
  it("separates personal and workspace identities", () => {
    expect(tagScopeKey({ kind: "personal", accountId: "same" })).toBe("p:same");
    expect(tagScopeKey({ kind: "workspace", workspaceId: "same" })).toBe(
      "w:same",
    );
  });
});

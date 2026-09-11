import { describe, expect, it } from "vitest";
import {
  assertTagNormalizerUnicodeVersion,
  NodeTagNormalizer,
} from "./tagNormalizer";
import { FOLD_MAPPING, UNICODE_VERSION, WIDTH_MAPPING } from "./unicodeData";

describe("NodeTagNormalizer", () => {
  it.each([
    ["ＡＢＣ１２３", "abc123"],
    ["Ａ", "ａ"],
    ["ｶﾞ", "ガ"],
    ["Σ", "σ"],
    ["σ", "ς"],
    ["ß", "SS"],
    ["ẞ", "ss"],
    ["Straße", "STRASSE"],
    ["é", "e\u0301"],
    ["Å", "A\u030A"],
    ["\u1E9B\u0323", "\u1E69"],
    ["K", "K"],
    ["ﬀ", "ff"],
    ["𐐀", "𐐨"],
  ])("folds %s and %s to the same key", (left, right) => {
    expect(NodeTagNormalizer.key(left)).toBe(NodeTagNormalizer.key(right));
  });

  it.each([
    ["①", "1"],
    ["²", "2"],
    ["㎒", "MHz"],
    ["カ", "か"],
    ["é", "e"],
    ["I", "ı"],
    ["İ", "i"],
    ["a\u200Db", "ab"],
    ["a  b", "a b"],
  ])("keeps %s and %s distinct", (left, right) => {
    expect(NodeTagNormalizer.key(left)).not.toBe(NodeTagNormalizer.key(right));
  });

  it("uses default full folding without Turkic tailoring", () => {
    expect(NodeTagNormalizer.key("I")).toBe("i");
    expect(NodeTagNormalizer.key("İ")).toBe("i\u0307");
    expect(FOLD_MAPPING["0049"]).toBe("0069");
    expect(FOLD_MAPPING["0130"]).toBe("0069 0307");
    expect(FOLD_MAPPING["1E9E"]).toBe("0073 0073");
  });

  it("returns NFD keys and is idempotent", () => {
    for (const value of ["Ａｶﾞéẞ", "\u1E9B\u0323", "IİıΣς", "😀𐐀"]) {
      const key = NodeTagNormalizer.key(value);
      expect(key).toBe(key.normalize("NFD"));
      expect(NodeTagNormalizer.key(key)).toBe(key);
    }
  });

  it("leaves display-name validation to the caller", () => {
    expect(NodeTagNormalizer.key("")).toBe("");
    expect(NodeTagNormalizer.key("  Ａ  ")).toBe("  a  ");
    expect(NodeTagNormalizer.key("A".repeat(51))).toBe("a".repeat(51));
  });

  it("pins Unicode 16 mappings to the declared semantics", () => {
    expect(UNICODE_VERSION).toBe("16.0.0");
    expect(NodeTagNormalizer.version).toBe("width-nfd-fullcf-nfd-16.0.0");
    expect(WIDTH_MAPPING.FF21).toBe("0041");
    expect(WIDTH_MAPPING.FF76).toBe("30AB");
    expect(WIDTH_MAPPING["2460"]).toBeUndefined();
    expect(WIDTH_MAPPING["00B2"]).toBeUndefined();
    expect(WIDTH_MAPPING["3392"]).toBeUndefined();
  });

  it("checks runtime compatibility separately from key computation", () => {
    expect(() =>
      assertTagNormalizerUnicodeVersion(process.versions.unicode),
    ).not.toThrow();
    expect(() => assertTagNormalizerUnicodeVersion("16.0")).not.toThrow();
    for (const version of ["15.1", "17.0", undefined]) {
      expect(() => assertTagNormalizerUnicodeVersion(version)).toThrow(
        expect.objectContaining({ code: "UNICODE_VERSION" }),
      );
    }
    expect(NodeTagNormalizer.key("Ａ")).toBe("a");
  });

  it("keeps every pinned mapping canonically equivalent after folding", () => {
    for (const table of [WIDTH_MAPPING, FOLD_MAPPING]) {
      for (const [code, mapping] of Object.entries(table)) {
        const source = String.fromCodePoint(Number.parseInt(code, 16));
        const target = mapping
          .split(" ")
          .map((value) => String.fromCodePoint(Number.parseInt(value, 16)))
          .join("");
        expect(NodeTagNormalizer.key(source)).toBe(
          NodeTagNormalizer.key(target),
        );
      }
    }
  });
});

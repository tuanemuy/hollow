import type { ZipNameInput } from "@repo/core/application/zip/names";
import { ZIP_MANIFEST_NAME } from "@repo/core/domain/zip/entity";
import { describe, expect, it } from "vitest";
import { widthFoldKey } from "../unicode/fold";
import { NodeZipNames } from "./names";

const allocate = (...filenames: string[]) =>
  NodeZipNames.allocate(
    filenames.map((filename, ordinal) => ({ ordinal, filename })),
  ).map((entry) => entry.filename);

describe("NodeZipNames", () => {
  it("preserves distinct candidates and accepts an empty set", () => {
    expect(allocate("日本語.html", "note.md", "document.pdf")).toEqual([
      "日本語.html",
      "note.md",
      "document.pdf",
    ]);
    expect(allocate()).toEqual([]);
  });

  it("allocates in ordinal order without mutating or losing note identity", () => {
    const input = Object.freeze([
      Object.freeze({ ordinal: 8, filename: "a.html" }),
      Object.freeze({ ordinal: 3, filename: "a.html" }),
      Object.freeze({ ordinal: 6, filename: "a (2).html" }),
    ]);
    expect(NodeZipNames.allocate(input)).toEqual([
      { ordinal: 3, filename: "a.html" },
      { ordinal: 6, filename: "a (2).html" },
      { ordinal: 8, filename: "a (3).html" },
    ]);
    expect(input[0]?.ordinal).toBe(8);
  });

  it("reserves all original suffix names before assigning duplicates", () => {
    expect(allocate("a.md", "a.md", "a (2).md", "a (3).md", "a.md")).toEqual([
      "a.md",
      "a (4).md",
      "a (2).md",
      "a (3).md",
      "a (5).md",
    ]);
  });

  it.each([
    ["a.html", "A.HTML", "A (2).HTML"],
    ["Ａ.md", "a.md", "a (2).md"],
    ["Straße.pdf", "STRASSE.pdf", "STRASSE (2).pdf"],
    ["ﬀ.html", "ff.html", "ff (2).html"],
    ["Σ.md", "ς.md", "ς (2).md"],
    ["ガ.md", "ｶﾞ.md", "ｶﾞ (2).md"],
    ["é.md", "e\u0301.md", "é (2).md"],
  ])("uses the fixed Unicode key for %s / %s", (first, second, renamed) => {
    expect(allocate(first, second)).toEqual([first, renamed]);
  });

  it("does not add compatibility, kana or accent equivalences", () => {
    const names = [
      "①.md",
      "1.md",
      "².md",
      "2.md",
      "㎒.md",
      "MHz.md",
      "カ.md",
      "か.md",
      "é.md",
      "e.md",
    ];
    expect(allocate(...names)).toEqual(names);
  });

  it("reserves canonical original suffixes too", () => {
    expect(allocate("a.md", "A.md", "Ａ （２）.md")).toEqual([
      "a.md",
      "A (3).md",
      "Ａ （２）.md",
    ]);
  });

  it("never assigns the reserved manifest name or steals its original suffix", () => {
    expect(
      allocate(
        ZIP_MANIFEST_NAME,
        "HOLLOW-EXPORT-REPORT.TXT",
        "hollow-export-report (2).txt",
      ),
    ).toEqual([
      "hollow-export-report (3).txt",
      "HOLLOW-EXPORT-REPORT (4).TXT",
      "hollow-export-report (2).txt",
    ]);
  });

  it.each([
    "CON",
    "prn",
    "AuX",
    "nul",
    "COM1",
    "LPT9",
    "com¹",
    "lpt²",
    "ＣＯＮ",
  ])("prefixes DOS reserved stem %s", (stem) => {
    expect(allocate(`${stem}.html`)).toEqual([`_${stem}.html`]);
  });

  it("keeps nonreserved DOS-like names and guards embedded extensions", () => {
    expect(allocate("COM10.md", "conifer.html", "NUL.foo.md")).toEqual([
      "COM10.md",
      "conifer.html",
      "_NUL.foo.md",
    ]);
  });

  it("sanitizes paths, controls, format characters, forbidden symbols and lone surrogates", () => {
    const names = allocate(
      'a/b\\c:d*e?f"g<h>i|j\u0000\u202E\uD800.html',
      "C:\\x.md",
      "\\\\server\\x.md",
    );
    expect(names).toEqual([
      "a_b_c_d_e_f_g_h_i_j___.html",
      "C__x.md",
      "__server_x.md",
    ]);
    for (const name of names)
      expect(name).not.toMatch(/[\p{Cc}\p{Cf}\p{Cs}<>:"/\\|?*]/u);
  });

  it("uses stable ordinal fallbacks and removes trailing dots and spaces", () => {
    expect(
      NodeZipNames.allocate([
        { ordinal: 9, filename: "   " },
        { ordinal: 0, filename: "..." },
        { ordinal: 4, filename: "___.md" },
        { ordinal: 7, filename: " title.html.  " },
      ]),
    ).toEqual([
      { ordinal: 0, filename: "note-1" },
      { ordinal: 4, filename: "note-5.md" },
      { ordinal: 7, filename: "title.html" },
      { ordinal: 9, filename: "note-10" },
    ]);
  });

  it("keeps the entire 200 byte boundary and preserves extensions after suffixing", () => {
    const original = `${"x".repeat(195)}.html`;
    const names = allocate(original, original);
    expect(names).toEqual([original, `${"x".repeat(191)} (2).html`]);
    expect(names.map((name) => Buffer.byteLength(name))).toEqual([200, 200]);
  });

  it.each([
    "界",
    "😀",
    "e\u0301",
  ])("shortens %s on code point boundaries after NFC", (character) => {
    const names = allocate(
      `${character.repeat(150)}.pdf`,
      `${character.repeat(150)}.pdf`,
    );
    expect(names[1]).toMatch(/ \(2\)\.pdf$/);
    for (const name of names) {
      expect(Buffer.byteLength(name)).toBeLessThanOrEqual(200);
      expect(name).toBe(name.normalize("NFC"));
      expect(name).not.toMatch(/\p{Cs}/u);
      expect(name.endsWith(".pdf")).toBe(true);
    }
  });

  it("reserves collisions introduced by truncation", () => {
    const stem = "a".repeat(197);
    expect(
      allocate(
        `${stem}first.md`,
        `${stem}second.md`,
        `${"a".repeat(193)} (2).md`,
      ),
    ).toEqual([
      `${stem}.md`,
      `${"a".repeat(193)} (3).md`,
      `${"a".repeat(193)} (2).md`,
    ]);
  });

  it("allocates 500 colliding names with unique bounded keys", () => {
    const names = allocate(...Array.from({ length: 500 }, () => "same.html"));
    expect(names[499]).toBe("same (500).html");
    expect(new Set(names.map(widthFoldKey)).size).toBe(500);
    expect(names.every((name) => Buffer.byteLength(name) <= 200)).toBe(true);
  });

  it.each([
    -1,
    500,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("rejects invalid ordinal %s", (ordinal) => {
    expect(() =>
      NodeZipNames.allocate([{ ordinal, filename: "a.md" }]),
    ).toThrow(expect.objectContaining({ code: "ZIP_ENTRY_NAMES" }));
  });

  it("rejects duplicate ordinals and too many entries", () => {
    expect(() =>
      NodeZipNames.allocate([
        { ordinal: 0, filename: "a.md" },
        { ordinal: 0, filename: "b.md" },
      ]),
    ).toThrow(expect.objectContaining({ code: "ZIP_ENTRY_NAMES" }));
    expect(() =>
      allocate(...Array.from({ length: 501 }, () => "a.md")),
    ).toThrow(expect.objectContaining({ code: "ZIP_ENTRY_NAMES" }));
  });

  it.each([
    null,
    [null],
    [{ ordinal: 0, filename: null }],
  ])("rejects malformed internal input %j", (input) => {
    expect(() =>
      NodeZipNames.allocate(input as unknown as readonly ZipNameInput[]),
    ).toThrow(expect.objectContaining({ code: "ZIP_ENTRY_NAMES" }));
  });

  it("rejects an artificial extension that cannot fit with any stem", () => {
    expect(() => allocate(`a.${"x".repeat(200)}`)).toThrow(
      expect.objectContaining({ code: "ZIP_ENTRY_NAMES" }),
    );
  });
});

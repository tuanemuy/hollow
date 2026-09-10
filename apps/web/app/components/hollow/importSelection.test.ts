import { describe, expect, it } from "vitest";
import {
  canBeCompanion,
  collectDroppedFiles,
  collectEntryFiles,
  defaultImportRole,
  type ImportEntry,
  importEstimate,
  importSourcePath,
  isSupportedImport,
  jobDuration,
  requiresCompanion,
  validateSelectedFiles,
} from "./importSelection";

const fileEntry = (name: string): ImportEntry => ({
  kind: "file",
  read: async () => new File(["text"], name),
});
function directory(batches: (readonly ImportEntry[])[]): ImportEntry {
  let index = 0;
  return { kind: "directory", readBatch: async () => batches[index++] ?? [] };
}

describe("import selection", () => {
  it("keeps browser folder-entry paths separate from ordinary duplicate names", async () => {
    const file = new File(["body"], "theme.css");
    const entry = {
      isFile: true,
      fullPath: "/project/styles/theme.css",
      file: (success: FileCallback) => success(file),
    } as FileSystemFileEntry;
    const item = {
      kind: "file",
      type: "text/css",
      webkitGetAsEntry: () => entry,
      getAsFile: () => file,
      getAsString: () => {},
    } satisfies DataTransferItem;
    const result = await collectDroppedFiles([item], []);
    expect(result.files).toEqual([file]);
    expect(importSourcePath(file)).toBe("project/styles/theme.css");
    expect(importSourcePath(new File(["other"], "theme.css"))).toBe(
      "theme.css",
    );
  });
  it("defaults CSS to companion while preserving ordinary image notes", () => {
    expect(defaultImportRole("theme.CSS")).toBe("companion");
    expect(defaultImportRole("photo.png")).toBe("note");
    expect(requiresCompanion("photo.png")).toBe(false);
    for (const name of ["theme.css", "photo.svg", "movie.mp4", "movie.webm"]) {
      expect(isSupportedImport(name)).toBe(true);
      expect(canBeCompanion(name)).toBe(true);
      expect(requiresCompanion(name)).toBe(true);
    }
    expect(canBeCompanion("document.pdf")).toBe(false);
  });
  it("preserves relative paths and distinct files sharing a name", async () => {
    const first = new File(["a"], "image.png");
    const second = new File(["b"], "image.png");
    Object.defineProperty(first, "webkitRelativePath", {
      value: "folder/image.png",
    });
    Object.defineProperty(second, "webkitRelativePath", { value: "" });
    expect(importSourcePath(first)).toBe("folder/image.png");
    expect(importSourcePath(second)).toBe("image.png");
    const result = await collectEntryFiles(
      [first, second].map((file) => ({ kind: "file", read: async () => file })),
    );
    expect(result.files).toEqual([first, second]);
    expect(result.files).toHaveLength(2);
  });
  it("reads directory batches until empty and recursively excludes unsupported files", async () => {
    const first = Array.from({ length: 100 }, (_, index) =>
      fileEntry(`unsupported-${index}.zip`),
    );
    const result = await collectEntryFiles([
      directory([
        first,
        [
          fileEntry("first.txt"),
          directory([[fileEntry("nested.md"), fileEntry("old.doc")]]),
        ],
        [fileEntry("last.pdf")],
      ]),
    ]);
    expect(result.files.map((file) => file.name)).toEqual([
      "first.txt",
      "nested.md",
      "last.pdf",
    ]);
    expect(result.excluded).toBe(101);
  });
  it("rejects the entire selection when supported file count exceeds 100", async () => {
    await expect(
      collectEntryFiles([
        directory([
          Array.from({ length: 100 }, (_, index) => fileEntry(`${index}.txt`)),
          [fileEntry("one-too-many.txt")],
        ]),
      ]),
    ).rejects.toThrow("100件");
  });
  it("bounds traversal depth and total entries including unsupported files", async () => {
    await expect(
      collectEntryFiles([directory([[directory([[fileEntry("deep.txt")]])]])], {
        depth: 1,
        entries: 100,
      }),
    ).rejects.toThrow("階層");
    await expect(
      collectEntryFiles(
        [directory([[fileEntry("a.zip"), fileEntry("b.zip")]])],
        { depth: 32, entries: 2 },
      ),
    ).rejects.toThrow("項目数");
  });
  it("enforces individual and total size before upload", () => {
    const sized = (name: string, size: number) =>
      Object.defineProperty(new File(["x"], name), "size", { value: size });
    expect(() =>
      validateSelectedFiles([sized("large.txt", 50 * 1024 * 1024 + 1)]),
    ).toThrow("50 MB");
    expect(() =>
      validateSelectedFiles([
        sized("a.mp3", 200 * 1024 * 1024),
        sized("b.mp3", 200 * 1024 * 1024),
        sized("c.mp3", 101 * 1024 * 1024),
      ]),
    ).toThrow("500 MB");
    expect(() =>
      validateSelectedFiles([sized("audio.mp3", 200 * 1024 * 1024)]),
    ).not.toThrow();
  });
  it("treats AI counts as provisional and leaves PDF text layers unknown", () => {
    expect(importEstimate("scan.PNG", true)).toMatchObject({
      needsAi: true,
      method: "要AI連携で保存",
    });
    expect(importEstimate("voice.mp3", false)).toMatchObject({
      needsAi: true,
      method: "LLM不使用では失敗",
    });
    expect(importEstimate("document.pdf", true)).toMatchObject({
      pdf: true,
      needsAi: false,
    });
    expect(importEstimate("document.xlsx", true).method).toBe("機械変換");
  });
  it("formats elapsed times without negative or invalid durations", () => {
    expect(jobDuration("2026-01-01T00:00:00Z", "2026-01-01T00:01:05Z")).toBe(
      "1 分 5 秒",
    );
    expect(jobDuration("2026-01-01T00:00:00Z", "2025-01-01T00:00:00Z")).toBe(
      "0 秒",
    );
    expect(jobDuration("invalid", "invalid")).toBe("—");
  });
});

import { describe, expect, it } from "vitest";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  pdfChoice,
  pdfChoiceMatchesSource,
  pdfPageManifest,
} from "./pdfPreview";

const source = {
  kind: "original" as const,
  format: "pdf" as const,
  originalId: "synthetic",
  bytes: 5,
  sha256: "a".repeat(64),
};
const manifest = {
  kind: "pdf-pages",
  preparationVersion: 4,
  source,
  policy: PDF_PAGE_POLICY,
  renderer: PDF_PAGE_RENDERER,
  total: 1,
  pages: [
    {
      ordinal: 0,
      width: 1728,
      height: 1728,
      bytes: 4 * 1024 * 1024,
      sha256: "b".repeat(64),
    },
  ],
  sha256: "c".repeat(64),
};
function rejects(value: unknown) {
  try {
    pdfPageManifest(value);
    return false;
  } catch {
    return true;
  }
}
describe("closed PDF classification metadata", () => {
  it("accepts inclusive page dimensions and bytes without claiming native peak or context fit", () => {
    const value = pdfPageManifest(manifest);
    expect(
      value.total === 1 &&
        value.pages[0]?.width === 1728 &&
        value.pages[0]?.bytes === 4194304,
    ).toBe(true);
  });
  it("rejects missing, duplicate and unordered ordinals", () => {
    expect(rejects({ ...manifest, total: 2 })).toBe(true);
    expect(
      rejects({
        ...manifest,
        total: 2,
        pages: [manifest.pages[0], manifest.pages[0]],
      }),
    ).toBe(true);
    expect(
      rejects({ ...manifest, pages: [{ ...manifest.pages[0], ordinal: 1 }] }),
    ).toBe(true);
  });
  it("rejects unknown renderer, policy and source identity", () => {
    expect(rejects({ ...manifest, renderer: "other" })).toBe(true);
    expect(rejects({ ...manifest, policy: "other" })).toBe(true);
    expect(
      rejects({ ...manifest, source: { ...source, format: "image" } }),
    ).toBe(true);
  });
  it("rejects nonintegral dimensions, per-page overrun and empty pages", () => {
    expect(
      rejects({ ...manifest, pages: [{ ...manifest.pages[0], width: 0 }] }),
    ).toBe(true);
    expect(
      rejects({ ...manifest, pages: [{ ...manifest.pages[0], height: 1.5 }] }),
    ).toBe(true);
    expect(
      rejects({
        ...manifest,
        pages: [{ ...manifest.pages[0], bytes: 4194305 }],
      }),
    ).toBe(true);
    expect(rejects({ ...manifest, total: 0, pages: [] })).toBe(true);
  });
  it("checks whole manifest byte admission independently of page count", () => {
    const pages = Array.from({ length: 32 }, (_, ordinal) => ({
      ...manifest.pages[0],
      ordinal,
      bytes: 2097152,
    }));
    expect(
      pdfPageManifest({ ...manifest, total: 32, pages }).total === 32,
    ).toBe(true);
    expect(
      rejects({
        ...manifest,
        total: 32,
        pages: pages.map((p) => ({ ...p, bytes: p.bytes + 1 })),
      }),
    ).toBe(true);
    expect(
      rejects({
        ...manifest,
        total: 33,
        pages: [...pages, { ...pages[0], ordinal: 32 }],
      }),
    ).toBe(true);
  });
  it("keeps strict2 and pages4 purpose/version pairs separate", () => {
    const strict = pdfChoice({
      kind: "strict-text",
      preparationVersion: 2,
      promptVersion: 1,
      modelKind: "chat-text",
      preparedDocumentHash: "a".repeat(64),
      pages: 200,
      policy: "strict-text-v1",
    });
    const pages = pdfChoice({
      kind: "pages",
      preparationVersion: 4,
      promptVersion: 3,
      modelKind: "chat-image",
      reason: "ORDER_UNPROVEN",
      manifest,
    });
    expect(strict.kind === "strict-text" && pages.kind === "pages").toBe(true);
    let rejected = false;
    try {
      pdfChoice({ ...pages, promptVersion: 1 });
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
  it("binds page choice to the exact source without exposing its hash", () => {
    const choice = pdfChoice({
      kind: "pages",
      preparationVersion: 4,
      promptVersion: 3,
      modelKind: "chat-image",
      reason: "VISUAL_CONTENT",
      manifest,
    });
    expect(pdfChoiceMatchesSource(choice, source)).toBe(true);
    expect(pdfChoiceMatchesSource(choice, { ...source, bytes: 6 })).toBe(false);
    expect(
      pdfChoiceMatchesSource(choice, { ...source, originalId: "other" }),
    ).toBe(false);
  });
});

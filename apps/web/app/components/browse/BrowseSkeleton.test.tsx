import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrowseSkeleton } from "./BrowseSkeleton";

describe("browse skeleton diagnostic stage", () => {
  it("preserves the default markup without adding an unspecified stage", () => {
    expect(renderToStaticMarkup(<BrowseSkeleton />)).toBe(
      '<div class="browse-skeleton browse-skeleton-list" role="status" aria-label="ノートを読み込み中"><p>読み込み中…</p><div>' +
        '<span class="hollow-skeleton"></span>'.repeat(6) +
        "</div></div>",
    );
  });

  for (const layout of ["list", "tile", "calendar"] as const)
    for (const stage of ["route-suspense", "location-mismatch"] as const)
      it(`${layout}/${stage} changes only the diagnostic attribute`, () => {
        const original = renderToStaticMarkup(
          <BrowseSkeleton layout={layout} />,
        );
        const marked = renderToStaticMarkup(
          <BrowseSkeleton layout={layout} stage={stage} />,
        );
        expect(marked).toContain(`data-browse-stage="${stage}"`);
        expect(marked.replace(` data-browse-stage="${stage}"`, "")).toBe(
          original,
        );
        expect(original.match(/class="hollow-skeleton"/g)).toHaveLength(
          layout === "calendar" ? 7 : 6,
        );
      });

  it("labels the route Suspense fallback without changing its identity", () => {
    const source = readFileSync(
      new URL("../../routes/notes.index.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(
      /<Suspense\s+key=\{browseIdentity\(search\)\}\s+fallback=\{\s*<BrowseSkeleton\s+layout=\{search.layout \?\? "list"\}\s+stage="route-suspense"\s*\/>/,
    );
    expect(source).toContain("<Deferred promise={notes} />");
  });

  it("labels only the existing location mismatch guard", () => {
    const source = readFileSync(
      new URL("../hollow/ScopedNotesBoard.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "const locationMatches = matchesBrowseLocation(conditions, routeSearch);",
    );
    expect(source).toMatch(
      /if \(!locationMatches\)\s+return \(\s*<BrowseSkeleton layout=\{conditions.layout\} stage="location-mismatch"\s*\/>/,
    );
  });
});

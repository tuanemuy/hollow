import type { BrowseLayout } from "@repo/core/domain/browse/query";

export function BrowseSkeleton({ layout = "list" }: { layout?: BrowseLayout }) {
  return (
    <div
      className={`browse-skeleton browse-skeleton-${layout}`}
      role="status"
      aria-label="ノートを読み込み中"
    >
      <p>読み込み中…</p>
      <div>
        {[
          "first",
          "second",
          "third",
          "fourth",
          "fifth",
          "sixth",
          ...(layout === "calendar" ? ["seventh"] : []),
        ].map((key) => (
          <span className="hollow-skeleton" key={key} />
        ))}
      </div>
    </div>
  );
}

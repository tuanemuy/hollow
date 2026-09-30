import type { BrowseLayout } from "@repo/core/domain/browse/query";

export function BrowseSkeleton({
  layout = "list",
  stage,
}: {
  layout?: BrowseLayout;
  stage?: "route-suspense" | "location-mismatch";
}) {
  return (
    <div
      className={`browse-skeleton browse-skeleton-${layout}`}
      role="status"
      aria-label="ノートを読み込み中"
      data-browse-stage={stage}
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

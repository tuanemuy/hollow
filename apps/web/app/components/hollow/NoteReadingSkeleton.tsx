export function NoteReadingSkeleton() {
  return (
    <section
      className="hollow-reading-skeleton"
      role="status"
      aria-label="ノート本文を読み込み中"
    >
      <span className="hollow-skeleton-heading" />
      <span />
      <span />
      <span className="hollow-skeleton-short" />
      <span className="hollow-skeleton-heading" />
      <span />
      <span />
      <span className="hollow-skeleton-short" />
    </section>
  );
}

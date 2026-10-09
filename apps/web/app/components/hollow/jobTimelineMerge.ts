export type TimelineKind =
  | "conversion"
  | "reference"
  | "batch"
  | "purge"
  | "emptyTrash"
  | "workspaceDeletion"
  | "pdf"
  | "zip"
  | "driveBackup";
export type TimelineRow = Readonly<{
  kind: TimelineKind;
  id: string;
  title: string;
  label: string;
  state: string;
  createdAt: string;
  endedAt: string | null;
  active: boolean;
}>;
export type TimelineSource = {
  head: () => Promise<TimelineRow | null>;
  take: () => void;
};
export function timelineSource<T, C>(
  load: (cursor: C | null) => Promise<{
    items: readonly T[];
    next: C | null;
  }>,
  project: (value: T) => TimelineRow,
): TimelineSource {
  let cursor: C | null = null;
  let ended = false;
  let buffer: TimelineRow[] = [];
  return {
    async head() {
      while (!buffer.length && !ended) {
        const page = await load(cursor);
        cursor = page.next;
        ended = cursor === null;
        buffer = page.items.map(project);
      }
      return buffer[0] ?? null;
    },
    take() {
      buffer.shift();
    },
  };
}
export async function timelinePage(
  sources: readonly TimelineSource[],
  current: () => boolean,
  limit = 50,
) {
  const rows: TimelineRow[] = [];
  for (let index = 0; index < limit; index++) {
    const heads = await Promise.all(sources.map((source) => source.head()));
    if (!current()) return null;
    let selected = -1;
    for (let source = 0; source < heads.length; source++) {
      const row = heads[source];
      if (
        row &&
        (selected < 0 ||
          row.createdAt.localeCompare(heads[selected]!.createdAt) > 0)
      )
        selected = source;
    }
    if (selected < 0) return { rows, more: false };
    rows.push(heads[selected]!);
    sources[selected]!.take();
  }
  const heads = await Promise.all(sources.map((source) => source.head()));
  return current() ? { rows, more: heads.some(Boolean) } : null;
}

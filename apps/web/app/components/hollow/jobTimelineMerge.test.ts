import { describe, expect, it } from "vitest";
import {
  type TimelineRow,
  timelinePage,
  timelineSource,
} from "./jobTimelineMerge";

const row = (id: number, kind: TimelineRow["kind"]): TimelineRow => ({
  id: String(id),
  kind,
  title: `note ${id}`,
  label: kind,
  state: "完了",
  createdAt: new Date(Date.UTC(2026, 9, 9, 0, 0, id)).toISOString(),
  endedAt: new Date(Date.UTC(2026, 9, 9, 0, 0, id + 1)).toISOString(),
  active: false,
});
function source(rows: readonly TimelineRow[], calls: number[], size = 50) {
  return timelineSource(
    async (cursor: number | null) => {
      const offset = cursor ?? 0;
      calls.push(offset);
      return {
        items: rows.slice(offset, offset + size),
        next: offset + size < rows.length ? offset + size : null,
      };
    },
    (value) => value,
  );
}
describe("job timeline cursor merge", () => {
  it("merges start dates across kinds and refills the winning source before exposing older rows", async () => {
    const calls: number[] = [];
    const imports = Array.from({ length: 110 }, (_, index) =>
      row(200 - index, "conversion"),
    );
    const zip = [row(155, "zip"), row(85, "zip")];
    const feeds = [source(imports, calls), source(zip, [], 1)];
    const expected = [...imports, ...zip].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const first = await timelinePage(feeds, () => true);
    const second = await timelinePage(feeds, () => true);
    const third = await timelinePage(feeds, () => true);
    expect(first?.rows).toEqual(expected.slice(0, 50));
    expect(second?.rows).toEqual(expected.slice(50, 100));
    expect(third?.rows).toEqual(expected.slice(100));
    expect(third?.more).toBe(false);
    expect(calls).toEqual([0, 50, 100]);
    expect(
      new Set(
        [...first!.rows, ...second!.rows, ...third!.rows].map(
          (value) => `${value.kind}:${value.id}`,
        ),
      ).size,
    ).toBe(112);
  });
  it("does not publish an incomplete global order when any source read fails", async () => {
    const unavailable = timelineSource(
      async () => {
        throw Error("private read failure");
      },
      (value: TimelineRow) => value,
    );
    await expect(
      timelinePage([source([row(1, "zip")], []), unavailable], () => true),
    ).rejects.toThrow("private read failure");
  });
  it("discards a former actor's late reads without returning rows or consuming them", async () => {
    let current = true;
    const feed = timelineSource(
      async () => {
        current = false;
        return { items: [row(1, "zip")], next: null };
      },
      (value) => value,
    );
    expect(await timelinePage([feed], () => current)).toBeNull();
    expect(await feed.head()).toEqual(row(1, "zip"));
  });
  it("handles empty and equal-time sources without losing either kind", async () => {
    const feeds = [
      source([], []),
      source([row(10, "batch")], []),
      source([row(10, "reference")], []),
    ];
    expect(await timelinePage(feeds, () => true)).toEqual({
      rows: [row(10, "batch"), row(10, "reference")],
      more: false,
    });
  });
});

import type { BatchView } from "@repo/core/application/batch/ports";
import { describe, expect, it } from "vitest";
import { activeBatchWatches, batchWatchIds } from "./model";

const batch = (id: string, active = false): BatchView => ({
  id,
  kind: "tag",
  state: active ? "running" : "failed",
  counts: {
    queued: 0,
    running: active ? 1 : 0,
    succeeded: 0,
    failed: active ? 0 : 1,
    cancelled: 0,
  },
  total: 1,
  excluded: 0,
  generation: 1,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

describe("batch terminal observation", () => {
  it("does not turn a failed row first seen in unfinished history into a transition", () => {
    const watched = activeBatchWatches([
      batch("old-failure"),
      batch("active", true),
    ]);
    expect(watched.map((item) => item.id)).toEqual(["active"]);
    expect(batchWatchIds([], watched, new Map())).toEqual(["active"]);
  });
  it("still watches an explicit acceptance receipt even if it already finished", () => {
    expect(
      batchWatchIds(
        ["instant-result"],
        activeBatchWatches([batch("instant-result")]),
        new Map(),
      ),
    ).toEqual(["instant-result"]);
    expect(
      batchWatchIds(
        ["instant-result"],
        [],
        new Map([["instant-result", "seen"]]),
      ),
    ).toEqual([]);
  });
  it("deduplicates and bounds both discovery and receipt watches to 50 parents", () => {
    const rows = Array.from({ length: 60 }, (_, i) => batch(String(i), true));
    expect(activeBatchWatches([...rows, ...rows])).toHaveLength(50);
    expect(batchWatchIds(["own", "own"], rows, new Map())).toHaveLength(50);
    expect(batchWatchIds(["own"], rows, new Map())[0]).toBe("own");
  });
});

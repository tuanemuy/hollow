import { describe, expect, it } from "vitest";
import {
  applyWatched,
  nextWatch,
  observeActive,
  type PdfActivityState,
  type PdfWatchedRow,
} from "./activityModel";

const empty = (): PdfActivityState => ({ watch: new Map(), turn: [] });
const active = (id: string, version = 1) => ({ id, version });
const row = (
  id: string,
  state: PdfWatchedRow["state"] = "running",
  version = 1,
): PdfWatchedRow => ({ id, version, state, title: `PDF ${id}` });

describe("PDF activity watch registration", () => {
  it("keeps existing order, appends only new IDs and retains maximum versions", () => {
    const initial = observeActive(empty(), [active("a", 3), active("b", 2)]);
    const result = observeActive(initial, [
      active("b", 4),
      active("a", 1),
      active("c", 2),
      active("c", 5),
      active("b", 3),
      active("d"),
    ]);
    expect(result.turn).toEqual(["a", "b", "c", "d"]);
    expect([...result.watch]).toEqual([
      ["a", 3],
      ["b", 4],
      ["c", 5],
      ["d", 1],
    ]);
    expect([...initial.watch]).toEqual([
      ["a", 3],
      ["b", 2],
    ]);
    expect(initial.turn).toEqual(["a", "b"]);
  });

  it("does not drop watches absent from an active scan page", () => {
    const state = observeActive(empty(), [active("a"), active("b")]);
    expect(observeActive(state, [active("c")]).turn).toEqual(["a", "b", "c"]);
    expect(observeActive(state, []).turn).toEqual(["a", "b"]);
  });
});

describe("PDF activity round robin", () => {
  it.each([
    51, 101,
  ])("fairly visits all %i watches without a global 50-item cap", (count) => {
    const ids = Array.from({ length: count }, (_, i) => `job-${i}`);
    const initial = observeActive(
      empty(),
      ids.map((id) => active(id)),
    );
    let state = initial;
    const visited: string[] = [];
    for (let step = 0; step < Math.ceil(count / 50); step++) {
      const next = nextWatch(state);
      expect(next.requestedIds).toHaveLength(50);
      expect(new Set(next.requestedIds).size).toBe(50);
      expect(next.state.watch.size).toBe(count);
      expect(next.state.turn).toHaveLength(count);
      visited.push(...next.requestedIds);
      state = next.state;
    }
    expect(new Set(visited)).toEqual(new Set(ids));
    expect(visited.slice(0, count)).toEqual(ids);
    expect(initial.turn).toEqual(ids);
    expect([...initial.watch.keys()]).toEqual(ids);
  });

  it("handles empty and small queues without duplication", () => {
    expect(nextWatch(empty()).requestedIds).toEqual([]);
    const state = observeActive(empty(), [active("a"), active("b")]);
    const next = nextWatch(state);
    expect(next.requestedIds).toEqual(["a", "b"]);
    expect(next.state.turn).toEqual(["a", "b"]);
    expect(next.state.turn).not.toBe(state.turn);
  });

  it("appends discoveries behind the existing rotated queue", () => {
    const state = observeActive(
      empty(),
      Array.from({ length: 51 }, (_, i) => active(`${i}`)),
    );
    const rotated = nextWatch(state).state;
    const result = observeActive(rotated, [active("0", 2), active("new")]);
    expect(result.turn).toEqual(["50", ...state.turn.slice(0, 50), "new"]);
  });
});

describe("PDF watched response adoption", () => {
  it("updates active rows and notifies only watched requested terminals", () => {
    const state = observeActive(
      empty(),
      ["a", "b", "c", "d", "outside"].map((id) => active(id)),
    );
    const terminal = [
      row("b", "succeeded", 2),
      row("c", "failed", 2),
      row("d", "cancelled", 2),
    ];
    const result = applyWatched(
      state,
      ["a", "b", "c", "d"],
      [
        row("a", "running", 3),
        ...terminal,
        row("outside", "succeeded", 2),
        row("unknown", "succeeded"),
      ],
    );
    expect([...result.state.watch]).toEqual([
      ["a", 3],
      ["outside", 1],
    ]);
    expect(result.state.turn).toEqual(["a", "outside"]);
    expect(result.notifications).toEqual(terminal);
    expect(
      applyWatched(result.state, ["b", "c", "d"], terminal).notifications,
    ).toEqual([]);
  });

  it("removes missing requested rows silently, without removing the other 51 rows", () => {
    const state = observeActive(
      empty(),
      Array.from({ length: 101 }, (_, i) => active(`${i}`)),
    );
    const next = nextWatch(state);
    const result = applyWatched(next.state, next.requestedIds, []);
    expect(result.notifications).toEqual([]);
    expect(result.state.watch.size).toBe(51);
    expect(result.state.turn).toEqual(state.turn.slice(50));
  });

  it("ignores older active and terminal versions without treating them as missing", () => {
    const state = observeActive(empty(), [active("a", 5), active("b", 7)]);
    for (const status of [
      "queued",
      "running",
      "succeeded",
      "failed",
      "cancelled",
    ] as const) {
      const result = applyWatched(
        state,
        ["a", "b"],
        [row("a", status, 4), row("b", "running", 6)],
      );
      expect([...result.state.watch]).toEqual([...state.watch]);
      expect(result.state.turn).toEqual(state.turn);
      expect(result.notifications).toEqual([]);
    }
  });

  it("adopts equal-version terminal rows and preserves equal-version active rows", () => {
    const state = observeActive(empty(), [active("a", 5), active("b", 7)]);
    const terminal = row("a", "succeeded", 5);
    const result = applyWatched(
      state,
      ["a", "b"],
      [terminal, row("b", "queued", 7)],
    );
    expect([...result.state.watch]).toEqual([["b", 7]]);
    expect(result.notifications).toEqual([terminal]);
  });

  it("deduplicates requested IDs and adopts only the newest duplicate row", () => {
    const state = observeActive(empty(), [active("a", 2), active("b", 2)]);
    const done = row("b", "succeeded", 4);
    const result = applyWatched(
      state,
      ["a", "a", "b", "b", "unknown"],
      [
        row("a", "succeeded", 3),
        row("a", "running", 5),
        row("a", "failed", 4),
        done,
        done,
        row("b", "running", 3),
        row("unknown", "succeeded", 9),
      ],
    );
    expect([...result.state.watch]).toEqual([["a", 5]]);
    expect(result.notifications).toEqual([done]);
  });

  it("never announces unsolicited terminal rows on initial discovery", () => {
    expect(
      applyWatched(empty(), ["a"], [row("a", "succeeded")]).notifications,
    ).toEqual([]);
    const state = observeActive(empty(), [active("a")]);
    const result = applyWatched(state, [], [row("a", "succeeded")]);
    expect([...result.state.watch]).toEqual([["a", 1]]);
    expect(result.notifications).toEqual([]);
  });

  it("does not mutate the input map, queue, requested IDs or response rows", () => {
    const state = observeActive(empty(), [active("a"), active("b")]);
    Object.freeze(state.turn);
    Object.freeze(state);
    const requested = Object.freeze(["a", "b"]);
    const rows = Object.freeze([Object.freeze(row("a", "succeeded", 2))]);
    const result = applyWatched(state, requested, rows);
    expect([...state.watch]).toEqual([
      ["a", 1],
      ["b", 1],
    ]);
    expect(state.turn).toEqual(["a", "b"]);
    expect(requested).toEqual(["a", "b"]);
    expect(rows).toEqual([row("a", "succeeded", 2)]);
    expect(result.state.watch).not.toBe(state.watch);
    expect(result.state.turn).not.toBe(state.turn);
    expect(result.state.watch.size).toBe(0);
  });
});

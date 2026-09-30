import { describe, expect, it } from "vitest";
import {
  type ActivityPage,
  type ActivityRow,
  activityInput,
  activityReadCurrent,
  beginActivityRead,
  emptyActivity,
  emptyActivityReadGate,
  finishActivityRead,
  invalidateActivityRead,
  prepareActivity,
  receiveActivity,
  watchActivity,
} from "./driveBackupActivityModel";

const scope = { id: "account", epoch: 1 };
const actor = { accountId: scope.id, authVersion: 1, browserEpoch: 1 };
const row = (
  id: string,
  state: ActivityRow["state"] = "processing",
  generation = 1,
): ActivityRow => ({
  id,
  generation,
  state,
  active: state === "processing" ? 1 : 0,
  title: id,
});
const page = (overrides: Partial<ActivityPage> = {}): ActivityPage => ({
  actor,
  active: 0,
  rows: [],
  watched: [],
  next: null,
  watchNext: null,
  ...overrides,
});

describe("Drive backup activity identity", () => {
  it("rejects a different account and the same account after an ABA epoch", () => {
    const state = emptyActivity(scope);
    const response = page({ active: 1, rows: [row("parent")] });
    expect(receiveActivity(state, response, { id: "other", epoch: 1 })).toBe(
      state,
    );
    expect(receiveActivity(state, response, { ...scope, epoch: 3 })).toBe(
      state,
    );
    expect(
      receiveActivity(
        state,
        page({ actor: { ...actor, accountId: "other" } }),
        scope,
      ),
    ).toBe(state);
  });

  it("clears notices and watches on server epoch change and rejects older versions", () => {
    const watched = watchActivity(emptyActivity(scope), "parent");
    const completed = receiveActivity(
      watched,
      page({ rows: [row("parent", "succeeded")] }),
      scope,
    );
    expect(completed.notices).toHaveLength(1);
    const changed = receiveActivity(
      completed,
      page({ actor: { ...actor, browserEpoch: 2 } }),
      scope,
    );
    expect(changed.notices).toEqual([]);
    expect(changed.watches).toEqual([]);
    expect(changed.parents.size).toBe(0);
    expect(receiveActivity(changed, page({ active: 1 }), scope)).toBe(changed);
    const renewed = receiveActivity(
      changed,
      page({ actor: { ...actor, browserEpoch: 2, authVersion: 2 } }),
      scope,
    );
    expect(
      receiveActivity(
        renewed,
        page({ actor: { ...actor, browserEpoch: 2 } }),
        scope,
      ),
    ).toBe(renewed);
  });
});

describe("Drive backup activity completion", () => {
  it("does not announce historical terminal rows or interpret an unfinished read as completion", () => {
    const historical = receiveActivity(
      emptyActivity(scope),
      page({ rows: [row("old", "failed")] }),
      scope,
    );
    expect(historical.notices).toEqual([]);
    const processing = receiveActivity(
      historical,
      page({ active: 1, rows: [row("parent")] }),
      scope,
    );
    expect(processing.active).toBe(1);
    expect(processing.notices).toEqual([]);
    const request = beginActivityRead(emptyActivityReadGate());
    if (!request.ticket) throw new Error("Expected a read ticket");
    finishActivityRead(request.gate, request.ticket);
    expect(processing.active).toBe(1);
    expect(processing.parents.get("parent")?.state).toBe("processing");
  });

  it("announces each parent generation once across history and receipt watches", () => {
    const root = row("root");
    const observed = receiveActivity(
      emptyActivity(scope),
      page({ active: 1, rows: [root] }),
      scope,
    );
    const completed = receiveActivity(
      observed,
      page({
        rows: [row("root", "failed")],
        watched: [{ ...row("receipt", "failed"), parentId: "root" }],
      }),
      scope,
    );
    expect(completed.notices).toHaveLength(1);
    const repeated = receiveActivity(
      completed,
      page({ rows: [row("root", "failed")] }),
      scope,
    );
    expect(repeated.notices).toHaveLength(1);
    const retry = receiveActivity(
      repeated,
      page({ active: 1, rows: [row("root", "processing", 2)] }),
      scope,
    );
    const old = receiveActivity(
      retry,
      page({ active: 1, watched: [row("root", "failed", 1)] }),
      scope,
    );
    expect(old.parents.get("root")?.generation).toBe(2);
    expect(old.notices).toHaveLength(1);
    const final = receiveActivity(
      old,
      page({ rows: [row("root", "succeeded", 2)] }),
      scope,
    );
    expect(final.notices).toHaveLength(2);
    expect(final.parents.size).toBe(0);
  });

  it("uses parent counts from the server even when only one page is visible", () => {
    const state = receiveActivity(
      emptyActivity(scope),
      page({ active: 10, rows: [row("parent")] }),
      scope,
    );
    expect(state.active).toBe(10);
    expect(state.parents.size).toBe(1);
  });

  it("matches a receipt watch to its normalized root without losing an immediate terminal result", () => {
    const state = prepareActivity(
      watchActivity(emptyActivity(scope), "receipt"),
    );
    const result = receiveActivity(
      state,
      page({
        watched: [
          {
            ...row("root", "succeeded", 2),
            parentId: "root",
            requestedId: "receipt",
          },
        ],
      }),
      scope,
    );
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0]?.key).toBe(
      JSON.stringify(["root", 2, "succeeded"]),
    );
    expect(result.watches).toEqual([]);
  });
});

describe("Drive backup activity finite traversal", () => {
  it("retains a byte-limited watch batch until watchNext is exhausted", () => {
    let state = emptyActivity(scope);
    for (let index = 0; index < 75; index++)
      state = watchActivity(state, `parent-${index}`);
    state = prepareActivity(state);
    expect(activityInput(state).watch).toHaveLength(50);
    const first = state.batch.slice(0, 20).map((id) => row(id));
    state = receiveActivity(
      state,
      page({ active: 75, watched: first, watchNext: 20 }),
      scope,
    );
    expect(activityInput(prepareActivity(state)).watchAfter).toBe(20);
    expect(state.batch[0]).toBe("parent-0");
    const rest = state.batch.slice(20).map((id) => row(id));
    state = receiveActivity(state, page({ active: 75, watched: rest }), scope);
    state = prepareActivity(state);
    expect(state.batch[0]).toBe("parent-50");
    expect(state.batch).toContain("parent-74");
    expect(state.watches).toHaveLength(75);
  });

  it("reaches watches beyond the first fifty and retires inaccessible IDs", () => {
    let state = emptyActivity(scope);
    for (let index = 0; index < 120; index++)
      state = watchActivity(state, `parent-${index}`);
    const seen = new Set<string>();
    for (let turn = 0; turn < 3; turn++) {
      state = prepareActivity(state);
      for (const id of state.batch) seen.add(id);
      state = receiveActivity(
        state,
        page({ watched: state.batch.map((id) => row(id, "succeeded")) }),
        scope,
      );
    }
    expect(seen.size).toBe(120);
    expect(state.watches).toEqual([]);
    expect(state.notices).toHaveLength(120);
    state = prepareActivity(watchActivity(state, "inaccessible"));
    state = receiveActivity(state, page(), scope);
    expect(state.watches).toEqual([]);
    expect(state.notices).toHaveLength(120);
  });

  it("continues the history cursor and watches processing parents discovered later", () => {
    const cursor = {
      id: "last",
      createdAt: "2026-10-01T00:00:00.000Z",
      digest: "digest",
    };
    let state = receiveActivity(
      emptyActivity(scope),
      page({ next: cursor }),
      scope,
    );
    expect(activityInput(state).cursor).toEqual(cursor);
    state = receiveActivity(
      state,
      page({ active: 1, rows: [row("later-parent")] }),
      scope,
    );
    expect(activityInput(state).cursor).toBeUndefined();
    expect(activityInput(prepareActivity(state)).watch).toEqual([
      "later-parent",
    ]);
  });
});

describe("Drive backup activity read gate", () => {
  it("coalesces overlapping polls into one queued read without invalidating the current poll", () => {
    const first = beginActivityRead(emptyActivityReadGate());
    if (!first.ticket) throw new Error("Expected a read ticket");
    const second = beginActivityRead(first.gate);
    const third = beginActivityRead(second.gate);
    expect(second.ticket).toBeNull();
    expect(third.ticket).toBeNull();
    expect(activityReadCurrent(third.gate, first.ticket)).toBe(true);
    const finished = finishActivityRead(third.gate, first.ticket);
    expect(finished.repeat).toBe(true);
    const next = beginActivityRead(finished.gate);
    expect(next.ticket?.serial).toBe(2);
    expect(next.gate.queued).toBe(false);
  });

  it("rejects the in-flight response after router resolution and uses a fresh follow-up ticket", () => {
    const first = beginActivityRead(emptyActivityReadGate());
    if (!first.ticket) throw new Error("Expected a read ticket");
    const refresh = beginActivityRead(first.gate, true);
    expect(refresh.ticket).toBeNull();
    expect(activityReadCurrent(refresh.gate, first.ticket)).toBe(false);
    const finished = finishActivityRead(refresh.gate, first.ticket);
    const next = beginActivityRead(finished.gate);
    if (!next.ticket) throw new Error("Expected a follow-up ticket");
    expect(activityReadCurrent(next.gate, next.ticket)).toBe(true);
    expect(activityReadCurrent(next.gate, first.ticket)).toBe(false);
  });

  it("invalidates hidden, signed-out, and unmounted reads without launching queued work", () => {
    const first = beginActivityRead(emptyActivityReadGate());
    if (!first.ticket) throw new Error("Expected a read ticket");
    const queued = beginActivityRead(first.gate);
    const stopped = invalidateActivityRead(queued.gate);
    expect(activityReadCurrent(stopped, first.ticket)).toBe(false);
    expect(finishActivityRead(stopped, first.ticket).repeat).toBe(false);
    const visible = beginActivityRead(stopped, true);
    expect(visible.ticket).toBeNull();
    const finished = finishActivityRead(visible.gate, first.ticket);
    expect(finished.repeat).toBe(true);
  });
});

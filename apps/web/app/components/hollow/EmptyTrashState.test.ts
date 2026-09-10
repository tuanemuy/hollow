import type { EmptyTrashView } from "@repo/core/application/note/emptyTrash";
import { describe, expect, it } from "vitest";
import {
  acceptsEmptyRead,
  canConfirmEmpty,
  type EmptyConfirmation,
  type EmptyDetail,
  emptyChildLabel,
  emptyEvidence,
  emptyNeedsPoll,
  emptyReadIdentity,
  emptyStateLabel,
  emptyWatch,
  resolveEmptyConfirmation,
} from "./EmptyTrashState";

const snapshot = {
  id: "snapshot-a",
  total: 501,
  expiresAt: "2026-09-10T01:15:00.000Z",
};
const prepared: EmptyConfirmation = { kind: "prepared", snapshot };
const unknown: Extract<EmptyConfirmation, { kind: "unknown" }> = {
  kind: "unknown",
  snapshot,
  operation: "confirm",
};
const job = (
  id = snapshot.id,
  overrides: Partial<EmptyTrashView> = {},
): EmptyTrashView => ({
  id,
  createdAt: "2026-09-10T01:00:00.000Z",
  updatedAt: "2026-09-10T01:01:00.000Z",
  generation: 1,
  cancelRequested: false,
  state: "running",
  counts: {
    total: 501,
    waiting: 450,
    active: 1,
    succeeded: 50,
    failed: 0,
    cancelled: 0,
    expired: 0,
    retryable: 0,
  },
  historical: false,
  ...overrides,
});
const accepted = (value = job()): EmptyDetail => ({
  kind: "job",
  job: value,
  items: [],
  nextCursor: null,
});

describe("empty trash confirmation evidence", () => {
  it("requires a positive fixed snapshot, explicit checkbox and unexpired deadline", () => {
    const now = Date.parse("2026-09-10T01:14:59.999Z");
    expect(canConfirmEmpty(prepared, true, now)).toBe(true);
    expect(canConfirmEmpty(prepared, false, now)).toBe(false);
    expect(
      canConfirmEmpty(prepared, true, Date.parse(snapshot.expiresAt)),
    ).toBe(false);
    expect(canConfirmEmpty(prepared, true, Number.NaN)).toBe(false);
    expect(
      canConfirmEmpty(
        { kind: "prepared", snapshot: { ...snapshot, total: 0 } },
        true,
        now,
      ),
    ).toBe(false);
    expect(
      canConfirmEmpty(
        { kind: "prepared", snapshot: { ...snapshot, expiresAt: "invalid" } },
        true,
        now,
      ),
    ).toBe(false);
  });

  it.each<EmptyConfirmation>([
    { kind: "idle" },
    { kind: "empty" },
    unknown,
    { kind: "accepted", id: snapshot.id },
  ])("never confirms directly from $kind", (state) => {
    expect(
      canConfirmEmpty(state, true, Date.parse("2026-09-10T01:01:00.000Z")),
    ).toBe(false);
  });

  it("preserves the same snapshot when its confirmation remains prepared", () => {
    const result = resolveEmptyConfirmation(unknown, {
      kind: "prepared",
      ...snapshot,
    });
    expect(result).toEqual(prepared);
    expect(
      canConfirmEmpty(result, false, Date.parse("2026-09-10T01:01:00.000Z")),
    ).toBe(false);
    expect(snapshot.total).toBe(501);
  });

  it("requires a matching ID rather than treating an unrelated job as acknowledgement", () => {
    expect(resolveEmptyConfirmation(unknown, accepted(job("another")))).toBe(
      unknown,
    );
    expect(
      resolveEmptyConfirmation(unknown, {
        kind: "discarded",
        ...snapshot,
        id: "another",
      }),
    ).toBe(unknown);
  });

  it("treats a matching accepted job as acceptance, never as physical completion", () => {
    expect(resolveEmptyConfirmation(unknown, accepted())).toEqual({
      kind: "accepted",
      id: snapshot.id,
    });
    expect(emptyStateLabel(job())).toBe("一括削除の処理中");
    expect(emptyNeedsPoll(job())).toBe(true);
  });

  it("resolves discard only from its matching server phase and handles concurrent acceptance", () => {
    const discarding = { ...unknown, operation: "discard" as const };
    expect(
      resolveEmptyConfirmation(discarding, { kind: "discarded", ...snapshot }),
    ).toEqual({ kind: "idle" });
    expect(resolveEmptyConfirmation(discarding, accepted())).toEqual({
      kind: "accepted",
      id: snapshot.id,
    });
    expect(
      resolveEmptyConfirmation(discarding, { kind: "prepared", ...snapshot }),
    ).toEqual(prepared);
  });
});

describe("bounded empty trash reads", () => {
  it("rejects old generations, parent scopes, selected parents, child ordinals and cursors", () => {
    const identity = emptyReadIdentity("unfinished", null, null);
    const current = { generation: 3, identity };
    expect(acceptsEmptyRead(current, current)).toBe(true);
    expect(acceptsEmptyRead(current, { generation: 2, identity })).toBe(false);
    expect(
      acceptsEmptyRead(current, {
        generation: 3,
        identity: emptyReadIdentity("completed", null, null),
      }),
    ).toBe(false);
    expect(emptyReadIdentity("parent-a", 50)).not.toBe(
      emptyReadIdentity("parent-b", 50),
    );
    expect(emptyReadIdentity("parent-a", 50)).not.toBe(
      emptyReadIdentity("parent-a", 100),
    );
    expect(emptyReadIdentity("parent-a", 1, "same-date", "attempt-a")).not.toBe(
      emptyReadIdentity("parent-a", 1, "same-date", "attempt-b"),
    );
    expect(emptyReadIdentity("parent-a", 1, null, null)).not.toBe(
      emptyReadIdentity("parent-a", 2, null, null),
    );
  });

  it("limits watched parent IDs to 50 without limiting a 501-target fixed set", () => {
    const rows = Array.from({ length: 501 }, (_, index) =>
      job(`parent-${index}`),
    );
    expect(emptyWatch([job("parent-0"), ...rows])).toEqual(
      rows.slice(0, 50).map((row) => row.id),
    );
    expect(emptyWatch([])).toEqual([]);
    expect(job().counts.total).toBe(501);
  });

  it("uses observed latest results without accumulating former pages", () => {
    const running = job("a");
    const succeeded = job("a", { state: "succeeded" });
    expect(
      emptyEvidence({ items: [running, job("b")], observed: [succeeded] }),
    ).toEqual([succeeded, job("b")]);
    expect(
      emptyEvidence({ items: [job("next")], observed: [succeeded] }),
    ).toEqual([job("next"), succeeded]);
    expect(emptyEvidence({ items: [job("next")], observed: [] })).toEqual([
      job("next"),
    ]);
  });
});

describe("empty trash result distinctions", () => {
  it("continues polling failed physical recovery even after pending targets were cancelled", () => {
    const failed = job("a", {
      state: "cancelled",
      cancelRequested: true,
      counts: {
        total: 2,
        waiting: 0,
        active: 0,
        succeeded: 0,
        failed: 1,
        cancelled: 1,
        expired: 0,
        retryable: 1,
      },
    });
    expect(emptyNeedsPoll(failed)).toBe(true);
    expect(emptyStateLabel(failed)).toContain("回収待ち");
    expect(emptyStateLabel(job("a", { cancelRequested: true }))).toContain(
      "開始済みの回収を継続中",
    );
  });

  it("keeps cancellation separate from failure and physical success", () => {
    expect(emptyChildLabel("cancelled")).toBe("取消済み・削除対象外");
    expect(emptyChildLabel("queued", true)).toBe("未開始");
    expect(emptyChildLabel("queued")).toBe("受付済み・回収待ち");
    expect(emptyChildLabel("failed")).toBe("回収失敗");
    expect(emptyChildLabel("succeeded")).toBe("完全削除が完了");
  });

  it("does not derive success from progress and stops only for terminal jobs without failed recovery", () => {
    const counts = {
      total: 1,
      waiting: 0,
      active: 0,
      succeeded: 1,
      failed: 0,
      cancelled: 0,
      expired: 0,
      retryable: 0,
    };
    expect(emptyStateLabel(job("a", { counts, state: "running" }))).toBe(
      "一括削除の処理中",
    );
    expect(emptyNeedsPoll(job("a", { counts, state: "running" }))).toBe(true);
    expect(emptyNeedsPoll(job("a", { counts, state: "succeeded" }))).toBe(
      false,
    );
    expect(
      emptyNeedsPoll(
        job("a", {
          counts: { ...counts, succeeded: 0, cancelled: 1 },
          state: "cancelled",
          cancelRequested: true,
        }),
      ),
    ).toBe(false);
  });
});

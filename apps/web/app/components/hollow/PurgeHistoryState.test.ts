import type { PurgeView } from "@repo/core/application/note/purge";
import { describe, expect, it } from "vitest";
import {
  acceptsPurgeHistoryRead,
  type PurgeHistoryPage,
  purgeHistoryEvidence,
  purgeHistoryIdentity,
  purgeHistoryWatch,
  shouldPollPurgeHistory,
  unconfirmedPurgeRequests,
} from "./PurgeHistoryState";

const row = (id: string, state: PurgeView["state"] = "running"): PurgeView => ({
  id,
  noteId: `note-${id}`,
  operationId: `operation-${id}`,
  title: `名称 ${id}`,
  state,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:01:00.000Z",
  completed: state === "succeeded" ? 2 : 1,
  total: 2,
  failure: null,
});
const page = (changes: Partial<PurgeHistoryPage> = {}): PurgeHistoryPage => ({
  items: [],
  nextCursor: null,
  summary: { unfinished: 0, active: 0, failed: 0, representative: null },
  observed: [],
  requests: [],
  ...changes,
});
const request = { noteId: "note-a", operationId: "operation-a" };

describe("purge history bounded page state", () => {
  it("accepts only the current generation, scope and cursor identity", () => {
    const identity = purgeHistoryIdentity("unfinished", null);
    const current = { generation: 3, identity };
    expect(acceptsPurgeHistoryRead(current, current)).toBe(true);
    expect(acceptsPurgeHistoryRead(current, { generation: 2, identity })).toBe(
      false,
    );
    expect(
      acceptsPurgeHistoryRead(current, {
        generation: 3,
        identity: purgeHistoryIdentity("completed", null),
      }),
    ).toBe(false);
    expect(
      acceptsPurgeHistoryRead(current, {
        generation: 3,
        identity: purgeHistoryIdentity("unfinished", {
          at: "2026-09-10T00:00:00.000Z",
          id: "next",
        }),
      }),
    ).toBe(false);
    expect(acceptsPurgeHistoryRead({ generation: 4, identity }, current)).toBe(
      false,
    );
  });

  it("distinguishes cursor IDs at the same timestamp", () => {
    const at = "2026-09-10T00:00:00.000Z";
    expect(purgeHistoryIdentity("unfinished", { at, id: "a" })).not.toBe(
      purgeHistoryIdentity("unfinished", { at, id: "b" }),
    );
  });

  it("deduplicates evidence and reports a terminal row even after it leaves the page", () => {
    const result = page({
      items: [row("b"), row("c")],
      observed: [row("a", "succeeded"), row("b", "failed")],
    });
    expect(
      purgeHistoryEvidence(result).map(({ id, state }) => ({ id, state })),
    ).toEqual([
      { id: "b", state: "failed" },
      { id: "c", state: "running" },
      { id: "a", state: "succeeded" },
    ]);
    expect(result.items.map((item) => item.id)).toEqual(["b", "c"]);
    expect(purgeHistoryEvidence(page({ items: [row("next")] }))).toEqual([
      row("next"),
    ]);
  });

  it("watches at most 50 distinct current page IDs", () => {
    const items = Array.from({ length: 70 }, (_, index) => row(String(index)));
    expect(purgeHistoryWatch([row("0"), ...items])).toEqual(
      items.slice(0, 50).map((item) => item.id),
    );
    expect(purgeHistoryWatch([])).toEqual([]);
  });

  it("polls global unfinished work even when the current page is empty or completed", () => {
    expect(
      shouldPollPurgeHistory(
        page({
          items: [row("done", "succeeded")],
          summary: {
            unfinished: 51,
            active: 1,
            failed: 50,
            representative: row("other"),
          },
        }),
        [],
      ),
    ).toBe(true);
    expect(
      shouldPollPurgeHistory(
        page({
          summary: {
            unfinished: 1,
            active: 0,
            failed: 1,
            representative: row("failed", "failed"),
          },
        }),
        [],
      ),
    ).toBe(true);
    expect(shouldPollPurgeHistory(page(), [])).toBe(false);
    expect(shouldPollPurgeHistory(null, [])).toBe(false);
  });

  it("does not treat absent or null request evidence as completion", () => {
    expect(shouldPollPurgeHistory(null, [request])).toBe(true);
    expect(shouldPollPurgeHistory(page(), [request])).toBe(true);
    const result = page({ requests: [{ ...request, purge: null }] });
    expect(unconfirmedPurgeRequests([request], result)).toEqual([request]);
    expect(shouldPollPurgeHistory(result, [request])).toBe(true);
  });

  it("requires the exact note and operation pair rather than another request or visible note", () => {
    const result = page({
      items: [row("a", "succeeded")],
      observed: [row("a", "succeeded")],
      requests: [
        { ...request, operationId: "other", purge: row("a", "succeeded") },
        { ...request, noteId: "other", purge: row("a", "succeeded") },
      ],
    });
    expect(unconfirmedPurgeRequests([request], result)).toEqual([request]);
  });

  it("stops polling only when no unfinished work and all requested pairs are confirmed", () => {
    const result = page({
      requests: [{ ...request, purge: row("a", "succeeded") }],
    });
    expect(unconfirmedPurgeRequests([request], result)).toEqual([]);
    expect(shouldPollPurgeHistory(result, [request])).toBe(false);
    expect(
      shouldPollPurgeHistory(result, [
        request,
        { ...request, operationId: "unconfirmed" },
      ]),
    ).toBe(true);
  });
});

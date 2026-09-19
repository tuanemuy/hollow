import type {
  BatchAcceptInput,
  BatchPreviewItem,
} from "@repo/core/application/batch/ports";
import type {
  BrowseConditions,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import type { MoveExpected } from "@repo/core/application/move/ports";
import { describe, expect, it } from "vitest";
import {
  acceptanceInput,
  acceptsSelectionTicket,
  batchSource,
  confirmationInput,
  displayedIds,
  emptySelection,
  ownsBatchAdmission,
  selectionFilterKey,
  selectVisible,
  selectWhole,
  toggleSelected,
  unknownBatchResult,
  wholeSelectionConditions,
} from "./model";

const conditions: BrowseConditions = {
  query: "東京 cloud",
  tags: ["b", "a"],
  zone: "Asia/Tokyo",
  month: "2026-09",
  sort: "relevance",
  layout: "list",
};
const expected: MoveExpected = {
  sharing: { version: 0, visibility: "private", hasPassword: false },
  noteId: "note",
  version: 1,
  ownershipGeneration: 1,
  resourceRevision: 1,
  source: {
    owner: { kind: "personal", accountId: "actor" },
    name: "個人",
    membershipRevision: 0,
  },
  destination: {
    owner: { kind: "workspace", workspaceId: "workspace" },
    name: "チーム",
    membershipRevision: 1,
  },
  normalizationVersion: "16.0.0",
  tags: [],
  bundle: null,
  sourceRelease: 2,
  destinationIncrease: 2,
  resources: {
    originals: { count: 1, bytes: 2 },
    currentAssets: { count: 0, bytes: 0 },
    heldAssets: { count: 0, bytes: 0 },
    graceAssets: { count: 0, bytes: 0 },
    mediaReservations: { count: 0, bytes: 0 },
    referenceReservations: { count: 0, bytes: 0 },
  },
};
const ready: BatchPreviewItem = {
  kind: "ready",
  noteId: "note",
  title: "東京",
  expected: { kind: "move", move: expected },
  latestAttemptId: null,
  baseSequence: 0,
  move: {
    expected,
    sourceCapacity: { used: 10, limit: 100, after: 8 },
    destinationCapacity: { used: 20, limit: 100, after: 22 },
    gained: {
      direction: "gained",
      total: 1,
      items: [{ id: "member", label: "person" }],
      next: null,
    },
    lost: { direction: "lost", total: 0, items: [], next: null },
    interrupted: { mediaUploads: 0, referenceJobs: 0 },
  },
};

describe("batch selection and finite confirmation", () => {
  it("starts with no implicit selected IDs", () => {
    expect(emptySelection()).toEqual({
      enabled: false,
      ids: [],
      origin: "visible",
    });
  });
  it("deduplicates displayed notes while preserving explicit order", () => {
    expect(selectVisible(emptySelection(), ["b", "a", "b"])?.ids).toEqual([
      "b",
      "a",
    ]);
  });
  it("accepts exactly 500 without shrinking the result", () => {
    const ids = Array.from({ length: 500 }, (_, i) => `n${i}`);
    expect(selectVisible(emptySelection(), ids)?.ids).toEqual(ids);
  });
  it("rejects 501 and leaves the source intact", () => {
    const previous = { ...emptySelection(), ids: ["existing"] };
    expect(
      selectVisible(
        previous,
        Array.from({ length: 500 }, (_, i) => `n${i}`),
      ),
    ).toBeNull();
    expect(previous.ids).toEqual(["existing"]);
  });
  it("does not count a duplicate twice at the 500 boundary", () => {
    const ids = Array.from({ length: 500 }, (_, i) => `n${i}`);
    expect(
      selectVisible({ ...emptySelection(), ids }, ["n0"])?.ids,
    ).toHaveLength(500);
  });
  it("marks a removal from the whole set as a subset", () => {
    expect(
      toggleSelected({ enabled: true, ids: ["a", "b"], origin: "whole" }, "a"),
    ).toEqual({ enabled: true, ids: ["b"], origin: "subset" });
  });
  it("does not automatically include new matching notes", () => {
    const selection = { enabled: true, ids: ["a"], origin: "whole" as const };
    const unrelatedNextPage = ["a", "b"];
    expect(selection.ids).not.toEqual(unrelatedNextPage);
    expect(selection.ids).toEqual(["a"]);
  });
  it("keeps previously fixed nonmatching IDs when explicitly selecting whole again", () => {
    expect(
      selectWhole({ enabled: true, ids: ["old"], origin: "visible" }, ["a"])
        ?.ids,
    ).toEqual(["old", "a"]);
    expect(
      selectWhole({ enabled: true, ids: ["old"], origin: "visible" }, ["a"])
        ?.origin,
    ).toBe("subset");
  });
  it("labels only a matching fixed union as whole", () => {
    expect(
      selectWhole({ enabled: true, ids: ["b"], origin: "visible" }, ["a", "b"])
        ?.origin,
    ).toBe("whole");
  });
  it("ignores sorting, layout, cursor, and day expansion in filter identity", () => {
    expect(selectionFilterKey(conditions, "actor")).toBe(
      selectionFilterKey(
        {
          ...conditions,
          tags: ["a", "b"],
          sort: "title-asc",
          layout: "calendar",
          cursor: "next",
          day: "2026-09-11",
        } as BrowseConditions,
        "actor",
      ),
    );
  });
  it("changes identity on actor/scope/query/tag/month/zone changes", () => {
    const original = selectionFilterKey(conditions, "actor");
    expect(selectionFilterKey(conditions, "other")).not.toBe(original);
    for (const delta of [
      { workspaceId: "workspace" },
      { query: "京都" },
      { tags: ["a"] },
      { month: "2026-10" },
      { zone: "America/New_York" },
    ])
      expect(selectionFilterKey({ ...conditions, ...delta }, "actor")).not.toBe(
        original,
      );
  });
  it("uses the entire calendar month for whole selection", () => {
    const input = wholeSelectionConditions({
      ...conditions,
      layout: "calendar",
      cursor: "day-next",
      day: "2026-09-11",
    });
    expect(input.month).toBe("2026-09");
    expect(input.zone).toBe("Asia/Tokyo");
    expect(input).not.toHaveProperty("day");
    expect(input).not.toHaveProperty("cursor");
  });
  it("creates personal owner from the current actor, not a creator", () => {
    expect(batchSource(null, "actor")).toEqual({
      kind: "personal",
      accountId: "actor",
    });
    expect(batchSource("workspace", "actor")).toEqual({
      kind: "workspace",
      workspaceId: "workspace",
    });
  });
  it("strips only move display data from a ready confirmation", () => {
    const result = confirmationInput(ready);
    expect(result).not.toHaveProperty("move");
    expect(result).toMatchObject({
      kind: "ready",
      noteId: "note",
      title: "東京",
      latestAttemptId: null,
      baseSequence: 0,
    });
    if (result.kind === "ready" && result.expected.kind === "move")
      expect(result.expected.move).toEqual(expected);
    expect(ready.move?.gained.items).toHaveLength(1);
  });
  it("keeps excluded confirmation IDs without attaching private labels", () => {
    expect(
      confirmationInput({ kind: "excluded", noteId: "unavailable" }),
    ).toEqual({ kind: "excluded", noteId: "unavailable" });
  });
  it("preserves request, operation, excluded items and ordering across resends", () => {
    const input: BatchAcceptInput = {
      requestId: "fixed-request",
      source: expected.source.owner,
      operation: { kind: "move", destination: expected.destination.owner },
      items: [{ kind: "excluded", noteId: "hidden" }, confirmationInput(ready)],
    };
    expect(acceptanceInput(input)).toEqual(acceptanceInput(input));
    expect(acceptanceInput(input).requestId).toBe("fixed-request");
    expect(acceptanceInput(input).items.map((item) => item.noteId)).toEqual([
      "hidden",
      "note",
    ]);
    const transportCopy = acceptanceInput(input);
    transportCopy.items.reverse();
    expect(input.items.map((item) => item.noteId)).toEqual(["hidden", "note"]);
  });
  it("keeps retry attempt and base sequence rather than substituting latest", () => {
    const result = confirmationInput({
      ...ready,
      latestAttemptId: "failed-attempt",
      baseSequence: 5,
    });
    expect(result).toMatchObject({
      latestAttemptId: "failed-attempt",
      baseSequence: 5,
    });
  });
  it("does not infer success or failure from a lost acknowledgement", () => {
    expect(unknownBatchResult(new Error("network"))).toBe(true);
    expect(
      unknownBatchResult({
        serialized: { kind: "system", code: null, message: "System error" },
      }),
    ).toBe(true);
    expect(
      unknownBatchResult({
        serialized: {
          kind: "business",
          code: "BATCH_CHANGED",
          message: "changed",
        },
      }),
    ).toBe(false);
  });
  it("selects only rendered calendar notes, deduplicating day rows", () => {
    const note = {
      sharing: {
        visibility: "private" as const,
        hasPassword: false,
        hasLink: false,
      },
      id: "visible",
      title: "本文",
      createdAt: "2026-09-11T00:00:00Z",
      updatedAt: "2026-09-11T00:00:00Z",
      status: "ready" as const,
      titleParts: [],
      excerpt: [],
      thumbnailUrl: null,
      mediaLabel: null,
      tags: [],
    };
    const page: BrowsePage = {
      items: [{ ...note, id: "not-calendar" }],
      nextCursor: null,
      scope: { workspaceId: null, name: "個人", canEdit: true },
      usage: { usedBytes: 0, limitBytes: 100, updatedAt: note.updatedAt },
      total: 50,
      conditions: { ...conditions, layout: "calendar" },
      identity: "page",
      selectedTags: [],
      calendar: [
        {
          date: "2026-09-11",
          count: 50,
          items: [note, note],
          nextCursor: "more",
        },
      ],
    };
    expect(displayedIds(page)).toEqual(["visible"]);
    expect(
      displayedIds({ ...page, conditions: { ...conditions, layout: "list" } }),
    ).toEqual(["not-calendar"]);
  });
  it("rejects old A responses after filter A to B to A", () => {
    const ticket = { key: "A", epoch: 0 };
    expect(
      acceptsSelectionTicket({ key: "A", epoch: 0, mounted: true }, ticket),
    ).toBe(true);
    expect(
      acceptsSelectionTicket({ key: "B", epoch: 1, mounted: true }, ticket),
    ).toBe(false);
    expect(
      acceptsSelectionTicket({ key: "A", epoch: 2, mounted: true }, ticket),
    ).toBe(false);
    expect(
      acceptsSelectionTicket({ key: "A", epoch: 0, mounted: false }, ticket),
    ).toBe(false);
  });
  it("owns admission pending only in the current actor epoch", () => {
    const request = { actorId: "A", actorEpoch: 0 };
    expect(
      ownsBatchAdmission(
        { userId: "A", actorEpoch: 0, mounted: true },
        request,
      ),
    ).toBe(true);
    for (const userId of [null, "B", "A"]) {
      expect(
        ownsBatchAdmission({ userId, actorEpoch: 2, mounted: true }, request),
      ).toBe(false);
    }
    expect(
      ownsBatchAdmission(
        { userId: "A", actorEpoch: 0, mounted: false },
        request,
      ),
    ).toBe(false);
  });
  it("a new actor owns its request while the previous actor still waits", () => {
    const current = { userId: "B", actorEpoch: 1, mounted: true };
    expect(ownsBatchAdmission(current, { actorId: "A", actorEpoch: 0 })).toBe(
      false,
    );
    expect(ownsBatchAdmission(current, { actorId: "B", actorEpoch: 1 })).toBe(
      true,
    );
    expect(ownsBatchAdmission(current, null)).toBe(false);
  });
});

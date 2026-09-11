import type {
  BrowseNote,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import { describe, expect, it } from "vitest";
import {
  applyPageTagChoice,
  optimisticTags,
  replacePageTags,
  tagManagerIdentity,
  tagScope,
  validTagName,
} from "./model";

const a = { id: "a", name: "東京" };
const b = { id: "b", name: "cloud" };
const note: BrowseNote = {
  id: "note",
  title: "本文",
  createdAt: "2026-09-11T00:00:00Z",
  updatedAt: "2026-09-11T00:00:00Z",
  status: "ready",
  titleParts: [],
  excerpt: [],
  thumbnailUrl: null,
  mediaLabel: null,
  tags: [a, b],
};
function page(tags: readonly string[] = []): BrowsePage {
  return {
    items: [note],
    nextCursor: "next",
    scope: { workspaceId: null, name: "個人", canEdit: true },
    usage: { usedBytes: 10, limitBytes: 100, updatedAt: note.updatedAt },
    total: 8,
    identity: "identity",
    selectedTags: [],
    conditions: {
      query: "",
      tags,
      zone: "Asia/Tokyo",
      layout: "list",
      sort: "updated-desc",
    },
    calendar: [],
  };
}

describe("tag UI projections", () => {
  it("adds once and detaches only the requested tag", () => {
    expect(
      optimisticTags([a], { change: { kind: "attach", tagId: "a" }, tag: a }),
    ).toEqual([a]);
    expect(
      optimisticTags([a, b], {
        change: { kind: "detach", tagId: "a" },
        tag: a,
      }),
    ).toEqual([b]);
  });
  it("keeps pending IDs outside server identities", () => {
    const pending = { id: "pending:note", name: "新規" };
    expect(
      optimisticTags([a], {
        change: { kind: "create", name: "新規" },
        tag: pending,
      }),
    ).toEqual([a, pending]);
  });
  it("preserves source and metadata on optimistic updates", () => {
    const source = page();
    const changed = replacePageTags(source, note.id, [b]);
    expect(changed.items[0]).toEqual({ ...note, tags: [b] });
    expect(source.items[0]?.tags).toEqual([a, b]);
    expect(changed.total).toBe(8);
    expect(changed.nextCursor).toBe("next");
    expect(changed.usage).toBe(source.usage);
  });
  it("removes a filtered leaf but leaves its parent rollback source intact", () => {
    const source = page([a.id, b.id]);
    const changed = replacePageTags(source, note.id, [b]);
    expect(changed.items).toEqual([]);
    expect(changed.total).toBe(7);
    expect(source.items).toEqual([note]);
    expect(source.total).toBe(8);
  });
  it("updates calendar day counts without decrementing the global count twice", () => {
    const source = {
      ...page([a.id]),
      calendar: [
        { date: "2026-09-11", count: 5, items: [note], nextCursor: "day-next" },
      ],
    };
    const changed = replacePageTags(source, note.id, [b]);
    expect(changed.total).toBe(7);
    expect(changed.calendar[0]).toEqual({
      date: "2026-09-11",
      count: 4,
      items: [],
      nextCursor: "day-next",
    });
  });
  it("does not invent membership for unloaded notes", () => {
    const source = page([a.id]);
    expect(replacePageTags(source, "unloaded", [b]).total).toBe(source.total);
  });
  it("rebases a pending delta onto the latest tags without replacing other changes", () => {
    const c = { id: "c", name: "他の変更" };
    const current = { ...page(), items: [{ ...note, tags: [a, b, c] }] };
    expect(
      applyPageTagChoice(current, note.id, {
        change: { kind: "detach", tagId: a.id },
        tag: a,
      }).items[0]?.tags,
    ).toEqual([b, c]);
    expect(
      applyPageTagChoice(current, "unloaded", {
        change: { kind: "attach", tagId: a.id },
        tag: a,
      }),
    ).toBe(current);
  });
  it("requires every AND filter and keeps unknown filters restrictive", () => {
    expect(
      replacePageTags(page([a.id, b.id]), note.id, [a, b]).items,
    ).toHaveLength(1);
    expect(
      replacePageTags(page(["deleted"]), note.id, [a, b]).items,
    ).toHaveLength(0);
  });
  it("uses trimmed Unicode code points for display validation", () => {
    expect(validTagName("　 ")).toBe(false);
    expect(validTagName(` ${"😀".repeat(50)} `)).toBe(true);
    expect(validTagName("😀".repeat(51))).toBe(false);
  });
  it("does not inherit a foreign scope", () => {
    expect(tagScope(null)).toEqual({});
    expect(tagScope("workspace")).toEqual({ workspaceId: "workspace" });
  });
  it("matches omitted defaults but rejects stale manager scope/query/page", () => {
    expect(tagManagerIdentity({})).toBe(
      tagManagerIdentity({ query: "", unusedOnly: false }),
    );
    expect(tagManagerIdentity({ workspaceId: "a" })).not.toBe(
      tagManagerIdentity({ workspaceId: "b" }),
    );
    expect(tagManagerIdentity({ query: "東京" })).not.toBe(
      tagManagerIdentity({ query: "京都" }),
    );
    expect(tagManagerIdentity({ cursor: "old" })).not.toBe(
      tagManagerIdentity({}),
    );
  });
});

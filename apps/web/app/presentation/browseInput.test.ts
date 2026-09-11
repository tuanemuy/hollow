import { describe, expect, it } from "vitest";
import {
  browseIdentity,
  browseInputSchema,
  browseRouteSchema,
  browseTagInputSchema,
  isBrowseZone,
  searchProblem,
} from "./browseInput";

const id = "19cb5dba-8910-47d8-8ab6-028685a73918";
const other = "19cb5dba-8910-47d8-8ab6-028685a73919";
const base = {
  query: "",
  tags: [],
  zone: "Asia/Tokyo",
  sort: "updated-desc",
  layout: "list",
};
describe("browse input boundary", () => {
  it("preserves absent URL preferences until browser preparation", () => {
    expect(browseRouteSchema.parse({})).toEqual({ query: "", tags: [] });
    expect(browseInputSchema.safeParse({}).success).toBe(false);
    expect(
      browseRouteSchema.parse({
        zone: "UTC",
        layout: "tile",
        sort: "created-asc",
      }),
    ).toEqual({
      query: "",
      tags: [],
      zone: "UTC",
      layout: "tile",
      sort: "created-asc",
    });
  });
  it.each([
    "東",
    "a",
    "あ".repeat(201),
    "!!",
    "💡💡",
    Array.from({ length: 17 }, (_, i) => `word${i}`).join(" "),
  ])("rejects invalid search without widening to all: %s", (query) => {
    expect(searchProblem(query)).not.toBeNull();
    expect(browseInputSchema.safeParse({ ...base, query }).success).toBe(false);
  });
  it.each([
    "東京",
    "cloud",
    "cloud東京",
    "東 a",
    "  東京  ",
    "a".repeat(200),
    "𠮷".repeat(200),
    "",
  ])("accepts exact query limit/mixture: %s", (query) => {
    expect(searchProblem(query)).toBeNull();
    expect(browseInputSchema.parse({ ...base, query }).query).toBe(
      query.trim(),
    );
  });
  it("retains unknown but syntactically valid tag IDs and deduplicates only identical IDs", () => {
    expect(
      browseInputSchema.parse({ ...base, tags: [other, id, other] }).tags,
    ).toEqual([id, other]);
    expect(
      browseInputSchema.safeParse({
        ...base,
        tags: Array.from({ length: 51 }, () => id),
      }).success,
    ).toBe(false);
    expect(
      browseInputSchema.safeParse({ ...base, tags: ["foreign-name"] }).success,
    ).toBe(false);
  });
  it("applies note search length after trimming raw input", () => {
    expect(
      browseInputSchema.parse({
        ...base,
        query: `${" ".repeat(500)}東京${" ".repeat(500)}`,
      }).query,
    ).toBe("東京");
  });
  it("refuses client authorization fields and unsafe scope shape", () => {
    for (const extra of [
      { accountId: id },
      { canEdit: true },
      { role: "owner" },
      { workspaceId: "../scope" },
      { workspaceId: [id] },
    ])
      expect(browseInputSchema.safeParse({ ...base, ...extra }).success).toBe(
        false,
      );
  });
  it("requires a named zone and a real day bound to month/calendar/cursor", () => {
    for (const zone of ["+09:00", "-02:00", "Not/AZone", ""])
      expect(isBrowseZone(zone)).toBe(false);
    for (const zone of [
      "UTC",
      "Asia/Tokyo",
      "America/New_York",
      "Pacific/Apia",
    ])
      expect(isBrowseZone(zone)).toBe(true);
    expect(
      browseInputSchema.safeParse({ ...base, layout: "calendar" }).success,
    ).toBe(false);
    const day = {
      ...base,
      layout: "calendar",
      month: "2024-02",
      day: "2024-02-29",
      cursor: "day-cursor",
    };
    expect(browseInputSchema.safeParse(day).success).toBe(true);
    for (const change of [
      { day: "2024-02-30" },
      { day: "2024-03-01" },
      { cursor: undefined },
      { layout: "list" },
      { month: "0000-01" },
    ])
      expect(browseInputSchema.safeParse({ ...day, ...change }).success).toBe(
        false,
      );
  });
  it("bounds opaque cursor and separates the tag cursor limit", () => {
    expect(
      browseInputSchema.safeParse({ ...base, cursor: "x".repeat(16384) })
        .success,
    ).toBe(true);
    expect(
      browseInputSchema.safeParse({ ...base, cursor: "x".repeat(16385) })
        .success,
    ).toBe(false);
    expect(
      browseTagInputSchema.safeParse({
        conditions: base,
        tagQuery: "",
        tagCursor: "x".repeat(4097),
      }).success,
    ).toBe(false);
    expect(
      browseTagInputSchema.safeParse({
        conditions: base,
        tagQuery: "a".repeat(201),
      }).success,
    ).toBe(false);
  });
  it("does not allow relevance as an ordinary sort", () => {
    expect(
      browseInputSchema.safeParse({ ...base, sort: "relevance" }).success,
    ).toBe(false);
    expect(
      browseInputSchema.safeParse({ ...base, query: "東京", sort: "relevance" })
        .success,
    ).toBe(true);
  });
  it("identifies every filter/cursor and treats tag order as identical", () => {
    const conditions = browseInputSchema.parse(base);
    const identity = browseIdentity(conditions);
    for (const change of [
      { workspaceId: id },
      { query: "東京" },
      { tags: [id] },
      { month: "2026-09" },
      { zone: "UTC" },
      { layout: "tile" as const },
      { sort: "title-asc" as const },
      { cursor: "next" },
      { day: "2026-09-01" },
    ])
      expect(browseIdentity({ ...conditions, ...change })).not.toBe(identity);
    expect(browseIdentity({ ...conditions, tags: [id, other] })).toBe(
      browseIdentity({ ...conditions, tags: [other, id] }),
    );
  });
});

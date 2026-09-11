import type { BrowseNote } from "@repo/core/application/browse/ports";
import { describe, expect, it } from "vitest";
import {
  browseInputSchema,
  browseRouteSchema,
} from "@/presentation/browseInput";
import {
  appendNotes,
  changeBrowse,
  changeLayout,
  clearFilters,
  currentMonth,
  decodePreference,
  preferenceForConditions,
  preferenceKey,
  resolveBrowse,
  shiftMonth,
} from "./model";

const preference = {
  version: 1 as const,
  layout: "tile" as const,
  sort: "title-desc" as const,
  zone: "Asia/Tokyo",
};
const now = new Date("2026-09-30T15:30:00Z");
const base = browseInputSchema.parse({
  query: "",
  tags: [],
  zone: "UTC",
  layout: "list",
  sort: "updated-desc",
});
describe("browse condition and device codec", () => {
  it("stores only version/layout/normal sort/zone in a user-specific key", () => {
    expect(decodePreference(JSON.stringify(preference))).toEqual(preference);
    for (const value of [
      { ...preference, query: "secret" },
      { ...preference, workspaceId: "scope" },
      { ...preference, version: 2 },
      { ...preference, sort: "relevance" },
      { ...preference, zone: "+09:00" },
    ])
      expect(decodePreference(JSON.stringify(value))).toBeNull();
    expect(decodePreference("bad-json")).toBeNull();
    expect(decodePreference(null)).toBeNull();
    expect(preferenceKey("a")).not.toBe(preferenceKey("b"));
  });
  it("honors explicit URL values over user settings and browser zone", () => {
    const url = browseRouteSchema.parse({
      layout: "list",
      sort: "created-asc",
      zone: "America/Los_Angeles",
      month: "2025-02",
      query: "東京",
    });
    expect(resolveBrowse(url, preference, "Europe/London", now)).toEqual(url);
  });
  it("applies missing preferences only, with relevance for a new search", () => {
    expect(
      resolveBrowse(browseRouteSchema.parse({}), preference, "UTC", now),
    ).toEqual({
      ...base,
      layout: "tile",
      sort: "title-desc",
      zone: "Asia/Tokyo",
    });
    expect(
      resolveBrowse(
        browseRouteSchema.parse({ query: "東京" }),
        preference,
        "UTC",
        now,
      ).sort,
    ).toBe("relevance");
    expect(
      resolveBrowse(browseRouteSchema.parse({}), null, "UTC", now),
    ).toEqual(base);
  });
  it("preserves the pre-search normal order even when a different search order is chosen", () => {
    expect(
      preferenceForConditions(
        { ...base, query: "東京", sort: "created-asc" },
        preference,
      ).sort,
    ).toBe("title-desc");
    expect(
      preferenceForConditions(
        { ...base, query: "東京", sort: "relevance" },
        null,
      ).sort,
    ).toBe("updated-desc");
    expect(
      preferenceForConditions({ ...base, sort: "created-asc" }, preference)
        .sort,
    ).toBe("created-asc");
  });
  it("uses the user's civil current month after a scope-switch filter reset", () => {
    const result = resolveBrowse(
      browseRouteSchema.parse({
        workspaceId: "19cb5dba-8910-47d8-8ab6-028685a73918",
      }),
      { ...preference, layout: "calendar" },
      "UTC",
      now,
    );
    expect(result.month).toBe("2026-10");
    expect(result.query).toBe("");
    expect(result.tags).toEqual([]);
    expect(result.cursor).toBeUndefined();
    expect(currentMonth(now, "UTC")).toBe("2026-09");
    expect(currentMonth(now, "Asia/Tokyo")).toBe("2026-10");
  });
  it("drops continuation on changes, retains month across calendar switch, clears it to list", () => {
    const source = {
      ...base,
      query: "東京",
      tags: ["tag"],
      month: "2024-02",
      cursor: "next",
      day: "2024-02-01",
    };
    expect(changeBrowse(source, { zone: "Asia/Tokyo" })).toMatchObject({
      cursor: undefined,
      day: undefined,
      query: "東京",
      month: "2024-02",
    });
    expect(changeLayout(source, "calendar", now).month).toBe("2024-02");
    expect(changeLayout(base, "calendar", now).month).toBe("2026-09");
    expect(
      clearFilters(
        { ...source, layout: "calendar", sort: "relevance" },
        "title-desc",
      ),
    ).toMatchObject({
      query: "",
      tags: [],
      month: undefined,
      layout: "list",
      sort: "title-desc",
      cursor: undefined,
      day: undefined,
    });
  });
  it("changes civil months across year boundaries without fixed day durations", () => {
    expect(shiftMonth("2024-01", -1)).toBe("2023-12");
    expect(shiftMonth("2024-12", 1)).toBe("2025-01");
    expect(shiftMonth("2024-02", 1)).toBe("2024-03");
  });
  it("deduplicates live page IDs without reordering or replacing existing records", () => {
    const note = (id: string): BrowseNote => ({
      id,
      title: id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: "ready",
      titleParts: [],
      excerpt: [],
      thumbnailUrl: null,
      mediaLabel: null,
      tags: [],
    });
    const first = note("a");
    expect(
      appendNotes(
        [first],
        [{ ...first, title: "changed" }, note("b"), note("b"), note("c")],
      ),
    ).toEqual([first, note("b"), note("c")]);
  });
});

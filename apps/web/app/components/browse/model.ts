import type {
  BrowseConditions,
  BrowseNote,
  BrowsePage,
  BrowseScope,
} from "@repo/core/application/browse/ports";
import type { BrowseLayout, BrowseSort } from "@repo/core/domain/browse/query";
import { z } from "zod";
import {
  type BrowseRouteSearch,
  browseInputSchema,
  browseZoneSchema,
} from "@/presentation/browseInput";

export function paletteScopeName(
  session: BrowseScope,
  current: BrowseScope | undefined,
): string {
  return current?.workspaceId === session.workspaceId
    ? current.name
    : session.name;
}

export const normalSorts = [
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "title-asc",
  "title-desc",
] as const;
export const sortLabels: Record<BrowseSort, string> = {
  "updated-desc": "更新が新しい順",
  "updated-asc": "更新が古い順",
  "created-desc": "作成が新しい順",
  "created-asc": "作成が古い順",
  "title-asc": "タイトル昇順",
  "title-desc": "タイトル降順",
  relevance: "関連度順",
};
export const preferenceSchema = z
  .object({
    version: z.literal(1),
    layout: z.enum(["tile", "list", "calendar"]),
    sort: z.enum(normalSorts),
    zone: browseZoneSchema,
  })
  .strict();
export type BrowsePreference = z.infer<typeof preferenceSchema>;
export function preferenceForConditions(
  conditions: BrowseConditions,
  previous: BrowsePreference | null,
): BrowsePreference {
  return {
    version: 1,
    layout: conditions.layout,
    sort:
      conditions.query || conditions.sort === "relevance"
        ? (previous?.sort ?? "updated-desc")
        : conditions.sort,
    zone: conditions.zone,
  };
}
export const preferenceKey = (userId: string) => `hollow:browse:v1:${userId}`;
export function decodePreference(raw: string | null): BrowsePreference | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value = preferenceSchema.safeParse(JSON.parse(raw));
    return value.success ? value.data : null;
  } catch {
    return null;
  }
}
export function currentMonth(now: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    calendar: "iso8601",
    numberingSystem: "latn",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")?.value.padStart(4, "0")}-${parts.find((part) => part.type === "month")?.value}`;
}
export function resolveBrowse(
  search: BrowseRouteSearch,
  preference: BrowsePreference | null,
  browserZone: string,
  now: Date,
): BrowseConditions {
  const zone = search.zone ?? preference?.zone ?? browserZone;
  const layout = search.layout ?? preference?.layout ?? "list";
  return browseInputSchema.parse({
    ...search,
    zone,
    layout,
    sort:
      search.sort ??
      (search.query ? "relevance" : (preference?.sort ?? "updated-desc")),
    ...(layout === "calendar" && !search.month
      ? { month: currentMonth(now, zone) }
      : {}),
  });
}
export function changeBrowse(
  current: BrowseConditions,
  change: Partial<BrowseConditions>,
): BrowseConditions {
  return { ...current, cursor: undefined, day: undefined, ...change };
}
export function changeLayout(
  current: BrowseConditions,
  layout: BrowseLayout,
  now: Date,
): BrowseConditions {
  return changeBrowse(current, {
    layout,
    ...(layout === "calendar" && !current.month
      ? { month: currentMonth(now, current.zone) }
      : {}),
  });
}
export function clearFilters(
  current: BrowseConditions,
  normalSort: BrowsePreference["sort"],
): BrowseConditions {
  return changeBrowse(current, {
    query: "",
    tags: [],
    month: undefined,
    layout: current.layout === "calendar" ? "list" : current.layout,
    sort: normalSort,
  });
}
export function appendNotes(
  previous: readonly BrowseNote[],
  next: readonly BrowseNote[],
): readonly BrowseNote[] {
  const seen = new Set(previous.map((note) => note.id));
  return [
    ...previous,
    ...next.filter((note) => {
      if (seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    }),
  ];
}
export function pageForDisplay(page: BrowsePage): BrowsePage {
  return page.conditions.layout === "calendar" && page.conditions.day
    ? {
        ...page,
        items: [],
        nextCursor: null,
        calendar: [
          {
            date: page.conditions.day,
            count: page.total,
            items: page.items,
            nextCursor: page.nextCursor,
          },
        ],
      }
    : page;
}
export function shiftMonth(value: string, delta: -1 | 1): string {
  const [year, month] = value.split("-").map(Number);
  const next = (year ?? 0) * 12 + (month ?? 1) - 1 + delta;
  return `${Math.floor(next / 12)
    .toString()
    .padStart(4, "0")}-${((next % 12) + 1).toString().padStart(2, "0")}`;
}

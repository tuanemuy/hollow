import type {
  BrowseConditions,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import { describe, expect, it } from "vitest";
import { pageForDisplay } from "./model";
import {
  acceptsPage,
  acceptsRequest,
  matchesBrowseLocation,
  noteScopeForPath,
} from "./requestState";

const id = "19cb5dba-8910-47d8-8ab6-028685a73918";
const other = "19cb5dba-8910-47d8-8ab6-028685a73919";
const conditions: BrowseConditions = {
  query: "東京",
  tags: [id],
  zone: "UTC",
  sort: "relevance",
  layout: "list",
};
const page: BrowsePage = {
  conditions,
  identity: "server-identity",
  items: [],
  nextCursor: "next",
  scope: { workspaceId: null, name: "個人", canEdit: true },
  usage: { usedBytes: 0, limitBytes: 1, updatedAt: "2026-09-01T00:00:00Z" },
  total: 0,
  selectedTags: [],
  calendar: [],
};
describe("browse response ownership", () => {
  it("rejects old success/catch/finally tickets on A→B→A, invalidation and navigation", () => {
    const ticket = {
      generation: 3,
      identity: page.identity,
      seed: page,
      location: "/notes?q=A",
    };
    expect(acceptsRequest(ticket, { ...ticket })).toBe(true);
    for (const change of [
      { generation: 1 },
      { identity: "other-scope" },
      { seed: { ...page } },
      { location: "/notes?q=B" },
    ])
      expect(acceptsRequest(ticket, { ...ticket, ...change })).toBe(false);
  });
  it("requires requested conditions/current scope and allows distinct day identity only for a day request", () => {
    const request = { ...conditions, cursor: "next" };
    expect(acceptsPage(request, page, { ...page, conditions: request })).toBe(
      true,
    );
    expect(acceptsPage(request, page, { ...page, identity: "other" })).toBe(
      false,
    );
    expect(
      acceptsPage(request, page, {
        ...page,
        scope: { ...page.scope, workspaceId: id },
      }),
    ).toBe(false);
    const dayRequest = {
      ...request,
      layout: "calendar" as const,
      month: "2026-09",
      day: "2026-09-02",
    };
    expect(
      acceptsPage(dayRequest, page, {
        ...page,
        identity: "day-identity",
        conditions: dayRequest,
      }),
    ).toBe(true);
    expect(
      acceptsPage(dayRequest, page, {
        ...page,
        identity: "day-identity",
        conditions: { ...dayRequest, day: "2026-09-03" },
      }),
    ).toBe(false);
    expect(
      acceptsPage(dayRequest, page, {
        ...page,
        conditions: { ...dayRequest, query: "大阪" },
      }),
    ).toBe(false);
  });
  it("never publishes the previous list under a new URL or an unresolved timezone", () => {
    expect(matchesBrowseLocation(conditions, { ...conditions })).toBe(true);
    expect(
      matchesBrowseLocation(conditions, { ...conditions, workspaceId: id }),
    ).toBe(false);
    expect(
      matchesBrowseLocation(conditions, { query: "東京", tags: [id] }),
    ).toBe(false);
    expect(
      matchesBrowseLocation(conditions, { ...conditions, query: "x" }),
    ).toBe(false);
  });
  it("keeps a direct day continuation visible as a named day instead of an empty month", () => {
    const dayPage = {
      ...page,
      conditions: {
        ...conditions,
        layout: "calendar" as const,
        month: "2026-09",
        day: "2026-09-02",
        cursor: "start",
      },
      total: 52,
      nextCursor: "more",
    };
    expect(pageForDisplay(dayPage).calendar).toEqual([
      { date: "2026-09-02", count: 52, items: [], nextCursor: "more" },
    ]);
    expect(pageForDisplay(page)).toBe(page);
  });
  it("uses the current detail DTO and never a previous note or a URL scope claim", () => {
    const note = {
      id,
      scope: { workspaceId: other, name: "今のWS", canEdit: false },
    };
    expect(noteScopeForPath(`/notes/${id}`, note)).toEqual(note.scope);
    expect(noteScopeForPath(`/notes/${id}/edit`, note)).toEqual(note.scope);
    expect(noteScopeForPath(`/notes/${other}`, note)).toBeUndefined();
    expect(noteScopeForPath("/notes", note)).toBeUndefined();
    expect(
      noteScopeForPath(`/notes/${id}`, {
        ...note,
        scope: { workspaceId: other },
      }),
    ).toBeUndefined();
  });
});

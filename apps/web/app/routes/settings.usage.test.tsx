import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readUsageScopes } from "./settings.usage";

const fixture = vi.hoisted(() => ({
  list: vi.fn(),
  usage: vi.fn(),
  browse: vi.fn(),
  rows: [] as unknown[],
  component: undefined as ComponentType | undefined,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    fixture.component = options.component;
    return {
      useLoaderData: () => fixture.rows,
      useRouteContext: () => ({
        user: { id: "actor", email: "local@fixture.invalid" },
      }),
    };
  },
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/notes">{children}</a>
  ),
  redirect: vi.fn(),
}));
vi.mock("@/components/hollow/Shell", () => ({
  Shell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
  PageError: "p",
  LoadingNotes: "p",
}));
vi.mock("@/components/hollow/LlmUsage", () => ({
  LlmUsage: () => <p>月間使用量</p>,
}));
vi.mock("@/presentation/hollowAuth", () => ({ currentUserFn: vi.fn() }));
vi.mock("@/presentation/hollowWorkspace", () => ({
  listWorkspacesFn: fixture.list,
  getScopeUsageFn: fixture.usage,
}));
vi.mock("@/presentation/browseServerFn", () => ({
  browseNotesFn: fixture.browse,
}));

beforeEach(() => {
  vi.resetAllMocks();
  fixture.usage.mockImplementation(async ({ data }) => ({
    scope: {
      workspaceId: data.workspaceId ?? null,
      name: data.workspaceId ?? "個人",
      canEdit: true,
    },
    usage: {
      usedBytes: 10,
      limitBytes: 100,
      updatedAt: "2026-10-01T00:00:00Z",
    },
  }));
  fixture.browse.mockResolvedValue({ total: 42 });
});
describe("account usage", () => {
  it("reads every workspace page but excludes viewer scopes and counts unfiltered active notes", async () => {
    let active = 0;
    let maximum = 0;
    fixture.browse.mockImplementation(async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return { total: 42 };
    });
    fixture.list
      .mockResolvedValueOnce({
        items: [
          { id: "owner", role: "owner" },
          { id: "readonly", role: "viewer" },
        ],
        nextCursor: "page-2",
      })
      .mockResolvedValueOnce({
        items: [{ id: "editor", role: "editor" }],
        nextCursor: null,
      });
    const rows = await readUsageScopes();
    expect(fixture.list.mock.calls).toEqual([
      [{ data: {} }],
      [{ data: { cursor: "page-2" } }],
    ]);
    expect(rows.map((row) => row.scope.workspaceId)).toEqual([
      null,
      "owner",
      "editor",
    ]);
    expect(rows.map((row) => row.activeNotes)).toEqual([42, 42, 42]);
    for (const [{ data }] of fixture.browse.mock.calls)
      expect(data).toMatchObject({
        query: "",
        tags: [],
        zone: "UTC",
        layout: "list",
        sort: "updated-desc",
      });
    expect(
      fixture.usage.mock.calls.some(
        ([input]) => input.data.workspaceId === "readonly",
      ),
    ).toBe(false);
    expect(maximum).toBe(1);
  });
  it("does not present a partially authorized snapshot after role loss", async () => {
    fixture.list.mockResolvedValue({
      items: [{ id: "lost", role: "editor" }],
      nextCursor: null,
    });
    fixture.usage.mockRejectedValueOnce({
      kind: "not_found",
      code: "SCOPE_NOT_FOUND",
    });
    await expect(readUsageScopes()).rejects.toHaveProperty(
      "code",
      "SCOPE_NOT_FOUND",
    );
  });
  it.each([
    80, 81, 100,
  ])("explains active counts, trash capacity and the %i percent boundary", (usedBytes) => {
    fixture.rows = [
      {
        scope: { workspaceId: null, name: "個人" },
        usage: {
          usedBytes,
          limitBytes: 100,
          updatedAt: "2026-10-01T00:00:00Z",
        },
        activeNotes: 7,
      },
    ];
    const Page = fixture.component;
    if (!Page) throw new Error("Usage route component missing");
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain("ゴミ箱の原本・メディア");
    expect(html).toContain("7 件（ゴミ箱を除く）");
    expect(html.includes("容量の80%を超えています")).toBe(usedBytes === 81);
    expect(html.includes("新しいファイルは取り込めません")).toBe(
      usedBytes === 100,
    );
    expect(html).toContain("不要なノートを確認");
    expect(html).toContain("ゴミ箱");
  });
});

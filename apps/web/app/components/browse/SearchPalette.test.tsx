import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PaletteSession } from "./BrowseContext";
import { SearchPalette } from "./SearchPalette";

vi.mock("@tanstack/react-router", () => ({
  Link: "a",
  useRouter: () => ({ navigate: vi.fn() }),
}));
vi.mock("./BrowseContext", () => ({
  useBrowseContext: () => ({ rejectAccess: vi.fn() }),
}));

describe("current palette scope display", () => {
  it("renders and escapes the current label while preserving the session query and target", () => {
    const session: PaletteSession = {
      scope: { workspaceId: "same-workspace", name: "旧名", canEdit: true },
      conditions: {
        workspaceId: "same-workspace",
        query: "既存検索",
        tags: [],
        zone: "UTC",
        sort: "relevance",
        layout: "list",
      },
      userId: "same-actor",
      location: "/notes?workspaceId=same-workspace",
      trigger: null,
    };
    const html = renderToStaticMarkup(
      <SearchPalette
        session={session}
        scopeName="新 <WS>"
        onClose={() => {}}
      />,
    );
    expect(html).toContain('title="新 &lt;WS&gt;"');
    expect(html).toContain(">新 &lt;WS&gt;</span>");
    expect(html).not.toContain("旧名");
    expect(html).toContain('value="既存検索"');
    expect(session.scope.workspaceId).toBe("same-workspace");
    expect(session.conditions.workspaceId).toBe("same-workspace");
    expect(session.scope.canEdit).toBe(true);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PRINT_PDF_HINT } from "@/presentation/notePrintText";
import { NoteExportAction } from "./NoteExportAction";

const actor = { id: "actor", epoch: 1 };
const fixture = vi.hoisted(() => ({
  cursor: 0,
  exportStateHook: 0,
  exportState: null as unknown,
}));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useState: <T,>(initial: T) => {
      const state = react.useState(initial);
      return fixture.cursor++ === fixture.exportStateHook &&
        fixture.exportState !== null
        ? [fixture.exportState as T, state[1]]
        : state;
    },
  };
});
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/notes/note",
}));
vi.mock("./SharingActorProvider", () => ({
  useSharingActor: () => ({ actor, currentActor: () => actor }),
}));

const markup = (element: React.ReactElement) => renderToStaticMarkup(element);
const printLink =
  '<a class="hollow-button" href="/notes/note/print">印刷する</a>';

describe("NoteExportAction printing", () => {
  it("offers printing beside the download buttons on a note with a body", () => {
    const html = markup(
      <NoteExportAction noteId="note" actorId="actor" printable />,
    );
    expect(html).toContain(
      `<div class="hollow-actions"><button type="button" class="hollow-button">HTMLを書き出す</button><button type="button" class="hollow-button">Markdownを書き出す</button>${printLink}</div><p class="hollow-help">${PRINT_PDF_HINT}</p>`,
    );
    expect(html).toContain(
      "<p>保存済みの現在の本文を単一ファイルに書き出すか、印刷します。</p>",
    );
    expect(html).not.toContain("target=");
  });

  it("offers no printing for an empty body", () => {
    const html = markup(
      <NoteExportAction noteId="note" actorId="actor" printable={false} />,
    );
    expect(html).toContain(
      "<p>保存済みの現在の本文を単一ファイルに書き出します。</p>",
    );
    expect(html).toContain("HTMLを書き出す");
    expect(html).not.toContain("/print");
    expect(html).not.toContain(PRINT_PDF_HINT);
  });

  it("offers no printing in the editor", () => {
    const html = markup(
      <NoteExportAction noteId="note" actorId="actor" editing />,
    );
    expect(html).toContain("未保存の入力はそのまま残し");
    expect(html).not.toContain("/print");
  });

  it("keeps printing on offer while a download is being prepared or has started", () => {
    for (const state of [
      { kind: "preparing" },
      { kind: "started", notices: [] },
    ]) {
      fixture.cursor = 0;
      fixture.exportState = state;
      try {
        const html = markup(
          <NoteExportAction noteId="note" actorId="actor" printable />,
        );
        expect(html).toContain(
          `<div class="hollow-actions">${printLink}</div><p class="hollow-help">${PRINT_PDF_HINT}</p>`,
        );
        expect(html).not.toContain("HTMLを書き出す");
      } finally {
        fixture.exportState = null;
      }
    }
  });

  it("renders nothing for another actor", () => {
    expect(
      markup(<NoteExportAction noteId="note" actorId="other" printable />),
    ).toBe("");
  });
});

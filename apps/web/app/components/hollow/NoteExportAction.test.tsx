import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PRINT_PDF_HINT } from "@/presentation/notePrintText";
import { NoteExportAction } from "./NoteExportAction";

const actor = { id: "actor", epoch: 1 };
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
    expect(html).not.toContain("target=");
  });

  it("offers no printing for an empty body", () => {
    const html = markup(
      <NoteExportAction noteId="note" actorId="actor" printable={false} />,
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

  it("renders nothing for another actor", () => {
    expect(
      markup(<NoteExportAction noteId="note" actorId="other" printable />),
    ).toBe("");
  });
});

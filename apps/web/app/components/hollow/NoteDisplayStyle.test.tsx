import type { NoteView } from "@repo/core/application/note/view";
import {
  automaticDisplay,
  type NoteDisplay,
} from "@repo/core/domain/note/displayStyle";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDisplayStyle } from "./NoteDisplayStyle";

const fixture = vi.hoisted(() => ({
  router: vi.fn(() => ({ invalidate: vi.fn() })),
  save: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ useRouter: fixture.router }));
vi.mock("@/presentation/hollowNotes", () => ({
  setDisplayStyleFn: fixture.save,
}));
vi.mock("./NoteContent", () => ({
  NoteContent: ({
    displayStyle,
    html,
  }: {
    displayStyle: string;
    html: string;
  }) => <div data-display-style={displayStyle}>{html}</div>,
}));

const note = (display: NoteDisplay): NoteView => ({
  id: "style-note",
  title: "表示の確認",
  html: "<p>保存済み本文</p>",
  display,
  version: 1,
  createdAt: "2026-10-09T00:00:00Z",
  updatedAt: "2026-10-09T00:00:00Z",
  visibility: "private",
  status: "ready",
});

describe("note display permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { display: automaticDisplay(false), label: "既定スタイルを適用" },
    { display: automaticDisplay(true), label: "元の装飾のみ" },
  ])("shows the saved $label and origin without switching controls for a viewer", ({
    display,
    label,
  }) => {
    const html = renderToStaticMarkup(
      <NoteDisplayStyle note={note(display)} canEdit={false} />,
    );
    expect(html).toContain(`表示スタイル：${label}`);
    expect(html).toContain("取り込み時に残った安全な装飾から自動判定");
    expect(html).toContain(`data-display-style="${display.style}"`);
    expect(html).toContain("保存済み本文");
    expect(html).not.toMatch(/<(?:input|fieldset|button|details)\b/);
    expect(html).not.toContain("プレビュー");
    expect(html).not.toContain("取消");
    expect(html).not.toContain("今選択");
    expect(fixture.router).not.toHaveBeenCalled();
    expect(fixture.save).not.toHaveBeenCalled();
  });

  it.each<{
    display: NoteDisplay;
    description: string;
  }>([
    {
      display: {
        style: "original",
        source: "user",
        initialization: { kind: "complete", reason: "user" },
      },
      description: "利用者が選択した設定です。",
    },
    {
      display: {
        style: "default",
        source: "legacy",
        initialization: { kind: "complete", reason: "legacy" },
      },
      description: "既存ノートの設定を保持しています。",
    },
    {
      display: automaticDisplay(false, "blank"),
      description: "新規ノートの既定設定です。",
    },
    {
      display: automaticDisplay(true, "interrupted"),
      description: "初回処理の完了前に、確認できた装飾から確定しました。",
    },
    {
      display: {
        style: "default",
        source: "automatic",
        initialization: { kind: "conversion", jobId: "conversion" },
      },
      description: "初回の装飾を確認中です。",
    },
    {
      display: {
        style: "default",
        source: "automatic",
        initialization: {
          kind: "reference",
          jobId: "reference",
          decorated: true,
        },
      },
      description: "初回の装飾を確認中です。",
    },
  ])("retains the saved origin explanation: $description", ({
    display,
    description,
  }) => {
    const html = renderToStaticMarkup(
      <NoteDisplayStyle note={note(display)} canEdit={false} />,
    );
    expect(html).toContain(description);
    expect(html).not.toMatch(/<(?:input|fieldset|button)\b/);
    expect(html).not.toContain("今選択");
    expect(fixture.save).not.toHaveBeenCalled();
  });

  it("keeps both preview choices and apply/cancel controls for editors", () => {
    const html = renderToStaticMarkup(
      <NoteDisplayStyle note={note(automaticDisplay(false))} />,
    );
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).toContain("このノートの表示をプレビュー");
    expect(html).toContain("取消");
    expect(html).toContain("適用");
    expect(fixture.router).toHaveBeenCalled();
    expect(fixture.save).not.toHaveBeenCalled();
  });
});

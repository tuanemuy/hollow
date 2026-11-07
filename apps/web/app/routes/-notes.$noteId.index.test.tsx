import type { getNote } from "@repo/core/application/note/getNote";
import { automaticDisplay } from "@repo/core/domain/note/displayStyle";
import type { ComponentType, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRINT_NOTICE_CLASS,
  READING_PRINT_NOTICE,
} from "@/presentation/notePrintText";
import "./notes.$noteId.index";

type Detail = Awaited<ReturnType<typeof getNote>>;
const fixture = vi.hoisted(() => ({
  note: undefined as Detail | undefined,
  component: undefined as ComponentType | undefined,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    fixture.component = options.component;
    return {
      useLoaderData: () => fixture.note,
      useSearch: () => ({}),
    };
  },
  useRouter: () => ({ navigate: vi.fn(), invalidate: vi.fn() }),
  useRouterState: () => "/notes/notice-note",
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/notes">{children}</a>
  ),
}));
vi.mock("@/presentation/hollowNotes", () => ({ getNoteFn: vi.fn() }));
vi.mock("@/components/hollow/ImportJobs", () => ({
  noteStatus: { failed: "失敗" },
}));
vi.mock("@/components/hollow/DriveBackupPanel", () => ({
  DriveBackupPanel: () => null,
}));
vi.mock("@/components/hollow/DriveRegenerationPanel", () => ({
  DriveRegenerationPanel: () => null,
}));
vi.mock("@/components/hollow/LlmNoteAction", () => ({
  LlmNoteAction: () => null,
}));
vi.mock("@/components/hollow/NoteConversionStatus", () => ({
  NoteConversionStatus: () => null,
}));
vi.mock("@/components/hollow/NoteDisplayStyle", () => ({
  NoteDisplayStyle: () => null,
}));
vi.mock("@/components/hollow/NoteExportAction", () => ({
  NoteExportAction: ({ printable }: { printable: boolean }) => (
    <i data-export-printable={String(printable)} />
  ),
}));
vi.mock("@/components/hollow/NoteHistory", () => ({ NoteHistory: () => null }));
vi.mock("@/components/hollow/NoteReadingSkeleton", () => ({
  NoteReadingSkeleton: () => null,
}));
vi.mock("@/components/hollow/NoteSharingAction", () => ({
  NoteSharingAction: () => null,
}));
vi.mock("@/components/hollow/NoteTrashAction", () => ({
  NoteTrashAction: () => null,
}));
vi.mock("@/components/hollow/ReferenceLedger", () => ({
  ReferenceLedger: () => null,
}));
vi.mock("@/components/hollow/Shell", () => ({ PageError: () => null }));
vi.mock("@/components/move/NoteMoveAction", () => ({
  NoteMoveAction: () => null,
}));
vi.mock("@/components/tag/NoteTags", () => ({ NoteTags: () => null }));

beforeEach(() => {
  fixture.note = {
    id: "notice-note",
    actorId: "reader",
    scope: { workspaceId: "workspace", name: "資料", canEdit: false },
    title: "音声の取り込み結果",
    html: "",
    display: automaticDisplay(false),
    version: 1,
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
    status: "failed",
    visibility: "link",
    sharing: { hasLink: true, hasPassword: false },
    conversion: null,
    creatorDisplay: { kind: "unavailable" },
    tags: [],
    original: {
      id: "saved-original",
      name: "audio.wav",
      format: "audio",
      bytes: 32044,
      coverage: "no_text",
      notices: [],
    },
  };
});

function detailMarkup() {
  const Page = fixture.component;
  if (!Page) throw new Error("Note detail route component missing");
  return renderToStaticMarkup(<Page />);
}
function originalNoticeList() {
  const section = detailMarkup().match(
    /<section class="hollow-original">([\s\S]*?)<\/section>/,
  );
  expect(section).not.toBeNull();
  expect(section?.[1]).toContain("<h2>元ファイルと取り込み結果</h2>");
  const list = section?.[1]?.match(/<ul>([\s\S]*?)<\/ul>/);
  if (!list) throw new Error("Original notice list missing");
  return list[1];
}

describe("note detail original notices", () => {
  it("uses AI copy for the saved no-AI audio notice in the original section", () => {
    const notices = Object.freeze([
      Object.freeze({
        code: "LLM_DISABLED",
        location: "原本",
        message:
          "LLMなしでは取り込めません。LLMを使う設定で取り込み直してください。",
      }),
    ]);
    if (!fixture.note?.original) throw new Error("Original fixture missing");
    fixture.note = {
      ...fixture.note,
      original: { ...fixture.note.original, notices },
    };
    expect(originalNoticeList()).toBe(
      "<li>原本: AIなしでは取り込めません。</li>",
    );
    expect(notices).toEqual([
      {
        code: "LLM_DISABLED",
        location: "原本",
        message:
          "LLMなしでは取り込めません。LLMを使う設定で取り込み直してください。",
      },
    ]);
  });

  it("keeps other known codes and arbitrary messages raw, ordered and escaped", () => {
    if (!fixture.note?.original) throw new Error("Original fixture missing");
    fixture.note = {
      ...fixture.note,
      original: {
        ...fixture.note.original,
        notices: [
          {
            code: "LLM_AUDIO_UNSUPPORTED",
            location: "原本",
            message: "LLMの形式検査で停止しました。",
          },
          {
            code: "SOURCE_NOTICE",
            location: "<原本>",
            message: "利用者のLLMメモ <script> & 本文",
          },
        ],
      },
    };
    expect(originalNoticeList()).toBe(
      "<li>原本: LLMの形式検査で停止しました。</li><li>&lt;原本&gt;: 利用者のLLMメモ &lt;script&gt; &amp; 本文</li>",
    );
  });

  it("shows no fabricated notice when the saved original has no notices", () => {
    expect(originalNoticeList()).toBe("");
  });

  it("omits the original result section for a note without an original", () => {
    if (!fixture.note) throw new Error("Note fixture missing");
    const { original: _original, ...note } = fixture.note;
    fixture.note = note;
    expect(detailMarkup()).not.toContain('class="hollow-original"');
  });
});

describe("note detail printing", () => {
  const notice = `<p class="${PRINT_NOTICE_CLASS}">${READING_PRINT_NOTICE}</p>`;
  it("prints only the pointer to the print view and offers printing for a note with a body", () => {
    if (!fixture.note) throw new Error("Note fixture missing");
    fixture.note = { ...fixture.note, html: "<p>本文</p>" };
    const html = detailMarkup();
    expect(html).toContain(`<article class="hollow-reading">${notice}`);
    expect(html).toContain('data-export-printable="true"');
  });

  it.each([
    "",
    " \n ",
  ])("has neither the pointer nor printing for the empty body %j", (body) => {
    if (!fixture.note) throw new Error("Note fixture missing");
    fixture.note = { ...fixture.note, html: body };
    const html = detailMarkup();
    expect(html).not.toContain(PRINT_NOTICE_CLASS);
    expect(html).toContain('data-export-printable="false"');
  });
});

import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportUpload } from "./ImportUpload";

const fixture = vi.hoisted(() => ({
  files: [] as File[],
  useAi: true,
  companions: new Set<string>(),
  cursor: 0,
  begin: vi.fn(),
  seal: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = fixture.cursor++;
    const value =
      index === 1
        ? fixture.files
        : index === 2
          ? fixture.useAi
          : index === 5
            ? new Map(
                fixture.files.map((file) => [
                  file,
                  {
                    role: fixture.companions.has(file.name)
                      ? "companion"
                      : "note",
                    path: file.name,
                  },
                ]),
              )
            : initial;
    return [value, vi.fn()];
  },
  useRef: (current: unknown) => ({ current }),
  useEffect: vi.fn(),
  useTransition: () => [false, vi.fn()],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: "a",
  useBlocker: vi.fn(),
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
}));
vi.mock("@/presentation/hollowImports", () => ({
  beginUploadFn: fixture.begin,
  sealUploadFn: fixture.seal,
  cancelImportFn: fixture.cancel,
}));
vi.mock("@/presentation/errorDisplay", () => ({
  displayError: () => "failure",
}));
vi.mock("./NoteCreationScope", () => ({ NoteCreationScope: "scope-selector" }));
vi.mock("./WorkspaceScope", () => ({ ScopeUsageLive: "scope-usage" }));

type Element = {
  type: unknown;
  props: {
    children?: ReactNode;
    disabled?: boolean;
    checked?: boolean;
    type?: string;
    className?: string;
  };
};
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Element["props"]>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return isValidElement<Element["props"]>(node)
    ? text(node.props.children)
    : "";
}
function view(names: string[], useAi = true, companions: string[] = []) {
  fixture.cursor = 0;
  fixture.files = names.map((name) => new File(["x"], name));
  fixture.useAi = useAi;
  fixture.companions = new Set(companions);
  const rows = elements(ImportUpload({}));
  const paragraphs = rows
    .filter((row) => row.type === "p")
    .map((row) => text(row.props.children));
  const summary = rows.find(
    (row) => row.props.className === "hollow-import-summary",
  );
  const start = rows.find(
    (row) =>
      row.type === "button" &&
      text(row.props.children) === "アップロードを開始",
  );
  expect(start !== undefined).toBe(true);
  expect(
    fixture.begin.mock.calls.length +
      fixture.seal.mock.calls.length +
      fixture.cancel.mock.calls.length,
  ).toBe(0);
  return {
    paragraphs,
    all: paragraphs.join("\n"),
    summary: text(summary?.props.children),
    startEnabled: start?.props.disabled === false,
    rows,
  };
}
beforeEach(() => vi.clearAllMocks());

describe("import selection notices", () => {
  it("offers gated text or full-page PDF without stale unavailable notices", () => {
    const result = view(["mixed.pdf"]);
    expect(
      result.all.includes("画像主体・混在頁・順序不明のPDFはAI未提供"),
    ).toBe(false);
    expect(result.all.includes("音声・画像主体や混在PDFのAI変換は未提供")).toBe(
      false,
    );
    expect(result.summary.includes("文字用")).toBe(true);
    expect(result.summary.includes("全頁画像用")).toBe(true);
    expect(result.summary.includes("全頁を検査")).toBe(true);
    expect(result.summary.includes("有効なOpenRouter連携・構成")).toBe(true);
    expect(result.summary.includes("原本を保持")).toBe(true);
    expect(
      result.paragraphs.some(
        (p) =>
          p.includes("画像のトークン数は事前計算していません") &&
          p.includes("入力上限を超える場合"),
      ),
    ).toBe(true);
    expect(result.startEnabled).toBe(true);
  });
  it("respects PDF AI-off without proposing image processing or relinking", () => {
    const result = view(["mixed.pdf"], false);
    expect(result.summary.includes("文字を機械抽出")).toBe(true);
    expect(result.summary.includes("失敗として記録")).toBe(true);
    expect(result.summary.includes("原本を保持")).toBe(true);
    expect(result.summary.includes("全頁画像用")).toBe(false);
    expect(result.summary.includes("有効なOpenRouter連携")).toBe(false);
    expect(result.summary.includes("トークン数")).toBe(false);
    expect(
      result.rows.filter(
        (row) =>
          row.type === "input" &&
          row.props.type === "checkbox" &&
          row.props.checked === true,
      ).length,
    ).toBe(2);
    expect(result.startEnabled).toBe(true);
  });
  it("keeps non-PDF estimates and omits PDF selection-specific warnings", () => {
    const result = view(["page.html", "note.md", "office.docx"]);
    expect(result.summary.includes("PDF")).toBe(false);
    const methods = result.rows
      .filter((row) => row.props.className === "hollow-import-method")
      .map((row) => text(row.props.children));
    expect(methods.filter((value) => value.includes("機械変換")).length).toBe(
      2,
    );
    expect(methods.some((value) => value.includes("全文検査後にAI"))).toBe(
      true,
    );
    expect(result.startEnabled).toBe(true);
  });
  it("does not label supported static images collectively unavailable", () => {
    const result = view(["image.png"]);
    expect(result.summary.includes("1 件は機械変換できません")).toBe(true);
    expect(result.summary.includes("対応する静止画像")).toBe(true);
    expect(result.summary.includes("有効な連携・構成")).toBe(true);
    expect(result.summary.includes("AI変換はまだ提供していません")).toBe(false);
    expect(result.startEnabled).toBe(true);
  });
  it("keeps audio unavailable without promising conversion after linking", () => {
    const result = view(["voice.mp3"]);
    expect(result.summary.includes("音声のAI変換は未提供")).toBe(true);
    expect(result.summary.includes("連携だけでは変換されません")).toBe(true);
    expect(result.summary.includes("原本を保持")).toBe(true);
    expect(result.startEnabled).toBe(true);
  });
  it("retains mixed selection counts and provisional classifications", () => {
    const result = view(["mixed.pdf", "image.png", "voice.mp3"]);
    expect(result.summary.includes("2 件は機械変換できません")).toBe(true);
    expect(result.summary.includes("PDF 1件")).toBe(true);
    expect(result.summary.includes("暫定判定")).toBe(true);
    expect(
      result.rows.filter(
        (row) => row.props.className === "hollow-import-method",
      ).length,
    ).toBe(3);
  });
  it("preserves AI-off failures and excludes companion images from AI counts", () => {
    const off = view(["image.png", "voice.mp3"], false);
    expect(off.summary.includes("2 件はLLM なしでは取り込めません")).toBe(true);
    expect(off.summary.includes("失敗として記録")).toBe(true);
    const companion = view(["page.html", "image.png"], true, ["image.png"]);
    expect(companion.summary.includes("件は機械変換できません")).toBe(false);
    expect(companion.startEnabled).toBe(true);
    expect(view(["image.png"], true, ["image.png"]).startEnabled).toBe(false);
  });
});

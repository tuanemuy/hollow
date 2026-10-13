import type { listImports } from "@repo/core/application/import/readImports";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportJobs, jobCompletionNotices, needsAiNotice } from "./ImportJobs";

const io = vi.hoisted(() => {
  const forbidden = async (): Promise<never> => {
    throw new Error("IMPORT_HISTORY_RENDER_NO_IO");
  };
  return {
    list: vi.fn(forbidden),
    cancel: vi.fn(forbidden),
    retry: vi.fn(forbidden),
    reimport: vi.fn(forbidden),
    cancelLlm: vi.fn(forbidden),
    invalidate: vi.fn(forbidden),
  };
});
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: io.invalidate }),
  Link: ({ children, to }: { children?: ReactNode; to: string }) =>
    createElement("a", { href: to }, children),
}));
vi.mock("@/presentation/hollowImports", () => ({
  listImportsFn: io.list,
  cancelImportFn: io.cancel,
  retryImportFn: io.retry,
  reimportNoteFn: io.reimport,
}));
vi.mock("@/presentation/llmServerFn", () => ({ cancelLlmFn: io.cancelLlm }));
vi.mock("./WorkspaceScope", () => ({ useCurrentWorkspaceId: () => null }));
vi.mock("./LlmUsage", () => ({ LlmUsage: () => null }));
vi.mock("./JobTimeline", () => ({ JobTimeline: () => null }));
vi.mock("./ReferenceLedger", () => ({ ReferenceJobHistory: () => null }));
vi.mock("@/components/batch/BatchHistory", () => ({
  BatchHistory: () => null,
}));
vi.mock("./PurgeHistory", () => ({ PurgeHistory: () => null }));
vi.mock("./EmptyTrashHistory", () => ({ EmptyTrashHistory: () => null }));

beforeEach(() => vi.clearAllMocks());

type Imports = Awaited<ReturnType<typeof listImports>>;
function monthlyLimitHistory(format: "audio" | "text"): Imports {
  const createdAt = "2026-10-13T00:00:00.000Z";
  return {
    usedBytes: 60,
    quotaBytes: 5 * 1024 ** 3,
    usage: {
      usedBytes: 60,
      limitBytes: 5 * 1024 ** 3,
      updatedAt: createdAt,
    },
    scope: { workspaceId: null, name: "個人のスペース", canEdit: true },
    batches: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        createdAt,
        cancelled: false,
        active: false,
        uploads: [],
        jobs: [
          {
            id: "10000000-0000-4000-8000-000000000002",
            noteId: "10000000-0000-4000-8000-000000000003",
            name: format === "audio" ? "原本.wav" : "原本.txt",
            targetAvailable: true,
            targetDeleted: false,
            state: "failed",
            noteState: "failed",
            failure: "LLM_MONTHLY_LIMIT",
            attempt: 1,
            createdAt,
            updatedAt: createdAt,
            coverage: "no_text",
            format,
            publicationNotice: null,
            machine: null,
            llm: null,
          },
        ],
      },
    ],
  };
}

describe("independent job completion notices", () => {
  it("guides needs-ai originals without declaring supported images unavailable or promising unsupported formats", () => {
    expect(needsAiNotice.includes("OpenRouter連携と各ノートの対応状況")).toBe(
      true,
    );
    expect(needsAiNotice.includes("連携だけでは自動変換されません")).toBe(true);
    expect(needsAiNotice.includes("対応する原本では")).toBe(true);
    expect(
      needsAiNotice.includes("この形式のAI変換はまだ提供していません"),
    ).toBe(false);
  });
  it("retains both kinds without masking a batch result with an import result", () => {
    expect(
      jobCompletionNotices("import done", "batch done").map(
        ({ kind, message }) => ({ kind, message }),
      ),
    ).toEqual([
      { kind: "import", message: "import done" },
      { kind: "batch", message: "batch done" },
    ]);
  });
  it("keeps the other notice after either kind is dismissed", () => {
    expect(
      jobCompletionNotices("", "batch done").map((item) => item.kind),
    ).toEqual(["batch"]);
    expect(
      jobCompletionNotices("import done", "").map((item) => item.kind),
    ).toEqual(["import"]);
    expect(jobCompletionNotices("", "")).toEqual([]);
  });
});

describe("rendered monthly limit guidance", () => {
  it("asks an audio import to wait for the next monthly allowance without offering mechanical conversion as a solution", () => {
    const html = renderToStaticMarkup(
      createElement(ImportJobs, {
        initial: monthlyLimitHistory("audio"),
      }),
    );
    expect(html).toContain("原本.wav");
    expect(html).toContain(
      "月間の AI 変換上限に達しました。次の月間枠をお待ちください。",
    );
    expect(html).not.toContain("LLM を使わず");
    expect(html).not.toContain("明示的に取り込むこともできます");
    expect(html).not.toContain("text・DOCX・XLSX・PPTX・対応PDF");
    expect(html).not.toContain("機械変換");
    for (const call of Object.values(io)) expect(call).not.toHaveBeenCalled();
  });

  it("keeps the existing no-LLM alternative and next-month guidance for a non-audio import", () => {
    const html = renderToStaticMarkup(
      createElement(ImportJobs, {
        initial: monthlyLimitHistory("text"),
      }),
    );
    expect(html).toContain("原本.txt");
    expect(html).toContain("月間の AI 変換上限に達しました。");
    expect(html).toContain(
      "text・DOCX・XLSX・PPTX・対応PDFは LLM を使わず明示的に取り込むこともできます。",
    );
    expect(html).toContain("AI 必須形式は次の月間枠をお待ちください。");
    for (const call of Object.values(io)) expect(call).not.toHaveBeenCalled();
  });
});

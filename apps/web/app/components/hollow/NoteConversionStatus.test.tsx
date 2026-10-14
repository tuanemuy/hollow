import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NoteConversionStatus } from "./NoteConversionStatus";

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/notes/jobs">{children}</a>
  ),
}));
vi.mock("@/presentation/hollowImports", () => ({ retryImportFn: vi.fn() }));

describe("authorized conversion status", () => {
  it.each([
    true,
    false,
  ])("guides an audio failure to AI instead of repeating mechanical failure (retry=%s)", (canRetry) => {
    const html = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={
          canRetry
            ? {
                kind: "machine",
                jobId: "job",
                state: "failed",
                canRetry: true,
                retryBlocked: null,
                notices: [
                  {
                    code: "LLM_DISABLED",
                    location: "原本",
                    message: "LLMなしでは取り込めません。",
                  },
                ],
              }
            : {
                kind: "machine",
                jobId: "job",
                state: "failed",
                canRetry: false,
                retryBlocked: "read-only",
                notices: [
                  {
                    code: "LLM_DISABLED",
                    location: "原本",
                    message: "LLMなしでは取り込めません。",
                  },
                ],
              }
        }
        sourceFormat="audio"
        workspaceId={null}
      />,
    );
    expect(html).not.toContain("機械変換を再試行");
    expect(html).not.toContain("<button");
    if (canRetry) expect(html).toContain("AIを使う設定で取り込み直す");
    else {
      expect(html).not.toContain("AIを使う設定で取り込み直す");
      expect(html).toContain("閲覧権限では再試行できません");
    }
    expect(html).toContain("AIなしでは取り込めません");
    expect(html).not.toContain("LLMなしでは取り込めません");
  });
  it("keeps the original safe failure and offers settings for a discontinued model", () => {
    const html = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={{
          kind: "llm",
          jobId: "job",
          phase: "terminal",
          outcome: "failed",
          failure: "LLM_MODEL_UNAVAILABLE",
        }}
        workspaceId={null}
      />,
    );
    expect(html).toContain("選んだモデルを利用できません");
    expect(html).toContain("原本と旧本文は保持");
    expect(html).toContain("利用できるモデルを設定");
    expect(html).not.toContain("機械変換を再試行");
  });
  it("offers machine retry only when the authorized projection allows it", () => {
    const base = {
      kind: "machine" as const,
      jobId: "job",
      state: "failed" as const,
      notices: [
        {
          code: "IMPORT_FAILURE",
          location: "原本",
          message: "読み取りに失敗しました。",
        },
      ],
    };
    const allowed = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={{ ...base, canRetry: true, retryBlocked: null }}
        workspaceId={null}
      />,
    );
    expect(allowed).toContain("機械変換を再試行");
    expect(allowed).toContain("読み取りに失敗しました。");
    const blocked = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={{ ...base, canRetry: false, retryBlocked: "other-actor" }}
        workspaceId={null}
      />,
    );
    expect(blocked).not.toContain("<button");
    expect(blocked).toContain("処理を開始した利用者");
  });

  it("shows the actual LLM phase without inventing a percentage or machine retry", () => {
    const html = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={{
          kind: "llm",
          jobId: "job",
          phase: "dispatching",
          outcome: "pending",
          failure: null,
        }}
        workspaceId={null}
      />,
    );
    expect(html).toContain("本文を生成中");
    expect(html).not.toContain("%");
    expect(html).not.toContain("<button");
  });

  it("explains unknown completion without encouraging automatic resend", () => {
    const html = renderToStaticMarkup(
      <NoteConversionStatus
        conversion={{
          kind: "llm",
          jobId: "job",
          phase: "terminal",
          outcome: "unknown",
          failure: "LLM_OWNERSHIP_UNKNOWN",
        }}
        workspaceId={null}
      />,
    );
    expect(html).toContain("終了を確認するまで再送しません");
    expect(html).not.toContain("LLM_OWNERSHIP_UNKNOWN");
    expect(html).not.toContain("<button");
  });
});

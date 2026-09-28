import { describe, expect, it } from "vitest";
import { jobCompletionNotices, needsAiNotice } from "./ImportJobs";

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

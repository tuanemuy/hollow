import { describe, expect, it } from "vitest";
import { jobCompletionNotices } from "./ImportJobs";

describe("independent job completion notices", () => {
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

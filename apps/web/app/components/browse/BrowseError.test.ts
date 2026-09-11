import { describe, expect, it } from "vitest";
import { AppServerError } from "@/presentation/errorResponse";
import { browseAccessLost, browseErrorMessage } from "./BrowseError";

describe("browse serialized errors", () => {
  it.each([
    "SEARCH_LENGTH",
    "SEARCH_TERMS",
  ])("keeps actionable business guidance for %s", (code) => {
    expect(
      browseErrorMessage(
        new AppServerError({
          kind: "business",
          code,
          message: "検索語を入力し直してください。",
        }),
      ),
    ).toBe("検索語を入力し直してください。");
  });
  it("does not describe preparation or cursor failure as empty results", () => {
    expect(
      browseErrorMessage(
        new AppServerError({
          kind: "business",
          code: "SEARCH_PREPARING",
          message: "preparing",
        }),
      ),
    ).toContain("まだ結果を表示できません");
    expect(
      browseErrorMessage(
        new AppServerError({
          kind: "business",
          code: "BROWSE_CURSOR",
          message: "invalid",
        }),
      ),
    ).toContain("先頭から");
  });
  it("offers retry for a redacted timeout/busy system error without exposing its internals", () => {
    const error = new AppServerError({
      kind: "system",
      code: null,
      message: "System error",
    });
    expect(browseErrorMessage(error)).toContain("再試行");
    expect(browseErrorMessage(error)).not.toContain("System error");
    expect(browseAccessLost(error)).toBe(false);
  });
  it.each([
    "unauthorized",
    "forbidden",
    "notFound",
  ] as const)("invalidates visible scope data after %s", (kind) => {
    expect(
      browseAccessLost(
        new AppServerError({ kind, code: "SCOPE", message: "unavailable" }),
      ),
    ).toBe(true);
  });
});

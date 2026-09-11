import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseSearchDeadline,
  remainingSearchMs,
  searchDeadline,
  searchNow,
} from "../browse/searchDeadline";
import { searchDiagnosticSchema } from "../browse/searchDiagnostic";

describe("same-host monotonic search deadline", () => {
  afterEach(() => vi.restoreAllMocks());
  it("keeps integer comparison beyond Number integer precision", () => {
    const start = 9_007_199_254_740_993n;
    vi.spyOn(process.hrtime, "bigint").mockReturnValue(start);
    const deadline = searchDeadline();
    expect(deadline).toBe(start + 3_000_000_000n);
    expect(parseSearchDeadline(deadline.toString())).toBe(deadline);
    expect(remainingSearchMs(deadline)).toBe(3000);
    vi.spyOn(process.hrtime, "bigint").mockReturnValue(deadline + 1n);
    expect(searchNow() > deadline).toBe(true);
    expect(parseSearchDeadline(deadline.toString())).toBeNull();
  });
  it("rejects malformed, oversized, expired and over-budget input", () => {
    vi.spyOn(process.hrtime, "bigint").mockReturnValue(100n);
    for (const value of [
      undefined,
      "",
      "-1",
      "1.0",
      "1e10",
      "9".repeat(21),
      "100",
      "3000000101",
    ])
      expect(parseSearchDeadline(value)).toBeNull();
  });
  it("does not accept unrecognized progress as diagnostic", () => {
    expect(
      searchDiagnosticSchema.safeParse({
        kind: "result",
        stage: "worker-result",
        remainingMs: 1,
      }).success,
    ).toBe(false);
    expect(
      searchDiagnosticSchema.safeParse({
        kind: "diagnostic",
        stage: "unknown",
        remainingMs: 1,
      }).success,
    ).toBe(false);
    expect(
      searchDiagnosticSchema.safeParse({
        kind: "diagnostic",
        stage: "worker-start",
        remainingMs: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });
});

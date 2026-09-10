import { describe, expect, it } from "vitest";
import { singleRange } from "./mediaHttp.node";

describe("single authenticated asset byte ranges", () => {
  it("accepts bounded, open, suffix and clamps the end", () => {
    expect(singleRange(null, 100)).toBeNull();
    expect(singleRange("bytes=1-4", 100)).toEqual({ start: 1, end: 4 });
    expect(singleRange("bytes=80-", 100)).toEqual({ start: 80, end: 99 });
    expect(singleRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(singleRange("bytes=80-200", 100)).toEqual({ start: 80, end: 99 });
    expect(singleRange("bytes=-200", 100)).toEqual({ start: 0, end: 99 });
  });
  it("rejects unsatisfiable, multiple, invalid and imprecise ranges", () => {
    for (const value of [
      "bytes=100-",
      "bytes=4-1",
      "bytes=-0",
      "bytes=-",
      "bytes=0-1,4-5",
      "items=1-2",
      "bytes=9007199254740992-",
    ])
      expect(singleRange(value, 100)).toBe("invalid");
  });
});

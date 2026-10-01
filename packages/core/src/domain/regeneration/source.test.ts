import { describe, expect, expectTypeOf, it } from "vitest";
import { BusinessRuleError } from "../error";
import {
  type ExecutableSourceAccess,
  localOriginalSource,
  SOURCE_MEMORY_BYTES,
  SOURCE_MEMORY_LIMIT,
  sourceAccess,
  sourceAccessSchema,
  sourceMemoryBytes,
} from "./source";

const bindingId = "00000000-0000-4000-8000-000000000001";

describe("regeneration source access", () => {
  it("preserves each explicit persisted origin", () => {
    for (const value of [
      { origin: "local-original", bindingId: null },
      { origin: "drive-record", bindingId },
      { origin: "redacted", bindingId: null },
    ])
      expect(sourceAccess(value)).toEqual(value);
  });

  it("rejects missing, unknown and mismatched origin/binding pairs", () => {
    for (const value of [
      null,
      undefined,
      {},
      { origin: null, bindingId: null },
      { origin: "unknown", bindingId: null },
      { origin: "local-original" },
      { origin: "local-original", bindingId },
      { origin: "drive-record", bindingId: null },
      { origin: "drive-record" },
      { origin: "drive-record", bindingId: "not-a-uuid" },
      { origin: "redacted", bindingId },
    ]) {
      expect(sourceAccessSchema.safeParse(value).success).toBe(false);
      expect(() => sourceAccess(value)).toThrow(BusinessRuleError);
    }
  });

  it("rejects extra fields instead of treating them as local compatibility", () => {
    expect(() =>
      sourceAccess({ ...localOriginalSource, storageKey: "untrusted" }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      sourceAccess({ origin: "drive-record", bindingId, url: "x" }),
    ).toThrow(BusinessRuleError);
  });

  it("keeps local explicit and redacted outside the executable union", () => {
    expect(localOriginalSource).toEqual({
      origin: "local-original",
      bindingId: null,
    });
    expectTypeOf<
      Extract<ExecutableSourceAccess, { origin: "redacted" }>
    >().toBeNever();
  });

  it("returns a finite coded failure for an absent Drive binding", () => {
    expect(() =>
      sourceAccess({ origin: "drive-record", bindingId: null }),
    ).toThrowError(
      expect.objectContaining({ code: "REGENERATION_SOURCE_INVALID" }),
    );
  });
});

describe("source memory reservation values", () => {
  it("defines two 50 MiB reservations without allocating input buffers", () => {
    expect(SOURCE_MEMORY_BYTES).toBe(50 * 1024 * 1024);
    expect(SOURCE_MEMORY_LIMIT).toBe(2 * SOURCE_MEMORY_BYTES);
  });

  it("accepts only the two explicit reservation values", () => {
    expect(sourceMemoryBytes(0)).toBe(0);
    expect(sourceMemoryBytes(SOURCE_MEMORY_BYTES)).toBe(SOURCE_MEMORY_BYTES);
  });

  it("rejects partial, excess, unsafe and nonnumeric reservations", () => {
    for (const value of [
      -1,
      1,
      0.5,
      SOURCE_MEMORY_BYTES - 1,
      SOURCE_MEMORY_BYTES + 1,
      SOURCE_MEMORY_LIMIT,
      Number.MAX_SAFE_INTEGER + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "0",
      null,
      undefined,
    ])
      expect(() => sourceMemoryBytes(value)).toThrowError(
        expect.objectContaining({ code: "REGENERATION_SOURCE_INVALID" }),
      );
  });
});

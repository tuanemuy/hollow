import { describe, expect, expectTypeOf, it } from "vitest";
import { BusinessRuleError } from "../error";
import {
  type ExecutableSourceAccess,
  localOriginalSource,
  SOURCE_MEMORY_BYTES,
  SOURCE_MEMORY_LIMIT,
  sourceAccess,
  sourceAccessSchema,
  sourceInputReceipt,
  sourceInputReceiptMatches,
  sourceInputReceiptSchema,
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

const inputReceipt = {
  consumer: { kind: "llm-conversion", id: bindingId },
  runtimeId: "00000000-0000-4000-8000-000000000002",
  token: "00000000-0000-4000-8000-000000000003",
  generation: 1,
  state: "active",
};
const proofId = "00000000-0000-4000-8000-000000000004";

describe("source input receipt", () => {
  it("represents each consumer namespace with active, unknown or proved-closed input", () => {
    for (const kind of [
      "llm-conversion",
      "pdf-preview",
      "machine-regeneration",
    ])
      for (const state of ["active", "unknown", "closed"]) {
        const value = {
          ...inputReceipt,
          consumer: { kind, id: bindingId },
          state,
          ...(state === "closed" ? { proofId } : {}),
        };
        expect(sourceInputReceipt(value)).toEqual(value);
      }
  });

  it("requires a proof only for closed input and rejects proof fields on open input", () => {
    for (const value of [
      { ...inputReceipt, state: "closed" },
      { ...inputReceipt, state: "closed", proofId: null },
      { ...inputReceipt, state: "closed", proofId: "invalid" },
      { ...inputReceipt, proofId },
      { ...inputReceipt, proofId: null },
      { ...inputReceipt, state: "unknown", proofId },
    ])
      expect(sourceInputReceiptSchema.safeParse(value).success).toBe(false);
  });

  it("rejects a Drive owner namespace even when its token strings match", () => {
    for (const kind of ["backup", "control", "regeneration-source", "unknown"])
      expect(
        sourceInputReceiptSchema.safeParse({
          ...inputReceipt,
          consumer: { kind, id: bindingId },
        }).success,
      ).toBe(false);
    expect(
      sourceInputReceiptSchema.safeParse({
        ...inputReceipt,
        consumer: { ...inputReceipt.consumer, attemptId: bindingId },
      }).success,
    ).toBe(false);
  });

  it("requires exact UUID identities and rejects unknown receipt fields", () => {
    for (const patch of [
      { consumer: { kind: "llm-conversion", id: "invalid" } },
      { consumer: null },
      { runtimeId: null },
      { runtimeId: "invalid" },
      { token: null },
      { token: "invalid" },
      { state: "idle" },
      { state: null },
      { callerEnded: true },
    ])
      expect(() =>
        sourceInputReceipt({ ...inputReceipt, ...patch }),
      ).toThrowError(
        expect.objectContaining({ code: "REGENERATION_SOURCE_INVALID" }),
      );
  });

  it("bounds generation to positive safe integers without wrapping", () => {
    for (const generation of [1, Number.MAX_SAFE_INTEGER])
      expect(
        sourceInputReceipt({ ...inputReceipt, generation })?.generation,
      ).toBe(generation);
    for (const generation of [
      0,
      -1,
      0.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.POSITIVE_INFINITY,
      Number.NaN,
      "1",
      null,
    ])
      expect(
        sourceInputReceiptSchema.safeParse({ ...inputReceipt, generation })
          .success,
      ).toBe(false);
  });

  it("preserves explicit legacy null but rejects a missing or empty receipt", () => {
    expect(sourceInputReceipt(null)).toBeNull();
    for (const value of [undefined, {}, "null", []])
      expect(() => sourceInputReceipt(value)).toThrow(BusinessRuleError);
  });

  it("matches open input to 50 MiB and proved-closed input to zero", () => {
    for (const state of ["active", "unknown", "closed"]) {
      const receipt = sourceInputReceiptSchema.parse({
        ...inputReceipt,
        state,
        ...(state === "closed" ? { proofId } : {}),
      });
      const current = {
        consumer: receipt.consumer,
        owner: { runtimeId: receipt.runtimeId, token: receipt.token },
        sourceMemoryBytes: state === "closed" ? 0 : SOURCE_MEMORY_BYTES,
      } as const;
      expect(sourceInputReceiptMatches(receipt, current)).toBe(true);
      expect(
        sourceInputReceiptMatches(receipt, {
          ...current,
          sourceMemoryBytes: state === "closed" ? SOURCE_MEMORY_BYTES : 0,
        }),
      ).toBe(false);
    }
  });

  it("requires the current consumer namespace, id, runtime and token to match", () => {
    const receipt = sourceInputReceiptSchema.parse(inputReceipt);
    const current = {
      consumer: receipt.consumer,
      owner: { runtimeId: receipt.runtimeId, token: receipt.token },
      sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    } as const;
    for (const consumer of [
      { kind: "pdf-preview", id: bindingId },
      { kind: "machine-regeneration", id: bindingId },
      { kind: "llm-conversion", id: proofId },
    ] as const)
      expect(sourceInputReceiptMatches(receipt, { ...current, consumer })).toBe(
        false,
      );
    for (const owner of [
      { ...current.owner, runtimeId: proofId },
      { ...current.owner, token: proofId },
      { runtimeId: null, token: null },
    ])
      expect(sourceInputReceiptMatches(receipt, { ...current, owner })).toBe(
        false,
      );
  });

  it("leaves legacy null reservations to the pre-existing consumer closure rules", () => {
    const receipt = sourceInputReceiptSchema.parse(inputReceipt);
    for (const sourceMemoryBytes of [0, SOURCE_MEMORY_BYTES] as const)
      expect(
        sourceInputReceiptMatches(null, {
          consumer: receipt.consumer,
          owner: { runtimeId: receipt.runtimeId, token: receipt.token },
          sourceMemoryBytes,
        }),
      ).toBe(true);
  });
});

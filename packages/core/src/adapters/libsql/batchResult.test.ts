import { describe, expect, it } from "vitest";
import { decodeBatchResult, encodeBatchResult } from "./batchResult";

describe("batch result wire compatibility", () => {
  it.each([
    null,
    1,
    500,
  ])("preserves legacy JSON bytes for holding %s", (holdingSequence) => {
    const old = JSON.stringify({ noteId: "old-note", holdingSequence });
    const result = decodeBatchResult(old);
    expect(result).toEqual({
      kind: "existing",
      noteId: "old-note",
      holdingSequence,
    });
    expect(encodeBatchResult(result)).toBe(old);
  });
  it.each([
    "changed",
    "unchanged",
  ] as const)("persists %s rather than inferring current state", (change) => {
    const result = {
      kind: "sharing" as const,
      noteId: "note",
      holdingSequence: null,
      visibility: "public" as const,
      change,
      previousShareVersion: 8,
      shareVersion: change === "changed" ? 9 : 8,
    };
    expect(decodeBatchResult(encodeBatchResult(result))).toEqual(result);
  });
  it.each([
    "null",
    "[]",
    "{",
    "{}",
    '{"noteId":"x","holdingSequence":501}',
    '{"noteId":"x","holdingSequence":null,"secret":"forbidden"}',
    '{"kind":"unknown","noteId":"x","holdingSequence":null}',
    '{"kind":"sharing","noteId":"x","holdingSequence":null,"visibility":"public","change":"unchanged","previousShareVersion":1,"shareVersion":2}',
  ])("rejects malformed historical JSON %s", (value) => {
    expect(() => decodeBatchResult(value)).toThrow();
  });
});

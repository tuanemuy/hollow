import { describe, expect, it } from "vitest";
import {
  emptyActionSchema,
  emptyAttemptSchema,
  emptyDetailSchema,
  emptyIdSchema,
  emptyListSchema,
} from "./hollowSchemas";

const id = "00000000-0000-4000-8000-000000000001";
describe("bounded empty-trash transport", () => {
  it("keeps caller scope and limit out of fixed snapshots", () => {
    expect(emptyIdSchema.safeParse({ id }).success).toBe(true);
    expect(
      emptyListSchema.safeParse({
        watch: Array(50).fill(id),
        cursor: { id, at: "2026-09-10T00:00:00Z" },
      }).success,
    ).toBe(true);
    for (const input of [
      { watch: Array(51).fill(id) },
      { accountId: id },
      { limit: 5001 },
      { cursor: { id, at: "bad" } },
      { scope: "all" },
    ])
      expect(emptyListSchema.safeParse(input).success).toBe(false);
    expect(emptyIdSchema.safeParse({ id, targets: [id] }).success).toBe(false);
  });
  it("accepts exact bounded target and attempt cursor identities", () => {
    expect(
      emptyActionSchema.safeParse({ id, generation: 1, ordinal: 5001 }).success,
    ).toBe(true);
    expect(
      emptyAttemptSchema.safeParse({
        id,
        ordinal: 1,
        cursor: { id: `${id}:5001`, at: "2026-09-10T00:00:00Z" },
      }).success,
    ).toBe(true);
    for (const input of [
      { id, generation: -1 },
      { id, generation: 1, ordinal: 0 },
      { id, generation: Number.MAX_SAFE_INTEGER + 1 },
      { id, generation: 1, accountId: id },
    ])
      expect(emptyActionSchema.safeParse(input).success).toBe(false);
    expect(emptyDetailSchema.safeParse({ id, after: 0 }).success).toBe(true);
    expect(emptyDetailSchema.safeParse({ id, after: -1 }).success).toBe(false);
    expect(
      emptyAttemptSchema.safeParse({
        id,
        ordinal: 1,
        cursor: { id: "x".repeat(101), at: "2026-09-10T00:00:00Z" },
      }).success,
    ).toBe(false);
  });
});

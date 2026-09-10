import { describe, expect, it } from "vitest";
import { purgeListSchema } from "./hollowSchemas";

const id = "00000000-0000-4000-8000-000000000001";
describe("bounded purge read transport", () => {
  it("accepts only bounded cursors, observations and exact receipt references", () => {
    expect(
      purgeListSchema.safeParse({
        scope: "unfinished",
        cursor: { at: "2026-09-10T00:00:00.000Z", id },
        watch: Array(50).fill(id),
        requests: Array(10).fill({ noteId: id, operationId: id }),
      }).success,
    ).toBe(true);
    for (const input of [
      { watch: Array(51).fill(id) },
      { requests: Array(11).fill({ noteId: id, operationId: id }) },
      { cursor: { at: "bad", id } },
      { cursor: { at: "2026-09-10T00:00:00Z", id: "bad" } },
      { scope: "all" },
      { accountId: id },
      { limit: 100000 },
      { requests: [{ noteId: id }] },
    ])
      expect(purgeListSchema.safeParse(input).success).toBe(false);
  });
});

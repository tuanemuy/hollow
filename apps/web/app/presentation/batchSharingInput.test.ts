import type { BatchConfirmation } from "@repo/core/application/batch/ports";
import { describe, expect, it } from "vitest";
import {
  batchAcceptSchema,
  batchConfirmationSchema,
  batchOperationSchema,
  batchPreviewSchema,
} from "./batchInput";

const id = "00000000-0000-4000-8000-000000000001";
const item: BatchConfirmation = {
  kind: "ready",
  noteId: id,
  title: "sharing",
  latestAttemptId: null,
  baseSequence: 0,
  expected: {
    kind: "sharing",
    snapshot: {
      share: {
        noteId: id,
        shareVersion: 2,
        noteVersion: 3,
        scope: {
          ownershipGeneration: 0,
          workspaceId: null,
          membershipRevision: 0,
          name: "personal",
          memberCount: 1,
        },
      },
      visibility: "private",
      hasPassword: true,
      hasLink: true,
      body: "present",
    },
  },
  consent: { kind: "remove-password", noteId: id, shareVersion: 2 },
};
describe("batch sharing transport", () => {
  it("accepts explicit child consent and all three visibility targets", () => {
    expect(batchConfirmationSchema.parse(item)).toEqual(item);
    for (const visibility of ["private", "link", "public"] as const)
      expect(
        batchOperationSchema.parse({ kind: "sharing", visibility }),
      ).toEqual({ kind: "sharing", visibility });
  });
  it("rejects absent consent, secret fields, password and regeneration operations", () => {
    const { consent: _consent, ...missing } = item;
    for (const value of [
      missing,
      { ...item, token: "not-permitted" },
      { ...item, consent: true },
      { ...item, consent: { kind: "remove-password", noteId: id } },
    ])
      expect(batchConfirmationSchema.safeParse(value).success).toBe(false);
    for (const operation of [
      { kind: "sharing", visibility: "link", password: "not-permitted" },
      { kind: "regenerate" },
      { kind: "sharing", visibility: "public", confirmPasswordRemoval: true },
    ])
      expect(batchOperationSchema.safeParse(operation).success).toBe(false);
  });
  it("does not admit sharing consent on legacy operations", () => {
    const { consent: _consent, ...withoutConsent } = item;
    const legacy = { ...withoutConsent, expected: { kind: "tag" } };
    expect(batchConfirmationSchema.parse(legacy)).toEqual(legacy);
    expect(
      batchConfirmationSchema.safeParse({
        ...legacy,
        consent: { kind: "none" },
      }).success,
    ).toBe(false);
  });
  it("preserves 50 preview / 500 accept finite boundaries without truncation", () => {
    const ids = Array.from(
      { length: 501 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const common = {
      source: { kind: "personal", accountId: id },
      operation: { kind: "sharing", visibility: "private" },
    };
    expect(
      batchPreviewSchema.safeParse({ ...common, ids: ids.slice(0, 50) })
        .success,
    ).toBe(true);
    expect(
      batchPreviewSchema.safeParse({ ...common, ids: ids.slice(0, 51) })
        .success,
    ).toBe(false);
    const excluded = ids.map((noteId) => ({ kind: "excluded", noteId }));
    expect(
      batchAcceptSchema.safeParse({
        ...common,
        requestId: id,
        items: excluded.slice(0, 500),
      }).success,
    ).toBe(true);
    expect(
      batchAcceptSchema.safeParse({ ...common, requestId: id, items: excluded })
        .success,
    ).toBe(false);
  });
});

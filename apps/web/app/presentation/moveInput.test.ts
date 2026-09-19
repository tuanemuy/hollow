import { describe, expect, it } from "vitest";
import { batchAcceptSchema } from "./batchInput";
import {
  moveAudienceSchema,
  moveDestinationsSchema,
  moveExpectedSchema,
  moveOwnerSchema,
} from "./moveInput";

const id = "01a08eee-9d17-71ff-90d3-23fd4c78dc81";
const resource = { count: 0, bytes: 0 };
const tag = { id, key: "tag", name: "TAG" };
const expected = {
  noteId: id,
  version: 0,
  ownershipGeneration: 1,
  resourceRevision: 1,
  source: {
    owner: { kind: "personal", accountId: id },
    name: "個人",
    membershipRevision: 0,
  },
  destination: {
    owner: { kind: "workspace", workspaceId: id },
    name: "共同",
    membershipRevision: 1,
  },
  normalizationVersion: "16.0.0",
  tags: [],
  resources: {
    originals: resource,
    currentAssets: resource,
    heldAssets: resource,
    graceAssets: resource,
    mediaReservations: resource,
    referenceReservations: resource,
  },
  bundle: null,
  sourceRelease: 0,
  destinationIncrease: 0,
  sharing: { version: 0, visibility: "private", hasPassword: false },
};

describe("move transport boundaries", () => {
  it("requires explicit sharing confirmation on new single and batch commands, including legacy-shaped requests", () => {
    const { sharing: _sharing, ...legacy } = expected;
    const batch = (move: unknown) => ({
      requestId: id,
      source: expected.source.owner,
      operation: { kind: "move", destination: expected.destination.owner },
      items: [
        {
          kind: "ready",
          noteId: id,
          title: "old receipt",
          latestAttemptId: null,
          baseSequence: 0,
          expected: { kind: "move", move },
        },
      ],
    });
    for (const move of [
      legacy,
      { ...expected, sharing: null },
      { ...expected, sharing: { version: 0 } },
    ]) {
      expect(moveExpectedSchema.safeParse(move).success).toBe(false);
      expect(batchAcceptSchema.safeParse(batch(move)).success).toBe(false);
    }
    expect(batchAcceptSchema.safeParse(batch(expected)).success).toBe(true);
  });
  it("accepts at most 50 mappings without imposing a global resource count", () => {
    const tags = Array.from({ length: 50 }, () => ({
      source: tag,
      destination: null,
    }));
    expect(moveExpectedSchema.safeParse({ ...expected, tags }).success).toBe(
      true,
    );
    expect(
      moveExpectedSchema.safeParse({ ...expected, tags: [...tags, tags[0]] })
        .success,
    ).toBe(false);
    expect(
      moveExpectedSchema.safeParse({
        ...expected,
        resources: {
          ...expected.resources,
          originals: { count: 5001, bytes: 5001 },
        },
      }).success,
    ).toBe(true);
  });
  it("rejects mixed owner identities and unknown fields", () => {
    expect(
      moveOwnerSchema.safeParse({
        kind: "personal",
        accountId: id,
        workspaceId: id,
      }).success,
    ).toBe(false);
    expect(
      moveExpectedSchema.safeParse({ ...expected, permission: true }).success,
    ).toBe(false);
  });
  it("retains absent versus present-zero holdings and requires safe revisions", () => {
    const bundle = {
      id,
      contentRevision: 1,
      bytes: 0,
      source: { kind: "absent" },
      destination: {
        kind: "present",
        revision: 1,
        noteHolds: 0,
        admissionHolds: 0,
        cleanupHolds: 0,
      },
    };
    const parsed = moveExpectedSchema.parse({ ...expected, bundle });
    expect(parsed.bundle?.source).toEqual({ kind: "absent" });
    expect(parsed.bundle?.destination.kind).toBe("present");
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(
        moveExpectedSchema.safeParse({
          ...expected,
          ownershipGeneration: value,
        }).success,
      ).toBe(false);
    }
  });
  it("validates finite cursor and audience direction at the public boundary", () => {
    expect(
      moveDestinationsSchema.safeParse({ noteId: id, after: id }).success,
    ).toBe(true);
    expect(
      moveDestinationsSchema.safeParse({ noteId: id, after: "x".repeat(1000) })
        .success,
    ).toBe(false);
    expect(
      moveAudienceSchema.safeParse({ expected, direction: "all" }).success,
    ).toBe(false);
  });
  it("canonicalizes object insertion order while retaining exact comparison values", () => {
    const reordered = Object.fromEntries(Object.entries(expected).reverse());
    expect(JSON.stringify(moveExpectedSchema.parse(reordered))).toBe(
      JSON.stringify(moveExpectedSchema.parse(expected)),
    );
    expect(
      moveExpectedSchema.safeParse({
        ...expected,
        normalizationVersion: "15.0.0",
      }).success,
    ).toBe(false);
  });
});

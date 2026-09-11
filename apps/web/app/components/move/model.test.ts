import type { MoveExpected } from "@repo/core/application/move/ports";
import { describe, expect, it } from "vitest";
import {
  acceptsMoveResponse,
  moveBytes,
  moveExpectedInput,
  moveFailure,
  moveScopeKey,
  moveSourceMatches,
} from "./model";

const expected: MoveExpected = {
  noteId: "note",
  version: 3,
  ownershipGeneration: 2,
  resourceRevision: 7,
  source: {
    owner: { kind: "personal", accountId: "actor" },
    name: "個人",
    membershipRevision: 0,
  },
  destination: {
    owner: { kind: "workspace", workspaceId: "workspace" },
    name: "チーム",
    membershipRevision: 4,
  },
  normalizationVersion: "16.0.0",
  tags: [
    {
      source: { id: "old", key: "東京", name: "東京" },
      destination: { id: "new", key: "東京", name: "東京" },
    },
  ],
  resources: {
    originals: { count: 1, bytes: 2 },
    currentAssets: { count: 0, bytes: 0 },
    heldAssets: { count: 0, bytes: 0 },
    graceAssets: { count: 0, bytes: 0 },
    mediaReservations: { count: 0, bytes: 0 },
    referenceReservations: { count: 0, bytes: 0 },
  },
  bundle: null,
  sourceRelease: 2,
  destinationIncrease: 2,
};
const remnant = (kind: string, code: string | null) => ({
  serialized: { kind, code, message: "message" },
});

describe("single move UI contracts", () => {
  it("distinguishes account and workspace IDs with the same string", () => {
    expect(moveScopeKey({ kind: "personal", accountId: "same" })).not.toBe(
      moveScopeKey({ kind: "workspace", workspaceId: "same" }),
    );
  });
  it("accepts only the note/version/current scope that seeded the detail", () => {
    expect(
      moveSourceMatches(expected, {
        id: "note",
        version: 3,
        workspaceId: null,
      }),
    ).toBe(true);
    expect(
      moveSourceMatches(expected, {
        id: "other",
        version: 3,
        workspaceId: null,
      }),
    ).toBe(false);
    expect(
      moveSourceMatches(expected, {
        id: "note",
        version: 4,
        workspaceId: null,
      }),
    ).toBe(false);
    expect(
      moveSourceMatches(expected, {
        id: "note",
        version: 3,
        workspaceId: "workspace",
      }),
    ).toBe(false);
  });
  it("compares workspace source identity, not its display label", () => {
    const moved = { ...expected, source: expected.destination };
    expect(
      moveSourceMatches(moved, {
        id: "note",
        version: 3,
        workspaceId: "workspace",
      }),
    ).toBe(true);
    expect(
      moveSourceMatches(moved, {
        id: "note",
        version: 3,
        workspaceId: "other",
      }),
    ).toBe(false);
  });
  it("copies the finite transport array without changing expected values", () => {
    const input = moveExpectedInput(expected);
    expect(input).toEqual(expected);
    expect(input.tags).not.toBe(expected.tags);
    input.tags.pop();
    expect(expected.tags).toHaveLength(1);
    expect(input).not.toHaveProperty("sourceCapacity");
    expect(input).not.toHaveProperty("destinationCapacity");
  });
  it("preserves absent versus zero holding generations in transport", () => {
    const input = moveExpectedInput({
      ...expected,
      bundle: {
        id: "bundle",
        contentRevision: 2,
        bytes: 10,
        source: {
          kind: "present",
          revision: 5,
          noteHolds: 0,
          admissionHolds: 0,
          cleanupHolds: 0,
        },
        destination: { kind: "absent" },
      },
    });
    expect(input.bundle?.source).toEqual({
      kind: "present",
      revision: 5,
      noteHolds: 0,
      admissionHolds: 0,
      cleanupHolds: 0,
    });
    expect(input.bundle?.destination).toEqual({ kind: "absent" });
  });
  it("requires the same live request and full current URL/note context", () => {
    const request = Symbol("request");
    const incoming = { context: "note:version:scope:url", request };
    const current = { ...incoming, mounted: true };
    expect(acceptsMoveResponse(current, incoming)).toBe(true);
    expect(
      acceptsMoveResponse({ ...current, context: "different-url" }, incoming),
    ).toBe(false);
    expect(
      acceptsMoveResponse({ ...current, request: Symbol("new") }, incoming),
    ).toBe(false);
    expect(acceptsMoveResponse({ ...current, mounted: false }, incoming)).toBe(
      false,
    );
  });
  it("makes dropped request tokens ineligible", () => {
    expect(
      acceptsMoveResponse(
        { context: "same", request: null, mounted: true },
        { context: "same", request: Symbol("old") },
      ),
    ).toBe(false);
  });
  it("classifies exact condition changes as reconfirmation", () => {
    expect(moveFailure(remnant("business", "MOVE_CHANGED"))).toBe("changed");
  });
  it("distinguishes quota rejection from conversion refusal", () => {
    expect(moveFailure(remnant("business", "MOVE_QUOTA"))).toBe("quota");
    expect(moveFailure(remnant("business", "MOVE_CONVERSION_ACTIVE"))).toBe(
      "conversion",
    );
  });
  it("treats current access loss as unavailable without an owner fallback", () => {
    expect(moveFailure(remnant("notFound", "NOTE_NOT_FOUND"))).toBe("access");
    expect(moveFailure(remnant("notFound", "SCOPE_NOT_FOUND"))).toBe("access");
    expect(moveFailure(remnant("unauthorized", "SESSION"))).toBe("access");
    expect(moveFailure(remnant("forbidden", "SCOPE"))).toBe("access");
  });
  it("does not equate lost transport or system errors with rollback or success", () => {
    expect(moveFailure(new Error("Failed to fetch"))).toBe("unknown");
    expect(moveFailure(remnant("system", null))).toBe("unknown");
  });
  it("keeps explicit validation failures separate from unknown results", () => {
    expect(moveFailure(remnant("validation", "INPUT"))).toBe("rejected");
  });
  it("does not round away a one-byte or near-quota difference", () => {
    expect(moveBytes(0)).toBe("0 bytes");
    expect(moveBytes(1)).toBe("1 bytes");
    expect(moveBytes(1_073_741_825)).toBe("1,073,741,825 bytes");
  });
});

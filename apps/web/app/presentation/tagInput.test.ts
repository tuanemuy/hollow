import { describe, expect, it } from "vitest";
import {
  tagDeltaSchema,
  tagManagementSchema,
  tagReadInputSchema,
  tagRouteSchema,
} from "./tagInput";

const id = "00000000-0000-4000-8000-000000000001";
describe("tag transport boundaries", () => {
  it("requires an explicit scope selector and delta rather than a client tag set", () => {
    expect(
      tagDeltaSchema.safeParse({
        noteId: id,
        expectedScope: {},
        change: { kind: "attach", tagId: id },
      }).success,
    ).toBe(true);
    expect(
      tagDeltaSchema.safeParse({
        noteId: id,
        change: { kind: "attach", tagId: id },
      }).success,
    ).toBe(false);
    expect(
      tagDeltaSchema.safeParse({ noteId: id, expectedScope: {}, tags: [] })
        .success,
    ).toBe(false);
  });
  it("bounds manager cleanup and validates safe integer expected revisions", () => {
    const input = {
      scope: {},
      action: { kind: "cleanup", targets: [{ id, revision: 1 }] },
    };
    expect(tagManagementSchema.safeParse(input).success).toBe(true);
    expect(
      tagManagementSchema.safeParse({
        ...input,
        action: {
          ...input.action,
          targets: Array.from({ length: 51 }, () => ({ id, revision: 1 })),
        },
      }).success,
    ).toBe(false);
    expect(
      tagManagementSchema.safeParse({
        scope: {},
        action: {
          kind: "delete",
          source: { id, revision: Number.MAX_SAFE_INTEGER + 1 },
        },
      }).success,
    ).toBe(false);
  });
  it("separates read purposes, rejects unknown URL input, and bounds query by codepoints", () => {
    expect(
      tagReadInputSchema.safeParse({
        purpose: "picker",
        noteId: id,
        query: "😀".repeat(200),
      }).success,
    ).toBe(true);
    expect(
      tagReadInputSchema.safeParse({
        purpose: "picker",
        noteId: id,
        query: "😀".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      tagReadInputSchema.safeParse({
        purpose: "impact",
        sourceId: id,
        query: "",
      }).success,
    ).toBe(false);
    expect(tagRouteSchema.safeParse({ q: "wrong-key" }).success).toBe(false);
    expect(
      tagRouteSchema.safeParse({ workspaceId: "foreign-untyped" }).success,
    ).toBe(false);
  });
});

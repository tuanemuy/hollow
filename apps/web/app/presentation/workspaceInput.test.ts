import { describe, expect, it } from "vitest";
import {
  acceptsWorkspaceResponse,
  scopedNotesSchema,
  scopeFromLoader,
  scopeReadIdentity,
  scopeSearch,
  scopeSearchSchema,
  workspaceCreateSchema,
  workspaceInputProblem,
  workspaceSlugSchema,
} from "./workspaceInput";

const id = "19cb5dba-8910-47d8-8ab6-028685a73918";
describe("workspace input boundaries", () => {
  it("defaults an omitted scope to personal without deriving it from device settings", () => {
    expect(scopeSearchSchema.parse({})).toEqual({});
    expect(scopeSearch()).toEqual({});
    expect(scopeSearch(null)).toEqual({});
    expect(scopeSearch(id)).toEqual({ workspaceId: id });
    expect(
      scopeSearchSchema.safeParse({ workspaceId: "another/slash" }).success,
    ).toBe(false);
    expect(scopeSearchSchema.safeParse({ workspaceId: [id] }).success).toBe(
      false,
    );
  });
  it("bounds opaque keyset cursors and refuses injected actor/policy fields", () => {
    expect(
      scopedNotesSchema.parse({ workspaceId: id, cursor: "cursor" }),
    ).toEqual({ workspaceId: id, cursor: "cursor" });
    expect(
      scopedNotesSchema.safeParse({ cursor: "x".repeat(2049) }).success,
    ).toBe(false);
    expect(
      scopedNotesSchema.safeParse({ workspaceId: id, canEdit: true }).success,
    ).toBe(false);
    expect(
      workspaceCreateSchema.safeParse({
        name: "name",
        description: "",
        creatorId: id,
        role: "owner",
      }).success,
    ).toBe(false);
    expect(
      workspaceCreateSchema.safeParse({
        name: "x".repeat(401),
        description: "",
      }).success,
    ).toBe(false);
  });
  it("validates UI name/description by code point without silently truncating", () => {
    expect(workspaceInputProblem("  ", "", "")).toContain("名前");
    expect(workspaceInputProblem("  名前  ", "  説明  ", "")).toBeNull();
    expect(workspaceInputProblem("😀".repeat(100), "", "")).toBeNull();
    expect(workspaceInputProblem("😀".repeat(101), "", "")).toContain("名前");
    expect(workspaceInputProblem("名前", "😀".repeat(2000), "")).toBeNull();
    expect(workspaceInputProblem("名前", "😀".repeat(2001), "")).toContain(
      "説明",
    );
  });
  it("allows no slug, checks ASCII/edge boundaries and reserves whole words only", () => {
    expect(workspaceInputProblem("name", "", "")).toBeNull();
    expect(workspaceInputProblem("name", "", "notes")).toContain("予約語");
    expect(workspaceInputProblem("name", "", "notes-team")).toBeNull();
    expect(workspaceInputProblem("name", "", "a".repeat(63))).toBeNull();
    for (const slug of ["ab", "-abc", "abc-", "Aaa", "日本語", "a".repeat(64)])
      expect(workspaceSlugSchema.safeParse({ slug }).success).toBe(false);
  });
  it("binds cursor identity to scope and rejects delayed ABA responses", () => {
    const personal = scopeReadIdentity(undefined, "next");
    const workspace = scopeReadIdentity(id, "next");
    expect(personal).not.toBe(workspace);
    expect(scopeReadIdentity(id, "next")).not.toBe(
      scopeReadIdentity(id, "other"),
    );
    expect(
      acceptsWorkspaceResponse(
        { generation: 3, identity: personal },
        { generation: 1, identity: personal },
      ),
    ).toBe(false);
    expect(
      acceptsWorkspaceResponse(
        { generation: 3, identity: personal },
        { generation: 3, identity: workspace },
      ),
    ).toBe(false);
    expect(
      acceptsWorkspaceResponse(
        { generation: 3, identity: personal },
        { generation: 3, identity: personal },
      ),
    ).toBe(true);
  });
  it("extracts only a complete scope display DTO and preserves explicit personal null", () => {
    expect(
      scopeFromLoader({
        scope: { workspaceId: null, name: "個人", canEdit: false },
      }),
    ).toEqual({ workspaceId: null, name: "個人", canEdit: false });
    expect(
      scopeFromLoader({ scope: { workspaceId: id, name: "WS", canEdit: true } })
        ?.workspaceId,
    ).toBe(id);
    expect(
      scopeFromLoader({ scope: { workspaceId: id, name: "WS" } }),
    ).toBeUndefined();
    expect(scopeFromLoader({ notes: Promise.resolve(null) })).toBeUndefined();
  });
});

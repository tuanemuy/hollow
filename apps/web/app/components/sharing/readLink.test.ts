import { ConflictError, NotFoundError } from "@repo/core/application/errors";
import type { SharingView } from "@repo/core/application/sharing/settings";
import { describe, expect, it, vi } from "vitest";
import { readSharingLink } from "./readLink";

const view: SharingView = {
  actorId: "owner",
  title: "shared",
  expected: {
    noteId: "note",
    shareVersion: 2,
    noteVersion: 3,
    scope: {
      workspaceId: null,
      ownershipGeneration: 1,
      membershipRevision: 0,
      name: "個人",
      memberCount: 1,
    },
  },
  visibility: "link",
  hasPassword: false,
  hasLink: true,
  publicUrl: null,
  publicPrerequisite: null,
  canEdit: true,
  author: { kind: "unset" },
  ownDisplayName: null,
};

describe("sharing initial link read", () => {
  it.each([
    "link",
    "public",
  ] as const)("reads the confirmed %s version without mutating it", async (visibility) => {
    const get = vi.fn(async () => ({
      url: "https://fixture.invalid/s/opaque",
    }));
    const before = structuredClone(view);
    expect(
      await readSharingLink({ ...view, visibility }, () => true, get),
    ).toEqual({ kind: "ready", url: "https://fixture.invalid/s/opaque" });
    expect(get).toHaveBeenCalledExactlyOnceWith(view.expected);
    expect(view).toEqual(before);
  });
  it.each([
    { ...view, visibility: "private" as const },
    { ...view, canEdit: false },
    { ...view, hasLink: false },
  ])("never reads secret material for an ineligible view", async (input) => {
    const get = vi.fn(async () => ({ url: "secret" }));
    expect(await readSharingLink(input, () => true, get)).toEqual({
      kind: "absent",
    });
    expect(get).not.toHaveBeenCalled();
  });
  it("does not begin a read after the actor or operation has changed", async () => {
    const get = vi.fn(async () => ({ url: "secret" }));
    expect(await readSharingLink(view, () => false, get)).toEqual({
      kind: "stale",
    });
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    false,
    true,
  ])("discards old success and failure after logout, ABA or unmount", async (reject) => {
    let current = true;
    let settle: (result: { url: string }) => void = () => {};
    let fail: (error: Error) => void = () => {};
    const pending = new Promise<{ url: string }>((resolve, reject) => {
      settle = resolve;
      fail = reject;
    });
    const read = readSharingLink(
      view,
      () => current,
      () => pending,
    );
    current = false;
    if (reject) fail(new Error("old secret failure"));
    else settle({ url: "old secret" });
    expect(await read).toEqual({ kind: "stale" });
  });
  it.each([
    [new ConflictError("CHANGED", "再確認"), "conflict"],
    [new NotFoundError("MISSING", "見つかりません"), "access"],
    [new Error("raw key path and secret"), "unknown"],
  ] as const)("classifies recovery and redacts unknown read failures", async (error, kind) => {
    const result = await readSharingLink(
      view,
      () => true,
      async () => {
        throw error;
      },
    );
    expect(result).toMatchObject({ kind: "failed", failure: { kind } });
    expect(JSON.stringify(result)).not.toContain("raw key path");
  });
});

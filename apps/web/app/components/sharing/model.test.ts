import {
  ConflictError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import type { SharingView } from "@repo/core/application/sharing/settings";
import { BusinessRuleError } from "@repo/core/domain/error";
import { describe, expect, it } from "vitest";
import {
  authorLabel,
  displayNameError,
  isSharingView,
  ownsSharingOperation,
  passwordError,
  sameSharingActor,
  sharingAudience,
  sharingFailure,
  sharingProfileHref,
  sharingReturnHref,
} from "./model";

const noteId = "6bc67656-e3d4-4051-bdaa-14f8721ce4bc";
const view: SharingView = {
  actorId: "actor-a",
  title: "unit note",
  expected: {
    noteId,
    shareVersion: 1,
    noteVersion: 2,
    scope: {
      ownershipGeneration: 3,
      workspaceId: "workspace-a",
      membershipRevision: 4,
      name: "制作",
      memberCount: 5,
    },
  },
  visibility: "private",
  hasPassword: false,
  hasLink: false,
  canEdit: true,
  author: { kind: "unset" },
  ownDisplayName: null,
};

describe("sharing UI boundaries", () => {
  it("ignores old success, catch, finally and focus ownership after unmount or a newer operation", () => {
    const old = {};
    const newer = {};
    const actor = { id: "a", epoch: 1 };
    expect(ownsSharingOperation(true, old, old, actor, "a", 1)).toBe(true);
    expect(ownsSharingOperation(false, old, old, actor, "a", 1)).toBe(false);
    expect(ownsSharingOperation(true, newer, old, actor, "a", 1)).toBe(false);
    expect(
      ownsSharingOperation(true, old, old, { id: "a", epoch: 2 }, "a", 1),
    ).toBe(false);
  });
  it("rejects an old actor, ABA epoch, and note response", () => {
    expect(sameSharingActor({ id: "a", epoch: 2 }, "a", 2)).toBe(true);
    expect(sameSharingActor({ id: "b", epoch: 2 }, "a", 2)).toBe(false);
    expect(sameSharingActor({ id: "a", epoch: 3 }, "a", 2)).toBe(false);
    expect(sameSharingActor(null, "a", 2)).toBe(false);
    expect(isSharingView(view, "actor-a", noteId)).toBe(true);
    expect(isSharingView(view, "actor-b", noteId)).toBe(false);
    expect(isSharingView(view, "actor-a", "other")).toBe(false);
  });
  it("keeps the four author provenances distinct", () => {
    expect(authorLabel({ kind: "named", displayName: "名" })).toBe("名");
    expect(authorLabel({ kind: "unset" })).toBe("表示名未設定");
    expect(authorLabel({ kind: "deleted" })).toBe("退会した利用者");
    expect(authorLabel({ kind: "unknown" })).toBe("作成者不明");
  });
  it("describes current member audience and independent protected links", () => {
    expect(sharingAudience(view)).toBe("ワークスペース「制作」のメンバー 5 名");
    expect(
      sharingAudience({ ...view, visibility: "link", hasPassword: true }),
    ).toContain("パスワードを通過した");
    expect(
      sharingAudience({
        ...view,
        expected: {
          ...view.expected,
          scope: { ...view.expected.scope, workspaceId: null },
        },
      }),
    ).toBe("所有者本人");
  });
  it("counts password code points and UTF-8 bytes without trimming", () => {
    expect(passwordError("😀".repeat(8))).toBeNull();
    expect(passwordError("😀".repeat(7))).not.toBeNull();
    expect(passwordError(" ".repeat(8))).toBeNull();
    expect(passwordError("a".repeat(1024))).toBeNull();
    expect(passwordError("a".repeat(1025))).not.toBeNull();
    expect(passwordError("😀".repeat(257))).not.toBeNull();
  });
  it("accepts an unset name and trims only for the 50-code-point name rule", () => {
    expect(displayNameError(" ")).toBeNull();
    expect(displayNameError(` ${"😀".repeat(50)} `)).toBeNull();
    expect(displayNameError("😀".repeat(51))).not.toBeNull();
    for (const value of ["a\nb", "a\tb", "a\u0000b", "a\u2028b"])
      expect(displayNameError(value)).not.toBeNull();
  });
  it("requires explicit GET recovery for unknown or conflicting responses", () => {
    expect(sharingFailure(new Error("opaque response")).kind).toBe("unknown");
    expect(
      sharingFailure(
        new SystemError(SystemErrorCode.NetworkError, "unavailable"),
      ).kind,
    ).toBe("unknown");
    expect(
      sharingFailure(new ConflictError("CONFLICT", "更新されています")).kind,
    ).toBe("conflict");
    expect(
      sharingFailure(new NotFoundError("MISSING", "見つかりません")).kind,
    ).toBe("access");
    expect(
      sharingFailure(new BusinessRuleError("INVALID", "確認してください")).kind,
    ).toBe("rejected");
  });
  it("accepts only the fixed note/profile return contracts", () => {
    expect(sharingReturnHref(`/notes/${noteId}?sharing=1`)).not.toBeNull();
    expect(
      sharingProfileHref(`/settings/profile?noteId=${noteId}&resume=sharing`),
    ).not.toBeNull();
    for (const value of [
      "https://example.com/",
      "//example.com/",
      "/\\example.com/",
      `/notes/${noteId}?sharing=0`,
      `/notes/${noteId}?sharing=1&next=https://example.com/`,
      `/notes/${noteId}?sharing=1#other`,
      "/notes/not-an-id?sharing=1",
      undefined,
    ])
      expect(sharingReturnHref(value)).toBeNull();
    expect(
      sharingProfileHref(`/settings/profile?noteId=${noteId}&resume=delete`),
    ).toBeNull();
  });
});

import type {
  ProfileView,
  WorkspacePublicationView,
} from "@repo/core/application/publication/views";
import { BusinessRuleError } from "@repo/core/domain/error";
import { describe, expect, it } from "vitest";
import {
  draftAfterProfileResponse,
  iconInputIssue,
  isWorkspaceView,
  needsHandleConfirmation,
  ownsPublicationOperation,
  profileDraft,
  profileIsDirty,
  profileIssues,
  publicationFailure,
  reconcileWorkspaceLoader,
  samePublicationActor,
  saveProfileInput,
  selectionAfterWorkspaceResponse,
  workspaceViewKey,
} from "./model";

const profile: ProfileView = {
  actorId: "actor-a",
  displayName: "現在の名前",
  nameVersion: 2,
  handle: "author-a",
  bio: "現在の紹介",
  profileVersion: 5,
  url: "/@author-a",
  icon: null,
};
const workspace: WorkspacePublicationView = {
  actorId: "actor-a",
  workspaceId: "workspace-a",
  name: "制作室",
  slug: "studio",
  pagePublic: true,
  settingsVersion: 3,
  publicationVersion: 7,
  canEdit: true,
  url: "/w/studio",
};

describe("workspace loader reconciliation", () => {
  it("adopts current slug URL and versions without losing a dirty toggle", () => {
    const next = {
      ...workspace,
      slug: "renamed",
      url: "/w/renamed",
      settingsVersion: 4,
    };
    expect(reconcileWorkspaceLoader(workspace, next, false)).toEqual({
      view: next,
      selected: false,
    });
    expect(workspaceViewKey(next)).not.toBe(workspaceViewKey(workspace));
  });
  it("follows saved state only when the local selection was not dirty", () => {
    const next = {
      ...workspace,
      pagePublic: false,
      url: null,
      publicationVersion: 8,
    };
    expect(reconcileWorkspaceLoader(workspace, next, true)?.selected).toBe(
      false,
    );
  });
  it("rejects another actor/workspace and either regressed confirmation version", () => {
    for (const patch of [
      { actorId: "other" },
      { workspaceId: "other" },
      { settingsVersion: 2 },
      { publicationVersion: 6 },
    ]) {
      expect(
        reconcileWorkspaceLoader(workspace, { ...workspace, ...patch }, false),
      ).toBeNull();
    }
    expect(
      reconcileWorkspaceLoader(workspace, { ...workspace }, false),
    ).toBeNull();
  });
  it("changes operation context for same-version access loss and keeps current URL", () => {
    const next = { ...workspace, canEdit: false };
    expect(workspaceViewKey(next)).not.toBe(workspaceViewKey(workspace));
    expect(reconcileWorkspaceLoader(workspace, next, false)?.view).toEqual(
      next,
    );
  });
});

describe("publication operation ownership", () => {
  it("accepts only the same actor and epoch", () => {
    expect(
      samePublicationActor({ id: "actor-a", epoch: 1 }, "actor-a", 1),
    ).toBe(true);
    expect(samePublicationActor(null, "actor-a", 1)).toBe(false);
    expect(
      samePublicationActor({ id: "actor-b", epoch: 1 }, "actor-a", 1),
    ).toBe(false);
    expect(
      samePublicationActor({ id: "actor-a", epoch: 3 }, "actor-a", 1),
    ).toBe(false);
  });
  it("rejects old success/catch/finally/focus after unmount, replacement and ABA", () => {
    const token = {};
    expect(
      ownsPublicationOperation(
        true,
        token,
        token,
        { id: "actor-a", epoch: 1 },
        "actor-a",
        1,
      ),
    ).toBe(true);
    expect(
      ownsPublicationOperation(
        false,
        token,
        token,
        { id: "actor-a", epoch: 1 },
        "actor-a",
        1,
      ),
    ).toBe(false);
    expect(
      ownsPublicationOperation(
        true,
        {},
        token,
        { id: "actor-a", epoch: 1 },
        "actor-a",
        1,
      ),
    ).toBe(false);
    expect(
      ownsPublicationOperation(
        true,
        null,
        token,
        { id: "actor-a", epoch: 1 },
        "actor-a",
        1,
      ),
    ).toBe(false);
    expect(
      ownsPublicationOperation(
        true,
        token,
        token,
        { id: "actor-a", epoch: 3 },
        "actor-a",
        1,
      ),
    ).toBe(false);
  });
  it("requires workspace and actor to match the response", () => {
    expect(isWorkspaceView(workspace, "actor-a", "workspace-a")).toBe(true);
    expect(isWorkspaceView(workspace, "actor-b", "workspace-a")).toBe(false);
    expect(isWorkspaceView(workspace, "actor-a", "workspace-b")).toBe(false);
  });
});

describe("profile inputs and reconciliation", () => {
  it("seeds unset profile values without email or fabricated handle", () => {
    expect(
      profileDraft({ ...profile, displayName: null, handle: null, bio: "" }),
    ).toEqual({ displayName: "", handle: "", bio: "" });
  });
  it("keeps Unicode code point limits for display name and bio", () => {
    expect(
      profileIssues({
        displayName: "😀".repeat(50),
        handle: "AUTHOR-a",
        bio: "😀".repeat(300),
      }),
    ).toEqual({ displayName: null, handle: null, bio: null });
    expect(
      profileIssues({
        displayName: "😀".repeat(51),
        handle: "author-a",
        bio: "😀".repeat(301),
      }).displayName,
    ).not.toBeNull();
    expect(
      profileIssues({
        displayName: "",
        handle: "author-a",
        bio: "😀".repeat(301),
      }).bio,
    ).not.toBeNull();
  });
  it("allows biography newlines but rejects name newlines and biography controls", () => {
    expect(
      profileIssues({ displayName: "name", handle: "", bio: "first\nsecond" })
        .bio,
    ).toBeNull();
    expect(
      profileIssues({
        displayName: "first\nsecond",
        handle: "",
        bio: "a\u0000b",
      }).displayName,
    ).not.toBeNull();
    expect(
      profileIssues({ displayName: "name", handle: "", bio: "a\u0000b" }).bio,
    ).not.toBeNull();
  });
  it.each([
    "api",
    "settings",
    "login",
    "ab",
    "-author",
    "author-",
    "日本語",
    "a".repeat(64),
  ])("rejects invalid/reserved handle %s", (handle) => {
    expect(
      profileIssues({ ...profileDraft(profile), handle }).handle,
    ).not.toBeNull();
  });
  it("requires confirmation for rename and removal, not normalization or first setup", () => {
    expect(
      needsHandleConfirmation(
        { ...profileDraft(profile), handle: "other-name" },
        profile,
      ),
    ).toBe(true);
    expect(
      needsHandleConfirmation(
        { ...profileDraft(profile), handle: " " },
        profile,
      ),
    ).toBe(true);
    expect(
      needsHandleConfirmation(
        { ...profileDraft(profile), handle: " AUTHOR-A " },
        profile,
      ),
    ).toBe(false);
    expect(
      needsHandleConfirmation(
        { ...profileDraft(profile), handle: "author-a" },
        { ...profile, handle: null },
      ),
    ).toBe(false);
  });
  it("binds the explicit save to both server versions", () => {
    const input = saveProfileInput(
      { displayName: " 入力名 ", handle: " NEXT-NAME ", bio: " 入力\n紹介 " },
      profile,
      true,
    );
    expect(input).toEqual({
      displayName: " 入力名 ",
      handle: "next-name",
      bio: " 入力\n紹介 ",
      nameVersion: 2,
      profileVersion: 5,
      confirmHandleChange: true,
    });
  });
  it("preserves unsaved text across refresh and separate icon success", () => {
    const draft = { displayName: "未保存", handle: "next-name", bio: "編集中" };
    const refreshed = { ...profile, profileVersion: 6, nameVersion: 3 };
    expect(draftAfterProfileResponse(draft, refreshed, "refresh")).toBe(draft);
    expect(draftAfterProfileResponse(draft, refreshed, "icon")).toBe(draft);
    expect(saveProfileInput(draft, refreshed, true).profileVersion).toBe(6);
    expect(saveProfileInput(draft, refreshed, true).nameVersion).toBe(3);
    expect(profileIsDirty(draft, refreshed)).toBe(true);
  });
  it("only replaces draft after explicit save success or first valid initialization", () => {
    const draft = { displayName: "未保存", handle: "next-name", bio: "編集中" };
    expect(draftAfterProfileResponse(draft, profile, "save")).toEqual(
      profileDraft(profile),
    );
    expect(draftAfterProfileResponse(draft, profile, "refresh", false)).toEqual(
      profileDraft(profile),
    );
    expect(profileIsDirty(profileDraft(profile), profile)).toBe(false);
  });
  it("preserves whitespace edits as unsaved until explicit save", () => {
    expect(
      profileIsDirty(
        { ...profileDraft(profile), bio: `${profile.bio} ` },
        profile,
      ),
    ).toBe(true);
  });
});

describe("icon input boundary", () => {
  it.each([
    "image/png",
    "image/jpeg",
    "image/webp",
  ])("accepts %s within the exact 5 MiB limit", (type) => {
    expect(iconInputIssue({ size: 5 * 1024 ** 2, type })).toBeNull();
  });
  it("rejects empty, oversized and unsupported images before callback", () => {
    expect(iconInputIssue({ size: 0, type: "image/png" })).not.toBeNull();
    expect(
      iconInputIssue({ size: 5 * 1024 ** 2 + 1, type: "image/png" }),
    ).not.toBeNull();
    expect(iconInputIssue({ size: 50, type: "image/svg+xml" })).not.toBeNull();
  });
});

describe("workspace reconciliation and safe failures", () => {
  it("keeps the user's selection after explicit refresh, not interpreting it as a save", () => {
    expect(selectionAfterWorkspaceResponse(false, workspace, "refresh")).toBe(
      false,
    );
    expect(selectionAfterWorkspaceResponse(false, workspace, "save")).toBe(
      true,
    );
    expect(
      selectionAfterWorkspaceResponse(false, workspace, "refresh", false),
    ).toBe(true);
  });
  it("does not expose unknown provider errors", () => {
    expect(publicationFailure(new Error("provider internal detail"))).toEqual({
      kind: "unknown",
      message: "応答を確認できませんでした。",
    });
  });
  it("recognizes structural conflict and access errors", () => {
    expect(
      publicationFailure({
        serialized: {
          kind: "conflict",
          code: "OCC",
          message: "再確認してください",
        },
      }).kind,
    ).toBe("conflict");
    expect(
      publicationFailure({
        serialized: {
          kind: "forbidden",
          code: "OWNER",
          message: "権限がありません",
        },
      }).kind,
    ).toBe("access");
  });
  it("keeps safe business messages actionable", () => {
    expect(
      publicationFailure(
        new BusinessRuleError(
          "PROFILE_HANDLE_RESERVED",
          "このハンドルは予約されています。",
        ),
      ),
    ).toEqual({
      kind: "rejected",
      message: "このハンドルは予約されています。",
    });
  });
});

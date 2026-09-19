import type {
  ProfileView,
  WorkspacePublicationView,
} from "@repo/core/application/publication/views";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileEditor, type ProfileEditorProps } from "./ProfileEditor";
import {
  WorkspacePublicationPanel,
  type WorkspacePublicationPanelProps,
} from "./WorkspacePublicationPanel";

const profile: ProfileView = {
  actorId: "actor-a",
  displayName: "描画確認の名前",
  nameVersion: 1,
  handle: "displayed-handle",
  bio: "描画確認の紹介",
  profileVersion: 2,
  url: "/@server-canonical",
  icon: { id: "icon-a", url: "/server-current-icon" },
};
const workspace: WorkspacePublicationView = {
  actorId: "actor-a",
  workspaceId: "workspace-a",
  name: "描画確認の制作室",
  slug: "displayed-slug",
  pagePublic: true,
  settingsVersion: 3,
  publicationVersion: 2,
  canEdit: false,
  url: "/w/server-canonical",
};
const profileProps: ProfileEditorProps = {
  actorId: "actor-a",
  actorEpoch: 2,
  currentActor: () => ({ id: "actor-a", epoch: 2 }),
  initial: profile,
  save: async () => profile,
  refresh: async () => profile,
  checkHandle: async (handle) => ({
    actorId: "actor-a",
    handle,
    available: true,
    candidates: [],
  }),
  uploadIcon: async () => profile,
  removeIcon: async () => profile,
};
const workspaceProps: WorkspacePublicationPanelProps = {
  actorId: "actor-a",
  actorEpoch: 2,
  currentActor: () => ({ id: "actor-a", epoch: 2 }),
  initial: workspace,
  save: async () => workspace,
  refresh: async () => workspace,
};

describe("publication pure initial rendering", () => {
  it("hides the entire old actor profile and workspace during actor mismatch", () => {
    const currentActor = () => ({ id: "actor-b", epoch: 3 });
    expect(
      renderToStaticMarkup(
        <ProfileEditor {...profileProps} currentActor={currentActor} />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <WorkspacePublicationPanel
          {...workspaceProps}
          currentActor={currentActor}
        />,
      ),
    ).toBe("");
  });
  it("hides old actor state after an A→B→A epoch change", () => {
    const currentActor = () => ({ id: "actor-a", epoch: 4 });
    expect(
      renderToStaticMarkup(
        <ProfileEditor {...profileProps} currentActor={currentActor} />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <WorkspacePublicationPanel
          {...workspaceProps}
          currentActor={currentActor}
        />,
      ),
    ).toBe("");
  });
  it("does not seed another actor's loader data into a current actor form", () => {
    const html = renderToStaticMarkup(
      <ProfileEditor
        {...profileProps}
        initial={{ ...profile, actorId: "actor-b" }}
      />,
    );
    expect(html).not.toContain(profile.displayName);
    expect(html).not.toContain(profile.bio);
    expect(html).not.toContain("server-current-icon");
    expect(html).not.toContain("<form");
    expect(html).toContain("現在の設定を確認");
  });
  it("uses only server-provided profile and icon URLs", () => {
    const html = renderToStaticMarkup(<ProfileEditor {...profileProps} />);
    expect(html).toContain('href="/@server-canonical"');
    expect(html).toContain('src="/server-current-icon"');
    expect(html).not.toContain('href="/@displayed-handle"');
  });
  it("does not fabricate a public URL when the profile has none", () => {
    const html = renderToStaticMarkup(
      <ProfileEditor
        {...profileProps}
        initial={{ ...profile, url: null, icon: null }}
      />,
    );
    expect(html).not.toContain("公開ページを見る");
    expect(html).not.toContain('href="/@');
  });
  it("renders a readonly workspace without mutation controls", () => {
    const html = renderToStaticMarkup(
      <WorkspacePublicationPanel {...workspaceProps} />,
    );
    expect(html).toContain("読み取り専用");
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain("公開設定を保存");
    expect(html).toContain('href="/w/server-canonical"');
    expect(html).toContain("URLをコピー");
    expect(html).toMatch(/readonly=""/i);
  });
  it("provides mutation controls only for the current workspace owner view", () => {
    const html = renderToStaticMarkup(
      <WorkspacePublicationPanel
        {...workspaceProps}
        initial={{ ...workspace, canEdit: true }}
      />,
    );
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("公開設定を保存");
    expect(html).toContain(
      "ページを非公開にしても、個々の公開ノートやそのURLは変わりません",
    );
  });
  it("escapes stored profile text and retains separate save controls", () => {
    const html = renderToStaticMarkup(
      <ProfileEditor
        {...profileProps}
        initial={{ ...profile, bio: '<script>alert("x")</script>' }}
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("プロフィールを保存");
    expect(html).toContain("アイコンを変更");
    expect(html).toContain("アイコンを削除");
  });
});

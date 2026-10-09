import type {
  HandleAvailability,
  ProfileView,
} from "@repo/core/application/publication/views";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileEditor, type ProfileEditorProps } from "./ProfileEditor";

const read = vi.hoisted(() => ({
  availability: null as HandleAvailability | null,
  checking: false,
  error: null as string | null,
  invalidate: vi.fn(),
  recheck: vi.fn(),
}));
vi.mock("./useHandleAvailability", () => ({
  useHandleAvailability: () => read,
}));
const profile: ProfileView = {
  actorId: "actor-a",
  displayName: "本人",
  nameVersion: 1,
  handle: "taken-name",
  bio: "自己紹介",
  profileVersion: 1,
  url: "/@taken-name",
  icon: null,
};
const props: ProfileEditorProps = {
  actorId: "actor-a",
  actorEpoch: 1,
  currentActor: () => ({ id: "actor-a", epoch: 1 }),
  initial: profile,
  refresh: async () => profile,
  save: async () => profile,
  checkHandle: async (handle) => ({
    actorId: "actor-a",
    handle,
    available: true,
    candidates: [],
  }),
  uploadIcon: async () => profile,
  removeIcon: async () => profile,
};
function editable(html: string) {
  const input = html.match(/<input[^>]*id="[^"]+-handle"[^>]*>/)?.[0];
  const save = html.match(/<button[^>]*>プロフィールを保存<\/button>/)?.[0];
  expect(input).toBeDefined();
  expect(save).toBeDefined();
  expect(input).not.toContain("disabled");
  expect(save).not.toContain("disabled");
  expect(html).toContain('aria-busy="false"');
}
beforeEach(() => {
  read.availability = null;
  read.checking = false;
  read.error = null;
});
describe("profile availability feedback", () => {
  it("keeps input and profile save enabled while the availability read is pending", () => {
    read.checking = true;
    const html = renderToStaticMarkup(<ProfileEditor {...props} />);
    expect(html).toContain("ハンドルの空きを確認しています…");
    editable(html);
  });
  it("renders three alternatives without treating the check as a reservation or mutation", () => {
    read.availability = {
      actorId: "actor-a",
      handle: "taken-name",
      available: false,
      candidates: ["taken-name-2", "taken-name-3", "taken-name-4"],
    };
    const html = renderToStaticMarkup(<ProfileEditor {...props} />);
    expect(html).toContain("使用できません");
    expect(html).toContain("この確認では予約されません");
    expect(html).toContain("候補を入力欄へ入れる（保存は別操作）");
    for (const candidate of read.availability.candidates)
      expect(html).toMatch(new RegExp(`<button[^>]*>${candidate}</button>`));
    editable(html);
  });
  it("shows a failed read independently while retaining input and save", () => {
    read.error = "応答を確認できませんでした。";
    const html = renderToStaticMarkup(<ProfileEditor {...props} />);
    expect(html).toContain(read.error);
    expect(html).toContain('value="taken-name"');
    editable(html);
  });
});

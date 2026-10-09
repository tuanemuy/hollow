import type { SharingView } from "@repo/core/application/sharing/settings";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharingPanel, type SharingPanelProps } from "./SharingPanel";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  valid: true,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const n = f.cursor++;
    if (!(n in f.states)) f.states[n] = initial;
    return [
      f.states[n],
      (value: unknown) => {
        f.states[n] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const n = f.ref++;
    f.refs[n] ??= { current: initial };
    return f.refs[n];
  },
  useEffect: (effect: EffectCallback) => {
    f.effects.push(effect);
  },
  useCallback: (callback: unknown) => callback,
  useId: () => "sharing-unit",
}));
vi.mock("./useSharingOperation", () => ({
  useSharingOperation: () => ({
    busy: false,
    current: () => f.valid,
    run: (action: (valid: () => boolean) => Promise<void>) => {
      if (f.valid) f.tasks.push(action(() => f.valid));
    },
  }),
}));
const view: SharingView = {
  actorId: "owner",
  title: "shared",
  expected: {
    noteId: "note",
    shareVersion: 1,
    noteVersion: 1,
    scope: {
      workspaceId: null,
      ownershipGeneration: 1,
      membershipRevision: 0,
      name: "個人",
      memberCount: 1,
    },
  },
  visibility: "private",
  hasPassword: false,
  hasLink: false,
  publicUrl: null,
  publicPrerequisite: null,
  canEdit: true,
  author: { kind: "unset" },
  ownDisplayName: null,
};
type Props = {
  children?: ReactNode;
  onClick?: () => void;
  value?: string;
  readOnly?: boolean;
};
function nodes(tree: ReactNode, type: string): Props[] {
  if (Array.isArray(tree)) return tree.flatMap((v) => nodes(v, type));
  if (!isValidElement<Props>(tree)) return [];
  return [
    ...(tree.type === type ? [tree.props] : []),
    ...nodes(tree.props.children, type),
  ];
}
function words(tree: ReactNode): string {
  if (Array.isArray(tree)) return tree.map(words).join("");
  if (isValidElement<Props>(tree)) return words(tree.props.children);
  return typeof tree === "string" || typeof tree === "number"
    ? String(tree)
    : "";
}
function page(props: SharingPanelProps) {
  f.cursor = f.ref = 0;
  f.effects = [];
  const wrapper = SharingPanel(props);
  return (wrapper.type as (props: SharingPanelProps) => ReactNode)(
    wrapper.props,
  );
}
function button(tree: ReactNode, label: string) {
  const button = nodes(tree, "button").find((v) => words(v.children) === label);
  if (!button?.onClick) throw Error(`Missing button: ${label}`);
  button.onClick();
}
async function flush() {
  await Promise.all(f.tasks);
  f.tasks = [];
}
type MutableProps = {
  -readonly [K in keyof SharingPanelProps]: SharingPanelProps[K];
};
function props(initial = view): MutableProps {
  return {
    actorId: "owner",
    actorEpoch: 1,
    currentActor: () => ({ id: "owner", epoch: 1 }),
    noteId: "note",
    load: vi.fn(async () => initial),
    change: vi.fn(async () => ({
      ...view,
      visibility: "link" as const,
      hasLink: true,
    })),
    getLink: vi.fn(async () => ({ url: "https://fixture.invalid/s/token" })),
    onChanged: vi.fn(),
    onClose: vi.fn(),
    profileHref: "/settings/profile",
  };
}
async function mount(p: SharingPanelProps) {
  page(p);
  for (const effect of f.effects) effect();
  await flush();
  return page(p);
}
beforeEach(() => {
  vi.unstubAllGlobals();
  f.states = [];
  f.refs = [];
  f.tasks = [];
  f.valid = true;
});
describe("sharing mutation and subsequent link read", () => {
  it("shows confirmed mutation success alongside a later key-read failure without resending", async () => {
    const p = props();
    p.getLink = vi.fn(async () => {
      throw new Error("secret key path");
    });
    let tree: ReactNode = await mount(p);
    expect(p.getLink).not.toHaveBeenCalled();
    button(tree, "限定公開にする");
    tree = page(p);
    button(tree, "変更を確定");
    await flush();
    tree = page(p);
    expect(words(tree)).toContain("共有設定を変更しました。");
    expect(words(tree)).toContain("共有リンクを読み取れませんでした。");
    expect(words(tree)).not.toContain("変更が受け付けられたか不明");
    expect(words(tree)).not.toContain("secret key path");
    expect(p.change).toHaveBeenCalledTimes(1);
    expect(p.onChanged).toHaveBeenCalledTimes(1);
    expect(nodes(tree, "input").some((v) => v.value?.includes("/s/"))).toBe(
      false,
    );
  });
  it("keeps unknown mutation outcome after successful current-view and link recovery", async () => {
    const p = props();
    p.change = vi.fn(async () => {
      throw new Error("unknown response");
    });
    let tree: ReactNode = await mount(p);
    button(tree, "限定公開にする");
    tree = page(p);
    button(tree, "変更を確定");
    await flush();
    p.load = vi.fn(async () => ({
      ...view,
      visibility: "link" as const,
      hasLink: true,
    }));
    tree = page(p);
    button(tree, "現在の設定を確認");
    await flush();
    tree = page(p);
    expect(words(tree)).toContain("変更が受け付けられたか不明");
    expect(words(tree)).toContain("この表示だけでは確認できません");
    expect(
      nodes(tree, "input").some(
        (v) => v.value === "https://fixture.invalid/s/token",
      ),
    ).toBe(true);
    expect(p.change).toHaveBeenCalledTimes(1);
    expect(p.getLink).toHaveBeenCalledTimes(1);
    expect(p.onChanged).not.toHaveBeenCalled();
  });
  it("shows authorized audience and protection to viewers without exposing secret or settings controls", async () => {
    const p = props({
      ...view,
      visibility: "link",
      hasLink: true,
      hasPassword: true,
      canEdit: false,
      expected: {
        ...view.expected,
        scope: {
          ...view.expected.scope,
          workspaceId: "ws",
          name: "制作",
          memberCount: 3,
        },
      },
    });
    const tree = await mount(p);
    expect(words(tree)).toContain("ワークスペース「制作」のメンバー 3 名");
    expect(words(tree)).toContain("パスワードを通過した共有リンク");
    expect(words(tree)).toContain("設定済み（値は表示しません）");
    expect(p.getLink).not.toHaveBeenCalled();
    const controls = nodes(tree, "button").map((v) => words(v.children));
    for (const label of [
      "公開する",
      "非公開にする",
      "限定公開にする",
      "リンクを再発行",
      "共有リンクを表示",
      "パスワードを解除",
    ])
      expect(controls).not.toContain(label);
  });
  it("retains a selectable readonly URL after clipboard denial without another mutation", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => {
          throw Error("denied");
        }),
      },
    });
    const p = props({ ...view, visibility: "link", hasLink: true });
    let tree: ReactNode = await mount(p);
    button(tree, "コピー");
    await flush();
    tree = page(p);
    expect(words(tree)).toContain("下のリンクを選択してコピーしてください");
    expect(nodes(tree, "input")).toContainEqual(
      expect.objectContaining({
        readOnly: true,
        value: "https://fixture.invalid/s/token",
      }),
    );
    expect(p.change).not.toHaveBeenCalled();
    expect(p.getLink).toHaveBeenCalledTimes(1);
  });
  it("never redisplays a stored password and cancelling public/removal confirmations sends no mutation", async () => {
    const p = props({
      ...view,
      visibility: "link",
      hasLink: true,
      hasPassword: true,
    });
    let tree: ReactNode = await mount(p);
    expect(nodes(tree, "input").some((v) => v.value === "")).toBe(true);
    expect(words(tree)).toContain("設定済み（値は表示しません）");
    button(tree, "パスワードを解除");
    tree = page(p);
    expect(words(tree)).toContain("リンクを知る全員がパスワードなしで閲覧");
    button(tree, "取り消す");
    tree = page(p);
    button(tree, "公開する");
    tree = page(p);
    expect(words(tree)).toContain("誰でも閲覧できる");
    expect(words(tree)).toContain(
      "パスワードがある場合は解除し、以前の通過許可を失効",
    );
    button(tree, "取り消す");
    expect(p.change).not.toHaveBeenCalled();
  });
});

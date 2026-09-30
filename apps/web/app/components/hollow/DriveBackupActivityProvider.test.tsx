import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveBackupActivityProvider } from "./DriveBackupActivityProvider";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  cleanups: [] as (() => void)[],
  actor: "actor",
  epoch: 1,
  revision: 0,
  hidden: false,
  listeners: new Map<string, () => void>(),
  read: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = f.cursor++;
    if (!(index in f.states))
      f.states[index] = typeof initial === "function" ? initial() : initial;
    return [
      f.states[index],
      (value: unknown) => {
        f.states[index] =
          typeof value === "function" ? value(f.states[index]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = f.ref++;
    f.refs[index] ??= { current: initial };
    return f.refs[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: EffectCallback) => f.effects.push(effect),
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    state: { location: { href: "/notes" } },
    subscribe: (name: string, listener: () => void) => {
      f.listeners.set(name, listener);
      return () => f.listeners.delete(name);
    },
  }),
}));
vi.mock("./SharingActorProvider", () => ({
  useSharingActor: () => ({
    actor: { id: f.actor, epoch: f.epoch },
    currentActor: () => ({ id: f.actor, epoch: f.epoch }),
  }),
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = f.actor;
    const epoch = f.epoch;
    const revision = ++f.revision;
    return () =>
      f.actor === actor && f.epoch === epoch && f.revision === revision;
  },
}));
vi.mock("@/presentation/driveBackupServerFn", () => ({
  driveBackupActivityFn: f.read,
}));

type Props = {
  children?: ReactNode;
  onClick?: () => void;
  value?: {
    active: number;
    title: string | null;
    watch(id: string): void;
    refresh(): void;
  };
};
function words(tree: ReactNode): string {
  if (Array.isArray(tree)) return tree.map(words).join("");
  if (isValidElement<Props>(tree)) return words(tree.props.children);
  return typeof tree === "string" || typeof tree === "number"
    ? String(tree)
    : "";
}
function nodes(tree: ReactNode, type: string): Props[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!isValidElement<Props>(tree)) return [];
  return [
    ...(tree.type === type ? [tree.props] : []),
    ...nodes(tree.props.children, type),
  ];
}
function page() {
  f.cursor = f.ref = 0;
  f.effects = [];
  return DriveBackupActivityProvider({ children: "notes" });
}
function context() {
  const tree = page();
  if (!isValidElement<Props>(tree) || !tree.props.value)
    throw new Error("BACKUP_ACTIVITY_CONTEXT");
  return tree.props.value;
}
function mount() {
  page();
  f.cleanups = f.effects
    .map((effect) => effect())
    .filter((cleanup): cleanup is () => void => typeof cleanup === "function");
}
function unmount() {
  for (const cleanup of f.cleanups) cleanup();
  f.cleanups = [];
}
async function flush() {
  for (let turn = 0; turn < 30; turn++) await Promise.resolve();
}
const row = (state: "processing" | "succeeded" = "processing") => ({
  id: "parent",
  parentId: "parent",
  generation: 1,
  title: "対象原本",
  active: state === "processing" ? 1 : 0,
  state,
});
const activity = (state: "processing" | "succeeded" = "processing") => ({
  actor: { accountId: "actor", authVersion: 1, browserEpoch: 1 },
  active: state === "processing" ? 1 : 0,
  rows: [row(state)],
  watched: [row(state)],
  watchNext: null,
  next: null,
  receipt: null,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  f.states = [];
  f.refs = [];
  f.effects = [];
  f.cleanups = [];
  f.actor = "actor";
  f.epoch = 1;
  f.revision = 0;
  f.hidden = false;
  f.listeners.clear();
  f.read.mockResolvedValue(activity());
  vi.stubGlobal("window", {
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    addEventListener: (name: string, listener: () => void) =>
      f.listeners.set(name, listener),
    removeEventListener: (name: string) => f.listeners.delete(name),
  });
  vi.stubGlobal("document", {
    get hidden() {
      return f.hidden;
    },
    addEventListener: (name: string, listener: () => void) =>
      f.listeners.set(name, listener),
    removeEventListener: (name: string) => f.listeners.delete(name),
  });
});
afterEach(() => {
  unmount();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Drive activity provider hook contract without DOM or browser", () => {
  it("coalesces repeated resolutions into one queued GET and rejects the obsolete in-flight response", async () => {
    let release!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    mount();
    f.listeners.get("onResolved")?.();
    f.listeners.get("onResolved")?.();
    f.listeners.get("onResolved")?.();
    expect(f.read).toHaveBeenCalledTimes(1);
    release({
      ...activity("succeeded"),
      rows: [{ ...row("succeeded"), title: "古い結果" }],
    });
    await flush();
    expect(f.read).toHaveBeenCalledTimes(2);
    expect(context().active).toBe(1);
    expect(context().title).toBe("対象原本");
    expect(words(page())).not.toContain("古い結果");
    expect(nodes(page(), "aside")).toHaveLength(0);
  });

  it("polls every three visible seconds, stops hidden requests, and resumes with GET", async () => {
    mount();
    await flush();
    await vi.advanceTimersByTimeAsync(2_999);
    expect(f.read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.read).toHaveBeenCalledTimes(2);
    let release!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    context().refresh();
    expect(f.read).toHaveBeenCalledTimes(3);
    f.hidden = true;
    f.listeners.get("visibilitychange")?.();
    release(activity("succeeded"));
    await flush();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(f.read).toHaveBeenCalledTimes(3);
    expect(context().active).toBe(1);
    expect(nodes(page(), "aside")).toHaveLength(0);
    f.hidden = false;
    f.listeners.get("visibilitychange")?.();
    await flush();
    expect(f.read).toHaveBeenCalledTimes(4);
    expect(context().active).toBe(1);
  });

  it("rejects an actor ABA response and clears watches, title, and notifications on signout", async () => {
    let release!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    mount();
    f.actor = "other";
    f.epoch++;
    f.actor = "actor";
    f.epoch++;
    release(activity("succeeded"));
    await flush();
    expect(context().active).toBe(0);
    expect(nodes(page(), "aside")).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(context().active).toBe(1);
    f.listeners.get("hollow:signed-out")?.();
    expect(context().active).toBe(0);
    expect(context().title).toBeNull();
    expect(nodes(page(), "aside")).toHaveLength(0);
    const count = f.read.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.read).toHaveBeenCalledTimes(count);
  });

  it("drops both a late response and queued work after unmount and releases its timer", async () => {
    let release!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    mount();
    context().refresh();
    const before = f.states[0];
    unmount();
    release(activity("succeeded"));
    await flush();
    expect(f.read).toHaveBeenCalledTimes(1);
    expect(f.states[0]).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
    expect(f.listeners.size).toBe(0);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.read).toHaveBeenCalledTimes(1);
  });

  it("shows a parent generation terminal notice once even after dismissal and repeated pages", async () => {
    mount();
    await flush();
    expect(context().active).toBe(1);
    f.read.mockResolvedValue(activity("succeeded"));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(context().active).toBe(0);
    expect(nodes(page(), "aside")).toHaveLength(1);
    expect(words(page())).toContain("Driveへのバックアップが完了しました");
    const close = nodes(page(), "button").find(
      (node) => words(node.children) === "閉じる",
    );
    close?.onClick?.();
    expect(nodes(page(), "aside")).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(nodes(page(), "aside")).toHaveLength(0);
  });

  it("keeps an active parent after GET failure instead of announcing completion", async () => {
    mount();
    await flush();
    f.read.mockRejectedValueOnce(new Error("READ_FAILED"));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(context().active).toBe(1);
    expect(context().title).toBe("対象原本");
    expect(words(page())).toContain("状況を確認できません");
    expect(nodes(page(), "aside")).toHaveLength(0);
    f.read.mockResolvedValue(activity("succeeded"));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(context().active).toBe(0);
    expect(nodes(page(), "aside")).toHaveLength(1);
    expect(words(page())).not.toContain("状況を確認できません");
  });
});

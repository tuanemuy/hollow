import type { AnyRouter } from "@tanstack/react-router";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveBackupHistory } from "./DriveBackupHistory";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  cleanups: [] as (() => void)[],
  actor: "actor",
  epoch: 1,
  revision: 0,
  router: null as AnyRouter | null,
  listeners: new Map<string, () => void>(),
  read: vi.fn(),
  detail: vi.fn(),
  retry: vi.fn(),
  cancel: vi.fn(),
  bootstrap: vi.fn(),
  watch: vi.fn(),
  refresh: vi.fn(),
  confirm: vi.fn(),
  invalidate: vi.fn(),
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
  useTransition: () => [
    false,
    (work: () => Promise<unknown>) => f.tasks.push(work()),
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () =>
    f.router ?? {
      state: { location: { href: "/notes/jobs" } },
      invalidate: f.invalidate,
      subscribe: (name: string, listener: () => void) => {
        f.listeners.set(name, listener);
        return () => f.listeners.delete(name);
      },
    },
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
      actor === f.actor && epoch === f.epoch && revision === f.revision;
  },
}));
vi.mock("@/presentation/driveBackupServerFn", () => ({
  driveBackupActivityFn: f.read,
  driveBackupDetailFn: f.detail,
  retryDriveBackupParentFn: f.retry,
  cancelDriveBackupParentFn: f.cancel,
}));
vi.mock("@/presentation/hollowAuth", () => ({
  bootstrapAuthenticationFn: f.bootstrap,
}));
vi.mock("./DriveBackupActivityProvider", () => ({
  useDriveBackupActivity: () => ({ watch: f.watch, refresh: f.refresh }),
}));
vi.mock("./DriveBackupPanel", () => ({
  driveBackupFailureText: () => "有限失敗",
}));

type Props = { children?: ReactNode; disabled?: boolean; onClick?: () => void };
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
function button(label: string) {
  const result = nodes(page(), "button").find(
    (node) => words(node.children) === label,
  );
  if (!result) throw new Error("BACKUP_HISTORY_BUTTON");
  return result;
}
function page() {
  f.cursor = f.ref = 0;
  f.effects = [];
  return DriveBackupHistory();
}
function mount() {
  page();
  const cleanups = f.effects.map((effect) => effect());
  const unmount = () => {
    for (const cleanup of cleanups)
      if (typeof cleanup === "function") cleanup();
  };
  f.cleanups.push(unmount);
  return unmount;
}
async function settle() {
  for (let turn = 0; turn < 20; turn++) {
    const length = f.tasks.length;
    await Promise.all(f.tasks);
    if (f.tasks.length === length) return;
  }
  throw new Error("BACKUP_HISTORY_TASK_LIMIT");
}
const commandId = "00000000-0000-4000-8000-000000000001";
const parent = () => ({
  id: "parent",
  parentId: "parent",
  generation: 3,
  kind: "bulk",
  title: "固定原本",
  count: 3,
  createdAt: "2026-10-01T00:00:00.000Z",
  active: 0,
  state: "failed",
  cancellationRequested: false,
  retryable: true,
  summary: null,
  counts: { queued: 0, running: 0, succeeded: 1, failed: 1, cancelled: 1 },
});
const activity = (row = parent()) => ({
  actor: { accountId: "actor" },
  rows: [row],
  next: null,
  receipt: null,
});
beforeEach(() => {
  vi.resetAllMocks();
  f.states = [];
  f.refs = [];
  f.effects = [];
  f.tasks = [];
  f.cleanups = [];
  f.actor = "actor";
  f.epoch = 1;
  f.revision = 0;
  f.router = null;
  f.listeners.clear();
  f.read.mockResolvedValue(activity());
  f.bootstrap.mockResolvedValue(undefined);
  f.retry.mockResolvedValue({ receiptId: "receipt" });
  f.cancel.mockResolvedValue(undefined);
  f.invalidate.mockResolvedValue(undefined);
  f.confirm.mockReturnValue(true);
  vi.stubGlobal("crypto", { randomUUID: () => commandId });
  vi.stubGlobal("window", {
    confirm: f.confirm,
    addEventListener: (name: string, callback: () => void) =>
      f.listeners.set(name, callback),
    removeEventListener: (name: string) => f.listeners.delete(name),
  });
});
afterEach(() => {
  for (const cleanup of f.cleanups) cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Drive backup parent history hook contract without DOM", () => {
  it("confirms failed-only retry, preserves its generation, and admits only one in-flight POST", async () => {
    const unmount = mount();
    await settle();
    expect(words(page())).toContain("取消済みは元の操作をやり直してください");
    f.confirm.mockReturnValueOnce(false);
    button("失敗した子だけ再試行").onClick?.();
    expect(f.bootstrap).not.toHaveBeenCalled();
    let release!: (value: unknown) => void;
    f.retry.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const retry = button("失敗した子だけ再試行");
    retry.onClick?.();
    retry.onClick?.();
    await Promise.resolve();
    expect(f.retry).toHaveBeenCalledExactlyOnceWith({
      data: { requestId: "parent", expectedGeneration: 3, commandId },
    });
    expect(f.confirm.mock.calls.at(-1)?.[0]).toContain(
      "成功・取消済みは再送しません",
    );
    release({ receiptId: "receipt" });
    await settle();
    expect(f.watch).toHaveBeenCalledWith("receipt");
    unmount();
  });

  it("cancels only after confirmation and keeps the started-result explanation", async () => {
    f.read.mockResolvedValue(
      activity({
        ...parent(),
        active: 1,
        state: "processing",
        retryable: false,
      }),
    );
    const unmount = mount();
    await settle();
    f.confirm.mockReturnValueOnce(false);
    button("未開始分を取り消す").onClick?.();
    expect(f.cancel).not.toHaveBeenCalled();
    f.read.mockResolvedValue(
      activity({
        ...parent(),
        active: 1,
        state: "processing",
        retryable: false,
        cancellationRequested: true,
      }),
    );
    button("未開始分を取り消す").onClick?.();
    await settle();
    expect(f.cancel).toHaveBeenCalledExactlyOnceWith({
      data: { requestId: "parent", expectedGeneration: 3 },
    });
    expect(f.confirm.mock.calls.at(-1)?.[0]).toContain("開始済みは終了を待ち");
    expect(words(page())).toContain("開始済みの終了を待っています");
    expect(button("未開始分を取り消す").disabled).toBe(true);
    unmount();
  });

  it("looks up an uncertain retry by command with GET and never automatically repeats POST", async () => {
    const unmount = mount();
    await settle();
    f.retry.mockRejectedValueOnce(new Error("ACK_UNKNOWN"));
    button("失敗した子だけ再試行").onClick?.();
    await settle();
    expect(f.read.mock.calls.at(-1)?.[0]).toEqual({ data: { commandId } });
    expect(words(page())).toContain("受付結果はまだ不明");
    expect(button("失敗した子だけ再試行").disabled).toBe(true);
    button("原本バックアップ履歴を再読").onClick?.();
    await settle();
    button("失敗した子だけ再試行").onClick?.();
    await settle();
    expect(f.retry).toHaveBeenCalledTimes(1);
    expect(f.read.mock.calls.at(-1)?.[0].data.commandId).toBe(commandId);
    unmount();
  });

  it("gets the current generation after actual router invalidation expires the mutation ticket", async () => {
    const { createRouter, createRootRoute, createRoute, createMemoryHistory } =
      await vi.importActual<typeof import("@tanstack/react-router")>(
        "@tanstack/react-router",
      );
    const root = createRootRoute();
    const route = createRoute({
      getParentRoute: () => root,
      path: "/notes/jobs",
    });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/notes/jobs"] }),
    });
    await router.load();
    f.router = router;
    const before = vi.fn(() => {
      f.revision++;
    });
    const unsubscribe = router.subscribe("onBeforeNavigate", before);
    f.cleanups.push(unsubscribe);
    const invalidate = router.invalidate.bind(router);
    vi.spyOn(router, "invalidate").mockImplementation(async (...args) => {
      await invalidate(...args);
      router.emit({
        type: "onResolved",
        toLocation: router.state.location,
        fromLocation: router.state.location,
        pathChanged: false,
        hrefChanged: false,
        hashChanged: false,
      });
    });
    const unmount = mount();
    await settle();
    f.read.mockResolvedValue({
      ...activity({
        ...parent(),
        generation: 4,
        active: 1,
        state: "processing",
        title: "現在の親",
      }),
      receipt: { requestId: "parent", receiptId: "receipt", generation: 4 },
    });
    button("失敗した子だけ再試行").onClick?.();
    await settle();
    expect(before).toHaveBeenCalledOnce();
    expect(f.retry).toHaveBeenCalledOnce();
    expect(f.read).toHaveBeenCalledTimes(2);
    expect(words(page())).toContain("現在の親");
    expect(button("未開始分を取り消す").disabled).toBe(false);
    unmount();
    unsubscribe();
  });

  it("rejects foreign and ABA actor responses and clears the current history at signout", async () => {
    f.read.mockResolvedValueOnce({
      ...activity(),
      actor: { accountId: "other" },
    });
    const unmount = mount();
    await settle();
    expect(f.states[0]).toEqual([]);
    let release!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    button("原本バックアップ履歴を再読").onClick?.();
    f.actor = "other";
    f.epoch++;
    f.actor = "actor";
    f.epoch++;
    release(activity());
    await settle();
    expect(f.states[0]).toEqual([]);
    button("原本バックアップ履歴を再読").onClick?.();
    await settle();
    expect(words(page())).toContain("固定原本");
    f.listeners.get("hollow:signed-out")?.();
    expect(f.states[0]).toEqual([]);
    unmount();
  });

  it("ignores child details that settle after unmount", async () => {
    const unmount = mount();
    await settle();
    let release!: (value: unknown) => void;
    f.detail.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    button("子の結果を見る").onClick?.();
    await Promise.resolve();
    unmount();
    release({
      actor: { accountId: "actor" },
      requestId: "parent",
      generation: 3,
      rows: [{ id: "late", title: "遅着秘密" }],
      next: null,
    });
    await settle();
    expect(f.states[2]).toBeNull();
    expect(words(page())).not.toContain("遅着秘密");
  });
});

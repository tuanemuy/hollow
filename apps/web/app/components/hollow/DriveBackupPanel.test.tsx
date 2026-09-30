import type { AnyRouter } from "@tanstack/react-router";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveBackupPanel, driveBackupFailureText } from "./DriveBackupPanel";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  listeners: new Map<string, () => void>(),
  revision: 0,
  actor: "actor",
  pending: false,
  router: null as AnyRouter | null,
  read: vi.fn(),
  request: vi.fn(),
  cancel: vi.fn(),
  invalidate: vi.fn(),
  confirm: vi.fn(),
  start: vi.fn(),
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
  useTransition: () => [f.pending, f.start],
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () =>
    f.router ?? {
      state: { location: { href: "/notes/note" } },
      invalidate: f.invalidate,
      subscribe: (name: string, cb: () => void) => {
        f.listeners.set(name, cb);
        return () => f.listeners.delete(name);
      },
    },
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const revision = ++f.revision;
    const actor = f.actor;
    return () => revision === f.revision && actor === f.actor;
  },
}));
vi.mock("@/presentation/driveBackupServerFn", () => ({
  driveBackupFn: f.read,
  requestDriveBackupFn: f.request,
  cancelDriveBackupFn: f.cancel,
}));
vi.mock("@/presentation/errorDisplay", () => ({
  displayError: () => "有限エラー",
}));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  rel?: string;
  target?: string;
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
function page() {
  f.cursor = f.ref = 0;
  f.effects = [];
  return DriveBackupPanel({ noteId: "note", actorId: "actor" });
}
function button(tree: ReactNode, label: string) {
  const result = nodes(tree, "button").find((v) => words(v.children) === label);
  if (!result) throw Error("BACKUP_BUTTON");
  return result;
}
async function flush() {
  for (let n = 0; n < 30; n++) await Promise.resolve();
}
const view = () => ({
  actor: { accountId: "actor", authVersion: 1, browserEpoch: 1 },
  noteId: "note",
  configured: true,
  hasOriginal: true,
  epoch: 1,
  settingsVersion: 2,
  linked: true,
  folderName: "保存先",
  processing: [],
  receipt: null,
  records: [],
});
function mount() {
  const tree = page();
  const cleanup = f.effects.map((effect) => effect());
  return {
    tree,
    unmount: () => {
      for (const fn of cleanup) if (typeof fn === "function") fn();
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  f.states = [];
  f.refs = [];
  f.effects = [];
  f.tasks = [];
  f.listeners.clear();
  f.router = null;
  f.actor = "actor";
  f.revision = 0;
  f.pending = false;
  f.read.mockResolvedValue(view());
  f.request.mockResolvedValue({ accepted: true });
  f.cancel.mockResolvedValue({ cancelled: true });
  f.invalidate.mockResolvedValue(undefined);
  f.confirm.mockReturnValue(true);
  f.start.mockImplementation((work: () => Promise<unknown>) => {
    f.tasks.push(Promise.resolve(work()));
  });
  vi.stubGlobal("crypto", {
    randomUUID: () => "00000000-0000-4000-8000-000000000001",
  });
  vi.stubGlobal("window", {
    confirm: f.confirm,
    addEventListener: (name: string, cb: () => void) =>
      f.listeners.set(name, cb),
    removeEventListener: (name: string) => f.listeners.delete(name),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("Drive backup component operation contract without layout", () => {
  it("explains original-only before POST and refuses a second in-flight click", async () => {
    const mounted = mount();
    await flush();
    const tree = page();
    expect(
      words(tree).includes("原本だけ") &&
        words(tree).includes("編集したMarkdownは対象外"),
    ).toBe(true);
    let release!: () => void;
    f.request.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    button(tree, "原本をDriveにバックアップ").onClick?.();
    button(tree, "原本をDriveにバックアップ").onClick?.();
    expect(f.request.mock.calls.length).toBe(1);
    release();
    await Promise.all(f.tasks);
    mounted.unmount();
  });
  it("uses a fresh current GET after real router invalidation makes the old ticket stale", async () => {
    const { createRouter, createRootRoute, createRoute, createMemoryHistory } =
      await vi.importActual<typeof import("@tanstack/react-router")>(
        "@tanstack/react-router",
      );
    const root = createRootRoute();
    const route = createRoute({
      getParentRoute: () => root,
      path: "/notes/note",
    });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/notes/note"] }),
    });
    await router.load();
    f.router = router;
    const unsubscribe = router.subscribe("onBeforeNavigate", () => {
      f.revision++;
    });
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
    const mounted = mount();
    await flush();
    f.read.mockResolvedValue({
      ...view(),
      receipt: {
        requestId: "request",
        jobs: [{ id: "job", state: "succeeded" }],
      },
    });
    button(page(), "原本をDriveにバックアップ").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(
      f.request.mock.calls.length === 1 &&
        f.read.mock.calls.length >= 2 &&
        words(page()).includes("バックアップ済み"),
    ).toBe(true);
    unsubscribe();
    mounted.unmount();
  });
  it("keeps an uncertain command for read-only receipt lookup and never auto-reposts", async () => {
    const mounted = mount();
    await flush();
    f.request.mockRejectedValueOnce(new Error("fixture"));
    button(page(), "原本をDriveにバックアップ").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(
      f.states[2] === true &&
        button(page(), "原本をDriveにバックアップ").disabled === true,
    ).toBe(true);
    button(page(), "バックアップ結果を確認").onClick?.();
    await flush();
    expect(f.request.mock.calls.length).toBe(1);
    expect(f.read.mock.calls.at(-1)?.[0].data.commandId !== undefined).toBe(
      true,
    );
    mounted.unmount();
  });
  it("rejects a foreign actor DTO and a response arriving after unmount", async () => {
    f.read.mockResolvedValueOnce({ ...view(), actor: { accountId: "other" } });
    const first = mount();
    await flush();
    expect(
      f.states[0] === null && words(page()).includes("認証状態が変わりました"),
    ).toBe(true);
    first.unmount();
    f.refs = [];
    f.states = [];
    let resolve!: (value: unknown) => void;
    f.read.mockReturnValueOnce(
      new Promise((value) => {
        resolve = value;
      }),
    );
    const second = mount();
    second.unmount();
    resolve(view());
    await flush();
    expect(f.states[0]).toBeNull();
  });
  it("asks before cancellation and retains processing until current GET", async () => {
    f.read.mockResolvedValue({
      ...view(),
      processing: [
        {
          jobId: "job",
          phase: "uploading",
          bytes: 1,
          total: 2,
          owner: "active",
          manualCancellationRequested: false,
        },
      ],
    });
    const mounted = mount();
    await flush();
    f.confirm.mockReturnValueOnce(false);
    button(page(), "バックアップを取り消す").onClick?.();
    expect(f.cancel).not.toHaveBeenCalled();
    f.read.mockResolvedValue({
      ...view(),
      processing: [
        {
          jobId: "job",
          phase: "uploading",
          bytes: 1,
          total: 2,
          owner: "active",
          manualCancellationRequested: true,
        },
      ],
    });
    button(page(), "バックアップを取り消す").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(
      f.cancel.mock.calls.length === 1 && f.confirm.mock.calls.length === 2,
    ).toBe(true);
    expect(
      f.confirm.mock.calls[1]?.[0].includes("開始済みの処理は中断せず"),
    ).toBe(true);
    expect(
      words(page()).includes("開始済みの処理は完了を待って結果を残します"),
    ).toBe(true);
    expect(
      nodes(page(), "button").some(
        (value) => words(value.children) === "バックアップを取り消す",
      ),
    ).toBe(false);
    mounted.unmount();
  });
  it("separates trash, inaccessible, quota and rate explanations", () => {
    expect(
      driveBackupFailureText("DRIVE_BACKUP_FOLDER_TRASHED").includes("復元"),
    ).toBe(true);
    expect(
      driveBackupFailureText("DRIVE_BACKUP_FOLDER_UNAVAILABLE").includes(
        "削除とは断定できない",
      ),
    ).toBe(true);
    expect(
      driveBackupFailureText("DRIVE_BACKUP_QUOTA").includes("空き容量"),
    ).toBe(true);
    expect(
      driveBackupFailureText("DRIVE_BACKUP_RATE_LIMIT").includes("混み合って"),
    ).toBe(true);
  });
});

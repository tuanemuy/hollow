import type { AnyRouter } from "@tanstack/react-router";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveBackupSelection } from "./DriveBackupSelection";
import type { BatchContext } from "./model";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  cleanups: [] as (() => void)[],
  context: {
    actorId: "actor",
    actorEpoch: 1,
    contextKey: "fixed-filter",
    contextEpoch: 1,
  },
  revision: 0,
  router: null as AnyRouter | null,
  listeners: new Map<string, () => void>(),
  preview: vi.fn(),
  request: vi.fn(),
  activity: vi.fn(),
  bootstrap: vi.fn(),
  watch: vi.fn(),
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
      state: { location: { href: "/notes" } },
      invalidate: f.invalidate,
      subscribe: (name: string, listener: () => void) => {
        f.listeners.set(name, listener);
        return () => f.listeners.delete(name);
      },
    },
}));
vi.mock("./BatchSelectionProvider", () => ({
  useBatchSelection: () => ({ currentContext: () => f.context }),
}));
vi.mock("./BatchDialog", () => ({ BatchDialog: "section" }));
vi.mock("@/components/hollow/DriveBackupActivityProvider", () => ({
  useDriveBackupActivity: () => ({ watch: f.watch }),
}));
vi.mock("@/components/hollow/useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actorId = f.context.actorId;
    const actorEpoch = f.context.actorEpoch;
    const revision = ++f.revision;
    return () =>
      f.context.actorId === actorId &&
      f.context.actorEpoch === actorEpoch &&
      f.revision === revision;
  },
}));
vi.mock("@/presentation/driveBackupServerFn", () => ({
  previewDriveBackupFn: f.preview,
  requestDriveBackupBulkFn: f.request,
  driveBackupActivityFn: f.activity,
}));
vi.mock("@/presentation/hollowAuth", () => ({
  bootstrapAuthenticationFn: f.bootstrap,
}));

type Props = { children?: ReactNode; disabled?: boolean; onClick?: () => void };
type ConfirmationProps = {
  context: BatchContext;
  ids: readonly string[];
  workspaceId: string | null;
  close(): void;
};
let confirmation: (() => ReactNode) | null = null;
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
function findConfirmation(tree: ReactNode): (() => ReactNode) | null {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findConfirmation(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<ConfirmationProps & { children?: ReactNode }>(tree))
    return null;
  if (typeof tree.type === "function") {
    const component = tree.type as (props: ConfirmationProps) => ReactNode;
    return () => component(tree.props);
  }
  return findConfirmation(tree.props.children);
}
function page() {
  f.cursor = f.ref = 0;
  f.effects = [];
  if (!confirmation) throw new Error("BACKUP_CONFIRMATION_MISSING");
  return confirmation();
}
function button(label: string) {
  const result = nodes(page(), "button").find(
    (node) => words(node.children) === label,
  );
  if (!result) throw new Error("BACKUP_SELECTION_BUTTON");
  return result;
}
function mount() {
  f.cursor = f.ref = 0;
  f.states = [true];
  confirmation = findConfirmation(
    DriveBackupSelection({
      context: { ...f.context },
      ids: ["note-a", "note-b"],
      workspaceId: null,
      disabled: false,
    }),
  );
  f.states = [];
  f.refs = [];
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
  throw new Error("BACKUP_SELECTION_TASK_LIMIT");
}
const commandId = "00000000-0000-4000-8000-000000000002";
const preview = () => ({
  actor: { accountId: "actor" },
  digest: "fixed-digest",
  folderName: "本人の保存先",
  selected: 2,
  noOriginal: 0,
  denied: 0,
  processing: 0,
  recorded: 1,
  pending: 1,
});
const receipt = () => ({
  actor: { accountId: "actor" },
  receipt: { requestId: "parent", receiptId: "receipt", generation: 1 },
});
beforeEach(() => {
  vi.resetAllMocks();
  f.states = [];
  f.refs = [];
  f.effects = [];
  f.tasks = [];
  f.cleanups = [];
  confirmation = null;
  f.context = {
    actorId: "actor",
    actorEpoch: 1,
    contextKey: "fixed-filter",
    contextEpoch: 1,
  };
  f.revision = 0;
  f.router = null;
  f.listeners.clear();
  f.preview.mockResolvedValue(preview());
  f.request.mockResolvedValue({ requestId: "parent" });
  f.activity.mockResolvedValue(receipt());
  f.bootstrap.mockResolvedValue(undefined);
  f.invalidate.mockResolvedValue(undefined);
  vi.stubGlobal("crypto", { randomUUID: () => commandId });
});
afterEach(() => {
  for (const cleanup of f.cleanups) cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Drive fixed selection hook contract without DOM", () => {
  it("previews the fixed IDs before confirmation and makes exactly one POST with the displayed digest", async () => {
    const unmount = mount();
    await settle();
    expect(f.preview).toHaveBeenCalledExactlyOnceWith({
      data: { noteIds: ["note-a", "note-b"], workspaceId: null },
    });
    expect(f.request).not.toHaveBeenCalled();
    expect(words(page())).toContain("本人の保存先");
    expect(words(page())).toContain("保存済み（送信不要）");
    expect(words(page())).toContain("新しく条件に一致したノートは追加しません");
    let release!: (value: unknown) => void;
    f.request.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const confirm = button("この固定対象をバックアップ");
    confirm.onClick?.();
    confirm.onClick?.();
    await Promise.resolve();
    expect(f.request).toHaveBeenCalledExactlyOnceWith({
      data: {
        noteIds: ["note-a", "note-b"],
        workspaceId: null,
        commandId,
        expectedDigest: "fixed-digest",
      },
    });
    release({ requestId: "parent" });
    await settle();
    expect(f.watch).toHaveBeenCalledWith("parent");
    expect(words(page())).toContain("受け付けました");
    unmount();
  });

  it("does not admit a parent when every selected original is excluded", async () => {
    f.preview.mockResolvedValue({
      ...preview(),
      noOriginal: 1,
      denied: 1,
      recorded: 0,
      pending: 0,
    });
    const unmount = mount();
    await settle();
    const confirm = button("この固定対象をバックアップ");
    expect(confirm.disabled).toBe(true);
    confirm.onClick?.();
    await settle();
    expect(f.bootstrap).not.toHaveBeenCalled();
    expect(f.request).not.toHaveBeenCalled();
    unmount();
  });

  it("retains an unknown command for pure GET lookup and never reposts it", async () => {
    const unmount = mount();
    await settle();
    f.request.mockRejectedValueOnce(new Error("ACK_UNKNOWN"));
    f.activity.mockResolvedValue({
      actor: { accountId: "actor" },
      receipt: null,
    });
    button("この固定対象をバックアップ").onClick?.();
    await settle();
    expect(f.activity).toHaveBeenCalledExactlyOnceWith({ data: { commandId } });
    expect(words(page())).toContain("自動では再送しません");
    expect(button("この固定対象をバックアップ").disabled).toBe(true);
    button("この固定対象をバックアップ").onClick?.();
    button("受付結果を確認").onClick?.();
    await settle();
    expect(f.request).toHaveBeenCalledTimes(1);
    expect(f.preview).toHaveBeenCalledTimes(1);
    f.activity.mockResolvedValue(receipt());
    button("受付結果を確認").onClick?.();
    await settle();
    expect(words(page())).toContain("受け付けました");
    expect(f.request).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("rejects a preview after a filter ABA and refuses confirmation from a dirty context", async () => {
    let release!: (value: unknown) => void;
    f.preview.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const unmount = mount();
    f.context = { ...f.context, contextKey: "other", contextEpoch: 2 };
    f.context = { ...f.context, contextKey: "fixed-filter", contextEpoch: 3 };
    release(preview());
    await settle();
    expect(f.states[0]).toBeNull();
    button("この固定対象をバックアップ").onClick?.();
    button("現在の対象を再確認").onClick?.();
    await settle();
    expect(f.preview).toHaveBeenCalledTimes(1);
    expect(f.request).not.toHaveBeenCalled();
    unmount();
  });

  it("does not POST when actor authority changes while authentication bootstrap is pending", async () => {
    const unmount = mount();
    await settle();
    let release!: () => void;
    f.bootstrap.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    button("この固定対象をバックアップ").onClick?.();
    f.context = { ...f.context, actorId: "other", actorEpoch: 2 };
    release();
    await settle();
    expect(f.request).not.toHaveBeenCalled();
    expect(f.activity).not.toHaveBeenCalled();
    unmount();
  });

  it("rejects confirmation of an already displayed preview after the selection context changes", async () => {
    const unmount = mount();
    await settle();
    const confirm = button("この固定対象をバックアップ");
    expect(confirm.disabled).toBe(false);
    f.context = {
      ...f.context,
      contextKey: "different-workspace",
      contextEpoch: 2,
    };
    confirm.onClick?.();
    await settle();
    expect(f.bootstrap).not.toHaveBeenCalled();
    expect(f.request).not.toHaveBeenCalled();
    unmount();
  });

  it("reconciles a successful admission through actual router invalidation and a fresh receipt GET", async () => {
    const { createRouter, createRootRoute, createRoute, createMemoryHistory } =
      await vi.importActual<typeof import("@tanstack/react-router")>(
        "@tanstack/react-router",
      );
    const root = createRootRoute();
    const route = createRoute({ getParentRoute: () => root, path: "/notes" });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/notes"] }),
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
    button("この固定対象をバックアップ").onClick?.();
    await settle();
    expect(before).toHaveBeenCalledOnce();
    expect(f.request).toHaveBeenCalledOnce();
    expect(f.activity).toHaveBeenCalledExactlyOnceWith({ data: { commandId } });
    expect(f.watch).toHaveBeenCalledWith("receipt");
    expect(words(page())).toContain("受け付けました");
    unmount();
    unsubscribe();
  });
});

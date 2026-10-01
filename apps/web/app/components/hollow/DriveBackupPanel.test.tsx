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
  preview: vi.fn(),
  retarget: vi.fn(),
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
  previewDriveBackupRetargetFn: f.preview,
  retargetDriveBackupFn: f.retarget,
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
function page(props = { noteId: "note", actorId: "actor" }) {
  f.cursor = f.ref = 0;
  f.effects = [];
  return DriveBackupPanel(props);
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
  retry: null,
});
const available = () => ({
  actor: view().actor,
  noteId: "note",
  preview: {
    kind: "available",
    headTargetId: "old-target",
    headVersion: 3,
    targetVersion: 4,
    epoch: 1,
    settingsVersion: 2,
    destinationName: "新保存先",
    expectedDigest: "a".repeat(64),
  },
});
function mount(props = { noteId: "note", actorId: "actor" }) {
  const tree = page(props);
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
  f.preview.mockResolvedValue({
    actor: view().actor,
    noteId: "note",
    preview: { kind: "unavailable", reason: "same-destination" },
  });
  f.retarget.mockResolvedValue({
    requestId: "new-request",
    jobId: "new-job",
    accepted: true,
  });
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
  it("confirms the new destination separately, permits cancellation, and sends one exact retarget command", async () => {
    f.preview.mockResolvedValue(available());
    const mounted = mount();
    await flush();
    const old = button(page(), "新しい保存先にバックアップ");
    f.confirm.mockReturnValueOnce(false);
    old.onClick?.();
    expect(f.retarget).not.toHaveBeenCalled();
    expect(words(page()).includes("有限エラー")).toBe(false);
    let release!: () => void;
    f.retarget.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    old.onClick?.();
    old.onClick?.();
    expect(f.retarget).toHaveBeenCalledExactlyOnceWith({
      data: {
        noteId: "note",
        commandId: "00000000-0000-4000-8000-000000000001",
        expectedEpoch: 1,
        expectedSettingsVersion: 2,
        expectedHeadTargetId: "old-target",
        expectedHeadVersion: 3,
        expectedTargetVersion: 4,
        expectedDigest: "a".repeat(64),
      },
    });
    expect(f.request).not.toHaveBeenCalled();
    expect(f.confirm.mock.calls[1]?.[0]).toContain("新保存先");
    expect(f.confirm.mock.calls[1]?.[0]).toContain("取り込み時の原本");
    expect(f.confirm.mock.calls[1]?.[0]).toContain("新しい受付");
    expect(f.confirm.mock.calls[1]?.[0]).toContain("記録は保持");
    release();
    await Promise.all(f.tasks);
    await flush();
    expect(f.invalidate).toHaveBeenCalledTimes(1);
    expect(f.read.mock.calls.at(-1)?.[0].data.commandId).toBeDefined();
    expect(f.preview).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });
  it("retarget ACK uncertainty uses only receipt GET and cannot reuse an old offer", async () => {
    f.preview.mockResolvedValue(available());
    const mounted = mount();
    await flush();
    const stale = button(page(), "新しい保存先にバックアップ");
    f.retarget.mockRejectedValueOnce(new Error("fixture"));
    stale.onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(words(page())).toContain("受付結果を確認できません");
    stale.onClick?.();
    button(page(), "バックアップ結果を確認").onClick?.();
    await flush();
    expect(f.retarget).toHaveBeenCalledTimes(1);
    expect(f.preview).toHaveBeenCalledTimes(1);
    expect(f.request).not.toHaveBeenCalled();
    expect(f.read.mock.calls.at(-1)?.[0].data.commandId).toBeDefined();
    mounted.unmount();
  });
  it.each([
    { noteId: "other-note" },
    { actor: { ...view().actor, accountId: "other" } },
    { actor: { ...view().actor, authVersion: 2 } },
    { actor: { ...view().actor, browserEpoch: 2 } },
    { preview: { ...available().preview, epoch: 2 } },
    { preview: { ...available().preview, settingsVersion: 3 } },
  ])("rejects a retarget preview from a different current identity or generation: %j", async (patch) => {
    f.preview.mockResolvedValue({ ...available(), ...patch });
    const mounted = mount();
    await flush();
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "新しい保存先にバックアップ",
      ),
    ).toBe(false);
    expect(words(page())).toContain("状態が変わりました");
    expect(words(page())).toContain("保存先：保存先");
    expect(f.retarget).not.toHaveBeenCalled();
    mounted.unmount();
  });
  it("retains the successful panel read if preview fails and never reuses its previous offer", async () => {
    f.preview.mockResolvedValueOnce(available());
    const mounted = mount();
    await flush();
    const stale = button(page(), "新しい保存先にバックアップ");
    f.preview.mockRejectedValueOnce(new Error("fixture"));
    button(page(), "バックアップ結果を確認").onClick?.();
    await flush();
    stale.onClick?.();
    expect(words(page())).toContain("現在のバックアップ結果は保持");
    expect(words(page())).toContain("保存先：保存先");
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "新しい保存先にバックアップ",
      ),
    ).toBe(false);
    expect(f.retarget).not.toHaveBeenCalled();
    mounted.unmount();
  });
  it("queues one read behind a pending preview and refuses late responses after sign-out", async () => {
    let resolve!: (value: unknown) => void;
    f.preview.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const mounted = mount();
    await flush();
    button(page(), "バックアップ結果を確認").onClick?.();
    button(page(), "バックアップ結果を確認").onClick?.();
    expect(f.read).toHaveBeenCalledTimes(1);
    resolve(available());
    await flush();
    expect(f.read).toHaveBeenCalledTimes(2);
    expect(f.preview).toHaveBeenCalledTimes(2);
    f.preview.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    button(page(), "バックアップ結果を確認").onClick?.();
    await flush();
    f.listeners.get("hollow:signed-out")?.();
    resolve(available());
    await flush();
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "新しい保存先にバックアップ",
      ),
    ).toBe(false);
    expect(f.retarget).not.toHaveBeenCalled();
    mounted.unmount();
  });
  it("rejects a confirmation dirtied by authentication change and a preview arriving after unmount", async () => {
    f.preview.mockResolvedValueOnce(available());
    const first = mount();
    await flush();
    f.confirm.mockImplementationOnce(() => {
      f.revision++;
      return true;
    });
    button(page(), "新しい保存先にバックアップ").onClick?.();
    expect(f.retarget).not.toHaveBeenCalled();
    first.unmount();
    f.refs = [];
    f.states = [];
    let resolve!: (value: unknown) => void;
    f.preview.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const second = mount();
    await flush();
    second.unmount();
    resolve(available());
    await flush();
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "新しい保存先にバックアップ",
      ),
    ).toBe(false);
  });
  it("does not preview a new target while an old command receipt has an unknown result", async () => {
    const mounted = mount();
    await flush();
    f.read.mockResolvedValue({
      ...view(),
      receipt: {
        requestId: "old",
        jobs: [
          { id: "old-job", state: "failed", failure: "DRIVE_BACKUP_UNKNOWN" },
        ],
      },
    });
    f.request.mockRejectedValueOnce(new Error("fixture"));
    button(page(), "原本をDriveにバックアップ").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(f.preview).toHaveBeenCalledTimes(1);
    expect(f.retarget).not.toHaveBeenCalled();
    mounted.unmount();
  });
  it("hands a queued read to the current note rather than replaying the old note closure", async () => {
    let resolve!: (value: unknown) => void;
    f.preview.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = mount();
    await flush();
    first.unmount();
    const props = { noteId: "next-note", actorId: "actor" };
    f.read.mockResolvedValue({ ...view(), noteId: props.noteId });
    f.preview.mockResolvedValue({ ...available(), noteId: props.noteId });
    const second = mount(props);
    resolve(available());
    await flush();
    expect(f.read.mock.calls.at(-1)?.[0].data.noteId).toBe("next-note");
    expect(f.preview.mock.calls.at(-1)?.[0].data.noteId).toBe("next-note");
    button(page(props), "新しい保存先にバックアップ").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(f.retarget.mock.calls[0]?.[0].data.noteId).toBe("next-note");
    second.unmount();
  });
  it("reconciles retarget receipt and the new saved record through current GET", async () => {
    f.preview.mockResolvedValueOnce(available());
    const mounted = mount();
    await flush();
    f.read.mockResolvedValue({
      ...view(),
      receipt: {
        requestId: "new-request",
        jobs: [{ id: "new-job", state: "succeeded" }],
      },
      records: [
        {
          id: "record",
          createdAt: "2026-01-01",
          bytes: 1024,
          link: "https://drive.google.com/file/d/synthetic/view",
        },
      ],
    });
    button(page(), "新しい保存先にバックアップ").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(f.retarget).toHaveBeenCalledTimes(1);
    expect(f.read.mock.calls.at(-1)?.[0].data.commandId).toBeDefined();
    expect(words(page())).toContain("バックアップ済み");
    expect(
      nodes(page(), "a").some(
        (link) =>
          words(link.children) === "Driveの原本を開く" &&
          link.target === "_blank" &&
          link.rel === "noopener noreferrer",
      ),
    ).toBe(true);
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "新しい保存先にバックアップ",
      ),
    ).toBe(false);
    mounted.unmount();
  });
  it("requires current retry confirmation and sends its exact locator once, then only GET on unknown", async () => {
    f.read.mockResolvedValue({
      ...view(),
      retry: {
        jobId: "prior-job",
        jobVersion: 3,
        transferId: "prior",
        version: 9,
        cancelled: false,
      },
    });
    const mounted = mount();
    await flush();
    expect(words(page()).includes("同じファイルの受信位置を確認")).toBe(true);
    f.confirm.mockReturnValueOnce(false);
    button(page(), "同じファイルで再試行").onClick?.();
    expect(f.request).not.toHaveBeenCalled();
    f.request.mockRejectedValueOnce(new Error("fixture"));
    const tree = page();
    button(tree, "同じファイルで再試行").onClick?.();
    button(tree, "同じファイルで再試行").onClick?.();
    await Promise.all(f.tasks);
    await flush();
    expect(f.request).toHaveBeenCalledTimes(1);
    expect(f.request.mock.calls[0]?.[0].data).toMatchObject({
      kind: "retry",
      priorJobId: "prior-job",
      priorJobVersion: 3,
    });
    expect(button(page(), "同じファイルで再試行").disabled).toBe(true);
    button(page(), "バックアップ結果を確認").onClick?.();
    await flush();
    expect(f.request).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });
  it("does not offer retry from foreign or unmounted GET responses", async () => {
    f.read.mockResolvedValue({
      ...view(),
      actor: { accountId: "other" },
      retry: {
        jobId: "prior-job",
        jobVersion: 2,
        transferId: "prior",
        version: 1,
        cancelled: true,
      },
    });
    const mounted = mount();
    await flush();
    expect(
      nodes(page(), "button").some(
        (v) => words(v.children) === "同じファイルで再試行",
      ),
    ).toBe(false);
    mounted.unmount();
    expect(f.request).not.toHaveBeenCalled();
  });
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

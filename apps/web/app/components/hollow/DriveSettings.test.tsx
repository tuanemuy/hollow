import type { DriveReceiptLookup } from "@repo/core/application/integration/drive/read";
import type { AnyRouter } from "@tanstack/react-router";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveSettings } from "./DriveSettings";

const fixture = vi.hoisted(() => ({
  states: [] as unknown[],
  setters: Array.from({ length: 6 }, () => vi.fn()),
  refs: [] as { current: unknown }[],
  cursor: 0,
  refCursor: 0,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  actor: "one",
  revision: 0,
  router: null as AnyRouter | null,
  pending: false,
  start: vi.fn(),
  read: vi.fn(),
  receipt: vi.fn(),
  bootstrap: vi.fn(),
  begin: vi.fn(),
  create: vi.fn(),
  unlink: vi.fn(),
  auto: vi.fn(),
  invalidate: vi.fn(),
  picker: vi.fn(),
  open: vi.fn(),
  dispose: vi.fn(),
  confirm: vi.fn(),
  assign: vi.fn(),
  listeners: new Map<string, () => void>(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () => {
    const i = fixture.cursor++;
    return [fixture.states[i], fixture.setters[i]];
  },
  useRef: (initial: unknown) => {
    const i = fixture.refCursor++;
    fixture.refs[i] ??= { current: initial };
    return fixture.refs[i];
  },
  useEffect: (effect: EffectCallback) => fixture.effects.push(effect),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () =>
    fixture.router ?? {
      invalidate: fixture.invalidate,
      state: { location: { href: "/settings/drive" } },
      subscribe: (name: string, listener: () => void) => {
        fixture.listeners.set(name, listener);
        return () => fixture.listeners.delete(name);
      },
    },
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = fixture.actor;
    const revision = ++fixture.revision;
    return () => fixture.actor === actor && revision === fixture.revision;
  },
}));
vi.mock("@/presentation/hollowAuth", () => ({
  bootstrapAuthenticationFn: fixture.bootstrap,
}));
vi.mock("@/presentation/driveServerFn", () => ({
  driveSettingsFn: fixture.read,
  driveReceiptFn: fixture.receipt,
  beginDriveFn: fixture.begin,
  createDriveFolderFn: fixture.create,
  unlinkDriveFn: fixture.unlink,
  setDriveAutoBackupFn: fixture.auto,
}));
vi.mock("./DrivePicker", () => ({
  createDrivePickerController: fixture.picker,
}));
vi.mock("./DriveResult", () => ({ DriveReceiptPanel: "drive-receipt" }));

type Props = {
  children?: ReactNode;
  disabled?: boolean;
  type?: string;
  checked?: boolean;
  onClick?: () => void;
  onChange?: (event: { currentTarget: { checked: boolean } }) => void;
  style?: { minWidth?: number; overflowWrap?: string };
  onRun?: (work: () => Promise<unknown>) => void;
  receipt?: { id: string };
};
function nodes(node: ReactNode, type: string): Props[] {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
  if (!isValidElement<Props>(node)) return [];
  return [
    ...(node.type === type ? [node.props] : []),
    ...nodes(node.props.children, type),
  ];
}
function words(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(words).join("");
  if (isValidElement<Props>(node)) return words(node.props.children);
  return typeof node === "string" || typeof node === "number"
    ? String(node)
    : "";
}
function page(initialLookup: DriveReceiptLookup | null = null) {
  fixture.cursor = fixture.refCursor = 0;
  fixture.effects = [];
  return DriveSettings({ initialLookup });
}
function button(tree: ReactNode, label: string) {
  const result = nodes(tree, "button").find(
    (node) => words(node.children) === label,
  );
  if (!result) throw Error("DRIVE_TEST_BUTTON");
  return result;
}
async function settle() {
  let count = 0;
  do {
    count = fixture.tasks.length;
    await Promise.all(fixture.tasks);
  } while (fixture.tasks.length !== count);
}
async function realRouter() {
  const { createRouter, createRootRoute, createRoute, createMemoryHistory } =
    await vi.importActual<typeof import("@tanstack/react-router")>(
      "@tanstack/react-router",
    );
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/settings/drive",
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/settings/drive"] }),
  });
  await router.load();
  fixture.router = router;
  const before = vi.fn(() => {
    fixture.revision++;
  });
  const unsubscribe = router.subscribe("onBeforeNavigate", before);
  const resolved = () =>
    router.emit({
      type: "onResolved",
      toLocation: router.state.location,
      fromLocation: router.state.location,
      pathChanged: false,
      hrefChanged: false,
      hashChanged: false,
    });
  const invalidate = router.invalidate.bind(router);
  vi.spyOn(router, "invalidate").mockImplementation(async (...args) => {
    await invalidate(...args);
    resolved();
  });
  return { router, before, resolved, unsubscribe };
}
const commandId = "00000000-0000-4000-8000-000000000011";
const settings = {
  actor: {
    accountId: "00000000-0000-4000-8000-000000000001",
    authVersion: 1,
    browserEpoch: 1,
  },
  configured: true,
  backupConfigured: true,
  state: "linked",
  epoch: 1,
  settingsVersion: 2,
  autoBackup: false,
  account: { email: null, connectedAt: "2026-09-29T00:00:00.000Z" },
  lastUsedAt: null,
  folder: null,
  live: [],
  confirmation: { version: 1, expectedEpoch: 1, sequence: 0, ids: [] },
};
beforeEach(() => {
  vi.resetAllMocks();
  fixture.cursor = fixture.refCursor = 0;
  fixture.refs = [];
  fixture.effects = [];
  fixture.tasks = [];
  fixture.actor = "one";
  fixture.revision = 0;
  fixture.router = null;
  fixture.pending = false;
  fixture.listeners.clear();
  fixture.states = [settings, null, false, false, ""];
  fixture.setters.forEach((set, index) => {
    set.mockImplementation((value: unknown) => {
      fixture.states[index] = value;
    });
  });
  fixture.start.mockImplementation((work: () => unknown) => {
    fixture.tasks.push(Promise.resolve(work()));
  });
  fixture.read.mockResolvedValue(settings);
  fixture.receipt.mockResolvedValue(null);
  fixture.bootstrap.mockResolvedValue(undefined);
  fixture.invalidate.mockResolvedValue(undefined);
  fixture.open.mockResolvedValue(undefined);
  fixture.picker.mockReturnValue({
    open: fixture.open,
    dispose: fixture.dispose,
  });
  fixture.confirm.mockReturnValue(true);
  vi.stubGlobal("crypto", { randomUUID: () => commandId });
  vi.stubGlobal("window", {
    confirm: fixture.confirm,
    location: { assign: fixture.assign },
    addEventListener: (name: string, listener: () => void) =>
      fixture.listeners.set(name, listener),
    removeEventListener: (name: string) => fixture.listeners.delete(name),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Drive settings structural and event contract, without DOM layout", () => {
  it("auto ON requires a folder, reports future-only semantics and reconciles through a fresh current GET", async () => {
    expect(button(page(), "自動バックアップをONにする").disabled).toBe(true);
    const before = {
      ...settings,
      folder: {
        id: "folder",
        name: "保存先",
        checkedAt: "2026-09-29T00:00:00Z",
      },
    };
    fixture.states[0] = before;
    fixture.read.mockResolvedValue(before);
    const navigation = await realRouter();
    page();
    const cleanups = fixture.effects.map((effect) => effect());
    await settle();
    expect(words(page())).toContain("過去の原本は自動送信しません");
    fixture.auto.mockResolvedValue({ changed: true });
    fixture.read.mockResolvedValue({
      ...before,
      autoBackup: true,
      settingsVersion: 3,
    });
    const toggle = button(page(), "自動バックアップをONにする");
    toggle.onClick?.();
    toggle.onClick?.();
    await settle();
    expect(fixture.auto).toHaveBeenCalledExactlyOnceWith({
      data: { expectedEpoch: 1, expectedSettingsVersion: 2, enabled: true },
    });
    expect(button(page(), "自動バックアップをOFFにする").disabled).toBe(false);
    expect(navigation.before).toHaveBeenCalled();
    for (const cleanup of cleanups)
      if (typeof cleanup === "function") cleanup();
    navigation.unsubscribe();
  });
  it("auto setting rejects a late actor after bootstrap without sending the POST", async () => {
    fixture.states[0] = {
      ...settings,
      folder: { id: "folder", name: "保存先" },
    };
    let release!: () => void;
    fixture.bootstrap.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    button(page(), "自動バックアップをONにする").onClick?.();
    fixture.actor = "two";
    release();
    await settle();
    expect(fixture.auto).not.toHaveBeenCalled();
  });
  it("reconciles local unlink through real same-href router invalidation and a resolved event", async () => {
    const navigation = await realRouter();
    fixture.states[0] = { ...settings, configured: false };
    fixture.read.mockResolvedValue({ ...settings, configured: false });
    page();
    const cleanups = fixture.effects.map((effect) => effect());
    await settle();
    fixture.states[2] = fixture.states[3] = true;
    fixture.read.mockResolvedValue({
      ...settings,
      configured: false,
      state: "unlinked",
      account: null,
    });
    fixture.receipt.mockResolvedValue({ id: commandId, phase: "completed" });
    button(page(), "Google Drive連携を解除").onClick?.();
    await settle();
    expect(navigation.before).toHaveBeenCalledOnce();
    expect(fixture.unlink).toHaveBeenCalledOnce();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    expect(words(page())).toContain("未連携");
    expect(words(page())).not.toContain("Google Drive連携を解除");
    expect(fixture.receipt).toHaveBeenCalledWith({
      data: { by: "command", kind: "control", commandId },
    });
    expect(nodes(page(), "input").map((node) => node.checked)).toEqual([
      true,
      true,
    ]);
    for (const cleanup of cleanups)
      if (typeof cleanup === "function") cleanup();
    navigation.unsubscribe();
  });
  it("coalesces resolved reads and rejects replaced tickets and queued work after unmount", async () => {
    const navigation = await realRouter();
    page();
    const cleanups = fixture.effects.map((effect) => effect());
    await settle();
    let finish: (value: unknown) => void = () => {};
    fixture.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    navigation.resolved();
    navigation.resolved();
    navigation.resolved();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    fixture.setters[0]?.mockClear();
    finish({ ...settings, state: "needs-relink" });
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(3);
    expect(fixture.setters[0]).toHaveBeenCalledExactlyOnceWith(settings);
    fixture.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    navigation.resolved();
    navigation.resolved();
    for (const cleanup of cleanups)
      if (typeof cleanup === "function") cleanup();
    fixture.setters[0]?.mockClear();
    finish(settings);
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(4);
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    navigation.resolved();
    expect(fixture.read).toHaveBeenCalledTimes(4);
    navigation.unsubscribe();
  });
  it("rejects an A to B to A read and stops resolved reads on another route", async () => {
    const navigation = await realRouter();
    page();
    const cleanups = fixture.effects.map((effect) => effect());
    await settle();
    let finish: (value: unknown) => void = () => {};
    fixture.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await navigation.router.invalidate();
    fixture.actor = "two";
    await navigation.router.invalidate();
    fixture.actor = "one";
    await navigation.router.invalidate();
    fixture.setters[0]?.mockClear();
    finish({ ...settings, settingsVersion: 999 });
    await settle();
    expect(fixture.setters[0]).toHaveBeenCalledExactlyOnceWith(settings);
    expect(fixture.read).toHaveBeenCalledTimes(3);
    navigation.router.history.push("/elsewhere");
    await navigation.router.load();
    navigation.resolved();
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(3);
    for (const cleanup of cleanups)
      if (typeof cleanup === "function") cleanup();
    navigation.unsubscribe();
  });
  it("disables unconfigured controls while preserving real account dates and backup OFF", () => {
    fixture.states[0] = { ...settings, configured: false };
    const tree = page();
    expect(nodes(tree, "fieldset").every((node) => node.disabled)).toBe(true);
    expect(words(tree)).toContain(
      "この環境ではGoogle Drive連携を利用できません",
    );
    expect(words(tree)).toContain(settings.account.connectedAt);
    expect(words(tree)).toContain("自動バックアップOFF");
    expect(words(tree)).not.toContain("アカウント名不明");
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it("places disclosure before full document navigation without a Settings Picker POST", async () => {
    const tree = page();
    const text = words(tree);
    expect(text.indexOf("以前許可した権限を含む場合があります")).toBeLessThan(
      text.indexOf("説明を確認して保存先を選ぶ"),
    );
    expect(text).toContain(
      "画面を閉じてもGoogle側で直ちに失効するとは限りません",
    );
    expect(fixture.picker).not.toHaveBeenCalled();
    const cleanup = fixture.effects[0]?.();
    await settle();
    button(tree, "説明を確認して保存先を選ぶ").onClick?.();
    await settle();
    expect(fixture.assign).toHaveBeenCalledExactlyOnceWith(
      "/integrations/drive/picker",
    );
    expect(fixture.open).not.toHaveBeenCalled();
    expect(fixture.picker).not.toHaveBeenCalled();
    fixture.listeners.get("hollow:signed-out")?.();
    expect(fixture.dispose).not.toHaveBeenCalled();
    if (typeof cleanup === "function") cleanup();
    expect(fixture.listeners.size).toBe(0);
  });
  it("retains local dirty choices across a pure settings reread", async () => {
    const tree = page();
    const inputs = nodes(tree, "input");
    inputs[0]?.onChange?.({ currentTarget: { checked: true } });
    inputs[1]?.onChange?.({ currentTarget: { checked: true } });
    fixture.setters[2]?.mockClear();
    fixture.setters[3]?.mockClear();
    button(page(), "連携状態を再読").onClick?.();
    await settle();
    expect(fixture.read).toHaveBeenCalledOnce();
    expect(fixture.setters[2]).not.toHaveBeenCalled();
    expect(fixture.setters[3]).not.toHaveBeenCalled();
    expect(nodes(page(), "input").map((node) => node.checked)).toEqual([
      true,
      true,
    ]);
    expect(fixture.begin).not.toHaveBeenCalled();
  });
  it("does not adopt an initial settings response after the actor changes", async () => {
    fixture.read.mockImplementationOnce(async () => {
      fixture.actor = "two";
      return settings;
    });
    page();
    const cleanup = fixture.effects[0]?.();
    await settle();
    expect(fixture.read).toHaveBeenCalledOnce();
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    expect(fixture.receipt).not.toHaveBeenCalled();
    if (typeof cleanup === "function") cleanup();
  });
  it("keeps an unknown create acknowledgement on the same command and only rereads on request", async () => {
    fixture.create.mockRejectedValueOnce(Error("synthetic"));
    button(page(), "新しい保存先を作成").onClick?.();
    await settle();
    expect(fixture.create).toHaveBeenCalledOnce();
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.states[4]).toBe(
      "結果を確認できません。結果を照会してください。自動では再送しません。",
    );
    button(page(), "連携状態を再読").onClick?.();
    await settle();
    expect(fixture.receipt).toHaveBeenCalledWith({
      data: { by: "command", kind: "control", commandId },
    });
    expect(fixture.create).toHaveBeenCalledOnce();
  });
  it("uses native disabled controls and wrapping structure without claiming a 390px layout result", async () => {
    const live = [{ kind: "control", id: commandId, commandId }];
    fixture.states[0] = { ...settings, live };
    button(page(), "保存先・解除の処理 1 を確認").onClick?.();
    await settle();
    expect(fixture.receipt).toHaveBeenCalledWith({
      data: { by: "id", kind: "control", id: commandId },
    });
    fixture.pending = true;
    const tree = page();
    expect(nodes(tree, "fieldset").every((node) => node.disabled)).toBe(true);
    expect(button(tree, "連携状態を再読").disabled).toBe(true);
    expect(nodes(tree, "button").every((node) => node.type === "button")).toBe(
      true,
    );
    expect(nodes(tree, "main")[0]?.style).toMatchObject({
      minWidth: 0,
      overflowWrap: "anywhere",
    });
  });
  it("D7 keeps local unlink reachable for unconfigured and needs-relink connections", () => {
    for (const configured of [false, true]) {
      for (const state of ["linked", "needs-relink"]) {
        fixture.states[0] = { ...settings, configured, state };
        const tree = page();
        expect(button(tree, "Google Drive連携を解除").disabled).toBe(false);
        expect(
          nodes(tree, "fieldset").some((fieldset) =>
            words(fieldset.children).includes("Google Drive連携を解除"),
          ),
        ).toBe(false);
        expect(nodes(tree, "fieldset")[0]?.disabled).toBe(!configured);
        expect(nodes(tree, "fieldset")[1]?.disabled).toBe(
          !configured || state !== "linked",
        );
      }
    }
    fixture.states[0] = { ...settings, configured: false, state: "unlinked" };
    expect(words(page())).not.toContain("Google Drive連携を解除");
    expect(fixture.unlink).not.toHaveBeenCalled();
    expect(fixture.begin).not.toHaveBeenCalled();
  });
  it("D8 preserves unlink busy and current guards, confirmation cancellation and ACK-only rereads", async () => {
    const localSettings = {
      ...settings,
      configured: false,
      state: "needs-relink",
      confirmation: { ...settings.confirmation, backupIds: [commandId] },
    };
    fixture.states[0] = localSettings;
    fixture.read.mockResolvedValue(localSettings);
    fixture.states[2] = fixture.states[3] = true;
    fixture.pending = true;
    const pending = button(page(), "Google Drive連携を解除");
    expect(pending.disabled).toBe(true);
    pending.onClick?.();
    fixture.pending = false;
    expect(fixture.confirm).not.toHaveBeenCalled();
    fixture.confirm.mockReturnValueOnce(false);
    button(page(), "Google Drive連携を解除").onClick?.();
    expect(fixture.confirm).toHaveBeenCalledWith(
      "Hollow内のGoogle Drive連携を解除し、バックアップ 1 件を取り消します。GoogleログインとDrive上のファイルは削除しません。処理の終了確認までは所有を保持します。続けますか？",
    );
    expect(fixture.unlink).not.toHaveBeenCalled();
    expect(fixture.read).not.toHaveBeenCalled();
    fixture.unlink.mockRejectedValueOnce(Error("synthetic"));
    const unlink = button(page(), "Google Drive連携を解除");
    unlink.onClick?.();
    unlink.onClick?.();
    await settle();
    expect(fixture.confirm).toHaveBeenCalledTimes(2);
    expect(fixture.unlink).toHaveBeenCalledExactlyOnceWith({
      data: {
        commandId,
        expectedEpoch: 1,
        expectedSettingsVersion: 2,
        confirmation: localSettings.confirmation,
      },
    });
    expect(fixture.states[4]).toBe(
      "結果を確認できません。結果を照会してください。自動では再送しません。",
    );
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.invalidate).not.toHaveBeenCalled();
    button(page(), "連携状態を再読").onClick?.();
    await settle();
    expect(fixture.receipt).toHaveBeenCalledExactlyOnceWith({
      data: { by: "command", kind: "control", commandId },
    });
    expect(nodes(page(), "input").map((node) => node.checked)).toEqual([
      true,
      true,
    ]);
    fixture.setters[0]?.mockClear();
    fixture.setters[1]?.mockClear();
    fixture.read.mockImplementationOnce(async () => {
      fixture.actor = "two";
      return { ...localSettings, state: "unlinked" };
    });
    button(page(), "連携状態を再読").onClick?.();
    await settle();
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    expect(fixture.setters[1]).not.toHaveBeenCalled();
    expect(fixture.receipt).toHaveBeenCalledOnce();
    expect(fixture.unlink).toHaveBeenCalledOnce();
    expect(fixture.begin).not.toHaveBeenCalled();
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it("requires dirty-leave confirmation and keeps both choices when navigation is cancelled", () => {
    fixture.states[2] = fixture.states[3] = true;
    fixture.confirm.mockReturnValueOnce(false);
    button(page(), "説明を確認して保存先を選ぶ").onClick?.();
    expect(fixture.assign).not.toHaveBeenCalled();
    expect(nodes(page(), "input").map((node) => node.checked)).toEqual([
      true,
      true,
    ]);
    button(page(), "説明を確認して保存先を選ぶ").onClick?.();
    expect(fixture.assign).toHaveBeenCalledExactlyOnceWith(
      "/integrations/drive/picker",
    );
    expect(fixture.picker).not.toHaveBeenCalled();
    expect(fixture.begin).not.toHaveBeenCalled();
  });
  it("discards A receipt and old actions when B fails or the actor changes, including late A", async () => {
    const a = { by: "id", kind: "control", id: commandId } as const;
    const b = { ...a, id: "00000000-0000-4000-8000-000000000012" };
    fixture.receipt.mockResolvedValue({ id: a.id, phase: "ready" });
    button(page(a), "連携状態を再読").onClick?.();
    await settle();
    const old = nodes(page(a), "drive-receipt")[0];
    expect(old?.receipt?.id).toBe(a.id);
    fixture.receipt.mockRejectedValueOnce(Error("synthetic"));
    button(page(b), "連携状態を再読").onClick?.();
    await settle();
    expect(nodes(page(b), "drive-receipt")).toHaveLength(0);
    const mutation = vi.fn(async () => {});
    old?.onRun?.(mutation);
    await settle();
    expect(mutation).not.toHaveBeenCalled();
    let resolveA: (value: unknown) => void = () => {};
    fixture.receipt.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA = resolve;
        }),
    );
    button(page(a), "連携状態を再読").onClick?.();
    await Promise.resolve();
    page(b);
    resolveA({ id: a.id, phase: "ready" });
    await settle();
    expect(nodes(page(b), "drive-receipt")).toHaveLength(0);
    fixture.receipt.mockResolvedValue({ id: b.id, phase: "ready" });
    button(page(b), "連携状態を再読").onClick?.();
    await settle();
    const actorReceipt = nodes(page(b), "drive-receipt")[0];
    fixture.actor = "two";
    expect(nodes(page(b), "drive-receipt")).toHaveLength(0);
    actorReceipt?.onRun?.(mutation);
    await settle();
    expect(mutation).not.toHaveBeenCalled();
  });
});

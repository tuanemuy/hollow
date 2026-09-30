import type { AnyRouter } from "@tanstack/react-router";
import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { createDrivePickerController } from "./DrivePicker";
import { DrivePickerPage } from "./DrivePickerPage";

const fixture = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  effects: [] as EffectCallback[],
  cursor: 0,
  refCursor: 0,
  tasks: [] as Promise<unknown>[],
  setters: Array.from({ length: 4 }, () => vi.fn()),
  actor: 1,
  revision: 0,
  router: null as AnyRouter | null,
  pending: false,
  start: vi.fn(),
  read: vi.fn(),
  receipt: vi.fn(),
  user: vi.fn(),
  invalidate: vi.fn(),
  picker: vi.fn(),
  open: vi.fn(),
  dispose: vi.fn(),
  unsubscribe: vi.fn(),
  listeners: new Map<string, (event?: unknown) => void>(),
  pickerInput: null as Parameters<typeof createDrivePickerController>[0] | null,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const i = fixture.cursor++;
    if (!(i in fixture.states)) fixture.states[i] = initial;
    return [fixture.states[i], fixture.setters[i]];
  },
  useRef: (initial: unknown) =>
    (fixture.refs[fixture.refCursor++] ??= { current: initial }),
  useEffect: (effect: EffectCallback) => fixture.effects.push(effect),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () =>
    fixture.router ?? {
      invalidate: fixture.invalidate,
      state: { location: { href: "/integrations/drive/picker" } },
      subscribe: (name: string, fn: () => void) => {
        fixture.listeners.set(name, fn);
        return fixture.unsubscribe;
      },
    },
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = fixture.actor;
    const revision = ++fixture.revision;
    return () => actor === fixture.actor && revision === fixture.revision;
  },
}));
vi.mock("@/presentation/driveServerFn", () => ({
  driveSettingsFn: fixture.read,
  driveReceiptFn: fixture.receipt,
}));
vi.mock("@/presentation/hollowAuth", () => ({ currentUserFn: fixture.user }));
vi.mock("./DrivePicker", () => ({
  createDrivePickerController: fixture.picker,
}));
vi.mock("./DriveResult", () => ({ DriveReceiptPanel: "section" }));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  onRun?: (work: () => Promise<unknown>) => void;
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
const id = "00000000-0000-4000-8000-000000000001";
const commandId = "00000000-0000-4000-8000-000000000002";
const settings = {
  actor: { accountId: id, authVersion: 1, browserEpoch: 1 },
  configured: true,
  state: "linked",
  epoch: 1,
  settingsVersion: 2,
  autoBackup: false,
  account: { email: null, connectedAt: "2026-09-30T00:00:00.000Z" },
  lastUsedAt: null,
  folder: null,
  live: [],
  confirmation: { version: 1, expectedEpoch: 1, sequence: 0, ids: [] },
};
function page(enabled = true) {
  fixture.cursor = fixture.refCursor = 0;
  fixture.effects = [];
  return DrivePickerPage({ enabled, accountId: id });
}
function button(tree: ReactNode, label: string) {
  const found = nodes(tree, "button").find(
    (node) => words(node.children) === label,
  );
  if (!found) throw Error("DRIVE_TEST_BUTTON");
  return found;
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
    path: "/integrations/drive/picker",
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/integrations/drive/picker"],
    }),
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
async function mount() {
  page();
  const cleanup = fixture.effects[0]?.();
  await settle();
  return cleanup;
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.states = [];
  fixture.refs = [];
  fixture.effects = [];
  fixture.tasks = [];
  fixture.listeners.clear();
  fixture.cursor = fixture.refCursor = fixture.revision = 0;
  fixture.actor = 1;
  fixture.router = null;
  fixture.pending = false;
  fixture.pickerInput = null;
  fixture.setters.forEach((set, i) => {
    set.mockImplementation((value: unknown) => {
      fixture.states[i] = value;
    });
  });
  fixture.start.mockImplementation((work: () => unknown) => {
    fixture.tasks.push(Promise.resolve(work()));
  });
  fixture.user.mockResolvedValue({ id });
  fixture.read.mockResolvedValue(settings);
  fixture.receipt.mockResolvedValue(null);
  fixture.invalidate.mockResolvedValue(undefined);
  fixture.picker.mockImplementation(
    (input: Parameters<typeof createDrivePickerController>[0]) => {
      fixture.pickerInput = input;
      return { open: fixture.open, dispose: fixture.dispose };
    },
  );
  fixture.open.mockResolvedValue(undefined);
  vi.stubGlobal("crypto", { randomUUID: () => commandId });
  vi.stubGlobal("window", {
    addEventListener: (name: string, fn: (event?: unknown) => void) =>
      fixture.listeners.set(name, fn),
    removeEventListener: (name: string) => fixture.listeners.delete(name),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("dedicated Picker page lifecycle, without browser layout", () => {
  it("reconciles a receipt mutation after real router invalidation without issuing another Picker", async () => {
    const navigation = await realRouter();
    const cleanup = await mount();
    fixture.open.mockImplementation(async () => {
      fixture.pickerInput?.receipt({ kind: "control", id, commandId });
      fixture.pickerInput?.notice({ kind: "closed" });
    });
    button(page(), "説明を確認してGoogle Pickerを開く").onClick?.();
    await settle();
    fixture.receipt.mockResolvedValue({ id, phase: "ready" });
    button(page(), "結果を確認").onClick?.();
    await settle();
    const action = nodes(page(), "section")[0];
    expect(action).toBeDefined();
    fixture.receipt.mockResolvedValue({ id, phase: "completed" });
    const mutation = vi.fn(async () => {});
    action?.onRun?.(mutation);
    await settle();
    expect(navigation.before).toHaveBeenCalledOnce();
    expect(mutation).toHaveBeenCalledOnce();
    expect(fixture.read).toHaveBeenCalledTimes(3);
    expect(fixture.receipt).toHaveBeenCalledTimes(2);
    expect(nodes(page(), "section")).toHaveLength(1);
    expect(fixture.open).toHaveBeenCalledOnce();
    expect(fixture.pickerInput?.current()).toBe(false);
    if (typeof cleanup === "function") cleanup();
    navigation.unsubscribe();
  });
  it("coalesces real invalidation reads and rejects late or unmounted generations", async () => {
    const navigation = await realRouter();
    const cleanup = await mount();
    let finish: (value: unknown) => void = () => {};
    fixture.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await navigation.router.invalidate();
    await Promise.resolve();
    await navigation.router.invalidate();
    await navigation.router.invalidate();
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
    await navigation.router.invalidate();
    await Promise.resolve();
    await navigation.router.invalidate();
    if (typeof cleanup === "function") cleanup();
    fixture.setters[0]?.mockClear();
    finish(settings);
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(4);
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    navigation.resolved();
    expect(fixture.read).toHaveBeenCalledTimes(4);
    expect(fixture.open).not.toHaveBeenCalled();
    navigation.unsubscribe();
  });
  it("rejects an A to B to A response and foreign settings during resolved rereads", async () => {
    const navigation = await realRouter();
    const cleanup = await mount();
    let finish: (value: unknown) => void = () => {};
    fixture.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await navigation.router.invalidate();
    await Promise.resolve();
    fixture.actor = 2;
    await navigation.router.invalidate();
    fixture.actor = 1;
    await navigation.router.invalidate();
    fixture.setters[0]?.mockClear();
    finish({ ...settings, settingsVersion: 999 });
    await settle();
    expect(fixture.setters[0]).toHaveBeenCalledExactlyOnceWith(settings);
    expect(fixture.read).toHaveBeenCalledTimes(3);
    fixture.read.mockResolvedValueOnce({
      ...settings,
      actor: { ...settings.actor, accountId: commandId },
    });
    await navigation.router.invalidate();
    await settle();
    expect(fixture.states[0]).toBeNull();
    expect(words(page())).toContain("認証状態が変わりました");
    expect(fixture.open).not.toHaveBeenCalled();
    if (typeof cleanup === "function") cleanup();
    navigation.unsubscribe();
  });
  it("does not read or issue on an unavailable document and discloses scope before explicit issue", async () => {
    const tree = page(false);
    const cleanup = fixture.effects[0]?.();
    await settle();
    expect(words(tree)).toContain("この文書では選択画面を利用できません");
    expect(fixture.user).not.toHaveBeenCalled();
    expect(fixture.picker).not.toHaveBeenCalled();
    if (typeof cleanup === "function") cleanup();
    await mount();
    const text = words(page());
    expect(text.indexOf("以前許可した権限を含む場合があります")).toBeLessThan(
      text.indexOf("説明を確認してGoogle Pickerを開く"),
    );
    expect(text).toContain("5分への短縮や権限の縮小を保証しません");
    expect(fixture.read).toHaveBeenCalledOnce();
    expect(fixture.open).not.toHaveBeenCalled();
    fixture.read.mockResolvedValueOnce({ ...settings, configured: false });
    button(page(), "結果を確認").onClick?.();
    await settle();
    expect(words(page())).not.toContain("説明を確認してGoogle Pickerを開く");
    expect(fixture.picker).not.toHaveBeenCalled();
  });
  it("issues once on an explicit action and rejects repeated starts while the controller owns the selection", async () => {
    await mount();
    const open = button(page(), "説明を確認してGoogle Pickerを開く");
    open.onClick?.();
    open.onClick?.();
    await settle();
    expect(fixture.open).toHaveBeenCalledExactlyOnceWith({
      commandId,
      expectedEpoch: 1,
      expectedSettingsVersion: 2,
    });
    fixture.pickerInput?.notice({
      kind: "open",
      pickerExpiresAt: "synthetic-ticket-deadline",
      accessExpiresAt: "synthetic-provider-deadline",
    });
    expect(button(page(), "説明を確認してGoogle Pickerを開く").disabled).toBe(
      true,
    );
    expect(words(page())).toContain("二つの期限は異なります");
    button(page(), "結果を確認").onClick?.();
    await settle();
    expect(fixture.read).toHaveBeenCalledOnce();
    button(page(), "選択画面を閉じる").onClick?.();
    expect(fixture.dispose).toHaveBeenCalledOnce();
  });
  it("rejects a settings actor different from the document actor on initial read and BFCache return", async () => {
    const otherSettings = {
      ...settings,
      actor: { ...settings.actor, accountId: commandId },
    };
    fixture.read.mockResolvedValueOnce(otherSettings);
    await mount();
    expect(fixture.actor).toBe(1);
    expect(fixture.user).toHaveBeenCalledOnce();
    expect(fixture.states[0]).toBeNull();
    expect(words(page())).toContain("認証状態が変わりました");
    expect(words(page())).not.toContain("説明を確認してGoogle Pickerを開く");
    expect(fixture.picker).not.toHaveBeenCalled();
    expect(fixture.open).not.toHaveBeenCalled();
    expect(fixture.receipt).not.toHaveBeenCalled();

    button(page(), "結果を確認").onClick?.();
    await settle();
    const staleOpen = button(page(), "説明を確認してGoogle Pickerを開く");
    staleOpen.onClick?.();
    await settle();
    const old = fixture.pickerInput;
    fixture.listeners.get("pagehide")?.();
    fixture.read.mockResolvedValueOnce(otherSettings);
    fixture.listeners.get("pageshow")?.({ persisted: true });
    await settle();
    expect(fixture.actor).toBe(1);
    expect(fixture.user).toHaveBeenCalledTimes(3);
    expect(fixture.read).toHaveBeenCalledTimes(3);
    expect(fixture.states[0]).toBeNull();
    expect(words(page())).toContain("認証状態が変わりました");
    expect(words(page())).not.toContain("説明を確認してGoogle Pickerを開く");
    expect(old?.current()).toBe(false);
    old?.receipt({ kind: "control", id, commandId });
    expect(nodes(page(), "section")).toHaveLength(0);
    expect(fixture.receipt).not.toHaveBeenCalled();
    expect(fixture.dispose).toHaveBeenCalledOnce();
    expect(fixture.picker).toHaveBeenCalledOnce();
    expect(fixture.open).toHaveBeenCalledOnce();
  });
  it("disposes on pagehide and navigation, refuses late results, and BFCache restores only GET state", async () => {
    const cleanup = await mount();
    button(page(), "説明を確認してGoogle Pickerを開く").onClick?.();
    await settle();
    const old = fixture.pickerInput;
    fixture.listeners.get("pagehide")?.();
    expect(fixture.dispose).toHaveBeenCalledOnce();
    expect(old?.current()).toBe(false);
    old?.receipt({ kind: "control", id, commandId });
    old?.notice({
      kind: "open",
      pickerExpiresAt: "old",
      accessExpiresAt: "old",
    });
    expect(words(page())).not.toContain("old");
    fixture.listeners.get("pageshow")?.({ persisted: true });
    await settle();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    expect(fixture.open).toHaveBeenCalledOnce();
    button(page(), "説明を確認してGoogle Pickerを開く").onClick?.();
    await settle();
    fixture.listeners.get("onBeforeNavigate")?.();
    expect(fixture.dispose).toHaveBeenCalledTimes(2);
    expect(fixture.pickerInput?.current()).toBe(false);
    if (typeof cleanup === "function") cleanup();
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(2);
  });
  it("keeps an unknown command for pure GET and return navigation and rejects stale-actor receipt actions", async () => {
    await mount();
    fixture.open.mockImplementation(async () => {
      fixture.pickerInput?.notice({ kind: "unknown" });
    });
    button(page(), "説明を確認してGoogle Pickerを開く").onClick?.();
    await settle();
    expect(nodes(page(), "a")[0]?.href).toBe(
      `/settings/drive?controlCommand=${commandId}`,
    );
    fixture.receipt.mockResolvedValue({ id, phase: "ready" });
    button(page(), "結果を確認").onClick?.();
    await settle();
    expect(fixture.receipt).toHaveBeenCalledExactlyOnceWith({
      data: { by: "command", kind: "control", commandId },
    });
    expect(fixture.open).toHaveBeenCalledOnce();
    const old = nodes(page(), "section")[0];
    expect(old).toBeDefined();
    fixture.actor = 2;
    const mutation = vi.fn(async () => {});
    old?.onRun?.(mutation);
    await settle();
    expect(mutation).not.toHaveBeenCalled();
    expect(nodes(page(), "section")).toHaveLength(0);
    fixture.listeners.get("hollow:signed-out")?.();
    expect(fixture.pickerInput?.current()).toBe(false);
  });
});

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
  pending: false,
  start: vi.fn(),
  read: vi.fn(),
  receipt: vi.fn(),
  bootstrap: vi.fn(),
  begin: vi.fn(),
  create: vi.fn(),
  unlink: vi.fn(),
  invalidate: vi.fn(),
  picker: vi.fn(),
  open: vi.fn(),
  dispose: vi.fn(),
  confirm: vi.fn(),
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
  useRouter: () => ({ invalidate: fixture.invalidate }),
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = fixture.actor;
    return () => fixture.actor === actor;
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
}));
vi.mock("./DrivePicker", () => ({
  createDrivePickerController: fixture.picker,
}));
vi.mock("./DriveResult", () => ({ DriveReceiptPanel: "section" }));

type Props = {
  children?: ReactNode;
  disabled?: boolean;
  type?: string;
  checked?: boolean;
  onClick?: () => void;
  onChange?: (event: { currentTarget: { checked: boolean } }) => void;
  style?: { minWidth?: number; overflowWrap?: string };
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
function page() {
  fixture.cursor = fixture.refCursor = 0;
  fixture.effects = [];
  return DriveSettings();
}
function button(tree: ReactNode, label: string) {
  const result = nodes(tree, "button").find(
    (node) => words(node.children) === label,
  );
  if (!result) throw Error("DRIVE_TEST_BUTTON");
  return result;
}
async function settle() {
  await Promise.all(fixture.tasks);
}
const commandId = "00000000-0000-4000-8000-000000000011";
const settings = {
  actor: {
    accountId: "00000000-0000-4000-8000-000000000001",
    authVersion: 1,
    browserEpoch: 1,
  },
  configured: true,
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
  fixture.pending = false;
  fixture.listeners.clear();
  fixture.states = [settings, null, false, false, { kind: "closed" }, ""];
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
    location: { assign: vi.fn() },
    addEventListener: (name: string, listener: () => void) =>
      fixture.listeners.set(name, listener),
    removeEventListener: (name: string) => fixture.listeners.delete(name),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Drive settings structural and event contract, without DOM layout", () => {
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
  it("places combined-grant and token-lifetime disclosure before the explicit Picker action", async () => {
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
    expect(fixture.open).toHaveBeenCalledWith({
      commandId,
      expectedEpoch: 1,
      expectedSettingsVersion: 2,
    });
    expect(fixture.open).toHaveBeenCalledOnce();
    fixture.listeners.get("hollow:signed-out")?.();
    expect(fixture.dispose).toHaveBeenCalledOnce();
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
    expect(fixture.states[5]).toBe(
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
});

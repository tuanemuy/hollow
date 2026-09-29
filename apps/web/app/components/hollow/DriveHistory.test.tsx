import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveHistory } from "./DriveHistory";

const fixture = vi.hoisted(() => ({
  states: [] as unknown[],
  setters: [vi.fn(), vi.fn()],
  cursor: 0,
  actor: "one",
  pending: false,
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  read: vi.fn(),
  start: vi.fn(),
  listeners: new Map<string, () => void>(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () => {
    const i = fixture.cursor++;
    return [fixture.states[i], fixture.setters[i]];
  },
  useRef: (value: unknown) => ({ current: value }),
  useEffect: (effect: EffectCallback) => fixture.effects.push(effect),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = fixture.actor;
    return () => fixture.actor === actor;
  },
}));
vi.mock("@/presentation/driveServerFn", () => ({
  driveHistoryFn: fixture.read,
}));
vi.mock("./DriveResult", () => ({
  driveFailureText: () => "処理結果を確認してください。",
}));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  style?: unknown;
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
  fixture.cursor = 0;
  fixture.effects = [];
  return DriveHistory();
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.states = [[], ""];
  fixture.cursor = 0;
  fixture.actor = "one";
  fixture.pending = false;
  fixture.effects = [];
  fixture.tasks = [];
  fixture.listeners.clear();
  fixture.start.mockImplementation((work: () => unknown) => {
    fixture.tasks.push(Promise.resolve(work()));
  });
  fixture.read.mockResolvedValue([]);
  vi.stubGlobal("window", {
    addEventListener: (name: string, listener: () => void) =>
      fixture.listeners.set(name, listener),
    removeEventListener: (name: string) => fixture.listeners.delete(name),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Drive account history structural and event contract", () => {
  it("renders four account-history kinds separately without granting row actions", () => {
    fixture.states[0] = [
      "authorization",
      "folder-select",
      "folder-create",
      "disconnect",
    ].map((kind, index) => ({
      id: `synthetic-${index}`,
      kind,
      phase: index === 0 ? "failed" : "completed",
      createdAt: "2026-09-29T00:00:00.000Z",
      terminalAt: "2026-09-29T00:00:00.000Z",
      failure: index === 0 ? "DRIVE_CANCELLED" : null,
    }));
    const tree = page();
    expect(nodes(tree, "li")).toHaveLength(4);
    expect(words(tree)).toContain("直近90日から最大100件");
    for (const label of ["連携", "保存先選択", "保存先作成", "連携解除"])
      expect(words(tree)).toContain(label);
    expect(nodes(tree, "button").map((node) => words(node.children))).toEqual([
      "Drive履歴を再読",
    ]);
    expect(nodes(tree, "a").map((node) => node.href)).toEqual([
      "/settings/drive",
    ]);
  });
  it("clears account history on sign-out and ignores the former actor's late read", async () => {
    let resolve!: (value: unknown[]) => void;
    fixture.read.mockReturnValueOnce(
      new Promise<unknown[]>((done) => {
        resolve = done;
      }),
    );
    page();
    const cleanups = fixture.effects.map((effect) => effect());
    fixture.actor = "two";
    fixture.listeners.get("hollow:signed-out")?.();
    expect(fixture.setters[0]).toHaveBeenCalledWith([]);
    fixture.setters[0]?.mockClear();
    resolve([{ id: "old-account-record" }]);
    await Promise.all(fixture.tasks);
    expect(fixture.setters[0]).not.toHaveBeenCalled();
    cleanups.forEach((cleanup) => {
      if (typeof cleanup === "function") cleanup();
    });
    expect(fixture.listeners.size).toBe(0);
  });
  it("uses a finite read error and pending native button with wrapping structure", async () => {
    fixture.read.mockRejectedValueOnce(Error("synthetic"));
    const tree = page();
    nodes(tree, "button")[0]?.onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.setters[1]).toHaveBeenCalledWith(
      "Drive履歴を確認できません。",
    );
    fixture.pending = true;
    expect(nodes(page(), "button")[0]?.disabled).toBe(true);
    expect(nodes(tree, "section")[0]?.style).toMatchObject({
      minWidth: 0,
      overflowWrap: "anywhere",
    });
  });
});

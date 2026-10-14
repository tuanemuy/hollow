import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyTrashControl } from "./EmptyTrashControl";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  effects: [] as { effect: EffectCallback; deps: readonly unknown[] }[],
  previous: [] as {
    deps: readonly unknown[];
    cleanup: ReturnType<EffectCallback>;
  }[],
  stateIndex: 0,
  refIndex: 0,
  pending: false,
  current: true,
  work: null as Promise<void> | null,
  discard: vi.fn(),
  read: vi.fn(),
  authenticate: vi.fn(),
  node: { showModal: vi.fn(), close: vi.fn() },
  cancel: { focus: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => f.authenticate,
}));
vi.mock("@/presentation/hollowEmptyTrash", () => ({
  prepareEmptyTrashFn: vi.fn(),
  confirmEmptyTrashFn: vi.fn(),
  discardEmptyTrashFn: f.discard,
  getEmptyTrashFn: f.read,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = f.stateIndex++;
    if (!(index in f.states))
      f.states[index] = typeof initial === "function" ? initial() : initial;
    return [f.states[index], (next: unknown) => (f.states[index] = next)];
  },
  useRef: (initial: unknown) => {
    const index = f.refIndex++;
    f.refs[index] ??= { current: initial };
    return f.refs[index];
  },
  useEffect: (effect: EffectCallback, deps: readonly unknown[]) =>
    f.effects.push({ effect, deps }),
  useId: () => "empty-focus",
  useOptimistic: () => ["", vi.fn()],
  useTransition: () => [
    f.pending,
    (action: () => Promise<void>) => {
      f.pending = true;
      f.work = action();
    },
  ],
}));
class Origin {
  isConnected = true;
  disabled = false;
  focus = vi.fn();
}
let origin: Origin;
const snapshot = {
  id: "00000000-0000-7000-8000-000000000001",
  total: 1,
  expiresAt: "2100-01-01T00:00:00.000Z",
};
function find(
  node: ReactNode,
  match: (props: Record<string, unknown>) => boolean,
) {
  const found: Record<string, unknown>[] = [];
  function visit(child: ReactNode) {
    if (Array.isArray(child)) {
      for (const next of child) visit(next);
    } else if (isValidElement<Record<string, unknown>>(child)) {
      if (match(child.props)) found.push(child.props);
      visit(child.props.children as ReactNode);
    }
  }
  visit(node);
  if (found.length !== 1)
    throw new Error(`Expected one control: ${found.length}`);
  return found[0] as Record<string, unknown>;
}
function render(disabled = false) {
  f.stateIndex = 0;
  f.refIndex = 0;
  f.effects = [];
  const tree = EmptyTrashControl({ onAccepted: vi.fn(), disabled });
  const opener = find(
    tree,
    (props) =>
      !!props.onClick && !!props.ref && props.children !== "確認を取り消す",
  );
  (opener.ref as { current: unknown }).current = origin;
  origin.disabled = opener.disabled === true;
  if (f.states[2]) {
    const dialog = find(
      tree,
      (props) => props.className === "hollow-trash-dialog hollow-dialog",
    );
    (dialog.ref as { current: unknown }).current = f.node;
    const cancel = find(tree, (props) => props.children === "確認を取り消す");
    (cancel.ref as { current: unknown }).current = f.cancel;
  }
  return tree;
}
function commit() {
  f.effects.forEach(({ effect, deps }, index) => {
    const old = f.previous[index];
    if (
      old &&
      deps.length === old.deps.length &&
      deps.every((x, i) => x === old.deps[i])
    )
      return;
    if (typeof old?.cleanup === "function") old.cleanup();
    f.previous[index] = { deps, cleanup: effect() };
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  f.states = [
    { workspaceId: undefined, name: "個人" },
    { kind: "prepared", snapshot },
    true,
  ];
  f.refs = [];
  f.previous = [];
  f.pending = false;
  f.current = true;
  f.work = null;
  origin = new Origin();
  f.authenticate.mockReset().mockImplementation(() => () => f.current);
  f.node.showModal.mockReset();
  f.node.close.mockReset();
  f.cancel.focus.mockReset();
  f.read.mockReset().mockResolvedValue({ kind: "discarded", id: snapshot.id });
  f.discard.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("HTMLElement", Origin);
  vi.stubGlobal("document", { activeElement: origin });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function discard() {
  const tree = render();
  commit();
  expect(origin.focus).not.toHaveBeenCalled();
  const cancel = find(tree, (props) => props.children === "確認を取り消す");
  (cancel.onClick as () => void)();
  render();
  commit();
  expect(origin.disabled).toBe(true);
  expect(origin.focus).not.toHaveBeenCalled();
  await f.work;
  render();
  commit();
  expect(f.node.close).toHaveBeenCalledOnce();
  expect(origin.focus).not.toHaveBeenCalled();
  expect(f.states[2]).toBe(false);
  expect(f.states[1]).toEqual({ kind: "idle" });
}
describe("empty-trash completion focus", () => {
  it("waits for native closure and the discard transition before restoring the origin", async () => {
    await discard();
    f.pending = false;
    render();
    commit();
    expect(origin.disabled).toBe(false);
    expect(origin.focus).toHaveBeenCalledOnce();
    expect(f.discard).toHaveBeenCalledExactlyOnceWith({
      data: { id: snapshot.id },
    });
    expect(f.read).toHaveBeenCalledExactlyOnceWith({
      data: { id: snapshot.id },
    });
    render();
    commit();
    expect(origin.focus).toHaveBeenCalledOnce();
  });
  it.each([
    "context",
    "disconnected",
    "disabled",
  ] as const)("does not restore an unavailable %s origin", async (reason) => {
    await discard();
    if (reason === "context") f.current = false;
    if (reason === "disconnected") origin.isConnected = false;
    f.pending = false;
    render(reason === "disabled");
    commit();
    expect(origin.focus).not.toHaveBeenCalled();
  });
  it("does not take focus from a reopened confirmation", async () => {
    await discard();
    f.pending = false;
    f.states[1] = { kind: "prepared", snapshot };
    f.states[2] = true;
    render();
    commit();
    expect(f.node.showModal).toHaveBeenCalledTimes(2);
    expect(origin.focus).not.toHaveBeenCalled();
  });
});

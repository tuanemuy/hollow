import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SharingDialog } from "./SharingDialog";

const state = vi.hoisted(() => ({
  effect: null as (() => (() => void) | undefined) | null,
  node: {
    showModal: vi.fn(),
    close: vi.fn(),
    focus: vi.fn(),
    querySelectorAll: vi.fn(() => [] as { focus: () => void }[]),
  },
}));
vi.mock("react", async (original) => ({
  ...(await original<object>()),
  useRef: () => ({ current: state.node }),
  useEffect: (effect: () => (() => void) | undefined) => {
    state.effect = effect;
  },
}));
const documentState = { activeElement: null as Element | null };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  documentState.activeElement = null;
  vi.stubGlobal("document", documentState);
});
afterEach(() => vi.unstubAllGlobals());
function mount(current: () => boolean, busy = false) {
  const onClose = vi.fn();
  const element = SharingDialog({
    titleId: "authorized-title",
    children: "Current sharing controls",
    current,
    onClose,
    busy,
  }) as ReactElement<{
    onCancel: (event: { preventDefault: () => void }) => void;
    onKeyDown: (event: {
      key: string;
      shiftKey: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => void;
  }>;
  return { element, onClose, cleanup: state.effect?.() };
}
it("opens a native top-layer dialog only for the current actor ticket and closes its node on unmount", () => {
  const active = mount(() => true);
  expect(active.element.type).toBe("dialog");
  expect(state.node.showModal).toHaveBeenCalledTimes(1);
  expect(state.node.focus).toHaveBeenCalledTimes(1);
  active.cleanup?.();
  expect(state.node.close).toHaveBeenCalledTimes(1);
  vi.clearAllMocks();
  mount(() => false);
  expect(state.node.showModal).not.toHaveBeenCalled();
  expect(state.node.focus).not.toHaveBeenCalled();
});
it("waits for the parent actor lifecycle before entering the top layer", () => {
  let active = false;
  let frame: (() => void) | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    frame = callback;
    return 1;
  });
  const view = mount(() => active);
  expect(state.node.showModal).not.toHaveBeenCalled();
  active = true;
  frame?.();
  expect(state.node.showModal).toHaveBeenCalledTimes(1);
  expect(state.node.focus).toHaveBeenCalledTimes(1);
  view.cleanup?.();
  expect(state.node.close).toHaveBeenCalledTimes(1);
});
describe("native cancellation keeps pending and current-ticket ownership", () => {
  it.each([
    [true, false, 1],
    [true, true, 0],
    [false, false, 0],
  ] as const)("current=%s pending=%s", (current, busy, calls) => {
    const view = mount(() => current, busy);
    const preventDefault = vi.fn();
    view.element.props.onCancel({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(view.onClose).toHaveBeenCalledTimes(calls);
  });
});
it("wraps Tab and Shift+Tab inside the current dialog and leaves cancellation to its owner", () => {
  const first = { focus: vi.fn() };
  const last = { focus: vi.fn() };
  state.node.querySelectorAll.mockReturnValue([first, last]);
  const view = mount(() => true);
  const event = {
    key: "Tab",
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  documentState.activeElement = last as unknown as Element;
  view.element.props.onKeyDown(event);
  expect(first.focus).toHaveBeenCalledTimes(1);
  documentState.activeElement = first as unknown as Element;
  view.element.props.onKeyDown({ ...event, shiftKey: true });
  expect(last.focus).toHaveBeenCalledTimes(1);
  expect(view.onClose).not.toHaveBeenCalled();
});

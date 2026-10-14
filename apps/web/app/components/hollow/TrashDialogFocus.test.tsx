import type { EffectCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteTrashDialog } from "./NoteTrashDialog";
import { PurgeConfirm } from "./PurgeConfirm";

const f = vi.hoisted(() => ({
  effects: [] as EffectCallback[],
  refs: 0,
  order: [] as string[],
  node: { showModal: vi.fn(), close: vi.fn() },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: EffectCallback) => f.effects.push(effect),
  useRef: (initial: unknown) => ({
    current: f.refs++ === 0 ? f.node : initial,
  }),
  useId: () => "trash-heading",
  useState: (initial: unknown) => [initial, vi.fn()],
  useTransition: () => [false, vi.fn()],
}));
class Origin {
  isConnected = true;
  focus = vi.fn(() => f.order.push("focus"));
}
beforeEach(() => {
  f.effects = [];
  f.refs = 0;
  f.order = [];
  f.node.showModal.mockReset();
  f.node.close.mockReset().mockImplementation(() => f.order.push("close"));
  vi.stubGlobal("HTMLElement", Origin);
});
describe("native trash confirmation origin", () => {
  it.each([
    "trash",
    "purge",
  ] as const)("closes %s before restoring a still-connected origin", (kind) => {
    const origin = new Origin();
    vi.stubGlobal("document", { activeElement: origin });
    if (kind === "trash")
      NoteTrashDialog({
        target: { id: "note", title: "保持する本文" },
        pending: false,
        error: "",
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      });
    else
      PurgeConfirm({
        title: "保持する原本",
        pending: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      });
    const cleanup = f.effects[0]?.();
    expect(f.node.showModal).toHaveBeenCalledOnce();
    expect(origin.focus).not.toHaveBeenCalled();
    if (typeof cleanup !== "function") throw Error("Missing native cleanup");
    cleanup();
    expect(f.order).toEqual(["close", "focus"]);
    expect(origin.focus).toHaveBeenCalledOnce();
  });
  it.each([
    "trash",
    "purge",
  ] as const)("does not refocus a disconnected %s origin", (kind) => {
    const origin = new Origin();
    vi.stubGlobal("document", { activeElement: origin });
    if (kind === "trash")
      NoteTrashDialog({
        target: { id: "note", title: "保持する本文" },
        pending: false,
        error: "",
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      });
    else
      PurgeConfirm({
        title: "保持する原本",
        pending: false,
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
      });
    const cleanup = f.effects[0]?.();
    origin.isConnected = false;
    if (typeof cleanup !== "function") throw Error("Missing native cleanup");
    cleanup();
    expect(f.order).toEqual(["close"]);
    expect(origin.focus).not.toHaveBeenCalled();
  });
});

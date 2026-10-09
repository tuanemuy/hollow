import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SharingPanel,
  type SharingPanelProps,
} from "@/components/sharing/SharingPanel";
import { NoteSharingAction } from "./NoteSharingAction";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  cursor: 0,
  ref: 0,
  effects: [] as EffectCallback[],
  actor: { id: "actor", epoch: 1 },
  currentActor: { id: "actor", epoch: 1 },
  invalidate: vi.fn(),
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
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: f.invalidate }),
  useRouterState: () => "/notes/note",
}));
vi.mock("./SharingActorProvider", () => ({
  useSharingActor: () => ({
    actor: f.actor,
    currentActor: () => f.currentActor,
  }),
}));
vi.mock("@/presentation/sharingServerFn", () => ({
  changeSharingFn: vi.fn(),
  getShareLinkFn: vi.fn(),
  getSharingFn: vi.fn(),
}));
type Props = {
  children?: ReactNode;
  onClick?: (event: { currentTarget: HTMLButtonElement }) => void;
  "aria-label"?: string;
};
function elements(tree: ReactNode): React.ReactElement<Props>[] {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!isValidElement<Props>(tree)) return [];
  return [tree, ...elements(tree.props.children)];
}
function page() {
  f.cursor = f.ref = 0;
  f.effects = [];
  return NoteSharingAction({
    noteId: "note",
    actorId: "actor",
    autoOpen: true,
    badge: "限定公開",
  });
}
function panel(tree: ReactNode) {
  return elements(tree)
    .filter((e) => e.type === SharingPanel)
    .map((e) => e.props as SharingPanelProps);
}
function click(tree: ReactNode, badge: boolean, focus = vi.fn()) {
  const trigger = elements(tree).find(
    (e) => e.type === "button" && Boolean(e.props["aria-label"]) === badge,
  );
  if (!trigger?.props.onClick) throw Error("Missing trigger");
  trigger.props.onClick({
    currentTarget: { focus } as unknown as HTMLButtonElement,
  });
  return focus;
}
beforeEach(() => {
  f.states = [];
  f.refs = [];
  f.actor = { id: "actor", epoch: 1 };
  f.currentActor = { ...f.actor };
  f.invalidate.mockReset();
});
describe("detail sharing triggers", () => {
  it("reopens the same sharing=1 note through either trigger with one panel and restores the actual origin focus", () => {
    page();
    for (const effect of f.effects) effect();
    let tree = page();
    expect(panel(tree)).toHaveLength(1);
    panel(tree)[0]?.onClose();
    tree = page();
    expect(panel(tree)).toHaveLength(0);
    const badgeFocus = click(tree, true);
    tree = page();
    expect(panel(tree)).toHaveLength(1);
    panel(tree)[0]?.onClose();
    expect(badgeFocus).toHaveBeenCalledOnce();
    tree = page();
    const mainFocus = click(tree, false);
    tree = page();
    expect(panel(tree)).toHaveLength(1);
    panel(tree)[0]?.onClose();
    expect(mainFocus).toHaveBeenCalledOnce();
    expect(badgeFocus).toHaveBeenCalledOnce();
  });
  it("ignores stale badge events and close/focus after an actor ABA epoch change", () => {
    page();
    for (const effect of f.effects) effect();
    const initial = page();
    const stale = panel(initial)[0];
    if (!stale) throw Error("Missing panel");
    f.currentActor = { id: "actor", epoch: 2 };
    const focus = click(initial, true);
    stale.onClose();
    expect(focus).not.toHaveBeenCalled();
    f.actor = { id: "actor", epoch: 2 };
    expect(panel(page())).toHaveLength(0);
  });
});

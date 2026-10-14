import type { TagReadPage } from "@repo/core/application/tag/ports";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoveDialog } from "@/components/move/MoveDialog";
import { NoteMoveAction } from "@/components/move/NoteMoveAction";
import { TagDialog } from "./TagDialog";
import { TagManager } from "./TagManager";

const f = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  state: 0,
  ref: 0,
  frames: [] as FrameRequestCallback[],
  work: [] as Promise<unknown>[],
  location: "/tags",
  read: vi.fn(),
  destinations: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = f.state++;
    if (!(index in f.states))
      f.states[index] = typeof initial === "function" ? initial() : initial;
    return [
      f.states[index],
      (value: unknown) => {
        f.states[index] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = f.ref++;
    f.refs[index] ??= { current: initial };
    return f.refs[index];
  },
  useEffect: vi.fn(),
  useOptimistic: (initial: unknown) => [initial, vi.fn()],
  useTransition: () => [
    false,
    (work: () => Promise<unknown>) => {
      f.work.push(work());
    },
  ],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: "a",
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: { href: f.location, pathname: f.location, search: {} },
    }),
}));
vi.mock("@/presentation/tagServerFn", () => ({
  readTagsFn: f.read,
  manageTagsFn: vi.fn(),
}));
vi.mock("@/presentation/moveServerFn", () => ({
  listMoveDestinationsFn: f.destinations,
  moveNoteFn: vi.fn(),
  previewNoteMoveFn: vi.fn(),
  readMoveAudienceFn: vi.fn(),
}));
vi.mock("@/presentation/hollowNotes", () => ({ getNoteFn: vi.fn() }));

type Props = {
  children?: ReactNode;
  onClick?: (event: { currentTarget: HTMLButtonElement }) => void;
  onClose?: () => void;
};
function nodes(value: ReactNode): React.ReactElement<Props>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Props>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
const source = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "対象タグ",
  key: "対象タグ",
  normalizationVersion: "unicode16-v1",
  revision: 1,
  total: 1,
  active: 1,
  trashed: 0,
  purging: 0,
};
const page: TagReadPage = {
  kind: "page",
  purpose: "manager",
  scope: { workspaceId: null, name: "個人" },
  items: [source],
  selected: [],
  exact: null,
  unusedTotal: 0,
  nextCursor: null,
  identity: "tag-fixture",
};
const noteId = "00000000-0000-4000-8000-000000000002";
function render(kind: "tag" | "move", canEdit = true) {
  f.state = f.ref = 0;
  return kind === "tag"
    ? TagManager({ page, search: {} })
    : NoteMoveAction({
        noteId,
        version: 1,
        title: "現在の本文",
        scope: { workspaceId: null, name: "個人", canEdit },
        processing: false,
      });
}
function close(tree: ReactNode, kind: "tag" | "move") {
  const dialog = nodes(tree).find(
    (node) => node.type === (kind === "tag" ? TagDialog : MoveDialog),
  );
  if (!dialog?.props.onClose) throw Error("Missing owner confirmation");
  dialog.props.onClose();
}
function flush() {
  for (const frame of f.frames.splice(0)) frame(0);
}
beforeEach(() => {
  f.states = [];
  f.refs = [];
  f.frames = [];
  f.work = [];
  f.read.mockReset();
  f.destinations.mockReset();
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    f.frames.push(frame);
    return f.frames.length;
  });
});
describe("asynchronous dialog origin ownership", () => {
  it.each([
    "tag",
    "move",
  ] as const)("retains the %s trigger through its disabled read, then restores it after closure", async (kind) => {
    f.location = kind === "tag" ? "/tags" : `/notes/${noteId}`;
    let resolve: (value: unknown) => void = () => {};
    const deferred = new Promise<unknown>((done) => {
      resolve = done;
    });
    (kind === "tag" ? f.read : f.destinations).mockReturnValue(deferred);
    let tree = render(kind);
    const label = kind === "tag" ? "削除" : "移動";
    const button = nodes(tree).find(
      (node) => node.type === "button" && node.props.children === label,
    );
    if (!button?.props.onClick) throw Error("Missing origin");
    const origin = { isConnected: true, disabled: false, focus: vi.fn() };
    button.props.onClick({
      currentTarget: origin as unknown as HTMLButtonElement,
    });
    origin.disabled = true;
    tree = render(kind);
    expect(origin.focus).not.toHaveBeenCalled();
    resolve(
      kind === "tag"
        ? { kind: "impact", source, target: null, overlap: 0, affected: 1 }
        : { items: [], next: null },
    );
    await deferred;
    await Promise.resolve();
    await Promise.all(f.work);
    origin.disabled = false;
    close(render(kind), kind);
    expect(origin.focus).not.toHaveBeenCalled();
    flush();
    expect(origin.focus).toHaveBeenCalledOnce();
  });
  it.each([
    ["tag", "navigation"],
    ["tag", "removal"],
    ["tag", "disabled"],
    ["move", "navigation"],
    ["move", "removal"],
    ["move", "disabled"],
    ["move", "readonly"],
  ] as const)("does not refocus a %s trigger after %s", async (kind, change) => {
    f.location = kind === "tag" ? "/tags" : `/notes/${noteId}`;
    (kind === "tag" ? f.read : f.destinations).mockResolvedValue(
      kind === "tag"
        ? { kind: "impact", source, target: null, overlap: 0, affected: 1 }
        : { items: [], next: null },
    );
    const origin = { isConnected: true, disabled: false, focus: vi.fn() };
    const label = kind === "tag" ? "削除" : "移動";
    const button = nodes(render(kind)).find(
      (node) => node.type === "button" && node.props.children === label,
    );
    if (!button?.props.onClick) throw Error("Missing origin");
    button.props.onClick({
      currentTarget: origin as unknown as HTMLButtonElement,
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.all(f.work);
    close(render(kind), kind);
    if (change === "navigation") {
      f.location = "/notes/other";
      render(kind);
    }
    if (change === "readonly") render(kind, false);
    if (change === "removal") origin.isConnected = false;
    if (change === "disabled") origin.disabled = true;
    flush();
    expect(origin.focus).not.toHaveBeenCalled();
  });
});

import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DriveReceiptPanel,
  type DriveReceiptView,
  DriveResult,
  driveFailureText,
} from "./DriveResult";

const fixture = vi.hoisted(() => ({
  cursor: 0,
  refCursor: 0,
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  effects: [] as (() => unknown)[],
  actor: 0,
  revision: 0,
  setters: [vi.fn(), vi.fn()],
  tasks: [] as Promise<unknown>[],
  start: vi.fn(),
  read: vi.fn(),
  cancel: vi.fn(),
  continuation: vi.fn(),
  refresh: vi.fn(),
  run: vi.fn(),
  confirm: vi.fn(),
  pending: false,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const i = fixture.cursor++;
    if (!(i in fixture.states)) fixture.states[i] = initial;
    return [fixture.states[i], fixture.setters[i]];
  },
  useRef: (value: unknown) =>
    (fixture.refs[fixture.refCursor++] ??= { current: value }),
  useEffect: (effect: () => unknown) => fixture.effects.push(effect),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = fixture.actor;
    const revision = ++fixture.revision;
    return () => actor === fixture.actor && revision === fixture.revision;
  },
}));
vi.mock("@/presentation/driveServerFn", () => ({
  driveReceiptFn: fixture.read,
  cancelDriveFn: fixture.cancel,
  continueDriveFolderFn: fixture.continuation,
}));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: string;
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
function button(tree: ReactNode, label: string) {
  const found = nodes(tree, "button").find(
    (node) => words(node.children) === label,
  );
  if (!found) throw Error("DRIVE_TEST_BUTTON");
  return found;
}
const receipt: DriveReceiptView = {
  id: "00000000-0000-4000-8000-000000000012",
  commandId: "00000000-0000-4000-8000-000000000013",
  kind: "folder-select",
  phase: "ready",
  version: 3,
  current: true,
  owner: "closed",
  expiresAt: "2026-09-29T00:10:00.000Z",
  failure: null,
  target: {
    sourceId: "synthetic-source",
    targetId: "synthetic-target",
    targetName: null,
  },
  creation: null,
};
function panel(row = receipt, pending = false) {
  return DriveReceiptPanel({
    receipt: row,
    pending,
    onRun: fixture.run,
    onRefresh: fixture.refresh,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.cursor = 0;
  fixture.refCursor = 0;
  fixture.states = [];
  fixture.refs = [];
  fixture.effects = [];
  fixture.actor = 0;
  fixture.revision = 0;
  fixture.setters.forEach((setter, i) => {
    setter.mockImplementation((value: unknown) => {
      fixture.states[i] = value;
    });
  });
  fixture.tasks = [];
  fixture.pending = false;
  fixture.start.mockImplementation((work: () => unknown) => {
    fixture.tasks.push(Promise.resolve(work()));
  });
  fixture.run.mockImplementation((work: () => unknown) => {
    fixture.tasks.push(Promise.resolve(work()));
  });
  fixture.confirm.mockReturnValue(true);
  fixture.read.mockResolvedValue(null);
  fixture.continuation.mockResolvedValue(undefined);
  vi.stubGlobal("window", { confirm: fixture.confirm });
});
afterEach(() => vi.unstubAllGlobals());
describe("Drive receipt structural and explicit event contract", () => {
  it("confirms the exact ready target only after the user accepts", async () => {
    const tree = panel();
    expect(words(tree)).toContain("名称未確認");
    expect(fixture.continuation).not.toHaveBeenCalled();
    fixture.confirm.mockReturnValueOnce(false);
    button(tree, "この保存先を利用する").onClick?.();
    expect(fixture.run).not.toHaveBeenCalled();
    button(tree, "この保存先を利用する").onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.continuation).toHaveBeenCalledWith({
      data: {
        id: receipt.id,
        expectedVersion: 3,
        phase: "ready",
        action: "confirm",
        targetId: "synthetic-target",
      },
    });
    const created = panel({
      ...receipt,
      kind: "folder-create",
      target: null,
      creation: {
        sends: 2,
        canResend: false,
        confirmation: {
          fileId: "synthetic-created",
          parentId: "synthetic-parent",
          targetName: "確認した保存先",
        },
      },
    });
    button(created, "この保存先を利用する").onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.continuation).toHaveBeenLastCalledWith({
      data: {
        id: receipt.id,
        expectedVersion: 3,
        phase: "ready",
        action: "confirm",
        targetId: "synthetic-parent",
        sends: 2,
      },
    });
  });
  it("disables stale and owner-unknown confirmations while retaining a pure result read", () => {
    for (const row of [
      { ...receipt, current: false },
      { ...receipt, owner: "unknown" as const },
    ]) {
      const tree = panel(row);
      expect(button(tree, "この保存先を利用する").disabled).toBe(true);
      button(tree, "結果を確認").onClick?.();
    }
    expect(fixture.refresh).toHaveBeenCalledTimes(2);
    expect(fixture.continuation).not.toHaveBeenCalled();
    expect(words(panel({ ...receipt, current: false }))).toContain(
      "現在の操作条件と一致しません",
    );
  });
  it("keeps missing callback acknowledgement recovery read-only", async () => {
    fixture.read.mockRejectedValueOnce(Error("synthetic"));
    const tree = DriveResult({ id: receipt.id });
    const read = button(tree, "結果を確認");
    read.onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.setters[1]).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "結果を確認できません。結果を照会してください。",
      }),
    );
    read.onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.read).toHaveBeenCalledTimes(2);
    expect(fixture.read).toHaveBeenLastCalledWith({
      data: { by: "id", kind: "authorization", id: receipt.id },
    });
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.continuation).not.toHaveBeenCalled();
  });
  it("distinguishes provider inspect POST from receipt refresh GET", async () => {
    const tree = panel({
      ...receipt,
      kind: "folder-create",
      phase: "reconciling",
      target: null,
      creation: { sends: 1, confirmation: null, canResend: false },
    });
    expect(words(tree)).toContain("自動では再送しません");
    button(tree, "結果を確認").onClick?.();
    expect(fixture.continuation).not.toHaveBeenCalled();
    button(tree, "Google上の作成結果を照会する").onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.continuation).toHaveBeenCalledWith({
      data: {
        id: receipt.id,
        expectedVersion: 3,
        phase: "reconciling",
        action: "inspect",
        sends: 1,
      },
    });
  });
  it("requires an explicit same-ID resend confirmation with sends one", async () => {
    const tree = panel({
      ...receipt,
      kind: "folder-create",
      phase: "reconciling",
      target: null,
      creation: { sends: 1, confirmation: null, canResend: true },
    });
    fixture.confirm.mockReturnValueOnce(false);
    button(tree, "同じ保存先IDで作成をもう一度試す").onClick?.();
    expect(fixture.continuation).not.toHaveBeenCalled();
    button(tree, "同じ保存先IDで作成をもう一度試す").onClick?.();
    await Promise.all(fixture.tasks);
    expect(fixture.continuation).toHaveBeenCalledWith({
      data: {
        id: receipt.id,
        expectedVersion: 3,
        phase: "reconciling",
        action: "resend",
        sends: 1,
      },
    });
  });
  it("uses finite trash and ambiguity messages with native pending controls and wrapping structure", () => {
    expect(driveFailureText("DRIVE_FOLDER_TRASHED")).toContain(
      "Google Driveで復元してから選び直す",
    );
    expect(driveFailureText("DRIVE_FOLDER_UNAVAILABLE")).toContain(
      "削除されたとは限りません",
    );
    expect(driveFailureText("unrecognized")).toBe(driveFailureText(null));
    const tree = panel(receipt, true);
    expect(
      nodes(tree, "button").every(
        (node) => node.disabled && node.type === "button",
      ),
    ).toBe(true);
    expect(nodes(tree, "section")[0]?.style).toMatchObject({
      minWidth: 0,
      overflowWrap: "anywhere",
    });
  });
});

type PanelProps = Parameters<typeof DriveReceiptPanel>[0];
function resultPanel(tree: ReactNode): PanelProps | null {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = resultPanel(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<Props>(tree)) return null;
  if (tree.type === DriveReceiptPanel) return tree.props as PanelProps;
  return resultPanel(tree.props.children);
}
function renderResult(id?: string) {
  fixture.cursor = fixture.refCursor = 0;
  fixture.effects = [];
  return DriveResult(id ? { id } : {});
}
function beginRead(id: string) {
  const tree = renderResult(id);
  fixture.effects[0]?.();
  return tree;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const resultA: DriveReceiptView = {
  ...receipt,
  kind: "authorization",
  phase: "pending",
  owner: "none",
  target: null,
};
const resultB: DriveReceiptView = {
  ...resultA,
  id: "00000000-0000-4000-8000-000000000021",
};
describe("Drive result same-mount identity boundary", () => {
  it("drops displayed A before B read failure and refuses retained A handlers", async () => {
    fixture.read
      .mockResolvedValueOnce(resultA)
      .mockRejectedValueOnce(Error("FINITE_TEST"));
    beginRead(resultA.id);
    await Promise.all(fixture.tasks);
    const old = resultPanel(renderResult(resultA.id));
    expect(old?.receipt.id).toBe(resultA.id);
    expect(resultPanel(beginRead(resultB.id))).toBeNull();
    await Promise.all(fixture.tasks);
    expect(resultPanel(renderResult(resultB.id))).toBeNull();
    expect(words(renderResult(resultB.id))).toContain("結果を確認できません");
    old?.onRun(() => fixture.cancel());
    old?.onRefresh();
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledTimes(2);
  });
  it("ignores a late A read without clearing B's in-flight guard", async () => {
    const a = deferred<DriveReceiptView>();
    const b = deferred<DriveReceiptView>();
    fixture.read.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    beginRead(resultA.id);
    beginRead(resultB.id);
    a.resolve(resultA);
    await fixture.tasks[0];
    const pendingB = renderResult(resultB.id);
    expect(resultPanel(pendingB)).toBeNull();
    button(pendingB, "結果を確認").onClick?.();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    b.resolve(resultB);
    await fixture.tasks[1];
    expect(resultPanel(renderResult(resultB.id))?.receipt.id).toBe(resultB.id);
  });
  it("rejects old A across an A-B-A roundtrip and clears the missing-id branch", async () => {
    const old = deferred<DriveReceiptView>();
    fixture.read
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(resultB)
      .mockResolvedValueOnce({ ...resultA, version: 4 });
    beginRead(resultA.id);
    beginRead(resultB.id);
    await fixture.tasks[1];
    beginRead(resultA.id);
    await fixture.tasks[2];
    old.resolve(resultA);
    await fixture.tasks[0];
    expect(resultPanel(renderResult(resultA.id))?.receipt.version).toBe(4);
    const noId = renderResult();
    expect(resultPanel(noId)).toBeNull();
    fixture.effects[0]?.();
    expect(fixture.read).toHaveBeenCalledTimes(3);
  });
  it("ignores late A mutation failure while B is pending without a follow-up A GET", async () => {
    const mutation = deferred<void>();
    const b = deferred<DriveReceiptView>();
    fixture.read.mockResolvedValueOnce(resultA).mockReturnValueOnce(b.promise);
    beginRead(resultA.id);
    await fixture.tasks[0];
    fixture.cancel.mockReturnValueOnce(mutation.promise);
    resultPanel(renderResult(resultA.id))?.onRun(() => fixture.cancel());
    beginRead(resultB.id);
    mutation.reject(Error("FINITE_TEST"));
    await fixture.tasks[1];
    const tree = renderResult(resultB.id);
    expect(words(tree)).not.toContain("結果を確認できません");
    button(tree, "結果を確認").onClick?.();
    expect(fixture.read).toHaveBeenCalledTimes(2);
    b.resolve(resultB);
    await fixture.tasks[2];
    expect(resultPanel(renderResult(resultB.id))?.receipt.id).toBe(resultB.id);
  });
  it("refuses previous-actor displayed actions and late reads but permits a new pure read", async () => {
    const late = deferred<DriveReceiptView>();
    fixture.read
      .mockResolvedValueOnce(resultA)
      .mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce(null);
    beginRead(resultA.id);
    await fixture.tasks[0];
    const old = resultPanel(renderResult(resultA.id));
    old?.onRefresh();
    fixture.actor++;
    expect(resultPanel(renderResult(resultA.id))).toBeNull();
    old?.onRun(() => fixture.cancel());
    late.resolve(resultA);
    await fixture.tasks[1];
    expect(resultPanel(renderResult(resultA.id))).toBeNull();
    button(renderResult(resultA.id), "結果を確認").onClick?.();
    await fixture.tasks[2];
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.read).toHaveBeenCalledTimes(3);
  });
  it("preserves same-id cancellation, read-only ACK recovery, and route change after success", async () => {
    const mutation = deferred<void>();
    fixture.read.mockResolvedValueOnce(resultA).mockResolvedValueOnce(resultB);
    beginRead(resultA.id);
    await fixture.tasks[0];
    fixture.cancel.mockReturnValueOnce(mutation.promise);
    const old = resultPanel(renderResult(resultA.id));
    expect(old).not.toBeNull();
    button(
      DriveReceiptPanel(old as PanelProps),
      "このDrive処理を取り消す",
    ).onClick?.();
    expect(fixture.cancel).toHaveBeenCalledWith({
      data: {
        id: resultA.id,
        expectedVersion: resultA.version,
        kind: "authorization",
      },
    });
    beginRead(resultB.id);
    await fixture.tasks[2];
    mutation.resolve();
    await fixture.tasks[1];
    expect(fixture.read).toHaveBeenCalledTimes(2);
    expect(resultPanel(renderResult(resultB.id))?.receipt.id).toBe(resultB.id);
    fixture.cancel.mockRejectedValueOnce(Error("FINITE_ACK"));
    const current = resultPanel(renderResult(resultB.id));
    current?.onRun(() => fixture.cancel());
    await fixture.tasks[3];
    const uncertain = renderResult(resultB.id);
    expect(words(uncertain)).toContain("結果を確認できません");
    fixture.read.mockResolvedValueOnce({
      ...resultB,
      phase: "failed",
      failure: "DRIVE_CANCELLED",
    });
    button(uncertain, "結果を確認").onClick?.();
    await fixture.tasks[4];
    expect(fixture.cancel).toHaveBeenCalledTimes(2);
    expect(resultPanel(renderResult(resultB.id))?.receipt.phase).toBe("failed");
  });
});

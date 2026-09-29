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
  states: [] as unknown[],
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
  useState: () => {
    const i = fixture.cursor++;
    return [fixture.states[i], fixture.setters[i]];
  },
  useRef: (value: unknown) => ({ current: value }),
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useTransition: () => [fixture.pending, fixture.start],
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => () => true,
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
  fixture.states = [null, ""];
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
      "結果を確認できません。結果を照会してください。",
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

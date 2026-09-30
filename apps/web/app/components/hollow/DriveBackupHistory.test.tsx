import { type EffectCallback, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DriveBackupHistory } from "./DriveBackupHistory";

const f = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: "",
  effects: [] as EffectCallback[],
  tasks: [] as Promise<unknown>[],
  cursor: 0,
  actor: "actor",
  revision: 0,
  read: vi.fn(),
  listeners: new Map<string, () => void>(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () =>
    f.cursor++ === 0
      ? [
          f.rows,
          (rows: unknown[]) => {
            f.rows = rows;
          },
        ]
      : [
          f.error,
          (error: string) => {
            f.error = error;
          },
        ],
  useRef: () => ({ current: false }),
  useEffect: (effect: EffectCallback) => f.effects.push(effect),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [
    false,
    (work: () => Promise<unknown>) => f.tasks.push(work()),
  ],
}));
vi.mock("@/presentation/driveBackupServerFn", () => ({
  driveBackupHistoryFn: f.read,
}));
vi.mock("./SharingActorProvider", () => ({
  useSharingActor: () => ({ currentActor: () => ({ id: f.actor, epoch: 1 }) }),
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const actor = f.actor;
    const revision = ++f.revision;
    return () => actor === f.actor && revision === f.revision;
  },
}));
vi.mock("./DriveBackupPanel", () => ({
  driveBackupFailureText: () => "有限失敗",
}));
function words(tree: ReactNode): string {
  if (Array.isArray(tree)) return tree.map(words).join("");
  if (isValidElement<{ children?: ReactNode }>(tree))
    return words(tree.props.children);
  return typeof tree === "string" || typeof tree === "number"
    ? String(tree)
    : "";
}
function page() {
  f.cursor = 0;
  f.effects = [];
  return DriveBackupHistory();
}
beforeEach(() => {
  vi.resetAllMocks();
  f.rows = [];
  f.error = "";
  f.tasks = [];
  f.actor = "actor";
  f.revision = 0;
  f.listeners.clear();
  vi.stubGlobal("window", {
    addEventListener: (name: string, fn: () => void) =>
      f.listeners.set(name, fn),
    removeEventListener: (name: string) => f.listeners.delete(name),
  });
});
afterEach(() => vi.unstubAllGlobals());
it("shows only matching actor history and clears it at signout", async () => {
  f.read.mockResolvedValue({
    actor: { accountId: "actor" },
    rows: [
      {
        id: "job",
        title: "原本",
        state: "succeeded",
        bytes: 1024,
        createdAt: "2026-09-30",
      },
    ],
  });
  page();
  for (const effect of f.effects) effect();
  await Promise.all(f.tasks);
  expect(
    words(page()).includes("原本 —") && words(page()).includes("直近90日"),
  ).toBe(true);
  f.listeners.get("hollow:signed-out")?.();
  expect(f.rows.length).toBe(0);
});
it("does not adopt a foreign or late actor result", async () => {
  f.read.mockResolvedValue({
    actor: { accountId: "other" },
    rows: [{ id: "private" }],
  });
  page();
  for (const effect of f.effects) effect();
  await Promise.all(f.tasks);
  expect(f.rows.length).toBe(0);
  let resolve!: (value: unknown) => void;
  f.read.mockReturnValueOnce(
    new Promise((value) => {
      resolve = value;
    }),
  );
  page();
  for (const effect of f.effects) effect();
  f.actor = "other";
  resolve({ actor: { accountId: "actor" }, rows: [{ id: "private" }] });
  await Promise.all(f.tasks);
  expect(f.rows.length).toBe(0);
});

import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupTargetHead } from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it, vi } from "vitest";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import {
  previewDriveBackupRetarget,
  retargetDeadline,
  retargetDriveBackup,
  retargetOwnersClosed,
} from "./retarget";

function previewFixture() {
  const original = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);
  const inspectRetarget = vi.fn().mockResolvedValue({
    kind: "blocked",
    reason: "invalid-evidence",
  });
  const writes = vi.fn();
  const browser = { hash: "browser", epoch: 1 };
  const u = {
    authBrowsers: { find: async () => browser },
    accounts: {
      findSession: async () => ({
        accountId: "actor",
        expiresAt: new Date(1000),
        browser,
      }),
      findById: async () => ({
        id: "actor",
        authVersion: 1,
        status: "verified",
      }),
    },
    notes: {
      findById: async () => ({
        id: "note",
        owner: { kind: "personal", accountId: "actor" },
        lifecycle: { kind: "active" },
      }),
    },
    imports: { findByNote: async () => ({ id: "original" }) },
    driveConnections: {
      find: async () => ({
        state: "linked",
        credential: { subject: "sub" },
        folder: { id: "new-folder" },
      }),
    },
    driveBackupTargets: {
      original,
      inspectRetarget,
      insertInitial: writes,
      replaceHead: writes,
    },
    driveBackupRequests: { command: async () => null, insert: writes },
    driveAttempts: { findByCommand: async () => null },
    driveControls: { findByCommand: async () => null },
  } as unknown as HollowUnitOfWorkContext;
  const c = {
    clock: { now: () => new Date(0) },
    tokens: { hash: (value: string) => value },
    importing: { storage: { withOwner: writes } },
    drive: {
      backup: {},
      protector: { available: () => true },
      execution: {
        coordinate: async (_: unknown, work: () => Promise<unknown>) => work(),
      },
    },
    unitOfWorkProvider: {
      run: (work: (u: HollowUnitOfWorkContext) => Promise<unknown>) => work(u),
    },
  } as unknown as HollowContainer;
  const request = { sessionToken: "session", browserToken: "browser" };
  const preview = () =>
    previewDriveBackupRetarget(c, request, { noteId: "note" });
  const confirm = () =>
    retargetDriveBackup(c, request, {
      noteId: "note",
      commandId: "command",
      expectedEpoch: 1,
      expectedSettingsVersion: 1,
      expectedHeadTargetId: "old-target",
      expectedHeadVersion: 1,
      expectedTargetVersion: 1,
      expectedDigest: "digest",
    });
  return { original, inspectRetarget, writes, preview, confirm };
}

describe("retarget initial lookup boundary", () => {
  it("only exact normal null has no previous operation and never admits a retarget", async () => {
    const f = previewFixture();
    expect((await f.preview()).preview).toEqual({
      kind: "unavailable",
      reason: "not-started",
    });
    expect(f.original).toHaveBeenCalledExactlyOnceWith(
      "original",
      "actor",
      "sub",
    );
    await expect(f.confirm()).rejects.toMatchObject({
      code: "DRIVE_CONTEXT_CHANGED",
    });
    expect(f.inspectRetarget).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
  it.each([
    "history-without-head",
    "head-without-target",
  ])("does not repair or hide repository rejection: %s", async () => {
    const f = previewFixture();
    f.original.mockRejectedValue(
      new BusinessRuleError("DRIVE_BACKUP_STATE_INVALID", "fixture"),
    );
    await expect(f.preview()).rejects.toMatchObject({
      code: "DRIVE_BACKUP_STATE_INVALID",
    });
    await expect(f.confirm()).rejects.toMatchObject({
      code: "DRIVE_BACKUP_STATE_INVALID",
    });
    expect(f.inspectRetarget).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
  it.each([
    "allocated",
    "unknown",
  ])("preserves the existing unknown-result rejection: %s", async (state) => {
    const f = previewFixture();
    f.original.mockResolvedValue({ state });
    expect((await f.preview()).preview).toEqual({
      kind: "unavailable",
      reason: "resolve-old-result",
    });
    await expect(f.confirm()).rejects.toMatchObject({
      code: "DRIVE_CONTEXT_CHANGED",
    });
    expect(f.inspectRetarget).toHaveBeenCalledTimes(2);
    expect(f.writes).not.toHaveBeenCalled();
  });
});

const head: DriveBackupTargetHead = {
  originalId: "original",
  accountId: "actor",
  subject: "sub",
  targetId: "target",
  version: 1,
};
const id = (n: number) => String(n).padStart(8, "0");
function fixture(count: number, pending = -1) {
  const cursors: (string | null)[] = [];
  const calls: string[] = [];
  const state = { accepting: true, unacknowledged: false, predecessor: false };
  const c = {
    drive: {
      protector: { available: () => true },
      execution: {
        accepting: () => state.accepting,
        unacknowledged: () => (state.unacknowledged ? [{}] : []),
        predecessors: () => (state.predecessor ? [{}] : []),
        caller: (locator: {
          kind: string;
          id: string;
          owner: { token: string };
        }) => {
          expect(locator.kind).toBe("backup");
          expect(locator.owner.token).toBe(`owner-${locator.id}`);
          calls.push(locator.id);
          return locator.id === id(pending) ? "pending" : "untracked";
        },
      },
    },
  } as unknown as HollowContainer;
  const u = {
    driveBackupTargets: {
      closedOwners: async (
        tuple: DriveBackupTargetHead,
        after: string | null,
        limit: number,
      ) => {
        expect(tuple).toBe(head);
        expect(limit).toBe(100);
        cursors.push(after);
        const start = after === null ? 0 : Number(after) + 1;
        const items = Array.from(
          { length: Math.min(100, Math.max(0, count - start)) },
          (_, i) => ({
            transferId: id(start + i),
            owner: {
              runtimeGeneration: "runtime",
              token: `owner-${id(start + i)}`,
            },
          }),
        );
        return {
          items,
          nextAfter:
            start + items.length < count ? items.at(-1)!.transferId : null,
        };
      },
    },
  } as unknown as HollowUnitOfWorkContext;
  return { c, u, state, cursors, calls };
}
describe("retarget finite exact-owner evidence", () => {
  it("uses both keyset pages and exact locators beyond the first 100", async () => {
    const f = fixture(130);
    expect(await retargetOwnersClosed(f.c, f.u, head, () => {})).toBe(true);
    expect(f.cursors).toEqual([null, id(99)]);
    expect(f.calls).toHaveLength(130);
  });
  it("rejects a pending caller beyond page one", async () => {
    const f = fixture(130, 129);
    expect(await retargetOwnersClosed(f.c, f.u, head, () => {})).toBe(false);
    expect(f.calls).toHaveLength(130);
  });
  it.each([
    "accepting",
    "unacknowledged",
    "predecessor",
  ] as const)("does not infer closure from untracked when %s is unsafe", async (key) => {
    const f = fixture(1);
    f.state[key] = key !== "accepting";
    expect(await retargetOwnersClosed(f.c, f.u, head, () => {})).toBe(false);
    expect(f.cursors).toEqual([]);
  });
  it("checks shutdown/ACK state again after the page read", async () => {
    const f = fixture(1);
    let checks = 0;
    expect(
      await retargetOwnersClosed(f.c, f.u, head, () => {
        if (++checks === 2) f.state.accepting = false;
      }),
    ).toBe(false);
    expect(f.calls).toEqual([]);
  });
  it("fails closed when more than 100 pages remain", async () => {
    const f = fixture(10001);
    expect(await retargetOwnersClosed(f.c, f.u, head, () => {})).toBe(false);
    expect(f.cursors).toHaveLength(100);
    expect(f.calls).toHaveLength(10000);
  });
  it("accepts a complete exact 100-page bound", async () => {
    const f = fixture(10000);
    expect(await retargetOwnersClosed(f.c, f.u, head, () => {})).toBe(true);
  });
  it("rejects a non-progressing repository cursor", async () => {
    const f = fixture(200);
    f.u.driveBackupTargets.closedOwners = async () => ({
      items: [],
      nextAfter: "same",
    });
    await expect(
      retargetOwnersClosed(f.c, f.u, head, () => {}),
    ).rejects.toMatchObject({ code: "DRIVE_CONTEXT_CHANGED" });
  });
  it("checks the absolute deadline without waiting on a caller", () => {
    let time = 0;
    const check = retargetDeadline({ clock: { now: () => new Date(time) } });
    time = 1999;
    expect(check).not.toThrow();
    time = 2000;
    expect(check).toThrow();
  });
  it("rejects a backwards clock", () => {
    let time = 100;
    const check = retargetDeadline({ clock: { now: () => new Date(time) } });
    time = 99;
    expect(check).toThrow();
  });
});

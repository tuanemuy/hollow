import type { DriveBackupTargetHead } from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it } from "vitest";
import type { HollowContainer } from "../../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import { retargetDeadline, retargetOwnersClosed } from "./retarget";

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

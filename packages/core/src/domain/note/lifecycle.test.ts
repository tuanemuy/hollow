import { describe, expect, it } from "vitest";
import {
  restoreLifecycle,
  TRASH_RETENTION_MS,
  trashLifecycle,
} from "./lifecycle";

describe("trash lifecycle", () => {
  const now = new Date("2026-09-10T00:00:00Z");
  const state = trashLifecycle(now, "generation-a");
  it("permits only the current operation before the exact 30 day boundary", () => {
    expect(state.purgeAfter.getTime() - now.getTime()).toBe(TRASH_RETENTION_MS);
    expect(
      restoreLifecycle(
        state,
        "generation-a",
        new Date(state.purgeAfter.getTime() - 1),
      ),
    ).toEqual({ kind: "active" });
    expect(() =>
      restoreLifecycle(state, "generation-a", state.purgeAfter),
    ).toThrowError(/期限/);
    expect(() =>
      restoreLifecycle(
        state,
        "generation-a",
        new Date(state.purgeAfter.getTime() + 1),
      ),
    ).toThrowError(/期限/);
  });
  it("does not use an old undo or an active note as a new restoration", () => {
    expect(() => restoreLifecycle(state, "generation-b", now)).toThrowError(
      /変わりました/,
    );
    expect(() =>
      restoreLifecycle({ kind: "active" }, "generation-a", now),
    ).toThrowError(/変わりました/);
  });
});

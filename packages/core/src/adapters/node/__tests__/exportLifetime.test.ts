import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeExportLifetime } from "../exportLifetime";

describe("export execution lifetime", () => {
  afterEach(() => vi.useRealTimers());
  it("counts ready operations and refuses a third operation", async () => {
    const lifetime = new NodeExportLifetime();
    lifetime.start("a", 120000);
    lifetime.start("b", 120000);
    expect(() => lifetime.start("c", 120000)).toThrow();
    expect(lifetime.ids()).toEqual(["a", "b"]);
    await lifetime.stop();
    expect(lifetime.ids()).toEqual([]);
  });
  it("keeps the slot until an aborted actual task settles", async () => {
    const lifetime = new NodeExportLifetime();
    lifetime.start("a", 120000);
    lifetime.start("b", 120000);
    let finish!: () => void;
    let aborted = false;
    const task = lifetime.generation(
      "a",
      (signal) =>
        new Promise<void>((resolve) => {
          finish = resolve;
          signal.addEventListener("abort", () => {
            aborted = true;
          });
        }),
    );
    lifetime.cancel("a");
    lifetime.release("a");
    expect(aborted).toBe(true);
    expect(lifetime.ids()).toContain("a");
    expect(() => lifetime.start("c", 120000)).toThrow();
    finish();
    await task;
    await Promise.resolve();
    expect(lifetime.ids()).not.toContain("a");
    await lifetime.stop();
  });
  it("uses the remaining acceptance deadline without renewing ready operations", async () => {
    vi.useFakeTimers();
    const lifetime = new NodeExportLifetime();
    lifetime.start("a", 50);
    await vi.advanceTimersByTimeAsync(49);
    expect(lifetime.ids()).toEqual(["a"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(lifetime.ids()).toEqual([]);
    await lifetime.stop();
  });
  it("stop refuses new admission and waits for an actual delivery close", async () => {
    const lifetime = new NodeExportLifetime();
    lifetime.start("a", 120000);
    let finish!: () => void;
    const task = lifetime.delivery(
      "a",
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let stopped = false;
    const stop = lifetime.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    expect(() => lifetime.start("b", 120000)).toThrow();
    finish();
    await task;
    await stop;
    expect(stopped).toBe(true);
  });
});

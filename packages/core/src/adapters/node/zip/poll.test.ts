import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeZipExecution } from "./lifetimes";

describe("ZIP PDF polling does not own a database or another execution slot", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const execution = () => new NodeZipExecution({ now: () => new Date() });
  it("waits two seconds and removes its listener", async () => {
    const signal = new AbortController().signal;
    const remove = vi.spyOn(signal, "removeEventListener");
    let completed = false;
    const pending = execution()
      .waitForPoll(signal)
      .then(() => {
        completed = true;
      });
    await vi.advanceTimersByTimeAsync(1999);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(completed).toBe(true);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("propagates the original cancellation reason and clears its timer", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const pending = expect(
      execution().waitForPoll(controller.signal),
    ).rejects.toBe(reason);
    controller.abort(reason);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not register a timer for a previously cancelled wait", async () => {
    const reason = new Error("already cancelled");
    await expect(
      execution().waitForPoll(AbortSignal.abort(reason)),
    ).rejects.toBe(reason);
    expect(vi.getTimerCount()).toBe(0);
  });
});

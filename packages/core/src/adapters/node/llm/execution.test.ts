import { LlmObjectOwnershipUnprovenError } from "@repo/core/application/llm/ownershipError";
import {
  LlmOperationError,
  type LlmRuntimeOwnership,
} from "@repo/core/application/llm/ports";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeLlmExecution } from "./execution";

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const ownership: LlmRuntimeOwnership = {
  runtimeId: "self-runtime",
  predecessors: () => [],
  assertReady: () => {},
  acknowledge: async () => {},
};
let execution: NodeLlmExecution;
const gates: ReturnType<typeof deferred>[] = [];
const deadline = () => new Date(Date.now() + 1_000);
const gate = () => {
  const value = deferred();
  gates.push(value);
  return value;
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
  execution = new NodeLlmExecution(ownership, { now: () => new Date() });
});
afterEach(async () => {
  try {
    for (const value of gates) value.release();
    await execution.stop().catch(() => {});
  } finally {
    gates.length = 0;
    vi.useRealTimers();
  }
});

describe("NodeLlmExecution", () => {
  it("allows two global operations but only one per account and job", async () => {
    const first = gate();
    const second = gate();
    expect(execution.runtimeId).toBe(ownership.runtimeId);
    expect(execution.start("a", "one", deadline(), () => first.promise)).toBe(
      true,
    );
    expect(execution.start("b", "one", deadline(), async () => {})).toBe(false);
    expect(execution.start("a", "two", deadline(), async () => {})).toBe(false);
    expect(execution.start("b", "two", deadline(), () => second.promise)).toBe(
      true,
    );
    expect(execution.start("c", "three", deadline(), async () => {})).toBe(
      false,
    );
    first.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.active("a")).toBe(false);
    expect(execution.start("c", "one", deadline(), () => second.promise)).toBe(
      true,
    );
  });

  it("deadline abort does not release an unsettled operation or its account slot", async () => {
    const pending = gate();
    let signal: AbortSignal | undefined;
    execution.start("a", "one", deadline(), (current) => {
      signal = current;
      return pending.promise;
    });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(signal?.aborted).toBe(true);
    expect(execution.active("a")).toBe(true);
    expect(execution.start("b", "one", deadline(), async () => {})).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execution.active("a")).toBe(true);
    pending.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.active("a")).toBe(false);
  });

  it("stop aborts all operations but waits for both actual work Promises", async () => {
    const first = gate();
    const second = gate();
    const signals: AbortSignal[] = [];
    execution.start("a", "one", deadline(), (signal) => {
      signals.push(signal);
      return first.promise;
    });
    execution.start("b", "two", deadline(), (signal) => {
      signals.push(signal);
      return second.promise;
    });
    await vi.advanceTimersByTimeAsync(0);
    let stopped = false;
    const stopping = execution.stop().then(() => {
      stopped = true;
    });
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    first.release();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stopped).toBe(false);
    expect(execution.active("b")).toBe(true);
    second.release();
    await stopping;
    expect(execution.active("b")).toBe(false);
    expect(execution.start("c", "three", deadline(), async () => {})).toBe(
      false,
    );
  });

  it("cancel before dispatch delivers an aborted signal and retains work until settlement", async () => {
    const pending = gate();
    let aborted = false;
    execution.start("a", "one", deadline(), (signal) => {
      aborted = signal.aborted;
      return pending.promise;
    });
    execution.cancel("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(aborted).toBe(true);
    expect(execution.active("a")).toBe(true);
    pending.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.active("a")).toBe(false);
  });

  it("dispatches an already expired deadline only with an aborted signal", async () => {
    let aborted = false;
    execution.start("a", "one", new Date(Date.now() - 1), async (signal) => {
      aborted = signal.aborted;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(aborted).toBe(true);
    expect(execution.active("a")).toBe(false);
  });

  it.each([
    new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false),
    new LlmObjectOwnershipUnprovenError("a"),
  ])("retains exact typed unknown ownership and rejects stop (%#)", async (error) => {
    execution.start("a", "one", deadline(), async () => {
      throw error;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.active("a")).toBe(true);
    expect(execution.start("b", "two", deadline(), async () => {})).toBe(false);
    await expect(execution.stop()).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      delivery: "possible",
      closed: false,
    });
    expect(execution.active("a")).toBe(true);
  });

  it.each([
    new LlmOperationError("LLM_UNAVAILABLE", "possible", true),
    new LlmObjectOwnershipUnprovenError("another-job"),
    new Error("synthetic ordinary failure"),
  ])("releases ordinary failures and does not claim another job's ownership (%#)", async (error) => {
    execution.start("a", "one", deadline(), async () => {
      throw error;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.active("a")).toBe(false);
    await expect(execution.stop()).resolves.toBeUndefined();
  });

  it("refuses dispatch when the runtime predecessor has not been acknowledged", () => {
    execution = new NodeLlmExecution(
      {
        ...ownership,
        assertReady: () => {
          throw new LlmOperationError(
            "LLM_OWNERSHIP_UNKNOWN",
            "not-sent",
            false,
          );
        },
      },
      { now: () => new Date() },
    );
    const work = vi.fn(async () => {});
    expect(() => execution.start("a", "one", deadline(), work)).toThrow(
      expect.objectContaining({ closed: false }),
    );
    expect(work).not.toHaveBeenCalled();
    expect(execution.active("a")).toBe(false);
  });
});

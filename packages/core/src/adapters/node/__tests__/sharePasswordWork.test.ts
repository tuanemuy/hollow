import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeSharePasswordWork } from "../sharePasswordWork";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const busy = { code: "SHARE_PASSWORD_BUSY", retryable: true };
afterEach(() => vi.useRealTimers());

describe("NodeSharePasswordWork", () => {
  it("defaults to two concurrent operations and eight FIFO waiters", async () => {
    const work = new NodeSharePasswordWork();
    const gates = Array.from({ length: 10 }, () => deferred<number>());
    const started: number[] = [];
    const requests = gates.map((gate, index) =>
      work.run(() => {
        started.push(index);
        return gate.promise;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    const rejected = vi.fn(async () => 11);
    await expect(work.run(rejected)).rejects.toMatchObject(busy);
    expect(rejected).not.toHaveBeenCalled();
    for (let index = 0; index < gates.length; index++) {
      gates[index]?.resolve(index);
      await expect(requests[index]).resolves.toBe(index);
    }
    expect(started).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await work.stop();
  });

  it("expires waiting work at three seconds without starting the operation", async () => {
    vi.useFakeTimers();
    const work = new NodeSharePasswordWork({ concurrency: 1 });
    const gate = deferred<void>();
    const running = work.run(() => gate.promise);
    const callback = vi.fn(async () => true);
    const waiting = work.run(callback);
    const rejection = expect(waiting).rejects.toMatchObject(busy);
    await vi.advanceTimersByTimeAsync(2999);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(callback).not.toHaveBeenCalled();
    gate.resolve();
    await running;
    await expect(work.run(async () => "available")).resolves.toBe("available");
    await work.stop();
  });

  it("checks elapsed deadlines when timer callbacks have not run yet", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const work = new NodeSharePasswordWork({ concurrency: 1, waitMs: 1000 });
    const gate = deferred<void>();
    const running = work.run(() => gate.promise);
    const callback = vi.fn(async () => true);
    const waiting = work.run(callback);
    const rejection = expect(waiting).rejects.toMatchObject(busy);
    now.mockReturnValue(1000);
    gate.resolve();
    await running;
    await rejection;
    expect(callback).not.toHaveBeenCalled();
    await work.stop();
    now.mockRestore();
  });

  it("releases a slot after asynchronous rejection and synchronous throw", async () => {
    const work = new NodeSharePasswordWork({ concurrency: 1 });
    const gate = deferred<void>();
    const first = work.run(() => gate.promise);
    const failed = expect(first).rejects.toThrow("unit operation failed");
    const second = work.run(() => {
      throw new Error("unit synchronous failure");
    });
    const secondFailed = expect(second).rejects.toThrow(
      "unit synchronous failure",
    );
    const third = work.run(async () => ({ valid: true }));
    gate.reject(new Error("unit operation failed"));
    await failed;
    await secondFailed;
    await expect(third).resolves.toEqual({ valid: true });
    await work.stop();
  });

  it("stop rejects new and queued work, waits for active work, and is idempotent", async () => {
    const work = new NodeSharePasswordWork({ concurrency: 1 });
    const gate = deferred<void>();
    const running = work.run(() => gate.promise);
    await Promise.resolve();
    const callback = vi.fn(async () => true);
    const waiting = work.run(callback);
    const rejection = expect(waiting).rejects.toMatchObject(busy);
    const stopped = work.stop();
    expect(work.stop() === stopped).toBe(true);
    let finished = false;
    void stopped.then(() => {
      finished = true;
    });
    await rejection;
    await expect(work.run(callback)).rejects.toMatchObject(busy);
    expect(callback).not.toHaveBeenCalled();
    expect(finished).toBe(false);
    gate.resolve();
    await running;
    await stopped;
    expect(finished).toBe(true);
  });

  it("allows independent generic callback results and zero waiting slots", async () => {
    const work = new NodeSharePasswordWork({ queueLimit: 0 });
    const gate = deferred<string>();
    const hash = work.run(() => gate.promise);
    const verify = work.run(async () => true);
    await expect(work.run(async () => false)).rejects.toMatchObject(busy);
    await expect(verify).resolves.toBe(true);
    gate.resolve("unit result");
    await expect(hash).resolves.toBe("unit result");
    await work.stop();
  });

  it("resolves an idle stop without work and rejects unsafe limits", async () => {
    await expect(new NodeSharePasswordWork().stop()).resolves.toBeUndefined();
    for (const options of [
      { concurrency: 0 },
      { concurrency: 1.5 },
      { queueLimit: -1 },
      { waitMs: 0 },
      { waitMs: 2_147_483_648 },
      { waitMs: Number.NaN },
    ])
      expect(() => new NodeSharePasswordWork(options)).toThrow(RangeError);
  });
});

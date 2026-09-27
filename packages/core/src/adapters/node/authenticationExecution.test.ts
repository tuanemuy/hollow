import { afterEach, expect, it, vi } from "vitest";
import {
  BoundedAuthenticationPasswordHasher,
  NodeAuthenticationExecution,
} from "./authenticationExecution";

afterEach(() => vi.useRealTimers());
function gate() {
  let resolve = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

it("keeps four HTTP owners through deadline until their actual work ends and stops new admission", async () => {
  vi.useFakeTimers();
  const execution = new NodeAuthenticationExecution();
  const held = gate();
  const signals: AbortSignal[] = [];
  const runs = Array.from({ length: 4 }, () =>
    execution.run(async (signal) => {
      signals.push(signal);
      await held.promise;
      return true;
    }),
  );
  const results = Promise.allSettled(runs);
  try {
    await Promise.resolve();
    await expect(execution.run(async () => true)).rejects.toMatchObject({
      code: "AUTH_BUSY",
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await expect(execution.run(async () => true)).rejects.toMatchObject({
      code: "AUTH_BUSY",
    });
    let stopped = false;
    const stop = execution.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    held.resolve();
    expect(
      (await results).every((result) => result.status === "rejected"),
    ).toBe(true);
    await stop;
    await expect(execution.run(async () => true)).rejects.toMatchObject({
      code: "AUTH_BUSY",
    });
  } finally {
    held.resolve();
    await results;
    await execution.stop();
  }
});

it("shares two password slots between hash and verification without queueing or early stop", async () => {
  const held = gate();
  const hasher = new BoundedAuthenticationPasswordHasher({
    hash: async () => {
      await held.promise;
      return "synthetic";
    },
    verify: async () => {
      await held.promise;
      return true;
    },
  });
  const first = hasher.hash("synthetic");
  const second = hasher.verify("synthetic", "synthetic");
  try {
    await expect(hasher.hash("synthetic")).rejects.toMatchObject({
      code: "AUTH_BUSY",
    });
    let stopped = false;
    const stop = hasher.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    held.resolve();
    await Promise.all([first, second, stop]);
    expect(stopped).toBe(true);
    await expect(hasher.verify("synthetic", "synthetic")).rejects.toMatchObject(
      { code: "AUTH_BUSY" },
    );
  } finally {
    held.resolve();
    await Promise.allSettled([first, second]);
    await hasher.stop();
  }
});

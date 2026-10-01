import type { DriveExecutionTarget } from "@repo/core/application/integration/drive/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveTransportError, NodeDriveExecution } from "./execution";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
const target = (
  kind: DriveExecutionTarget["kind"],
  n: number,
): DriveExecutionTarget => ({
  kind,
  id: `operation-${n}`,
  owner: { runtimeGeneration: "runtime", token: `owner-${n}` },
});
function code(error: unknown): string {
  return error instanceof BusinessRuleError ||
    error instanceof DriveTransportError
    ? error.code
    : "unexpected";
}
async function outcome(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return code(error);
  }
}
function thrown(work: () => unknown): string {
  try {
    work();
    return "not-thrown";
  } catch (error) {
    return code(error);
  }
}
async function start(
  execution: NodeDriveExecution,
  kind: DriveExecutionTarget["kind"],
  n: number,
) {
  const owner = target(kind, n);
  const ready = deferred<AbortSignal>();
  const work = deferred<string>();
  let owned!: ReturnType<NodeDriveExecution["run"]>;
  let closed!: Promise<string>;
  const caller = execution.withCaller(
    owner,
    async () => true,
    async () => {
      owned = execution.run(owner, (signal) => {
        ready.resolve(signal);
        return work.promise;
      });
      closed = outcome(owned.closed);
      return owned.result;
    },
  );
  const callerOutcome = outcome(caller);
  const signal = await ready.promise;
  return { target: owner, signal, work, owned, closed, caller, callerOutcome };
}
type Running = Awaited<ReturnType<typeof start>>;
async function acknowledge(execution: NodeDriveExecution, running: Running) {
  const closure = execution.closure(running.target);
  expect(closure.kind).toBe("closed");
  if (closure.kind === "closed") await execution.acknowledge(closure.proof);
}
async function finish(execution: NodeDriveExecution, running: Running) {
  running.work.resolve("complete");
  expect(await running.callerOutcome).toBe("resolved");
  expect(await running.closed).toBe("resolved");
  await acknowledge(execution, running);
}
async function rejectClaim(
  execution: NodeDriveExecution,
  kind: DriveExecutionTarget["kind"],
  n: number,
) {
  let claims = 0;
  const result = await outcome(
    execution.withCaller(
      target(kind, n),
      async () => {
        claims++;
        return true;
      },
      async () => true,
    ),
  );
  expect(result).toBe("DRIVE_UNAVAILABLE");
  expect(claims).toBe(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Drive backup execution lane and real closure", () => {
  it("keeps source ACK evidence and its shared data slot until exact DB confirmation", async () => {
    const execution = new NodeDriveExecution("runtime");
    const source = await start(execution, "source", 1);
    await rejectClaim(execution, "backup", 2);
    await rejectClaim(execution, "source", 3);
    source.work.resolve("complete");
    expect(await source.callerOutcome).toBe("resolved");
    expect(await source.closed).toBe("resolved");
    const closure = execution.closure(source.target);
    if (closure.kind !== "closed") throw Error("SOURCE_CLOSURE");
    await expect(
      execution.confirmSourceAcknowledged(closure.proof),
    ).rejects.toBeDefined();
    await execution.acknowledge(closure.proof);
    expect(execution.closure(source.target).kind).toBe("closed");
    expect(execution.unacknowledged(2)).toHaveLength(1);
    await rejectClaim(execution, "backup", 4);
    await expect(
      execution.confirmSourceAcknowledged({
        ...closure.proof,
        evidenceId: "foreign",
      }),
    ).rejects.toBeDefined();
    await execution.acknowledge(closure.proof);
    await execution.confirmSourceAcknowledged(closure.proof);
    expect(execution.unacknowledged(2)).toHaveLength(0);
    const backup = await start(execution, "backup", 5);
    await rejectClaim(execution, "source", 6);
    await finish(execution, backup);
    await execution.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("admits one backup plus two control callers and rejects a fourth", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const control = await start(execution, "control", 2);
    const authorization = await start(execution, "authorization", 3);
    expect(execution.hasPendingCallers()).toBe(true);
    await rejectClaim(execution, "backup", 4);
    await rejectClaim(execution, "control", 5);
    await finish(execution, backup);
    await finish(execution, control);
    await finish(execution, authorization);
    expect(execution.hasPendingCallers()).toBe(false);
    expect(execution.accepting()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not lend unused control capacity to a second backup", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    await rejectClaim(execution, "backup", 2);
    const control = await start(execution, "control", 3);
    await finish(execution, backup);
    await finish(execution, control);
  });
  it("does not lend the backup lane to a third control", async () => {
    const execution = new NodeDriveExecution("runtime");
    const first = await start(execution, "control", 1);
    const second = await start(execution, "authorization", 2);
    await rejectClaim(execution, "control", 3);
    const backup = await start(execution, "backup", 4);
    await finish(execution, first);
    await finish(execution, second);
    await finish(execution, backup);
  });
  it("registers source plus HTTP for backup and preserves the one-resource control bound", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    const httpClosed = execution.register(backup.signal);
    expect(thrown(() => execution.register(backup.signal))).toBe(
      "DRIVE_UNAVAILABLE",
    );
    const control = await start(execution, "control", 2);
    const controlClosed = execution.register(control.signal);
    expect(thrown(() => execution.register(control.signal))).toBe(
      "DRIVE_UNAVAILABLE",
    );
    httpClosed();
    httpClosed();
    const nextHttpClosed = execution.register(backup.signal);
    expect(thrown(() => execution.register(backup.signal))).toBe(
      "DRIVE_UNAVAILABLE",
    );
    sourceClosed();
    nextHttpClosed();
    controlClosed();
    await finish(execution, backup);
    await finish(execution, control);
  });
  it("keeps a completed caller held until both resources close and proof is acknowledged", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    const httpClosed = execution.register(backup.signal);
    backup.work.resolve("complete");
    expect(await backup.callerOutcome).toBe("resolved");
    expect(execution.caller(backup.target)).toBe("ended");
    expect(execution.closure(backup.target).kind).toBe("held");
    await rejectClaim(execution, "backup", 2);
    httpClosed();
    expect(execution.closure(backup.target).kind).toBe("held");
    sourceClosed();
    expect(await backup.closed).toBe("resolved");
    expect(execution.accepting()).toBe(false);
    await rejectClaim(execution, "backup", 3);
    await acknowledge(execution, backup);
    expect(execution.caller(backup.target)).toBe("untracked");
    const next = await start(execution, "backup", 4);
    await finish(execution, next);
  });
  it("preserves an unknown resource after close timeout and frees it only after late real closure", async () => {
    const execution = new NodeDriveExecution("runtime", undefined, {
      operationMs: 100,
      backupMs: 100,
      closeMs: 5,
    });
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    backup.work.resolve("complete");
    await backup.callerOutcome;
    await vi.advanceTimersByTimeAsync(5);
    expect(await backup.closed).toBe("DRIVE_UNAVAILABLE");
    expect(execution.closure(backup.target).kind).toBe("held");
    expect(execution.unacknowledged(10)).toHaveLength(0);
    await rejectClaim(execution, "backup", 2);
    const control = await start(execution, "control", 3);
    await finish(execution, control);
    sourceClosed();
    expect(execution.closure(backup.target).kind).toBe("closed");
    await acknowledge(execution, backup);
    const next = await start(execution, "backup", 4);
    await finish(execution, next);
  });
  it("uses the independent backup deadline without extending control work", async () => {
    const execution = new NodeDriveExecution("runtime", undefined, {
      operationMs: 10,
      backupMs: 100,
      closeMs: 5,
    });
    const backup = await start(execution, "backup", 1);
    const control = await start(execution, "control", 2);
    await vi.advanceTimersByTimeAsync(10);
    expect(control.signal.aborted).toBe(true);
    expect(backup.signal.aborted).toBe(false);
    expect(await control.owned.result).toEqual({
      kind: "failure",
      code: "DRIVE_UNAVAILABLE",
      delivery: "unknown",
      credentialRejection: null,
    });
    await finish(execution, control);
    await vi.advanceTimersByTimeAsync(89);
    expect(backup.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(backup.signal.aborted).toBe(true);
    expect(await backup.owned.result).toEqual({
      kind: "failure",
      code: "DRIVE_UNAVAILABLE",
      delivery: "unknown",
      credentialRejection: null,
    });
    await finish(execution, backup);
  });
  it("defaults backup execution to thirty minutes", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    await vi.advanceTimersByTimeAsync(1_799_999);
    expect(backup.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(backup.signal.aborted).toBe(true);
    await finish(execution, backup);
  });
  it("rejects registration after abort without manufacturing close proof", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    backup.owned.abort();
    expect(backup.signal.aborted).toBe(true);
    expect(thrown(() => execution.register(backup.signal))).toBe(
      "DRIVE_UNAVAILABLE",
    );
    expect(execution.closure(backup.target).kind).toBe("held");
    sourceClosed();
    await finish(execution, backup);
  });
  it("stop aborts callers but waits for caller settlement and real resource closure", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    let stopped = false;
    const stopping = outcome(execution.stop()).then((result) => {
      stopped = true;
      return result;
    });
    expect(backup.signal.aborted).toBe(true);
    expect(execution.accepting()).toBe(false);
    await Promise.resolve();
    expect(stopped).toBe(false);
    sourceClosed();
    backup.work.resolve("complete");
    expect(await stopping).toBe("resolved");
    await backup.callerOutcome;
    expect(await backup.closed).toBe("resolved");
    await acknowledge(execution, backup);
    await rejectClaim(execution, "backup", 2);
  });
  it("stop reports a finite failure while an ended caller still owns a resource", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const sourceClosed = execution.register(backup.signal);
    backup.work.resolve("complete");
    await backup.callerOutcome;
    expect(await outcome(execution.stop())).toBe("DRIVE_UNAVAILABLE");
    expect(execution.closure(backup.target).kind).toBe("held");
    sourceClosed();
    expect(await backup.closed).toBe("resolved");
    await acknowledge(execution, backup);
  });
});

describe("Drive change subscribers do not become owners", () => {
  it("settles a pre-aborted subscriber without allocating a timer or owner", async () => {
    const execution = new NodeDriveExecution("runtime");
    const controller = new AbortController();
    controller.abort();
    expect(
      await execution.waitForChange(
        execution.changeRevision(),
        controller.signal,
      ),
    ).toBe("stopped");
    expect(execution.hasPendingCallers()).toBe(false);
    expect(execution.unacknowledged(100)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("handles immediate abort and unregisters its listener and timer", async () => {
    const execution = new NodeDriveExecution("runtime");
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const waiting = execution.waitForChange(
      execution.changeRevision(),
      controller.signal,
    );
    expect(vi.getTimerCount()).toBe(1);
    controller.abort();
    expect(await waiting).toBe("stopped");
    expect(removed).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("expires at thirty seconds, removes its listener and remains owner-free", async () => {
    const execution = new NodeDriveExecution("runtime");
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    let settled = false;
    const waiting = execution
      .waitForChange(execution.changeRevision(), controller.signal)
      .then((result) => {
        settled = true;
        return result;
      });
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await waiting).toBe("expired");
    expect(removed).toHaveBeenCalledTimes(1);
    expect(execution.hasPendingCallers()).toBe(false);
    expect(execution.accepting()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("caps subscribers at one hundred and reuses a slot only after cleanup", async () => {
    const execution = new NodeDriveExecution("runtime");
    const controllers = Array.from(
      { length: 100 },
      () => new AbortController(),
    );
    const pending = controllers.map((controller) =>
      execution.waitForChange(execution.changeRevision(), controller.signal),
    );
    expect(vi.getTimerCount()).toBe(100);
    expect(await execution.waitForChange(execution.changeRevision())).toBe(
      "expired",
    );
    expect(vi.getTimerCount()).toBe(100);
    controllers[0]!.abort();
    expect(await pending[0]).toBe("stopped");
    const replacement = execution.waitForChange(execution.changeRevision());
    expect(vi.getTimerCount()).toBe(100);
    await execution.stop();
    expect(
      (await Promise.all(pending)).every((result) => result === "stopped"),
    ).toBe(true);
    expect(await replacement).toBe("stopped");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("observes a prior revision immediately without allocating a timer", async () => {
    const execution = new NodeDriveExecution("runtime");
    const revision = execution.changeRevision();
    const backup = await start(execution, "backup", 1);
    await finish(execution, backup);
    expect(execution.changeRevision()).not.toBe(revision);
    expect(await execution.waitForChange(revision)).toBe("changed");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("broadcasts a real resource change and cleans all subscriber registrations", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const release = execution.register(backup.signal);
    const controller = new AbortController();
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const revision = execution.changeRevision();
    const waiting = execution.waitForChange(revision, controller.signal);
    const second = execution.waitForChange(revision);
    release();
    expect(await waiting).toBe("changed");
    expect(await second).toBe("changed");
    expect(removed).toHaveBeenCalledTimes(1);
    expect(execution.closure(backup.target).kind).toBe("held");
    await finish(execution, backup);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("subscriber cancellation never aborts the physical backup owner", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const controller = new AbortController();
    const waiting = execution.waitForChange(
      execution.changeRevision(),
      controller.signal,
    );
    controller.abort();
    expect(await waiting).toBe("stopped");
    expect(backup.signal.aborted).toBe(false);
    expect(execution.closure(backup.target).kind).toBe("held");
    await finish(execution, backup);
  });
  it("stop settles subscribers before waiting for physical work", async () => {
    const execution = new NodeDriveExecution("runtime");
    const backup = await start(execution, "backup", 1);
    const waiting = execution.waitForChange(execution.changeRevision());
    const stopping = outcome(execution.stop());
    expect(await waiting).toBe("stopped");
    expect(await execution.waitForChange(-1)).toBe("stopped");
    backup.work.resolve("complete");
    expect(await stopping).toBe("resolved");
    await backup.callerOutcome;
    expect(await backup.closed).toBe("resolved");
    await acknowledge(execution, backup);
    expect(vi.getTimerCount()).toBe(0);
  });
});

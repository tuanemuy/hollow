import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { SystemError } from "@repo/core/application/errors";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import type { MachineRegenerationRepository } from "@repo/core/application/regeneration/ports";
import type { MachineOwnedInput } from "@repo/core/application/regeneration/services";
import { sweepMachine } from "@repo/core/application/regeneration/worker";
import { machineRegenerationSchema } from "@repo/core/domain/regeneration/entity";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NodeLlmExecution } from "../llm/execution";
import { NodeRegenerationMemory } from "./memory";
import { createMachineRunner, NodeMachineProgress } from "./runner";

vi.mock("@repo/core/application/regeneration/worker", () => ({
  sweepMachine: vi.fn(),
}));

const sweep = vi.mocked(sweepMachine);
const unavailable = (): never => {
  throw Error("LOGICAL_RUNNER_UNUSED_PORT");
};
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}
function fixture(
  stop: () => Promise<void>,
  recovery?: Readonly<{
    unitOfWorkProvider: HollowUnitOfWorkProvider;
    input: NodeRegenerationMemory;
    progress: NodeMachineProgress;
    execution: NodeLlmExecution;
  }>,
): HollowContainer {
  return {
    appUrl: "http://localhost",
    clock: { now: () => new Date(0) },
    idGenerator: { next: unavailable, validate: unavailable },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    get unitOfWorkProvider() {
      return recovery?.unitOfWorkProvider ?? unavailable();
    },
    get passwordHasher() {
      return unavailable();
    },
    get tokens() {
      return unavailable();
    },
    get mailer() {
      return unavailable();
    },
    get htmlSanitizer() {
      return unavailable();
    },
    get pdfAnonymousTicketSigner() {
      return unavailable();
    },
    machine: {
      get input() {
        return recovery?.input ?? unavailable();
      },
      get local() {
        return unavailable();
      },
      get ownership() {
        return unavailable();
      },
      get extractor() {
        return unavailable();
      },
      progress: recovery?.progress ?? {
        admission: unavailable,
        admissions: unavailable,
        retainAdmission: unavailable,
        releaseAdmission: unavailable,
        owned: unavailable,
        inputs: () => [],
        retainInput: unavailable,
        releaseInput: unavailable,
        pendingCompletion: () => null,
        awaitCompletion: unavailable,
        confirmCompletion: unavailable,
      },
      execution: recovery?.execution ?? {
        runtimeId: "logical-runner",
        start: unavailable,
        active: unavailable,
        cancel: vi.fn(),
        stop,
        confirmClosed: unavailable,
      },
      wake: unavailable,
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  sweep.mockReset();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

it("stop before the initial microtask permits only recovery and caches its promise", async () => {
  const originalStop = vi.fn(async () => {});
  sweep.mockResolvedValue(undefined);
  const runner = createMachineRunner(fixture(originalStop));
  const one = runner.stop();
  expect(runner.stop()).toBe(one);
  await one;
  expect(originalStop).toHaveBeenCalledTimes(1);
  expect(sweep.mock.calls.length).toBeGreaterThan(0);
  expect(sweep.mock.calls.every(([, admit]) => admit === false)).toBe(true);
  const count = sweep.mock.calls.length;
  runner.wake();
  await vi.advanceTimersByTimeAsync(4000);
  expect(sweep.mock.calls.length).toBe(count);
  expect(vi.getTimerCount()).toBe(0);
});

it("drains an already-issued sweep and recovers late pending work while the original stop waits", async () => {
  const issued = gate();
  const originalDone = gate();
  let pending = false;
  const originalStop = vi.fn(() => {
    queueMicrotask(() => {
      pending = true;
    });
    return originalDone.promise;
  });
  sweep.mockImplementation(async (_container, admit) => {
    if (admit) await issued.promise;
    else if (pending) {
      pending = false;
      originalDone.resolve();
    }
  });
  const runner = createMachineRunner(fixture(originalStop));
  runner.wake();
  const one = runner.stop();
  expect(runner.stop()).toBe(one);
  expect(originalStop).not.toHaveBeenCalled();
  let stopped = false;
  const settled = one.then(() => {
    stopped = true;
  });
  issued.resolve();
  await vi.advanceTimersByTimeAsync(0);
  expect(originalStop).toHaveBeenCalledTimes(1);
  expect(stopped).toBe(false);
  expect(pending).toBe(true);
  await vi.advanceTimersByTimeAsync(2000);
  await settled;
  expect(stopped).toBe(true);
  expect(pending).toBe(false);
  expect(sweep.mock.calls[0]?.[1]).toBe(true);
  expect(sweep.mock.calls.slice(1).every(([, admit]) => admit === false)).toBe(
    true,
  );
  expect(vi.getTimerCount()).toBe(0);
});

it("retains a recovery error after later logical completion instead of accepting normal stop", async () => {
  const originalDone = gate();
  const failure = Error("LOGICAL_RECOVERY_FAILURE");
  let recovered = false;
  sweep.mockImplementation(async (_container, admit) => {
    expect(admit).toBe(false);
    if (!recovered) {
      recovered = true;
      throw failure;
    }
    originalDone.resolve();
  });
  const runner = createMachineRunner(fixture(() => originalDone.promise));
  const one = runner.stop();
  const rejected = expect(one).rejects.toBe(failure);
  await vi.advanceTimersByTimeAsync(2000);
  await rejected;
  expect(runner.stop()).toBe(one);
  expect(vi.getTimerCount()).toBe(0);
});

it("preserves the original execution stop rejection", async () => {
  const failure = Error("LOGICAL_ORIGINAL_STOP_FAILURE");
  sweep.mockResolvedValue(undefined);
  const runner = createMachineRunner(
    fixture(async () => {
      throw failure;
    }),
  );
  const one = runner.stop();
  await expect(one).rejects.toBe(failure);
  expect(runner.stop()).toBe(one);
  expect(vi.getTimerCount()).toBe(0);
});

async function ownedRecovery(readFailure?: SystemError) {
  const id = (n: number) =>
    `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const input = new NodeRegenerationMemory({ prepare: unavailable });
  const admission = input.reserveBegin({
    kind: "machine-regeneration",
    id: id(1),
  });
  input.bindBegin(admission, {
    consumer: admission.consumer,
    runtimeId: id(100),
    token: id(101),
    generation: 1,
    state: "active",
  });
  const lease = input.commitBegin(admission);
  const proof = input.finish(lease, id(102));
  input.consume(proof);
  const terminal = machineRegenerationSchema.parse({
    id: id(1),
    executorId: id(2),
    noteId: id(3),
    originalId: id(4),
    commandId: id(5),
    requestDigest: "a".repeat(64),
    access: { origin: "local-original", bindingId: null },
    sourceMemoryBytes: 0,
    inputReceipt: proof.receipt,
    source: { sha256: "b".repeat(64), bytes: 8, format: "html" },
    noteVersion: 0,
    ownershipGeneration: 1,
    originalRevisionNo: 1,
    previous: {
      state: "ready",
      coverage: "complete",
      activeJobId: id(6),
    },
    phase: "terminal",
    outcome: "failed",
    failure: "REGENERATION_INTERRUPTED",
    resultVersion: null,
    owner: { state: "closed", runtimeId: id(100), token: id(101) },
    cancelGeneration: 0,
    version: 2,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deadlineAt: new Date(120000),
    terminalAt: new Date(0),
  });
  const owned: MachineOwnedInput = {
    value: machineRegenerationSchema.parse({
      ...terminal,
      phase: "preparing",
      outcome: "pending",
      failure: null,
      owner: { ...terminal.owner, state: "active" },
      version: 1,
      terminalAt: null,
    }),
    lease,
    proof,
  };
  let confirmed = false;
  const verifyCompletion = vi.fn(
    async (value: MachineOwnedInput) =>
      confirmed && value.proof === proof && input.consumed(proof, value.lease),
  );
  const progress = new NodeMachineProgress(
    (value) => value.proof === proof && input.consumed(proof, value.lease),
    verifyCompletion,
  );
  progress.retainInput(owned);
  const repository: MachineRegenerationRepository = {
    candidate: unavailable,
    claimExact: unavailable,
    activeForNote: unavailable,
    owned: unavailable,
    page: unavailable,
    finishJob: unavailable,
    prune: unavailable,
    insert: unavailable,
    find: vi.fn(async (jobId: string) => {
      if (readFailure) throw readFailure;
      return jobId === terminal.id ? terminal : null;
    }),
    command: unavailable,
    replace: unavailable,
    remove: unavailable,
  };
  const context = new Proxy({} as HollowUnitOfWorkContext, {
    get(_target, property) {
      return property === "machineRegenerations" ? repository : unavailable();
    },
  });
  const unitOfWorkProvider: HollowUnitOfWorkProvider = {
    run: (work) => work(context),
  };
  const execution = new NodeLlmExecution(
    {
      runtimeId: id(100),
      assertReady: () => {},
      predecessors: () => [],
      acknowledge: async () => {},
    },
    { now: () => new Date(0) },
  );
  let workSettled = false;
  let signal: AbortSignal | null = null;
  expect(
    execution.start(
      owned.value.id,
      owned.value.executorId,
      terminal.deadlineAt,
      async (currentSignal) => {
        signal = currentSignal;
        await progress.awaitCompletion(owned);
        progress.releaseInput(owned.value.id);
        workSettled = true;
      },
    ),
  ).toBe(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(progress.pendingCompletion(owned.value.id)).toBe(owned);
  const { sweepMachine: actualSweep } = await vi.importActual<
    typeof import("@repo/core/application/regeneration/worker")
  >("@repo/core/application/regeneration/worker");
  sweep.mockImplementation(actualSweep);
  const container = fixture(() => execution.stop(), {
    unitOfWorkProvider,
    input,
    progress,
    execution,
  });
  return {
    runner: createMachineRunner(container),
    verifyCompletion,
    progress,
    execution,
    input,
    owned,
    proof,
    retained() {
      expect(progress.owned(owned.value.id)).toBe(owned);
      expect(progress.pendingCompletion(owned.value.id)).toBe(owned);
      expect(input.consumed(proof, lease)).toBe(true);
      expect(execution.active(owned.value.id)).toBe(true);
      expect(workSettled).toBe(false);
      expect(signal?.aborted).toBe(true);
    },
    async confirm() {
      confirmed = true;
      expect(await progress.confirmCompletion(owned)).toBe(true);
      await execution.stop();
    },
  };
}

it("reports a recovery repository failure without waiting forever for an owned completion", async () => {
  const failure = new SystemError(
    "DATABASE_ERROR",
    "Synthetic recovery read failure",
  );
  const f = await ownedRecovery(failure);
  let finished = false;
  let stopError: unknown;
  const stopping = f.runner.stop();
  const observed = stopping.then(
    () => {
      finished = true;
    },
    (error: unknown) => {
      finished = true;
      stopError = error;
    },
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    f.retained();
    expect(f.verifyCompletion).not.toHaveBeenCalled();
    expect(finished).toBe(true);
    expect(stopError).toBe(failure);
    expect(f.runner.stop()).toBe(stopping);
    expect(vi.getTimerCount()).toBe(1);
  } finally {
    await f.confirm();
    await observed;
  }
  expect(vi.getTimerCount()).toBe(0);
});

it("reports unproven completion verification without releasing the owned waiter", async () => {
  const f = await ownedRecovery();
  let finished = false;
  let stopError: unknown;
  const stopping = f.runner.stop();
  const observed = stopping.then(
    () => {
      finished = true;
    },
    (error: unknown) => {
      finished = true;
      stopError = error;
    },
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    f.retained();
    expect(f.verifyCompletion).toHaveBeenCalledWith(f.owned);
    expect(finished).toBe(true);
    expect(stopError).toBeInstanceOf(LlmOperationError);
    expect(stopError).toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    expect(f.runner.stop()).toBe(stopping);
    expect(vi.getTimerCount()).toBe(1);
  } finally {
    await f.confirm();
    await observed;
  }
  expect(vi.getTimerCount()).toBe(0);
});

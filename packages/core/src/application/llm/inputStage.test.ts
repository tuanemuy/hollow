import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import type { LlmFixedConversion } from "@repo/core/domain/llm/entity";
import { describe, expect, it } from "vitest";
import type { HollowContainer } from "../di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "../execution/hollowUnitOfWork";
import {
  candidateOutcome,
  driveLlmData,
  driveLlmOutcome,
  driveLlmTerminalSaved,
  leasedDrive,
  leasedText,
  queuedCancellationFence,
  sameDrivePrewrite,
  sameInputReceipt,
  sameInputSource,
} from "./inputStage";
import type { DriveLlmPrewrite, DriveLlmTerminalCall } from "./ports";

const id = (n: number) =>
  `80000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-10-06T00:00:00Z");
const value: Extract<LlmFixedConversion, { preparationVersion: 1 }> = {
  jobId: id(1),
  accountId: id(2),
  noteId: id(3),
  commandId: id(4),
  requestDigest: "a".repeat(64),
  operation: "regenerate",
  retryOf: null,
  sourceState: "ready",
  sourceCoverage: "complete",
  noteVersion: 0,
  originalRevisionNo: 1,
  credentialEpoch: 1,
  instruction: "整える",
  admissionSequence: 1,
  createdAt: now,
  updatedAt: now,
  deadlineAt: new Date(now.getTime() + 60_000),
  version: 1,
  owner: { state: "idle", runtimeId: null, token: null },
  cancelGeneration: 0,
  responseBudget: 0,
  access: { origin: "local-original", bindingId: null },
  sourceMemoryBytes: 0,
  inputReceipt: null,
  selection: "fixed",
  modelId: "fixture/text",
  phase: "queued",
  outcome: { kind: "pending" },
  source: {
    kind: "original",
    originalId: id(5),
    sha256: "b".repeat(64),
    bytes: 1,
    format: "text",
  },
  preparationVersion: 1,
  promptVersion: 1,
  pdfProof: null,
  sourceOwnershipGeneration: null,
};
function closedWorld<T extends object>(values: Partial<T>): T {
  return new Proxy(values, {
    get(target, key) {
      if (!Object.hasOwn(target, key))
        throw new Error("UNEXPECTED_PORT_ACCESS");
      return Reflect.get(target, key);
    },
  }) as T;
}
const u = closedWorld<HollowUnitOfWorkContext>({});
const provider: HollowUnitOfWorkProvider = { run: (work) => work(u) };

function completionData() {
  const closed: Extract<LlmFixedConversion, { preparationVersion: 1 }> = {
    ...value,
    source: { ...value.source, format: "html" },
    access: { origin: "drive-record", bindingId: id(20) },
    phase: "response-ready",
    version: 10,
    owner: { state: "active", runtimeId: id(6), token: id(7) },
    inputReceipt: {
      consumer: { kind: "llm-conversion", id: value.jobId },
      runtimeId: id(6),
      token: id(7),
      generation: 1,
      state: "closed",
      proofId: id(21),
    },
  };
  const epoch = now.getTime();
  const before: DriveLlmPrewrite = {
    conversion: driveLlmData(closed),
    job: {
      id: value.jobId,
      originalId: value.source.originalId,
      accountId: value.accountId,
      noteId: value.noteId,
      noteVersion: value.noteVersion,
      batchId: id(22),
      useAi: true,
      createdAt: epoch,
      updatedAt: epoch,
      attempt: 0,
      retryOf: null,
      state: "running",
      leaseToken: id(7),
      leaseUntil: epoch + 1000,
      failure: null,
    },
    dispatches: [
      {
        id: id(23),
        jobId: value.jobId,
        ordinal: 0,
        runtimeId: id(6),
        ownerToken: id(7),
        input: { kind: "prepared-segment", sha256: "c".repeat(64), ordinal: 0 },
        state: "intent",
        intentAt: epoch,
        response: null,
      },
    ],
    quota: {
      jobId: value.jobId,
      accountId: value.accountId,
      month: "2026-10",
      createdAt: epoch,
      updatedAt: epoch,
      firstIntentAt: epoch,
      state: "consumed",
    },
    original: {
      id: value.source.originalId,
      noteId: value.noteId,
      accountId: value.accountId,
      name: "logical.html",
      bytes: 1,
      sha256: value.source.sha256,
      format: "html",
      storageKey: "logical",
      state: "processing",
      coverage: "complete",
      activeJobId: value.jobId,
      createdAt: epoch,
    },
    binding: {
      id: id(20),
      recordId: id(24),
      executorId: value.accountId,
      credentialOwnerId: id(25),
      noteId: value.noteId,
      originalId: value.source.originalId,
      subject: "logical",
      driveEpoch: 1,
      ownershipGeneration: 1,
      fingerprint: value.requestDigest,
      consumer: { kind: "llm-conversion", id: value.jobId },
      cancelGeneration: 0,
      version: 1,
      createdAt: epoch,
    },
  };
  const call: DriveLlmTerminalCall = {
    base: before.conversion,
    outcome: { kind: "failed", code: "LLM_UNAVAILABLE" },
    epochMs: epoch + 1,
    quota: before.quota,
    dispatches: before.dispatches.map((d) => ({
      ...d,
      state: "not-sent",
      intentAt: epoch,
      response: null,
    })),
  };
  if (call.base.owner.state !== "active")
    throw new Error("fixture owner is not active");
  const saved: DriveLlmPrewrite = {
    ...before,
    conversion: {
      ...call.base,
      owner: { ...call.base.owner, state: "closed" },
      phase: "terminal",
      outcome: call.outcome,
      version: 11,
      responseBudget: 0,
      updatedAt: call.epochMs,
    },
    job: {
      ...before.job,
      state: "failed",
      failure: "LLM_UNAVAILABLE",
      leaseToken: null,
      leaseUntil: null,
      updatedAt: call.epochMs,
    },
    dispatches: call.dispatches,
    quota: { ...before.quota, state: "released", updatedAt: call.epochMs },
  };
  return { before, call, saved };
}
describe("Drive completion data predicates, without native closure capabilities", () => {
  it("separates first-write rollback from fail-after quota inputs", () => {
    const { before, call, saved } = completionData();
    expect(driveLlmTerminalSaved(saved, before, call)).toBe(true);
    expect(
      sameDrivePrewrite(before, { ...before, dispatches: call.dispatches }),
    ).toBe(false);
    expect(sameDrivePrewrite(before, saved)).toBe(false);
    expect(
      driveLlmTerminalSaved({ ...saved, quota: before.quota }, before, call),
    ).toBe(false);
  });
  it("does not accept same-token terminals with an unrecorded version, outcome or clock", () => {
    const { before, call, saved } = completionData();
    expect(
      driveLlmTerminalSaved(
        { ...saved, conversion: { ...saved.conversion, version: 12 } },
        before,
        call,
      ),
    ).toBe(false);
    expect(
      driveLlmTerminalSaved(saved, before, {
        ...call,
        epochMs: call.epochMs + 1,
      }),
    ).toBe(false);
    expect(
      driveLlmTerminalSaved(saved, before, {
        ...call,
        outcome: { kind: "cancelled" },
      }),
    ).toBe(false);
  });
  it("requires all prewrite domains while terminal confirmation keeps immutable source identity separate from later cancellation", () => {
    const { before, call, saved } = completionData();
    const changed = {
      ...before,
      binding: { ...before.binding, cancelGeneration: 1, version: 2 },
    };
    expect(sameDrivePrewrite(before, changed)).toBe(false);
    expect(
      sameDrivePrewrite(before, {
        ...before,
        original: { ...before.original, state: "ready" },
      }),
    ).toBe(false);
    expect(
      driveLlmTerminalSaved(
        { ...saved, binding: changed.binding },
        before,
        call,
      ),
    ).toBe(true);
    expect(
      driveLlmTerminalSaved(
        { ...saved, binding: { ...saved.binding, ownershipGeneration: 2 } },
        before,
        call,
      ),
    ).toBe(false);
  });
  it("never admits ownership or delivery unknown as failed terminal evidence", () => {
    expect(() =>
      driveLlmOutcome({ kind: "failed", code: "LLM_OWNERSHIP_UNKNOWN" }),
    ).toThrow();
    expect(() =>
      driveLlmOutcome({ kind: "failed", code: "LLM_DELIVERY_UNKNOWN" }),
    ).toThrow();
    expect(
      driveLlmOutcome({ kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" }),
    ).toEqual({ kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" });
    expect(leasedDrive(value)).toBe(false);
  });
});
function reservation() {
  const memory = new NodeRegenerationMemory({
    prepare: async () => {
      throw new Error("UNEXPECTED_PREPARE");
    },
  });
  const admission = memory.reserveBegin({
    kind: "llm-conversion",
    id: value.jobId,
  });
  memory.bindBegin(admission, {
    consumer: admission.consumer,
    runtimeId: id(6),
    token: id(7),
    generation: 1,
    state: "active",
  });
  return { memory, admission };
}
describe("S3-P input admission and exact fences", () => {
  it("S3-P01 releases only a first no-claim after the enclosing transaction resolves", async () => {
    const { memory, admission } = reservation();
    let commit!: () => void;
    const committed: HollowUnitOfWorkProvider = {
      run: async (work) => {
        const result = await work(u);
        await new Promise<void>((resolve) => {
          commit = resolve;
        });
        return result;
      },
    };
    const pending = memory.claimTransaction(admission, committed, async () => ({
      kind: "no-claim",
    }));
    await Promise.resolve();
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    commit();
    await pending;
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("reserved");
  });
  it("S3-P02 keeps unknown replay false and capacity occupied", async () => {
    const { memory, admission } = reservation();
    await expect(
      memory.claimTransaction(
        admission,
        {
          run: async () => {
            throw new Error("COMMIT_UNKNOWN");
          },
        },
        async () => ({ kind: "no-claim" }),
      ),
    ).rejects.toThrow("COMMIT_UNKNOWN");
    await memory.claimTransaction(admission, provider, async () => ({
      kind: "no-claim",
    }));
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    memory.reserveBegin({ kind: "llm-conversion", id: id(30) });
    expect(
      memory.tryReserveBegin({ kind: "llm-conversion", id: id(31) }).kind,
    ).toBe("busy");
  });
  it("S3-P03 migrates the same unknown admission to one lease after saved equality or replay fence", async () => {
    const { memory, admission } = reservation();
    memory.holdBegin(admission);
    const result = await memory.claimTransaction(
      admission,
      provider,
      async () => ({ kind: "claimed", value }),
    );
    expect(result.lease?.receipt.generation).toBe(1);
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    await expect(
      memory.claimTransaction(admission, provider, async () => ({
        kind: "claimed",
        value,
      })),
    ).rejects.toThrow();
  });
  it("S3-P04 releases an unknown admission only after the terminal version fence commits", async () => {
    const { memory, admission } = reservation();
    memory.holdBegin(admission);
    await expect(
      memory.claimTransaction(
        admission,
        {
          run: async () => {
            throw new Error("TERMINAL_COMMIT_UNKNOWN");
          },
        },
        async () => ({ kind: "fenced" }),
      ),
    ).rejects.toThrow();
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    await memory.claimTransaction(admission, provider, async () => ({
      kind: "fenced",
    }));
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("reserved");
  });
  it("S3-P05 rejects copied admissions and second settles without touching the authentic reservation", async () => {
    const { memory, admission } = reservation();
    await expect(
      memory.claimTransaction({ ...admission }, provider, async () => ({
        kind: "no-claim",
      })),
    ).rejects.toThrow();
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    await memory.claimTransaction(admission, provider, async () => ({
      kind: "no-claim",
    }));
    const second = memory.reserveBegin(admission.consumer);
    await expect(
      memory.claimTransaction(admission, provider, async () => ({
        kind: "no-claim",
      })),
    ).rejects.toThrow();
    memory.holdBegin(second);
  });
  it("S3-P06 closes cancelled and expired candidates without requesting current permission or a reader", async () => {
    const c = closedWorld<HollowContainer>({ clock: { now: () => now } });
    expect(
      await candidateOutcome(c, u, { ...value, cancelGeneration: 1 }),
    ).toEqual({ kind: "cancelled" });
    expect(await candidateOutcome(c, u, { ...value, deadlineAt: now })).toEqual(
      { kind: "failed", code: "LLM_TIMEOUT" },
    );
  });
  it("S3-P07 confines source equality and new leases to local fixed text", () => {
    expect(leasedText(value)).toBe(true);
    expect(
      leasedText({
        ...value,
        access: { origin: "drive-record", bindingId: id(10) },
      }),
    ).toBe(false);
    expect(sameInputSource(value, { ...value, version: 10 })).toBe(true);
    expect(sameInputSource(value, { ...value, noteVersion: 1 })).toBe(false);
    expect(
      sameInputSource(value, {
        ...value,
        source: { ...value.source, sha256: "c".repeat(64) },
      }),
    ).toBe(false);
    expect(sameInputReceipt(null, null)).toBe(true);
  });
  it("S3-P08 accepts only the exact queued cancellation transition and retains unknown capacity if its acknowledgement is lost", async () => {
    const cancelled: LlmFixedConversion = {
      ...value,
      phase: "terminal",
      outcome: { kind: "cancelled" },
      cancelGeneration: value.cancelGeneration + 1,
      version: value.version + 1,
    };
    expect(queuedCancellationFence(value, cancelled)).toBe(true);
    expect(
      queuedCancellationFence(value, {
        ...cancelled,
        version: cancelled.version + 1,
      }),
    ).toBe(false);
    expect(
      queuedCancellationFence(value, { ...cancelled, noteVersion: 1 }),
    ).toBe(false);
    expect(
      queuedCancellationFence(value, {
        ...cancelled,
        outcome: { kind: "failed", code: "LLM_UNAVAILABLE" },
      }),
    ).toBe(false);
    const { memory, admission } = reservation();
    memory.holdBegin(admission);
    await expect(
      memory.claimTransaction(
        admission,
        {
          run: async (work) => {
            await work(u);
            throw new Error("CANCELLED_FENCE_RESPONSE_UNKNOWN");
          },
        },
        async () => ({ kind: "cancelled-fence" }),
      ),
    ).rejects.toThrow("CANCELLED_FENCE_RESPONSE_UNKNOWN");
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("busy");
    await memory.claimTransaction(admission, provider, async () => ({
      kind: "cancelled-fence",
    }));
    expect(memory.tryReserveBegin(admission.consumer).kind).toBe("reserved");
  });
});

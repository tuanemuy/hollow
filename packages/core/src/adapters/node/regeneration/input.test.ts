import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import {
  type LlmLegacyPreparedSource,
  LlmOperationError,
  type LlmSourcePreparer,
} from "@repo/core/application/llm/ports";
import type {
  ActiveInputReceipt,
  RegenerationServices,
  SourceInputLease,
} from "@repo/core/application/regeneration/services";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import type { LlmConversionRepository } from "@repo/core/domain/llm/repositories";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeRegenerationInput } from "./input";
import { NodeRegenerationMemory } from "./memory";

vi.mock("@repo/core/application/llm/current", () => ({
  currentLlmSource: vi.fn(async () => undefined),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const id = (n: number) =>
  `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const receipt = (n = 1) => ({
  consumer: { kind: "machine-regeneration" as const, id: id(n) },
  runtimeId: id(100),
  token: id(n + 100),
  generation: 1,
  state: "active" as const,
});
const source = {
  kind: "original" as const,
  originalId: id(300),
  sha256: "a".repeat(64),
  bytes: 1,
  format: "html" as const,
};
const result: LlmLegacyPreparedSource = {
  kind: "text-blocks",
  preparationVersion: 1,
  segments: [],
  blocks: 0,
  notices: [],
  media: [],
};
describe("S3-P local input lifetime", () => {
  it("S3-P08 preserves source media and only returns idle references after preparation", async () => {
    const media = [
      {
        sourceUrl: "https://fixture.invalid/image.png",
        placeholder: `[[hollow-media:${id(42)}]]`,
      },
    ];
    const m = fixture(async (input) => {
      expect(input.preparationVersion).toBe(1);
      expect(input.media).toEqual(media);
      return result;
    });
    const lease = open(m, receipt());
    bytes(m, lease);
    await m.prepareText(lease, source, new AbortController().signal, media);
    const proof = m.finish(lease, id(501));
    expect(m.tryReserveBegin(lease.receipt.consumer).kind).toBe("busy");
    m.consume(proof);
    expect(m.tryReserveBegin(lease.receipt.consumer).kind).toBe("reserved");
  });
  it("S3-P09 discards acquired idle bytes after abort but refuses reading, busy and unknown references", async () => {
    let done!: (value: LlmLegacyPreparedSource) => void;
    const m = fixture(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const lease = open(m, receipt());
    m.startRead(lease);
    expect(() => m.discard(lease)).toThrow();
    m.adopt(lease, new Uint8Array([1]));
    m.endRead(lease);
    const pending = m.prepareText(lease, source, new AbortController().signal);
    expect(() => m.discard(lease)).toThrow();
    done(result);
    await pending;
    m.unknown(lease);
    expect(() => m.discard(lease)).toThrow();
    const other = open(m, receipt(2));
    bytes(m, other);
    m.discard(other);
    expect(m.finish(other, id(502)).receipt.state).toBe("closed");
  });
  it("S3-P10 retains global capacity for both admissions and unconsumed closed proofs", () => {
    const m = fixture();
    const lease = open(m, receipt());
    m.finish(lease, id(501));
    const second = m.tryReserveBegin(receipt(2).consumer);
    expect(second.kind).toBe("reserved");
    expect(m.tryReserveBegin(receipt(3).consumer).kind).toBe("busy");
    expect(m.owns({ ...lease })).toBe(false);
    expect(m.owns(lease)).toBe(false);
  });
});
function fixture(prepare: LlmSourcePreparer["prepare"] = async () => result) {
  return new NodeRegenerationMemory({ prepare });
}
function open(memory: NodeRegenerationMemory, value: ActiveInputReceipt) {
  const admission = memory.reserveBegin(value.consumer);
  try {
    memory.bindBegin(admission, value);
    return memory.commitBegin(admission);
  } catch (error) {
    memory.holdBegin(admission);
    throw error;
  }
}
function bytes(memory: NodeRegenerationMemory, lease: SourceInputLease) {
  memory.startRead(lease);
  memory.adopt(lease, new Uint8Array([1]));
  memory.endRead(lease);
}
describe("owned regeneration input", () => {
  it("limits two reservations without allocating 50MiB and rejects duplicate consumers", () => {
    const m = fixture();
    const a = open(m, receipt());
    open(m, receipt(2));
    expect(() => open(m, receipt(3))).toThrow();
    expect(() => open(m, receipt())).toThrow();
    const proof = m.finish(a, id(501));
    m.consume(proof);
    expect(open(m, receipt(3))).toBeDefined();
  });
  it("keeps identity opaque across leases, proofs and runtimes", () => {
    const m = fixture();
    const a = open(m, receipt());
    expect(() => m.finish({ ...a }, id(501))).toThrow();
    const p = m.finish(a, id(501));
    expect(m.verify({ ...p }, a.receipt)).toBe(false);
    expect(m.verify(p, { ...a.receipt, token: id(9) })).toBe(false);
    expect(m.verify(p, { ...a.receipt, generation: 2 })).toBe(false);
    expect(fixture().verify(p, a.receipt)).toBe(false);
    expect(m.verify(p, a.receipt)).toBe(true);
    m.consume(p);
    expect(m.verify(p, p.receipt)).toBe(false);
  });
  it("blocks overlap and release while source or consumer holds bytes", async () => {
    let done!: (value: LlmLegacyPreparedSource) => void;
    const m = fixture(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const a = open(m, receipt());
    m.startRead(a);
    expect(() => m.startRead(a)).toThrow();
    expect(() => m.finish(a, id(501))).toThrow();
    m.adopt(a, new Uint8Array([1]));
    m.endRead(a);
    expect(() => m.finish(a, id(501))).toThrow();
    const preparing = m.prepareText(a, source, new AbortController().signal);
    expect(() => m.startRead(a)).toThrow();
    expect(() => m.finish(a, id(501))).toThrow();
    done(result);
    await preparing;
    expect(m.finish(a, id(501))).toBeDefined();
  });
  it("allows sequential reads in one generation only after input ends", async () => {
    const m = fixture();
    const a = open(m, receipt());
    for (let i = 0; i < 2; i++) {
      bytes(m, a);
      await m.prepareText(a, source, new AbortController().signal);
    }
    expect(a.receipt.generation).toBe(1);
    const p = m.finish(a, id(501));
    expect(m.finish(a, id(501))).toBe(p);
    expect(() => m.startRead(a)).toThrow();
  });
  it("closed failure frees references but unknown failure keeps the reservation", async () => {
    const safe = fixture(async () => {
      throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
    });
    const a = open(safe, receipt());
    bytes(safe, a);
    await expect(
      safe.prepareText(a, source, new AbortController().signal),
    ).rejects.toBeDefined();
    expect(safe.finish(a, id(501))).toBeDefined();
    const unknown = fixture(async () => {
      throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
    });
    const b = open(unknown, receipt());
    bytes(unknown, b);
    await expect(
      unknown.prepareText(b, source, new AbortController().signal),
    ).rejects.toBeDefined();
    expect(() => unknown.finish(b, id(501))).toThrow();
    expect(() => unknown.startRead(b)).toThrow();
  });
  it("retains proof until explicit consumption and rejects invalid receipts", () => {
    const m = fixture();
    const a = open(m, receipt());
    const proof = m.finish(a, id(501));
    expect(m.verify(proof, proof.receipt)).toBe(true);
    expect(m.verify(proof, proof.receipt)).toBe(true);
    expect(() => open(m, { ...receipt(2), state: "unknown" })).toThrow();
    expect(() => open(m, { ...receipt(2), generation: 0 })).toThrow();
    m.consume(proof);
    expect(() => m.consume(proof)).toThrow();
  });
});

const unusedDriveClosePort = (): never => {
  throw new Error("DRIVE_CLOSE_UNUSED_PORT");
};

async function driveCloseFixture() {
  let saved: LlmConversion = {
    source,
    access: { origin: "drive-record", bindingId: id(400) },
    sourceMemoryBytes: 0,
    inputReceipt: null,
    jobId: id(1),
    accountId: id(2),
    noteId: id(3),
    commandId: id(4),
    requestDigest: "b".repeat(64),
    operation: "regenerate",
    retryOf: null,
    sourceState: "ready",
    sourceCoverage: "complete",
    noteVersion: 0,
    originalRevisionNo: 1,
    credentialEpoch: 1,
    instruction: "",
    admissionSequence: 1,
    createdAt: new Date(0),
    deadlineAt: new Date(120000),
    updatedAt: new Date(0),
    owner: { state: "idle", runtimeId: null, token: null },
    cancelGeneration: 0,
    responseBudget: 0,
    version: 1,
    selection: "fixed",
    modelId: "fixture/model",
    phase: "queued",
    outcome: { kind: "pending" },
    preparationVersion: 1,
    promptVersion: 1,
    pdfProof: null,
    sourceOwnershipGeneration: null,
  };
  const claimExact: LlmConversionRepository["claimExact"] = vi.fn(
    async (input: Parameters<LlmConversionRepository["claimExact"]>[0]) => {
      const {
        candidate,
        runtimeId,
        ownerToken,
        receipt: inputReceipt,
        now,
      } = input;
      if (candidate.selection !== "fixed") return unusedDriveClosePort();
      expect(candidate).toBe(saved);
      expect(inputReceipt?.state).toBe("active");
      saved = {
        ...candidate,
        phase: "preparing",
        owner: { state: "active", runtimeId, token: ownerToken },
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
        inputReceipt,
        version: candidate.version + 1,
        updatedAt: now,
      };
      return saved;
    },
  );
  const repository: LlmConversionRepository = {
    insert: unusedDriveClosePort,
    find: async (jobId) => (jobId === saved.jobId ? saved : null),
    command: unusedDriveClosePort,
    activeForNote: unusedDriveClosePort,
    replace: unusedDriveClosePort,
    sealPdf: unusedDriveClosePort,
    claim: unusedDriveClosePort,
    claimCandidate: async () => saved,
    claimExact,
    owned: unusedDriveClosePort,
    admission: unusedDriveClosePort,
    admit: unusedDriveClosePort,
    queued: unusedDriveClosePort,
    cancelAccount: unusedDriveClosePort,
    cancelNote: unusedDriveClosePort,
    cancelScopeActor: unusedDriveClosePort,
    prune: unusedDriveClosePort,
  };
  const context = new Proxy({} as HollowUnitOfWorkContext, {
    get(_target, property) {
      return property === "llmConversions"
        ? repository
        : unusedDriveClosePort();
    },
  });
  const unitOfWorkProvider: HollowUnitOfWorkProvider = {
    run: (work) => work(context),
  };
  const container = new Proxy({} as HollowContainer, {
    get(_target, property) {
      if (property === "unitOfWorkProvider") return unitOfWorkProvider;
      if (property === "clock") return { now: () => new Date(0) };
      if (property === "idGenerator")
        return { next: () => id(101), validate: unusedDriveClosePort };
      return unusedDriveClosePort();
    },
  });
  const memory = fixture();
  const services: RegenerationServices = {
    input: memory,
    local: { read: unusedDriveClosePort },
    provider: {
      read: unusedDriveClosePort,
      inspect: unusedDriveClosePort,
    },
    get drive() {
      return unusedDriveClosePort();
    },
  };
  const stage = new NodeRegenerationInput(container, services);
  stage.configureRuntime(id(100));
  const claim = await stage.claim();
  if (!claim?.lease) throw new Error("DRIVE_CLOSE_LEASE_MISSING");
  expect(stage.lease(claim.value)).toBe(claim.lease);
  expect(memory.activeInputs()).toBe(1);
  expect(memory.owns(claim.lease)).toBe(true);
  return {
    stage,
    memory,
    claim: { value: claim.value, lease: claim.lease },
    saved: () => saved,
  };
}

async function drainCloseMicrotasks() {
  for (let index = 0; index < 16; index++) await Promise.resolve();
}

describe("Drive input closure ownership", () => {
  it.each([
    "final-check-unclosed",
    "input-proof-unproven",
  ] as const)("%s rejects closure finitely and retains the pending lease", async (failure) => {
    const { stage, memory, claim, saved } = await driveCloseFixture();
    const finish = vi.spyOn(memory, "finish");
    let releaseCheck!: () => void;
    const check = new Promise<void>((resolve) => {
      releaseCheck = resolve;
    });
    const authority = new LlmOperationError(
      "LLM_OWNERSHIP_UNKNOWN",
      "possible",
      false,
    );
    const finalCheck = vi.spyOn(stage, "finalCheck");
    if (failure === "final-check-unclosed")
      finalCheck.mockImplementation(async (lease) => {
        memory.unknown(lease);
        throw authority;
      });
    else finalCheck.mockReturnValue(check);
    const signal = new AbortController().signal;
    const closed = stage.finalizeDrive(claim.value, signal);
    let finished = false;
    let closureError: unknown;
    const rejected = vi.fn((error: unknown) => {
      finished = true;
      closureError = error;
    });
    void closed.then(() => {
      finished = true;
    }, rejected);
    if (failure === "input-proof-unproven") {
      memory.unknown(claim.lease);
      releaseCheck();
    }
    await drainCloseMicrotasks();
    expect(finalCheck).toHaveBeenCalledWith(claim.lease, signal);
    expect(stage.finalizeDrive(claim.value, signal)).toBe(closed);
    expect(memory.activeInputs()).toBe(1);
    expect(memory.tryReserveBegin(claim.lease.receipt.consumer).kind).toBe(
      "busy",
    );
    expect(saved()).toBe(claim.value);
    expect(saved().owner.state).toBe("active");
    expect(saved().sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
    expect(saved().inputReceipt).toEqual(claim.lease.receipt);
    if (failure === "final-check-unclosed") {
      expect(finish).not.toHaveBeenCalled();
    } else {
      expect(finish).toHaveBeenCalledOnce();
      expect(finish.mock.results[0]?.type).toBe("throw");
    }
    expect(memory.owns(claim.lease)).toBe(false);
    expect(stage.lease(claim.value)).toBeNull();
    expect(() => memory.finish(claim.lease, id(501))).toThrow();
    await expect(stage.stop()).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    expect(finished).toBe(true);
    expect(rejected).toHaveBeenCalledOnce();
    expect(closureError).toBeInstanceOf(LlmOperationError);
    expect(closureError).toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    await stage.recoverDriveCompletions();
    await drainCloseMicrotasks();
    expect(rejected).toHaveBeenCalledOnce();
    expect(stage.finalizeDrive(claim.value, signal)).toBe(closed);
    expect(memory.activeInputs()).toBe(1);
  });
});

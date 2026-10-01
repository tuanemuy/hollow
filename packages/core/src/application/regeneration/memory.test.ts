import {
  machineRegenerationSchema,
  parseRegeneration,
  type SourceAttempt,
  sourceAttemptSchema,
} from "@repo/core/domain/regeneration/entity";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { describe, expect, it, vi } from "vitest";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { finishInput } from "./memory";
import type {
  RegenerationInput,
  RegenerationServices,
  SourceInputProof,
} from "./services";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-10-01T00:00:00.000Z");
function closedWorld<T extends object>(values: Partial<T>): T {
  return new Proxy(values, {
    get(target, key) {
      if (!Object.hasOwn(target, key))
        throw new Error("UNEXPECTED_PORT_ACCESS");
      return Reflect.get(target, key);
    },
    set() {
      throw new Error("UNEXPECTED_PORT_WRITE");
    },
  }) as T;
}
function fixture() {
  const receipt = {
    consumer: { kind: "machine-regeneration" as const, id: id(1) },
    runtimeId: id(2),
    token: id(3),
    generation: 1,
    state: "active" as const,
  };
  let row = parseRegeneration(machineRegenerationSchema, {
    id: id(1),
    executorId: id(4),
    noteId: id(5),
    originalId: id(6),
    commandId: id(7),
    requestDigest: "a".repeat(64),
    access: { origin: "local-original", bindingId: null },
    sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    inputReceipt: receipt,
    source: { sha256: "b".repeat(64), bytes: 1, format: "html" },
    noteVersion: 0,
    ownershipGeneration: 1,
    originalRevisionNo: 1,
    previous: { state: "ready", coverage: "complete", activeJobId: id(8) },
    phase: "acquiring",
    outcome: "pending",
    failure: null,
    resultVersion: null,
    owner: {
      state: "active",
      runtimeId: receipt.runtimeId,
      token: receipt.token,
    },
    cancelGeneration: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deadlineAt: new Date(now.getTime() + 60_000),
    terminalAt: null,
  });
  const proof: SourceInputProof = {
    receipt: { ...receipt, state: "closed", proofId: id(9) },
  };
  const issued = new Set<SourceInputProof>([proof]);
  const state: {
    write: "ok" | "conflict" | "stored-unknown";
    attempts: readonly SourceAttempt[];
  } = { write: "ok", attempts: [] };
  const replace = vi.fn<
    HollowUnitOfWorkContext["machineRegenerations"]["replace"]
  >(async (next, version) => {
    expect(version).toBe(row.version);
    if (state.write === "conflict") return false;
    row = parseRegeneration(machineRegenerationSchema, next);
    if (state.write === "stored-unknown")
      throw new Error("SYNTHETIC_COMMIT_UNKNOWN");
    return true;
  });
  const verify = vi.fn<RegenerationInput["verify"]>(
    (candidate, current) =>
      issued.has(candidate) &&
      candidate.receipt.consumer.kind === current.consumer.kind &&
      candidate.receipt.consumer.id === current.consumer.id &&
      candidate.receipt.runtimeId === current.runtimeId &&
      candidate.receipt.token === current.token &&
      candidate.receipt.generation === current.generation,
  );
  const consume = vi.fn<RegenerationInput["consume"]>((candidate) => {
    issued.delete(candidate);
  });
  const u = closedWorld<HollowUnitOfWorkContext>({
    machineRegenerations: closedWorld<
      HollowUnitOfWorkContext["machineRegenerations"]
    >({ find: async () => row, replace }),
    regenerationAttempts: closedWorld<
      HollowUnitOfWorkContext["regenerationAttempts"]
    >({ forBinding: async () => state.attempts }),
  });
  const c = closedWorld<HollowContainer>({
    clock: { now: () => now },
    unitOfWorkProvider: { run: async (work) => work(u) },
  });
  const services = closedWorld<RegenerationServices>({
    input: closedWorld<RegenerationInput>({ verify, consume }),
  });
  return {
    c,
    services,
    proof,
    issued,
    state,
    replace,
    consume,
    row: () => row,
    update: (patch: Partial<typeof row>) => {
      row = parseRegeneration(machineRegenerationSchema, { ...row, ...patch });
    },
  };
}

describe("regeneration memory application ports without DB", () => {
  it("retains the opaque proof after a failed CAS and consumes only after a successful retry", async () => {
    const f = fixture();
    f.state.write = "conflict";
    await expect(finishInput(f.c, f.services, f.proof)).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.row().sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
    expect(f.issued.has(f.proof)).toBe(true);
    expect(f.consume).not.toHaveBeenCalled();
    f.state.write = "ok";
    await finishInput(f.c, f.services, f.proof);
    expect(f.row().sourceMemoryBytes).toBe(0);
    expect(f.row().owner.state).toBe("active");
    expect(f.consume).toHaveBeenCalledOnce();
  });
  it("reconciles an unknown commit by exact closed receipt without a second write", async () => {
    const f = fixture();
    f.state.write = "stored-unknown";
    await expect(finishInput(f.c, f.services, f.proof)).rejects.toThrow(
      "SYNTHETIC_COMMIT_UNKNOWN",
    );
    expect(f.issued.has(f.proof)).toBe(true);
    expect(f.row().inputReceipt).toEqual(f.proof.receipt);
    f.state.write = "ok";
    await finishInput(f.c, f.services, f.proof);
    expect(f.replace).toHaveBeenCalledOnce();
    expect(f.consume).toHaveBeenCalledOnce();
  });
  it("does not treat a JSON-equivalent receipt as an opaque runtime proof", async () => {
    const f = fixture();
    const copy: SourceInputProof = { receipt: { ...f.proof.receipt } };
    await expect(finishInput(f.c, f.services, copy)).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.replace).not.toHaveBeenCalled();
    expect(f.consume).not.toHaveBeenCalled();
  });
  it("rejects a registry-issued proof for a foreign consumer owner", async () => {
    const f = fixture();
    const foreign: SourceInputProof = {
      receipt: { ...f.proof.receipt, token: id(20) },
    };
    f.issued.add(foreign);
    await expect(finishInput(f.c, f.services, foreign)).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.replace).not.toHaveBeenCalled();
    expect(f.issued.has(foreign)).toBe(true);
  });
  it("keeps memory and proof while a Drive attempt lacks caller-end or ACK", async () => {
    const f = fixture();
    f.update({ access: { origin: "drive-record", bindingId: id(21) } });
    for (const [callerEnded, acknowledged] of [
      [false, false],
      [true, false],
    ]) {
      f.state.attempts = [
        parseRegeneration(sourceAttemptSchema, {
          id: id(22),
          bindingId: id(21),
          ordinal: 1,
          purpose: "acquire",
          version: 3,
          cancelGeneration: 0,
          deadlineAt: new Date(now.getTime() + 60_000),
          credentialVersion: 1,
          createdAt: now,
          updatedAt: now,
          phase: "terminal",
          owner: { state: "closed", runtimeId: id(23), token: id(24) },
          completion: {
            kind: "closed",
            proofId: id(25),
            callerEnded,
            acknowledged,
            outcome: "succeeded",
            failure: null,
            digest: "b".repeat(64),
          },
        }),
      ];
      await expect(finishInput(f.c, f.services, f.proof)).rejects.toMatchObject(
        { code: "REGENERATION_SOURCE_INVALID" },
      );
    }
    expect(f.replace).not.toHaveBeenCalled();
    expect(f.consume).not.toHaveBeenCalled();
    expect(f.row().sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
  });
  it("does not release for an unknown consumer owner even with an issued proof", async () => {
    const f = fixture();
    f.update({
      owner: { state: "unknown", runtimeId: id(2), token: id(3) },
      phase: "terminal",
      outcome: "unknown",
      terminalAt: now,
    });
    await expect(finishInput(f.c, f.services, f.proof)).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.replace).not.toHaveBeenCalled();
    expect(f.consume).not.toHaveBeenCalled();
  });
});

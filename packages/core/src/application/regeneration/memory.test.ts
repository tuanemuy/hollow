import { NodeRegenerationMemory } from "@repo/core/adapters/node/regeneration/memory";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote } from "@repo/core/domain/note/entity";
import {
  machineRegenerationSchema,
  parseRegeneration,
  type SourceAttempt,
  sourceAttemptSchema,
} from "@repo/core/domain/regeneration/entity";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import { describe, expect, it, vi } from "vitest";
import type { HollowContainer } from "../di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "../execution/hollowUnitOfWork";
import { beginInput, finishInput } from "./memory";
import type {
  ActiveInputReceipt,
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

function realMemory() {
  return new NodeRegenerationMemory({
    prepare: async () => {
      throw Error("UNEXPECTED_PREPARATION");
    },
  });
}
function admissionFixture(memory = realMemory(), n = 1) {
  let row = parseRegeneration(machineRegenerationSchema, {
    ...fixture().row(),
    id: id(n),
    sourceMemoryBytes: 0,
    inputReceipt: null,
  });
  const consumer = { kind: "machine-regeneration" as const, id: row.id };
  const state: {
    mode: "ok" | "read" | "unauthorized" | "cas" | "write" | "commit";
    gate: Promise<void> | null;
    retryRead: boolean;
  } = { mode: "ok", gate: null, retryRead: false };
  const failure = Error("SYNTHETIC_STORAGE_FAILURE");
  const replace = vi.fn<
    HollowUnitOfWorkContext["machineRegenerations"]["replace"]
  >(async (next, version) => {
    expect(version).toBe(row.version);
    if (state.mode === "cas") return false;
    if (state.mode === "write") throw failure;
    row = parseRegeneration(machineRegenerationSchema, next);
    return true;
  });
  const u = closedWorld<HollowUnitOfWorkContext>({
    machineRegenerations: closedWorld<
      HollowUnitOfWorkContext["machineRegenerations"]
    >({
      find: async () => {
        if (state.mode === "read") throw failure;
        return row;
      },
      replace,
    }),
    accounts: closedWorld<HollowUnitOfWorkContext["accounts"]>({
      findById: async () =>
        state.mode === "unauthorized"
          ? null
          : verifyAccount(
              createAccount(
                row.executorId,
                "input@fixture.invalid",
                "synthetic",
                now,
              ),
              now,
            ),
    }),
    notes: closedWorld<HollowUnitOfWorkContext["notes"]>({
      findById: async () =>
        createNote(
          {
            id: row.noteId,
            accountId: row.executorId,
            title: "Source",
            html: "",
            text: "",
          },
          now,
        ),
    }),
    imports: closedWorld<HollowUnitOfWorkContext["imports"]>({
      findOriginal: async () => ({
        id: row.originalId,
        accountId: row.executorId,
        noteId: row.noteId,
        name: "source.html",
        storageKey: id(100),
        bytes: row.source.bytes,
        sha256: row.source.sha256,
        format: "html",
        state: "ready",
        coverage: "complete",
        activeJobId: id(8),
        createdAt: now,
      }),
    }),
    driveBackupTransfers: closedWorld<
      HollowUnitOfWorkContext["driveBackupTransfers"]
    >({ sourceGeneration: async () => 1 }),
  });
  const run = vi.fn();
  const provider: HollowUnitOfWorkProvider = {
    async run<T>(work: (u: HollowUnitOfWorkContext) => Promise<T>): Promise<T> {
      run();
      if (state.gate) await state.gate;
      let value: T;
      try {
        value = await work(u);
      } catch (error) {
        if (!state.retryRead) throw error;
        state.mode = "read";
        return work(u);
      }
      if (state.mode === "commit") throw failure;
      return value;
    },
  };
  const c = closedWorld<HollowContainer>({
    clock: { now: () => now },
    unitOfWorkProvider: provider,
  });
  const services = closedWorld<RegenerationServices>({ input: memory });
  return {
    memory,
    c,
    services,
    consumer,
    state,
    run,
    replace,
    failure,
    row: () => row,
    begin: () => beginInput(c, services, consumer),
    finish: (proof: SourceInputProof) => finishInput(c, services, proof),
  };
}

describe("exclusive regeneration begin admission", () => {
  it("reconciles finish acknowledgement before advancing to the next generation", async () => {
    const f = admissionFixture();
    const lease = await f.begin();
    const proof = f.memory.finish(lease, id(80));
    f.state.mode = "commit";
    await expect(f.finish(proof)).rejects.toBe(f.failure);
    const before = f.row();
    f.state.mode = "ok";
    await f.finish(proof);
    expect(f.row()).toEqual(before);
    expect(f.replace).toHaveBeenCalledTimes(2);
    expect((await f.begin()).receipt.generation).toBe(2);
  });
  it("rejects begin before DB while an unconsumed closed proof needs exact reconciliation", async () => {
    const f = admissionFixture();
    const lease = await f.begin();
    const proof = f.memory.finish(lease, id(80));
    f.state.mode = "commit";
    await expect(f.finish(proof)).rejects.toBe(f.failure);
    const before = f.row();
    const calls = f.run.mock.calls.length;
    f.state.mode = "ok";
    await expect(f.begin()).rejects.toMatchObject({
      code: "REGENERATION_SOURCE_INVALID",
    });
    expect(f.run).toHaveBeenCalledTimes(calls);
    expect(f.row()).toEqual(before);
    expect(f.memory.verify(proof, proof.receipt)).toBe(true);
    await f.finish(proof);
    expect(f.memory.verify(proof, proof.receipt)).toBe(false);
    expect((await f.begin()).receipt.generation).toBe(2);
  });
  it("admits one concurrent begin for the same consumer before any DB await", async () => {
    const f = admissionFixture();
    let release!: () => void;
    f.state.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = f.begin();
    await expect(f.begin()).rejects.toBeDefined();
    expect(f.run).toHaveBeenCalledTimes(1);
    expect(f.replace).not.toHaveBeenCalled();
    release();
    expect((await first).receipt.generation).toBe(1);
    expect(f.replace).toHaveBeenCalledTimes(1);
  });
  it("counts in-flight intents against the two-consumer capacity", async () => {
    const m = realMemory();
    const a = admissionFixture(m, 1);
    const b = admissionFixture(m, 2);
    const c = admissionFixture(m, 3);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    a.state.gate = gate;
    b.state.gate = gate;
    const first = a.begin();
    const second = b.begin();
    await expect(c.begin()).rejects.toBeDefined();
    expect(c.run).not.toHaveBeenCalled();
    release();
    await Promise.all([first, second]);
    expect(a.replace).toHaveBeenCalledTimes(1);
    expect(b.replace).toHaveBeenCalledTimes(1);
  });
  it("keeps open and unknown leases exclusive", async () => {
    const f = admissionFixture();
    const lease = await f.begin();
    await expect(f.begin()).rejects.toBeDefined();
    f.memory.unknown(lease);
    await expect(f.begin()).rejects.toBeDefined();
    expect(f.run).toHaveBeenCalledTimes(1);
    expect(f.row().sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
  });
  it("returns never-bound capacity after read or permission failure and permits a legitimate begin", async () => {
    const m = realMemory();
    const a = admissionFixture(m, 1);
    const b = admissionFixture(m, 2);
    a.state.mode = "read";
    b.state.mode = "unauthorized";
    await expect(a.begin()).rejects.toBe(a.failure);
    await expect(b.begin()).rejects.toBeDefined();
    for (const f of [a, b]) {
      expect(f.replace).not.toHaveBeenCalled();
      expect(f.row().inputReceipt).toBeNull();
      expect(f.row().sourceMemoryBytes).toBe(0);
      f.state.mode = "ok";
      expect((await f.begin()).receipt.generation).toBe(1);
    }
  });
  it("retains a bound intent after a false CAS without assuming rollback", async () => {
    const f = admissionFixture();
    f.state.mode = "cas";
    await expect(f.begin()).rejects.toBeDefined();
    f.state.mode = "ok";
    await expect(f.begin()).rejects.toBeDefined();
    expect(f.run).toHaveBeenCalledTimes(1);
    expect(f.replace).toHaveBeenCalledTimes(1);
    expect(f.row().inputReceipt).toBeNull();
  });
  it("retains exact generation and capacity after a committed begin response is lost", async () => {
    const m = realMemory();
    const f = admissionFixture(m);
    const other = admissionFixture(m, 2);
    const third = admissionFixture(m, 3);
    f.state.mode = "commit";
    await expect(f.begin()).rejects.toBe(f.failure);
    const before = f.row();
    expect(before.inputReceipt?.generation).toBe(1);
    expect(before.sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
    f.state.mode = "ok";
    await expect(f.begin()).rejects.toBeDefined();
    expect(f.run).toHaveBeenCalledTimes(1);
    expect(f.row()).toEqual(before);
    await other.begin();
    await expect(third.begin()).rejects.toBeDefined();
    expect(third.run).not.toHaveBeenCalled();
  });
  it("does not release after a bound write failure or a later callback read failure", async () => {
    for (const retryRead of [false, true]) {
      const f = admissionFixture();
      f.state.mode = "write";
      f.state.retryRead = retryRead;
      await expect(f.begin()).rejects.toBe(f.failure);
      expect(f.row().inputReceipt).toBeNull();
      f.state.mode = "ok";
      f.state.retryRead = false;
      await expect(f.begin()).rejects.toBeDefined();
      expect(f.run).toHaveBeenCalledTimes(1);
      expect(f.replace).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects forged/rebound handles and never releases on duplicate or post-commit settlement", () => {
    const m = realMemory();
    const foreign = realMemory();
    const consumer = { kind: "machine-regeneration" as const, id: id(1) };
    const receipt: ActiveInputReceipt = {
      consumer,
      runtimeId: id(2),
      token: id(3),
      generation: 1,
      state: "active",
    };
    const admission = m.reserveBegin(consumer);
    for (const invalid of [{ ...admission }, foreign.reserveBegin(consumer)]) {
      expect(() => m.bindBegin(invalid, receipt)).toThrow();
      expect(() => m.commitBegin(invalid)).toThrow();
      m.holdBegin(invalid);
      expect(() => m.reserveBegin(consumer)).toThrow();
    }
    expect(() => m.commitBegin(admission)).toThrow();
    m.bindBegin(admission, receipt);
    m.bindBegin(admission, { ...receipt });
    for (const patch of [
      { generation: 2 },
      { token: id(4) },
      { runtimeId: id(4) },
      { consumer: { ...consumer, id: id(4) } },
    ])
      expect(() => m.bindBegin(admission, { ...receipt, ...patch })).toThrow();
    const lease = m.commitBegin(admission);
    expect(() => m.commitBegin(admission)).toThrow();
    expect(() => m.bindBegin(admission, receipt)).toThrow();
    m.holdBegin(admission);
    expect(() => m.reserveBegin(consumer)).toThrow();
    const second = m.reserveBegin({ ...consumer, id: id(5) });
    m.holdBegin(second);
    m.holdBegin(second);
    const fresh = m.reserveBegin({ ...consumer, id: id(5) });
    m.holdBegin(second);
    expect(() => m.reserveBegin({ ...consumer, id: id(6) })).toThrow();
    m.holdBegin(fresh);
    m.consume(m.finish(lease, id(80)));
    expect(m.reserveBegin(consumer)).toBeDefined();
  });
});

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

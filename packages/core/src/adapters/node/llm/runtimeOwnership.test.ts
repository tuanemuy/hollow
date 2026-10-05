import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LlmConversion, LlmOwnership } from "@repo/core/domain/llm/entity";
import {
  SOURCE_MEMORY_BYTES,
  type SourceInputReceipt,
} from "@repo/core/domain/regeneration/source";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NodeLlmRuntimeOwnership,
  type NodeLlmRuntimeOwnershipEnvironment,
} from "./runtimeOwnership";

const refused = {
  code: "LLM_OWNERSHIP_UNKNOWN",
  delivery: "not-sent",
  closed: false,
};
type ChildOwner = Readonly<{
  runtimeId: string;
  predecessors: readonly string[];
}>;
let directory: string;
const children: Array<{ finish(): Promise<void> }> = [];

async function childOwner(): Promise<ChildOwner> {
  const moduleUrl = new URL("./runtimeOwnership.ts", import.meta.url).href;
  const program = `
    import { NodeLlmRuntimeOwnership } from ${JSON.stringify(moduleUrl)};
    try {
      const owner = await NodeLlmRuntimeOwnership.acquire(process.argv[1]);
      process.on('message', () => process.disconnect());
      process.send({ runtimeId: owner.runtimeId, predecessors: owner.predecessors() });
    } catch {
      process.send({ failed: true });
      process.disconnect();
      process.exitCode = 1;
    }
  `;
  const child = spawn(
    process.execPath,
    [
      "--experimental-transform-types",
      "--input-type=module",
      "--eval",
      program,
      directory,
    ],
    {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  const closed = new Promise<number | null>((resolve, reject) => {
    child.once("close", resolve);
    child.once("error", () => reject(new Error("self child could not start")));
  });
  void closed.catch(() => {});
  let finished: Promise<void> | undefined;
  const finish = () => {
    finished ??= (async () => {
      if (child.connected) child.send("exit");
      const fallback = setTimeout(() => child.kill("SIGTERM"), 3_000);
      try {
        const code = await closed;
        expect(code).toBe(0);
        const pid = child.pid;
        if (pid === undefined) throw new Error("self child PID unavailable");
        expect(() => process.kill(pid, 0)).toThrow(
          expect.objectContaining({ code: "ESRCH" }),
        );
      } finally {
        clearTimeout(fallback);
      }
    })();
    return finished;
  };
  children.push({ finish });
  const ready = new Promise<ChildOwner>((resolve, reject) => {
    child.once("message", (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "runtimeId" in message &&
        typeof message.runtimeId === "string" &&
        "predecessors" in message &&
        Array.isArray(message.predecessors) &&
        message.predecessors.every((id: unknown) => typeof id === "string")
      )
        resolve({
          runtimeId: message.runtimeId,
          predecessors: message.predecessors,
        });
      else reject(new Error("self child ownership failed"));
    });
    void closed.then(
      () => reject(new Error("self child ended before ready")),
      reject,
    );
  });
  return ready;
}

async function endLastChild() {
  const child = children.at(-1);
  if (!child) throw new Error("self child unavailable");
  await child.finish();
}

describe("NodeLlmRuntimeOwnership", () => {
  beforeEach(async () => {
    directory = await mkdtemp(
      path.join(tmpdir(), "hollow-llm-ownership-test-"),
    );
    await chmod(directory, 0o700);
  });
  afterEach(async () => {
    const settled = await Promise.allSettled(
      children.map((child) => child.finish()),
    );
    try {
      expect(settled.every((result) => result.status === "fulfilled")).toBe(
        true,
      );
    } finally {
      children.length = 0;
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("creates a private record and refuses another acquire while the recorded process is live", async () => {
    const owner = await NodeLlmRuntimeOwnership.acquire(directory);
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(path.join(directory, "owner.json"))).mode & 0o777).toBe(
      0o600,
    );
    expect(owner.predecessors()).toEqual([]);
    expect(() => owner.assertReady()).not.toThrow();
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("keeps every unacknowledged predecessor across two normal child exits, then acknowledges idempotently", async () => {
    const first = await childOwner();
    expect(first.predecessors).toEqual([]);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    await endLastChild();
    const second = await childOwner();
    expect(second.predecessors).toEqual([first.runtimeId]);
    await endLastChild();
    const current = await NodeLlmRuntimeOwnership.acquire(directory);
    expect(current.predecessors()).toEqual([first.runtimeId, second.runtimeId]);
    expect(() => current.assertReady()).toThrow(
      expect.objectContaining(refused),
    );
    await current.acknowledge(first.runtimeId);
    expect(current.predecessors()).toEqual([second.runtimeId]);
    expect(() => current.assertReady()).toThrow(
      expect.objectContaining(refused),
    );
    const saved = await readFile(path.join(directory, "owner.json"), "utf8");
    await current.acknowledge(first.runtimeId);
    expect(await readFile(path.join(directory, "owner.json"), "utf8")).toBe(
      saved,
    );
    await current.acknowledge(second.runtimeId);
    expect(current.predecessors()).toEqual([]);
    expect(() => current.assertReady()).not.toThrow();
  });

  it("rejects a recovery lock without taking or deleting that lock", async () => {
    const lock = path.join(directory, "recovery.lock");
    await writeFile(lock, "self lock", { mode: 0o600 });
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    expect(await readFile(lock, "utf8")).toBe("self lock");
  });

  it("does not acknowledge after the persisted record differs from the acquired record", async () => {
    const previous = await childOwner();
    await endLastChild();
    const current = await NodeLlmRuntimeOwnership.acquire(directory);
    const file = path.join(directory, "owner.json");
    const changed = JSON.stringify({
      pid: process.pid,
      runtimeId: randomUUID(),
      predecessors: [previous.runtimeId],
    });
    await writeFile(file, changed, { mode: 0o600 });
    await expect(current.acknowledge(previous.runtimeId)).rejects.toMatchObject(
      refused,
    );
    expect(current.predecessors()).toEqual([previous.runtimeId]);
    expect(await readFile(file, "utf8")).toBe(changed);
  });

  it("rejects nonprivate directory permissions", async () => {
    await chmod(directory, 0o755);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("rejects nonprivate record permissions", async () => {
    await NodeLlmRuntimeOwnership.acquire(directory);
    await chmod(path.join(directory, "owner.json"), 0o644);
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });

  it("rejects a symlink record without following it", async () => {
    const target = path.join(directory, "synthetic-record");
    await writeFile(target, "{}", { mode: 0o600 });
    await symlink(target, path.join(directory, "owner.json"));
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
    expect(await readFile(target, "utf8")).toBe("{}");
  });

  it.each([
    "{",
    "{}",
    "x".repeat(16 * 1024 + 1),
  ])("rejects malformed or oversized records (%#)", async (value) => {
    await writeFile(path.join(directory, "owner.json"), value, { mode: 0o600 });
    await expect(
      NodeLlmRuntimeOwnership.acquire(directory),
    ).rejects.toMatchObject(refused);
  });
});

const syntheticId = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
type VirtualNode = {
  kind: "file" | "directory" | "symlink";
  mode: number;
  text: string;
};
function virtualOwnership() {
  const directory = "/synthetic-owner";
  const file = path.join(directory, "owner.json");
  const nodes = new Map<string, VirtualNode>();
  const absentPids = new Set<number>();
  const events: string[] = [];
  let uuid = 100;
  let recordReads = 0;
  let beforeRead: ((count: number) => void) | undefined;
  let failSync: string | undefined;
  const error = (code: string) => Object.assign(new Error(code), { code });
  const io = (pid: number): NodeLlmRuntimeOwnershipEnvironment => ({
    pid,
    randomUUID: () => syntheticId(++uuid),
    knownPidAbsent: (knownPid) => {
      events.push(`pid:${knownPid}`);
      return absentPids.has(knownPid);
    },
    async mkdir(name, options) {
      if (!nodes.has(name))
        nodes.set(name, { kind: "directory", mode: options.mode, text: "" });
    },
    async open(name, flags, mode) {
      events.push(`open:${name}:${flags}`);
      if (flags === "wx") {
        if (nodes.has(name)) throw error("EEXIST");
        nodes.set(name, { kind: "file", mode: mode ?? 0o600, text: "" });
      } else if ((flags & constants.O_NOFOLLOW) === 0) {
        throw new Error("O_NOFOLLOW missing");
      }
      if (name === file && flags !== "wx") beforeRead?.(++recordReads);
      const node = nodes.get(name);
      if (!node) throw error("ENOENT");
      if (node.kind === "symlink") throw error("ELOOP");
      return {
        async stat() {
          return {
            isFile: () => node.kind === "file",
            isDirectory: () => node.kind === "directory",
            size: node.text.length,
            mode: node.mode,
          };
        },
        async readFile() {
          return node.text;
        },
        async writeFile(text) {
          node.text = text;
          events.push(`write:${name}`);
        },
        async sync() {
          events.push(`sync:${name}`);
          if (failSync === name) throw error("EIO");
        },
        async close() {
          events.push(`close:${name}`);
        },
      };
    },
    async rename(from, to) {
      const node = nodes.get(from);
      if (!node) throw error("ENOENT");
      nodes.set(to, node);
      nodes.delete(from);
      events.push(`rename:${to}`);
    },
    async unlink(name) {
      if (!nodes.delete(name)) throw error("ENOENT");
      events.push(`unlink:${name}`);
    },
  });
  return {
    directory,
    file,
    nodes,
    absentPids,
    events,
    io,
    beforeRead(callback: (count: number) => void) {
      beforeRead = callback;
    },
    failSync(name: string) {
      failSync = name;
    },
    saved() {
      const node = nodes.get(file);
      if (!node) throw new Error("record unavailable");
      return JSON.parse(node.text) as {
        version: number;
        inputMode: string;
        predecessors: Array<{
          runtimeId: string;
          inputMode: string;
          termination: string;
        }>;
      };
    },
  };
}
type TestConversion = Extract<
  LlmConversion,
  { selection: "fixed"; preparationVersion: 1 }
> &
  Readonly<{
    owner: Extract<LlmOwnership, { state: "active" | "unknown" }>;
    inputReceipt: Extract<SourceInputReceipt, { state: "active" | "unknown" }>;
  }>;
function predecessorConversion(runtimeId: string): TestConversion {
  const now = new Date("2026-10-01T00:00:00.000Z");
  return {
    access: { origin: "local-original", bindingId: null },
    sourceMemoryBytes: SOURCE_MEMORY_BYTES,
    inputReceipt: {
      state: "active",
      consumer: { kind: "llm-conversion", id: syntheticId(1) },
      runtimeId,
      token: syntheticId(2),
      generation: 1,
    },
    jobId: syntheticId(1),
    accountId: syntheticId(3),
    noteId: syntheticId(4),
    commandId: syntheticId(5),
    requestDigest: "a".repeat(64),
    operation: "import",
    retryOf: null,
    sourceState: "processing",
    sourceCoverage: "complete",
    noteVersion: 1,
    originalRevisionNo: null,
    credentialEpoch: 1,
    instruction: "",
    admissionSequence: 1,
    createdAt: now,
    deadlineAt: new Date(now.getTime() + 60_000),
    updatedAt: now,
    owner: { state: "active", runtimeId, token: syntheticId(2) },
    cancelGeneration: 0,
    responseBudget: 0,
    version: 1,
    selection: "fixed",
    modelId: "fake",
    phase: "preparing",
    outcome: { kind: "pending" },
    preparationVersion: 1,
    promptVersion: 1,
    pdfProof: null,
    sourceOwnershipGeneration: null,
    source: {
      kind: "original",
      originalId: syntheticId(6),
      sha256: "b".repeat(64),
      bytes: 3,
      format: "text",
    },
  };
}

describe("S3-P21 versioned predecessor input authority", () => {
  it("persists leased mode before returning, keeps unacknowledged provenance over restarts and scopes opaque proof", async () => {
    const fake = virtualOwnership();
    const first = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(71),
    );
    expect(fake.saved()).toMatchObject({
      version: 2,
      inputMode: "leased-text-v1",
      predecessors: [],
    });
    expect(fake.events.indexOf(`rename:${fake.file}`)).toBeLessThan(
      fake.events.lastIndexOf(`sync:${fake.directory}`),
    );
    fake.absentPids.add(71);
    const second = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(72),
    );
    fake.absentPids.add(72);
    const third = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(73),
    );
    expect(fake.saved().predecessors).toEqual([
      {
        runtimeId: first.runtimeId,
        inputMode: "leased-text-v1",
        termination: "acquire-confirmed",
      },
      {
        runtimeId: second.runtimeId,
        inputMode: "leased-text-v1",
        termination: "acquire-confirmed",
      },
    ]);
    const value = predecessorConversion(first.runtimeId);
    const proof = third.inputPredecessor(value);
    if (!proof) throw new Error("proof unavailable");
    expect(third.inputPredecessor(value)).toBe(proof);
    expect(third.pendingInputProofs(first.runtimeId)).toEqual([proof]);
    expect(third.pendingInputProofs(second.runtimeId)).toEqual([]);
    expect(second.pendingInputProofs(first.runtimeId)).toEqual([]);
    expect(third.verifyPredecessorInput(proof, value)).toBe(true);
    const originalReceipt = value.inputReceipt;
    expect(
      third.verifyPredecessorInput(proof, {
        ...value,
        inputReceipt: { ...originalReceipt, state: "unknown" },
        owner: { ...value.owner, state: "unknown" },
      }),
    ).toBe(true);
    expect(
      third.verifyPredecessorInput(proof, {
        ...value,
        inputReceipt: { ...originalReceipt, generation: 2 },
      }),
    ).toBe(false);
    expect(
      third.verifyPredecessorInput(proof, {
        ...value,
        owner: { ...value.owner, state: "unknown" },
      }),
    ).toBe(true);
    expect(
      third.verifyPredecessorInput(JSON.parse(JSON.stringify(proof)), value),
    ).toBe(false);
    expect(second.verifyPredecessorInput(proof, value)).toBe(false);
    const another = { ...value, jobId: syntheticId(31) };
    expect(third.verifyPredecessorInput(proof, another)).toBe(false);
    expect(
      third.verifyPredecessorInput(proof, {
        ...value,
        source: { ...value.source, sha256: "c".repeat(64) },
      }),
    ).toBe(false);
    expect(
      third.verifyPredecessorInput(proof, {
        ...value,
        owner: { ...value.owner, token: syntheticId(32) },
      }),
    ).toBe(false);
    const saved: LlmConversion = {
      ...value,
      sourceMemoryBytes: 0,
      inputReceipt: proof.receipt,
      owner: { ...value.owner, state: "closed" },
    };
    expect(third.verifyPredecessorInput(proof, saved)).toBe(true);
    expect(third.pendingInputProofs(first.runtimeId)).toEqual([proof]);
    expect(
      third.verifyPredecessorInput(proof, {
        ...saved,
        inputReceipt: { ...proof.receipt, proofId: syntheticId(33) },
      }),
    ).toBe(false);
    await expect(third.acknowledge(first.runtimeId)).rejects.toMatchObject(
      refused,
    );
    third.consumePredecessorInput(proof);
    expect(third.pendingInputProofs(first.runtimeId)).toEqual([]);
    expect(third.verifyPredecessorInput(proof, saved)).toBe(false);
    expect(() => third.consumePredecessorInput(proof)).toThrow(
      expect.objectContaining(refused),
    );
    await third.acknowledge(first.runtimeId);
    expect(third.predecessors()).toEqual([second.runtimeId]);
    const persisted = fake.nodes.get(fake.file)?.text;
    await third.acknowledge(first.runtimeId);
    expect(fake.nodes.get(fake.file)?.text).toBe(persisted);
  });

  it("keeps legacy string history distinct and issues no proof for old or current runtime receipts", async () => {
    const fake = virtualOwnership();
    const legacy = syntheticId(40);
    const older = syntheticId(41);
    fake.nodes.set(fake.file, {
      kind: "file",
      mode: 0o600,
      text: JSON.stringify({
        pid: 74,
        runtimeId: legacy,
        predecessors: [older],
      }),
    });
    fake.absentPids.add(74);
    const current = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(75),
    );
    expect(fake.saved().predecessors).toEqual([
      {
        runtimeId: older,
        inputMode: "legacy",
        termination: "legacy-unverified",
      },
      {
        runtimeId: legacy,
        inputMode: "legacy",
        termination: "acquire-confirmed",
      },
    ]);
    for (const runtimeId of [legacy, older, current.runtimeId])
      expect(
        current.inputPredecessor(predecessorConversion(runtimeId)),
      ).toBeNull();
    await current.acknowledge(legacy);
    fake.absentPids.add(75);
    const next = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(76),
    );
    expect(
      next.inputPredecessor(predecessorConversion(current.runtimeId)),
    ).not.toBeNull();
    expect(next.inputPredecessor(predecessorConversion(older))).toBeNull();
  });

  it("refuses missing leased provenance, live/reused PIDs, exact record changes and unsafe filesystem nodes", async () => {
    const wrongRecords = [
      { version: 2, pid: 77, runtimeId: syntheticId(42), predecessors: [] },
      {
        version: 2,
        pid: 77,
        runtimeId: syntheticId(42),
        inputMode: "leased-text-v1",
        predecessors: [
          {
            runtimeId: syntheticId(43),
            inputMode: "leased-text-v1",
            termination: "legacy-unverified",
          },
        ],
      },
      { pid: 77, runtimeId: syntheticId(42), predecessors: [syntheticId(42)] },
    ];
    for (const record of wrongRecords) {
      const fake = virtualOwnership();
      fake.nodes.set(fake.file, {
        kind: "file",
        mode: 0o600,
        text: JSON.stringify(record),
      });
      fake.absentPids.add(77);
      await expect(
        NodeLlmRuntimeOwnership.acquire(fake.directory, fake.io(78)),
      ).rejects.toMatchObject(refused);
      expect(fake.events.some((event) => event.startsWith("rename:"))).toBe(
        false,
      );
    }
    const live = virtualOwnership();
    await NodeLlmRuntimeOwnership.acquire(live.directory, live.io(79));
    await expect(
      NodeLlmRuntimeOwnership.acquire(live.directory, live.io(80)),
    ).rejects.toMatchObject(refused);
    const reused = virtualOwnership();
    await NodeLlmRuntimeOwnership.acquire(reused.directory, reused.io(86));
    reused.absentPids.add(86);
    let reusedReads = 0;
    reused.beforeRead(() => {
      if (++reusedReads === 2) reused.absentPids.delete(86);
    });
    await expect(
      NodeLlmRuntimeOwnership.acquire(reused.directory, reused.io(87)),
    ).rejects.toMatchObject(refused);
    const changed = virtualOwnership();
    await NodeLlmRuntimeOwnership.acquire(changed.directory, changed.io(81));
    changed.absentPids.add(81);
    let reads = 0;
    changed.beforeRead(() => {
      if (++reads === 2) {
        const node = changed.nodes.get(changed.file);
        if (node) node.text += " ";
      }
    });
    await expect(
      NodeLlmRuntimeOwnership.acquire(changed.directory, changed.io(82)),
    ).rejects.toMatchObject(refused);
    for (const unsafe of [
      { kind: "file" as const, mode: 0o644, text: "{}" },
      { kind: "directory" as const, mode: 0o600, text: "{}" },
      { kind: "symlink" as const, mode: 0o600, text: "{}" },
      { kind: "file" as const, mode: 0o600, text: " ".repeat(16 * 1024 + 1) },
    ]) {
      const fake = virtualOwnership();
      fake.nodes.set(fake.file, unsafe);
      await expect(
        NodeLlmRuntimeOwnership.acquire(fake.directory, fake.io(83)),
      ).rejects.toMatchObject(refused);
    }
  });

  it("rejects altered consumer/source/access and caps simultaneous proofs without evicting unresolved ones", async () => {
    const fake = virtualOwnership();
    const first = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(84),
    );
    fake.absentPids.add(84);
    const current = await NodeLlmRuntimeOwnership.acquire(
      fake.directory,
      fake.io(85),
    );
    const value = predecessorConversion(first.runtimeId);
    expect(
      current.inputPredecessor({
        ...value,
        access: { origin: "drive-record", bindingId: syntheticId(44) },
      }),
    ).toBeNull();
    const receipt = value.inputReceipt;
    if (!receipt) throw new Error("receipt unavailable");
    expect(
      current.inputPredecessor({
        ...value,
        inputReceipt: {
          ...receipt,
          consumer: { kind: "machine-regeneration", id: value.jobId },
        },
      }),
    ).toBeNull();
    const proof = current.inputPredecessor(value);
    if (!proof) throw new Error("proof unavailable");
    expect(
      current.inputPredecessor({
        ...value,
        sourceMemoryBytes: 0,
        inputReceipt: proof.receipt,
        owner: { ...value.owner, state: "closed" },
      }),
    ).toBeNull();
    const secondValue = {
      ...value,
      jobId: syntheticId(45),
      inputReceipt: {
        ...receipt,
        consumer: { kind: "llm-conversion" as const, id: syntheticId(45) },
      },
    };
    expect(current.inputPredecessor(secondValue)).not.toBeNull();
    const thirdValue = {
      ...value,
      jobId: syntheticId(46),
      inputReceipt: {
        ...receipt,
        consumer: { kind: "llm-conversion" as const, id: syntheticId(46) },
      },
    };
    expect(current.inputPredecessor(thirdValue)).toBeNull();
    expect(current.pendingInputProofs(first.runtimeId)).toHaveLength(2);
    expect(current.inputPredecessor(value)).toBe(proof);
  });
});

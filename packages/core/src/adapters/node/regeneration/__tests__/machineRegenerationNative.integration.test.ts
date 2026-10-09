import { spawn } from "node:child_process";
import { closeSync, fsyncSync, openSync, writeSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { requestMachineRegeneration } from "@repo/core/application/regeneration/request";
import {
  recoverMachine,
  sweepMachine,
} from "@repo/core/application/regeneration/worker";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { machineFixture } from "../../../libsql/__tests__/machineRegenerationFixtures";

describe("machine regeneration native extractor", () => {
  let f: Awaited<ReturnType<typeof machineFixture>>;
  beforeAll(async () => {
    f = await machineFixture(true);
  });
  afterAll(async () => {
    await f.close();
  });
  it.each([
    "html",
    "markdown",
  ] as const)("extracts original %s through the normal parser", async (format) => {
    try {
      const noteId = await f.seed(
        format,
        format === "html" ? "<p>native body</p>" : "# Native body",
      );
      const { jobId } = await requestMachineRegeneration(f.c, f.token, {
        noteId,
        commandId: f.c.idGenerator.next(),
      });
      await sweepMachine(f.c);
      const value = await f.settled(jobId);
      expect(value.outcome).toBe("succeeded");
      expect(value.inputReceipt?.state).toBe("closed");
      expect(value.sourceMemoryBytes).toBe(0);
      expect(f.input.activeInputs()).toBe(0);
    } catch (error) {
      f.fail();
      throw error;
    }
  });
});

const ownerProgram = String.raw`
import { registerHooks } from 'node:module';
import { lstatSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
let ownStage = 'ARGUMENTS';
await (async () => {
const options = JSON.parse(process.argv[1]);
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (!(error instanceof Error) || error.code !== 'ERR_MODULE_NOT_FOUND' || !context.parentURL || !/^\.\.?\//.test(specifier) || /[?#]/.test(specifier) || path.extname(specifier)) throw error;
    const file = fileURLToPath(new URL(specifier + '.ts', context.parentURL));
    if (!file.startsWith(options.sourceRoot + '/packages/core/src/')) throw error;
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.uid !== process.getuid() || realpathSync(file) !== file) throw error;
    return next(pathToFileURL(file).href, context);
  }
}});
ownStage = 'SOURCE_IMPORTS';
const entry = (name) => pathToFileURL(options.sourceRoot + '/packages/core/src/' + name + '.ts').href;
const { createLibsqlClient, getDatabase, applyPragmas } = await import(entry('adapters/libsql/client'));
const { createHollowContainer } = await import(entry('application/di/serverHollow'));
const { createNodeRegeneration } = await import(entry('adapters/node/regeneration/config'));
const noStorageIO = async () => { throw Error('S5_D1_UNEXPECTED_STORAGE_IO'); };
const storage = { put: noStorageIO, read: noStorageIO, remove: noStorageIO, stat: noStorageIO, stream: noStorageIO };
const { currentMachine } = await import(entry('application/regeneration/current'));
const { finishInput } = await import(entry('application/regeneration/memory'));
ownStage = 'CLIENT_OPEN';
const client = createLibsqlClient({ url: 'file:' + options.database });
try {
  ownStage = 'PRAGMAS_CONTAINER';
  await applyPragmas(client);
  const base = createHollowContainer(getDatabase(client), 'http://machine.fixture.invalid', { send: async () => {} });
  const c = { ...base, clock: { now: () => new Date(options.now) } };
  ownStage = 'REGENERATION_FACTORY';
  const shared = await createNodeRegeneration(c, {
    directory: options.directory,
    storage,
    workerPath: options.sourceRoot + '/packages/core/src/adapters/node/llm/sourceWorker.mjs',
    documentWorkerPath: options.sourceRoot + '/packages/core/src/adapters/node/llm/documentWorker.mjs',
    imageChildPath: options.sourceRoot + '/packages/core/src/adapters/node/llm/imageChild.mjs',
    pdfPagesChildPath: options.sourceRoot + '/packages/core/src/adapters/node/llm/pdfPagesChild.mjs',
  });
  for (const [index, id] of options.jobs.entries()) {
    ownStage = index === 0 ? 'FIRST_CLAIM' : 'SECOND_CLAIM';
    const value = await c.unitOfWorkProvider.run((u) => u.machineRegenerations.find(id));
    if (!value || value.phase !== 'queued') throw Error('S5_D1_CANDIDATE');
    const consumer = { kind: 'machine-regeneration', id };
    const admission = shared.input.reserveBegin(consumer);
    const owner = { state: 'active', runtimeId: shared.ownership.runtimeId, token: c.idGenerator.next() };
    const receipt = { consumer, runtimeId: owner.runtimeId, token: owner.token, generation: (value.inputReceipt?.generation ?? 0) + 1, state: 'active' };
    shared.input.bindBegin(admission, receipt);
    const claimed = { ...value, phase: 'acquiring', owner, inputReceipt: receipt, sourceMemoryBytes: 52428800, version: value.version + 1, updatedAt: c.clock.now() };
    const result = await shared.input.claimTransaction(admission, c.unitOfWorkProvider, async (u) => {
      await currentMachine(c, u, value);
      if (!(await u.machineRegenerations.claimExact(claimed, value.version, c.clock.now()))) return { kind: 'no-claim' };
      return { kind: 'claimed', value: claimed };
    });
    if (result.result.kind !== 'claimed' || !result.lease) throw Error('S5_D1_CLAIM');
    if (index === 0) {
      ownStage = 'FIRST_FINISH';
      const proof = shared.input.finish(result.lease, c.idGenerator.next());
      await finishInput(c, { input: shared.input, local: shared.local }, proof);
      if (!shared.input.consumed(proof, result.lease)) throw Error('S5_D1_CONSUME');
    }
  }
  ownStage = 'STOP_CHECKS';
  await shared.execution.stop();
  await base.passwordHasher.stop();
  const fk = await client.execute('PRAGMA foreign_key_check');
  const integrity = await client.execute('PRAGMA integrity_check');
  if (fk.rows.length || integrity.rows.length !== 1 || integrity.rows[0]?.[0] !== 'ok') throw Error('S5_D1_INTEGRITY');
  const check = await client.execute('PRAGMA main.wal_checkpoint(TRUNCATE)');
  if (JSON.stringify(check.columns) !== JSON.stringify(['busy','log','checkpointed']) || check.rows.length !== 1 || check.rows[0]?.length !== 3 || ![0,1,2].every((i) => typeof check.rows[0]?.[i] === 'number' && Number.isSafeInteger(check.rows[0]?.[i]) && check.rows[0]?.[i] === 0)) throw Error('S5_D1_CHECKPOINT');
  ownStage = 'CLIENT_CLOSE';
} finally { client.close(); }
if (!client.closed) throw Error('S5_D1_CLOSE');
ownStage = 'READY';
process.stdout.write('S5_D1_READY\n');
process.stdin.resume();
await new Promise((resolve) => process.stdin.once('end', resolve));
})().catch(() => { process.stderr.write('S5_D1_STAGE:' + ownStage + '\n'); process.stderr.write('S5_D1_OWNER_FAILURE\n'); process.exitCode = 1; });
`;
const pidAbsent = (pid: number) => {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH";
  }
};
describe("machine predecessor recovery", () => {
  let f: Awaited<ReturnType<typeof machineFixture>>;
  beforeAll(async () => {
    f = await machineFixture(true);
  });
  afterAll(async () => {
    await f?.close();
  });
  it("recovers genuine closed and unclosed predecessor inputs after the original owner exits", async () => {
    const jobs: string[] = [];
    for (let i = 0; i < 2; i++) {
      f.setNow(new Date(Date.parse("2026-10-06T00:00:00Z") + i));
      const noteId = await f.seed("html", "<p>predecessor input</p>");
      jobs.push(
        (
          await requestMachineRegeneration(f.c, f.token, {
            noteId,
            commandId: f.c.idGenerator.next(),
          })
        ).jobId,
      );
    }
    await f.suspendDatabase();
    const directory = path.join(f.root, "machine-predecessor");
    const sourceRoot = fileURLToPath(
      new URL("../../../../../../../", import.meta.url),
    ).replace(/\/$/, "");
    const child = spawn(
      process.execPath,
      [
        "--experimental-transform-types",
        "--input-type=module",
        "-e",
        ownerProgram,
        JSON.stringify({
          sourceRoot,
          database: path.join(f.root, "native.db"),
          objects: path.join(f.root, "objects"),
          directory,
          jobs,
          now: f.c.clock.now().toISOString(),
        }),
      ],
      {
        cwd: sourceRoot,
        env: {
          PATH: process.env["PATH"],
          LANG: "C.UTF-8",
          TMPDIR: path.join(f.root, "tmp"),
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const ledger = {
      registered: false,
      ready: false,
      exit: null as number | null,
      signal: null as string | null,
      exited: false,
      closed: false,
      stdoutEOF: false,
      stderrEOF: false,
      stdinClosed: false,
      stdoutClosed: false,
      stderrClosed: false,
      absent: false,
      forced: false,
    };
    child.once("exit", (code, signal) => {
      ledger.exit = code;
      ledger.signal = signal;
      ledger.exited = true;
    });
    child.once("close", () => {
      ledger.closed = true;
    });
    child.stdout.once("end", () => {
      ledger.stdoutEOF = true;
    });
    child.stderr.once("end", () => {
      ledger.stderrEOF = true;
    });
    child.stdin.once("close", () => {
      ledger.stdinClosed = true;
    });
    child.stdout.once("close", () => {
      ledger.stdoutClosed = true;
    });
    child.stderr.once("close", () => {
      ledger.stderrClosed = true;
    });
    let output = "";
    let outputBytes = 0;
    let stderr = "";
    let fault = false;
    child.once("error", () => {
      fault = true;
    });
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > 65536) fault = true;
      else {
        output += chunk.toString("utf8");
        ledger.ready = output === "S5_D1_READY\n";
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > 65536) fault = true;
      else stderr += chunk.toString("utf8");
    });
    try {
      if (!child.pid) throw Error("S5_D1_BIRTH_UNKNOWN");
      ledger.registered = true;
      await vi.waitFor(
        () => {
          expect(fault).toBe(false);
          expect(ledger.ready, stderr).toBe(true);
          expect(ledger.exited, stderr).toBe(false);
        },
        { timeout: 30000, interval: 200 },
      );
      child.stdin.end();
      await vi.waitFor(
        () => {
          expect(
            ledger.exited &&
              ledger.closed &&
              ledger.stdoutEOF &&
              ledger.stderrEOF &&
              ledger.stdinClosed &&
              ledger.stdoutClosed &&
              ledger.stderrClosed,
          ).toBe(true);
          expect(ledger.exit).toBe(0);
          expect(ledger.signal).toBeNull();
          expect(child.pid !== undefined && pidAbsent(child.pid)).toBe(true);
        },
        { timeout: 10000, interval: 200 },
      );
      ledger.absent = true;
      const ownership = await NodeLlmRuntimeOwnership.acquire(
        path.join(directory, ".llm-runtime"),
      );
      await f.resumeDatabase(ownership);
      const rows = await f.c.unitOfWorkProvider.run(async (u) =>
        Promise.all(jobs.map((id) => u.machineRegenerations.find(id))),
      );
      const beforeClosed = rows[0];
      const beforeInput = rows[1];
      if (!beforeClosed || !beforeInput) throw Error("S5_D1_ROWS");
      expect(beforeClosed.owner.state).toBe("active");
      expect(beforeClosed.inputReceipt?.state).toBe("closed");
      expect(beforeClosed.sourceMemoryBytes).toBe(0);
      expect(beforeInput.sourceMemoryBytes).toBe(52428800);
      const ownerProof = ownership.machinePredecessor(beforeClosed);
      const inputProof = ownership.machinePredecessor(beforeInput);
      if (ownerProof?.kind !== "owner" || inputProof?.kind !== "input")
        throw Error("S5_D1_CAPABILITY");
      expect(ownerProof.proof.receipt).toBe(beforeClosed.inputReceipt);
      expect(
        ownership.verifyMachinePredecessor(
          { kind: "owner", proof: { receipt: ownerProof.proof.receipt } },
          beforeClosed,
        ),
      ).toBe(false);
      expect(
        ownership.verifyMachinePredecessor(ownerProof, {
          ...beforeClosed,
          originalId: f.c.idGenerator.next(),
        }),
      ).toBe(false);
      await expect(
        ownership.acknowledge(beforeClosed.owner.runtimeId ?? ""),
      ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN" });
      const provider = f.c.unitOfWorkProvider;
      const original = provider.run.bind(provider);
      let ownerFalse = false;
      provider.run = (work) =>
        original(async (u) => {
          const finish = u.machineRegenerations.finishJob.bind(
            u.machineRegenerations,
          );
          u.machineRegenerations.finishJob = (v, now) => {
            if (v.id === beforeClosed.id) {
              ownerFalse = true;
              return Promise.resolve(false);
            }
            return finish(v, now);
          };
          return work(u);
        });
      try {
        await expect(recoverMachine(f.c)).rejects.toMatchObject({
          code: "LLM_OWNERSHIP_UNKNOWN",
        });
      } finally {
        provider.run = original;
      }
      expect(ownerFalse).toBe(true);
      expect(
        await original((u) => u.machineRegenerations.find(beforeClosed.id)),
      ).toEqual(beforeClosed);
      let ownerLost = false;
      provider.run = async (work) => {
        let changed = false;
        const result = await original(async (u) => {
          const finish = u.machineRegenerations.finishJob.bind(
            u.machineRegenerations,
          );
          u.machineRegenerations.finishJob = async (v, now) => {
            const ok = await finish(v, now);
            if (ok && v.id === beforeClosed.id) changed = true;
            return ok;
          };
          return work(u);
        });
        if (changed && !ownerLost) {
          ownerLost = true;
          throw new SystemError(
            SystemErrorCode.DatabaseError,
            "S5_D1_OWNER_RESPONSE_UNKNOWN",
          );
        }
        return result;
      };
      try {
        await expect(recoverMachine(f.c)).rejects.toMatchObject({
          code: SystemErrorCode.DatabaseError,
        });
      } finally {
        provider.run = original;
      }
      expect(ownerLost).toBe(true);
      expect(
        ownership
          .pendingMachinePredecessors(beforeClosed.owner.runtimeId ?? "")
          .some((p) => p.proof === ownerProof.proof),
      ).toBe(true);
      const endedOwner = await original((u) =>
        u.machineRegenerations.find(beforeClosed.id),
      );
      expect(endedOwner?.inputReceipt).toEqual(beforeClosed.inputReceipt);
      expect(endedOwner?.version).toBe(beforeClosed.version + 1);
      await expect(
        ownership.acknowledge(beforeClosed.owner.runtimeId ?? ""),
      ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN" });
      let falseSecond = false;
      provider.run = (work) =>
        original(async (u) => {
          const replace = u.machineRegenerations.replace.bind(
            u.machineRegenerations,
          );
          u.machineRegenerations.replace = async (v, n) => {
            if (
              v.id === beforeInput.id &&
              v.inputReceipt?.state === "closed" &&
              v.sourceMemoryBytes === 0
            ) {
              falseSecond = true;
              return false;
            }
            return replace(v, n);
          };
          return work(u);
        });
      try {
        await expect(recoverMachine(f.c)).rejects.toMatchObject({
          code: "LLM_OWNERSHIP_UNKNOWN",
        });
      } finally {
        provider.run = original;
      }
      expect(falseSecond).toBe(true);
      expect(
        await original((u) => u.machineRegenerations.find(beforeInput.id)),
      ).toEqual(beforeInput);
      expect(
        ownership
          .pendingMachinePredecessors(beforeInput.owner.runtimeId ?? "")
          .some((p) => p.proof === inputProof.proof),
      ).toBe(true);
      let responseLost = false;
      provider.run = async (work) => {
        let changed = false;
        const result = await original(async (u) => {
          const finish = u.machineRegenerations.finishJob.bind(
            u.machineRegenerations,
          );
          u.machineRegenerations.finishJob = async (v, now) => {
            const ok = await finish(v, now);
            if (ok && v.id === beforeInput.id) changed = true;
            return ok;
          };
          return work(u);
        });
        if (changed && !responseLost) {
          responseLost = true;
          throw new SystemError(
            SystemErrorCode.DatabaseError,
            "S5_D1_RESPONSE_UNKNOWN",
          );
        }
        return result;
      };
      try {
        await expect(recoverMachine(f.c)).rejects.toMatchObject({
          code: SystemErrorCode.DatabaseError,
        });
      } finally {
        provider.run = original;
      }
      expect(responseLost).toBe(true);
      expect(
        ownership
          .pendingMachinePredecessors(beforeInput.owner.runtimeId ?? "")
          .some((p) => p.proof === inputProof.proof),
      ).toBe(true);
      await recoverMachine(f.c);
      const saved = await original(async (u) =>
        Promise.all(jobs.map((id) => u.machineRegenerations.find(id))),
      );
      expect(saved[0]?.inputReceipt).toEqual(beforeClosed.inputReceipt);
      expect(
        saved[0]?.inputReceipt?.state === "closed" &&
          saved[0].inputReceipt.proofId,
      ).toBe(ownerProof.proof.receipt.proofId);
      expect(saved[0]?.version).toBe(beforeClosed.version + 1);
      expect(saved[1]?.inputReceipt).toEqual(inputProof.proof.receipt);
      expect(saved[1]?.version).toBe(beforeInput.version + 2);
      for (const value of saved) {
        expect(value?.outcome).toBe("failed");
        expect(value?.owner.state).toBe("closed");
        expect(value?.sourceMemoryBytes).toBe(0);
      }
      expect(
        ownership.pendingMachinePredecessors(beforeInput.owner.runtimeId ?? ""),
      ).toEqual([]);
      expect(ownership.predecessors()).toEqual([]);
      expect(() => ownership.assertReady()).not.toThrow();
      const file = openSync(
        path.join(f.root, "records", "machine-predecessor-owner.json"),
        "wx",
        0o600,
      );
      try {
        const receipt = JSON.stringify(ledger);
        expect(Buffer.byteLength(receipt)).toBeLessThanOrEqual(8192);
        writeSync(file, receipt);
        fsyncSync(file);
      } finally {
        closeSync(file);
      }
    } catch (error) {
      f.fail();
      if (child.exitCode === null && child.signalCode === null) {
        ledger.forced = true;
        child.kill("SIGTERM");
        const kill = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null)
            child.kill("SIGKILL");
        }, 10000);
        kill.unref();
      }
      throw error;
    }
  }, 40000);
});

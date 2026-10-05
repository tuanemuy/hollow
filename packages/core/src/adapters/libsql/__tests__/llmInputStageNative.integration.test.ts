import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { completeLlm, replaceLlm } from "@repo/core/application/llm/completion";
import {
  cancelLlmRegeneration,
  undoLlmBody,
} from "@repo/core/application/llm/control";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import { type LlmConversion, llmMonth } from "@repo/core/domain/llm/entity";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createStageFixture, type StageFixture } from "./llmInputStageFixtures";

const textSource = (fixture: StageFixture) => {
  if (fixture.container.llm?.inputMode !== "leased-text")
    throw new Error("S3_NATIVE_MODE");
  return fixture.container.llm;
};
async function saved(
  fixture: StageFixture,
  jobId: string,
): Promise<LlmConversion> {
  const value = await fixture.container.unitOfWorkProvider.run((u) =>
    u.llmConversions.find(jobId),
  );
  if (!value) throw new Error("S3_NATIVE_RESULT_MISSING");
  return value;
}
async function completeCancelled(fixture: StageFixture, jobId: string) {
  await fixture.container.unitOfWorkProvider.run(async (u) => {
    const value = await u.llmConversions.find(jobId);
    if (!value) throw new Error("S3_NATIVE_RESULT_MISSING");
    await completeLlm(
      fixture.container,
      u,
      value,
      { kind: "cancelled" },
      fixture.now,
    );
  });
}
async function predecessorChild(fixture: StageFixture) {
  const material = path.join(fixture.root, "material");
  await mkdir(material, { recursive: true, mode: 0o700 });
  const directory = path.join(material, "native-predecessor");
  await mkdir(directory, { mode: 0o700 });
  const helper = path.join(material, "native-predecessor.mjs");
  const moduleUrl = new URL(
    "../../node/llm/runtimeOwnership.ts",
    import.meta.url,
  ).href;
  const file = await open(helper, "wx", 0o600);
  try {
    await file.writeFile(`import { NodeLlmRuntimeOwnership } from ${JSON.stringify(moduleUrl)};
const owner = await NodeLlmRuntimeOwnership.acquire(process.argv[2]);
await new Promise((resolve, reject) => process.stdout.write(owner.runtimeId + "\\n", error => error ? reject(error) : resolve()));
`);
    await file.sync();
  } finally {
    await file.close();
  }
  await fixture.guard();
  const require = createRequire(
    new URL("../../../../../../apps/web/package.json", import.meta.url),
  );
  const loader = pathToFileURL(require.resolve("tsx")).href;
  const child = spawn(
    process.execPath,
    ["--import", loader, helper, directory],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const pid = child.pid;
  if (pid === undefined) throw new Error("S3_PREDECESSOR_PID_MISSING");
  let stdout = "";
  let stderr = "";
  let overflow = false;
  let stdoutEnded = false;
  let stderrEnded = false;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    if (Buffer.byteLength(stdout) + Buffer.byteLength(chunk) > 4096)
      overflow = true;
    else stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    if (Buffer.byteLength(stderr) + Buffer.byteLength(chunk) > 4096)
      overflow = true;
    else stderr += chunk;
  });
  child.stdout.once("end", () => {
    stdoutEnded = true;
  });
  child.stderr.once("end", () => {
    stderrEnded = true;
  });
  const exited = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("S3_PREDECESSOR_NATURAL_EXIT_UNPROVEN")),
      5000,
    );
  });
  try {
    const result = await Promise.race([exited, limit]);
    expect(result).toEqual({ code: 0, signal: null });
    expect(overflow).toBe(false);
    expect(stderr).toBe("");
    expect(stdoutEnded).toBe(true);
    expect(stderrEnded).toBe(true);
    expect(stdout).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\n$/,
    );
    expect(() => process.kill(pid, 0)).toThrow(
      expect.objectContaining({ code: "ESRCH" }),
    );
    await fixture.guard();
    const ownership = await NodeLlmRuntimeOwnership.acquire(directory);
    const runtimeId = stdout.trim();
    expect(ownership.predecessors()).toEqual([runtimeId]);
    return { runtimeId, ownership };
  } finally {
    clearTimeout(timer);
  }
}

describe.sequential("S3-N local text input native lifecycle", () => {
  let fixture: StageFixture;
  let failed = false;
  let startedAt = 0;
  beforeAll(async () => {
    startedAt = Date.now();
    fixture = await createStageFixture("native");
  }, 40_000);
  beforeEach(async () => {
    if (failed) throw new Error("S3_NATIVE_FAILED_DATABASE_REUSE_REFUSED");
    if (Date.now() - startedAt > 300_000)
      throw new Error("S3_NATIVE_GROUP_DEADLINE");
    await fixture.guard();
  });
  afterEach(async (context) => {
    if (context.task.result?.state === "fail") {
      failed = true;
      return;
    }
    try {
      await fixture.guard();
    } catch (error) {
      failed = true;
      throw error;
    }
  });
  afterAll(async () => {
    if (fixture) await fixture.close();
  }, 60_000);

  for (const [number, name] of [
    [13, "S3-N01 text commits body after closed input and supports undo"],
    [14, "S3-N02 HTML media restores asset after actual text Worker closure"],
    [
      15,
      "S3-N03 Markdown media restores asset after actual text Worker closure",
    ],
  ] as const) {
    it(name, async () => {
      const slot = fixture.slots.get(number);
      if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
      const before = await fixture.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(slot.noteId),
      );
      const generated = fixture.generateCalls;
      const request = await fixture.request(number);
      await sweepLlm(fixture.container);
      const value = await fixture.finish(request.jobId);
      expect(value.outcome.kind).toBe("succeeded");
      expect(value.sourceMemoryBytes).toBe(0);
      expect(value.inputReceipt).toMatchObject({
        state: "closed",
        consumer: { kind: "llm-conversion", id: value.jobId },
      });
      expect(value.owner.state).toBe("closed");
      expect(fixture.workerStartsByOriginal.get(slot.originalId)).toBe(1);
      expect(fixture.activeWorkers).toBe(0);
      expect(fixture.generateCalls).toBe(generated + 1);
      const state = await fixture.container.unitOfWorkProvider.run(
        async (u) => ({
          note: await u.notes.findById(slot.noteId),
          quota: await u.llmQuota.reservation(value.jobId),
          dispatch: await u.llmDispatches.list(value.jobId),
          references: await u.assets.referenceIds(slot.noteId, 0),
        }),
      );
      expect(state.note?.version).toBe((before?.version ?? 0) + 1);
      expect(state.note?.html).toContain("生成済み");
      expect(state.note?.title).toBe(before?.title);
      expect(state.note?.html).not.toContain("[[hollow-media:");
      expect(state.dispatch).toHaveLength(1);
      expect(state.dispatch[0]?.state).toBe("scrubbed");
      expect(state.quota?.state).toBe("consumed");
      if (slot.assetId && slot.assetUrl) {
        expect(state.note?.html).toContain(slot.assetUrl);
        expect(state.references).toContain(slot.assetId);
        const input = fixture.generatedInputs.at(-1);
        expect(input?.kind === "chat-text" ? input.input.html : "").toContain(
          slot.marker,
        );
      }
      await undoLlmBody(fixture.container, slot.token, value.jobId);
      const restored = await fixture.container.unitOfWorkProvider.run((u) =>
        u.notes.findById(slot.noteId),
      );
      expect(restored?.html).toBe(before?.html);
      expect(fixture.generateCalls).toBe(generated + 1);
    }, 40_000);
  }

  it("S3-N04 preparation cancellation closes actual Worker before quota release and preserves old body", async () => {
    const slot = fixture.slots.get(16);
    if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
    const source = fixture.preparer;
    const prepare = source.prepare.bind(source);
    const request = await fixture.request(16);
    const generated = fixture.generateCalls;
    let cancel: Promise<unknown> | undefined;
    source.prepare = (input, signal) => {
      const pending = prepare(input, signal);
      void pending.catch(() => {});
      cancel = cancelLlmRegeneration(
        fixture.container,
        slot.token,
        request.jobId,
      );
      return pending;
    };
    try {
      await sweepLlm(fixture.container);
      await vi.waitFor(() => expect(cancel).toBeDefined(), { timeout: 5000 });
      await cancel;
      const value = await fixture.finish(request.jobId);
      expect(value.outcome.kind).toBe("cancelled");
      expect(value.sourceMemoryBytes).toBe(0);
      expect(value.inputReceipt?.state).toBe("closed");
      expect(fixture.workerStartsByOriginal.get(slot.originalId)).toBe(1);
      expect(fixture.activeWorkers).toBe(0);
      expect(fixture.generateCalls).toBe(generated);
      const state = await fixture.container.unitOfWorkProvider.run(
        async (u) => ({
          note: await u.notes.findById(slot.noteId),
          quota: await u.llmQuota.reservation(value.jobId),
        }),
      );
      expect(state.note?.html).toBe("<p>元の本文</p>");
      expect(state.quota?.state).toBe("released");
    } finally {
      source.prepare = prepare;
    }
  }, 40_000);

  it("S3-N05 invalid UTF8 fails preparation with closed input, unsent quota release and unchanged body", async () => {
    const slot = fixture.slots.get(17);
    if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
    const generated = fixture.generateCalls;
    const request = await fixture.request(17);
    await sweepLlm(fixture.container);
    const value = await fixture.finish(request.jobId);
    expect(value.outcome).toEqual({
      kind: "failed",
      code: "LLM_SOURCE_INVALID",
    });
    expect(value.sourceMemoryBytes).toBe(0);
    expect(value.inputReceipt?.state).toBe("closed");
    expect(fixture.workerStartsByOriginal.get(slot.originalId)).toBe(1);
    expect(fixture.activeWorkers).toBe(0);
    expect(fixture.generateCalls).toBe(generated);
    const state = await fixture.container.unitOfWorkProvider.run(async (u) => ({
      note: await u.notes.findById(slot.noteId),
      quota: await u.llmQuota.reservation(value.jobId),
    }));
    expect(state.note?.html).toBe("<p>元の本文</p>");
    expect(state.quota?.state).toBe("released");
  }, 40_000);

  it("S3-N06 possible generator delivery preserves consumed quota after input closes", async () => {
    const slot = fixture.slots.get(18);
    if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
    const service = textSource(fixture);
    fixture.container = {
      ...fixture.container,
      llm: {
        ...service,
        generator: {
          generate: async () => {
            throw new LlmOperationError(
              "LLM_DELIVERY_UNKNOWN",
              "possible",
              true,
            );
          },
        },
      },
    };
    try {
      const request = await fixture.request(18);
      await sweepLlm(fixture.container);
      const value = await fixture.finish(request.jobId);
      expect(value.outcome.kind).toBe("unknown");
      expect(value.sourceMemoryBytes).toBe(0);
      expect(value.inputReceipt?.state).toBe("closed");
      expect(value.owner.state).toBe("closed");
      expect(fixture.workerStartsByOriginal.get(slot.originalId)).toBe(1);
      expect(fixture.activeWorkers).toBe(0);
      const state = await fixture.container.unitOfWorkProvider.run(
        async (u) => ({
          note: await u.notes.findById(slot.noteId),
          quota: await u.llmQuota.reservation(value.jobId),
        }),
      );
      expect(state.note?.html).toBe("<p>元の本文</p>");
      expect(state.quota?.state).toBe("consumed");
    } finally {
      fixture.container = { ...fixture.container, llm: service };
    }
  }, 40_000);

  it("S3-N07 read then abort discards only owned idle bytes before finish with no Worker or dispatch", async () => {
    const slot = fixture.slots.get(19);
    if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
    const workers = fixture.workerStarts;
    const generated = fixture.generateCalls;
    const request = await fixture.request(19);
    const claim = await fixture.stage.claim();
    if (!claim?.lease) throw new Error("S3_NATIVE_LEASE_MISSING");
    expect(claim.value.jobId).toBe(request.jobId);
    const controller = new AbortController();
    const lease = claim.lease;
    await fixture.storage.withOwner(
      { kind: "conversion-job", id: request.jobId },
      async () => {
        await fixture.stage.read(lease, controller.signal);
        expect((await saved(fixture, request.jobId)).sourceMemoryBytes).toBe(
          52_428_800,
        );
        await expect(fixture.stage.finish(claim.value)).rejects.toThrow();
        controller.abort();
        fixture.stage.discard(claim.value);
        await fixture.stage.finish(claim.value);
      },
    );
    await completeCancelled(fixture, request.jobId);
    const value = await fixture.finish(request.jobId);
    expect(value.inputReceipt?.state).toBe("closed");
    expect(value.sourceMemoryBytes).toBe(0);
    expect(fixture.workerStarts).toBe(workers);
    expect(fixture.generateCalls).toBe(generated);
    expect(
      await fixture.container.unitOfWorkProvider.run((u) =>
        u.llmDispatches.list(request.jobId),
      ),
    ).toEqual([]);
  }, 40_000);

  it("S3-N08 stop reconciles a saved unknown claim and a natural-exit predecessor permits exact recovery", async () => {
    const service = textSource(fixture);
    const localRead = service.source.read.bind(service.source);
    let reads = 0;
    service.source.read = (...args) => {
      reads++;
      return localRead(...args);
    };
    const provider = fixture.container.unitOfWorkProvider;
    let lose = true;
    fixture.container = {
      ...fixture.container,
      unitOfWorkProvider: {
        async run<T>(
          work: (u: HollowUnitOfWorkContext) => Promise<T>,
        ): Promise<T> {
          let claimed = false;
          const result = await provider.run(async (u) => {
            const claim = u.llmConversions.claimExact.bind(u.llmConversions);
            u.llmConversions.claimExact = async (input) => {
              const value = await claim(input);
              if (value) claimed = true;
              return value;
            };
            return work(u);
          });
          if (lose && claimed) {
            lose = false;
            throw new SystemError(
              SystemErrorCode.DatabaseError,
              "S3_SYNTHETIC_CLAIM_ACK_LOST",
            );
          }
          return result;
        },
      },
    };
    const workers = fixture.workerStarts;
    try {
      const request = await fixture.request(20);
      expect(await fixture.stage.claim()).toBeNull();
      await expect(fixture.stage.stop()).rejects.toMatchObject({
        code: "LLM_OWNERSHIP_UNKNOWN",
        closed: false,
      });
      const value = await saved(fixture, request.jobId);
      expect(value.sourceMemoryBytes).toBe(52_428_800);
      expect(fixture.stage.lease(value)).not.toBeNull();
      expect(reads).toBe(0);
      await fixture.stage.finish(value);
      await completeCancelled(fixture, request.jobId);
      await fixture.stage.stop();
      const predecessor = await predecessorChild(fixture);
      fixture.container = {
        ...fixture.container,
        unitOfWorkProvider: provider,
      };
      const next = await fixture.request(20);
      await provider.run(async (u) => {
        const candidate = await u.llmConversions.find(next.jobId);
        if (!candidate) throw new Error("S3_NATIVE_CANDIDATE_MISSING");
        const token = fixture.container.idGenerator.next();
        const orphan = await u.llmConversions.claimExact({
          candidate,
          now: fixture.now,
          runtimeId: predecessor.runtimeId,
          ownerToken: token,
          receipt: {
            consumer: { kind: "llm-conversion", id: next.jobId },
            runtimeId: predecessor.runtimeId,
            token,
            generation: (candidate.inputReceipt?.generation ?? 0) + 1,
            state: "active",
          },
        });
        if (
          !orphan ||
          orphan.owner.state !== "active" ||
          !orphan.inputReceipt ||
          orphan.inputReceipt.state === "closed"
        )
          throw new Error("S3_NATIVE_ORPHAN_CLAIM_MISSING");
        await replaceLlm(u, orphan, {
          ...orphan,
          owner: { ...orphan.owner, state: "unknown" },
          inputReceipt: { ...orphan.inputReceipt, state: "unknown" },
        });
      });
      const recoveryExecution = new NodeLlmExecution(
        predecessor.ownership,
        fixture.container.clock,
      );
      fixture.container = {
        ...fixture.container,
        llm: {
          ...service,
          ownership: predecessor.ownership,
          execution: recoveryExecution,
        },
      };
      let fault: "second-cas" | "commit-response" | "none" = "second-cas";
      fixture.container = {
        ...fixture.container,
        unitOfWorkProvider: {
          async run<T>(
            work: (u: HollowUnitOfWorkContext) => Promise<T>,
          ): Promise<T> {
            let closed = false;
            const result = await provider.run(async (u) => {
              const replace = u.llmConversions.replace.bind(u.llmConversions);
              u.llmConversions.replace = async (value, version) => {
                if (
                  value.jobId === next.jobId &&
                  value.sourceMemoryBytes === 0 &&
                  value.inputReceipt?.state === "closed"
                ) {
                  if (fault === "second-cas") return false;
                  closed = true;
                }
                return replace(value, version);
              };
              return work(u);
            });
            if (closed && fault === "commit-response")
              throw new SystemError(
                SystemErrorCode.DatabaseError,
                "S3_PREDECESSOR_ACK_LOST",
              );
            return result;
          },
        },
      };
      await expect(recoverLlm(fixture.container)).rejects.toThrow();
      const rolledBack = await saved(fixture, next.jobId);
      expect(rolledBack.owner.state).toBe("unknown");
      expect(rolledBack.sourceMemoryBytes).toBe(52_428_800);
      expect(rolledBack.inputReceipt?.state).toBe("unknown");
      expect(predecessor.ownership.predecessors()).toEqual([
        predecessor.runtimeId,
      ]);
      expect(
        predecessor.ownership.pendingInputProofs(predecessor.runtimeId),
      ).toHaveLength(1);
      fault = "commit-response";
      await expect(recoverLlm(fixture.container)).rejects.toMatchObject({
        code: SystemErrorCode.DatabaseError,
      });
      const responseLost = await saved(fixture, next.jobId);
      expect(responseLost.phase).toBe("terminal");
      expect(responseLost.sourceMemoryBytes).toBe(0);
      expect(responseLost.inputReceipt?.state).toBe("closed");
      expect(predecessor.ownership.predecessors()).toEqual([
        predecessor.runtimeId,
      ]);
      expect(
        predecessor.ownership.pendingInputProofs(predecessor.runtimeId),
      ).toHaveLength(1);
      fault = "none";
      await recoverLlm(fixture.container);
      expect(
        predecessor.ownership.pendingInputProofs(predecessor.runtimeId),
      ).toHaveLength(0);
      const recovered = await saved(fixture, next.jobId);
      expect(recovered.owner.state).toBe("closed");
      expect(recovered.sourceMemoryBytes).toBe(0);
      expect(recovered.inputReceipt?.state).toBe("closed");
      expect(recovered.phase).toBe("terminal");
      expect(predecessor.ownership.predecessors()).toEqual([]);
      expect(reads).toBe(0);
      expect(fixture.workerStarts).toBe(workers);
      expect(fixture.workerStarts).toBe(6);
      expect(fixture.workerClosureUnknown).toBe(false);
      await recoveryExecution.stop();
      const slot = fixture.slots.get(20);
      if (!slot) throw new Error("S3_NATIVE_SLOT_MISSING");
      const quota = await provider.run((u) =>
        u.llmQuota.usage(slot.accountId, llmMonth(fixture.now)),
      );
      expect(quota?.reserved).toBe(0);
    } finally {
      service.source.read = localRead;
      fixture.container = {
        ...fixture.container,
        unitOfWorkProvider: provider,
        llm: service,
      };
    }
  }, 40_000);
});

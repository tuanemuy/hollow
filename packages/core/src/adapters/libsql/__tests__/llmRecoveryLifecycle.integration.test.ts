import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmRuntimeOwnership } from "@repo/core/adapters/node/llm/runtimeOwnership";
import { NodeLlmSourcePreparer } from "@repo/core/adapters/node/llm/sourcePreparer";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  type LlmGenerator,
  LlmOperationError,
  type LlmRuntimeOwnership,
} from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("LLM recovery with actual predecessor process closure", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeLlmExecution;
  let root: string;
  let accountId: string;
  let noteId: string;
  const token = "synthetic-session";
  const now = new Date("2026-09-28T00:00:00Z");
  let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
  const children: Array<{ finish(): Promise<void> }> = [];
  let dbCreated = false;
  let storageCreated = false;
  let executionCreated = false;
  let retainedFailure = false;
  async function noPriorFixture() {
    expect(retainedFailure).toBe(false);
    expect(
      (await readdir(tmpdir())).filter(
        (name) =>
          name.startsWith("libsql-test-") || name.startsWith("hollow-llm-"),
      ).length,
    ).toBe(0);
  }
  beforeEach(async (context) => {
    context.task.meta.fixturePid = process.pid;
    dbCreated = false;
    storageCreated = false;
    executionCreated = false;
    await noPriorFixture();
    base = await createTestContainer();
    dbCreated = true;
    root = await mkdtemp(path.join(tmpdir(), "hollow-llm-recovery-"));
    storageCreated = true;
    const initial = createHollowContainer(base.db, "http://localhost:3100", {
      send: async () => {},
    });
    const clock = { now: () => now };
    const runtimeId = base.idGenerator.next();
    const ownership = {
      runtimeId,
      predecessors: () => [],
      assertReady: () => {},
      acknowledge: async () => {},
    };
    execution = new NodeLlmExecution(ownership, clock);
    executionCreated = true;
    const storage = new CoordinatedObjectStorage(
      root,
      initial.unitOfWorkProvider,
      clock,
    );
    await storage.recoverOwners();
    generate = vi.fn(async () => ({
      content: "<h1>生成済み</h1><p>日本語の本文</p>",
      finish: "stop" as const,
      inputTokens: 1,
      outputTokens: 2,
    }));
    c = {
      ...initial,
      clock,
      openRouter: {
        authorization: {
          authorization: async () => "",
          exchange: async () => "synthetic",
          inspectCredential: async () => ({
            expiresAt: null,
            providerUserId: null,
          }),
        },
        catalog: { list: async () => [], fallback: () => [] },
        protector: {
          available: () => true,
          protect: (v) => v,
          reveal: (v) => v,
        },
        execution: {
          run: (fn) => fn(new AbortController().signal),
          stop: async () => {},
        },
      },
      llm: {
        inputMode: "legacy-local",
        ...pdfFixtureServices(),
        configured: true,
        storage,
        source: new NodeLlmSourceReader(storage),
        preparer: new NodeLlmSourcePreparer(
          new URL("../../node/llm/sourceWorker.mjs", import.meta.url),
        ),
        profiles: {
          inspect: async ({ modelId }) => ({
            modelId,
            kind: "chat-text",
            contextTokens: 100000,
            outputTokens: 8192,
            supportsMaxTokens: true,
            source: "live",
            checkedAt: now,
          }),
        },
        generator: { generate: (...args) => generate(...args) },
        result: new NodeLlmResultProcessor(),
        execution,
        ownership,
        monthlyLimit: 30,
        wake: () => {},
      },
    };
    accountId = base.idGenerator.next();
    noteId = base.idGenerator.next();
    const originalId = base.idGenerator.next();
    const jobId = base.idGenerator.next();
    const batchId = base.idGenerator.next();
    const bytes = Buffer.from("保存原本の日本語\n二段落目");
    await new FileObjectStorage(root).put(
      "original",
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      bytes.length,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(accountId, "flow@fixture.invalid", "synthetic", now),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId,
        tokenHash: c.tokens.hash(token),
        expiresAt: new Date(now.getTime() + 86400000),
      });
      const connection = await u.openRouterConnections.ensure(accountId, now);
      await u.openRouterConnections.replace(
        {
          ...connection,
          state: "linked",
          credentialEnvelope: "synthetic",
          epoch: 1,
          version: 2,
          linkedAt: now,
          everLinkedAt: now,
          keyExpiresAt: null,
          providerUserId: null,
          lastUsedAt: null,
        },
        1,
      );
      await u.notes.insert(
        createNote(
          {
            id: noteId,
            accountId,
            title: "保持する題名",
            html: "<p>元の本文</p>",
            text: "元の本文",
          },
          now,
        ),
      );
      await u.imports.insertBatch({
        id: batchId,
        accountId,
        createdAt: now,
        useAi: false,
        cancelledAt: null,
      });
      await u.imports.insertOriginal({
        id: originalId,
        noteId,
        accountId,
        name: "fixture.txt",
        bytes: bytes.length,
        storageKey: "original",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        format: "text",
        state: "ready",
        coverage: "complete",
        activeJobId: jobId,
        createdAt: now,
      });
      await u.jobs.insert({
        id: jobId,
        originalId,
        batchId,
        accountId,
        noteId,
        noteVersion: 0,
        useAi: false,
        state: "succeeded",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
        attempt: 1,
        retryOf: null,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  afterEach(async (context) => {
    let healthy = context.task.result?.state !== "fail";
    let closed = !executionCreated;
    try {
      for (const child of children.splice(0)) await child.finish();
      if (executionCreated) await execution.stop();
      closed = true;
      if (dbCreated) {
        expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(
          0,
        );
        expect(
          (await base.db.all(sql`select 1 from object_writes where active=1`))
            .length,
        ).toBe(0);
      }
    } catch (error) {
      healthy = false;
      throw error;
    } finally {
      if (closed && healthy) {
        if (dbCreated) base.close();
        if (storageCreated) await rm(root, { recursive: true, force: true });
        await noPriorFixture();
      } else {
        retainedFailure = true;
        if (closed && dbCreated) base.client.close();
      }
      context.task.meta.fixtureClosed = closed;
    }
  });

  async function childOwner() {
    const directory = path.join(root, "llm-owner");
    const moduleUrl = new URL(
      "../../node/llm/runtimeOwnership.ts",
      import.meta.url,
    ).href;
    const program = `
      process.on('message', () => process.exit(0));
      const watchdog = setTimeout(() => process.exit(1), 15000);
      try {
        const { NodeLlmRuntimeOwnership } = await import(${JSON.stringify(moduleUrl)});
        const owner = await NodeLlmRuntimeOwnership.acquire(process.argv[1]);
        process.send({ runtimeId: owner.runtimeId, predecessors: owner.predecessors() });
      } catch {
        process.send({ failed: true }, () => process.exit(1));
      }
    `;
    const child = spawn(
      process.execPath,
      [
        "--experimental-transform-types",
        "--import",
        new URL("../../../../../../tests/resolveTsImports.mjs", import.meta.url)
          .pathname,
        "--input-type=module",
        "--eval",
        program,
        directory,
      ],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    const closed = new Promise<number | null>((resolve, reject) => {
      child.once("close", resolve);
      child.once("error", () => reject(new Error("self child start failed")));
    });
    void closed.catch(() => {});
    let ending: Promise<void> | undefined;
    const finish = () => {
      ending ??= (async () => {
        if (child.connected) child.send("exit");
        expect(await closed).toBe(0);
        const pid = child.pid;
        if (pid === undefined) throw new Error("self child PID unavailable");
        expect(() => process.kill(pid, 0)).toThrow(
          expect.objectContaining({ code: "ESRCH" }),
        );
      })();
      return ending;
    };
    children.push({ finish });
    const value = await new Promise<
      Readonly<{ runtimeId: string; predecessors: readonly string[] }>
    >((resolve, reject) => {
      child.once("message", (message: unknown) => {
        if (
          typeof message === "object" &&
          message !== null &&
          "runtimeId" in message &&
          typeof message.runtimeId === "string" &&
          /^[0-9a-f-]{36}$/.test(message.runtimeId) &&
          "predecessors" in message &&
          Array.isArray(message.predecessors) &&
          message.predecessors.every(
            (id: unknown) =>
              typeof id === "string" && /^[0-9a-f-]{36}$/.test(id),
          )
        ) {
          resolve({
            runtimeId: message.runtimeId,
            predecessors: message.predecessors,
          });
        } else reject(new Error("self child owner unavailable"));
      });
      void closed.then(
        () => reject(new Error("self child ended before ready")),
        reject,
      );
    });
    return { ...value, finish, directory };
  }

  async function useOwner(ownership: LlmRuntimeOwnership) {
    if (!c.llm) throw new Error("self LLM missing");
    await execution.stop();
    execution = new NodeLlmExecution(ownership, c.clock);
    c = { ...c, llm: { ...legacyLlm(c), ownership, execution } };
  }
  const state = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.llmConversions.find(id));
  const usage = () =>
    c.unitOfWorkProvider.run((u) => u.llmQuota.usage(accountId, "2026-09"));
  async function seed(runtimeId: string, response = false) {
    if (!c.llm) throw new Error("self LLM missing");
    const job = await requestLlmRegeneration(c, token, {
      noteId,
      noteVersion: 0,
      commandId: base.idGenerator.next(),
      expectedEpoch: 1,
      modelId: "fixture/text",
      instruction: "見出しを整理",
      confirmed: true,
    });
    const prepared = await c.llm.preparer.prepare(
      {
        bytes: Buffer.from("保存原本の日本語\n二段落目"),
        source: {
          kind: "original",
          originalId: "synthetic",
          sha256: createHash("sha256")
            .update("保存原本の日本語\n二段落目")
            .digest("hex"),
          bytes: Buffer.byteLength("保存原本の日本語\n二段落目"),
          format: "text",
        },
        preparationVersion: 1,
        promptVersion: 1,
      },
      new AbortController().signal,
    );
    if (prepared.kind !== "text-blocks") throw Error("SYNTHETIC_KIND");
    const segment = prepared.segments[0];
    if (!segment || prepared.segments.length !== 1)
      throw new Error("self segment shape");
    const ownerToken = base.idGenerator.next();
    const dispatchId = base.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      const claimed = await u.llmConversions.claim(now, runtimeId, ownerToken);
      if (
        !claimed ||
        claimed.jobId !== job.jobId ||
        claimed.selection !== "fixed"
      )
        throw new Error("self claim missing");
      await u.llmDispatches.prepare({
        id: dispatchId,
        jobId: job.jobId,
        ordinal: 0,
        input: segment.identity,
        runtimeId,
        ownerToken,
        state: "prepared",
        intentAt: null,
        response: null,
      });
      expect(
        await u.llmConversions.replace(
          { ...claimed, phase: "dispatching", version: claimed.version + 1 },
          claimed.version,
        ),
      ).toBe(true);
      expect(await u.llmDispatches.intent(dispatchId, ownerToken, now)).toBe(
        true,
      );
      if (response)
        expect(
          await u.llmDispatches.response(dispatchId, ownerToken, {
            content: "<h1>保存済み応答</h1><p>日本語本文</p>",
            finish: "stop",
            inputTokens: 1,
            outputTokens: 2,
          }),
        ).toBe(true);
      expect(
        await u.llmConversions.replace(
          {
            ...claimed,
            phase: response ? "response-ready" : "dispatching",
            version: claimed.version + 2,
          },
          claimed.version + 1,
        ),
      ).toBe(true);
    });
    return job;
  }

  it("recovers only the proven dead predecessor, never resends intent and excludes an expired LLM lease from mechanical claims", async () => {
    const old = await childOwner();
    const job = await seed(old.runtimeId);
    const before = await state(job.jobId);
    expect(before).toMatchObject({
      phase: "dispatching",
      owner: { state: "active", runtimeId: old.runtimeId },
    });
    await expect(
      NodeLlmRuntimeOwnership.acquire(old.directory),
    ).rejects.toMatchObject({ code: "LLM_OWNERSHIP_UNKNOWN", closed: false });
    const unrelated = await NodeLlmRuntimeOwnership.acquire(
      path.join(root, "other-owner"),
    );
    await useOwner(unrelated);
    await recoverLlm(c);
    expect(await state(job.jobId)).toEqual(before);
    const later = new Date(now.getTime() + 31 * 60000);
    const leaseBefore = await c.unitOfWorkProvider.run((u) =>
      u.jobs.find(job.jobId),
    );
    expect(leaseBefore?.leaseUntil && leaseBefore.leaseUntil < later).toBe(
      true,
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.jobs.claim(
          later,
          base.idGenerator.next(),
          new Date(later.getTime() + 60000),
        ),
      ),
    ).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(job.jobId)),
    ).toEqual(leaseBefore);
    await old.finish();
    const current = await NodeLlmRuntimeOwnership.acquire(old.directory);
    expect(current.predecessors()).toEqual([old.runtimeId]);
    await useOwner(current);
    await recoverLlm(c);
    expect(await state(job.jobId)).toMatchObject({
      phase: "terminal",
      outcome: { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" },
      owner: { state: "closed" },
      responseBudget: 0,
    });
    expect(current.predecessors()).toEqual([]);
    await sweepLlm(c);
    await recoverLlm(c);
    expect(generate).not.toHaveBeenCalled();
    expect(await usage()).toMatchObject({ consumed: 1, reserved: 0 });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))?.html,
    ).toBe("<p>元の本文</p>");
  });

  it("postprocesses all durable responses only after native predecessor exit without decrypting or dispatching again", async () => {
    const old = await childOwner();
    const job = await seed(old.runtimeId, true);
    await old.finish();
    const current = await NodeLlmRuntimeOwnership.acquire(old.directory);
    await useOwner(current);
    await recoverLlm(c);
    expect(await state(job.jobId)).toMatchObject({
      phase: "response-ready",
      owner: { state: "closed" },
      outcome: { kind: "pending" },
    });
    if (!c.llm) throw new Error("self LLM missing");
    const { openRouter, ...withoutKey } = c;
    void openRouter;
    c = { ...withoutKey, llm: { ...legacyLlm(c), configured: false } };
    await sweepLlm(c);
    await vi.waitFor(async () =>
      expect((await state(job.jobId))?.phase).toBe("terminal"),
    );
    await vi.waitFor(() => expect(execution.active(job.jobId)).toBe(false));
    expect((await state(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(generate).not.toHaveBeenCalled();
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))?.html,
    ).toBe("<h1>保存済み応答</h1><p>日本語本文</p>");
    expect(await usage()).toMatchObject({ consumed: 1, reserved: 0 });
  });

  it("keeps unacknowledged predecessors across another real child exit and repeats database recovery idempotently", async () => {
    const first = await childOwner();
    const job = await seed(first.runtimeId);
    await first.finish();
    const middle = await childOwner();
    expect(middle.predecessors).toEqual([first.runtimeId]);
    await useOwner({
      runtimeId: middle.runtimeId,
      predecessors: () => middle.predecessors,
      assertReady: () => {
        throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
      },
      acknowledge: async () => {
        throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
      },
    });
    await expect(recoverLlm(c)).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    const recovered = await state(job.jobId);
    expect(recovered).toMatchObject({
      phase: "terminal",
      outcome: { kind: "unknown" },
      owner: { state: "closed" },
    });
    await middle.finish();
    const current = await NodeLlmRuntimeOwnership.acquire(first.directory);
    expect(current.predecessors()).toEqual([first.runtimeId, middle.runtimeId]);
    expect(() => current.assertReady()).toThrow(
      expect.objectContaining({ code: "LLM_OWNERSHIP_UNKNOWN" }),
    );
    await useOwner(current);
    await recoverLlm(c);
    expect(current.predecessors()).toEqual([]);
    expect(() => current.assertReady()).not.toThrow();
    expect(await state(job.jobId)).toEqual(recovered);
    await recoverLlm(c);
    expect(await state(job.jobId)).toEqual(recovered);
    expect(generate).not.toHaveBeenCalled();
    expect(await usage()).toMatchObject({ consumed: 1, reserved: 0 });
  });
});

import { pdfFixtureServices } from "./llmPdfFixtureServices";

function legacyLlm(c: HollowContainer) {
  if (c.llm?.inputMode !== "legacy-local") throw new Error("TEST_LLM_MODE");
  return c.llm;
}

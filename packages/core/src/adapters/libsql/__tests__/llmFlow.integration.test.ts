import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmSourcePreparer } from "@repo/core/adapters/node/llm/sourcePreparer";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { recordLlmUse } from "@repo/core/application/llm/completion";
import {
  isLlmOperationError,
  type LlmGenerator,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { isSerializableError } from "@repo/core/lib/error";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("LLM accepted request to owned source, durable response and current body", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeLlmExecution;
  let root: string;
  let accountId: string;
  let noteId: string;
  const token = "synthetic-session";
  const now = new Date("2026-09-28T00:00:00Z");
  let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
  let release = () => {};
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
    root = await mkdtemp(path.join(tmpdir(), "hollow-llm-flow-"));
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
        requestedVisibility: "private",
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
    release();
    release = () => {};
    let healthy = context.task.result?.state !== "fail";
    let closed = !executionCreated;
    try {
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
  async function request() {
    return requestLlmRegeneration(c, token, {
      noteId,
      noteVersion: 0,
      commandId: base.idGenerator.next(),
      expectedEpoch: 1,
      modelId: "fixture/text",
      instruction: "見出しを整理",
      confirmed: true,
    });
  }
  async function finished(jobId: string) {
    await vi.waitFor(async () =>
      expect(
        (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(jobId)))
          ?.phase,
      ).toBe("terminal"),
    );
    await vi.waitFor(() => expect(execution.active(jobId)).toBe(false));
    return c.unitOfWorkProvider.run((u) => u.llmConversions.find(jobId));
  }
  function loseAcknowledgement(at: "intent" | "response" | "terminal") {
    const provider = c.unitOfWorkProvider;
    let armed = true;
    c = {
      ...c,
      unitOfWorkProvider: {
        async run<T>(
          fn: (u: HollowUnitOfWorkContext) => Promise<T>,
        ): Promise<T> {
          let lose = false;
          const result = await provider.run(async (u) => {
            if (armed && at === "intent") {
              const method = u.llmDispatches.intent.bind(u.llmDispatches);
              u.llmDispatches.intent = async (...args) => {
                const result = await method(...args);
                if (result) lose = true;
                return result;
              };
            }
            if (armed && at === "response") {
              const method = u.llmDispatches.response.bind(u.llmDispatches);
              u.llmDispatches.response = async (...args) => {
                const result = await method(...args);
                if (result) lose = true;
                return result;
              };
            }
            if (armed && at === "terminal") {
              const method = u.llmConversions.replace.bind(u.llmConversions);
              u.llmConversions.replace = async (...args) => {
                const result = await method(...args);
                if (result && args[0].phase === "terminal") lose = true;
                return result;
              };
            }
            return fn(u);
          });
          if (lose && armed) {
            armed = false;
            throw new Error("SYNTHETIC_COMMIT_ACK_LOST");
          }
          return result;
        },
      },
    };
  }
  async function recoverWithProvenPredecessor() {
    if (!c.llm) throw Error("missing fixture");
    const old = execution.runtimeId;
    await execution.stop().catch(() => {});
    let predecessor = old;
    const ownership = {
      runtimeId: base.idGenerator.next(),
      predecessors: () => (predecessor ? [predecessor] : []),
      assertReady: () => {
        if (predecessor) throw Error("unacknowledged");
      },
      acknowledge: async (id: string) => {
        if (id !== old) throw Error("wrong predecessor");
        predecessor = "";
      },
    };
    execution = new NodeLlmExecution(ownership, c.clock);
    c = { ...c, llm: { ...legacyLlm(c), ownership, execution } };
    await recoverLlm(c);
  }
  async function usageDispatch(
    jobId: string,
    ordinal: number,
    at: Date | null,
  ) {
    const id = base.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      const candidate = await u.llmConversions.find(jobId);
      if (!candidate) throw Error("missing job");
      const owned =
        candidate.owner.state === "idle"
          ? await u.llmConversions.claimExact({
              candidate,
              now,
              runtimeId: execution.runtimeId,
              ownerToken: "synthetic-owned-dispatch",
              receipt: null,
            })
          : candidate;
      if (
        !owned ||
        owned.owner.state !== "active" ||
        owned.selection !== "fixed"
      )
        throw Error("missing claimed owner");
      expect(
        await u.llmConversions.replace(
          { ...owned, phase: "dispatching", version: owned.version + 1 },
          owned.version,
        ),
      ).toBe(true);
      await u.llmDispatches.prepare({
        id,
        jobId,
        ordinal,
        input: { kind: "prepared-segment", ordinal, sha256: "a".repeat(64) },
        runtimeId: execution.runtimeId,
        ownerToken: "synthetic-owned-dispatch",
        state: "prepared",
        intentAt: null,
        response: null,
      });
      if (at)
        expect(
          await u.llmDispatches.intent(id, "synthetic-owned-dispatch", at),
        ).toBe(true);
    });
    return id;
  }
  it.each([
    "prepared",
    "intent",
    "not-sent",
    "unknown",
    "response",
  ] as const)("records connection use only after durable %s dispatch evidence", async (state) => {
    const job = await request();
    const id = await usageDispatch(
      job.jobId,
      0,
      state === "prepared" ? null : now,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      if (state === "not-sent" || state === "unknown")
        await u.llmDispatches.fail(
          id,
          "synthetic-owned-dispatch",
          state === "not-sent" ? "not-sent" : "possible",
        );
      if (state === "response")
        await u.llmDispatches.response(id, "synthetic-owned-dispatch", {
          content: "<p>合成応答</p>",
          finish: "stop",
          inputTokens: 1,
          outputTokens: 1,
        });
      const value = await u.llmConversions.find(job.jobId);
      if (!value) throw Error("missing job");
      await recordLlmUse(u, value, now);
    });
    const connection = await c.unitOfWorkProvider.run((u) =>
      u.openRouterConnections.find(accountId),
    );
    expect(connection?.lastUsedAt).toEqual(
      state === "unknown" || state === "response" ? now : null,
    );
    expect(generate).not.toHaveBeenCalled();
  });
  it("keeps use monotonic across reversed completions and rejects old or unlinked credential epochs", async () => {
    const job = await request();
    const newer = new Date(now.getTime() + 2000);
    const older = new Date(now.getTime() + 1000);
    const first = await usageDispatch(job.jobId, 0, newer);
    const second = await usageDispatch(job.jobId, 1, older);
    const record = async (id: string) =>
      c.unitOfWorkProvider.run(async (u) => {
        await u.llmDispatches.fail(id, "synthetic-owned-dispatch", "possible");
        const value = await u.llmConversions.find(job.jobId);
        if (!value) throw Error("missing job");
        await recordLlmUse(u, value, new Date(now.getTime() + 3000));
        return u.openRouterConnections.find(accountId);
      });
    const connection = await record(first);
    expect(connection?.lastUsedAt).toEqual(newer);
    expect(await record(second)).toEqual(connection);
    await c.unitOfWorkProvider.run(async (u) => {
      const current = await u.openRouterConnections.find(accountId);
      if (!current || current.state !== "linked")
        throw Error("missing connection");
      await u.openRouterConnections.replace(
        {
          ...current,
          epoch: 2,
          version: current.version + 1,
          lastUsedAt: null,
        },
        current.version,
      );
      const value = await u.llmConversions.find(job.jobId);
      if (!value) throw Error("missing job");
      await recordLlmUse(u, value, newer);
      expect(
        (await u.openRouterConnections.find(accountId))?.lastUsedAt,
      ).toBeNull();
      const next = await u.openRouterConnections.find(accountId);
      if (!next) throw Error("missing connection");
      await u.openRouterConnections.replace(
        {
          ...next,
          state: "unlinked",
          credentialEnvelope: null,
          keyExpiresAt: null,
          providerUserId: null,
          linkedAt: null,
          lastUsedAt: null,
          epoch: next.epoch + 1,
          version: next.version + 1,
        },
        next.version,
      );
      await recordLlmUse(u, value, newer);
      expect(
        (await u.openRouterConnections.find(accountId))?.lastUsedAt,
      ).toBeNull();
    });
  });
  it("rolls back use metadata with its dispatch result and exposes a failed connection CAS", async () => {
    const job = await request();
    const id = await usageDispatch(job.jobId, 0, now);
    await expect(
      c.unitOfWorkProvider.run(async (u) => {
        await u.llmDispatches.fail(id, "synthetic-owned-dispatch", "possible");
        const value = await u.llmConversions.find(job.jobId);
        if (!value) throw Error("missing job");
        u.openRouterConnections.replace = async () => false;
        await recordLlmUse(u, value, now);
      }),
    ).rejects.toHaveProperty("code", "OPENROUTER_CONTEXT_CHANGED");
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.openRouterConnections.find(accountId),
        )
      )?.lastUsedAt,
    ).toBeNull();
    expect(
      (
        await c.unitOfWorkProvider.run((u) => u.llmDispatches.list(job.jobId))
      )[0]?.state,
    ).toBe("intent");
    expect(generate).not.toHaveBeenCalled();
  });
  it("recovers durable responses after a use-metadata conflict without another provider request", async () => {
    const provider = c.unitOfWorkProvider;
    let armed = true;
    c = {
      ...c,
      unitOfWorkProvider: {
        run: (fn) =>
          provider.run(async (u) => {
            const replace = u.openRouterConnections.replace.bind(
              u.openRouterConnections,
            );
            u.openRouterConnections.replace = async (value, version) => {
              if (armed && value.lastUsedAt) {
                armed = false;
                return false;
              }
              return replace(value, version);
            };
            return fn(u);
          }),
      },
    };
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(async () =>
      expect(
        (
          await c.unitOfWorkProvider.run((u) =>
            u.llmConversions.find(job.jobId),
          )
        )?.owner.state,
      ).toBe("unknown"),
    );
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))?.html,
    ).toBe("<p>元の本文</p>");
    expect(generate).toHaveBeenCalledTimes(1);
    await recoverWithProvenPredecessor();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.openRouterConnections.find(accountId),
        )
      )?.lastUsedAt,
    ).toEqual(now);
  });
  it("commits generated body once after source and response closure, preserving title and recording revisions", async () => {
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    const state = await c.unitOfWorkProvider.run(async (u) => ({
      note: await u.notes.findById(noteId),
      quota: await u.llmQuota.usage(accountId, "2026-09"),
      revisions: await u.revisions.list(noteId),
      job: await u.jobs.find(job.jobId),
      dispatches: await u.llmDispatches.list(job.jobId),
      connection: await u.openRouterConnections.find(accountId),
    }));
    expect(state.connection?.lastUsedAt).toEqual(now);
    expect(state.note?.html).toContain("日本語の本文");
    expect(state.note?.title).toBe("保持する題名");
    expect(state.note?.version).toBe(1);
    expect(state.revisions).toHaveLength(2);
    expect(state.quota?.consumed).toBe(1);
    expect(state.quota?.reserved).toBe(0);
    expect(state.job?.state).toBe("succeeded");
    expect(state.dispatches.every((row) => row.state === "scrubbed")).toBe(
      true,
    );
    await sweepLlm(c);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("keeps original body and version on an invalid complete provider response", async () => {
    generate.mockRejectedValue(
      new LlmOperationError("LLM_RESPONSE_INCOMPLETE", "possible", true),
    );
    const job = await request();
    await sweepLlm(c);
    const value = await finished(job.jobId);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.openRouterConnections.find(accountId),
        )
      )?.lastUsedAt,
    ).toEqual(now);
    expect(value?.outcome).toEqual({
      kind: "failed",
      code: "LLM_RESPONSE_INCOMPLETE",
    });
    const note = await c.unitOfWorkProvider.run((u) =>
      u.notes.findById(noteId),
    );
    expect(note?.html).toBe("<p>元の本文</p>");
    expect(note?.version).toBe(0);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.llmQuota.usage(accountId, "2026-09"),
        )
      )?.consumed,
    ).toBe(1);
  });
  it("releases the logical reservation only when the whole job is proven unsent", async () => {
    generate.mockRejectedValue(
      new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true),
    );
    const job = await request();
    await sweepLlm(c);
    await finished(job.jobId);
    const quota = await c.unitOfWorkProvider.run((u) =>
      u.llmQuota.usage(accountId, "2026-09"),
    );
    expect(quota?.consumed).toBe(0);
    expect(quota?.reserved).toBe(0);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.openRouterConnections.find(accountId),
        )
      )?.lastUsedAt,
    ).toBeNull();
  });
  it("waits for cancelled generator promise before closing the owner and preserves previous body", async () => {
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    generate.mockImplementation(async (_input, signal) => {
      started = true;
      await gate;
      if (signal.aborted)
        throw new LlmOperationError("LLM_DELIVERY_UNKNOWN", "possible", true);
      return {
        content: "<p>late</p>",
        finish: "stop",
        inputTokens: null,
        outputTokens: null,
      };
    });
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(started).toBe(true));
    await c.unitOfWorkProvider.run((u) =>
      u.llmConversions.cancelNote(noteId, now),
    );
    await sweepLlm(c);
    expect(execution.active(job.jobId)).toBe(true);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(job.jobId)))
        ?.owner.state,
    ).toBe("active");
    release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))?.html,
    ).toBe("<p>元の本文</p>");
  });
  it("records quota overflow as a failed job without altering body or sending", async () => {
    if (!c.llm) throw Error("fixture missing");
    c = { ...c, llm: { ...legacyLlm(c), monthlyLimit: 0 } };
    const job = await request();
    expect((await finished(job.jobId))?.outcome).toEqual({
      kind: "failed",
      code: "LLM_MONTHLY_LIMIT",
    });
    await sweepLlm(c);
    expect(generate).not.toHaveBeenCalled();
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))
        ?.version,
    ).toBe(0);
  });
  it("re-reads a committed terminal result after ACK loss without retaining a false unknown owner", async () => {
    const job = await request();
    loseAcknowledgement("terminal");
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.revisions.list(noteId))).length,
    ).toBe(2);
  });
  it("never sends an intent with unknown commit ACK and retains its consumed quota on proven recovery", async () => {
    const job = await request();
    loseAcknowledgement("intent");
    await sweepLlm(c);
    await vi.waitFor(async () =>
      expect(
        (
          await c.unitOfWorkProvider.run((u) =>
            u.llmConversions.find(job.jobId),
          )
        )?.owner.state,
      ).toBe("unknown"),
    );
    expect(generate).not.toHaveBeenCalled();
    expect(execution.active(job.jobId)).toBe(true);
    await recoverWithProvenPredecessor();
    const value = await finished(job.jobId);
    expect(value?.outcome.kind).toBe("unknown");
    expect(value?.owner.state).toBe("closed");
    await sweepLlm(c);
    expect(generate).not.toHaveBeenCalled();
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.llmQuota.usage(accountId, "2026-09"),
        )
      )?.consumed,
    ).toBe(1);
  });
  it("adopts all durable responses after proven recovery without key decryption or another generation", async () => {
    const job = await request();
    loseAcknowledgement("response");
    await sweepLlm(c);
    await vi.waitFor(async () =>
      expect(
        (
          await c.unitOfWorkProvider.run((u) =>
            u.llmConversions.find(job.jobId),
          )
        )?.owner.state,
      ).toBe("unknown"),
    );
    expect(generate).toHaveBeenCalledTimes(1);
    await recoverWithProvenPredecessor();
    if (!c.llm) throw Error("missing fixture");
    const { openRouter, ...unconfigured } = c;
    void openRouter;
    c = { ...unconfigured, llm: { ...legacyLlm(c), configured: false } };
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("does not adopt a durable response after the credential epoch changes", async () => {
    const job = await request();
    loseAcknowledgement("response");
    await sweepLlm(c);
    await vi.waitFor(async () =>
      expect(
        (
          await c.unitOfWorkProvider.run((u) =>
            u.llmConversions.find(job.jobId),
          )
        )?.owner.state,
      ).toBe("unknown"),
    );
    await c.unitOfWorkProvider.run(async (u) => {
      const old = await u.openRouterConnections.find(accountId);
      if (!old || old.state !== "linked") throw Error("missing fixture");
      expect(
        await u.openRouterConnections.replace(
          { ...old, epoch: old.epoch + 1, version: old.version + 1 },
          old.version,
        ),
      ).toBe(true);
    });
    await recoverWithProvenPredecessor();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("failed");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.notes.findById(noteId)))?.html,
    ).toBe("<p>元の本文</p>");
  });
  it("preserves the genuine typed current fence while rolling back its transaction", async () => {
    const failure = new LlmOperationError(
      "LLM_SOURCE_CHANGED",
      "not-sent",
      true,
    );
    let same = false;
    try {
      await c.unitOfWorkProvider.run(async (u) => {
        await u.llmConversions.admit(accountId);
        throw failure;
      });
    } catch (error) {
      same = error === failure;
    }
    expect(same).toBe(true);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.llmConversions.admission(accountId, 1),
        )
      ).sequence,
    ).toBe(0);
  });
  it("does not accept a same-name and same-code ordinary error as LLM ownership proof", async () => {
    const failure = Object.assign(new Error("SYNTHETIC_FAILURE"), {
      name: "LlmOperationError",
      code: "LLM_SOURCE_CHANGED",
      delivery: "not-sent",
      closed: true,
    });
    let translated = false;
    try {
      await c.unitOfWorkProvider.run(async (u) => {
        await u.llmConversions.admit(accountId);
        throw failure;
      });
    } catch (error) {
      translated =
        error !== failure &&
        isSerializableError(error) &&
        !isLlmOperationError(error);
    }
    expect(translated).toBe(true);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.llmConversions.admission(accountId, 1),
        )
      ).sequence,
    ).toBe(0);
  });
  it("keeps driver constraint translation and rollback independent of typed LLM errors", async () => {
    const job = await request();
    let translated = false;
    try {
      await c.unitOfWorkProvider.run(async (u) => {
        await u.llmConversions.admit(accountId);
        const value = await u.llmConversions.find(job.jobId);
        if (!value) throw Error("missing fixture");
        await u.llmConversions.insert(value);
      });
    } catch (error) {
      translated = isSerializableError(error) && !isLlmOperationError(error);
    }
    expect(translated).toBe(true);
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.llmConversions.admission(accountId, 1),
        )
      ).sequence,
    ).toBe(1);
  });
});

import { pdfFixtureServices } from "./llmPdfFixtureServices";

function legacyLlm(c: HollowContainer) {
  if (c.llm?.inputMode !== "legacy-local") throw new Error("TEST_LLM_MODE");
  return c.llm;
}

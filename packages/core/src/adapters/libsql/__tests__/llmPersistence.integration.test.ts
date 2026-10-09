import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  LLM_LIMITS,
  type LlmConversion,
  type LlmDispatch,
  type LlmFixedConversion,
} from "@repo/core/domain/llm/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { createTestContainer, type TestContainer } from "./helpers";

describe("LLM durable intent, ownership and logical monthly quota", () => {
  let base: TestContainer;
  let uow: LibsqlHollowUnitOfWorkProvider;
  let accountId: string;
  const now = new Date("2026-09-30T23:59:50Z");
  beforeEach(async (context) => {
    context.task.meta.fixturePid = process.pid;
    base = await createTestContainer();
    uow = new LibsqlHollowUnitOfWorkProvider(base.db);
    accountId = base.idGenerator.next();
    await uow.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(accountId, "llm@fixture.invalid", "synthetic", now),
          now,
        ),
      );
      const connection = await u.openRouterConnections.ensure(accountId, now);
      await u.openRouterConnections.replace(
        {
          ...connection,
          state: "linked",
          epoch: 1,
          version: 2,
          credentialEnvelope: "synthetic",
          linkedAt: now,
          everLinkedAt: now,
          lastUsedAt: null,
          providerUserId: null,
          keyExpiresAt: null,
        },
        1,
      );
    });
  });
  afterEach(async (context) => {
    let valid = context.task.result?.state !== "fail";
    try {
      valid =
        valid &&
        (await base.db.all(sql`pragma foreign_key_check`)).length === 0;
      expect(valid).toBe(true);
    } finally {
      if (valid) base.close();
      else base.client.close();
      context.task.meta.fixtureClosed = true;
    }
  });
  async function queued(): Promise<LlmFixedConversion> {
    return uow.run(async (u) => {
      const note = createNote(
        {
          id: base.idGenerator.next(),
          accountId,
          title: "fixture",
          html: "<p>old</p>",
          text: "old",
        },
        now,
      );
      await u.notes.insert(note);
      const jobId = base.idGenerator.next();
      const originalId = base.idGenerator.next();
      const batchId = base.idGenerator.next();
      await u.imports.insertBatch({
        requestedVisibility: "private",
        id: batchId,
        accountId,
        createdAt: now,
        useAi: true,
        cancelledAt: null,
      });
      await u.imports.insertOriginal({
        id: originalId,
        noteId: note.id,
        accountId,
        name: "fixture.txt",
        bytes: 5,
        storageKey: `synthetic/${originalId}`,
        sha256: "a".repeat(64),
        format: "text",
        state: "ready",
        coverage: "complete",
        activeJobId: jobId,
        createdAt: now,
      });
      await u.jobs.insert({
        id: jobId,
        batchId,
        originalId,
        accountId,
        noteId: note.id,
        noteVersion: note.version,
        useAi: true,
        createdAt: now,
        updatedAt: now,
        attempt: 0,
        retryOf: null,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      });
      const value: LlmFixedConversion = {
        access: { origin: "local-original", bindingId: null },
        sourceMemoryBytes: 0,
        inputReceipt: null,
        selection: "fixed",
        pdfProof: null,
        sourceOwnershipGeneration: null,
        jobId,
        accountId,
        noteId: note.id,
        commandId: base.idGenerator.next(),
        requestDigest: "b".repeat(64),
        operation: "regenerate",
        retryOf: null,
        source: {
          kind: "original",
          originalId,
          sha256: "a".repeat(64),
          bytes: 5,
          format: "text",
        },
        sourceState: "ready",
        sourceCoverage: "complete",
        noteVersion: note.version,
        originalRevisionNo: null,
        credentialEpoch: 1,
        modelId: "fixture/text",
        instruction: "",
        promptVersion: 1,
        preparationVersion: 1,
        admissionSequence: await u.llmConversions.admit(accountId),
        createdAt: now,
        deadlineAt: new Date(now.getTime() + LLM_LIMITS.jobMs),
        updatedAt: now,
        phase: "queued",
        outcome: { kind: "pending" },
        owner: { state: "idle", runtimeId: null, token: null },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
      };
      await u.llmConversions.insert(value);
      return value;
    });
  }
  async function active(value: LlmFixedConversion) {
    return uow.run(async (u) => {
      expect(await u.llmQuota.reserve(value.jobId, accountId, now, 30)).toBe(
        true,
      );
      const claim = await u.llmConversions.claim(now, "runtime", "owner");
      if (!claim || claim.selection !== "fixed")
        throw Error("fixture claim missing");
      const next = {
        ...claim,
        phase: "dispatching" as const,
        version: claim.version + 1,
      };
      expect(await u.llmConversions.replace(next, claim.version)).toBe(true);
      return next;
    });
  }
  async function prepared(value: LlmConversion, ordinal = 0) {
    const dispatch: LlmDispatch & { state: "prepared" } = {
      jobId: value.jobId,
      ordinal,
      id: base.idGenerator.next(),
      input: { kind: "prepared-segment", ordinal, sha256: "c".repeat(64) },
      ownerToken: "owner",
      runtimeId: "runtime",
      state: "prepared",
      intentAt: null,
      response: null,
    };
    await uow.run((u) => u.llmDispatches.prepare(dispatch));
    return dispatch;
  }
  async function closed(value: LlmConversion) {
    await uow.run(async (u) => {
      const current = await u.llmConversions.find(value.jobId);
      if (!current || current.owner.state === "idle")
        throw Error("fixture owner missing");
      expect(
        await u.llmConversions.replace(
          {
            ...current,
            phase: "terminal",
            owner: { ...current.owner, state: "closed" },
            outcome: { kind: "failed", code: "LLM_UNAVAILABLE" },
            responseBudget: 0,
            version: current.version + 1,
          },
          current.version,
        ),
      ).toBe(true);
    });
  }
  it("retains version-zero originals and rejects stale CAS and second ownership", async () => {
    const value = await queued();
    expect(value.noteVersion).toBe(0);
    const claim = await active(value);
    expect(
      await uow.run((u) =>
        u.jobs.claim(
          new Date(now.getTime() + 100000),
          "machine",
          new Date(now.getTime() + 190000),
        ),
      ),
    ).toBeNull();
    expect(
      await uow.run((u) => u.llmConversions.claim(now, "other", "other")),
    ).toBeNull();
    expect(
      await uow.run((u) =>
        u.llmConversions.replace({ ...claim, version: 2 }, 1),
      ),
    ).toBe(false);
    expect(
      (
        await uow.run((u) =>
          u.llmConversions.command(accountId, value.commandId),
        )
      )?.jobId,
    ).toBe(value.jobId);
  });
  it("reserves 29 then admits exactly one of two parallel jobs and uses one fixed UTC bucket", async () => {
    for (let i = 0; i < 29; i++) {
      const value = await queued();
      expect(
        await uow.run((u) =>
          u.llmQuota.reserve(value.jobId, accountId, now, 30),
        ),
      ).toBe(true);
    }
    const a = await queued();
    const b = await queued();
    const results = await Promise.all(
      [a, b].map((v) =>
        uow.run((u) => u.llmQuota.reserve(v.jobId, accountId, now, 30)),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const accepted = results[0] ? a : b;
    expect(
      await uow.run((u) =>
        u.llmQuota.reserve(
          accepted.jobId,
          accountId,
          new Date("2026-10-01T00:00:00Z"),
          1,
        ),
      ),
    ).toBe(true);
    expect(
      (await uow.run((u) => u.llmQuota.reservation(accepted.jobId)))?.month,
    ).toBe("2026-09");
    expect(
      (await uow.run((u) => u.llmQuota.usage(accountId, "2026-09")))?.reserved,
    ).toBe(30);
    expect(
      await uow.run((u) => u.llmQuota.usage(accountId, "2026-10")),
    ).toBeNull();
  });
  it("persists intent and quota atomically and never consumes twice across sixteen segments", async () => {
    const value = await active(await queued());
    for (let ordinal = 0; ordinal < 16; ordinal++) {
      const d = await prepared(value, ordinal);
      expect(
        await uow.run((u) => u.llmDispatches.intent(d.id, "owner", now)),
      ).toBe(true);
      expect(
        await uow.run((u) => u.llmDispatches.intent(d.id, "owner", now)),
      ).toBe(false);
      expect(
        await uow.run((u) =>
          u.llmDispatches.response(d.id, "owner", {
            content: "<p>result</p>",
            finish: "stop",
            inputTokens: 1,
            outputTokens: 2,
          }),
        ),
      ).toBe(true);
    }
    const usage = await uow.run((u) => u.llmQuota.usage(accountId, "2026-09"));
    expect(usage?.reserved).toBe(0);
    expect(usage?.consumed).toBe(1);
    expect(
      (await uow.run((u) => u.llmDispatches.list(value.jobId))).filter(
        (d) => d.state === "response",
      ),
    ).toHaveLength(16);
  });
  it("rolls back both intent and first consumption on an outer transaction failure", async () => {
    const value = await active(await queued());
    const d = await prepared(value);
    await expect(
      uow.run(async (u) => {
        await u.llmDispatches.intent(d.id, "owner", now);
        throw Error("injected");
      }),
    ).rejects.toBeDefined();
    expect((await uow.run((u) => u.llmDispatches.find(d.id)))?.state).toBe(
      "prepared",
    );
    expect(
      (await uow.run((u) => u.llmQuota.reservation(value.jobId)))?.state,
    ).toBe("reserved");
  });
  it("returns a logical unit only when every segment is proven unsent and ownership closed", async () => {
    const value = await active(await queued());
    for (let ordinal = 0; ordinal < 2; ordinal++) {
      const d = await prepared(value, ordinal);
      await uow.run(async (u) => {
        await u.llmDispatches.intent(d.id, "owner", now);
        await u.llmDispatches.fail(d.id, "owner", "not-sent");
      });
    }
    expect(
      await uow.run((u) => u.llmQuota.releaseUnsent(value.jobId, now)),
    ).toBe(false);
    await closed(value);
    expect(
      await uow.run((u) => u.llmQuota.releaseUnsent(value.jobId, now)),
    ).toBe(true);
    expect(
      await uow.run((u) => u.llmQuota.releaseUnsent(value.jobId, now)),
    ).toBe(false);
    expect(
      (await uow.run((u) => u.llmQuota.usage(accountId, "2026-09")))?.consumed,
    ).toBe(0);
  });
  it("does not return an earlier sent segment when a later segment is proven unsent", async () => {
    const value = await active(await queued());
    const a = await prepared(value);
    const b = await prepared(value, 1);
    await uow.run(async (u) => {
      await u.llmDispatches.intent(a.id, "owner", now);
      await u.llmDispatches.response(a.id, "owner", {
        content: "<p>ok</p>",
        finish: "stop",
        inputTokens: null,
        outputTokens: null,
      });
      await u.llmDispatches.intent(b.id, "owner", now);
      await u.llmDispatches.fail(b.id, "owner", "not-sent");
    });
    await closed(value);
    expect(
      await uow.run((u) => u.llmQuota.releaseUnsent(value.jobId, now)),
    ).toBe(false);
    expect(
      (await uow.run((u) => u.llmQuota.usage(accountId, "2026-09")))?.consumed,
    ).toBe(1);
  });
  it("keeps unknown ownership and intent pinned beyond a lease or history deadline", async () => {
    const value = await active(await queued());
    const d = await prepared(value);
    await uow.run(async (u) => {
      await u.llmDispatches.intent(d.id, "owner", now);
      await u.llmDispatches.fail(d.id, "owner", "possible");
      if (value.owner.state === "idle") throw Error("fixture owner missing");
      await u.llmConversions.replace(
        {
          ...value,
          owner: { ...value.owner, state: "unknown" },
          outcome: { kind: "unknown", code: "LLM_OWNERSHIP_UNKNOWN" },
          version: value.version + 1,
        },
        value.version,
      );
    });
    const later = new Date(now.getTime() + 100 * 86400000);
    expect(
      await uow.run((u) => u.llmConversions.claim(later, "next", "next")),
    ).toBeNull();
    expect(await uow.run((u) => u.llmConversions.prune(later, 100))).toBe(0);
    expect(
      await uow.run((u) => u.llmQuota.releaseUnsent(value.jobId, later)),
    ).toBe(false);
    expect(
      (await uow.run((u) => u.llmConversions.find(value.jobId)))
        ?.responseBudget,
    ).toBe(LLM_LIMITS.responseBudget);
  });
  it("fences old-epoch new dispatch atomically while preserving the owned job", async () => {
    const value = await active(await queued());
    const d = await prepared(value);
    await uow.run((u) => u.llmConversions.cancelAccount(accountId, 1, now));
    await expect(
      uow.run((u) => u.llmDispatches.intent(d.id, "owner", now)),
    ).rejects.toBeDefined();
    const current = await uow.run((u) => u.llmConversions.find(value.jobId));
    expect(current?.cancelGeneration).toBe(1);
    expect(current?.owner.state).toBe("active");
    expect(
      (await uow.run((u) => u.llmQuota.reservation(value.jobId)))?.state,
    ).toBe("reserved");
    expect(
      (await uow.run((u) => u.llmConversions.admission(accountId, 1))).active,
    ).toBe(1);
  });
});

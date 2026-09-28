import { NodeOpenRouterExecution } from "@repo/core/adapters/node/openrouter/execution";
import {
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  beginOpenRouter,
  checkOpenRouterConnection,
  completeOpenRouter,
  retryOpenRouterMetadata,
  unlinkOpenRouter,
} from "@repo/core/application/integration/openRouter/connection";
import {
  type OpenRouterAuthorization,
  OpenRouterProviderError,
} from "@repo/core/application/integration/openRouter/ports";
import {
  getOpenRouterSettings,
  listOpenRouterModels,
  listOpenRouterWaitingNotes,
  saveOpenRouterModels,
} from "@repo/core/application/integration/openRouter/settings";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  OPENROUTER_ADOPTED_MODELS,
  OPENROUTER_DEFAULT_STT,
  OPENROUTER_DEFAULT_TEXT,
} from "@repo/core/domain/integration/openRouter";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("OpenRouter candidate promotion and current context", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeOpenRouterExecution;
  let accountId: string;
  let request: { browserToken: string; sessionToken: string };
  let correlation: string;
  let clock = new Date("2026-09-27T15:00:00Z");
  let exchange: ReturnType<typeof vi.fn<OpenRouterAuthorization["exchange"]>>;
  let inspect: ReturnType<
    typeof vi.fn<OpenRouterAuthorization["inspectCredential"]>
  >;
  beforeEach(async () => {
    base = await createTestContainer();
    execution = new NodeOpenRouterExecution();
    clock = new Date("2026-09-27T15:00:00Z");
    exchange = vi.fn(async () => "synthetic-credential");
    inspect = vi.fn(async () => ({ expiresAt: null, providerUserId: null }));
    const envelopes = new Map<string, string>();
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        send: async () => {},
      }),
      clock: { now: () => clock },
      openRouter: {
        execution,
        protector: {
          available: () => true,
          protect: (v, b) => {
            const key = JSON.stringify(b);
            envelopes.set(key, v);
            return `synthetic-${envelopes.size}`;
          },
          reveal: (_v, b) => {
            const value = envelopes.get(JSON.stringify(b));
            if (!value) throw Error("fixture binding missing");
            return value;
          },
        },
        authorization: {
          authorization: async (input) => {
            correlation = input.correlation;
            return "http://localhost:3000/contract-only";
          },
          exchange,
          inspectCredential: inspect,
        },
        catalog: {
          fallback: () => OPENROUTER_ADOPTED_MODELS,
          list: async () => [
            {
              id: OPENROUTER_DEFAULT_TEXT,
              name: "text",
              kinds: ["chat-text", "chat-image"],
              expiresAt: null,
            },
            {
              id: OPENROUTER_DEFAULT_STT,
              name: "audio",
              kinds: ["stt-transcription"],
              expiresAt: null,
            },
          ],
        },
      },
    };
    request = {
      browserToken: c.tokens.generate(),
      sessionToken: c.tokens.generate(),
    };
    const browser = await ensureAuthenticationBrowser(c, request.browserToken);
    accountId = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            accountId,
            "router@fixture.invalid",
            "synthetic-hash",
            clock,
          ),
          clock,
        ),
      );
      await u.accounts.saveSession({
        tokenHash: c.tokens.hash(request.sessionToken),
        accountId,
        expiresAt: new Date(clock.getTime() + 86400000),
        browser,
      });
    });
  });
  afterEach(async () => {
    await execution.stop();
    try {
      expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
    } finally {
      base.close();
    }
  });
  async function begin(confirmedReconnect = false) {
    const s = await getOpenRouterSettings(c, request);
    return beginOpenRouter(c, request, {
      expectedEpoch: s.epoch,
      expectedVersion: s.version,
      confirmedReconnect,
      returnTo: { kind: "settings" },
    });
  }
  async function complete() {
    return completeOpenRouter(c, request, correlation, "synthetic-code");
  }
  async function attempt(id: string) {
    return c.unitOfWorkProvider.run((u) => u.openRouterAttempts.find(id));
  }
  async function linked() {
    return c.unitOfWorkProvider.run((u) =>
      u.openRouterConnections.find(accountId),
    );
  }
  async function enqueueLlm() {
    return c.unitOfWorkProvider.run(async (u) => {
      const connection = await u.openRouterConnections.find(accountId);
      if (!connection || connection.state !== "linked")
        throw Error("fixture connection missing");
      const note = createNote(
        {
          id: c.idGenerator.next(),
          accountId,
          title: "llm",
          html: "<p>old</p>",
          text: "old",
        },
        clock,
      );
      const jobId = c.idGenerator.next();
      const originalId = c.idGenerator.next();
      const batchId = c.idGenerator.next();
      await u.notes.insert(note);
      await u.imports.insertBatch({
        id: batchId,
        accountId,
        createdAt: clock,
        useAi: true,
        cancelledAt: null,
      });
      await u.imports.insertOriginal({
        id: originalId,
        noteId: note.id,
        accountId,
        name: "fixture.txt",
        bytes: 1,
        storageKey: `synthetic/${originalId}`,
        sha256: "a".repeat(64),
        format: "text",
        state: "ready",
        coverage: "complete",
        activeJobId: jobId,
        createdAt: clock,
      });
      await u.jobs.insert({
        id: jobId,
        batchId,
        originalId,
        accountId,
        noteId: note.id,
        noteVersion: note.version,
        useAi: true,
        createdAt: clock,
        updatedAt: clock,
        attempt: 0,
        retryOf: null,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        failure: null,
      });
      await u.llmConversions.insert({
        jobId,
        accountId,
        noteId: note.id,
        commandId: c.idGenerator.next(),
        requestDigest: "b".repeat(64),
        operation: "regenerate",
        retryOf: null,
        source: {
          kind: "original",
          originalId,
          sha256: "a".repeat(64),
          bytes: 1,
          format: "text",
        },
        sourceState: "ready",
        sourceCoverage: "complete",
        noteVersion: note.version,
        originalRevisionNo: null,
        credentialEpoch: connection.epoch,
        modelId: "fixture/model",
        instruction: "",
        promptVersion: 1,
        preparationVersion: 1,
        admissionSequence: await u.llmConversions.admit(accountId),
        createdAt: clock,
        deadlineAt: new Date(clock.getTime() + LLM_LIMITS.jobMs),
        updatedAt: clock,
        phase: "queued",
        outcome: { kind: "pending" },
        owner: { state: "idle", runtimeId: null, token: null },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
      });
      return jobId;
    });
  }
  it("requires a fresh admission confirmation and promotes a durable candidate without code reexchange", async () => {
    await begin();
    await complete();
    const s = await getOpenRouterSettings(c, request);
    const a = await beginOpenRouter(c, request, {
      expectedEpoch: s.epoch,
      expectedVersion: s.version,
      confirmedReconnect: true,
      confirmedAdmissionSequence: s.admission.sequence,
      returnTo: { kind: "settings" },
    });
    const job = await enqueueLlm();
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_RECONFIRM_REQUIRED",
    );
    expect((await linked())?.epoch).toBe(1);
    const candidate = await attempt(a.id);
    if (candidate?.state !== "checking")
      throw Error("fixture candidate missing");
    const current = await getOpenRouterSettings(c, request);
    await retryOpenRouterMetadata(
      c,
      request,
      candidate.id,
      candidate.version,
      current.admission.sequence,
    );
    expect(exchange).toHaveBeenCalledTimes(2);
    expect((await linked())?.epoch).toBe(2);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(job)))
        ?.cancelGeneration,
    ).toBe(1);
    expect((await attempt(a.id))?.expiresAt.getTime()).toBe(
      candidate.expiresAt.getTime(),
    );
  });
  it("retains old demand on metadata failure and rejects demand growth during candidate recheck", async () => {
    await begin();
    await complete();
    const job = await enqueueLlm();
    const s = await getOpenRouterSettings(c, request);
    const a = await beginOpenRouter(c, request, {
      expectedEpoch: s.epoch,
      expectedVersion: s.version,
      confirmedReconnect: true,
      confirmedAdmissionSequence: s.admission.sequence,
      returnTo: { kind: "settings" },
    });
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_UNAVAILABLE",
    );
    expect(
      (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(job)))
        ?.cancelGeneration,
    ).toBe(0);
    const candidate = await attempt(a.id);
    if (candidate?.state !== "checking")
      throw Error("fixture candidate missing");
    let release: (() => void) | undefined;
    inspect.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { expiresAt: null, providerUserId: null };
    });
    const pending = retryOpenRouterMetadata(
      c,
      request,
      candidate.id,
      candidate.version,
      s.admission.sequence,
    );
    const observed = pending.then(
      () => "success",
      (error) =>
        error instanceof Error && "code" in error ? error.code : "unexpected",
    );
    try {
      await vi.waitFor(() => expect(Boolean(release)).toBe(true));
      await enqueueLlm();
      release?.();
      expect(await observed).toBe("OPENROUTER_RECONFIRM_REQUIRED");
      expect((await linked())?.epoch).toBe(1);
      expect(
        (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(job)))
          ?.cancelGeneration,
      ).toBe(0);
    } finally {
      release?.();
      await Promise.allSettled([pending]);
    }
  });
  it("rejects an active-demand legacy confirmation and atomically fences on unlink", async () => {
    await begin();
    await complete();
    const job = await enqueueLlm();
    await expect(begin(true)).rejects.toHaveProperty(
      "code",
      "OPENROUTER_RECONFIRM_REQUIRED",
    );
    const connection = await linked();
    if (!connection) throw Error("fixture connection missing");
    await unlinkOpenRouter(c, request, connection);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(job)))
        ?.cancelGeneration,
    ).toBe(1);
    expect((await linked())?.state).toBe("unlinked");
  });
  it("promotes once with defaults and no new Hollow session", async () => {
    const a = await begin();
    await complete();
    await complete();
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledTimes(1);
    expect((await attempt(a.id))?.state).toBe("completed");
    const s = await getOpenRouterSettings(c, request);
    expect(
      s.state === "linked" &&
        s.epoch === 1 &&
        s.models.version === 1 &&
        !s.generationAvailable,
    ).toBe(true);
    expect(
      Number(
        (await base.client.execute("select count(*) n from sessions")).rows[0]
          ?.n,
      ),
    ).toBe(1);
  });
  it("retains a durable candidate after unavailable metadata and retries metadata only", async () => {
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    const a = await begin();
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_UNAVAILABLE",
    );
    const current = await attempt(a.id);
    expect(current?.state).toBe("checking");
    expect((await linked())?.state).toBe("unlinked");
    if (!current) throw Error("fixture missing");
    await retryOpenRouterMetadata(c, request, a.id, current.version);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledTimes(2);
    expect((await linked())?.state).toBe("linked");
  });
  it("never exchanges unknown code again", async () => {
    exchange.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    const a = await begin();
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_EXCHANGE_UNKNOWN",
    );
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_CODE_CONSUMED",
    );
    expect(exchange).toHaveBeenCalledTimes(1);
    expect((await attempt(a.id))?.state).toBe("failed");
  });
  it("preserves old valid connection and settings when reconnect metadata cannot be determined", async () => {
    await begin();
    await complete();
    const old = await linked();
    const a = await begin(true);
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_UNAVAILABLE",
    );
    expect(JSON.stringify(await linked()) === JSON.stringify(old)).toBe(true);
    expect((await attempt(a.id))?.state).toBe("checking");
  });
  it("does not mark a current connection invalid on malformed metadata", async () => {
    await begin();
    await complete();
    const old = await linked();
    if (!old) throw Error("fixture missing");
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    await expect(
      checkOpenRouterConnection(c, request, old),
    ).rejects.toHaveProperty("code", "OPENROUTER_UNAVAILABLE");
    expect(JSON.stringify(await linked()) === JSON.stringify(old)).toBe(true);
  });
  it("marks only the inspected current epoch needs_relink on proven invalid key", async () => {
    await begin();
    await complete();
    const old = await linked();
    if (!old) throw Error("fixture missing");
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_CREDENTIAL_INVALID"),
    );
    await checkOpenRouterConnection(c, request, old);
    const current = await linked();
    expect(
      current?.state === "needs_relink" &&
        current.epoch === old.epoch &&
        current.version === old.version + 1,
    ).toBe(true);
  });
  it("rejects actor signout and browser ABA before any exchange", async () => {
    await begin();
    await signOutAuthentication(c, request);
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "AUTH_CONTEXT_CHANGED",
    );
    expect(exchange).toHaveBeenCalledTimes(0);
  });
  it("fences a pending callback on unlink and preserves model settings", async () => {
    await begin();
    await complete();
    const a = await begin(true);
    const old = await linked();
    if (!old) throw Error("fixture missing");
    await unlinkOpenRouter(c, request, old);
    expect((await attempt(a.id))?.state).toBe("failed");
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_CONTEXT_CHANGED",
    );
    const s = await getOpenRouterSettings(c, request);
    expect(
      s.state === "unlinked" && s.epoch === 2 && s.models.version === 1,
    ).toBe(true);
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it("rejects late metadata after unlink instead of reviving the credential", async () => {
    let release: (() => void) | undefined;
    inspect.mockImplementationOnce(async () => {
      await new Promise<void>((r) => {
        release = r;
      });
      return { expiresAt: null, providerUserId: null };
    });
    await begin();
    const pending = complete();
    try {
      await vi.waitFor(() => expect(Boolean(release)).toBe(true));
      const old = await linked();
      if (!old) throw Error("fixture missing");
      await unlinkOpenRouter(c, request, old);
      release?.();
      await expect(pending).rejects.toHaveProperty(
        "code",
        "OPENROUTER_CONTEXT_CHANGED",
      );
      expect((await linked())?.state).toBe("unlinked");
    } finally {
      release?.();
      await Promise.allSettled([pending]);
    }
  });
  it("enforces model purpose and OCC without mutating valid settings", async () => {
    await begin();
    await complete();
    const s = await getOpenRouterSettings(c, request);
    const input = {
      expectedEpoch: s.epoch,
      expectedVersion: s.models.version,
      text: s.models.text,
      image: s.models.image,
      audio: s.models.audio,
    };
    await expect(
      saveOpenRouterModels(c, request, {
        ...input,
        audio: { kind: "stt-transcription", modelId: OPENROUTER_DEFAULT_TEXT },
      }),
    ).rejects.toHaveProperty("code", "OPENROUTER_MODEL_UNAVAILABLE");
    await saveOpenRouterModels(c, request, input);
    await expect(
      saveOpenRouterModels(c, request, input),
    ).rejects.toHaveProperty("code", "OPENROUTER_SETTINGS_CHANGED");
  });
  it("does not extend a parent deadline for metadata retry", async () => {
    inspect.mockRejectedValueOnce(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    const a = await begin();
    await expect(complete()).rejects.toHaveProperty(
      "code",
      "OPENROUTER_UNAVAILABLE",
    );
    const current = await attempt(a.id);
    if (!current) throw Error("fixture missing");
    clock = new Date(clock.getTime() + 600000);
    await expect(
      retryOpenRouterMetadata(c, request, a.id, current.version),
    ).rejects.toHaveProperty("code", "OPENROUTER_EXPIRED");
    expect(inspect).toHaveBeenCalledTimes(1);
  });
  it("preserves custom settings on catalog failure and allows only explicit adopted defaults", async () => {
    await begin();
    await complete();
    if (!c.openRouter) throw Error("fixture missing");
    const list = vi.spyOn(c.openRouter.catalog, "list");
    list.mockResolvedValue([
      ...OPENROUTER_ADOPTED_MODELS,
      {
        id: "fixture/custom",
        name: "custom",
        kinds: ["chat-text"],
        expiresAt: null,
      },
    ]);
    const initial = await getOpenRouterSettings(c, request);
    const input = {
      expectedEpoch: initial.epoch,
      expectedVersion: initial.models.version,
      text: { kind: "chat-text" as const, modelId: "fixture/custom" },
      image: initial.models.image,
      audio: initial.models.audio,
    };
    await saveOpenRouterModels(c, request, input);
    list.mockRejectedValue(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    const catalog = await listOpenRouterModels(c, request);
    expect(catalog.source).toBe("default-fallback");
    expect(catalog.models.length).toBe(2);
    const unchanged = await getOpenRouterSettings(c, request);
    expect(unchanged.models.text.modelId === "fixture/custom").toBe(true);
    await expect(
      saveOpenRouterModels(c, request, {
        ...input,
        expectedVersion: unchanged.models.version,
      }),
    ).rejects.toHaveProperty("code", "OPENROUTER_MODEL_UNAVAILABLE");
    await saveOpenRouterModels(c, request, {
      ...input,
      expectedVersion: unchanged.models.version,
      text: initial.models.text,
    });
    const saved = await getOpenRouterSettings(c, request);
    expect(saved.models.text.modelId === OPENROUTER_DEFAULT_TEXT).toBe(true);
    vi.spyOn(c.openRouter.catalog, "fallback").mockReturnValue([]);
    expect((await listOpenRouterModels(c, request)).models.length).toBe(0);
    await expect(
      saveOpenRouterModels(c, request, {
        ...input,
        expectedVersion: saved.models.version,
        text: initial.models.text,
      }),
    ).rejects.toHaveProperty("code", "OPENROUTER_MODEL_UNAVAILABLE");
  });
  it("announces only first link and reads current personal/active workspace membership", async () => {
    const other = c.idGenerator.next();
    const workspaceId = c.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            other,
            "other@fixture.invalid",
            "synthetic-hash",
            clock,
          ),
          clock,
        ),
      );
      await u.workspaces.create({
        id: workspaceId,
        creatorId: other,
        name: "fixture",
        description: "",
        slug: null,
        state: "active",
        createdAt: clock,
      });
      await u.workspaces.join(workspaceId, other, "owner", clock);
      await u.workspaces.join(workspaceId, accountId, "viewer", clock);
      for (const owner of [
        { kind: "personal" as const, accountId },
        { kind: "personal" as const, accountId: other },
        { kind: "workspace" as const, workspaceId },
      ]) {
        const note = createNote(
          {
            id: c.idGenerator.next(),
            accountId: other,
            owner,
            title: "waiting",
            html: "",
            text: "",
          },
          clock,
        );
        await u.notes.insert(note);
        await u.imports.insertOriginal({
          id: c.idGenerator.next(),
          noteId: note.id,
          accountId: other,
          name: "fixture.png",
          bytes: 1,
          storageKey: `synthetic/${note.id}`,
          sha256: "0".repeat(64),
          format: "image",
          state: "needs_ai",
          coverage: "no_text",
          activeJobId: c.idGenerator.next(),
          createdAt: clock,
        });
      }
    });
    const first = await begin();
    await complete();
    expect((await listOpenRouterWaitingNotes(c, request, first.id)).total).toBe(
      2,
    );
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspaceId, accountId, null),
    );
    expect((await listOpenRouterWaitingNotes(c, request, first.id)).total).toBe(
      1,
    );
    const second = await begin(true);
    await complete();
    expect(
      (await listOpenRouterWaitingNotes(c, request, second.id)).total,
    ).toBe(0);
    expect((await listOpenRouterWaitingNotes(c, request, first.id)).total).toBe(
      0,
    );
  });
});

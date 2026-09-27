import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import {
  ensureAuthenticationBrowser,
  signOutAuthentication,
} from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  beginOpenRouter,
  completeOpenRouter,
  retryOpenRouterMetadata,
  unlinkOpenRouter,
} from "@repo/core/application/integration/openRouter/connection";
import { OpenRouterProviderError } from "@repo/core/application/integration/openRouter/ports";
import { getOpenRouterSettings } from "@repo/core/application/integration/openRouter/settings";
import {
  cancelLlmRegeneration,
  llmUsage,
  undoLlmBody,
} from "@repo/core/application/llm/control";
import {
  type LlmGenerator,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { sweepLlm } from "@repo/core/application/llm/worker";
import {
  requestNotePurge,
  sweepNotePurges,
} from "@repo/core/application/note/purge";
import { saveNote } from "@repo/core/application/note/saveNote";
import { restoreNote, trashNote } from "@repo/core/application/note/trash";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

type Actor = Readonly<{ id: string; token: string }>;
const now = new Date("2026-09-28T00:00:00Z");
const originalBody = "<p>元の本文</p>";
const generatedBody = "<p>生成された本文</p>";
let base: TestContainer;
let c: HollowContainer;
let root: string;
let execution: NodeLlmExecution;
let actor: Actor;
let other: Actor;
let workspaceOwner: Actor;
let noteId: string;
let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
const releases: Array<() => void> = [];
const hash = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");

async function addActor(): Promise<Actor> {
  const id = base.idGenerator.next();
  const token = `synthetic-session-${id}`;
  await c.unitOfWorkProvider.run(async (u) => {
    await u.accounts.save(
      verifyAccount(
        createAccount(id, `${id}@fixture.invalid`, "synthetic", now),
        now,
      ),
    );
    await u.accounts.saveSession({
      accountId: id,
      tokenHash: c.tokens.hash(token),
      expiresAt: new Date(now.getTime() + 86400000),
    });
    const connection = await u.openRouterConnections.ensure(id, now);
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
  });
  return { id, token };
}

async function addNote(
  person: Actor,
  owner: NoteOwner = { kind: "personal", accountId: person.id },
) {
  const id = base.idGenerator.next();
  const originalId = base.idGenerator.next();
  const jobId = base.idGenerator.next();
  const batchId = base.idGenerator.next();
  const bytes = Buffer.from("自己原本の本文");
  await new FileObjectStorage(root).put(
    originalId,
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    bytes.length,
  );
  await c.unitOfWorkProvider.run(async (u) => {
    const note = createNote(
      {
        id,
        accountId: person.id,
        owner,
        title: "現在の題名",
        html: originalBody,
        text: "元の本文",
      },
      now,
    );
    await u.notes.insert({
      ...note,
      display: {
        style: "original",
        source: "user",
        initialization: { kind: "complete", reason: "user" },
      },
    });
    await u.imports.insertBatch({
      id: batchId,
      accountId: person.id,
      ...(owner.kind === "workspace" ? { workspaceId: owner.workspaceId } : {}),
      createdAt: now,
      useAi: false,
      cancelledAt: null,
    });
    await u.imports.insertOriginal({
      id: originalId,
      noteId: id,
      accountId: person.id,
      name: "fixture.txt",
      bytes: bytes.length,
      storageKey: originalId,
      sha256: hash(bytes),
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
      accountId: person.id,
      noteId: id,
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
  return id;
}

beforeEach(async () => {
  base = await createTestContainer();
  root = await mkdtemp(path.join(tmpdir(), "hollow-llm-control-test-"));
  const initial = createHollowContainer(base.db, "http://localhost:3100", {
    send: async () => {},
  });
  const clock = { now: () => now };
  const ownership = {
    runtimeId: base.idGenerator.next(),
    predecessors: () => [],
    assertReady: () => {},
    acknowledge: async () => {},
  };
  execution = new NodeLlmExecution(ownership, clock);
  const storage = new CoordinatedObjectStorage(
    root,
    initial.unitOfWorkProvider,
    clock,
  );
  await storage.recoverOwners();
  generate = vi.fn(async () => ({
    content: generatedBody,
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
        protect: (value) => value,
        reveal: (value) => value,
      },
      execution: {
        run: (work) => work(new AbortController().signal),
        stop: async () => {},
      },
    },
    llm: {
      configured: true,
      storage,
      source: new NodeLlmSourceReader(storage),
      preparer: {
        prepare: async () => ({
          segments: [
            {
              identity: {
                kind: "prepared-segment",
                sha256: hash(originalBody),
                ordinal: 0,
              },
              html: originalBody,
              firstBlock: 0,
              blockCount: 1,
            },
          ],
          blocks: 1,
          notices: [],
          media: [],
        }),
      },
      profiles: {
        inspect: async (modelId) => ({
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
  actor = await addActor();
  other = await addActor();
  workspaceOwner = await addActor();
  noteId = await addNote(actor);
});

afterEach(async () => {
  for (const release of releases.splice(0)) release();
  try {
    await execution.stop();
    expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
    expect(
      (await base.db.all(sql`select 1 from object_writes where active=1`))
        .length,
    ).toBe(0);
  } finally {
    base.close();
    await rm(root, { recursive: true, force: true });
  }
});

async function note(id = noteId) {
  const value = await c.unitOfWorkProvider.run((u) => u.notes.findById(id));
  if (!value) throw new Error("self note missing");
  return value;
}
async function request(id = noteId, person = actor) {
  return requestLlmRegeneration(c, person.token, {
    noteId: id,
    noteVersion: (await note(id)).version,
    commandId: base.idGenerator.next(),
    expectedEpoch: 1,
    modelId: "fixture/text",
    instruction: "整理",
    confirmed: true,
  });
}
const state = (id: string) =>
  c.unitOfWorkProvider.run((u) => u.llmConversions.find(id));
async function finished(id: string) {
  await vi.waitFor(async () =>
    expect((await state(id))?.phase).toBe("terminal"),
  );
  await vi.waitFor(() => expect(execution.active(id)).toBe(false));
  return state(id);
}
async function succeed(id = noteId, person = actor) {
  const job = await request(id, person);
  await sweepLlm(c);
  expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
  return job;
}
function heldGenerator(ignoreAbort = false) {
  let release = () => {};
  let started = false;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  generate.mockImplementation(async (_input, signal) => {
    started = true;
    await promise;
    if (signal.aborted && !ignoreAbort)
      throw new LlmOperationError("LLM_DELIVERY_UNKNOWN", "possible", true);
    return {
      content: generatedBody,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    };
  });
  return { release, started: () => started };
}
async function workspace() {
  const value = await createWorkspace(c, workspaceOwner.token, {
    name: "自己共有",
    description: "",
  });
  await c.unitOfWorkProvider.run(async (u) => {
    await u.workspaces.membership(value.id, actor.id, "editor");
    await u.workspaces.membership(value.id, other.id, "editor");
  });
  return value.id;
}
const downgrade = (workspaceId: string) =>
  changeWorkspaceMember(c, workspaceOwner.token, {
    workspaceId,
    accountId: actor.id,
    role: "viewer",
    expectedRole: "editor",
    ownerConfirmed: false,
  });

function withLimit(monthlyLimit: number): HollowContainer {
  if (!c.llm) throw new Error("self LLM configuration unavailable");
  return { ...c, llm: { ...c.llm, monthlyLimit } };
}

async function browserActor() {
  const browserToken = c.tokens.generate();
  await ensureAuthenticationBrowser(c, browserToken);
  return { browserToken, sessionToken: actor.token };
}

async function reconnect(person: Awaited<ReturnType<typeof browserActor>>) {
  if (!c.openRouter) throw new Error("self OpenRouter unavailable");
  let correlation = "";
  vi.spyOn(c.openRouter.authorization, "authorization").mockImplementation(
    async (input) => {
      correlation = input.correlation;
      return "http://localhost:3100/self-authorization";
    },
  );
  const exchange = vi.spyOn(c.openRouter.authorization, "exchange");
  const settings = await getOpenRouterSettings(c, person);
  const attempt = await beginOpenRouter(c, person, {
    expectedEpoch: settings.epoch,
    expectedVersion: settings.version,
    confirmedReconnect: true,
    confirmedAdmissionSequence: settings.admission.sequence,
    returnTo: { kind: "settings" },
  });
  return {
    id: attempt.id,
    exchange,
    complete: () =>
      completeOpenRouter(c, person, correlation, "synthetic-code"),
  };
}

describe("LLM public control usecases with isolated DB", () => {
  it("failed reconnect metadata preserves the old active generation and allows it to finish", async () => {
    const person = await browserActor();
    const held = heldGenerator(true);
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    const attempt = await reconnect(person);
    if (!c.openRouter) throw new Error("self OpenRouter unavailable");
    vi.spyOn(c.openRouter.authorization, "inspectCredential").mockRejectedValue(
      new OpenRouterProviderError("OPENROUTER_UNAVAILABLE"),
    );
    await expect(attempt.complete()).rejects.toMatchObject({
      code: "OPENROUTER_UNAVAILABLE",
    });
    expect(await getOpenRouterSettings(c, person)).toMatchObject({
      state: "linked",
      epoch: 1,
    });
    expect((await state(job.jobId))?.cancelGeneration).toBe(0);
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(attempt.exchange).toHaveBeenCalledOnce();
  });

  it("successful reconnect fences old work without attaching it to the new key", async () => {
    const person = await browserActor();
    const held = heldGenerator(true);
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    await (await reconnect(person)).complete();
    expect(await getOpenRouterSettings(c, person)).toMatchObject({
      state: "linked",
      epoch: 2,
    });
    await sweepLlm(c);
    held.release();
    expect(await finished(job.jobId)).toMatchObject({
      credentialEpoch: 1,
      outcome: { kind: "cancelled" },
    });
    expect((await note()).html).toBe(originalBody);
    generate.mockResolvedValue({
      content: generatedBody,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    });
    const next = await requestLlmRegeneration(c, actor.token, {
      noteId,
      noteVersion: (await note()).version,
      commandId: base.idGenerator.next(),
      expectedEpoch: 2,
      modelId: "fixture/text",
      instruction: "整理",
      confirmed: true,
    });
    await sweepLlm(c);
    expect(await finished(next.jobId)).toMatchObject({
      credentialEpoch: 2,
      outcome: { kind: "succeeded" },
    });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 2,
      reserved: 0,
    });
  });

  it("requires a fresh admission confirmation without exchanging the candidate code twice", async () => {
    const person = await browserActor();
    const held = heldGenerator(true);
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    const attempt = await reconnect(person);
    const second = await request(await addNote(actor));
    await expect(attempt.complete()).rejects.toMatchObject({
      code: "OPENROUTER_RECONFIRM_REQUIRED",
    });
    expect((await state(job.jobId))?.cancelGeneration).toBe(0);
    expect((await state(second.jobId))?.cancelGeneration).toBe(0);
    const candidate = await c.unitOfWorkProvider.run((u) =>
      u.openRouterAttempts.find(attempt.id),
    );
    if (!candidate) throw new Error("self candidate missing");
    const settings = await getOpenRouterSettings(c, person);
    await retryOpenRouterMetadata(
      c,
      person,
      attempt.id,
      candidate.version,
      settings.admission.sequence,
    );
    expect(attempt.exchange).toHaveBeenCalledOnce();
    await sweepLlm(c);
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    await sweepLlm(c);
    expect((await finished(second.jobId))?.outcome.kind).toBe("cancelled");
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("unlink fences current actor work while another actor remains runnable", async () => {
    const person = await browserActor();
    const held = heldGenerator(true);
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    const otherNote = await addNote(other);
    const otherJob = await request(otherNote, other);
    const settings = await getOpenRouterSettings(c, person);
    await unlinkOpenRouter(c, person, settings);
    expect((await state(otherJob.jobId))?.cancelGeneration).toBe(0);
    await sweepLlm(c);
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect((await finished(otherJob.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note()).html).toBe(originalBody);
  });

  it("signout does not cancel accepted background generation", async () => {
    const person = await browserActor();
    const held = heldGenerator(true);
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    await signOutAuthentication(c, person);
    await expect(llmUsage(c, actor.token)).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
    });
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note()).html).toBe(generatedBody);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.llmQuota.usage(actor.id, "2026-09"),
      ),
    ).toMatchObject({ consumed: 1, reserved: 0 });
  });

  it("projects remaining capacity and the read timestamp from the same UTC snapshot", async () => {
    expect(await llmUsage(c, actor.token)).toMatchObject({
      month: "2026-09",
      reserved: 0,
      consumed: 0,
      limit: 30,
      remaining: 30,
      updatedAt: now.toISOString(),
      warning: false,
      resetsAt: "2026-10-01T00:00:00.000Z",
    });
    await request();
    expect(await llmUsage(c, actor.token)).toMatchObject({
      reserved: 1,
      consumed: 0,
      remaining: 29,
      updatedAt: now.toISOString(),
    });
  });

  it("does not reduce prior consumption when the operational limit is lowered", async () => {
    await succeed();
    await request();
    const lowered = withLimit(0);
    expect(await llmUsage(lowered, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 1,
      limit: 0,
      remaining: 0,
      warning: true,
    });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 1,
      limit: 30,
      remaining: 28,
    });
  });

  it("does not warn for reservations alone even when no capacity remains", async () => {
    await request();
    for (let i = 0; i < 3; i++) await request(await addNote(actor));
    const policy = withLimit(5);
    expect(await llmUsage(policy, actor.token)).toMatchObject({
      reserved: 4,
      remaining: 1,
      warning: false,
    });
    expect(await llmUsage(withLimit(4), actor.token)).toMatchObject({
      reserved: 4,
      remaining: 0,
      warning: false,
    });
  });

  it.each([
    { consumed: 0, reserved: 25, remaining: 5, warning: false },
    { consumed: 24, reserved: 1, remaining: 5, warning: false },
    { consumed: 24, reserved: 0, remaining: 6, warning: false },
    { consumed: 25, reserved: 0, remaining: 5, warning: true },
  ])("warns only for consumed usage: $consumed consumed, $reserved reserved", async ({
    consumed,
    reserved,
    remaining,
    warning,
  }) => {
    const persistedAt = now.getTime() - 1000;
    await base.db.run(sql`insert into llm_quota_buckets
        (account_id,month,reserved,consumed,updated_at)
        values(${actor.id},'2026-09',${reserved},${consumed},${persistedAt})`);
    const before = await base.db.all(
      sql`select * from llm_quota_buckets where account_id=${actor.id}`,
    );
    expect(await llmUsage(c, actor.token)).toEqual({
      month: "2026-09",
      reserved,
      consumed,
      limit: 30,
      remaining,
      updatedAt: now.toISOString(),
      warning,
      resetsAt: "2026-10-01T00:00:00.000Z",
    });
    expect(
      await base.db.all(
        sql`select * from llm_quota_buckets where account_id=${actor.id}`,
      ),
    ).toEqual(before);
  });

  it("uses the current UTC bucket without moving an accepted reservation across month end", async () => {
    await request();
    const nextMonth = new Date("2026-10-01T00:00:00.000Z");
    const nextToken = `synthetic-next-month-${base.idGenerator.next()}`;
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.saveSession({
        accountId: actor.id,
        tokenHash: c.tokens.hash(nextToken),
        expiresAt: new Date("2026-11-01T00:00:00Z"),
      });
    });
    const next = { ...c, clock: { now: () => nextMonth } };
    expect(await llmUsage(next, nextToken)).toMatchObject({
      month: "2026-10",
      reserved: 0,
      consumed: 0,
      remaining: 30,
      updatedAt: nextMonth.toISOString(),
      resetsAt: "2026-11-01T00:00:00.000Z",
    });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      month: "2026-09",
      reserved: 1,
      remaining: 29,
    });
  });

  it("cancels queued work idempotently, releases only unsent reservation and keeps the prior body", async () => {
    const job = await request();
    expect(await llmUsage(c, actor.token)).toMatchObject({
      reserved: 1,
      consumed: 0,
    });
    await cancelLlmRegeneration(c, actor.token, job.jobId);
    const cancelled = await state(job.jobId);
    await cancelLlmRegeneration(c, actor.token, job.jobId);
    expect(await state(job.jobId)).toEqual(cancelled);
    expect(cancelled).toMatchObject({
      phase: "terminal",
      outcome: { kind: "cancelled" },
      owner: { state: "idle" },
    });
    expect((await note()).html).toBe(originalBody);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      reserved: 0,
      consumed: 0,
    });
    expect(
      (await c.unitOfWorkProvider.run((u) => u.jobs.find(job.jobId)))?.state,
    ).toBe("cancelled");
    await sweepLlm(c);
    expect(generate).not.toHaveBeenCalled();
  });

  it("active cancellation waits for actual work settlement and never refunds consumed quota", async () => {
    const held = heldGenerator();
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    await cancelLlmRegeneration(c, actor.token, job.jobId);
    expect((await state(job.jobId))?.owner.state).toBe("active");
    expect(execution.active(job.jobId)).toBe(true);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect((await note()).html).toBe(originalBody);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("another actor cannot cancel or undo the requester job", async () => {
    const job = await request();
    const before = await state(job.jobId);
    await expect(
      cancelLlmRegeneration(c, other.token, job.jobId),
    ).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
    await expect(undoLlmBody(c, other.token, job.jobId)).rejects.toMatchObject({
      code: "LLM_UNDO_UNAVAILABLE",
    });
    expect(await state(job.jobId)).toEqual(before);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      reserved: 1,
      consumed: 0,
    });
  });

  it("undo restores only the prior body as a new revision without refunding consumption", async () => {
    const before = await note();
    const job = await succeed();
    const result = await undoLlmBody(c, actor.token, job.jobId);
    const restored = await note();
    expect(result.version).toBe(2);
    expect(restored.html).toBe(before.html);
    expect(restored.title).toBe(before.title);
    expect(restored.display).toEqual(before.display);
    expect(restored.owner).toEqual(before.owner);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.revisions.list(noteId))).length,
    ).toBe(3);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    await expect(undoLlmBody(c, actor.token, job.jobId)).rejects.toMatchObject({
      code: "LLM_UNDO_CHANGED",
    });
  });

  it("rejects undo after a later normal edit without overwriting it", async () => {
    const job = await succeed();
    await saveNote(c, actor.token, {
      id: noteId,
      version: 1,
      title: "後の題名",
      html: "<p>後の本文</p>",
    });
    const edited = await note();
    await expect(undoLlmBody(c, actor.token, job.jobId)).rejects.toMatchObject({
      code: "LLM_UNDO_CHANGED",
    });
    expect(await note()).toEqual(edited);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("rejects undo while a new regeneration is active without cancelling that request", async () => {
    const completed = await succeed();
    const queued = await request();
    await expect(
      undoLlmBody(c, actor.token, completed.jobId),
    ).rejects.toMatchObject({ code: "LLM_UNDO_CHANGED" });
    expect((await state(queued.jobId))?.cancelGeneration).toBe(0);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 1,
    });
  });

  it("keeps cumulative consumption across two successful jobs and body undo", async () => {
    const first = await succeed();
    await undoLlmBody(c, actor.token, first.jobId);
    const second = await succeed();
    await undoLlmBody(c, actor.token, second.jobId);
    await cancelLlmRegeneration(c, actor.token, second.jobId);
    expect(await llmUsage(c, actor.token)).toMatchObject({
      month: "2026-09",
      consumed: 2,
      reserved: 0,
    });
  });

  it("uses current workspace edit role for new requests and completed-body undo", async () => {
    const workspaceId = await workspace();
    const id = await addNote(actor, { kind: "workspace", workspaceId });
    const completed = await succeed(id);
    await downgrade(workspaceId);
    await expect(request(id)).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await expect(
      undoLlmBody(c, actor.token, completed.jobId),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    expect((await note(id)).html).toBe(generatedBody);
    expect((await state(completed.jobId))?.outcome.kind).toBe("succeeded");
  });

  it("membership cancellation is scoped to the affected actor and current workspace", async () => {
    const workspaceId = await workspace();
    const target = await request(
      await addNote(actor, { kind: "workspace", workspaceId }),
    );
    const sibling = await request(
      await addNote(other, { kind: "workspace", workspaceId }),
      other,
    );
    const personal = await request();
    await downgrade(workspaceId);
    expect((await state(target.jobId))?.cancelGeneration).toBe(1);
    expect((await state(sibling.jobId))?.cancelGeneration).toBe(0);
    expect((await state(personal.jobId))?.cancelGeneration).toBe(0);
    await cancelLlmRegeneration(c, actor.token, target.jobId);
    await cancelLlmRegeneration(c, other.token, sibling.jobId);
    await cancelLlmRegeneration(c, actor.token, personal.jobId);
  });

  it("trash cancels active generation and restore cannot revive its late result", async () => {
    const held = heldGenerator();
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    const trashed = await trashNote(c, actor.token, {
      id: noteId,
      version: 0,
      cancelProcessing: true,
    });
    await restoreNote(c, actor.token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    await sweepLlm(c);
    held.release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect(await note()).toMatchObject({
      lifecycle: { kind: "active" },
      html: originalBody,
      version: 2,
    });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("purge intent commits lifecycle and denies old undo without changing historical success or quota", async () => {
    const job = await succeed();
    const trashed = await trashNote(c, actor.token, {
      id: noteId,
      version: 1,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, actor.token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    expect(await note()).toMatchObject({
      lifecycle: { kind: "purging", purgeId: purge.id },
    });
    await expect(undoLlmBody(c, actor.token, job.jobId)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    expect((await state(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });

  it("normal purge archives the terminal job, removes owned bytes and leaves cumulative consumption unchanged", async () => {
    if (!c.llm) throw new Error("self LLM fixture unavailable");
    c = {
      ...c,
      importing: {
        storage: c.llm.storage,
        extractor: {
          async extract() {
            throw new Error("unexpected extraction");
          },
        },
        mediaValidator: { async validate() {} },
        async detectFormat() {
          return "text";
        },
        wake() {},
      },
    };
    const job = await succeed();
    const oldJob = await c.unitOfWorkProvider.run((u) =>
      u.jobs.find(job.jobId),
    );
    const original = await c.unitOfWorkProvider.run((u) =>
      u.imports.findByNote(noteId),
    );
    if (!original) throw new Error("self original unavailable");
    expect((await readdir(root)).sort()).toEqual(
      [".hollow-writer-owner", original.storageKey].sort(),
    );
    const usage = await llmUsage(c, actor.token);
    const trashed = await trashNote(c, actor.token, {
      id: noteId,
      version: 1,
      cancelProcessing: true,
    });
    const purge = await requestNotePurge(c, actor.token, {
      id: noteId,
      operationId: trashed.operationId,
    });
    await sweepNotePurges(c);
    const after = await c.unitOfWorkProvider.run(async (u) => ({
      purge: await u.purges.find(purge.id),
      note: await u.notes.findById(noteId),
      original: await u.imports.findByNote(noteId),
      conversion: await u.llmConversions.find(job.jobId),
      job: await u.jobs.find(job.jobId),
      dispatches: await u.llmDispatches.list(job.jobId),
      reservation: await u.llmQuota.reservation(job.jobId),
      snapshots: await u.purges.snapshots(
        actor.id,
        new Date(now.getTime() - 1),
      ),
    }));
    expect(after.purge?.state).toBe("succeeded");
    expect(after.note).toBeNull();
    expect(after.original).toBeNull();
    expect(after.conversion).toBeNull();
    expect(after.job).toBeNull();
    expect(after.dispatches).toEqual([]);
    expect(after.reservation).toBeNull();
    expect(after.snapshots.find((row) => row.id === job.jobId)).toMatchObject({
      state: "succeeded",
      accountId: actor.id,
      attempt: oldJob?.attempt,
      completed: 1,
      total: 1,
    });
    expect(await readdir(root)).toEqual([".hollow-writer-owner"]);
    expect(await llmUsage(c, actor.token)).toEqual(usage);
  });

  it("restoring editor role cannot revive the prior response but permits an explicit new request", async () => {
    const workspaceId = await workspace();
    const id = await addNote(actor, { kind: "workspace", workspaceId });
    const held = heldGenerator(true);
    const old = await request(id);
    await sweepLlm(c);
    await vi.waitFor(() => expect(held.started()).toBe(true));
    await downgrade(workspaceId);
    await sweepLlm(c);
    await changeWorkspaceMember(c, workspaceOwner.token, {
      workspaceId,
      accountId: actor.id,
      role: "editor",
      expectedRole: "viewer",
      ownerConfirmed: false,
    });
    expect((await state(old.jobId))?.cancelGeneration).toBe(1);
    held.release();
    expect((await finished(old.jobId))?.outcome.kind).toBe("cancelled");
    expect(await note(id)).toMatchObject({ html: originalBody, version: 0 });
    generate.mockResolvedValue({
      content: generatedBody,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    });
    const next = await succeed(id);
    expect(next.jobId).not.toBe(old.jobId);
    expect((await state(old.jobId))?.outcome.kind).toBe("cancelled");
    expect(await note(id)).toMatchObject({ html: generatedBody, version: 1 });
    expect(await llmUsage(c, actor.token)).toMatchObject({
      consumed: 2,
      reserved: 0,
    });
  });
});

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
import type { LlmGenerator } from "@repo/core/application/llm/ports";
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { saveNote } from "@repo/core/application/note/saveNote";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { assetUrl } from "@repo/core/domain/asset/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

function textInput(input: Parameters<LlmGenerator["generate"]>[0]): string {
  if (input.kind !== "chat-text") throw Error("SYNTHETIC_KIND");
  return input.input.html;
}
const now = new Date("2026-09-28T00:00:00Z");
const token = "synthetic-media-session";
const ownerToken = "synthetic-owner-session";
const rawSrc = "../images/figure.png";
const hash = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
let base: TestContainer;
let c: HollowContainer;
let execution: NodeLlmExecution;
let root: string;
let accountId: string;
let workspaceId: string;
let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
const releases: Array<() => void> = [];

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
  root = await mkdtemp(path.join(tmpdir(), "hollow-llm-source-media-test-"));
  storageCreated = true;
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
  executionCreated = true;
  const storage = new CoordinatedObjectStorage(
    root,
    initial.unitOfWorkProvider,
    clock,
  );
  await storage.recoverOwners();
  generate = vi.fn<LlmGenerator["generate"]>(async (input) => ({
    content: textInput(input),
    finish: "stop",
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
  const ownerId = base.idGenerator.next();
  await c.unitOfWorkProvider.run(async (u) => {
    for (const [id, session] of [
      [accountId, token],
      [ownerId, ownerToken],
    ] as const) {
      await u.accounts.save(
        verifyAccount(
          createAccount(id, `${id}@fixture.invalid`, "synthetic", now),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId: id,
        tokenHash: c.tokens.hash(session),
        expiresAt: new Date(now.getTime() + 86400000),
      });
    }
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
  });
  workspaceId = (
    await createWorkspace(c, ownerToken, {
      name: "媒体自己fixture",
      description: "",
    })
  ).id;
  await c.unitOfWorkProvider.run((u) =>
    u.workspaces.membership(workspaceId, accountId, "editor"),
  );
});

afterEach(async (context) => {
  for (const release of releases.splice(0)) release();
  let healthy = context.task.result?.state !== "fail";
  let closed = !executionCreated;
  try {
    if (executionCreated) await execution.stop();
    closed = true;
    if (dbCreated) {
      expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
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

async function fixture(format: "html" | "markdown") {
  const noteId = base.idGenerator.next();
  const assetId = base.idGenerator.next();
  const draftId = base.idGenerator.next();
  const entryId = base.idGenerator.next();
  const originalId = base.idGenerator.next();
  const jobId = base.idGenerator.next();
  const batchId = base.idGenerator.next();
  const url = assetUrl({ scope: "notes", scopeId: noteId, assetId });
  const marker = `[[hollow-media:${entryId}]]`;
  const previousHtml = `<p>保持本文</p><img src="${url}" alt="既存">`;
  const source =
    format === "html"
      ? `<h1>新見出し</h1><p>前<img src="${rawSrc}" alt="図">中<img src="${rawSrc}" alt="図">後</p>`
      : `# 新見出し\n\n前 ![図](${rawSrc}) 中 ![図](${rawSrc}) 後`;
  const original = Buffer.from(source);
  const media = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const files = new FileObjectStorage(root);
  for (const [key, bytes] of [
    [originalId, original],
    [assetId, media],
  ] as const) {
    await files.put(
      key,
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      bytes.length,
    );
  }
  await c.unitOfWorkProvider.run(async (u) => {
    await u.notes.insert(
      createNote(
        {
          id: noteId,
          accountId,
          owner: { kind: "workspace", workspaceId },
          title: "保持題名",
          html: previousHtml,
          text: "保持本文",
        },
        now,
      ),
    );
    await u.imports.insertBatch({
      id: batchId,
      accountId,
      workspaceId,
      createdAt: now,
      useAi: false,
      cancelledAt: null,
    });
    await u.imports.insertOriginal({
      id: originalId,
      noteId,
      accountId,
      name: `fixture.${format === "html" ? "html" : "md"}`,
      bytes: original.length,
      storageKey: originalId,
      sha256: hash(original),
      format,
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
    await u.assets.insertDraft({
      id: draftId,
      accountId,
      workspaceId,
      noteId,
      expiresAt: new Date(now.getTime() + 86400000),
    });
    await u.assets.insert({
      id: assetId,
      accountId,
      draftId,
      storageKey: assetId,
      bytes: media.length,
      sha256: hash(media),
      mime: "image/png",
      kind: "image",
      createdAt: now,
      unreferencedAt: null,
      committedToNote: true,
      state: "ready",
    });
    await u.assets.replaceCurrentReferences(noteId, [assetId], now);
    await u.references.saveEntry({
      id: entryId,
      noteId,
      kind: "image",
      url: rawSrc,
      location: "img:src",
      current: true,
      state: "acquired",
      reason: null,
      assetId,
      finalUrl: url,
      bytes: media.length,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { noteId, assetId, entryId, url, marker, previousHtml };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function run(value: Fixture) {
  const job = await requestLlmRegeneration(c, token, {
    noteId: value.noteId,
    noteVersion: 0,
    commandId: base.idGenerator.next(),
    expectedEpoch: 1,
    modelId: "fixture/text",
    instruction: "構造を保持",
    confirmed: true,
  });
  await sweepLlm(c);
  return job;
}
async function finish(jobId: string) {
  await vi.waitFor(async () =>
    expect(
      (await c.unitOfWorkProvider.run((u) => u.llmConversions.find(jobId)))
        ?.phase,
    ).toBe("terminal"),
  );
  await vi.waitFor(() => expect(execution.active(jobId)).toBe(false));
  return c.unitOfWorkProvider.run((u) => u.llmConversions.find(jobId));
}
async function snapshot(value: Fixture) {
  return c.unitOfWorkProvider.run(async (u) => ({
    note: await u.notes.findById(value.noteId),
    revisions: await u.revisions.list(value.noteId),
    current: await u.assets.referenceIds(value.noteId, 0),
    first: await u.assets.referenceIds(value.noteId, 1),
    second: await u.assets.referenceIds(value.noteId, 2),
    asset: await u.assets.find(value.assetId),
  }));
}
function hold() {
  let release = () => {};
  let started = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  generate.mockImplementation(async (input) => {
    started = true;
    await pending;
    return {
      content: textInput(input),
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    };
  });
  return { release, started: () => started };
}

describe("LLM original media through actual source Worker and commit", () => {
  it.each([
    "html",
    "markdown",
  ] as const)("restores repeated raw relative %s media and pins both prior and generated revisions", async (format) => {
    const value = await fixture(format);
    const job = await run(value);
    expect((await finish(job.jobId))?.outcome.kind).toBe("succeeded");
    const input = generate.mock.calls[0]?.[0];
    if (!input) throw Error("SYNTHETIC_INPUT");
    expect(textInput(input).split(value.marker).length).toBe(3);
    expect(textInput(input).includes(rawSrc)).toBe(false);
    const after = await snapshot(value);
    expect(after.note?.html.split(value.url).length).toBe(3);
    expect(after.note?.html.includes("[[hollow-media:")).toBe(false);
    expect(after.note?.html.includes(rawSrc)).toBe(false);
    expect(after.note?.version).toBe(1);
    expect(after.current).toEqual([value.assetId]);
    expect(after.first).toEqual([value.assetId]);
    expect(after.second).toEqual([value.assetId]);
    expect(after.revisions).toHaveLength(2);
    await saveNote(c, token, {
      id: value.noteId,
      version: 1,
      title: "保持題名",
      html: "<p>後続本文</p>",
    });
    const removed = await snapshot(value);
    expect(removed.current).toEqual([]);
    expect(removed.first).toEqual([value.assetId]);
    expect(removed.second).toEqual([value.assetId]);
    expect(removed.asset).toMatchObject({
      state: "ready",
      unreferencedAt: null,
    });
  });

  it.each([
    "unknown",
    "missing",
    "excess",
  ] as const)("rejects %s result markers without committing or changing current pins", async (fault) => {
    const value = await fixture("html");
    generate.mockImplementation(async (input) => ({
      content:
        fault === "missing"
          ? textInput(input).replace(value.marker, "")
          : `${textInput(input)}${fault === "excess" ? value.marker : "[[hollow-media:00000000-0000-4000-8000-000000000001]]"}`,
      finish: "stop",
      inputTokens: 1,
      outputTokens: 2,
    }));
    const job = await run(value);
    expect((await finish(job.jobId))?.outcome).toEqual({
      kind: "failed",
      code: "LLM_RESPONSE_INVALID",
    });
    const after = await snapshot(value);
    expect(after.note).toMatchObject({ html: value.previousHtml, version: 0 });
    expect(after.current).toEqual([value.assetId]);
    expect(after.first).toEqual([value.assetId]);
    expect(after.second).toEqual([]);
    expect(after.revisions).toHaveLength(1);
  });

  it("never maps an acquired entry to another note's ready asset without a current relation", async () => {
    const value = await fixture("html");
    const foreign = await fixture("html");
    await c.unitOfWorkProvider.run(async (u) => {
      const entry = (await u.references.entries(value.noteId))[0];
      if (!entry) throw new Error("self entry unavailable");
      await u.references.saveEntry({
        ...entry,
        assetId: foreign.assetId,
        finalUrl: foreign.url,
      });
    });
    const job = await run(value);
    expect((await finish(job.jobId))?.outcome.kind).toBe("succeeded");
    const input = generate.mock.calls[0]?.[0];
    if (!input) throw Error("SYNTHETIC_INPUT");
    expect(textInput(input).includes("[[hollow-media:")).toBe(false);
    const after = await snapshot(value);
    expect(after.note?.html.includes(foreign.assetId)).toBe(false);
    expect(after.current).toEqual([]);
    expect(after.first).toEqual([value.assetId]);
    expect((await snapshot(foreign)).current).toEqual([foreign.assetId]);
  });

  it("rechecks current media relations after generation before committing the formerly valid placeholder", async () => {
    const value = await fixture("html");
    const gate = hold();
    const job = await run(value);
    await vi.waitFor(() => expect(gate.started()).toBe(true));
    await c.unitOfWorkProvider.run((u) =>
      u.assets.replaceCurrentReferences(value.noteId, [], now),
    );
    gate.release();
    expect((await finish(job.jobId))?.outcome).toEqual({
      kind: "failed",
      code: "LLM_SOURCE_CHANGED",
    });
    const after = await snapshot(value);
    expect(after.note).toMatchObject({ html: value.previousHtml, version: 0 });
    expect(after.second).toEqual([]);
    expect(after.first).toEqual([value.assetId]);
  });

  it("does not commit media from a late response after current edit permission is removed", async () => {
    const value = await fixture("markdown");
    const gate = hold();
    const job = await run(value);
    await vi.waitFor(() => expect(gate.started()).toBe(true));
    await changeWorkspaceMember(c, ownerToken, {
      workspaceId,
      accountId,
      role: "viewer",
      expectedRole: "editor",
      ownerConfirmed: false,
    });
    await sweepLlm(c);
    gate.release();
    expect((await finish(job.jobId))?.outcome.kind).toBe("cancelled");
    const after = await snapshot(value);
    expect(after.note).toMatchObject({ html: value.previousHtml, version: 0 });
    expect(after.current).toEqual([value.assetId]);
    expect(after.second).toEqual([]);
  });
});

import { pdfFixtureServices } from "./llmPdfFixtureServices";

import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { NodeLlmExecution } from "@repo/core/adapters/node/llm/execution";
import { NodeLlmResultProcessor } from "@repo/core/adapters/node/llm/resultProcessor";
import { NodeLlmSourcePreparer } from "@repo/core/adapters/node/llm/sourcePreparer";
import { NodeLlmSourceReader } from "@repo/core/adapters/node/llm/sourceReader";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import {
  cancelImport,
  retryImport,
} from "@repo/core/application/import/controlJobs";
import { runImportJob } from "@repo/core/application/import/processJob";
import { listImports } from "@repo/core/application/import/readImports";
import { unlinkOpenRouter } from "@repo/core/application/integration/openRouter/connection";
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
import {
  requestLlmRegeneration,
  retryLlmJob,
} from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { defaultOpenRouterModels } from "@repo/core/domain/integration/openRouter";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

const fixtureDirectory = process.env.HOLLOW_LLM_TEST_DIRECTORY ?? "";
const now = new Date("2026-09-28T12:00:00Z");
const token = "synthetic-image-session";
const modelId = "fixture/image";
let image: Buffer;
let sourceBytes = 0;
let failedFixture = false;

function body(bytes: Uint8Array): ReadableStream<Uint8Array> {
  sourceBytes += bytes.byteLength;
  if (bytes.byteLength > 65536 || sourceBytes > 2 * 1024 * 1024)
    throw Error("SYNTHETIC_SOURCE_LIMIT");
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
function code(error: unknown): string {
  const allowed = new Set([
    "NOTE_NOT_FOUND",
    "LLM_OWNERSHIP_UNKNOWN",
    "LLM_UNDO_CHANGED",
  ]);
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    allowed.has(error.code)
    ? error.code
    : "UNEXPECTED_ERROR";
}
async function rejected(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "UNEXPECTED_SUCCESS";
  } catch (error) {
    return code(error);
  }
}
async function noPriorFixture(): Promise<void> {
  if (
    !fixtureDirectory ||
    path.resolve(tmpdir()) !== fixtureDirectory ||
    failedFixture
  )
    throw Error("SYNTHETIC_FIXTURE_STOPPED");
  const names = await readdir(fixtureDirectory);
  if (
    names.some(
      (name) =>
        name.startsWith("libsql-test-") || name.startsWith("hollow-llm-image-"),
    )
  )
    throw Error("SYNTHETIC_PREVIOUS_FIXTURE");
}

describe("single-image recipe through real preparation and durable body commit", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeLlmExecution;
  let root: string;
  let accountId: string;
  let noteId: string;
  let originalId: string;
  let dbCreated = false;
  let storageCreated = false;
  let executionCreated = false;
  let release = () => {};
  let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
  let validRaster = false;
  let inspectedImage = false;

  beforeAll(async () => {
    await noPriorFixture();
    image = await sharp({
      create: { width: 3, height: 2, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    expect(image.length < 65536).toBe(true);
  });
  beforeEach(async () => {
    dbCreated = false;
    storageCreated = false;
    executionCreated = false;
    validRaster = false;
    inspectedImage = false;
    await noPriorFixture();
    base = await createTestContainer();
    dbCreated = true;
    root = await mkdtemp(path.join(fixtureDirectory, "hollow-llm-image-"));
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
    generate = vi.fn(async (input) => {
      validRaster =
        input.kind === "chat-image" &&
        input.promptVersion === 2 &&
        input.input.kind === "single-raster" &&
        input.input.mimeType === "image/png" &&
        input.input.width === 3 &&
        input.input.height === 2 &&
        input.input.bytes.length < 65536 &&
        input.model.kind === "chat-image" &&
        input.model.budget.kind === "resource-only" &&
        input.model.budget.imageTokens === null &&
        !input.model.budget.contextGuaranteed;
      if (!validRaster) throw Error("SYNTHETIC_IMAGE_WIRE");
      return {
        content:
          "<h1>Generated image</h1><p>Safe result</p><script>discard()</script>",
        finish: "stop" as const,
        inputTokens: 1,
        outputTokens: 2,
      };
    });
    c = {
      ...initial,
      clock,
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: {
          validate: async ({ body: stream }) => {
            const reader = stream.getReader();
            try {
              while (!(await reader.read()).done) {}
            } finally {
              await reader.cancel();
              reader.releaseLock();
            }
          },
        },
        detectFormat,
        wake: () => {},
      },
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
          inspect: async ({ modelId: selected, kind }) => {
            const common = {
              modelId: selected,
              contextTokens: 100000,
              outputTokens: 8192,
              supportsMaxTokens: true as const,
              source: "live" as const,
              checkedAt: now,
            };
            if (kind === "chat-image") {
              inspectedImage = true;
              return {
                ...common,
                kind,
                budget: {
                  kind: "resource-only",
                  imageTokens: null,
                  contextGuaranteed: false,
                },
              };
            }
            return { ...common, kind };
          },
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
    originalId = base.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(accountId, "image@fixture.invalid", "synthetic", now),
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
      const defaults = defaultOpenRouterModels(accountId, now);
      await u.openRouterModels.insertDefaults(defaults);
      expect(
        await u.openRouterModels.replace(
          {
            ...defaults,
            version: 2,
            text: { kind: "chat-text", modelId: "fixture/text" },
            image: { kind: "chat-image", modelId },
          },
          1,
        ),
      ).toBe(true);
    });
  });
  afterEach(async ({ task }) => {
    release();
    release = () => {};
    let closed = !executionCreated;
    let healthy = task.result?.state !== "fail";
    try {
      if (executionCreated) {
        await execution.stop();
        closed = true;
      }
      if (dbCreated) {
        expect((await base.db.all(sql`pragma foreign_key_check`)).length).toBe(
          0,
        );
        expect(
          (await base.db.all(sql`select 1 from object_writes where active=1`))
            .length,
        ).toBe(0);
        const names = (await readdir(fixtureDirectory)).filter((name) =>
          name.startsWith("libsql-test-"),
        );
        let size = 0;
        for (const name of names) {
          try {
            size += (await stat(path.join(fixtureDirectory, name))).size;
          } catch (error) {
            if (
              !(
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ENOENT"
              )
            )
              throw Error("SYNTHETIC_STAT");
          }
        }
        expect(size < 16 * 1024 * 1024).toBe(true);
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
        failedFixture = true;
        if (closed && dbCreated) base.client.close();
      }
    }
  });
  async function attach(
    bytes = image,
    owner: NoteOwner = { kind: "personal", accountId },
  ) {
    const jobId = base.idGenerator.next();
    const batchId = base.idGenerator.next();
    await new FileObjectStorage(root).put(
      "original",
      body(bytes),
      bytes.length,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      await u.notes.insert(
        createNote(
          {
            id: noteId,
            accountId,
            owner,
            title: "Preserved title",
            html: "<p>Original body</p>",
            text: "Original body",
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
        name: "fixture.png",
        bytes: bytes.length,
        storageKey: "original",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        format: "image",
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
  }
  async function upload(
    useAi: boolean,
    requestedVisibility?: "private" | "link" | "public",
    workspaceId?: string,
    actorToken = token,
  ) {
    const batch = await beginUpload(c, actorToken, {
      files: [{ name: "fixture.png", bytes: image.length }],
      useAi,
      ...(requestedVisibility ? { requestedVisibility } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    });
    const file = batch.files[0];
    if (!file) throw Error("SYNTHETIC_FILE");
    const accepted = await acceptUpload(c, actorToken, file.id, body(image));
    if (!accepted.noteId || !accepted.jobId) throw Error("SYNTHETIC_ACCEPT");
    noteId = accepted.noteId;
    const original = await c.unitOfWorkProvider.run((u) =>
      u.imports.findByNote(noteId),
    );
    if (!original) throw Error("SYNTHETIC_ORIGINAL");
    originalId = original.id;
    return accepted.jobId;
  }
  async function publicationKeys() {
    await writeFile(path.join(root, "share.key"), randomBytes(32), {
      mode: 0o600,
    });
    c = {
      ...c,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory: root,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
  }
  async function profile(handle: string | null) {
    const current = await getProfile(c, token);
    return saveProfile(c, token, {
      displayName: "Synthetic image owner",
      handle,
      bio: "",
      nameVersion: current.nameVersion,
      profileVersion: current.profileVersion,
      confirmHandleChange: true,
    });
  }
  async function firstImage(
    mode: "needs-ai" | "ai-off",
    visibility: "private" | "link" | "public",
    workspaceId?: string,
    actorToken = token,
  ) {
    const llm = legacyLlm(c);
    if (mode === "needs-ai") c = { ...c, llm: { ...llm, configured: false } };
    const id = await upload(
      mode === "needs-ai",
      visibility,
      workspaceId,
      actorToken,
    );
    expect(await conversion(id)).toBeNull();
    const job = await c.unitOfWorkProvider.run((u) =>
      u.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 90000)),
    );
    if (!job || job.id !== id) throw Error("SYNTHETIC_INITIAL_IMAGE_JOB");
    await runImportJob(c, job);
    c = { ...c, llm };
    const source = await original();
    expect(source).toMatchObject({
      state: mode === "needs-ai" ? "needs_ai" : "failed",
      coverage: "no_text",
      activeJobId: id,
    });
    expect((await note())?.html).toBe("");
    expect((await note())?.version).toBe(0);
    expect(generate).not.toHaveBeenCalled();
    await quota(0);
    return job;
  }
  const request = () =>
    requestLlmRegeneration(c, token, {
      noteId,
      noteVersion: 0,
      commandId: base.idGenerator.next(),
      expectedEpoch: 1,
      modelId,
      instruction: "",
      confirmed: true,
    });
  const conversion = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.llmConversions.find(id));
  const note = () => c.unitOfWorkProvider.run((u) => u.notes.findById(noteId));
  const original = () =>
    c.unitOfWorkProvider.run((u) => u.imports.findOriginal(originalId));
  async function finished(id: string) {
    await vi.waitFor(
      async () => expect((await conversion(id))?.phase).toBe("terminal"),
      { timeout: 10000 },
    );
    await vi.waitFor(() => expect(execution.active(id)).toBe(false));
    return conversion(id);
  }
  async function quota(consumed: number, reserved = 0) {
    const usage = await llmUsage(c, token);
    expect(usage.consumed).toBe(consumed);
    expect(usage.reserved).toBe(reserved);
  }
  function loseResponseAck() {
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
            if (armed) {
              const response = u.llmDispatches.response.bind(u.llmDispatches);
              u.llmDispatches.response = async (...args) => {
                const stored = await response(...args);
                if (stored) lose = true;
                return stored;
              };
            }
            return fn(u);
          });
          if (lose && armed) {
            armed = false;
            throw Error("SYNTHETIC_RESPONSE_ACK");
          }
          return result;
        },
      },
    };
  }
  async function recover(id: string) {
    await vi.waitFor(
      async () => expect((await conversion(id))?.owner.state).toBe("unknown"),
      { timeout: 10000 },
    );
    expect(await rejected(execution.stop())).toBe("LLM_OWNERSHIP_UNKNOWN");
    let predecessor = execution.runtimeId;
    const ownership = {
      runtimeId: base.idGenerator.next(),
      predecessors: () => (predecessor ? [predecessor] : []),
      assertReady: () => {
        if (predecessor) throw Error("SYNTHETIC_ACK");
      },
      acknowledge: async () => {
        predecessor = "";
      },
    };
    execution = new NodeLlmExecution(ownership, c.clock);
    if (!c.llm) throw Error("SYNTHETIC_LLM");
    c = { ...c, llm: { ...legacyLlm(c), execution, ownership } };
    await recoverLlm(c);
  }
  async function workspaceImage() {
    const ownerId = base.idGenerator.next();
    const ownerToken = "synthetic-image-owner";
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            ownerId,
            "image-owner@fixture.invalid",
            "synthetic",
            now,
          ),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId: ownerId,
        tokenHash: c.tokens.hash(ownerToken),
        expiresAt: new Date(now.getTime() + 86400000),
      });
    });
    const workspace = await createWorkspace(c, ownerToken, {
      name: "Image fixture",
      description: "",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspace.id, accountId, "editor"),
    );
    await attach(image, { kind: "workspace", workspaceId: workspace.id });
    return () =>
      changeWorkspaceMember(c, ownerToken, {
        workspaceId: workspace.id,
        accountId,
        role: "viewer",
        expectedRole: "editor",
        ownerConfirmed: false,
      });
  }
  it("applies a deferred limited-link intent only after an owned image import succeeds", async () => {
    await writeFile(path.join(root, "share.key"), randomBytes(32), {
      mode: 0o600,
    });
    c = {
      ...c,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory: root,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    const id = await upload(true, "link");
    expect((await conversion(id))?.operation).toBe("import");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "private", version: 0, linkGeneration: 0 });
    await sweepLlm(c);
    expect((await finished(id))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("Safe result");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", version: 1, linkGeneration: 1 });
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
    await quota(1);
  });
  it("retries a failed image import in its original parent with the saved model and link intent", async () => {
    await writeFile(path.join(root, "share.key"), randomBytes(32), {
      mode: 0o600,
    });
    c = {
      ...c,
      sharing: {
        protector: await NodeShareTokenProtector.load({
          directory: root,
          activeKeyId: "share",
          keyIds: ["share"],
        }),
        passwordWork: new NodeSharePasswordWork(),
      },
    };
    generate.mockRejectedValueOnce(
      new LlmOperationError("LLM_RATE_LIMIT", "possible", true),
    );
    const id = await upload(true, "link");
    const initial = await c.unitOfWorkProvider.run((u) => u.jobs.find(id));
    await sweepLlm(c);
    expect((await finished(id))?.outcome).toEqual({
      kind: "failed",
      code: "LLM_RATE_LIMIT",
    });
    const failedOriginal = await original();
    const failedNote = await note();
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "private", version: 0 });
    await c.unitOfWorkProvider.run(async (u) => {
      const settings = await u.openRouterModels.find(accountId);
      if (!settings) throw Error("SYNTHETIC_SETTINGS");
      expect(
        await u.openRouterModels.replace(
          {
            ...settings,
            image: { kind: "chat-image", modelId: "fixture/new-default" },
            version: settings.version + 1,
          },
          settings.version,
        ),
      ).toBe(true);
    });
    const accepted = await retryImport(c, token, id);
    const duplicate = await retryImport(c, token, id);
    expect(duplicate).toEqual(accepted);
    expect(accepted.jobId).not.toBe(id);
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(accepted.jobId)),
    ).toMatchObject({
      batchId: initial?.batchId,
      retryOf: id,
      state: "queued",
    });
    expect(await conversion(accepted.jobId)).toMatchObject({
      operation: "import",
      modelId,
      credentialEpoch: 1,
      retryOf: id,
      owner: { state: "idle" },
      inputReceipt: null,
    });
    const pending = (await listImports(c, token)).batches.find(
      (batch) => batch.id === initial?.batchId,
    );
    expect(pending?.active).toBe(true);
    expect(pending?.jobs.map((job) => job.id)).toEqual([accepted.jobId]);
    expect(generate).toHaveBeenCalledTimes(1);
    await sweepLlm(c);
    expect((await finished(accepted.jobId))?.outcome.kind).toBe("succeeded");
    const done = (await listImports(c, token)).batches.find(
      (batch) => batch.id === initial?.batchId,
    );
    expect(done?.active).toBe(false);
    expect(done?.jobs.map((job) => job.state)).toEqual(["succeeded"]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", version: 1, linkGeneration: 1 });
    expect((await note())?.html).toContain("Safe result");
    expect(failedNote?.html).toBe("");
    expect(await original()).toMatchObject({
      id: failedOriginal?.id,
      storageKey: failedOriginal?.storageKey,
      sha256: failedOriginal?.sha256,
      bytes: failedOriginal?.bytes,
    });
    expect(generate.mock.calls[1]?.[0].model.modelId).toBe(modelId);
    expect(generate).toHaveBeenCalledTimes(2);
    await quota(2);
  });
  it.each([
    "edited",
    "relinked",
    "original",
    "ownership",
  ] as const)("refuses an import retry after %s without inserting or dispatching another job", async (cause) => {
    generate.mockRejectedValueOnce(
      new LlmOperationError("LLM_RATE_LIMIT", "possible", true),
    );
    const id = await upload(true);
    await sweepLlm(c);
    expect((await finished(id))?.outcome.kind).toBe("failed");
    if (cause === "edited") {
      const current = await note();
      if (!current) throw Error("SYNTHETIC_NOTE");
      await saveNote(c, token, {
        id: noteId,
        version: current.version,
        title: current.title,
        html: "<p>new human body</p>",
      });
    } else if (cause === "relinked") {
      await c.unitOfWorkProvider.run(async (u) => {
        const current = await u.openRouterConnections.find(accountId);
        if (!current) throw Error("SYNTHETIC_CONNECTION");
        expect(
          await u.openRouterConnections.replace(
            {
              ...current,
              epoch: current.epoch + 1,
              version: current.version + 1,
            },
            current.version,
          ),
        ).toBe(true);
      });
    } else {
      const provider = c.unitOfWorkProvider;
      c = {
        ...c,
        unitOfWorkProvider: {
          run: <T>(work: (u: HollowUnitOfWorkContext) => Promise<T>) =>
            provider.run(async (u) => {
              if (cause === "original") {
                const find = u.imports.findByNote.bind(u.imports);
                u.imports.findByNote = async (key) => {
                  const value = await find(key);
                  return value
                    ? { ...value, activeJobId: base.idGenerator.next() }
                    : null;
                };
              } else {
                const find = u.llmConversions.find.bind(u.llmConversions);
                u.llmConversions.find = async (key) => {
                  const value = await find(key);
                  return value && key === id
                    ? {
                        ...value,
                        owner: {
                          state: "unknown" as const,
                          runtimeId: execution.runtimeId,
                          token: "unconfirmed-owned-input",
                        },
                      }
                    : value;
                };
              }
              return work(u);
            }),
        },
      };
    }
    const before = await base.db.all(
      sql`select * from conversion_jobs order by id`,
    );
    const originalBefore = await original();
    const quotaBefore = await llmUsage(c, token);
    await expect(retryImport(c, token, id)).rejects.toMatchObject({
      code:
        cause === "edited"
          ? "LLM_RETRY_BODY_CHANGED"
          : cause === "relinked"
            ? "LLM_RETRY_NEW_CONNECTION"
            : "JOB_NOT_RETRYABLE",
    });
    expect(
      await base.db.all(sql`select * from conversion_jobs order by id`),
    ).toEqual(before);
    expect(await original()).toEqual(originalBefore);
    expect(await llmUsage(c, token)).toEqual(quotaBefore);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it.each([
    { mode: "needs-ai", visibility: "link" },
    { mode: "needs-ai", visibility: "public" },
    { mode: "ai-off", visibility: "link" },
    { mode: "ai-off", visibility: "public" },
  ] as const)("first image generation after $mode applies the original $visibility intent and body undo preserves sharing", async ({
    mode,
    visibility,
  }) => {
    await publicationKeys();
    if (visibility === "public") await profile("first-image-public");
    const previous = await firstImage(mode, visibility);
    const source = await original();
    const initialSharing = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    expect(initialSharing).toMatchObject({ visibility: "private", version: 0 });
    const requested = await request();
    expect(await conversion(requested.jobId)).toMatchObject({
      operation: "regenerate",
      sourceState: mode === "needs-ai" ? "needs_ai" : "failed",
      sourceCoverage: "no_text",
      source: { originalId, format: "image" },
      preparationVersion: 3,
      promptVersion: 2,
      modelId,
      credentialEpoch: 1,
      retryOf: previous.id,
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(requested.jobId)),
    ).toMatchObject({
      batchId: previous.batchId,
      retryOf: previous.id,
      accountId,
      state: "queued",
    });
    const pending = (await listImports(c, token)).batches;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.active).toBe(true);
    expect(pending[0]?.jobs.map((job) => job.id)).toEqual([requested.jobId]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toEqual(initialSharing);
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("Safe result");
    expect(await original()).toMatchObject({
      id: source?.id,
      bytes: source?.bytes,
      sha256: source?.sha256,
      storageKey: source?.storageKey,
    });
    const published = await c.unitOfWorkProvider.run(async (u) => ({
      sharing: await u.sharing.find(noteId),
      identity: await u.publicNotes.find(noteId),
    }));
    expect(published.sharing).toMatchObject({
      visibility,
      version: 1,
      linkGeneration: 1,
    });
    expect(published.sharing?.tokenHash).toBeTruthy();
    expect(Boolean(published.identity)).toBe(visibility === "public");
    const done = (await listImports(c, token)).batches;
    expect(done).toHaveLength(1);
    expect(done[0]?.active).toBe(false);
    expect(done[0]?.jobs).toHaveLength(1);
    expect(done[0]?.jobs[0]).toMatchObject({
      id: requested.jobId,
      state: "succeeded",
      publicationNotice: null,
    });
    await undoLlmBody(c, token, requested.jobId);
    expect((await note())?.html).toBe("");
    expect(
      await c.unitOfWorkProvider.run(async (u) => ({
        sharing: await u.sharing.find(noteId),
        identity: await u.publicNotes.find(noteId),
      })),
    ).toEqual(published);
    expect(generate).toHaveBeenCalledTimes(1);
    await quota(1);
  });
  it("does not inherit a cancelled original batch's link intent into first image generation", async () => {
    await publicationKeys();
    const previous = await firstImage("needs-ai", "link");
    await cancelImport(c, token, previous.batchId);
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.imports.findBatch(previous.batchId),
      ),
    ).toMatchObject({ requestedVisibility: "link", cancelledAt: now });
    const before = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    const requested = await request();
    const job = await c.unitOfWorkProvider.run((u) =>
      u.jobs.find(requested.jobId),
    );
    if (!job) throw Error("SYNTHETIC_CANCELLED_BATCH_IMAGE_JOB");
    expect(job.batchId).not.toBe(previous.batchId);
    expect(job.retryOf).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.imports.findBatch(job.batchId)),
    ).toMatchObject({ requestedVisibility: "private", accountId });
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("Safe result");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toEqual(before);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    await quota(1);
  });
  it("keeps a manual private password and sharing stamp during initial image generation", async () => {
    await publicationKeys();
    await profile("manual-first-image");
    const previous = await firstImage("ai-off", "public");
    const view = await getSharing(c, token, noteId);
    await changeSharing(c, token, {
      expected: view.expected,
      operation: { kind: "password", password: "synthetic-private-password" },
    });
    const manual = await c.unitOfWorkProvider.run((u) =>
      u.sharing.find(noteId),
    );
    expect(manual?.passwordHash).toBeTruthy();
    expect(manual?.version).toBe(1);
    const requested = await request();
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("Safe result");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toEqual(manual);
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    const parent = (await listImports(c, token)).batches.find(
      (batch) => batch.id === previous.batchId,
    );
    expect(parent?.jobs).toHaveLength(1);
    expect(parent?.jobs[0]?.publicationNotice).toContain("共有設定が変更");
    expect(parent?.jobs[0]?.publicationNotice).not.toContain(
      "synthetic-private-password",
    );
    await quota(1);
  });
  it("keeps a first generated image private with a safe notice after its public handle disappears", async () => {
    await publicationKeys();
    await profile("temporary-first-image");
    const previous = await firstImage("needs-ai", "public");
    const requested = await request();
    await profile(null);
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("Safe result");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "private", version: 0, tokenHash: null });
    expect(
      await c.unitOfWorkProvider.run((u) => u.publicNotes.find(noteId)),
    ).toBeNull();
    const parent = (await listImports(c, token)).batches.find(
      (batch) => batch.id === previous.batchId,
    );
    expect(parent?.jobs).toHaveLength(1);
    expect(parent?.jobs[0]).toMatchObject({
      state: "succeeded",
      failure: null,
    });
    expect(parent?.jobs[0]?.publicationNotice).toBe(
      "公開ハンドルが未設定に戻ったため、本文は非公開で保存しました。プロフィールで設定してから公開してください。",
    );
    await quota(1);
  });
  it("preserves first-generation link intent when quota rejects a never-read job and a later retry succeeds", async () => {
    await publicationKeys();
    const previous = await firstImage("needs-ai", "link");
    const llm = legacyLlm(c);
    c = { ...c, llm: { ...llm, monthlyLimit: 0 } };
    const requested = await request();
    expect(await conversion(requested.jobId)).toMatchObject({
      phase: "terminal",
      outcome: { kind: "failed", code: "LLM_MONTHLY_LIMIT" },
      owner: { state: "idle" },
      inputReceipt: null,
      sourceMemoryBytes: 0,
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(requested.jobId)),
    ).toMatchObject({ state: "failed", batchId: previous.batchId });
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.llmDispatches.list(requested.jobId),
      ),
    ).toEqual([]);
    expect(generate).not.toHaveBeenCalled();
    await quota(0);
    c = { ...c, llm };
    const accepted = await retryLlmJob(c, token, requested.jobId);
    if (!accepted) throw Error("SYNTHETIC_FIRST_QUOTA_RETRY");
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(accepted.jobId)),
    ).toMatchObject({ batchId: previous.batchId, retryOf: requested.jobId });
    expect((await listImports(c, token)).batches).toHaveLength(1);
    await sweepLlm(c);
    expect((await finished(accepted.jobId))?.outcome.kind).toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", version: 1 });
    expect(generate).toHaveBeenCalledTimes(1);
    await quota(1);
  });
  it("retries failed first generation in the same original parent and applies its saved link intent once", async () => {
    await publicationKeys();
    const previous = await firstImage("ai-off", "link");
    const originalBefore = await original();
    const noticesBefore = await c.unitOfWorkProvider.run((u) =>
      u.imports.listNotices(originalId),
    );
    expect(noticesBefore.some((notice) => notice.code === "LLM_DISABLED")).toBe(
      true,
    );
    generate.mockRejectedValueOnce(
      new LlmOperationError("LLM_RATE_LIMIT", "possible", true),
    );
    const requested = await requestLlmRegeneration(c, token, {
      noteId,
      noteVersion: 0,
      commandId: base.idGenerator.next(),
      expectedEpoch: 1,
      modelId,
      instruction: "synthetic first-image instruction",
      confirmed: true,
    });
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome).toEqual({
      kind: "failed",
      code: "LLM_RATE_LIMIT",
    });
    expect((await note())?.html).toBe("");
    expect(
      await c.unitOfWorkProvider.run((u) => u.imports.listNotices(originalId)),
    ).toEqual(noticesBefore);
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "private", version: 0 });
    await c.unitOfWorkProvider.run(async (u) => {
      const settings = await u.openRouterModels.find(accountId);
      if (!settings) throw Error("SYNTHETIC_FIRST_IMAGE_MODELS");
      expect(
        await u.openRouterModels.replace(
          {
            ...settings,
            image: { kind: "chat-image", modelId: "fixture/new-first-default" },
            version: settings.version + 1,
          },
          settings.version,
        ),
      ).toBe(true);
    });
    const accepted = await retryLlmJob(c, token, requested.jobId);
    if (!accepted) throw Error("SYNTHETIC_FIRST_IMAGE_RETRY");
    expect(await retryLlmJob(c, token, requested.jobId)).toEqual(accepted);
    expect(await conversion(accepted.jobId)).toMatchObject({
      operation: "regenerate",
      retryOf: requested.jobId,
      modelId,
      credentialEpoch: 1,
      instruction: "synthetic first-image instruction",
    });
    expect(
      await c.unitOfWorkProvider.run((u) => u.jobs.find(accepted.jobId)),
    ).toMatchObject({
      batchId: previous.batchId,
      retryOf: requested.jobId,
      state: "queued",
    });
    const pending = (await listImports(c, token)).batches;
    expect(pending).toHaveLength(1);
    expect(pending[0]?.active).toBe(true);
    expect(pending[0]?.jobs.map((job) => job.id)).toEqual([accepted.jobId]);
    await sweepLlm(c);
    expect((await finished(accepted.jobId))?.outcome.kind).toBe("succeeded");
    const done = (await listImports(c, token)).batches;
    expect(done).toHaveLength(1);
    expect(done[0]?.active).toBe(false);
    expect(done[0]?.jobs.map((job) => job.id)).toEqual([accepted.jobId]);
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", version: 1, linkGeneration: 1 });
    expect(await original()).toMatchObject({
      id: originalBefore?.id,
      bytes: originalBefore?.bytes,
      sha256: originalBefore?.sha256,
      storageKey: originalBefore?.storageKey,
    });
    expect((await note())?.html).toContain("Safe result");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].model.modelId).toBe(modelId);
    await quota(2);
  });
  it.each([
    { cause: "edited", errorCode: "LLM_RETRY_BODY_CHANGED" },
    { cause: "original", errorCode: "LLM_SOURCE_CHANGED" },
    { cause: "epoch", errorCode: "LLM_RETRY_NEW_CONNECTION" },
    { cause: "unknown", errorCode: "JOB_NOT_RETRYABLE" },
  ] as const)("refuses first-generation retry after $cause without changing jobs, source, body, sharing or quota", async ({
    cause,
    errorCode,
  }) => {
    await publicationKeys();
    await firstImage("ai-off", "link");
    generate.mockRejectedValueOnce(
      new LlmOperationError("LLM_RATE_LIMIT", "possible", true),
    );
    const requested = await request();
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("failed");
    if (cause === "edited") {
      const current = await note();
      if (!current) throw Error("SYNTHETIC_FIRST_IMAGE_NOTE");
      await saveNote(c, token, {
        id: noteId,
        version: current.version,
        title: current.title,
        html: "<p>human body after first image failure</p>",
      });
    } else if (cause === "epoch") {
      await c.unitOfWorkProvider.run(async (u) => {
        const current = await u.openRouterConnections.find(accountId);
        if (!current) throw Error("SYNTHETIC_FIRST_IMAGE_CONNECTION");
        expect(
          await u.openRouterConnections.replace(
            {
              ...current,
              epoch: current.epoch + 1,
              version: current.version + 1,
            },
            current.version,
          ),
        ).toBe(true);
      });
    } else {
      const provider = c.unitOfWorkProvider;
      c = {
        ...c,
        unitOfWorkProvider: {
          run: <T>(work: (u: HollowUnitOfWorkContext) => Promise<T>) =>
            provider.run(async (u) => {
              if (cause === "original") {
                const find = u.imports.findByNote.bind(u.imports);
                u.imports.findByNote = async (id) => {
                  const source = await find(id);
                  return source && id === noteId
                    ? { ...source, sha256: "b".repeat(64) }
                    : source;
                };
              } else {
                const find = u.llmConversions.find.bind(u.llmConversions);
                u.llmConversions.find = async (id) => {
                  const value = await find(id);
                  return value && id === requested.jobId
                    ? {
                        ...value,
                        owner: {
                          state: "unknown" as const,
                          runtimeId: execution.runtimeId,
                          token: "synthetic-unconfirmed-first-image",
                        },
                      }
                    : value;
                };
              }
              return work(u);
            }),
        },
      };
    }
    const snapshot = async () => ({
      jobs: await base.db.all(sql`select * from conversion_jobs order by id`),
      originals: await base.db.all(sql`select * from originals order by id`),
      conversions: await base.db.all(
        sql`select * from llm_conversions order by job_id`,
      ),
      note: await note(),
      sharing: await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
      identity: await c.unitOfWorkProvider.run((u) =>
        u.publicNotes.find(noteId),
      ),
      notices: await c.unitOfWorkProvider.run((u) =>
        u.imports.listNotices(originalId),
      ),
      revisions: await c.unitOfWorkProvider.run((u) =>
        u.revisions.list(noteId),
      ),
      quota: await llmUsage(c, token),
    });
    const before = await snapshot();
    expect(before.sharing).toMatchObject({ visibility: "private", version: 0 });
    await expect(retryLlmJob(c, token, requested.jobId)).rejects.toMatchObject({
      code: errorCode,
    });
    expect(await snapshot()).toEqual(before);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(execution.active(requested.jobId)).toBe(false);
  });
  it("uses a different current workspace editor's own history while copying the initial link intent", async () => {
    await publicationKeys();
    const ownerId = base.idGenerator.next();
    const ownerToken = "synthetic-initial-image-owner";
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            ownerId,
            "first-owner@fixture.invalid",
            "synthetic",
            now,
          ),
          now,
        ),
      );
      await u.accounts.saveSession({
        accountId: ownerId,
        tokenHash: c.tokens.hash(ownerToken),
        expiresAt: new Date(now.getTime() + 86400000),
      });
    });
    const workspace = await createWorkspace(c, ownerToken, {
      name: "First image workspace",
      description: "",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspace.id, accountId, "viewer"),
    );
    const previous = await firstImage(
      "needs-ai",
      "link",
      workspace.id,
      ownerToken,
    );
    const before = await base.db.all(
      sql`select * from conversion_jobs order by id`,
    );
    await expect(request()).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    expect(
      await base.db.all(sql`select * from conversion_jobs order by id`),
    ).toEqual(before);
    expect(
      (await listImports(c, token, { workspaceId: workspace.id })).batches,
    ).toEqual([]);
    await changeWorkspaceMember(c, ownerToken, {
      workspaceId: workspace.id,
      accountId,
      expectedRole: "viewer",
      role: "editor",
      ownerConfirmed: false,
    });
    const requested = await request();
    const job = await c.unitOfWorkProvider.run((u) =>
      u.jobs.find(requested.jobId),
    );
    if (!job) throw Error("SYNTHETIC_EDITOR_IMAGE_JOB");
    expect(job.accountId).toBe(accountId);
    expect(job.batchId).not.toBe(previous.batchId);
    expect(job.retryOf).toBeNull();
    expect(
      await c.unitOfWorkProvider.run((u) => u.imports.findBatch(job.batchId)),
    ).toMatchObject({
      accountId,
      workspaceId: workspace.id,
      requestedVisibility: "link",
    });
    expect((await original())?.accountId).toBe(ownerId);
    const own = (await listImports(c, token, { workspaceId: workspace.id }))
      .batches;
    expect(own).toHaveLength(1);
    expect(own[0]?.jobs.map((entry) => entry.id)).toEqual([requested.jobId]);
    const uploader = (
      await listImports(c, ownerToken, { workspaceId: workspace.id })
    ).batches;
    expect(uploader).toHaveLength(1);
    expect(uploader[0]?.jobs.map((entry) => entry.id)).toEqual([previous.id]);
    await sweepLlm(c);
    expect((await finished(requested.jobId))?.outcome.kind).toBe("succeeded");
    expect(
      await c.unitOfWorkProvider.run((u) => u.sharing.find(noteId)),
    ).toMatchObject({ visibility: "link", version: 1 });
    await quota(1);
  });
  it("uses settings.image for normal upload and commits a sanitized single-raster response", async () => {
    const id = await upload(true);
    const admitted = await conversion(id);
    expect(
      admitted?.source.format === "image" &&
        admitted.preparationVersion === 3 &&
        admitted.promptVersion === 2 &&
        admitted.operation === "import" &&
        admitted.modelId === modelId,
    ).toBe(true);
    expect(
      (await c.unitOfWorkProvider.run((u) =>
        u.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 90000)),
      )) === null,
    ).toBe(true);
    await sweepLlm(c);
    expect((await finished(id))?.outcome.kind).toBe("succeeded");
    expect(validRaster && inspectedImage).toBe(true);
    expect(generate.mock.calls.length).toBe(1);
    const current = await note();
    expect(
      current?.html.includes("Safe result") &&
        !current.html.includes("<script"),
    ).toBe(true);
    const notices = await c.unitOfWorkProvider.run((u) =>
      u.imports.listNotices(originalId),
    );
    expect(notices.some((item) => item.code === "LLM_IMAGE_NORMALIZED")).toBe(
      true,
    );
    expect((await original())?.state).toBe("ready");
    await quota(1);
  });
  it("regenerates an image and undoes only body while keeping logical consumption", async () => {
    await attach();
    const before = await note();
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(validRaster).toBe(true);
    await undoLlmBody(c, token, job.jobId);
    const undone = await note();
    expect(
      undone?.html === before?.html &&
        undone?.title === before?.title &&
        undone?.display.style === before?.display.style,
    ).toBe(true);
    await quota(1);
    expect(await rejected(undoLlmBody(c, token, job.jobId))).toBe(
      "LLM_UNDO_CHANGED",
    );
  });
  it.each([
    "ai-off",
    "unlinked",
    "unconfigured",
  ] as const)("keeps %s intake out of image generation without false success", async (mode) => {
    if (mode === "unconfigured") {
      if (!c.llm) throw Error("SYNTHETIC_LLM");
      c = { ...c, llm: { ...legacyLlm(c), configured: false } };
    }
    if (mode === "unlinked") {
      const browserToken = c.tokens.generate();
      await ensureAuthenticationBrowser(c, browserToken);
      const person = { browserToken, sessionToken: token };
      await unlinkOpenRouter(c, person, await getOpenRouterSettings(c, person));
    }
    const id = await upload(mode !== "ai-off");
    expect((await conversion(id)) === null).toBe(true);
    const job = await c.unitOfWorkProvider.run((u) =>
      u.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 90000)),
    );
    if (!job) throw Error("SYNTHETIC_JOB");
    await runImportJob(c, job);
    expect((await original())?.state).toBe(
      mode === "ai-off" ? "failed" : "needs_ai",
    );
    expect((await note())?.html === "").toBe(true);
    expect(generate.mock.calls.length).toBe(0);
    await quota(0);
  });
  it("rejects a corrupt original before dispatch while retaining old body and releasing reservation", async () => {
    const corrupt = Buffer.from(image);
    corrupt[29] ^= 1;
    await attach(corrupt);
    const before = await note();
    const job = await request();
    await sweepLlm(c);
    const final = await finished(job.jobId);
    expect(
      final?.outcome.kind === "failed" &&
        final.outcome.code === "LLM_IMAGE_CORRUPT",
    ).toBe(true);
    expect((await note())?.html === before?.html).toBe(true);
    expect(generate.mock.calls.length).toBe(0);
    await quota(0);
  });
  it("keeps quota exhaustion terminal with original available and no mechanical/image dispatch", async () => {
    if (!c.llm) throw Error("SYNTHETIC_LLM");
    c = { ...c, llm: { ...legacyLlm(c), monthlyLimit: 0 } };
    const id = await upload(true);
    const final = await conversion(id);
    expect(
      final?.outcome.kind === "failed" &&
        final.outcome.code === "LLM_MONTHLY_LIMIT",
    ).toBe(true);
    expect((await original())?.state).toBe("failed");
    expect(
      (await c.unitOfWorkProvider.run((u) =>
        u.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 90000)),
      )) === null,
    ).toBe(true);
    await sweepLlm(c);
    expect(generate.mock.calls.length).toBe(0);
    await quota(0);
  });
  it.each([
    false,
    true,
  ])("adopts saved response only with unchanged raster identity; drift=%s never resends", async (drift) => {
    await attach();
    const before = await note();
    const job = await request();
    loseResponseAck();
    await sweepLlm(c);
    await recover(job.jobId);
    if (drift) {
      if (!c.llm) throw Error("SYNTHETIC_LLM");
      const preparer = c.llm.preparer;
      c = {
        ...c,
        llm: {
          ...legacyLlm(c),
          preparer: {
            async prepare(...args) {
              const prepared = await preparer.prepare(...args);
              if (prepared.kind !== "single-raster")
                throw Error("SYNTHETIC_RECIPE");
              return {
                ...prepared,
                inputIdentity: {
                  ...prepared.inputIdentity,
                  sha256: "a".repeat(64),
                },
              };
            },
          },
        },
      };
    }
    await sweepLlm(c);
    const final = await finished(job.jobId);
    expect(final?.outcome.kind).toBe(drift ? "failed" : "succeeded");
    if (drift) {
      expect(
        final?.outcome.kind === "failed" &&
          final.outcome.code === "LLM_SOURCE_CHANGED",
      ).toBe(true);
      expect((await note())?.html === before?.html).toBe(true);
    } else expect((await note())?.html.includes("Safe result")).toBe(true);
    expect(generate.mock.calls.length).toBe(1);
    expect(final?.owner.state).toBe("closed");
    await quota(1);
  });
  it.each([
    "role",
    "cancel",
  ] as const)("fences a delayed image response on %s while keeping ownership until actual settlement", async (reason) => {
    const downgrade = reason === "role" ? await workspaceImage() : null;
    if (!downgrade) await attach();
    const before = await note();
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const normal = generate.getMockImplementation();
    if (!normal) throw Error("SYNTHETIC_GENERATOR");
    generate.mockImplementation(async (...args) => {
      const result = await normal(...args);
      await gate;
      return result;
    });
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(generate.mock.calls.length).toBe(1), {
      timeout: 10000,
    });
    if (downgrade) await downgrade();
    else await cancelLlmRegeneration(c, token, job.jobId);
    await sweepLlm(c);
    expect(execution.active(job.jobId)).toBe(true);
    expect((await conversion(job.jobId))?.owner.state).toBe("active");
    release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect((await note())?.html === before?.html).toBe(true);
    if (downgrade) expect(await rejected(request())).toBe("NOTE_NOT_FOUND");
    expect(generate.mock.calls.length).toBe(1);
    await quota(1);
  });
});

import { pdfFixtureServices } from "./llmPdfFixtureServices";

function legacyLlm(c: HollowContainer) {
  if (c.llm?.inputMode !== "legacy-local") throw new Error("TEST_LLM_MODE");
  return c.llm;
}

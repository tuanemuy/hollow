import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
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
import { ensureAuthenticationBrowser } from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { runImportJob } from "@repo/core/application/import/processJob";
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
import { requestLlmRegeneration } from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { LlmDocumentFormat } from "@repo/core/domain/llm/entity";
import { createNote, type NoteOwner } from "@repo/core/domain/note/entity";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  documentManifestHash,
  documentSegmentHash,
} from "../../node/llm/documentIdentity.mjs";
import { createTestContainer, type TestContainer } from "./helpers";
import {
  documentDocx,
  documentPdf,
  documentPptx,
  documentXlsx,
  paragraph,
} from "./llmDocumentFixtures";

describe("document recipe through owned preparation, durable response and body commit", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let execution: NodeLlmExecution;
  let root: string;
  let accountId: string;
  let noteId: string;
  let originalId: string;
  let generate: ReturnType<typeof vi.fn<LlmGenerator["generate"]>>;
  let dbCreated = false;
  let storageCreated = false;
  let executionCreated = false;
  let release = () => {};
  const token = "synthetic-document-session";
  function textInput(input: Parameters<LlmGenerator["generate"]>[0]): string {
    if (input.kind !== "chat-text") throw Error("SYNTHETIC_KIND");
    return input.input.html;
  }
  const now = new Date("2026-09-28T00:00:00Z");
  async function expectNoPreviousFixture() {
    const names = await readdir(tmpdir());
    expect(
      names.filter(
        (name) =>
          name.startsWith("libsql-test-") ||
          name.startsWith("hollow-llm-document-"),
      ),
    ).toHaveLength(0);
  }
  beforeEach(async () => {
    dbCreated = false;
    storageCreated = false;
    executionCreated = false;
    await expectNoPreviousFixture();
    base = await createTestContainer();
    dbCreated = true;
    root = await mkdtemp(path.join(tmpdir(), "hollow-llm-document-"));
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
    generate = vi.fn(async (input) => ({
      content: textInput(input),
      finish: "stop" as const,
      inputTokens: 1,
      outputTokens: 2,
    }));
    c = {
      ...initial,
      clock,
      importing: {
        storage,
        extractor: new IsolatedDocumentExtractor(),
        mediaValidator: { validate: async () => {} },
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
          protect: (v) => v,
          reveal: (v) => v,
        },
        execution: {
          run: (fn) => fn(new AbortController().signal),
          stop: async () => {},
        },
      },
      llm: {
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
    originalId = base.idGenerator.next();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            accountId,
            "document@fixture.invalid",
            "synthetic",
            now,
          ),
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
    });
  });
  afterEach(async () => {
    release();
    release = () => {};
    try {
      if (executionCreated) await execution.stop();
      if (dbCreated) {
        expect(await base.db.all(sql`pragma foreign_key_check`)).toHaveLength(
          0,
        );
        expect(
          await base.db.all(sql`select 1 from object_writes where active=1`),
        ).toHaveLength(0);
      }
    } finally {
      try {
        if (dbCreated) base.close();
      } finally {
        if (storageCreated) await rm(root, { recursive: true, force: true });
        await expectNoPreviousFixture();
      }
    }
  });
  async function attach(
    format: LlmDocumentFormat,
    bytes: Buffer,
    owner: NoteOwner = { kind: "personal", accountId },
  ) {
    const jobId = base.idGenerator.next();
    const batchId = base.idGenerator.next();
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
        name: `fixture.${format}`,
        bytes: bytes.length,
        storageKey: "original",
        sha256: createHash("sha256").update(bytes).digest("hex"),
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
    });
  }
  const request = () =>
    requestLlmRegeneration(c, token, {
      noteId,
      noteVersion: 0,
      commandId: base.idGenerator.next(),
      expectedEpoch: 1,
      modelId: "fixture/text",
      instruction: "",
      confirmed: true,
    });
  const conversion = (jobId: string) =>
    c.unitOfWorkProvider.run((u) => u.llmConversions.find(jobId));
  async function finished(jobId: string) {
    await vi.waitFor(
      async () => expect((await conversion(jobId))?.phase).toBe("terminal"),
      { timeout: 10000 },
    );
    await vi.waitFor(() => expect(execution.active(jobId)).toBe(false));
    return conversion(jobId);
  }
  const note = () => c.unitOfWorkProvider.run((u) => u.notes.findById(noteId));
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
  async function recover(jobId: string) {
    await vi.waitFor(
      async () =>
        expect((await conversion(jobId))?.owner.state).toBe("unknown"),
      { timeout: 10000 },
    );
    await expect(execution.stop()).rejects.toMatchObject({
      code: "LLM_OWNERSHIP_UNKNOWN",
      closed: false,
    });
    let predecessor = execution.runtimeId;
    const ownership = {
      runtimeId: base.idGenerator.next(),
      predecessors: () => (predecessor ? [predecessor] : []),
      assertReady: () => {
        if (predecessor) throw Error("SYNTHETIC_PENDING_ACK");
      },
      acknowledge: async () => {
        predecessor = "";
      },
    };
    execution = new NodeLlmExecution(ownership, c.clock);
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    c = { ...c, llm: { ...c.llm, execution, ownership } };
    await recoverLlm(c);
  }
  const documentBytes = async (format: LlmDocumentFormat) =>
    format === "docx"
      ? documentDocx()
      : format === "xlsx"
        ? documentXlsx()
        : format === "pptx"
          ? documentPptx()
          : documentPdf();
  async function upload(name: string, bytes: Uint8Array, useAi: boolean) {
    const batch = await beginUpload(c, token, {
      files: [{ name, bytes: bytes.length }],
      useAi,
    });
    const file = batch.files[0];
    if (!file) throw Error("SYNTHETIC_MISSING_FILE");
    const accepted = await acceptUpload(
      c,
      token,
      file.id,
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    );
    if (!accepted.noteId || !accepted.jobId)
      throw Error("SYNTHETIC_NOT_ACCEPTED");
    noteId = accepted.noteId;
    return accepted.jobId;
  }
  const claimMechanical = () =>
    c.unitOfWorkProvider.run((u) =>
      u.jobs.claim(now, c.tokens.generate(), new Date(now.getTime() + 90000)),
    );
  async function workspaceDocument() {
    const ownerId = base.idGenerator.next();
    const ownerToken = "synthetic-document-owner";
    await c.unitOfWorkProvider.run(async (u) => {
      await u.accounts.save(
        verifyAccount(
          createAccount(
            ownerId,
            "document-owner@fixture.invalid",
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
      name: "Document fixture",
      description: "",
    });
    await c.unitOfWorkProvider.run((u) =>
      u.workspaces.membership(workspace.id, accountId, "editor"),
    );
    await attach("docx", documentDocx(), {
      kind: "workspace",
      workspaceId: workspace.id,
    });
    return () =>
      changeWorkspaceMember(c, ownerToken, {
        workspaceId: workspace.id,
        accountId,
        role: "viewer",
        expectedRole: "editor",
        ownerConfirmed: false,
      });
  }
  it.each([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ] as const)("admits a normal AI %s upload to recipe2 and excludes the mechanical claimant", async (format) => {
    const jobId = await upload(
      `fixture.${format}`,
      await documentBytes(format),
      true,
    );
    expect(await conversion(jobId)).toMatchObject({
      preparationVersion: 2,
      promptVersion: 1,
      operation: "import",
      source: { format },
    });
    expect(await claimMechanical()).toBeNull();
    await sweepLlm(c);
    expect((await finished(jobId))?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("First");
    expect((await note())?.html).toContain("Second");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
      remaining: 29,
    });
  });
  it.each([
    "html",
    "md",
  ] as const)("keeps normal %s imports mechanical even with AI selected", async (extension) => {
    const jobId = await upload(
      `fixture.${extension}`,
      Buffer.from(
        extension === "html"
          ? "<h1>Mechanical</h1><p>Body</p>"
          : "# Mechanical\n\nBody",
      ),
      true,
    );
    expect(await conversion(jobId)).toBeNull();
    const job = await claimMechanical();
    if (!job) throw Error("SYNTHETIC_MISSING_JOB");
    expect(job.id).toBe(jobId);
    await runImportJob(c, job);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.jobs.find(jobId)))?.state,
    ).toBe("succeeded");
    expect((await note())?.html).toContain("Mechanical");
    expect(generate).not.toHaveBeenCalled();
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 0,
      reserved: 0,
      remaining: 30,
    });
  });
  it.each([
    "ai-off",
    "unlinked",
    "unconfigured",
  ] as const)("keeps %s document intake on the existing mechanical path", async (mode) => {
    if (mode === "unconfigured") {
      if (!c.llm) throw Error("SYNTHETIC_MISSING_LLM");
      c = { ...c, llm: { ...c.llm, configured: false } };
    }
    if (mode === "unlinked") {
      const browserToken = c.tokens.generate();
      await ensureAuthenticationBrowser(c, browserToken);
      const person = { browserToken, sessionToken: token };
      await unlinkOpenRouter(c, person, await getOpenRouterSettings(c, person));
    }
    const jobId = await upload(
      "fixture.docx",
      documentDocx(),
      mode !== "ai-off",
    );
    expect(await conversion(jobId)).toBeNull();
    const job = await claimMechanical();
    if (!job) throw Error("SYNTHETIC_MISSING_JOB");
    await runImportJob(c, job);
    expect(
      (await c.unitOfWorkProvider.run((u) => u.jobs.find(jobId)))?.state,
    ).toBe("succeeded");
    expect((await note())?.html).toContain("First");
    expect(generate).not.toHaveBeenCalled();
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 0,
      reserved: 0,
    });
  });
  it("uses current workspace permission for document regeneration and body undo", async () => {
    const downgrade = await workspaceDocument();
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    const body = (await note())?.html;
    await downgrade();
    await expect(request()).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await expect(undoLlmBody(c, token, job.jobId)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
    expect((await note())?.html).toBe(body);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
  it("fences a document response after role loss while retaining owner until actual settlement", async () => {
    const downgrade = await workspaceDocument();
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    generate.mockImplementation(async () => {
      await gate;
      return {
        content: "<p>Late</p>",
        finish: "stop",
        inputTokens: 1,
        outputTokens: 1,
      };
    });
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1), {
      timeout: 10000,
    });
    await downgrade();
    await sweepLlm(c);
    expect(execution.active(job.jobId)).toBe(true);
    expect((await conversion(job.jobId))?.owner.state).toBe("active");
    release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect((await note())?.html).toBe("<p>Original body</p>");
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
  it.each([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ] as const)("prepares all %s text, commits once, then undoes only body with quota retained", async (format) => {
    const bytes =
      format === "docx"
        ? documentDocx()
        : format === "xlsx"
          ? await documentXlsx()
          : format === "pptx"
            ? documentPptx()
            : documentPdf();
    await attach(format, bytes);
    const job = await request();
    await sweepLlm(c);
    const value = await finished(job.jobId);
    expect(value?.preparationVersion).toBe(2);
    expect(value?.promptVersion).toBe(1);
    expect(value?.outcome.kind).toBe("succeeded");
    expect((await note())?.html).toContain("First");
    expect((await note())?.html).toContain("Second");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
      remaining: 29,
      warning: false,
    });
    await undoLlmBody(c, token, job.jobId);
    expect(await note()).toMatchObject({
      html: "<p>Original body</p>",
      title: "Preserved title",
    });
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    await expect(undoLlmBody(c, token, job.jobId)).rejects.toMatchObject({
      code: "LLM_UNDO_CHANGED",
    });
  });
  it("projects complete Office text plus uninterpreted media as success with partial original coverage", async () => {
    await attach("docx", documentDocx(undefined, true));
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    const original = await c.unitOfWorkProvider.run((u) =>
      u.imports.findOriginal(originalId),
    );
    expect(original?.coverage).toBe("partial");
    expect(
      await c.unitOfWorkProvider.run((u) => u.imports.listNotices(originalId)),
    ).toHaveLength(1);
    expect((await note())?.html).toContain("First");
  });
  it.each([
    "visual",
    "order",
    "table",
  ] as const)("rejects %s before dispatch, retains original body and returns only unsent reservation", async (kind) => {
    await attach(
      kind === "table" ? "docx" : "pdf",
      kind === "table"
        ? documentDocx(
            `<w:tbl><w:tr><w:tc>${paragraph("x".repeat(65536))}</w:tc></w:tr></w:tbl>`,
          )
        : documentPdf([
            kind === "visual"
              ? "0 0 10 10 re f"
              : "BT /F1 12 Tf 30 340 Td (Left) Tj 170 0 Td (Right) Tj ET",
          ]),
    );
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome).toEqual({
      kind: "failed",
      code:
        kind === "table"
          ? "LLM_RESOURCE_LIMIT"
          : kind === "visual"
            ? "LLM_PDF_VISUAL_REQUIRED"
            : "LLM_PDF_ORDER_UNPROVEN",
    });
    expect(generate).not.toHaveBeenCalled();
    expect(await note()).toMatchObject({
      html: "<p>Original body</p>",
      version: 0,
    });
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 0,
      reserved: 0,
    });
    expect(
      (
        await c.unitOfWorkProvider.run((u) =>
          u.imports.findOriginal(originalId),
        )
      )?.state,
    ).toBe("ready");
  });
  it("keeps one logical consumption after an earlier segment dispatch and later not-sent failure", async () => {
    await attach(
      "docx",
      documentDocx(paragraph("a".repeat(40000)) + paragraph("b".repeat(30000))),
    );
    generate.mockImplementationOnce(async (input) => ({
      content: textInput(input),
      finish: "stop",
      inputTokens: 1,
      outputTokens: 1,
    }));
    generate.mockRejectedValueOnce(
      new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true),
    );
    const job = await request();
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("failed");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
    expect((await note())?.version).toBe(0);
  });
  it("re-prepares recipe2 and adopts only matching durable all-response without a second send", async () => {
    await attach("docx", documentDocx());
    const job = await request();
    loseResponseAck();
    await sweepLlm(c);
    await recover(job.jobId);
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("succeeded");
    expect(generate).toHaveBeenCalledTimes(1);
    expect((await note())?.html).toContain("Second");
  });
  it("rejects re-preparation identity drift without another send or replacing old body", async () => {
    await attach("docx", documentDocx());
    const job = await request();
    loseResponseAck();
    await sweepLlm(c);
    await recover(job.jobId);
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    const preparer = c.llm.preparer;
    c = {
      ...c,
      llm: {
        ...c.llm,
        preparer: {
          async prepare(...args) {
            const prepared = await preparer.prepare(...args);
            if (prepared.kind !== "text-blocks") throw Error("SYNTHETIC_KIND");
            return {
              ...prepared,
              segments: prepared.segments.map((segment) => ({
                ...segment,
                identity: { ...segment.identity, sha256: "a".repeat(64) },
              })),
            };
          },
        },
      },
    };
    await sweepLlm(c);
    expect((await finished(job.jobId))?.outcome.kind).toBe("failed");
    expect(generate).toHaveBeenCalledTimes(1);
    expect((await note())?.version).toBe(0);
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
  it.each([
    false,
    true,
  ])("resumes durable PDF response with corrupt=%s without a second send", async (corrupt) => {
    const contents = [
      "BT /F1 12 Tf 30 340 Td (First) Tj ET",
      "BT /F1 12 Tf 30 340 Td (Second) Tj ET",
      "",
    ];
    const normal = documentPdf(contents);
    await attach("pdf", corrupt ? documentPdf(contents, 2) : normal);
    const before = await note();
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    const preparer = c.llm.preparer;
    if (corrupt)
      c = {
        ...c,
        llm: {
          ...c.llm,
          preparer: {
            async prepare(input, signal) {
              if (input.preparationVersion !== 2)
                throw Error("SYNTHETIC_WRONG_RECIPE");
              const prepared = await preparer.prepare(
                {
                  ...input,
                  bytes: normal,
                  source: {
                    ...input.source,
                    bytes: normal.length,
                    sha256: createHash("sha256").update(normal).digest("hex"),
                  },
                },
                signal,
              );
              if (prepared.preparationVersion !== 2)
                throw Error("SYNTHETIC_WRONG_RECIPE");
              const sha256 = documentManifestHash(
                input.source,
                prepared.coverage,
                prepared.notices,
                prepared.segments,
              );
              return {
                ...prepared,
                identity: { ...prepared.identity, sha256 },
                segments: prepared.segments.map((segment) => ({
                  ...segment,
                  identity: {
                    ...segment.identity,
                    sha256: documentSegmentHash(
                      sha256,
                      segment.identity.ordinal,
                      segment.firstBlock,
                      segment.blockCount,
                      segment.html,
                    ),
                  },
                })),
              };
            },
          },
        },
      };
    const job = await request();
    loseResponseAck();
    await sweepLlm(c);
    await recover(job.jobId);
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    c = { ...c, llm: { ...c.llm, preparer } };
    await sweepLlm(c);
    const final = await finished(job.jobId);
    expect(final?.outcome.kind === (corrupt ? "failed" : "succeeded")).toBe(
      true,
    );
    if (corrupt) {
      expect(
        final?.outcome.kind === "failed" &&
          final.outcome.code === "LLM_DOCUMENT_CORRUPT",
      ).toBe(true);
      const current = await note();
      expect(
        current?.version === before?.version && current?.html === before?.html,
      ).toBe(true);
    } else expect((await note())?.html.includes("Second")).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(final?.owner.state).toBe("closed");
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
  it.each([
    false,
    true,
  ])("resumes durable PPTX response with affected=%s without a second send", async (affected) => {
    await attach(
      "pptx",
      affected
        ? documentPptx(
            "<a:p><a:r><a:t>First</a:t></a:r><a:br/><a:r><a:t>Second</a:t></a:r></a:p>",
          )
        : documentPptx(),
    );
    const before = await note();
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    const preparer = c.llm.preparer;
    if (affected)
      c = {
        ...c,
        llm: {
          ...c.llm,
          preparer: {
            async prepare(input, signal) {
              const prepared = await preparer.prepare(input, signal);
              if (
                input.preparationVersion !== 2 ||
                prepared.preparationVersion !== 2
              )
                throw Error("SYNTHETIC_WRONG_RECIPE");
              const segments = prepared.segments.map((segment) => ({
                ...segment,
                html: segment.html.replace("<br>", ""),
              }));
              const sha256 = documentManifestHash(
                input.source,
                prepared.coverage,
                prepared.notices,
                segments,
              );
              return {
                ...prepared,
                identity: { ...prepared.identity, sha256 },
                segments: segments.map((segment) => ({
                  ...segment,
                  identity: {
                    ...segment.identity,
                    sha256: documentSegmentHash(
                      sha256,
                      segment.identity.ordinal,
                      segment.firstBlock,
                      segment.blockCount,
                      segment.html,
                    ),
                  },
                })),
              };
            },
          },
        },
      };
    const job = await request();
    loseResponseAck();
    await sweepLlm(c);
    await recover(job.jobId);
    if (!c.llm) throw Error("SYNTHETIC_MISSING");
    c = { ...c, llm: { ...c.llm, preparer } };
    await sweepLlm(c);
    const final = await finished(job.jobId);
    expect(final?.outcome.kind).toBe(affected ? "failed" : "succeeded");
    if (affected) {
      expect(
        final?.outcome.kind === "failed" &&
          final.outcome.code === "LLM_SOURCE_CHANGED",
      ).toBe(true);
      const current = await note();
      expect(
        current?.version === before?.version && current?.html === before?.html,
      ).toBe(true);
    } else expect((await note())?.html.includes("Second")).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(final?.owner.state).toBe("closed");
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
  it("cancels an active document without releasing owner until delayed generator really settles", async () => {
    await attach("docx", documentDocx());
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    generate.mockImplementation(async () => {
      await gate;
      return {
        content: "<p>Late</p>",
        finish: "stop",
        inputTokens: 1,
        outputTokens: 1,
      };
    });
    const job = await request();
    await sweepLlm(c);
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1), {
      timeout: 10000,
    });
    await cancelLlmRegeneration(c, token, job.jobId);
    await sweepLlm(c);
    expect(execution.active(job.jobId)).toBe(true);
    expect((await conversion(job.jobId))?.owner.state).toBe("active");
    release();
    expect((await finished(job.jobId))?.outcome.kind).toBe("cancelled");
    expect((await note())?.html).toBe("<p>Original body</p>");
    expect(await llmUsage(c, token)).toMatchObject({
      consumed: 1,
      reserved: 0,
    });
  });
});

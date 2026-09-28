import type { BatchAcceptInput } from "@repo/core/application/batch/ports";
import {
  acceptBatch,
  batchConfirmation,
  getBatch,
  previewBatch,
} from "@repo/core/application/batch/usecases";
import {
  claimBatchAttempt,
  processBatchAttempt,
} from "@repo/core/application/batch/worker";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  beginPdfPreview,
  cancelPdfPreview,
  getPdfPreview,
  sweepPdfPreviews,
} from "@repo/core/application/llm/pdfPreview";
import {
  type LlmGenerateInput,
  LlmOperationError,
} from "@repo/core/application/llm/ports";
import { getLlmNote } from "@repo/core/application/llm/read";
import {
  admitLlm,
  requestLlmRegeneration,
} from "@repo/core/application/llm/request";
import { recoverLlm, sweepLlm } from "@repo/core/application/llm/worker";
import type { PdfChoice } from "@repo/core/domain/llm/pdfPreview";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pdfNow, pdfPersistenceFixture } from "./llmPdfPersistenceFixtures";

describe("PDF application admission, preview confirmation and dispatch", () => {
  let f: Awaited<ReturnType<typeof pdfPersistenceFixture>>;
  let c: HollowContainer;
  let now: Date;
  let tasks: Promise<void>[];
  let sends: LlmGenerateInput[];
  let classification:
    | "strict"
    | "pages"
    | "corrupt"
    | "unknown"
    | "unavailable";
  let redrawFault: number | null;
  let prepares: number;
  let predecessors: string[];
  let preparedDrift: boolean;
  const token = "pdf-application-fixture";
  const unexpected = async (): Promise<never> => {
    throw Error("UNEXPECTED_FIXTURE_OPERATION");
  };
  beforeEach(async (context) => {
    context.task.meta.fixturePid = process.pid;
    f = await pdfPersistenceFixture();
    now = pdfNow;
    tasks = [];
    sends = [];
    classification = "pages";
    redrawFault = null;
    prepares = 0;
    predecessors = [];
    preparedDrift = false;
    const initial = createHollowContainer(f.db, "http://localhost:3100", {
      send: unexpected,
    });
    const storage = {
      put: unexpected,
      putBounded: unexpected,
      read: unexpected,
      stat: unexpected,
      stream: unexpected,
      remove: unexpected,
      withOwner: async <T>(_owner: unknown, operation: () => Promise<T>) =>
        operation(),
    };
    c = {
      ...initial,
      idGenerator: {
        next: f.id,
        validate: (id) => /^pdf-fixture-\d+$/.test(id),
      },
      clock: { now: () => now },
      openRouter: {
        authorization: {
          authorization: unexpected,
          exchange: unexpected,
          inspectCredential: unexpected,
        },
        catalog: { list: unexpected, fallback: () => [] },
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
        configured: true,
        monthlyLimit: 30,
        wake: () => {},
        storage,
        source: { read: async () => new Uint8Array(5) },
        pdfClassifier: {
          classify: async (input) => {
            if (classification === "unknown")
              throw new LlmOperationError(
                "LLM_OWNERSHIP_UNKNOWN",
                "not-sent",
                false,
              );
            if (classification === "unavailable")
              throw new LlmOperationError("LLM_UNAVAILABLE", "not-sent", true);
            if (classification === "corrupt")
              throw new LlmOperationError(
                "LLM_DOCUMENT_CORRUPT",
                "not-sent",
                true,
              );
            return classification === "strict" ? f.strict() : f.pages(input);
          },
        },
        pdfPages: {
          prepare: async (input) => f.pages(input).manifest,
          redraw: async (input) => {
            if (input.page.ordinal === redrawFault)
              throw new LlmOperationError(
                "LLM_DOCUMENT_CORRUPT",
                "not-sent",
                true,
              );
            return {
              mimeType: "image/png",
              bytes: new Uint8Array(126),
              width: 20,
              height: 20,
            };
          },
        },
        preparer: {
          prepare: async (input) => {
            prepares++;
            if (input.preparationVersion === 4)
              return {
                kind: "pdf-pages",
                preparationVersion: 4,
                manifest: preparedDrift
                  ? { ...input.manifest, sha256: "9".repeat(64) }
                  : input.manifest,
              };
            if (input.preparationVersion !== 2) throw Error("FIXTURE_RECIPE");
            return {
              kind: "text-blocks",
              preparationVersion: 2,
              identity: {
                kind: "prepared-document",
                preparationVersion: 2,
                sha256: f.strict().preparedDocumentHash,
              },
              coverage: {
                kind: "pdf-text",
                pages: [
                  {
                    ordinal: 0,
                    class: "text-covered",
                    firstBlock: 0,
                    blockCount: 1,
                  },
                  {
                    ordinal: 1,
                    class: "proven-blank",
                    firstBlock: 1,
                    blockCount: 0,
                  },
                ],
              },
              blocks: 1,
              media: [],
              notices: [],
              segments: [
                {
                  identity: {
                    kind: "prepared-segment",
                    sha256: "c".repeat(64),
                    ordinal: 0,
                  },
                  html: "<p>fixture</p>",
                  firstBlock: 0,
                  blockCount: 1,
                },
              ],
            };
          },
        },
        profiles: {
          inspect: async (input) => {
            const common = {
              modelId: input.modelId,
              contextTokens: 100000,
              outputTokens: 8192,
              supportsMaxTokens: true as const,
              source: "live" as const,
              checkedAt: now,
            };
            return input.kind === "chat-text"
              ? { ...common, kind: "chat-text" }
              : {
                  ...common,
                  kind: "chat-image",
                  budget: {
                    kind: "resource-only",
                    imageTokens: null,
                    contextGuaranteed: false,
                  },
                };
          },
        },
        generator: {
          generate: async (input) => {
            sends.push(input);
            return {
              content: "<p>fixture</p>",
              finish: "stop",
              inputTokens: 1,
              outputTokens: 1,
            };
          },
        },
        result: { restore: (contents) => contents.join("") },
        ownership: {
          runtimeId: "fixture-runtime",
          predecessors: () => predecessors,
          assertReady: () => {},
          acknowledge: async () => {
            predecessors = [];
          },
        },
        execution: {
          runtimeId: "fixture-runtime",
          start: (_job, _account, _deadline, work) => {
            tasks.push(work(new AbortController().signal));
            return true;
          },
          active: () => false,
          cancel: () => {},
          stop: async () => {
            await Promise.all(tasks);
          },
        },
      },
    };
    await f.uow.run((u) =>
      u.accounts.saveSession({
        accountId: f.accountId,
        tokenHash: c.tokens.hash(token),
        expiresAt: new Date(now.getTime() + 86400000),
      }),
    );
  });
  afterEach(async (context) => {
    try {
      await c?.llm?.execution.stop();
    } finally {
      await f?.close(context.task.result?.state !== "fail");
      context.task.meta.fixtureClosed = true;
    }
  });
  async function reject(operation: () => Promise<unknown>, code: string) {
    let matched = false;
    try {
      await operation();
    } catch (error) {
      matched =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code;
    }
    expect(matched).toBe(true);
  }
  async function begin(existing?: Awaited<ReturnType<typeof f.source>>) {
    const source = existing ?? (await f.source());
    const input = {
      noteId: source.noteId,
      noteVersion: source.noteVersion,
      expectedEpoch: 1,
      commandId: f.id(),
    };
    return { source, input, receipt: await beginPdfPreview(c, token, input) };
  }
  async function ready(
    value: Awaited<ReturnType<typeof begin>>,
    choice: PdfChoice = f.strict(),
  ) {
    const claimed = await f.uow.run((u) =>
      u.llmPdfPreviews.claim(now, "fixture-runtime", f.id()),
    );
    if (claimed?.state !== "running") throw Error("FIXTURE_PREVIEW_CLAIM");
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.replace(
          {
            ...claimed,
            state: "ready",
            result: choice,
            owner: { ...claimed.owner, state: "closed" },
            version: claimed.version + 1,
          },
          claimed.version,
        ),
      ),
    ).toBe(true);
    return {
      noteId: value.source.noteId,
      noteVersion: value.source.noteVersion,
      expectedEpoch: 1,
      commandId: f.id(),
      modelId: "fixture/chosen",
      instruction: "",
      confirmed: true as const,
      previewId: value.receipt.previewId,
    };
  }
  async function usage() {
    return f.uow.run((u) => u.llmQuota.usage(f.accountId, "2026-09"));
  }
  async function batchInput(noteId: string): Promise<BatchAcceptInput> {
    const source = { kind: "personal" as const, accountId: f.accountId };
    const operation = { kind: "trash" as const, cancelProcessing: true };
    const value = await previewBatch(c, token, {
      ids: [noteId],
      source,
      operation,
    });
    return {
      requestId: f.id(),
      source,
      operation,
      items: value.items.map(batchConfirmation),
    };
  }
  async function batchRun(id: string) {
    const claimed = await claimBatchAttempt(c, 60000);
    if (!claimed) throw Error("FIXTURE_BATCH_CLAIM");
    await processBatchAttempt(c, claimed);
    return (await getBatch(c, token, { id })).items[0];
  }
  it("batch preview identity rejects a later preview at acceptance", async () => {
    const source = await f.source();
    const stale = await batchInput(source.noteId);
    const preview = await begin(source);
    await reject(() => acceptBatch(c, token, stale), "BATCH_CHANGED");
    const value = await f.uow.run((u) =>
      u.llmPdfPreviews.find(preview.receipt.previewId),
    );
    expect(value?.cancelGeneration === 0).toBe(true);
  });
  it("batch preview identity rejects a later preview at execution", async () => {
    const source = await f.source();
    const accepted = await acceptBatch(
      c,
      token,
      await batchInput(source.noteId),
    );
    const preview = await begin(source);
    const result = await batchRun(accepted.id);
    expect(result?.state === "failed").toBe(true);
    const value = await f.uow.run((u) =>
      u.llmPdfPreviews.find(preview.receipt.previewId),
    );
    expect(value?.cancelGeneration === 0).toBe(true);
    expect(
      (await f.uow.run((u) => u.notes.findById(source.noteId)))?.lifecycle
        .kind === "active",
    ).toBe(true);
  });
  it("batch preview identity rejects replacement after acceptance", async () => {
    const first = await begin();
    await ready(first);
    const accepted = await acceptBatch(
      c,
      token,
      await batchInput(first.source.noteId),
    );
    await cancelPdfPreview(c, token, first.receipt.previewId);
    const second = await begin(first.source);
    const result = await batchRun(accepted.id);
    expect(result?.state === "failed").toBe(true);
    expect(
      (await f.uow.run((u) => u.llmPdfPreviews.find(second.receipt.previewId)))
        ?.cancelGeneration === 0,
    ).toBe(true);
  });
  it("batch preview identity keeps same-id progress valid", async () => {
    const preview = await begin();
    const accepted = await acceptBatch(
      c,
      token,
      await batchInput(preview.source.noteId),
    );
    await ready(preview);
    const result = await batchRun(accepted.id);
    expect(result?.state === "succeeded").toBe(true);
    const value = await f.uow.run((u) =>
      u.llmPdfPreviews.find(preview.receipt.previewId),
    );
    expect(value?.state === "cancelled" && value.owner.state === "closed").toBe(
      true,
    );
  });
  it("batch preview identity does not release an unknown owner", async () => {
    const preview = await begin();
    const accepted = await acceptBatch(
      c,
      token,
      await batchInput(preview.source.noteId),
    );
    const claimed = await f.uow.run((u) =>
      u.llmPdfPreviews.claim(now, "fixture-runtime", f.id()),
    );
    if (claimed?.state !== "running") throw Error("FIXTURE_PREVIEW_CLAIM");
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.replace(
          {
            ...claimed,
            state: "unknown",
            owner: { ...claimed.owner, state: "unknown" },
            version: claimed.version + 1,
          },
          claimed.version,
        ),
      ),
    ).toBe(true);
    const result = await batchRun(accepted.id);
    expect(result?.state === "succeeded").toBe(true);
    const value = await f.uow.run((u) =>
      u.llmPdfPreviews.find(preview.receipt.previewId),
    );
    expect(
      value?.state === "unknown" &&
        value.owner.state === "unknown" &&
        value.cancelGeneration > 0,
    ).toBe(true);
  });
  async function run() {
    await sweepLlm(c);
    await Promise.all(tasks);
  }
  async function storedResponses(count = 3, notSent = false) {
    const pending = await f.pending();
    const claimed = await f.claim();
    const job = await f.seal(claimed, f.pages(pending));
    if (!job || job.preparationVersion !== 4 || job.owner.state !== "active")
      throw Error("FIXTURE_FIXED");
    const owner = job.owner;
    await f.uow.run(async (u) => {
      expect(
        await u.llmConversions.replace(
          { ...job, phase: "dispatching", version: job.version + 1 },
          job.version,
        ),
      ).toBe(true);
      for (let ordinal = 0; ordinal < count; ordinal++) {
        const page = job.manifest.pages[ordinal];
        if (!page) throw Error("FIXTURE_PAGE");
        const id = f.id();
        await u.llmDispatches.prepare({
          id,
          jobId: job.jobId,
          ordinal,
          input: {
            kind: "prepared-pdf-page",
            ordinal,
            sha256: c.tokens.hash(
              JSON.stringify([
                "pdf-page-v4",
                job.manifest.sha256,
                ordinal,
                page.sha256,
              ]),
            ),
          },
          runtimeId: owner.runtimeId,
          ownerToken: owner.token,
          state: "prepared",
          intentAt: null,
          response: null,
        });
        expect(await u.llmDispatches.intent(id, owner.token, now)).toBe(true);
        if (notSent) await u.llmDispatches.fail(id, owner.token, "not-sent");
        else
          expect(
            await u.llmDispatches.response(id, owner.token, {
              content: "<p>saved</p>",
              finish: "stop",
              inputTokens: 1,
              outputTokens: 1,
            }),
          ).toBe(true);
      }
      expect(
        await u.llmConversions.replace(
          { ...job, phase: "response-ready", version: job.version + 2 },
          job.version + 1,
        ),
      ).toBe(true);
    });
    predecessors = [owner.runtimeId];
    return job;
  }

  it("creates one preview receipt without body lock, quota or classification IO", async () => {
    const value = await begin();
    const again = await beginPdfPreview(c, token, value.input);
    expect(again.previewId === value.receipt.previewId).toBe(true);
    expect(
      (await f.uow.run((u) =>
        u.llmConversions.activeForNote(value.source.noteId),
      )) === null,
    ).toBe(true);
    expect((await usage()) === null).toBe(true);
    expect(sends.length === 0 && tasks.length === 0).toBe(true);
    await reject(
      () => beginPdfPreview(c, token, { ...value.input, noteVersion: 2 }),
      "LLM_COMMAND_REUSED",
    );
  });
  it("returns only own receipt and status is a pure read", async () => {
    const value = await begin();
    const before = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    const status = await getPdfPreview(c, token, {
      noteId: value.source.noteId,
      commandId: value.input.commandId,
    });
    const after = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      status?.state === "queued" &&
        status.purpose === null &&
        before?.version === after?.version,
    ).toBe(true);
    expect(
      (await getPdfPreview(c, token, {
        noteId: value.source.noteId,
        commandId: f.id(),
      })) === null,
    ).toBe(true);
  });
  it("confirms a strict receipt once with selected model, reservation and fixed generation", async () => {
    const value = await begin();
    const input = await ready(value);
    const result = await requestLlmRegeneration(c, token, input);
    const again = await requestLlmRegeneration(c, token, input);
    const job = await f.uow.run((u) => u.llmConversions.find(result.jobId));
    expect(
      again.jobId === result.jobId &&
        job?.selection === "fixed" &&
        job.preparationVersion === 2 &&
        job.modelId === input.modelId &&
        job.sourceOwnershipGeneration === 1,
    ).toBe(true);
    expect((await usage())?.reserved === 1).toBe(true);
    expect(
      (await f.uow.run((u) => u.llmPdfPreviews.find(value.receipt.previewId)))
        ?.state === "consumed",
    ).toBe(true);
  });
  it("rejects stale body and expired preview before reservation", async () => {
    const value = await begin();
    const input = await ready(value);
    await reject(
      () =>
        requestLlmRegeneration(c, token, {
          ...input,
          noteVersion: input.noteVersion + 1,
        }),
      "NOTE_CONFLICT",
    );
    now = new Date(pdfNow.getTime() + 300000);
    await reject(
      () => requestLlmRegeneration(c, token, input),
      "LLM_PDF_PREVIEW_CHANGED",
    );
    expect((await usage()) === null).toBe(true);
  });
  it("requires preview for PDF regeneration and never invents a fixed recipe", async () => {
    const value = await begin();
    await reject(
      () =>
        requestLlmRegeneration(c, token, {
          ...value.input,
          modelId: "fixture/model",
          instruction: "",
          confirmed: true,
        }),
      "LLM_PDF_PREVIEW_REQUIRED",
    );
    expect((await usage()) === null).toBe(true);
  });
  it("cancels queued preview idempotently without quota", async () => {
    const value = await begin();
    await cancelPdfPreview(c, token, value.receipt.previewId);
    await cancelPdfPreview(c, token, value.receipt.previewId);
    const result = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(result?.state === "cancelled" && result.cancelGeneration === 1).toBe(
      true,
    );
    expect((await usage()) === null).toBe(true);
  });
  it("admits pending PDF with both models before any work or dispatch", async () => {
    const value = await f.source();
    await f.uow.run(async (u) => {
      const note = await u.notes.findById(value.noteId);
      const original = await u.imports.findOriginal(value.source.originalId);
      if (!note || !original) throw Error("FIXTURE_SOURCE");
      await admitLlm(c, u, {
        jobId: value.jobId,
        accountId: f.accountId,
        commandId: f.id(),
        requestDigest: "b".repeat(64),
        note,
        original,
        operation: "import",
        modelId: "ignored/pending",
        instruction: "",
        epoch: 1,
        retryOf: null,
        pdf: {
          kind: "pending",
          candidates: {
            textModelId: "fixture/text",
            imageModelId: "fixture/image",
            settingsVersion: 3,
          },
        },
      });
    });
    const job = await f.uow.run((u) => u.llmConversions.find(value.jobId));
    expect(
      job?.selection === "pdf-pending" &&
        job.candidates.settingsVersion === 3 &&
        job.modelId === undefined,
    ).toBe(true);
    expect((await usage())?.reserved === 1 && sends.length === 0).toBe(true);
  });
  it("seals pages once and sends all ordered pages with a single monthly consumption", async () => {
    const pending = await f.pending();
    await run();
    const job = await f.uow.run((u) => u.llmConversions.find(pending.jobId));
    expect(
      job?.outcome.kind === "succeeded" &&
        job.selection === "fixed" &&
        job.preparationVersion === 4,
    ).toBe(true);
    expect(
      sends.length === 3 &&
        sends.every(
          (input, ordinal) =>
            input.kind === "chat-image" &&
            input.promptVersion === 3 &&
            input.input.kind === "pdf-page" &&
            input.input.ordinal === ordinal &&
            input.input.pages === 3 &&
            input.model.modelId === pending.candidates.imageModelId,
        ),
    ).toBe(true);
    expect(prepares === 0).toBe(true);
    expect(
      (await usage())?.consumed === 1 && (await usage())?.reserved === 0,
    ).toBe(true);
  });
  it("seals strict text using the admission text model and unchanged prompt", async () => {
    classification = "strict";
    const pending = await f.pending();
    await run();
    const job = await f.uow.run((u) => u.llmConversions.find(pending.jobId));
    expect(
      job?.outcome.kind === "succeeded" && job.preparationVersion === 2,
    ).toBe(true);
    expect(
      sends.length === 1 &&
        sends[0]?.kind === "chat-text" &&
        sends[0].promptVersion === 1 &&
        sends[0].model.modelId === pending.candidates.textModelId,
    ).toBe(true);
  });
  it("rejects corruption without page fallback and returns the unsent reservation", async () => {
    classification = "corrupt";
    const pending = await f.pending();
    await run();
    const job = await f.uow.run((u) => u.llmConversions.find(pending.jobId));
    expect(
      job?.selection === "pdf-pending" &&
        job.outcome.kind === "failed" &&
        job.outcome.code === "LLM_DOCUMENT_CORRUPT",
    ).toBe(true);
    expect(
      sends.length === 0 &&
        (await usage())?.reserved === 0 &&
        (await usage())?.consumed === 0,
    ).toBe(true);
  });
  it("stops at a later redraw fault retaining prior consumption and old body", async () => {
    redrawFault = 1;
    const pending = await f.pending();
    await run();
    const job = await f.uow.run((u) => u.llmConversions.find(pending.jobId));
    const note = await f.uow.run((u) => u.notes.findById(pending.noteId));
    expect(
      job?.outcome.kind === "failed" &&
        job.outcome.code === "LLM_DOCUMENT_CORRUPT",
    ).toBe(true);
    expect(
      sends.length === 1 &&
        (await usage())?.consumed === 1 &&
        note?.html === "",
    ).toBe(true);
  });
  it("recovers complete matching page responses by postprocessing without generation", async () => {
    const job = await storedResponses();
    await recoverLlm(c);
    await run();
    const result = await f.uow.run((u) => u.llmConversions.find(job.jobId));
    expect(
      result?.outcome.kind === "succeeded" &&
        sends.length === 0 &&
        prepares === 1,
    ).toBe(true);
    expect((await usage())?.consumed === 1).toBe(true);
  });
  it("rejects incomplete required page responses even with response-ready phase", async () => {
    const job = await storedResponses(2);
    await recoverLlm(c);
    await run();
    const result = await f.uow.run((u) => u.llmConversions.find(job.jobId));
    expect(
      result?.outcome.kind === "unknown" &&
        result.outcome.code === "LLM_DELIVERY_UNKNOWN" &&
        sends.length === 0 &&
        prepares === 0,
    ).toBe(true);
    expect((await usage())?.consumed === 1).toBe(true);
  });
  it("rejects changed preparation after all responses without a resend or body replacement", async () => {
    const job = await storedResponses();
    preparedDrift = true;
    await recoverLlm(c);
    await run();
    const result = await f.uow.run((u) => u.llmConversions.find(job.jobId));
    const note = await f.uow.run((u) => u.notes.findById(job.noteId));
    expect(
      result?.outcome.kind === "failed" &&
        result.outcome.code === "LLM_SOURCE_CHANGED" &&
        sends.length === 0 &&
        note?.html === "",
    ).toBe(true);
    expect((await usage())?.consumed === 1).toBe(true);
  });
  it("refunds consumed intent only after all persisted rows prove not-sent and predecessor closed", async () => {
    const job = await storedResponses(3, true);
    expect((await usage())?.consumed === 1).toBe(true);
    await recoverLlm(c);
    const result = await f.uow.run((u) => u.llmConversions.find(job.jobId));
    expect(
      result?.phase === "terminal" &&
        result.owner.state === "closed" &&
        sends.length === 0,
    ).toBe(true);
    expect(
      (await usage())?.consumed === 0 && (await usage())?.reserved === 0,
    ).toBe(true);
  });
  it("ownership publishes preview purpose only after classifier completion with no dispatch", async () => {
    const value = await begin();
    await sweepPdfPreviews(c);
    await Promise.all(tasks);
    const result = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      result?.state === "ready" &&
        result.result.kind === "pages" &&
        result.owner.state === "closed",
    ).toBe(true);
    expect(sends.length === 0 && (await usage()) === null).toBe(true);
  });
  it("ownership pins queued source and permits read owner only while running current", async () => {
    const value = await begin();
    const key = `synthetic/${value.source.source.originalId}`;
    expect(
      await f.uow.run((u) =>
        u.objectOperations.claimDelete(
          key,
          f.id(),
          null,
          now,
          new Date(now.getTime() + 1000),
        ),
      ),
    ).toBe(false);
    await reject(
      () =>
        f.uow.run((u) =>
          u.objectOperations.beginWrite(
            f.id(),
            "fixture-runtime",
            { kind: "llm-pdf-preview", id: value.receipt.previewId },
            now,
          ),
        ),
      "OBJECT_FENCED",
    );
    const claimed = await f.uow.run((u) =>
      u.llmPdfPreviews.claim(now, "fixture-runtime", f.id()),
    );
    if (claimed?.state !== "running") throw Error("FIXTURE_PREVIEW_CLAIM");
    const writeId = f.id();
    await f.uow.run((u) =>
      u.objectOperations.beginWrite(
        writeId,
        "fixture-runtime",
        { kind: "llm-pdf-preview", id: claimed.id },
        now,
      ),
    );
    expect(
      await f.uow.run((u) => u.objectOperations.canPublish(writeId, now)),
    ).toBe(true);
    await f.uow.run((u) => u.llmPdfPreviews.cancelNote(claimed.noteId, now));
    expect(
      await f.uow.run((u) => u.objectOperations.canPublish(writeId, now)),
    ).toBe(false);
    expect(
      await f.uow.run((u) =>
        u.objectOperations.claimDelete(
          key,
          f.id(),
          null,
          now,
          new Date(now.getTime() + 1000),
        ),
      ),
    ).toBe(false);
    await f.uow.run((u) => u.objectOperations.endWrite(writeId));
    predecessors = ["fixture-runtime"];
    await recoverLlm(c);
    const deleted = await f.uow.run((u) =>
      u.objectOperations.claimDelete(
        key,
        f.id(),
        null,
        now,
        new Date(now.getTime() + 1000),
      ),
    );
    expect(deleted).toBe(true);
  });
  it("ownership never expires unknown until predecessor closure proof", async () => {
    classification = "unknown";
    const value = await begin();
    await sweepPdfPreviews(c);
    const ended = await Promise.allSettled(tasks);
    expect(ended.length === 1 && ended[0]?.status === "rejected").toBe(true);
    tasks = [];
    now = new Date(pdfNow.getTime() + 600000);
    await sweepPdfPreviews(c);
    const unknown = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      unknown?.state === "unknown" && unknown.owner.state === "unknown",
    ).toBe(true);
    expect(await f.uow.run((u) => u.llmPdfPreviews.prune(now, 100))).toBe(0);
    predecessors = ["fixture-runtime"];
    await recoverLlm(c);
    const closed = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      closed?.state === "expired" &&
        closed.owner.state === "closed" &&
        sends.length === 0,
    ).toBe(true);
  });
  it("ownership preserves UNAVAILABLE without inventing a source change", async () => {
    classification = "unavailable";
    const value = await begin();
    await sweepPdfPreviews(c);
    await Promise.all(tasks);
    const result = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      result?.state === "failed" &&
        result.code === "LLM_UNAVAILABLE" &&
        result.owner.state === "closed",
    ).toBe(true);
  });
  it("ownership closes expired queued receipt without starting classification", async () => {
    const value = await begin();
    now = new Date(pdfNow.getTime() + 300000);
    await sweepPdfPreviews(c);
    const result = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      result?.state === "expired" &&
        result.owner.state === "idle" &&
        tasks.length === 0,
    ).toBe(true);
  });
  it("ownership rejects generation change before opening classification", async () => {
    const value = await begin();
    await f.client.execute({
      sql: "update notes set ownership_generation=ownership_generation+1 where id=?",
      args: [value.source.noteId],
    });
    await sweepPdfPreviews(c);
    await Promise.all(tasks);
    const result = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      result?.state === "failed" &&
        result.code === "LLM_SOURCE_CHANGED" &&
        sends.length === 0,
    ).toBe(true);
  });
  it("projection discovers own live receipt and ready purpose default without a reservation", async () => {
    const value = await begin();
    if (value.source.source.format !== "pdf") throw Error("FIXTURE_FORMAT");
    await ready(
      value,
      f.pages({ source: { ...value.source.source, format: "pdf" } }),
    );
    const note = await getLlmNote(c, token, { noteId: value.source.noteId });
    const before = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    const view = await getPdfPreview(c, token, {
      noteId: value.source.noteId,
      commandId: value.input.commandId,
    });
    const after = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      note.pdfPreview?.previewId === value.receipt.previewId &&
        note.pdfPreview.commandId === value.input.commandId &&
        note.modelId === null,
    ).toBe(true);
    expect(
      view?.usable &&
        view.current &&
        view.purpose === "chat-image" &&
        !!view.defaultModelId &&
        view.pages === 3,
    ).toBe(true);
    expect(
      before?.version === after?.version &&
        (await usage()) === null &&
        tasks.length === 0,
    ).toBe(true);
  });
  it("projection suppresses stale ready purpose without mutating or waking the receipt", async () => {
    const value = await begin();
    await ready(value);
    await f.client.execute({
      sql: "update notes set ownership_generation=ownership_generation+1 where id=?",
      args: [value.source.noteId],
    });
    const before = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    const view = await getPdfPreview(c, token, {
      noteId: value.source.noteId,
      commandId: value.input.commandId,
    });
    const after = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      view?.state === "ready" &&
        !view.current &&
        !view.usable &&
        view.purpose === null &&
        view.defaultModelId === null,
    ).toBe(true);
    expect(
      before?.version === after?.version &&
        tasks.length === 0 &&
        (await usage()) === null,
    ).toBe(true);
  });
  it("projection expires usable metadata without claiming actual owner closure or changing state", async () => {
    const value = await begin();
    await ready(value);
    now = new Date(pdfNow.getTime() + 300000);
    const view = await getPdfPreview(c, token, {
      noteId: value.source.noteId,
      commandId: value.input.commandId,
    });
    const row = await f.uow.run((u) =>
      u.llmPdfPreviews.find(value.receipt.previewId),
    );
    expect(
      view?.expired &&
        !view.usable &&
        view.purpose === null &&
        row?.state === "ready" &&
        tasks.length === 0,
    ).toBe(true);
  });
});

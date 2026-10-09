import { ConflictError } from "@repo/core/application/errors";
import {
  LLM_LIMITS,
  type LlmFixedConversion,
} from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  type PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notes } from "../hollowSchema";
import { llmConversions, llmPdfPreviews } from "../llmSchema";
import {
  fixed,
  pdfNow,
  pdfPersistenceFixture,
  rejected,
} from "./llmPdfPersistenceFixtures";

declare module "vitest" {
  interface TaskMeta {
    fixturePid?: number;
    fixtureClosed?: boolean;
  }
}

describe("PDF classification persistence and receipt ownership", () => {
  let f: Awaited<ReturnType<typeof pdfPersistenceFixture>> | undefined;
  beforeEach(async (context) => {
    context.task.meta.fixturePid = process.pid;
    f = await pdfPersistenceFixture();
  });
  afterEach(async (context) => {
    await f?.close(context.task.result?.state !== "fail");
    context.task.meta.fixtureClosed = true;
    f = undefined;
  });
  function fixture() {
    if (!f) throw Error("PDF_FIXTURE_MISSING");
    return f;
  }

  it("hydrates pending without a fabricated model or V1 contract", async () => {
    const f = fixture();
    const original = await f.pending();
    const found = await f.uow.run((u) => u.llmConversions.find(original.jobId));
    expect(
      found?.selection === "pdf-pending" &&
        found.candidates.settingsVersion === 2 &&
        found.modelId === undefined &&
        found.preparationVersion === undefined &&
        found.sourceOwnershipGeneration === 1,
    ).toBe(true);
    const claim = await f.claim();
    expect(
      claim.phase === "classifying" && claim.owner.state === "active",
    ).toBe(true);
  });
  it("seals strict once using the accepted text candidate", async () => {
    const f = fixture();
    await f.pending();
    const claim = await f.claim();
    const sealed = await f.seal(claim);
    fixed(sealed);
    expect(
      sealed.preparationVersion === 2 &&
        sealed.promptVersion === 1 &&
        sealed.modelId === "fixture/text" &&
        sealed.pdfProof?.kind === "strict-text",
    ).toBe(true);
    const rows = await f.db.select().from(llmConversions);
    expect(
      rows[0]?.candidateTextModelId === null &&
        rows[0]?.candidateImageModelId === null &&
        rows[0]?.candidateSettingsVersion === null,
    ).toBe(true);
    expect(await f.seal(claim)).toBe(null);
    expect(
      await rejected(() =>
        f.uow.run((u) =>
          u.llmConversions.replace(
            {
              ...sealed,
              modelId: "fixture/other",
              version: sealed.version + 1,
            },
            sealed.version,
          ),
        ),
      ),
    ).toBe(true);
  });
  it("seals pages with image candidate and hydrates page31 identity", async () => {
    const f = fixture();
    await f.pending();
    const claim = await f.claim();
    const sealed = await f.seal(claim, f.pages(claim, 32));
    fixed(sealed);
    expect(
      sealed.preparationVersion === 4 &&
        sealed.promptVersion === 3 &&
        sealed.modelId === "fixture/image" &&
        sealed.manifest.total === 32,
    ).toBe(true);
    await f.uow.run((u) =>
      u.llmDispatches.prepare({
        jobId: sealed.jobId,
        ordinal: 31,
        id: f.id(),
        input: {
          kind: "prepared-pdf-page",
          ordinal: 31,
          sha256: "e".repeat(64),
        },
        ownerToken: "fixture-owner",
        runtimeId: "fixture-runtime",
        state: "prepared",
        intentAt: null,
        response: null,
      }),
    );
    const result = await f.uow.run((u) => u.llmDispatches.list(sealed.jobId));
    expect(
      result.length === 1 &&
        result[0]?.input.kind === "prepared-pdf-page" &&
        result[0]?.ordinal === 31,
    ).toBe(true);
    expect(
      await rejected(() =>
        f.client.execute({
          sql: "INSERT INTO llm_dispatches(job_id,ordinal,id,input_sha256,owner_token,runtime_id,state) VALUES(?,32,?,?,?,?,'prepared')",
          args: [
            sealed.jobId,
            f.id(),
            "c".repeat(64),
            "fixture-owner",
            "fixture-runtime",
          ],
        }),
      ),
    ).toBe(true);
  });
  it("rejects pending prepared dispatch at repository and DB boundaries", async () => {
    const f = fixture();
    const pending = await f.pending();
    expect(
      await rejected(() =>
        f.uow.run((u) =>
          u.llmDispatches.prepare({
            jobId: pending.jobId,
            ordinal: 0,
            id: f.id(),
            input: {
              kind: "prepared-segment",
              ordinal: 0,
              sha256: "c".repeat(64),
            },
            ownerToken: "fixture-owner",
            runtimeId: "fixture-runtime",
            state: "prepared",
            intentAt: null,
            response: null,
          }),
        ),
      ),
    ).toBe(true);
    expect(
      await rejected(() =>
        f.client.execute({
          sql: "INSERT INTO llm_dispatches(job_id,ordinal,id,input_sha256,owner_token,runtime_id,state) VALUES(?,0,?,?,?,?, 'prepared')",
          args: [
            pending.jobId,
            f.id(),
            "c".repeat(64),
            "fixture-owner",
            "fixture-runtime",
          ],
        }),
      ),
    ).toBe(true);
  });
  it("fences stale CAS, cancellation and ownership generation before seal", async () => {
    const f = fixture();
    await f.pending();
    const claim = await f.claim();
    expect(await f.seal({ ...claim, version: claim.version - 1 })).toBe(null);
    await f.db
      .update(notes)
      .set({ ownershipGeneration: 2 })
      .where(eq(notes.id, claim.noteId));
    expect(await f.seal(claim)).toBe(null);
    await f.uow.run((u) => u.llmConversions.cancelNote(claim.noteId, pdfNow));
    expect(await f.seal(claim)).toBe(null);
  });
  it("rejects null and zero generation and incomplete fixed choices in CHECKs", async () => {
    const f = fixture();
    const pending = await f.pending();
    for (const generation of [null, 0])
      expect(
        await rejected(() =>
          f.client.execute({
            sql: "UPDATE llm_conversions SET source_ownership_generation=?,version=version+1 WHERE job_id=?",
            args: [generation, pending.jobId],
          }),
        ),
      ).toBe(true);
    const claim = await f.claim();
    expect(
      await rejected(() =>
        f.client.execute({
          sql: "UPDATE llm_conversions SET selection_state='fixed', model_id='fixture/text',preparation_version=2,prompt_version=1,candidate_text_model_id=NULL,candidate_image_model_id=NULL,candidate_settings_version=NULL,pdf_selection_manifest='{}',phase='preparing',version=version+1 WHERE job_id=?",
          args: [claim.jobId],
        }),
      ),
    ).toBe(true);
  });
  it("rejects an alien pages source and generic-replace seal", async () => {
    const f = fixture();
    await f.pending();
    const claim = await f.claim();
    const choice = f.pages(claim);
    expect(
      await rejected(() =>
        f.seal(claim, {
          ...choice,
          manifest: {
            ...choice.manifest,
            source: { ...claim.source, originalId: "different" },
          },
        }),
      ),
    ).toBe(true);
    const { candidates: _candidates, ...base } = claim;
    const fake: LlmFixedConversion = {
      ...base,
      selection: "fixed",
      phase: "preparing",
      modelId: "fixture/text",
      preparationVersion: 2,
      promptVersion: 1,
      pdfProof: f.strict(),
      outcome: { kind: "pending" },
      version: claim.version + 1,
    };
    expect(
      await rejected(() =>
        f.uow.run((u) => u.llmConversions.replace(fake, claim.version)),
      ),
    ).toBe(true);
  });
  it("keeps strict ordinal16 and pages ordinal32 outside the persisted domain", async () => {
    const f = fixture();
    await f.pending();
    const claim = await f.claim();
    const sealed = await f.seal(claim);
    fixed(sealed);
    for (const ordinal of [16, 32])
      expect(
        await rejected(() =>
          f.client.execute({
            sql: "INSERT INTO llm_dispatches(job_id,ordinal,id,input_sha256,owner_token,runtime_id,state) VALUES(?,?,?,?,?,?,'prepared')",
            args: [
              sealed.jobId,
              ordinal,
              f.id(),
              "c".repeat(64),
              "fixture-owner",
              "fixture-runtime",
            ],
          }),
        ),
      ).toBe(true);
  });
  it("keeps legacy NULL and generation NULL unchanged through CAS", async () => {
    const f = fixture();
    const source = await f.source(f.accountId, "text");
    await f.db.insert(llmConversions).values({
      sourceOrigin: "local-original",
      sourceBindingId: null,
      sourceMemoryBytes: 0,
      inputReceipt: null,
      jobId: source.jobId,
      accountId: source.accountId,
      noteId: source.noteId,
      originalId: source.source.originalId,
      commandId: f.id(),
      requestDigest: "b".repeat(64),
      operation: "import",
      retryOf: null,
      sourceSha256: source.source.sha256,
      sourceBytes: source.source.bytes,
      sourceFormat: "text",
      sourceState: "ready",
      sourceCoverage: "complete",
      noteVersion: 0,
      originalRevisionNo: null,
      credentialEpoch: 1,
      modelId: "fixture/text",
      instruction: "",
      promptVersion: 1,
      preparationVersion: null,
      admissionSequence: 1,
      createdAt: pdfNow,
      updatedAt: pdfNow,
      deadlineAt: new Date(pdfNow.getTime() + LLM_LIMITS.jobMs),
      phase: "queued",
      outcome: "pending",
      ownerState: "idle",
      cancelGeneration: 0,
      responseBudget: 0,
      version: 1,
    });
    const old = await f.uow.run((u) => u.llmConversions.find(source.jobId));
    fixed(old);
    expect(
      old.preparationVersion === 1 &&
        old.pdfProof === null &&
        old.sourceOwnershipGeneration === null,
    ).toBe(true);
    expect(
      await f.uow.run((u) =>
        u.llmConversions.replace(
          { ...old, cancelGeneration: 1, version: 2 },
          1,
        ),
      ),
    ).toBe(true);
    const [row] = await f.db.select().from(llmConversions);
    expect(
      row?.preparationVersion === null &&
        row?.sourceOwnershipGeneration === null,
    ).toBe(true);
  });
  it("keeps preview quota free and note editable before confirmation", async () => {
    const f = fixture();
    const value = await f.preview();
    expect(
      (await f.uow.run((u) => u.llmQuota.usage(f.accountId, "2026-09"))) ===
        null,
    ).toBe(true);
    expect(
      (await f.uow.run((u) => u.llmConversions.activeForNote(value.noteId))) ===
        null,
    ).toBe(true);
    await f.db
      .update(notes)
      .set({ version: 1 })
      .where(eq(notes.id, value.noteId));
    expect(await rejected(() => f.previewReady(value))).toBe(true);
  });
  it("has one live preview per actor and per note", async () => {
    const f = fixture();
    const first = await f.preview();
    expect(await rejected(() => f.preview())).toBe(true);
    const other = f.id();
    await f.account(other);
    expect(
      await rejected(() =>
        f.uow.run((u) =>
          u.llmPdfPreviews.insert({
            ...first,
            id: f.id(),
            commandId: f.id(),
            accountId: other,
          }),
        ),
      ),
    ).toBe(true);
    const found = await f.uow.run((u) =>
      u.llmPdfPreviews.command(first.accountId, first.commandId),
    );
    expect(found?.id === first.id && found.state === "queued").toBe(true);
  });
  it("consumes a ready preview once in the same transaction as conversion", async () => {
    const f = fixture();
    const ready = await f.previewReady(await f.preview());
    const value = await f.fixedForPreview(ready);
    await f.uow.run(async (u) => {
      await u.llmConversions.insert(value);
      expect(
        await u.llmQuota.reserve(value.jobId, value.accountId, pdfNow, 30),
      ).toBe(true);
      expect(
        await u.llmPdfPreviews.consume(
          ready.id,
          ready.version,
          value.jobId,
          pdfNow,
        ),
      ).toBe(true);
    });
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.consume(ready.id, ready.version, value.jobId, pdfNow),
      ),
    ).toBe(false);
    const state = await f.uow.run((u) => u.llmPdfPreviews.find(ready.id));
    expect(state?.state === "consumed" && state.jobId === value.jobId).toBe(
      true,
    );
  });
  it("rolls back conversion and quota when a preview confirmation transaction fails", async () => {
    const f = fixture();
    const ready = await f.previewReady(await f.preview());
    const value = await f.fixedForPreview(ready);
    expect(
      await rejected(() =>
        f.uow.run(async (u) => {
          await u.llmConversions.insert(value);
          await u.llmQuota.reserve(value.jobId, value.accountId, pdfNow, 30);
          await u.llmPdfPreviews.consume(
            ready.id,
            ready.version,
            value.jobId,
            pdfNow,
          );
          throw new ConflictError(
            "FIXTURE_CONFIRM_ROLLBACK",
            "合成確認を中断しました。",
          );
        }),
      ),
    ).toBe(true);
    expect(
      (await f.uow.run((u) => u.llmConversions.find(value.jobId))) === null,
    ).toBe(true);
    expect(
      (await f.uow.run((u) => u.llmPdfPreviews.find(ready.id)))?.state ===
        "ready",
    ).toBe(true);
    expect(
      (await f.uow.run((u) => u.llmQuota.usage(value.accountId, "2026-09"))) ===
        null,
    ).toBe(true);
  });
  it("does not consume an expired receipt or a foreign conversion", async () => {
    const f = fixture();
    const ready = await f.previewReady(await f.preview());
    const value = await f.fixedForPreview(ready);
    await f.uow.run((u) => u.llmConversions.insert(value));
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.consume(ready.id, ready.version, "missing", pdfNow),
      ),
    ).toBe(false);
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.consume(
          ready.id,
          ready.version,
          value.jobId,
          ready.expiresAt,
        ),
      ),
    ).toBe(false);
  });
  it("holds unknown ownership against expiry, pruning and account execution", async () => {
    const f = fixture();
    const preview = await f.preview();
    const running = await f.uow.run((u) =>
      u.llmPdfPreviews.claim(pdfNow, "runtime", "owner"),
    );
    if (!running || running.state !== "running")
      throw Error("PREVIEW_RUNNING_REQUIRED");
    const unknown: PdfPreview = {
      ...running,
      state: "unknown",
      owner: { ...running.owner, state: "unknown" },
      version: running.version + 1,
    };
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.replace(unknown, running.version),
      ),
    ).toBe(true);
    await f.pending();
    expect(
      await f.uow.run((u) =>
        u.llmConversions.claim(
          new Date(pdfNow.getTime() + PDF_LLM_LIMITS.previewMs),
          "next",
          "next",
        ),
      ),
    ).toBe(null);
    expect(
      await f.uow.run((u) =>
        u.llmPdfPreviews.prune(new Date(pdfNow.getTime() + 86400000), 100),
      ),
    ).toBe(0);
    expect(
      await rejected(() =>
        f.db.delete(llmPdfPreviews).where(eq(llmPdfPreviews.id, preview.id)),
      ),
    ).toBe(true);
  });
  it("cancels ready previews without resurrecting their result", async () => {
    const f = fixture();
    const ready = await f.previewReady(await f.preview());
    expect(
      await f.uow.run((u) => u.llmPdfPreviews.cancelNote(ready.noteId, pdfNow)),
    ).toBe(1);
    const current = await f.uow.run((u) => u.llmPdfPreviews.find(ready.id));
    expect(
      current?.state === "cancelled" && current.owner.state === "closed",
    ).toBe(true);
    expect(
      await rejected(() =>
        f.uow.run((u) =>
          u.llmPdfPreviews.replace(
            { ...ready, version: ready.version + 2 },
            ready.version + 1,
          ),
        ),
      ),
    ).toBe(true);
  });
  it("counts account queued conversions plus previews without a new global cap", async () => {
    const f = fixture();
    for (let n = 0; n < 99; n++) await f.pending();
    await f.preview();
    expect(await f.uow.run((u) => u.llmConversions.queued(f.accountId))).toBe(
      100,
    );
    expect(await rejected(() => f.pending())).toBe(true);
    const second = f.id();
    await f.account(second);
    await f.pending(second);
    expect(await f.uow.run((u) => u.llmConversions.queued(second))).toBe(1);
  });
  it("shares global2 and account1 owner admission with previews", async () => {
    const f = fixture();
    await f.preview();
    expect(
      (await f.uow.run((u) => u.llmPdfPreviews.claim(pdfNow, "r", "p")))
        ?.state === "running",
    ).toBe(true);
    const second = f.id();
    await f.account(second);
    await f.pending(second);
    expect(
      (await f.uow.run((u) => u.llmConversions.claim(pdfNow, "r", "c")))?.owner
        .state === "active",
    ).toBe(true);
    const third = f.id();
    await f.account(third);
    await f.pending(third);
    expect(
      await f.uow.run((u) => u.llmConversions.claim(pdfNow, "r", "third")),
    ).toBe(null);
    expect((await f.db.all(sql`pragma foreign_key_check`)).length).toBe(0);
  });
});

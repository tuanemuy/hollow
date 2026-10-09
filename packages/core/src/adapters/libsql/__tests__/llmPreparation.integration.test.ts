import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import type { LlmSourceFormat } from "@repo/core/domain/llm/entity";
import { createNote } from "@repo/core/domain/note/entity";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { llmConversions } from "../llmSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("LLM preparation version persistence", () => {
  let base: TestContainer;
  let uow: LibsqlHollowUnitOfWorkProvider;
  let accountId: string;
  let created = false;
  let retainedFailure = false;
  const now = new Date("2026-09-28T00:00:00Z");
  beforeEach(async (context) => {
    context.task.meta.fixturePid = process.pid;
    expect(retainedFailure).toBe(false);
    created = false;
    expect(
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith("libsql-test-"),
      ).length,
    ).toBe(0);
    base = await createTestContainer();
    created = true;
    uow = new LibsqlHollowUnitOfWorkProvider(base.db);
    accountId = base.idGenerator.next();
    await uow.run((u) =>
      u.accounts.save(
        verifyAccount(
          createAccount(
            accountId,
            "preparation@fixture.invalid",
            "synthetic",
            now,
          ),
          now,
        ),
      ),
    );
  });
  afterEach(async (context) => {
    if (!created) return;
    let healthy = context.task.result?.state !== "fail";
    try {
      expect(
        (await base.client.execute("PRAGMA foreign_key_check")).rows.length,
      ).toBe(0);
    } catch (error) {
      healthy = false;
      throw error;
    } finally {
      if (healthy) base.close();
      else {
        retainedFailure = true;
        base.client.close();
      }
      context.task.meta.fixtureClosed = true;
    }
    if (!healthy) return;
    expect(
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith("libsql-test-"),
      ).length,
    ).toBe(0);
  });
  async function fixture(
    format: LlmSourceFormat,
    preparationVersion: number | null,
    promptVersion = 1,
  ) {
    const note = createNote(
      {
        id: base.idGenerator.next(),
        accountId,
        title: "Synthetic",
        html: "<p>prior</p>",
        text: "prior",
      },
      now,
    );
    const jobId = base.idGenerator.next();
    const originalId = base.idGenerator.next();
    const batchId = base.idGenerator.next();
    await uow.run(async (u) => {
      await u.notes.insert(note);
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
        name: `synthetic.${format}`,
        bytes: 32,
        storageKey: `synthetic/${originalId}`,
        sha256: "a".repeat(64),
        format,
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
    });
    return {
      sourceOrigin: "local-original",
      sourceBindingId: null,
      sourceMemoryBytes: 0,
      inputReceipt: null,
      jobId,
      accountId,
      noteId: note.id,
      originalId,
      commandId: base.idGenerator.next(),
      requestDigest: "b".repeat(64),
      operation: "regenerate",
      retryOf: null,
      sourceSha256: "a".repeat(64),
      sourceBytes: 32,
      sourceFormat: format,
      sourceState: "ready",
      sourceCoverage: "complete",
      noteVersion: 0,
      originalRevisionNo: null,
      credentialEpoch: 1,
      modelId: "synthetic/text",
      instruction: "",
      promptVersion,
      preparationVersion,
      admissionSequence: 1,
      createdAt: now,
      deadlineAt: new Date(now.getTime() + 1800000),
      updatedAt: now,
      phase: "queued",
      outcome: "pending",
      failure: null,
      resultVersion: null,
      ownerState: "idle",
      runtimeId: null,
      ownerToken: null,
      cancelGeneration: 0,
      responseBudget: 0,
      version: 1,
    } satisfies typeof llmConversions.$inferInsert;
  }
  async function rawVersion(jobId: string) {
    const [row] = await base.db
      .select({ preparation: llmConversions.preparationVersion })
      .from(llmConversions)
      .where(eq(llmConversions.jobId, jobId));
    return row?.preparation;
  }
  it.each([
    null,
    1,
  ] as const)("hydrates legacy %s as V1 but preserves its raw value through CAS", async (preparation) => {
    const row = await fixture("text", preparation);
    await base.db.insert(llmConversions).values(row);
    await uow.run(async (u) => {
      const value = await u.llmConversions.find(row.jobId);
      if (!value) throw Error("self row missing");
      expect(value.preparationVersion).toBe(1);
      const next = {
        ...value,
        updatedAt: new Date(now.getTime() + 1),
        version: 2,
      };
      expect(await u.llmConversions.replace(next, 1)).toBe(true);
      expect(await u.llmConversions.replace(next, 1)).toBe(false);
    });
    expect(await rawVersion(row.jobId)).toBe(preparation);
    await expect(
      base.db.run(
        sql`UPDATE llm_conversions SET preparation_version=${preparation === null ? 1 : null},version=version+1 WHERE job_id=${row.jobId}`,
      ),
    ).rejects.toThrow();
  });
  it.each([
    "docx",
    "xlsx",
    "pptx",
    "pdf",
  ] as const)("hydrates and CAS updates %s V2 without format masquerading", async (format) => {
    const row = await fixture(format, 2);
    await base.db.insert(llmConversions).values(row);
    await uow.run(async (u) => {
      const value = await u.llmConversions.find(row.jobId);
      if (!value) throw Error("self row missing");
      expect(value.source.format).toBe(format);
      expect(value.preparationVersion).toBe(2);
      expect(value.promptVersion).toBe(1);
      expect(await u.llmConversions.replace({ ...value, version: 2 }, 1)).toBe(
        true,
      );
    });
    expect(await rawVersion(row.jobId)).toBe(2);
  });
  it.each([
    ["docx", null],
    ["xlsx", null],
    ["pptx", null],
    ["pdf", null],
    ["docx", 1],
    ["xlsx", 1],
    ["pptx", 1],
    ["pdf", 1],
    ["text", 2],
    ["html", 2],
    ["markdown", 2],
    ["text", 3],
    ["pdf", 3],
  ] as const)("rejects %s with preparation %s in SQL and in the mapper", async (format, version) => {
    const row = await fixture(format, version);
    await expect(base.db.insert(llmConversions).values(row)).rejects.toThrow();
    await base.client.execute("PRAGMA ignore_check_constraints=ON");
    try {
      await base.db.insert(llmConversions).values(row);
    } finally {
      await base.client.execute("PRAGMA ignore_check_constraints=OFF");
    }
    await expect(
      uow.run((u) => u.llmConversions.find(row.jobId)),
    ).rejects.toMatchObject({ code: "LLM_STATE_INVALID" });
  });
  it("does not silently accept a changed effective recipe through replace", async () => {
    const row = await fixture("text", null);
    await base.db.insert(llmConversions).values(row);
    await uow.run(async (u) => {
      const value = await u.llmConversions.find(row.jobId);
      if (!value) throw Error("self row missing");
      if (value.selection !== "fixed") throw Error("FIXTURE_FIXED_REQUIRED");
      const attempted = {
        ...value,
        selection: "fixed" as const,
        pdfProof: null,
        sourceOwnershipGeneration: null,
        source: { ...value.source, format: "pdf" as const },
        preparationVersion: 2 as const,
        promptVersion: 1 as const,
        version: 2,
      };
      expect(await u.llmConversions.replace(attempted, 1)).toBe(false);
    });
    expect(await rawVersion(row.jobId)).toBeNull();
  });
  it("hydrates image recipe3 prompt2 and dispatch identity without changing immutable values", async () => {
    const row = await fixture("image", 3, 2);
    await base.db.insert(llmConversions).values(row);
    await uow.run(async (u) => {
      const value = await u.llmConversions.find(row.jobId);
      if (!value) throw Error("self row missing");
      expect(
        value.source.format === "image" &&
          value.preparationVersion === 3 &&
          value.promptVersion === 2,
      ).toBe(true);
      expect(await u.llmConversions.replace({ ...value, version: 2 }, 1)).toBe(
        true,
      );
      expect(await u.llmConversions.replace({ ...value, version: 2 }, 1)).toBe(
        false,
      );
      await u.llmDispatches.prepare({
        id: "image-dispatch",
        jobId: row.jobId,
        ordinal: 0,
        input: { kind: "prepared-raster", ordinal: 0, sha256: "c".repeat(64) },
        runtimeId: "runtime",
        ownerToken: "owner",
        state: "prepared",
        intentAt: null,
        response: null,
      });
      const listed = await u.llmDispatches.list(row.jobId);
      const found = await u.llmDispatches.find("image-dispatch");
      expect(
        listed.length === 1 &&
          listed[0]?.input.kind === "prepared-raster" &&
          found?.input.kind === "prepared-raster" &&
          found.input.ordinal === 0,
      ).toBe(true);
    });
    expect(await rawVersion(row.jobId)).toBe(3);
    await expect(
      base.db.run(
        sql`UPDATE llm_conversions SET preparation_version=2,prompt_version=1,source_format='pdf',version=version+1 WHERE job_id=${row.jobId}`,
      ),
    ).rejects.toThrow();
  });
  it.each([
    ["image", null, 2],
    ["image", 1, 2],
    ["image", 2, 2],
    ["image", 3, 1],
    ["image", 3, 3],
    ["image", 4, 2],
    ["text", null, 2],
    ["html", 1, 2],
    ["markdown", 1, 2],
    ["docx", 2, 2],
    ["xlsx", 2, 2],
    ["pptx", 2, 2],
    ["pdf", 2, 2],
  ] as const)("rejects image contract cross-product %s/%s/%s in SQL and mapper", async (format, preparation, prompt) => {
    const row = await fixture(format, preparation, prompt);
    await expect(base.db.insert(llmConversions).values(row)).rejects.toThrow();
    await base.client.execute("PRAGMA ignore_check_constraints=ON");
    try {
      await base.db.insert(llmConversions).values(row);
    } finally {
      await base.client.execute("PRAGMA ignore_check_constraints=OFF");
    }
    await expect(
      uow.run((u) => u.llmConversions.find(row.jobId)),
    ).rejects.toMatchObject({ code: "LLM_STATE_INVALID" });
  });
  it("refuses mismatched text dispatch identity for an image conversion", async () => {
    const row = await fixture("image", 3, 2);
    await base.db.insert(llmConversions).values(row);
    await expect(
      uow.run((u) =>
        u.llmDispatches.prepare({
          id: "wrong-dispatch",
          jobId: row.jobId,
          ordinal: 0,
          input: {
            kind: "prepared-segment",
            ordinal: 0,
            sha256: "c".repeat(64),
          },
          runtimeId: "runtime",
          ownerToken: "owner",
          state: "prepared",
          intentAt: null,
          response: null,
        }),
      ),
    ).rejects.toMatchObject({ code: "LLM_STATE_INVALID" });
    expect((await uow.run((u) => u.llmDispatches.list(row.jobId))).length).toBe(
      0,
    );
  });
});

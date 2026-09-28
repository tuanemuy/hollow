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
  const now = new Date("2026-09-28T00:00:00Z");
  beforeEach(async () => {
    base = await createTestContainer();
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
  afterEach(async () => {
    try {
      expect(
        (await base.client.execute("PRAGMA foreign_key_check")).rows.length,
      ).toBe(0);
    } finally {
      base.close();
    }
  });
  async function fixture(
    format: LlmSourceFormat,
    preparationVersion: number | null,
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
      promptVersion: 1,
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
      const attempted = {
        ...value,
        source: { ...value.source, format: "pdf" as const },
        preparationVersion: 2 as const,
        version: 2,
      };
      expect(await u.llmConversions.replace(attempted, 1)).toBe(false);
    });
    expect(await rawVersion(row.jobId)).toBeNull();
  });
});

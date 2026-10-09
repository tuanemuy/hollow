import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Client } from "@libsql/client";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import {
  LLM_LIMITS,
  type LlmConversion,
  type LlmFixedConversion,
  type LlmPendingPdfConversion,
} from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  type PdfChoice,
  type PdfPreview,
} from "@repo/core/domain/llm/pdfPreview";
import { createNote } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { applyPragmas, createLibsqlClient, getDatabase } from "../client";
import { LibsqlHollowUnitOfWorkProvider } from "../hollowUnitOfWork";
import { llmConversions } from "../llmSchema";

export const pdfNow = new Date("2026-09-29T00:00:00Z");
let active = false;
let failed = false;
export async function pdfPersistenceFixture() {
  if (active || failed) throw Error("PDF_FIXTURE_RESIDUAL");
  active = true;
  const dir = mkdtempSync(path.join(tmpdir(), "hollow-pdf-persistence-"));
  const file = path.join(dir, "app.db");
  let client: Client | undefined;
  try {
    client = createLibsqlClient({ url: `file:${file}` });
    await applyPragmas(client);
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    });
    const uow = new LibsqlHollowUnitOfWorkProvider(db);
    let serial = 0;
    const id = () => `pdf-fixture-${++serial}`;
    const accountId = id();
    async function account(value: string) {
      await uow.run(async (u) => {
        await u.accounts.save(
          verifyAccount(
            createAccount(
              value,
              `${value}@fixture.invalid`,
              "synthetic",
              pdfNow,
            ),
            pdfNow,
          ),
        );
        const old = await u.openRouterConnections.ensure(value, pdfNow);
        await u.openRouterConnections.replace(
          {
            ...old,
            state: "linked",
            epoch: 1,
            version: old.version + 1,
            credentialEnvelope: "synthetic",
            linkedAt: pdfNow,
            everLinkedAt: pdfNow,
            lastUsedAt: null,
            providerUserId: null,
            keyExpiresAt: null,
          },
          old.version,
        );
      });
    }
    await account(accountId);
    async function source(
      actor = accountId,
      format: "pdf" | "text" | "image" = "pdf",
    ) {
      return uow.run(async (u) => {
        const note = createNote(
          { id: id(), accountId: actor, title: "fixture", html: "", text: "" },
          pdfNow,
        );
        await u.notes.insert(note);
        const originalId = id();
        const jobId = id();
        const batchId = id();
        await u.imports.insertBatch({
          requestedVisibility: "private",
          id: batchId,
          accountId: actor,
          createdAt: pdfNow,
          useAi: true,
          cancelledAt: null,
        });
        await u.imports.insertOriginal({
          id: originalId,
          noteId: note.id,
          accountId: actor,
          name: "fixture",
          bytes: 5,
          storageKey: `synthetic/${originalId}`,
          sha256: "a".repeat(64),
          format,
          state: "ready",
          coverage: "complete",
          activeJobId: jobId,
          createdAt: pdfNow,
        });
        await u.jobs.insert({
          id: jobId,
          batchId,
          originalId,
          accountId: actor,
          noteId: note.id,
          noteVersion: note.version,
          useAi: true,
          createdAt: pdfNow,
          updatedAt: pdfNow,
          attempt: 0,
          retryOf: null,
          state: "queued",
          leaseToken: null,
          leaseUntil: null,
          failure: null,
        });
        return {
          source: {
            kind: "original" as const,
            originalId,
            sha256: "a".repeat(64),
            bytes: 5,
            format,
          },
          jobId,
          noteId: note.id,
          noteVersion: note.version,
          accountId: actor,
        };
      });
    }
    async function pending(
      actor = accountId,
    ): Promise<LlmPendingPdfConversion> {
      const value = await source(actor);
      return uow.run(async (u) => {
        const result: LlmPendingPdfConversion = {
          access: { origin: "local-original", bindingId: null },
          sourceMemoryBytes: 0,
          inputReceipt: null,
          ...value,
          source: { ...value.source, format: "pdf" },
          selection: "pdf-pending",
          sourceOwnershipGeneration: 1,
          candidates: {
            textModelId: "fixture/text",
            imageModelId: "fixture/image",
            settingsVersion: 2,
          },
          commandId: id(),
          requestDigest: "b".repeat(64),
          operation: "import",
          retryOf: null,
          sourceState: "ready",
          sourceCoverage: "complete",
          originalRevisionNo: null,
          credentialEpoch: 1,
          instruction: "",
          admissionSequence: await u.llmConversions.admit(actor),
          createdAt: pdfNow,
          deadlineAt: new Date(pdfNow.getTime() + LLM_LIMITS.jobMs),
          updatedAt: pdfNow,
          phase: "queued",
          outcome: { kind: "pending" },
          owner: { state: "idle", token: null, runtimeId: null },
          cancelGeneration: 0,
          responseBudget: 0,
          version: 1,
        };
        await u.llmConversions.insert(result);
        await u.llmQuota.reserve(result.jobId, actor, pdfNow, 1000);
        return result;
      });
    }
    function strict(): Extract<PdfChoice, { kind: "strict-text" }> {
      return {
        kind: "strict-text",
        preparationVersion: 2,
        promptVersion: 1,
        modelKind: "chat-text",
        preparedDocumentHash: "d".repeat(64),
        pages: 2,
        policy: "strict-text-v1",
      };
    }
    function pages(
      value: { source: LlmPendingPdfConversion["source"] },
      total = 3,
    ): Extract<PdfChoice, { kind: "pages" }> {
      return {
        kind: "pages",
        preparationVersion: 4,
        promptVersion: 3,
        modelKind: "chat-image",
        reason: "VISUAL_CONTENT",
        manifest: {
          kind: "pdf-pages",
          preparationVersion: 4,
          source: value.source,
          policy: PDF_PAGE_POLICY,
          renderer: PDF_PAGE_RENDERER,
          total,
          pages: Array.from({ length: total }, (_, ordinal) => ({
            ordinal,
            width: 20,
            height: 20,
            bytes: 126,
            sha256: "e".repeat(64),
          })),
          sha256: "f".repeat(64),
        },
      };
    }
    async function claim() {
      const value = await uow.run((u) =>
        u.llmConversions.claim(pdfNow, "fixture-runtime", "fixture-owner"),
      );
      if (!value || value.selection !== "pdf-pending")
        throw Error("PDF_PENDING_REQUIRED");
      return value;
    }
    async function seal(
      value: LlmPendingPdfConversion,
      choice: PdfChoice = strict(),
    ) {
      return uow.run((u) =>
        u.llmConversions.sealPdf({
          jobId: value.jobId,
          expectedVersion: value.version,
          ownerToken: "fixture-owner",
          runtimeId: "fixture-runtime",
          choice,
          now: pdfNow,
        }),
      );
    }
    async function preview(
      actor = accountId,
    ): Promise<PdfPreview & { state: "queued" }> {
      const value = await source(actor);
      const result: PdfPreview & { state: "queued" } = {
        access: { origin: "local-original", bindingId: null },
        sourceMemoryBytes: 0,
        inputReceipt: null,
        ...value,
        source: { ...value.source, format: "pdf" },
        id: id(),
        commandId: id(),
        requestDigest: "c".repeat(64),
        ownershipGeneration: 1,
        credentialEpoch: 1,
        createdAt: pdfNow,
        expiresAt: new Date(pdfNow.getTime() + PDF_LLM_LIMITS.previewMs),
        updatedAt: pdfNow,
        cancelGeneration: 0,
        version: 1,
        state: "queued",
        owner: { state: "idle", token: null, runtimeId: null },
      };
      await uow.run((u) => u.llmPdfPreviews.insert(result));
      return result;
    }
    async function previewReady(value: PdfPreview & { state: "queued" }) {
      const running = await uow.run((u) =>
        u.llmPdfPreviews.claim(pdfNow, "fixture-runtime", "preview-owner"),
      );
      if (!running || running.state !== "running" || running.id !== value.id)
        throw Error("PDF_PREVIEW_CLAIM");
      const ready: PdfPreview & { state: "ready" } = {
        ...running,
        state: "ready",
        owner: { ...running.owner, state: "closed" },
        result: strict(),
        version: running.version + 1,
      };
      if (
        !(await uow.run((u) =>
          u.llmPdfPreviews.replace(ready, running.version),
        ))
      )
        throw Error("PDF_PREVIEW_READY");
      return ready;
    }
    async function fixedForPreview(
      ready: PdfPreview & { state: "ready" },
    ): Promise<LlmFixedConversion> {
      const [job] = await db.select().from(llmConversions).limit(1);
      if (job) throw Error("PDF_FIXTURE_FIXED_SCOPE");
      const original = await uow.run((u) =>
        u.imports.findOriginal(ready.source.originalId),
      );
      if (!original) throw Error("PDF_FIXTURE_ORIGINAL");
      const choice = ready.result;
      const common = {
        access: { origin: "local-original" as const, bindingId: null },
        sourceMemoryBytes: 0 as const,
        inputReceipt: null,
        jobId: original.activeJobId,
        accountId: ready.accountId,
        noteId: ready.noteId,
        commandId: id(),
        requestDigest: "b".repeat(64),
        operation: "regenerate" as const,
        retryOf: null,
        source: ready.source,
        sourceState: "ready" as const,
        sourceCoverage: "complete" as const,
        noteVersion: ready.noteVersion,
        originalRevisionNo: null,
        credentialEpoch: 1,
        instruction: "",
        admissionSequence: await uow.run((u) =>
          u.llmConversions.admit(ready.accountId),
        ),
        createdAt: pdfNow,
        deadlineAt: new Date(pdfNow.getTime() + LLM_LIMITS.jobMs),
        updatedAt: pdfNow,
        phase: "queued" as const,
        outcome: { kind: "pending" as const },
        owner: { state: "idle" as const, token: null, runtimeId: null },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
        selection: "fixed" as const,
        sourceOwnershipGeneration: 1,
      };
      return choice.kind === "strict-text"
        ? {
            ...common,
            modelId: "fixture/text",
            preparationVersion: 2,
            promptVersion: 1,
            pdfProof: choice,
          }
        : {
            ...common,
            modelId: "fixture/image",
            preparationVersion: 4,
            promptVersion: 3,
            pdfProof: choice,
            manifest: choice.manifest,
          };
    }
    const opened = client;
    return {
      client: opened,
      db,
      uow,
      dir,
      file,
      id,
      accountId,
      account,
      source,
      pending,
      strict,
      pages,
      claim,
      seal,
      preview,
      previewReady,
      fixedForPreview,
      async close(success: boolean) {
        let valid = success;
        try {
          if (
            (await opened.execute("PRAGMA foreign_key_check")).rows.length !== 0
          ) {
            valid = false;
          }
        } catch {
          valid = false;
        } finally {
          opened.close();
        }
        const files = [file, `${file}-wal`, `${file}-shm`];
        const bytes = files
          .filter(existsSync)
          .reduce((n, f) => n + statSync(f).size, 0);
        if (
          bytes > 16 * 1024 * 1024 ||
          readdirSync(dir).some(
            (name) => !["app.db", "app.db-wal", "app.db-shm"].includes(name),
          )
        )
          valid = false;
        if (valid) {
          try {
            for (const f of files) if (existsSync(f)) unlinkSync(f);
            rmdirSync(dir);
            active = false;
          } catch {
            failed = true;
            throw Error("PDF_FIXTURE_CLEANUP_FAILED");
          }
        } else {
          failed = true;
          if (success) throw Error("PDF_FIXTURE_CLEANUP_GUARD");
        }
      },
    };
  } catch {
    client?.close();
    failed = true;
    throw Error("PDF_FIXTURE_SETUP_FAILED");
  }
}
export async function rejected(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch (error) {
    let current: unknown = error;
    for (let depth = 0; depth < 8; depth++) {
      if (typeof current !== "object" || current === null) return false;
      if (
        "code" in current &&
        typeof current.code === "string" &&
        ([
          "LLM_STATE_INVALID",
          "LLM_SOURCE_INVALID",
          "CONSTRAINT_VIOLATION",
          "UNIQUE_VIOLATION",
          "FOREIGN_KEY_VIOLATION",
          "FIXTURE_CONFIRM_ROLLBACK",
        ].includes(current.code) ||
          current.code.startsWith("SQLITE_CONSTRAINT"))
      )
        return true;
      current = "cause" in current ? current.cause : null;
    }
    return false;
  }
}
export function fixed(
  value: LlmConversion | null,
): asserts value is LlmFixedConversion {
  if (!value || value.selection !== "fixed") throw Error("PDF_FIXED_REQUIRED");
}

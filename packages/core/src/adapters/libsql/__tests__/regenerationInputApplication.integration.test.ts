import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type {
  HollowUnitOfWorkContext,
  HollowUnitOfWorkProvider,
} from "@repo/core/application/execution/hollowUnitOfWork";
import { currentInput } from "@repo/core/application/regeneration/current";
import {
  beginInput,
  finishInput,
} from "@repo/core/application/regeneration/memory";
import type {
  DriveBackupRecord,
  DriveBackupTarget,
} from "@repo/core/domain/integration/driveBackup";
import type { LlmFixedConversion } from "@repo/core/domain/llm/entity";
import type { PdfPreview } from "@repo/core/domain/llm/pdfPreview";
import type {
  SourceAttempt,
  SourceBinding,
} from "@repo/core/domain/regeneration/entity";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { seedRegenerationLocal } from "./regenerationFixtures";
import {
  inputId as id,
  inputCapacity,
  inputComposition,
  inputDatabase,
  inputProtector,
  inputNow as now,
  seedInputMachine,
} from "./regenerationInputFixtures";

describe.skipIf(!process.env.HOLLOW_REGENERATION_INPUT_ROOT)(
  "0043 source stage application",
  () => {
    let base: Awaited<ReturnType<typeof inputDatabase>>;
    let composition: ReturnType<typeof inputComposition>;
    let failed = false;
    let stage: (value: number) => void = () => {};
    const metas: { inputClosed?: boolean }[] = [];
    // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
    beforeAll(async ({}, suite) => {
      base = await inputDatabase("application-v4", 47, (phase, closed) => {
        suite.meta.inputStage = phase;
        suite.meta.inputClosed = closed;
      });
      composition = inputComposition(base);
    });
    beforeEach((ctx) => {
      if (failed) ctx.skip();
      ctx.task.meta.inputStage = 1;
      stage = (value) => {
        ctx.task.meta.inputStage = value;
      };
      metas.push(ctx.task.meta);
    });
    afterEach((ctx) => {
      if (ctx.task.result?.state !== "pass") failed = true;
    });
    // biome-ignore lint/correctness/noEmptyPattern: Vitest suite hooks require a destructured fixture argument.
    afterAll(async ({}, suite) => {
      await composition?.execution.stop();
      base?.client.close();
      if (base) suite.meta.inputClosed = true;
      for (const meta of metas) meta.inputClosed = true;
      inputCapacity();
    });
    const row = (consumer: { kind: "machine-regeneration"; id: string }) =>
      base.uow.run((u) => u.machineRegenerations.find(consumer.id));
    const seed = (n: number, drive = true) =>
      seedInputMachine(base, n, inputProtector, drive, undefined, stage);
    it("reserves active stage, rejects JSON-only/owner/generation release, and frees active input by exact opaque proof", async (ctx) => {
      const p = await seed(10);
      ctx.task.meta.inputStage = 201;
      const lease = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      ctx.task.meta.inputStage = 202;
      const held = await row(p.consumer);
      if (!held) throw Error("INPUT_ROW");
      ctx.task.meta.inputStage = 10;
      expect(held.sourceMemoryBytes).toBe(SOURCE_MEMORY_BYTES);
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            { ...held, sourceMemoryBytes: 0, version: held.version + 1 },
            held.version,
          ),
        ),
      ).rejects.toBeDefined();
      await expect(
        finishInput(composition.c, composition.services, {
          receipt: { ...lease.receipt, state: "closed", proofId: id(800) },
        }),
      ).rejects.toBeDefined();
      for (const patch of [
        { token: id(88) },
        { runtimeId: id(88) },
        { generation: 2 },
        { generation: 0 },
      ]) {
        await expect(
          base.uow.run((u) =>
            u.machineRegenerations.replace(
              {
                ...held,
                inputReceipt: {
                  ...lease.receipt,
                  ...patch,
                  state: "closed",
                  proofId: id(800),
                },
                sourceMemoryBytes: 0,
                version: held.version + 1,
              },
              held.version,
            ),
          ),
        ).rejects.toBeDefined();
      }
      const proof = composition.memory.finish(lease, id(800));
      await finishInput(composition.c, composition.services, proof);
      const closed = await row(p.consumer);
      expect(closed?.sourceMemoryBytes).toBe(0);
      expect(closed?.owner.state).toBe("active");
      expect(closed?.inputReceipt?.state).toBe("closed");
      expect(composition.memory.verify(proof, proof.receipt)).toBe(false);
      const second = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      expect(second.receipt.generation).toBe(2);
      await finishInput(
        composition.c,
        composition.services,
        composition.memory.finish(second, id(801)),
      );
    });
    it("retains opaque proof on CAS acknowledgement loss and resolves by same-value read only", async (ctx) => {
      const p = await seed(11);
      const lease = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      const proof = composition.memory.finish(lease, id(802));
      let writes = 0;
      const uncertain: HollowUnitOfWorkProvider = {
        async run<T>(
          work: (u: HollowUnitOfWorkContext) => Promise<T>,
        ): Promise<T> {
          await base.uow.run(work);
          writes++;
          throw Error("INPUT_ACK_UNKNOWN");
        },
      };
      const c: HollowContainer = {
        ...composition.c,
        unitOfWorkProvider: uncertain,
      };
      ctx.task.meta.inputStage = 20;
      await expect(
        finishInput(c, composition.services, proof),
      ).rejects.toBeDefined();
      expect(writes).toBe(1);
      expect(composition.memory.verify(proof, proof.receipt)).toBe(true);
      const before = await row(p.consumer);
      await finishInput(composition.c, composition.services, proof);
      expect(await row(p.consumer)).toEqual(before);
    });
    it("counts local LLM, PDF and machine reservations together at 100MiB", async (ctx) => {
      const llm = await seedRegenerationLocal(base, 30, false, false, {
        format: "html",
      });
      const pdf = await seedRegenerationLocal(base, 31, false, false, {
        consumers: "preview",
      });
      await base.client.execute({
        sql: "UPDATE llm_conversions SET phase='preparing',owner_state='active',runtime_id=?,owner_token=?,response_budget=2097152,version=version+1 WHERE job_id=?",
        args: [id(4001), id(4002), llm.jobId],
      });
      await base.client.execute({
        sql: "UPDATE llm_pdf_previews SET state='running',owner_state='active',runtime_id=?,owner_token=?,version=version+1 WHERE id=?",
        args: [id(4003), id(4004), pdf.previewId],
      });
      const l = await beginInput(composition.c, composition.services, {
        kind: "llm-conversion",
        id: llm.jobId,
      });
      const v = await beginInput(composition.c, composition.services, {
        kind: "pdf-preview",
        id: pdf.previewId,
      });
      const p = await seed(12, false);
      ctx.task.meta.inputStage = 30;
      await expect(
        beginInput(composition.c, composition.services, p.consumer),
      ).rejects.toBeDefined();
      expect((await row(p.consumer))?.sourceMemoryBytes).toBe(0);
      await finishInput(
        composition.c,
        composition.services,
        composition.memory.finish(l, id(803)),
      );
      const m = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      await finishInput(
        composition.c,
        composition.services,
        composition.memory.finish(v, id(804)),
      );
      await finishInput(
        composition.c,
        composition.services,
        composition.memory.finish(m, id(805)),
      );
    });
    it("source-held active, unknown, closed caller pending and ACK pending stay held until safe", async (ctx) => {
      const p = await seed(13);
      const counts = () =>
        base.uow.run(async (u) => ({
          held: await u.driveBackupTransfers.held(p.record.accountId),
          queued: await u.driveBackupJobs.queued(p.record.accountId),
        }));
      expect(await counts()).toEqual({
        held: { global: 0, account: 0 },
        queued: { global: 0, account: 0 },
      });
      const lease = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      const proof = composition.memory.finish(lease, id(806));
      const a: SourceAttempt = {
        id: id(6000),
        bindingId: p.binding.id,
        ordinal: 1,
        purpose: "acquire",
        version: 1,
        cancelGeneration: 0,
        credentialVersion: 1,
        createdAt: now,
        updatedAt: now,
        deadlineAt: new Date(now.getTime() + 120000),
        phase: "queued",
        owner: { state: "none", runtimeId: null, token: null },
        completion: null,
      };
      await base.uow.run((u) => u.regenerationAttempts.insert(a));
      let active: Extract<SourceAttempt, { phase: "active" | "unknown" }> = {
        ...a,
        phase: "active",
        owner: { state: "active", runtimeId: id(6010), token: id(6011) },
        version: 2,
      };
      expect(
        await base.uow.run((u) => u.regenerationAttempts.claim(active, 1)),
      ).toBe(true);
      ctx.task.meta.inputStage = 40;
      for (const unknown of [false, true]) {
        if (unknown) {
          const next: typeof active = {
            ...active,
            phase: "unknown",
            owner: { ...active.owner, state: "unknown" },
            version: active.version + 1,
          };
          await base.uow.run((u) =>
            u.regenerationAttempts.replace(next, active.version),
          );
          active = next;
        }
        expect(
          (await base.uow.run((u) => u.regenerationAttempts.held())).length,
        ).toBe(1);
        expect(await counts()).toEqual({
          held: { global: 1, account: 1 },
          queued: { global: 0, account: 0 },
        });
        await expect(
          finishInput(composition.c, composition.services, proof),
        ).rejects.toBeDefined();
      }
      type Closed = Extract<SourceAttempt, { phase: "terminal" }> & {
        completion: Extract<
          Extract<SourceAttempt, { phase: "terminal" }>["completion"],
          { kind: "closed" }
        >;
      };
      let closed: Closed = {
        ...active,
        phase: "terminal",
        owner: { ...active.owner, state: "closed" },
        completion: {
          kind: "closed",
          proofId: id(6012),
          outcome: "failed",
          failure: "SOURCE_UNAVAILABLE",
          digest: null,
          callerEnded: false,
          acknowledged: false,
        },
        version: active.version + 1,
      };
      await base.uow.run((u) =>
        u.regenerationAttempts.replace(closed, active.version),
      );
      for (const ended of [false, true]) {
        if (ended) {
          const next: Closed = {
            ...closed,
            completion: { ...closed.completion, callerEnded: true },
            version: closed.version + 1,
          };
          await base.uow.run((u) =>
            u.regenerationAttempts.replace(next, closed.version),
          );
          closed = next;
        }
        expect(
          (await base.uow.run((u) => u.regenerationAttempts.held())).length,
        ).toBe(1);
        expect(await counts()).toEqual({
          held: { global: 1, account: 1 },
          queued: { global: 0, account: 0 },
        });
        await expect(
          finishInput(composition.c, composition.services, proof),
        ).rejects.toBeDefined();
      }
      await base.uow.run((u) =>
        u.regenerationAttempts.replace(
          {
            ...closed,
            completion: { ...closed.completion, acknowledged: true },
            version: closed.version + 1,
          },
          closed.version,
        ),
      );
      expect(
        await base.uow.run((u) => u.regenerationAttempts.held()),
      ).toHaveLength(0);
      expect(await counts()).toEqual({
        held: { global: 0, account: 0 },
        queued: { global: 0, account: 0 },
      });
      await finishInput(composition.c, composition.services, proof);
    });
    it("consumer closed alone cannot release a new active receipt; identity and current note remain enforced", async (ctx) => {
      const p = await seed(14);
      const lease = await beginInput(
        composition.c,
        composition.services,
        p.consumer,
      );
      const held = await row(p.consumer);
      if (!held || held.owner.state !== "active") throw Error("INPUT_ROW");
      const closedOwner = {
        state: "closed" as const,
        runtimeId: held.owner.runtimeId,
        token: held.owner.token,
      };
      ctx.task.meta.inputStage = 50;
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...held,
              owner: closedOwner,
              phase: "terminal",
              outcome: "cancelled",
              cancelGeneration: 1,
              terminalAt: now,
              sourceMemoryBytes: 0,
              version: held.version + 1,
            },
            held.version,
          ),
        ),
      ).rejects.toBeDefined();
      await expect(
        base.client.execute({
          sql: "UPDATE machine_regenerations SET source_input_receipt=NULL,version=version+1 WHERE id=?",
          args: [p.machine.id],
        }),
      ).rejects.toBeDefined();
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...held,
              access: { origin: "local-original", bindingId: null },
              version: held.version + 1,
            },
            held.version,
          ),
        ),
      ).rejects.toBeDefined();
      await base.client.execute({
        sql: "UPDATE notes SET version=version+1 WHERE id=?",
        args: [p.machine.noteId],
      });
      await expect(
        base.uow.run((u) => currentInput(composition.c, u, p.consumer)),
      ).rejects.toBeDefined();
      await finishInput(
        composition.c,
        composition.services,
        composition.memory.finish(lease, id(807)),
      );
    });
    it("releases consumed Drive preview input only with exact stage proof and preserves its raw receipt", async (ctx) => {
      ctx.task.meta.inputStage = 60;
      const s = await seedRegenerationLocal(base, 32, false, false, {
        consumers: false,
      });
      const previewId = id(7000);
      const bindingId = id(7001);
      const jobId = s.jobId;
      const record: DriveBackupRecord = {
        id: id(7013),
        version: 1,
        targetId: id(7014),
        accountId: s.accountId,
        noteId: s.noteId,
        originalId: s.originalId,
        subject: "preview-subject",
        fileId: "preview-file",
        bytes: 5,
        sha256: "a".repeat(64),
        folder: {
          id: "preview-folder",
          name: "Source",
          driveId: null,
          resourceKeyEnvelope: null,
          checkedAt: now,
        },
        createdAt: now,
        webViewLink: null,
        resourceKeyEnvelope: null,
      };
      const binding: SourceBinding = {
        id: bindingId,
        recordId: record.id,
        executorId: s.accountId,
        credentialOwnerId: s.accountId,
        noteId: s.noteId,
        originalId: s.originalId,
        subject: record.subject,
        driveEpoch: 1,
        ownershipGeneration: 1,
        fingerprint: "c".repeat(64),
        consumer: { kind: "pdf-preview", id: previewId },
        cancelGeneration: 0,
        version: 1,
        createdAt: now,
      };
      const p = { record, binding };
      const queued: PdfPreview & { state: "queued" } = {
        id: previewId,
        accountId: p.record.accountId,
        commandId: id(7002),
        requestDigest: "a".repeat(64),
        noteId: p.record.noteId,
        noteVersion: 0,
        ownershipGeneration: 1,
        source: {
          kind: "original",
          format: "pdf",
          originalId: p.record.originalId,
          sha256: p.record.sha256,
          bytes: p.record.bytes,
        },
        access: { origin: "drive-record", bindingId },
        inputReceipt: null,
        sourceMemoryBytes: 0,
        credentialEpoch: 1,
        state: "queued",
        owner: { state: "idle", runtimeId: null, token: null },
        cancelGeneration: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 300000),
      };
      await base.uow.run(async (u) => {
        const connection = await u.driveConnections.ensure(s.accountId, now);
        await u.driveConnections.replace(
          {
            ...connection,
            state: "linked",
            epoch: 1,
            credentialVersion: 1,
            version: 2,
            settingsVersion: connection.settingsVersion + 1,
            folder: null,
            autoBackup: false,
            lastUsedAt: null,
            credential: {
              subject: record.subject,
              email: null,
              envelope: "synthetic",
              scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
              connectedAt: now,
              accessExpiresAt: new Date(now.getTime() + 3600000),
            },
          },
          1,
          "adopt",
        );
        const adopted = await u.driveConnections.find(s.accountId);
        if (!adopted || adopted.state !== "linked")
          throw Error("INPUT_SEED_CONNECTION");
        expect(
          await u.driveConnections.replace(
            {
              ...adopted,
              folder: record.folder,
              version: adopted.version + 1,
              settingsVersion: adopted.settingsVersion + 1,
            },
            adopted.version,
            "folder",
          ),
        ).toBe(true);
        const target: DriveBackupTarget = {
          id: record.targetId,
          originalId: s.originalId,
          noteId: s.noteId,
          accountId: s.accountId,
          subject: record.subject,
          marker: id(7015),
          folder: record.folder,
          folderEpoch: 1,
          state: "unallocated",
          fileId: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        await u.driveBackupTargets.insertInitial(target);
        await u.driveBackupTargets.replace(
          { ...target, state: "allocated", fileId: record.fileId, version: 2 },
          1,
        );
        await u.driveBackupTargets.replace(
          { ...target, state: "confirmed", fileId: record.fileId, version: 3 },
          2,
        );
        await u.driveBackupRecords.insert(record);
        await u.regenerationBindings.insert(binding);
        await u.llmPdfPreviews.insert(queued);
        await u.llmPdfPreviews.replace(
          {
            ...queued,
            state: "running",
            owner: { state: "active", runtimeId: id(7003), token: id(7004) },
            version: 2,
          },
          1,
        );
      });
      const lease = await beginInput(composition.c, composition.services, {
        kind: "pdf-preview",
        id: previewId,
      });
      const running = await base.uow.run((u) =>
        u.llmPdfPreviews.find(previewId),
      );
      if (!running || running.state !== "running") throw Error("INPUT_PREVIEW");
      const choice = {
        kind: "strict-text",
        modelKind: "chat-text",
        preparationVersion: 2,
        promptVersion: 1,
        policy: "strict-text-v1",
        preparedDocumentHash: "c".repeat(64),
        pages: 1,
      } as const;
      const llm: LlmFixedConversion = {
        jobId,
        accountId: p.record.accountId,
        noteId: p.record.noteId,
        commandId: id(7005),
        requestDigest: "b".repeat(64),
        operation: "regenerate",
        retryOf: null,
        source: queued.source,
        access: { origin: "local-original", bindingId: null },
        inputReceipt: null,
        sourceMemoryBytes: 0,
        sourceState: "ready",
        sourceCoverage: "complete",
        sourceOwnershipGeneration: 1,
        noteVersion: 0,
        originalRevisionNo: null,
        credentialEpoch: 1,
        instruction: "",
        admissionSequence: 1,
        createdAt: now,
        deadlineAt: new Date(now.getTime() + 1800000),
        updatedAt: now,
        owner: { state: "idle", runtimeId: null, token: null },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
        selection: "fixed",
        modelId: "fixture/text",
        phase: "queued",
        outcome: { kind: "pending" },
        preparationVersion: 2,
        promptVersion: 1,
        pdfProof: choice,
      };
      await base.uow.run(async (u) => {
        await u.llmPdfPreviews.replace(
          {
            ...running,
            state: "ready",
            owner: { ...running.owner, state: "closed" },
            result: choice,
            version: running.version + 1,
          },
          running.version,
        );
        await u.llmConversions.insert(llm);
        expect(
          await u.llmPdfPreviews.consume(
            previewId,
            running.version + 1,
            jobId,
            now,
          ),
        ).toBe(true);
      });
      ctx.task.meta.inputStage = 61;
      const consumed = await base.uow.run((u) =>
        u.llmPdfPreviews.find(previewId),
      );
      if (!consumed || consumed.state !== "consumed")
        throw Error("INPUT_PREVIEW");
      const raw = async () =>
        (
          await base.client.execute({
            sql: "SELECT result_json,consumed_job_id,owner_state,runtime_id,owner_token FROM llm_pdf_previews WHERE id=?",
            args: [previewId],
          })
        ).rows[0];
      const before = await raw();
      const proof = composition.memory.finish(lease, id(7006));
      const released = {
        ...consumed,
        inputReceipt: proof.receipt,
        sourceMemoryBytes: 0 as const,
        version: consumed.version + 1,
      };
      expect(
        await base.uow.run((u) =>
          u.llmPdfPreviews.replace(
            { ...released, version: consumed.version },
            consumed.version - 1,
          ),
        ),
      ).toBe(false);
      for (const altered of [
        { ...released, jobId: id(7010) },
        { ...released, result: choice },
        { ...released, owner: { ...consumed.owner, token: id(7011) } },
        { ...released, inputReceipt: { ...proof.receipt, generation: 2 } },
        {
          ...released,
          inputReceipt: { ...proof.receipt, runtimeId: id(7012) },
        },
        { ...released, sourceMemoryBytes: SOURCE_MEMORY_BYTES },
      ] as const)
        await expect(
          base.uow.run((u) =>
            u.llmPdfPreviews.replace(altered, consumed.version),
          ),
        ).rejects.toBeDefined();
      await expect(
        finishInput(composition.c, composition.services, { ...proof }),
      ).rejects.toBeDefined();
      await finishInput(composition.c, composition.services, proof);
      expect(await raw()).toEqual(before);
      expect(
        (await base.uow.run((u) => u.llmPdfPreviews.find(previewId)))
          ?.sourceMemoryBytes,
      ).toBe(0);
    });
    it("finishes with exact ledger and FK, released reservations and immutable records", async (ctx) => {
      ctx.task.meta.inputStage = 90;
      expect(
        (await base.client.execute("PRAGMA foreign_key_check")).rows,
      ).toHaveLength(0);
      expect(
        (
          await base.client.execute(
            "SELECT count(*) AS n FROM __drizzle_migrations",
          )
        ).rows[0]?.n,
      ).toBe(48);
      expect(
        (
          await base.client.execute(
            "SELECT coalesce(sum(source_memory_bytes),0) AS n FROM machine_regenerations",
          )
        ).rows[0]?.n,
      ).toBe(0);
      expect(
        (
          await base.client.execute(
            "SELECT count(*) AS n FROM drive_backup_records",
          )
        ).rows[0]?.n,
      ).toBe(5);
    });
  },
);

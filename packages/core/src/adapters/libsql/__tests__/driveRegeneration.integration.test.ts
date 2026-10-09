import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNodeLlm } from "@repo/core/adapters/node/llm/config";
import {
  createNodeMachine,
  createNodeRegeneration,
} from "@repo/core/adapters/node/regeneration/config";
import { currentLlmSource } from "@repo/core/application/llm/current";
import { requestDriveLlmRegeneration } from "@repo/core/application/llm/driveRequest";
import { retryLlmJob } from "@repo/core/application/llm/request";
import {
  cancelMachineRegeneration,
  retryMachineJob,
} from "@repo/core/application/regeneration/control";
import { currentDriveSource } from "@repo/core/application/regeneration/current";
import {
  type DriveMachineRequest,
  requestDriveMachineRegeneration,
} from "@repo/core/application/regeneration/driveRequest";
import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  regenerationDatabase,
  regenerationId,
  regenerationNow,
  regenerationRoot,
  seedRegenerationLocal,
} from "./regenerationFixtures";
import { inputComposition, inputId } from "./regenerationInputFixtures";

const now = regenerationNow;

describe.skipIf(!process.env.HOLLOW_REGENERATION_TEST_ROOT)(
  "Drive machine admission and DB current fences",
  () => {
    let db: Awaited<ReturnType<typeof regenerationDatabase>>;
    let context: ReturnType<typeof inputComposition>;
    let shared: Awaited<ReturnType<typeof createNodeRegeneration>>;
    let c: ReturnType<typeof inputComposition>["c"];
    let wakes = 0;
    const unexpected = async (): Promise<never> => {
      throw Error("C0_NO_SOURCE_READ");
    };
    beforeAll(async () => {
      db = await regenerationDatabase("drive-machine-c0");
      context = inputComposition(db, {
        provider: { read: unexpected, inspect: unexpected },
      });
      const directory = path.join(
        regenerationRoot(),
        "drive-machine-c0-objects",
      );
      await mkdir(directory, { mode: 0o700 });
      const worker = (name: string) =>
        fileURLToPath(new URL(`../../node/llm/${name}`, import.meta.url));
      shared = await createNodeRegeneration(context.c, {
        storage: {
          put: unexpected,
          putBounded: unexpected,
          read: unexpected,
          stat: unexpected,
          stream: unexpected,
          remove: unexpected,
        },
        directory,
        workerPath: worker("sourceWorker.mjs"),
        documentWorkerPath: worker("documentWorker.mjs"),
        imageChildPath: worker("imageChild.mjs"),
        pdfPagesChildPath: worker("pdfPagesChild.mjs"),
      });
      if (!context.c.drive || !context.services.provider)
        throw Error("C0_SOURCE_PAIR");
      c = {
        ...context.c,
        clock: { now: () => now },
        machine: createNodeMachine(
          shared,
          () => {
            wakes++;
          },
          { provider: context.services.provider, drive: context.c.drive },
        ),
      };
    });
    afterAll(async () => {
      if (shared) await shared.execution.stop();
      if (context) {
        await context.execution.stop();
      }
      if (db) db.client.close();
    });

    async function seed(n: number, format: "html" | "markdown" = "html") {
      const row = await seedRegenerationLocal(db, n, false, false, {
        consumers: false,
        format: "html",
      });
      const recordId = regenerationId(n * 100 + 30);
      const targetId = regenerationId(n * 100 + 31);
      const token = `c0-session-${n}`;
      const folder = {
        id: "c0-folder",
        name: "C0",
        driveId: null,
        resourceKeyEnvelope: null,
        checkedAt: now,
      };
      await db.uow.run(async (u) => {
        await u.jobs.cancelNote(row.noteId, now);
        const original = await u.imports.findOriginal(row.originalId);
        if (!original) throw Error("C0_ORIGINAL");
        await u.imports.saveOriginal({ ...original, format, state: "ready" });
        await u.accounts.saveSession({
          accountId: row.accountId,
          tokenHash: c.tokens.hash(token),
          expiresAt: new Date(now.getTime() + 3600000),
        });
        const connection = await u.driveConnections.ensure(row.accountId, now);
        if (
          !(await u.driveConnections.replace(
            {
              ...connection,
              state: "linked",
              epoch: 1,
              credentialVersion: 1,
              version: connection.version + 1,
              settingsVersion: connection.settingsVersion + 1,
              folder: null,
              autoBackup: false,
              lastUsedAt: null,
              credential: {
                subject: `c0-subject-${n}`,
                email: null,
                envelope: "logical-fixture-only",
                scopes: [
                  "openid",
                  "https://www.googleapis.com/auth/drive.file",
                ],
                connectedAt: now,
                accessExpiresAt: new Date(now.getTime() + 3600000),
              },
              updatedAt: now,
            },
            connection.version,
            "adopt",
          ))
        )
          throw Error("C0_CONNECTION");
        const adopted = await u.driveConnections.find(row.accountId);
        if (
          !adopted ||
          adopted.state !== "linked" ||
          !(await u.driveConnections.replace(
            {
              ...adopted,
              folder,
              version: adopted.version + 1,
              settingsVersion: adopted.settingsVersion + 1,
              updatedAt: now,
            },
            adopted.version,
            "folder",
          ))
        )
          throw Error("C0_FOLDER");
        const target = {
          id: targetId,
          noteId: row.noteId,
          originalId: original.id,
          accountId: row.accountId,
          subject: `c0-subject-${n}`,
          marker: regenerationId(n * 100 + 32),
          folder,
          folderEpoch: 1,
          version: 1,
          createdAt: now,
          updatedAt: now,
          state: "unallocated" as const,
          fileId: null,
        };
        await u.driveBackupTargets.insertInitial(target);
        if (
          !(await u.driveBackupTargets.replace(
            {
              ...target,
              state: "confirmed",
              fileId: `c0-file-${n}`,
              version: 2,
            },
            1,
          ))
        )
          throw Error("C0_TARGET");
        await u.driveBackupRecords.insert({
          id: recordId,
          version: 1,
          targetId,
          noteId: row.noteId,
          originalId: original.id,
          accountId: row.accountId,
          subject: target.subject,
          fileId: `c0-file-${n}`,
          folder,
          bytes: original.bytes,
          sha256: original.sha256,
          createdAt: now,
          webViewLink: null,
          resourceKeyEnvelope: null,
        });
      });
      return {
        ...row,
        token,
        input: {
          noteId: row.noteId,
          noteVersion: 0,
          recordId,
          commandId: regenerationId(n * 100 + 40),
          confirmed: true,
        } satisfies DriveMachineRequest,
      };
    }
    async function saved(id: string): Promise<MachineRegeneration> {
      const value = await db.uow.run((u) => u.machineRegenerations.find(id));
      if (!value) throw Error("C0_MACHINE");
      return value;
    }
    it.each([
      "html",
      "markdown",
    ] as const)("admits %s with one binding and same-id generic job without OpenRouter", async (format) => {
      const row = await seed(format === "html" ? 301 : 302, format);
      const result = await requestDriveMachineRegeneration(
        c,
        row.token,
        row.input,
      );
      const value = await saved(result.jobId);
      expect(value.source.format).toBe(format);
      expect(value.access.origin).toBe("drive-record");
      if (value.access.origin !== "drive-record") throw Error("C0_DRIVE");
      const bindingId = value.access.bindingId;
      await db.uow.run(async (u) => {
        const binding = await u.regenerationBindings.find(bindingId);
        const job = await u.jobs.find(value.id);
        expect(binding?.consumer).toEqual({
          kind: "machine-regeneration",
          id: value.id,
        });
        expect(binding?.originalId).toBe(row.originalId);
        expect(job?.originalId).toBe(row.originalId);
        expect(job?.useAi).toBe(false);
        expect(
          (await u.imports.findOriginal(row.originalId))?.activeJobId,
        ).toBe(value.id);
      });
      expect(c.machine?.input).toBe(shared.input);
      expect(c.machine?.execution).toBe(shared.execution);
      expect(c.machine?.ownership).toBe(shared.ownership);
      expect(c.machine?.drive?.execution).toBe(context.execution);
    });
    it("returns the same receipt and conflicts on changed record or confirmed revision", async () => {
      const row = await seed(303);
      const first = await requestDriveMachineRegeneration(
        c,
        row.token,
        row.input,
      );
      expect(
        await requestDriveMachineRegeneration(c, row.token, row.input),
      ).toEqual(first);
      await expect(
        requestDriveMachineRegeneration(c, row.token, {
          ...row.input,
          recordId: inputId(123),
        }),
      ).rejects.toMatchObject({ code: "REGENERATION_COMMAND_CHANGED" });
      await expect(
        requestDriveMachineRegeneration(c, row.token, {
          ...row.input,
          noteVersion: 1,
        }),
      ).rejects.toMatchObject({ code: "REGENERATION_COMMAND_CHANGED" });
    });
    it("rolls binding insertion back when the normal live-job fence rejects admission", async () => {
      const row = await seed(304);
      await db.uow.run(async (u) => {
        const old = await u.jobs.find(row.jobId);
        if (!old) throw Error("C0_JOB");
        await u.jobs.insert({
          ...old,
          id: regenerationId(30499),
          state: "queued",
          leaseToken: null,
          leaseUntil: null,
          failure: null,
          retryOf: null,
        });
      });
      const before = await db.client.execute(
        "SELECT count(*) AS n FROM regeneration_source_bindings",
      );
      const wakeCount = wakes;
      await expect(
        requestDriveMachineRegeneration(c, row.token, row.input),
      ).rejects.toMatchObject({ code: "REGENERATION_PROCESSING" });
      const after = await db.client.execute(
        "SELECT count(*) AS n FROM regeneration_source_bindings",
      );
      expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
      expect(wakes).toBe(wakeCount);
    });
    it("rechecks binding cancellation without depending on an active input receipt", async () => {
      const row = await seed(305);
      const result = await requestDriveMachineRegeneration(
        c,
        row.token,
        row.input,
      );
      const value = await saved(result.jobId);
      expect(value.inputReceipt).toBeNull();
      await db.uow.run(async (u) => {
        await currentDriveSource(u, {
          ...value,
          consumer: { kind: "machine-regeneration", id: value.id },
          fingerprint: value.requestDigest,
        });
        if (value.access.origin !== "drive-record") throw Error("C0_DRIVE");
        const binding = await u.regenerationBindings.find(
          value.access.bindingId,
        );
        if (
          !binding ||
          !(await u.regenerationBindings.replace(
            { ...binding, cancelGeneration: 1, version: binding.version + 1 },
            binding.version,
          ))
        )
          throw Error("C0_BINDING");
      });
      await expect(
        db.uow.run((u) =>
          currentDriveSource(u, {
            ...value,
            consumer: { kind: "machine-regeneration", id: value.id },
            fingerprint: value.requestDigest,
          }),
        ),
      ).rejects.toMatchObject({ code: "REGENERATION_SOURCE_INVALID" });
    });
    it("cancels an unclaimed Drive job without source IO and never retries it as local", async () => {
      const row = await seed(306);
      const result = await requestDriveMachineRegeneration(
        c,
        row.token,
        row.input,
      );
      await cancelMachineRegeneration(c, row.token, result.jobId);
      expect((await saved(result.jobId)).outcome).toBe("cancelled");
      await expect(
        retryMachineJob(c, row.token, result.jobId),
      ).rejects.toMatchObject({ code: "REGENERATION_RECONFIRM_SOURCE" });
    });
    async function llmContainer() {
      if (!c.drive || !context.services.provider) throw Error("C1_SOURCE_PAIR");
      const llm = await createNodeLlm(c, {
        shared,
        source: { provider: context.services.provider, drive: c.drive },
        storage: {
          put: unexpected,
          putBounded: unexpected,
          read: unexpected,
          stat: unexpected,
          stream: unexpected,
          remove: unexpected,
        },
        directory: "unused-with-shared",
        workerPath: "unused-with-shared",
        documentWorkerPath: "unused-with-shared",
        imageChildPath: "unused-with-shared",
        pdfPagesChildPath: "unused-with-shared",
        monthlyLimit: "30",
        profiles: { inspect: unexpected },
        wake() {},
      });
      const unavailable = (): never => {
        throw Error("C1_NO_PROVIDER_IO");
      };
      return {
        ...c,
        llm,
        openRouter: {
          authorization: {
            authorization: unexpected,
            exchange: unexpected,
            inspectCredential: unexpected,
          },
          catalog: { list: unexpected, fallback: unavailable },
          protector: {
            available: () => true,
            protect: unavailable,
            reveal: unavailable,
          },
          execution: { run: unexpected, stop: async () => {} },
        },
      };
    }
    it("C1 binds Drive LLM admission and immutable non-PDF recipe in the same transaction", async () => {
      const row = await seed(307);
      const l = await llmContainer();
      const input = {
        ...row.input,
        expectedEpoch: 1,
        modelId: "fixture/text",
        instruction: "整える",
      };
      const result = await requestDriveLlmRegeneration(l, row.token, input);
      expect(await requestDriveLlmRegeneration(l, row.token, input)).toEqual(
        result,
      );
      await db.uow.run(async (u) => {
        const value = await u.llmConversions.find(result.jobId);
        if (!value || value.access.origin !== "drive-record")
          throw Error("C1_DRIVE");
        const binding = await u.regenerationBindings.find(
          value.access.bindingId,
        );
        expect(binding?.consumer).toEqual({
          kind: "llm-conversion",
          id: value.jobId,
        });
        expect(binding?.executorId).toBe(row.accountId);
        expect(value.sourceOwnershipGeneration).toBeNull();
        expect(value.pdfProof).toBeNull();
        expect((await u.jobs.find(value.jobId))?.originalId).toBe(
          row.originalId,
        );
        expect(l.llm.execution).toBe(shared.execution);
        await currentLlmSource(u, value, now);
      });
      await expect(
        requestDriveMachineRegeneration(l, row.token, row.input),
      ).rejects.toMatchObject({ code: "REGENERATION_COMMAND_CHANGED" });
      await expect(
        retryLlmJob(l, row.token, result.jobId),
      ).rejects.toMatchObject({ code: "LLM_RETRY_SOURCE_CHANGED" });
    });
    it("C1 current validation fences cancellation through positive binding generation without changing the LLM codec", async () => {
      const row = await seed(308, "markdown");
      const l = await llmContainer();
      const result = await requestDriveLlmRegeneration(l, row.token, {
        ...row.input,
        expectedEpoch: 1,
        modelId: "fixture/text",
        instruction: "",
      });
      const value = await db.uow.run(async (u) => {
        const value = await u.llmConversions.find(result.jobId);
        if (!value || value.access.origin !== "drive-record")
          throw Error("C1_DRIVE");
        const binding = await u.regenerationBindings.find(
          value.access.bindingId,
        );
        if (!binding) throw Error("C1_BINDING");
        await u.regenerationBindings.replace(
          { ...binding, cancelGeneration: 1, version: binding.version + 1 },
          binding.version,
        );
        return value;
      });
      await expect(
        db.uow.run((u) => currentLlmSource(u, value, now)),
      ).rejects.toMatchObject({ code: "LLM_SOURCE_CHANGED" });
    });
  },
);

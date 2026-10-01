import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { currentLlmSource } from "@repo/core/application/llm/current";
import {
  getPdfPreview,
  readyPdfPreview,
} from "@repo/core/application/llm/pdfPreview";
import {
  getRegenerationSource,
  getRegenerationSources,
} from "@repo/core/application/regeneration/read";
import type {
  DriveBackupRecord,
  DriveBackupTarget,
} from "@repo/core/domain/integration/driveBackup";
import type { LlmFixedConversion } from "@repo/core/domain/llm/entity";
import type { PdfPreview } from "@repo/core/domain/llm/pdfPreview";
import type {
  MachineRegeneration,
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
import {
  regenerationId as id,
  regenerationNow as now,
  regenerationDatabase,
  seedRegenerationLocal,
} from "./regenerationFixtures";

type Seed = Awaited<ReturnType<typeof seedRegenerationLocal>>;
const none = { state: "none", runtimeId: null, token: null } as const;
const active = {
  state: "active",
  runtimeId: id(90001),
  token: id(90002),
} as const;
const deadline = new Date(now.getTime() + 1800000);
const folder = {
  id: "source-folder",
  name: "Source",
  driveId: null,
  resourceKeyEnvelope: null,
  checkedAt: now,
};

describe.skipIf(!process.env.HOLLOW_REGENERATION_TEST_ROOT)(
  "regeneration S1 on one isolated database",
  () => {
    let base: Awaited<ReturnType<typeof regenerationDatabase>>;
    let c: ReturnType<typeof createHollowContainer>;
    let failed = false;
    const metas: { fixtureClosed?: boolean }[] = [];
    let sequence = 100000;
    const next = () => id(++sequence);
    beforeAll(async () => {
      base = await regenerationDatabase("application");
      c = {
        ...createHollowContainer(base.db, "http://fixture.invalid", {
          send: async () => {
            throw Error("UNEXPECTED_MAIL");
          },
        }),
        clock: { now: () => now },
      };
    });
    beforeEach((context) => {
      if (failed) context.skip();
      metas.push(context.task.meta);
      context.task.meta.regenerationStage = 1;
    });
    afterEach((context) => {
      if (context.task.result?.state !== "pass") failed = true;
    });
    afterAll(() => {
      base?.client.close();
      for (const meta of metas) meta.fixtureClosed = true;
    });

    async function connect(
      u: HollowUnitOfWorkContext,
      accountId: string,
      subject: string,
    ) {
      const old = await u.driveConnections.ensure(accountId, now);
      const adopted = {
        ...old,
        state: "linked" as const,
        epoch: old.epoch + 1,
        credentialVersion: old.credentialVersion + 1,
        version: old.version + 1,
        settingsVersion: old.settingsVersion + 1,
        folder: null,
        lastUsedAt: null,
        autoBackup: false,
        updatedAt: now,
        credential: {
          subject,
          email: null,
          envelope: "synthetic-not-a-key",
          scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
          connectedAt: now,
          accessExpiresAt: deadline,
        },
      };
      expect(
        await u.driveConnections.replace(adopted, old.version, "adopt"),
      ).toBe(true);
      const linked = {
        ...adopted,
        folder,
        version: adopted.version + 1,
        settingsVersion: adopted.settingsVersion + 1,
      };
      expect(
        await u.driveConnections.replace(linked, adopted.version, "folder"),
      ).toBe(true);
      return linked;
    }
    async function record(s: Seed, recorder = s.accountId) {
      return base.uow.run(async (u) => {
        const subject = `source-${next()}`;
        const linked = await connect(u, recorder, subject);
        const target: DriveBackupTarget = {
          id: next(),
          originalId: s.originalId,
          noteId: s.noteId,
          accountId: recorder,
          subject,
          marker: next(),
          folder,
          folderEpoch: linked.epoch,
          state: "unallocated",
          fileId: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        await u.driveBackupTargets.insertInitial(target);
        const allocated = {
          ...target,
          state: "allocated" as const,
          fileId: `file-${next()}`,
          version: 2,
        };
        expect(await u.driveBackupTargets.replace(allocated, 1)).toBe(true);
        expect(
          await u.driveBackupTargets.replace(
            { ...allocated, state: "confirmed", version: 3 },
            2,
          ),
        ).toBe(true);
        const value: DriveBackupRecord = {
          id: next(),
          version: 1,
          targetId: target.id,
          noteId: s.noteId,
          originalId: s.originalId,
          accountId: recorder,
          subject,
          fileId: allocated.fileId,
          folder,
          bytes: 5,
          sha256: "a".repeat(64),
          createdAt: now,
          webViewLink: null,
          resourceKeyEnvelope: null,
        };
        await u.driveBackupRecords.insert(value);
        return { value, linked };
      });
    }
    function machine(
      s: Seed,
      bindingId: string | null = null,
    ): MachineRegeneration {
      return {
        id: next(),
        executorId: s.accountId,
        noteId: s.noteId,
        originalId: s.originalId,
        commandId: next(),
        requestDigest: "b".repeat(64),
        access: bindingId
          ? { origin: "drive-record", bindingId }
          : { origin: "local-original", bindingId: null },
        sourceMemoryBytes: 0,
        source: { sha256: "a".repeat(64), bytes: 5, format: "html" },
        noteVersion: 0,
        ownershipGeneration: 1,
        originalRevisionNo: 1,
        previous: {
          state: "ready",
          coverage: "complete",
          activeJobId: s.jobId,
        },
        phase: "queued",
        outcome: "pending",
        failure: null,
        resultVersion: null,
        owner: none,
        cancelGeneration: 0,
        version: 1,
        createdAt: now,
        deadlineAt: deadline,
        updatedAt: now,
        terminalAt: null,
      };
    }
    function binding(
      s: Seed,
      r: Awaited<ReturnType<typeof record>>,
      consumer: SourceBinding["consumer"],
      bindingId = next(),
    ): SourceBinding {
      return {
        id: bindingId,
        recordId: r.value.id,
        executorId: s.accountId,
        credentialOwnerId: r.value.accountId,
        noteId: s.noteId,
        originalId: s.originalId,
        subject: r.value.subject,
        driveEpoch: r.linked.epoch,
        ownershipGeneration: 1,
        fingerprint: "c".repeat(64),
        consumer,
        cancelGeneration: 0,
        version: 1,
        createdAt: now,
      };
    }
    async function pair(n: number) {
      const s = await seedRegenerationLocal(base, n, false, false, {
        consumers: false,
        format: "html",
      });
      const r = await record(s);
      const bId = next();
      const m = machine(s, bId);
      const b = binding(s, r, { kind: "machine-regeneration", id: m.id }, bId);
      await base.uow.run(async (u) => {
        await u.regenerationBindings.insert(b);
        await u.machineRegenerations.insert(m);
      });
      return { s, r, b, m };
    }
    function attempt(
      bindingId: string,
    ): Extract<SourceAttempt, { phase: "queued" }> {
      return {
        id: next(),
        bindingId,
        ordinal: 1,
        purpose: "acquire",
        phase: "queued",
        owner: none,
        completion: null,
        credentialVersion: 1,
        cancelGeneration: 0,
        version: 1,
        deadlineAt: deadline,
        createdAt: now,
        updatedAt: now,
      };
    }
    async function session(accountId: string) {
      const token = `synthetic-session-${accountId}`;
      await base.uow.run((u) =>
        u.accounts.saveSession({
          accountId,
          tokenHash: c.tokens.hash(token),
          expiresAt: deadline,
        }),
      );
      return token;
    }

    it("commits exact reciprocal pairs, rejects orphan commits and keeps failed transactions empty", async (context) => {
      const p = await pair(20);
      context.task.meta.regenerationStage = 2;
      expect(
        await base.uow.run((u) => u.regenerationBindings.find(p.b.id)),
      ).toEqual(p.b);
      expect(
        await base.uow.run((u) => u.machineRegenerations.find(p.m.id)),
      ).toEqual(p.m);
      expect(
        await base.uow.run((u) =>
          u.machineRegenerations.command(p.m.executorId, p.m.commandId),
        ),
      ).toEqual(p.m);
      const orphan = {
        ...p.b,
        id: next(),
        consumer: { kind: "machine-regeneration" as const, id: next() },
      };
      await expect(
        base.uow.run((u) => u.regenerationBindings.insert(orphan)),
      ).rejects.toBeDefined();
      expect(
        await base.uow.run((u) => u.regenerationBindings.find(orphan.id)),
      ).toBeNull();
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.insert({
            ...p.m,
            id: next(),
            commandId: next(),
            access: { origin: "drive-record", bindingId: next() },
          }),
        ),
      ).rejects.toBeDefined();
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.insert({
            ...p.m,
            id: next(),
            commandId: next(),
            access: { origin: "local-original", bindingId: null },
          }),
        ),
      ).rejects.toBeDefined();
      expect(
        await base.uow.run((u) =>
          u.machineRegenerations.replace({ ...p.m, version: 3 }, 2),
        ),
      ).toBe(false);
      await expect(
        base.uow.run((u) =>
          u.regenerationBindings.replace(
            { ...p.b, fingerprint: "d".repeat(64), version: 2 },
            1,
          ),
        ),
      ).rejects.toBeDefined();
    });

    it("permits never-owned cancellation redaction only with explicit safe pair teardown", async (context) => {
      const p = await pair(21);
      const a = attempt(p.b.id);
      await base.uow.run((u) => u.regenerationAttempts.insert(a));
      context.task.meta.regenerationStage = 2;
      const cancelled: MachineRegeneration = {
        ...p.m,
        phase: "terminal",
        outcome: "cancelled",
        cancelGeneration: 1,
        terminalAt: now,
        version: 2,
      };
      await base.uow.run((u) => u.machineRegenerations.replace(cancelled, 1));
      await expect(
        base.uow.run(async (u) => {
          await u.machineRegenerations.remove(p.m.id);
          await u.regenerationBindings.remove(p.b.id);
        }),
      ).rejects.toBeDefined();
      const redacted: MachineRegeneration = {
        ...cancelled,
        access: { origin: "redacted", bindingId: null },
        version: 3,
      };
      await expect(
        base.uow.run((u) => u.machineRegenerations.replace(redacted, 2)),
      ).rejects.toBeDefined();
      const stopped: SourceAttempt = {
        ...a,
        phase: "terminal",
        cancelGeneration: 1,
        completion: { kind: "never-owned", outcome: "cancelled" },
        version: 2,
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(stopped, 1));
      await base.uow.run(async (u) => {
        expect(await u.machineRegenerations.replace(redacted, 2)).toBe(true);
        await u.regenerationAttempts.removeReleased(p.b.id);
        await u.regenerationBindings.remove(p.b.id);
      });
      expect(
        await base.uow.run((u) => u.machineRegenerations.find(p.m.id)),
      ).toEqual(redacted);
      expect(
        await base.uow.run((u) => u.regenerationAttempts.find(a.id)),
      ).toBeNull();
      await base.uow.run((u) => u.machineRegenerations.remove(p.m.id));
    });

    it("retains unknown, closed-but-unacknowledged attempts and consumed memory until both owners end", async (context) => {
      const p = await pair(22);
      const a = attempt(p.b.id);
      await base.uow.run((u) => u.regenerationAttempts.insert(a));
      const running: MachineRegeneration = {
        ...p.m,
        owner: active,
        phase: "acquiring",
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
        version: 2,
      };
      await base.uow.run((u) => u.machineRegenerations.replace(running, 1));
      let held: Extract<SourceAttempt, { phase: "active" | "unknown" }> = {
        ...a,
        phase: "active",
        owner: active,
        version: 2,
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(held, 1));
      held = {
        ...held,
        phase: "unknown",
        owner: { ...active, state: "unknown" },
        version: 3,
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(held, 2));
      context.task.meta.regenerationStage = 2;
      await base.uow.run((u) => u.regenerationAttempts.removeReleased(p.b.id));
      expect(
        await base.uow.run((u) => u.regenerationAttempts.find(a.id)),
      ).toEqual(held);
      const done: MachineRegeneration = {
        ...running,
        phase: "terminal",
        outcome: "cancelled",
        cancelGeneration: 1,
        owner: { ...active, state: "closed" },
        version: 3,
        terminalAt: now,
      };
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace({ ...done, sourceMemoryBytes: 0 }, 2),
        ),
      ).rejects.toBeDefined();
      const completion = {
        kind: "closed" as const,
        proofId: next(),
        callerEnded: false,
        acknowledged: false,
        outcome: "failed" as const,
        failure: "SOURCE_UNAVAILABLE",
        digest: null,
      };
      const closed: SourceAttempt = {
        ...held,
        phase: "terminal",
        owner: { ...active, state: "closed" },
        completion,
        version: 4,
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(closed, 3));
      await expect(
        base.uow.run((u) =>
          u.regenerationAttempts.replace(
            {
              ...closed,
              version: 5,
              completion: { ...completion, acknowledged: true },
            },
            4,
          ),
        ),
      ).rejects.toBeDefined();
      const ended: SourceAttempt = {
        ...closed,
        version: 5,
        completion: { ...completion, callerEnded: true },
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(ended, 4));
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace({ ...done, sourceMemoryBytes: 0 }, 2),
        ),
      ).rejects.toBeDefined();
      const acked: SourceAttempt = {
        ...ended,
        version: 6,
        completion: { ...completion, callerEnded: true, acknowledged: true },
      };
      await base.uow.run((u) => u.regenerationAttempts.replace(acked, 5));
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            { ...running, sourceMemoryBytes: 0, version: 3 },
            2,
          ),
        ),
      ).rejects.toBeDefined();
      await base.uow.run((u) =>
        u.machineRegenerations.replace({ ...done, sourceMemoryBytes: 0 }, 2),
      );
      await expect(
        base.uow.run((u) =>
          u.regenerationAttempts.replace(
            {
              ...acked,
              version: 7,
              completion: {
                ...completion,
                callerEnded: true,
                acknowledged: true,
                proofId: next(),
              },
            },
            6,
          ),
        ),
      ).rejects.toBeDefined();
      await base.uow.run(async (u) => {
        await u.machineRegenerations.replace(
          {
            ...done,
            sourceMemoryBytes: 0,
            access: { origin: "redacted", bindingId: null },
            version: 4,
          },
          3,
        );
        await u.regenerationAttempts.removeReleased(p.b.id);
        await u.regenerationBindings.remove(p.b.id);
      });
    });

    it("bounds numeric reservations globally and rejects stale actor/source without allocating real buffers", async (context) => {
      const s1 = await seedRegenerationLocal(base, 23, false, false, {
        consumers: false,
        format: "html",
      });
      const s2 = await seedRegenerationLocal(base, 24, false, false, {
        consumers: false,
        format: "html",
      });
      const s3 = await seedRegenerationLocal(base, 25, false, false, {
        consumers: false,
        format: "html",
      });
      const values = [machine(s1), machine(s2), machine(s3)];
      for (const m of values)
        await base.uow.run((u) => u.machineRegenerations.insert(m));
      context.task.meta.regenerationStage = 2;
      for (const m of values.slice(0, 2))
        await base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...m,
              phase: "preparing",
              owner: active,
              sourceMemoryBytes: SOURCE_MEMORY_BYTES,
              version: 2,
            },
            1,
          ),
        );
      const third = values[2]!;
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...third,
              phase: "preparing",
              owner: active,
              sourceMemoryBytes: SOURCE_MEMORY_BYTES,
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      const first = values[0]!;
      await expect(
        base.client.execute({
          sql: "DELETE FROM machine_regenerations WHERE id=?",
          args: [first.id],
        }),
      ).rejects.toBeDefined();
      await base.uow.run((u) =>
        u.machineRegenerations.replace(
          {
            ...first,
            phase: "terminal",
            outcome: "unknown",
            owner: { ...active, state: "unknown" },
            sourceMemoryBytes: SOURCE_MEMORY_BYTES,
            terminalAt: now,
            version: 3,
          },
          2,
        ),
      );
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...third,
              phase: "preparing",
              owner: active,
              sourceMemoryBytes: SOURCE_MEMORY_BYTES,
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      for (const m of values.slice(0, 2))
        await base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...m,
              phase: "terminal",
              outcome: "cancelled",
              cancelGeneration: 1,
              owner: { ...active, state: "closed" },
              terminalAt: now,
              version: m.id === first.id ? 4 : 3,
            },
            m.id === first.id ? 3 : 2,
          ),
        );
      await base.client.execute({
        sql: "UPDATE notes SET version=version+1 WHERE id=?",
        args: [s3.noteId],
      });
      await expect(
        base.uow.run((u) =>
          u.machineRegenerations.replace(
            {
              ...third,
              phase: "preparing",
              owner: active,
              sourceMemoryBytes: SOURCE_MEMORY_BYTES,
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
    });

    it("keeps explicit local legacy claims and refuses null/unknown origins at SQL boundaries", async (context) => {
      const local = await seedRegenerationLocal(base, 26);
      const preview = await seedRegenerationLocal(base, 27, false, false, {
        consumers: "preview",
      });
      context.task.meta.regenerationStage = 2;
      const llm = await base.uow.run((u) => u.llmConversions.find(local.jobId));
      const pdf = await base.uow.run((u) =>
        u.llmPdfPreviews.find(preview.previewId),
      );
      if (!llm || !pdf) throw Error("FIXTURE_ROW");
      expect(llm?.access).toEqual({
        origin: "local-original",
        bindingId: null,
      });
      expect(pdf?.access).toEqual({
        origin: "local-original",
        bindingId: null,
      });
      expect(llm?.sourceMemoryBytes).toBe(0);
      expect(pdf?.sourceMemoryBytes).toBe(0);
      await expect(
        base.uow.run((u) =>
          u.llmConversions.replace(
            {
              ...llm,
              access: { origin: "drive-record", bindingId: next() },
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      await expect(
        base.uow.run((u) =>
          u.llmPdfPreviews.replace(
            {
              ...pdf,
              access: { origin: "drive-record", bindingId: next() },
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      for (const source of [null, "unknown", "drive-record", "redacted"]) {
        await expect(
          base.client.execute({
            sql: "UPDATE llm_conversions SET source_origin=?,version=version+1 WHERE job_id=?",
            args: [source, local.jobId],
          }),
        ).rejects.toBeDefined();
        await expect(
          base.client.execute({
            sql: "UPDATE llm_pdf_previews SET source_origin=?,version=version+1 WHERE id=?",
            args: [source, preview.previewId],
          }),
        ).rejects.toBeDefined();
      }
      const claimed = await base.uow.run((u) =>
        u.llmConversions.claim(now, next(), next()),
      );
      const claimedPdf = await base.uow.run((u) =>
        u.llmPdfPreviews.claim(now, next(), next()),
      );
      expect(claimed?.jobId).toBe(local.jobId);
      expect(claimedPdf?.id).toBe(preview.previewId);
      if (
        !claimed ||
        !claimedPdf ||
        claimed.owner.state !== "active" ||
        claimedPdf.owner.state !== "active"
      )
        throw Error("FIXTURE_ROW");
      await base.uow.run((u) =>
        u.llmConversions.replace(
          { ...claimed, sourceMemoryBytes: SOURCE_MEMORY_BYTES, version: 3 },
          2,
        ),
      );
      await base.uow.run((u) =>
        u.llmPdfPreviews.replace(
          { ...claimedPdf, sourceMemoryBytes: SOURCE_MEMORY_BYTES, version: 3 },
          2,
        ),
      );
      await expect(
        base.uow.run((u) =>
          u.llmConversions.replace(
            { ...claimed, sourceMemoryBytes: 0, version: 4 },
            3,
          ),
        ),
      ).rejects.toBeDefined();
      await expect(
        base.uow.run((u) =>
          u.llmPdfPreviews.replace(
            { ...claimedPdf, sourceMemoryBytes: 0, version: 4 },
            3,
          ),
        ),
      ).rejects.toBeDefined();
      await base.uow.run((u) =>
        u.llmConversions.replace(
          {
            ...claimed,
            phase: "terminal",
            outcome: { kind: "cancelled" },
            cancelGeneration: 1,
            owner: {
              state: "closed",
              runtimeId: claimed.owner.runtimeId!,
              token: claimed.owner.token!,
            },
            sourceMemoryBytes: 0,
            version: 4,
          },
          3,
        ),
      );
      await base.uow.run((u) =>
        u.llmPdfPreviews.replace(
          {
            ...claimedPdf,
            state: "cancelled",
            cancelGeneration: 1,
            owner: {
              state: "closed",
              runtimeId: claimedPdf.owner.runtimeId!,
              token: claimedPdf.owner.token!,
            },
            sourceMemoryBytes: 0,
            version: 4,
          },
          3,
        ),
      );
      const ready = await seedRegenerationLocal(base, 34, false, true);
      expect(
        (
          await base.uow.run((u) =>
            readyPdfPreview(
              u,
              ready.accountId,
              {
                previewId: ready.previewId,
                noteId: ready.noteId,
                noteVersion: 0,
                expectedEpoch: 1,
              },
              now,
            ),
          )
        ).state,
      ).toBe("ready");
    });

    it("round-trips bound LLM/PDF rows but excludes them from legacy claim/current and pruning", async (context) => {
      const l = await seedRegenerationLocal(base, 32, false, false, {
        consumers: false,
      });
      const p = await seedRegenerationLocal(base, 33, false, false, {
        consumers: false,
      });
      const lr = await record(l);
      const pr = await record(p);
      const lb = binding(l, lr, { kind: "llm-conversion", id: l.jobId });
      const pb = binding(p, pr, { kind: "pdf-preview", id: p.previewId });
      const llm: LlmFixedConversion = {
        access: { origin: "drive-record", bindingId: lb.id },
        sourceMemoryBytes: 0,
        jobId: l.jobId,
        accountId: l.accountId,
        noteId: l.noteId,
        commandId: next(),
        requestDigest: "e".repeat(64),
        operation: "regenerate",
        retryOf: null,
        sourceState: "ready",
        sourceCoverage: "complete",
        noteVersion: 0,
        originalRevisionNo: null,
        credentialEpoch: 1,
        instruction: "",
        admissionSequence: 1,
        createdAt: now,
        deadlineAt: deadline,
        updatedAt: now,
        owner: { state: "idle", runtimeId: null, token: null },
        cancelGeneration: 0,
        responseBudget: 0,
        version: 1,
        selection: "fixed",
        modelId: "fixture/text",
        phase: "queued",
        outcome: { kind: "pending" },
        source: {
          kind: "original",
          format: "pdf",
          originalId: l.originalId,
          sha256: "a".repeat(64),
          bytes: 5,
        },
        preparationVersion: 2,
        promptVersion: 1,
        pdfProof: null,
        sourceOwnershipGeneration: null,
      };
      const pdf: PdfPreview & { state: "queued" } = {
        id: p.previewId,
        accountId: p.accountId,
        commandId: next(),
        requestDigest: "f".repeat(64),
        noteId: p.noteId,
        noteVersion: 0,
        ownershipGeneration: 1,
        source: {
          kind: "original",
          format: "pdf",
          originalId: p.originalId,
          sha256: "a".repeat(64),
          bytes: 5,
        },
        access: { origin: "drive-record", bindingId: pb.id },
        sourceMemoryBytes: 0,
        credentialEpoch: 1,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 300000),
        updatedAt: now,
        cancelGeneration: 0,
        version: 1,
        state: "queued",
        owner: { state: "idle", runtimeId: null, token: null },
      };
      await base.uow.run(async (u) => {
        await u.regenerationBindings.insert(lb);
        await u.llmConversions.insert(llm);
        await u.regenerationBindings.insert(pb);
        await u.llmPdfPreviews.insert(pdf);
      });
      context.task.meta.regenerationStage = 2;
      expect(await base.uow.run((u) => u.llmConversions.find(l.jobId))).toEqual(
        llm,
      );
      expect(
        await base.uow.run((u) => u.llmPdfPreviews.find(p.previewId)),
      ).toEqual(pdf);
      const configured = {
        ...c,
        llm: new Proxy({ configured: true } as NonNullable<typeof c.llm>, {
          get(_target, key) {
            if (key === "configured") return true;
            throw Error("UNEXPECTED_LLM_OPERATION");
          },
        }),
      };
      const view = await getPdfPreview(configured, await session(p.accountId), {
        noteId: p.noteId,
        commandId: pdf.commandId,
      });
      expect(view?.current).toBe(false);
      expect(view?.usable).toBe(false);
      for (const access of [
        { origin: "local-original", bindingId: null },
        { origin: "drive-record", bindingId: next() },
      ] as const) {
        await expect(
          base.uow.run((u) =>
            u.llmConversions.replace({ ...llm, access, version: 2 }, 1),
          ),
        ).rejects.toBeDefined();
        await expect(
          base.uow.run((u) =>
            u.llmPdfPreviews.replace({ ...pdf, access, version: 2 }, 1),
          ),
        ).rejects.toBeDefined();
      }
      await expect(
        base.uow.run((u) =>
          u.llmConversions.replace(
            {
              ...llm,
              access: { origin: "redacted", bindingId: null },
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      await expect(
        base.uow.run((u) =>
          u.llmPdfPreviews.replace(
            {
              ...pdf,
              access: { origin: "redacted", bindingId: null },
              version: 2,
            },
            1,
          ),
        ),
      ).rejects.toBeDefined();
      expect(
        await base.uow.run((u) => u.llmConversions.claim(now, next(), next())),
      ).toBeNull();
      await expect(
        base.uow.run((u) => currentLlmSource(u, llm, now)),
      ).rejects.toBeDefined();
      const cancelled: LlmFixedConversion = {
        ...llm,
        phase: "terminal",
        outcome: { kind: "cancelled" },
        cancelGeneration: 1,
        version: 2,
      };
      await base.uow.run((u) => u.llmConversions.replace(cancelled, 1));
      expect(
        await base.uow.run((u) => u.llmPdfPreviews.claim(now, next(), next())),
      ).toBeNull();
      await base.client.execute({
        sql: "UPDATE llm_pdf_previews SET state='cancelled',cancel_generation=1,version=version+1 WHERE id=?",
        args: [p.previewId],
      });
      await expect(
        base.client.execute({
          sql: "DELETE FROM llm_conversions WHERE job_id=?",
          args: [l.jobId],
        }),
      ).rejects.toBeDefined();
      await expect(
        base.client.execute({
          sql: "DELETE FROM llm_pdf_previews WHERE id=?",
          args: [p.previewId],
        }),
      ).rejects.toBeDefined();
      await base.uow.run(async (u) => {
        await u.llmConversions.prune(deadline, 100);
        await u.llmPdfPreviews.prune(deadline, 100);
      });
      expect(
        (await base.uow.run((u) => u.llmConversions.find(l.jobId)))?.access,
      ).toEqual(llm.access);
      expect(
        (await base.uow.run((u) => u.llmPdfPreviews.find(p.previewId)))?.access,
      ).toEqual(pdf.access);
      await base.uow.run(async (u) => {
        expect(
          await u.llmConversions.replace(
            {
              ...cancelled,
              access: { origin: "redacted", bindingId: null },
              version: 3,
            },
            2,
          ),
        ).toBe(true);
        expect(
          await u.llmPdfPreviews.replace(
            {
              ...pdf,
              state: "cancelled",
              cancelGeneration: 1,
              access: { origin: "redacted", bindingId: null },
              version: 3,
            },
            2,
          ),
        ).toBe(true);
        await u.regenerationBindings.remove(lb.id);
        await u.regenerationBindings.remove(pb.id);
      });
      expect(
        (await base.uow.run((u) => u.llmConversions.find(l.jobId)))?.access
          .origin,
      ).toBe("redacted");
      expect(
        (await base.uow.run((u) => u.llmPdfPreviews.find(p.previewId)))?.access
          .origin,
      ).toBe("redacted");
    });

    it("pages all record owners by exact note and tie keyset with current editor authorization", async (context) => {
      const s = await seedRegenerationLocal(base, 28, false, false, {
        consumers: false,
        format: "html",
      });
      const other = await seedRegenerationLocal(base, 29, false, false, {
        consumers: false,
        format: "html",
      });
      const token = await session(s.accountId);
      const records: DriveBackupRecord[] = [];
      for (let i = 0; i < 26; i++)
        records.push(
          (await record(s, i === 25 ? s.accountId : other.accountId)).value,
        );
      context.task.meta.regenerationStage = 2;
      const page = await getRegenerationSources(c, token, { noteId: s.noteId });
      expect(page.items.map((v) => v.recordId)).toEqual(
        records.slice(0, 25).map((r) => r.id),
      );
      expect(page.items.every((v) => !v.mine)).toBe(true);
      expect(page.next).not.toBeNull();
      expect(
        new TextEncoder().encode(JSON.stringify(page)).byteLength,
      ).toBeLessThanOrEqual(16384);
      expect(Object.keys(page.items[0]!).sort()).toEqual([
        "availability",
        "bytes",
        "createdAt",
        "format",
        "mine",
        "reason",
        "recordId",
      ]);
      const rest = await getRegenerationSources(c, token, {
        noteId: s.noteId,
        cursor: page.next,
      });
      expect(rest.items.map((v) => v.recordId)).toEqual([records[25]!.id]);
      expect(rest.next).toBeNull();
      expect(rest.items[0]?.availability).toBe("available");
      expect(
        await getRegenerationSource(c, token, {
          noteId: s.noteId,
          recordId: records[25]!.id,
        }),
      ).toEqual(rest.items[0]);
      await expect(
        getRegenerationSources(c, token, {
          noteId: s.noteId,
          cursor: { ...page.next!, digest: "0".repeat(64) },
        }),
      ).rejects.toBeDefined();
      await expect(
        getRegenerationSources(c, token, {
          noteId: other.noteId,
          cursor: page.next,
        }),
      ).rejects.toBeDefined();
      await expect(
        getRegenerationSource(c, await session(other.accountId), {
          noteId: other.noteId,
          recordId: records[0]!.id,
        }),
      ).rejects.toBeDefined();
      await expect(
        getRegenerationSources(c, null, { noteId: s.noteId }),
      ).rejects.toBeDefined();
      await base.uow.run((u) => u.accounts.deleteSession(c.tokens.hash(token)));
      await expect(
        getRegenerationSources(c, token, {
          noteId: s.noteId,
          cursor: page.next,
        }),
      ).rejects.toBeDefined();
    });

    it("allows a current workspace editor after recorder leaves but rejects viewer and lost edit role", async (context) => {
      const editor = await seedRegenerationLocal(base, 30, false, false, {
        consumers: false,
        format: "html",
      });
      const workspaceId = next();
      await base.uow.run(async (u) => {
        await u.workspaces.create({
          id: workspaceId,
          creatorId: editor.accountId,
          name: "Source",
          description: "",
          slug: null,
          state: "active",
          createdAt: now,
        });
        await u.workspaces.join(workspaceId, editor.accountId, "owner", now);
        await u.workspaces.join(workspaceId, id(2601), "owner", now);
      });
      const recorder = await seedRegenerationLocal(base, 31, false, false, {
        consumers: false,
        format: "html",
        workspaceId,
      });
      await base.uow.run((u) =>
        u.workspaces.join(workspaceId, recorder.accountId, "editor", now),
      );
      const r = await record(recorder);
      await base.uow.run((u) =>
        u.workspaces.membership(workspaceId, recorder.accountId, null),
      );
      const token = await session(editor.accountId);
      context.task.meta.regenerationStage = 2;
      expect(
        (
          await getRegenerationSource(c, token, {
            noteId: recorder.noteId,
            recordId: r.value.id,
          })
        ).availability,
      ).toBe("available");
      await base.uow.run((u) =>
        u.workspaces.membership(workspaceId, editor.accountId, "viewer"),
      );
      await expect(
        getRegenerationSources(c, token, { noteId: recorder.noteId }),
      ).rejects.toBeDefined();
      await base.uow.run((u) =>
        u.workspaces.membership(workspaceId, editor.accountId, "editor"),
      );
      expect(
        (await getRegenerationSources(c, token, { noteId: recorder.noteId }))
          .items.length,
      ).toBe(1);
      await base.uow.run((u) =>
        u.workspaces.membership(workspaceId, editor.accountId, null),
      );
      await expect(
        getRegenerationSource(c, token, {
          noteId: recorder.noteId,
          recordId: r.value.id,
        }),
      ).rejects.toBeDefined();
    });

    it("finishes with formal ledger, foreign keys and immutable originals/records intact", async () => {
      expect(
        (await base.client.execute("PRAGMA foreign_key_check")).rows.length,
      ).toBe(0);
      expect(
        (
          await base.client.execute(
            "SELECT count(*) AS n FROM __drizzle_migrations",
          )
        ).rows[0]?.n,
      ).toBe(43);
      expect(
        (await base.client.execute("SELECT count(*) AS n FROM originals"))
          .rows[0]?.n,
      ).toBe(15);
      expect(
        (
          await base.client.execute(
            "SELECT count(*) AS n FROM drive_backup_records",
          )
        ).rows[0]?.n,
      ).toBe(32);
      expect(
        (
          await base.client.execute(
            "SELECT coalesce(sum(source_memory_bytes),0) AS n FROM machine_regenerations",
          )
        ).rows[0]?.n,
      ).toBe(0);
    });
  },
);

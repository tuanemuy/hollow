import {
  captureBackup,
  insertSnapshotJob,
} from "@repo/core/application/integration/drive/backup/admission";
import {
  previewDriveBackup,
  requestDriveBackupBulk,
} from "@repo/core/application/integration/drive/backup/bulk";
import { getDriveBackup } from "@repo/core/application/integration/drive/backup/read";
import {
  cancelDriveBackup,
  requestDriveBackup,
} from "@repo/core/application/integration/drive/backup/request";
import {
  previewDriveBackupRetarget,
  type RetargetInput,
  retargetDriveBackup,
} from "@repo/core/application/integration/drive/backup/retarget";
import { backupPhase } from "@repo/core/application/integration/drive/backup/runner";
import { reconcileDriveClosures } from "@repo/core/application/integration/drive/runner";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_BACKUP_LIMITS,
  type DriveBackupFailure,
  type DriveBackupJob,
  type DriveBackupTransfer,
} from "@repo/core/domain/integration/driveBackup";
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
  driveBackupJobs,
  driveBackupRecords,
  driveBackupRequests,
  driveBackupTargetHeads,
  driveBackupTargets,
  driveBackupTransfers,
} from "../driveBackupSchema";
import { objectWrites } from "../purgeSchema";
import {
  type BackupCase,
  type BackupFixture,
  backupCase,
  backupConfigured,
  backupFixture,
  finite,
} from "./driveBackupFixtures";

describe.skipIf(!backupConfigured)(
  "retarget current head on one isolated DB",
  () => {
    let fixture: BackupFixture;
    let scenario: BackupCase | undefined;
    const f = () => fixture;
    const s = () => {
      if (!scenario)
        throw new BusinessRuleError("FIXTURE", "検証状態を確認してください。");
      return scenario;
    };
    beforeAll(async () => {
      fixture = await backupFixture({ retarget: true });
    });
    beforeEach(async (context) => {
      if (f().failed) context.skip();
      scenario = await backupCase(f());
    });
    afterEach(async (context) => {
      const owned = scenario;
      scenario = undefined;
      const clean = context.task.result?.state === "pass";
      if (!clean) f().failed = true;
      if (owned)
        try {
          await owned.close(
            clean,
            clean &&
              context.task.name.startsWith("keeps head/transfer evidence"),
          );
        } catch {
          f().failed = true;
          throw new BusinessRuleError(
            `FIXTURE_CLOSE_${owned.closeStage}`,
            "検証資源の終了を確認できません。",
          );
        }
    });
    afterAll(async () => {
      await fixture?.close();
    });
    const actor = () => f().actors[0]!;
    async function oldRows() {
      return {
        targets: await f().db.select().from(driveBackupTargets),
        requests: await f().db.select().from(driveBackupRequests),
        jobs: await f().db.select().from(driveBackupJobs),
        transfers: await f().db.select().from(driveBackupTransfers),
        records: await f().db.select().from(driveBackupRecords),
      };
    }
    async function folder(id = "replacement-folder") {
      await f().uow.run(async (u) => {
        const old = await u.driveConnections.find(actor().accountId);
        if (old?.state !== "linked" || !old.folder)
          throw new BusinessRuleError(
            "FIXTURE",
            "連携状態を確認してください。",
          );
        const resourceKeyEnvelope = s().service.protector.protect(
          "fixture-folder-resource",
          {
            purpose: "resource-key",
            accountId: old.accountId,
            subject: old.credential.subject,
            epoch: old.epoch,
            fileId: id,
          },
        );
        expect(
          await u.driveConnections.replace(
            {
              ...old,
              version: old.version + 1,
              settingsVersion: old.settingsVersion + 1,
              folder: {
                ...old.folder,
                id,
                name: "Replacement folder",
                resourceKeyEnvelope,
              },
            },
            old.version,
            "folder",
          ),
        ).toBe(true);
      });
    }
    async function offer(
      noteId = f().originals[0]!.noteId,
    ): Promise<RetargetInput> {
      const dto = await previewDriveBackupRetarget(s().c, actor().request, {
        noteId,
      });
      expect(dto.actor.accountId).toBe(actor().accountId);
      expect(dto.preview.kind).toBe("available");
      if (dto.preview.kind !== "available")
        throw new BusinessRuleError(
          "FIXTURE_OFFER",
          "受付状態を確認してください。",
        );
      const p = dto.preview;
      return {
        noteId,
        commandId: f().id(),
        expectedEpoch: p.epoch,
        expectedSettingsVersion: p.settingsVersion,
        expectedHeadTargetId: p.headTargetId,
        expectedHeadVersion: p.headVersion,
        expectedTargetVersion: p.targetVersion,
        expectedDigest: p.expectedDigest,
      };
    }
    async function cancelled(index = 0) {
      const old = await s().admission(actor(), f().originals[index]!);
      expect(old.transfer).toBeDefined();
      expect(
        await cancelDriveBackup(s().c, actor().request, {
          jobId: old.receipt.jobId,
        }),
      ).toEqual({ cancelled: true });
      return old;
    }
    async function newTransfer(jobId: string) {
      const row = await f().uow.run((u) =>
        u.driveBackupTransfers.forJob(jobId),
      );
      if (row.kind !== "found")
        throw new BusinessRuleError("FIXTURE", "受付状態を確認してください。");
      return row.row;
    }
    async function history(
      seed: DriveBackupTransfer,
      failure: DriveBackupFailure,
      session: string | null = null,
    ) {
      return f().uow.run(async (u) => {
        const requestId = f().id();
        const jobId = f().id();
        const now = s().controls.now;
        await u.driveBackupRequests.insert({
          id: requestId,
          accountId: seed.identity.accountId,
          commandId: f().id(),
          intentDigest: "b".repeat(64),
          kind: "manual",
          version: 1,
          createdAt: now,
          cancelledAt: null,
          count: 1,
        });
        const job: DriveBackupJob = {
          id: jobId,
          requestId,
          accountId: seed.identity.accountId,
          ordinal: 0,
          attempt: 1,
          retryOf: null,
          noteId: seed.identity.noteId,
          targetId: seed.targetId,
          title: "Retained original",
          admissionIdentity: seed.identity,
          rootOrdinal: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
          state: "queued",
          bytes: 0,
          terminalAt: null,
        };
        await u.driveBackupJobs.insert(job);
        const initial: DriveBackupTransfer = {
          id: f().id(),
          jobId,
          targetId: seed.targetId,
          identity: seed.identity,
          owner: { state: "none" },
          credentialVersion: seed.credentialVersion,
          version: 1,
          cancelGeneration: 0,
          received: 0,
          sessionEnvelope: null,
          statusAttempts: 0,
          readPinned: false,
          refreshPending: false,
          phase: "queued",
          createdAt: now,
          updatedAt: now,
          deadlineAt: seed.deadlineAt,
        };
        await u.driveBackupTransfers.insert(initial);
        const started = backupPhase(
          initial,
          "checking",
          {
            owner: {
              state: "active",
              runtimeGeneration: "old-runtime",
              token: f().id(),
            },
          },
          now,
        );
        expect(
          await u.driveBackupTransfers.claim(started, initial.version),
        ).toBe(true);
        if (started.owner.state !== "active")
          throw new BusinessRuleError(
            "FIXTURE",
            "所有状態を確認してください。",
          );
        const closed = backupPhase(
          started,
          "failed",
          {
            failure,
            owner: { ...started.owner, state: "closed" },
            sessionEnvelope: session,
          },
          now,
        );
        expect(
          await u.driveBackupTransfers.replace(closed, started.version),
        ).toBe(true);
        expect(
          await u.driveBackupJobs.replace(
            { ...job, version: 2, state: "failed", failure, terminalAt: now },
            job.version,
          ),
        ).toBe(true);
        return closed;
      });
    }
    it("replaces an unsent cancelled head, preserves all old rows and receipts, and stores only the new result", async () => {
      const old = await cancelled();
      await folder();
      const input = await offer();
      const before = await oldRows();
      const receipt = await retargetDriveBackup(s().c, actor().request, input);
      expect(receipt.accepted).toBe(true);
      const after = await oldRows();
      for (const key of [
        "targets",
        "requests",
        "jobs",
        "transfers",
        "records",
      ] as const)
        expect(
          after[key].filter((row) =>
            before[key].some((prior) => prior.id === row.id),
          ),
        ).toEqual(before[key]);
      const next = await newTransfer(receipt.jobId);
      expect(next.targetId).not.toBe(old.transfer!.targetId);
      expect(next.identity.folder.id).toBe("replacement-folder");
      expect(await retargetDriveBackup(s().c, actor().request, input)).toEqual({
        ...receipt,
        accepted: false,
      });
      expect(
        await requestDriveBackup(s().c, actor().request, old.input),
      ).toEqual({ ...old.receipt, accepted: false });
      const oldReceipt = await getDriveBackup(s().c, actor().request, {
        noteId: input.noteId,
        commandId: old.input.commandId,
      });
      expect(oldReceipt.receipt?.jobs[0]?.state).toBe("cancelled");
      const oldTarget = await f().uow.run((u) =>
        u.driveBackupTargets.find(old.transfer!.targetId),
      );
      if (!oldTarget)
        throw new BusinessRuleError("FIXTURE", "対象状態を確認してください。");
      expect(
        await finite(() =>
          f().uow.run((u) =>
            u.driveBackupTargets.replace(
              {
                ...oldTarget,
                state: "allocated",
                fileId: "forbidden-file",
                version: oldTarget.version + 1,
              },
              oldTarget.version,
            ),
          ),
        ),
      ).not.toBe("resolved");
      expect(await s().run(next.id)).toBe("resolved");
      await reconcileDriveClosures(s().c);
      const current = await getDriveBackup(s().c, actor().request, {
        noteId: input.noteId,
        commandId: input.commandId,
      });
      expect(current.records).toHaveLength(1);
      expect(current.receipt?.jobs[0]?.state).toBe("succeeded");
      expect(s().calls.start).toBe(1);
    });
    it("accepts both definite trash and ambiguous folder failure only after physical close and ACK", async () => {
      for (const [index, failure] of [
        [0, "trashed"],
        [2, "missing"],
      ] as const) {
        s().controls.folder = failure;
        const old = await s().admission(actor(), f().originals[index]!);
        expect(await s().run(old.transfer!.id)).toBe("resolved");
        await reconcileDriveClosures(s().c);
        const closed = await f().uow.run((u) =>
          u.driveBackupTransfers.find(old.transfer!.id),
        );
        expect(closed).toMatchObject({
          phase: "failed",
          owner: { state: "closed" },
          received: 0,
          sessionEnvelope: null,
          readPinned: false,
        });
        expect(s().calls.allocate).toBe(0);
      }
      s().controls.folder = "usable";
      await folder();
      const oldRow = (
        await f().uow.run(async (u) =>
          u.driveBackupTransfers.forTarget(
            (await u.driveBackupTargets.original(
              f().originals[0]!.id,
              actor().accountId,
              `backup-subject-${actor().accountId}`,
            ))!.id,
          ),
        )
      )[0]!;
      const writeId = f().id();
      await f().db.insert(objectWrites).values({
        id: writeId,
        runtime: "synthetic-held",
        kind: "drive-backup",
        ownerId: oldRow.id,
        active: true,
        noteId: oldRow.identity.noteId,
        ownershipGeneration: oldRow.identity.ownershipGeneration,
        createdAt: s().controls.now,
      });
      expect(
        (
          await previewDriveBackupRetarget(s().c, actor().request, {
            noteId: oldRow.identity.noteId,
          })
        ).preview.kind,
      ).toBe("unavailable");
      await f().uow.run((u) => u.objectOperations.endWrite(writeId));
      for (const index of [0, 2]) {
        const input = await offer(f().originals[index]!.noteId);
        expect(
          (await retargetDriveBackup(s().c, actor().request, input)).accepted,
        ).toBe(true);
      }
    });
    it("does not treat active, allocated-zero-byte, or unknown-session evidence as never sent", async () => {
      const active = await s().admission();
      await folder();
      expect(
        (
          await previewDriveBackupRetarget(s().c, actor().request, {
            noteId: active.original.noteId,
          })
        ).preview,
      ).toEqual({ kind: "unavailable", reason: "active" });
      await cancelDriveBackup(s().c, actor().request, {
        jobId: active.receipt.jobId,
      });
      const target = await f().uow.run((u) =>
        u.driveBackupTargets.find(active.transfer!.targetId),
      );
      if (!target)
        throw new BusinessRuleError("FIXTURE", "対象状態を確認してください。");
      await f().uow.run((u) =>
        u.driveBackupTargets.replace(
          {
            ...target,
            state: "allocated",
            fileId: "allocated-zero",
            version: target.version + 1,
          },
          target.version,
        ),
      );
      expect(
        (
          await previewDriveBackupRetarget(s().c, actor().request, {
            noteId: active.original.noteId,
          })
        ).preview,
      ).toEqual({ kind: "unavailable", reason: "resolve-old-result" });
      const other = await cancelled(2);
      const original = await f().uow.run((u) =>
        u.driveBackupTransfers.find(other.transfer!.id),
      );
      if (!original)
        throw new BusinessRuleError("FIXTURE", "受付状態を確認してください。");
      await history(original, "DRIVE_BACKUP_UNKNOWN", "opaque-session");
      await folder("third-folder");
      expect(
        (
          await previewDriveBackupRetarget(s().c, actor().request, {
            noteId: other.original.noteId,
          })
        ).preview.kind,
      ).toBe("unavailable");
      expect(s().calls.allocate).toBe(0);
    });
    it("rejects stale folder/actor/digest and competing confirmations without changing old or accepted heads", async () => {
      await cancelled();
      await folder();
      const stale = await offer();
      await folder("third-folder");
      const before = await oldRows();
      expect(
        await finite(() => retargetDriveBackup(s().c, actor().request, stale)),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(await oldRows()).toEqual(before);
      const input = await offer();
      expect(
        await finite(() =>
          retargetDriveBackup(s().c, f().actors[1]!.request, input),
        ),
      ).not.toBe("resolved");
      expect(
        await finite(() =>
          retargetDriveBackup(s().c, actor().request, {
            ...input,
            expectedDigest: "changed",
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      const result = await retargetDriveBackup(s().c, actor().request, input);
      expect(
        await finite(() =>
          retargetDriveBackup(s().c, actor().request, {
            ...input,
            commandId: f().id(),
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect((await newTransfer(result.jobId)).identity.folder.id).toBe(
        "third-folder",
      );
      expect(await f().db.select().from(driveBackupTargetHeads)).toHaveLength(
        1,
      );
    });
    it("checks 130 historical transfers and refuses unknown evidence outside the first 100", async () => {
      const old = await cancelled();
      const seed = await f().uow.run((u) =>
        u.driveBackupTransfers.find(old.transfer!.id),
      );
      if (!seed)
        throw new BusinessRuleError("FIXTURE", "受付状態を確認してください。");
      for (let i = 0; i < 129; i++)
        await history(
          seed,
          i === 128 ? "DRIVE_BACKUP_UNKNOWN" : "DRIVE_BACKUP_FOLDER_TRASHED",
        );
      await folder();
      const tuple = {
        originalId: old.original.id,
        accountId: actor().accountId,
        subject: seed.identity.subject,
      };
      const first = await f().uow.run((u) =>
        u.driveBackupTargets.closedOwners(tuple, null, 100),
      );
      expect(first.items).toHaveLength(100);
      expect(first.nextAfter).not.toBeNull();
      const second = await f().uow.run((u) =>
        u.driveBackupTargets.closedOwners(tuple, first.nextAfter, 100),
      );
      expect(second.items).toHaveLength(29);
      expect(second.nextAfter).toBeNull();
      expect(
        (
          await previewDriveBackupRetarget(s().c, actor().request, {
            noteId: old.original.noteId,
          })
        ).preview.kind,
      ).toBe("unavailable");
      expect(s().calls.allocate).toBe(0);
    });
    it("shares initial heads with capture/bulk and never repoints an old captured job", async () => {
      const original = f().originals[0]!;
      const old = await cancelled();
      const captured = await f().uow.run(async (u) => {
        const note = await u.notes.findById(original.noteId);
        const connection = await u.driveConnections.find(actor().accountId);
        if (!note || connection?.state !== "linked" || !connection.folder)
          throw new BusinessRuleError(
            "FIXTURE",
            "連携状態を確認してください。",
          );
        return captureBackup(s().c, u, actor().accountId, note, original, {
          ...connection,
          folder: connection.folder,
        });
      });
      expect(old.transfer!.targetId).toBe(captured.target.id);
      const selection = { workspaceId: null, noteIds: [original.noteId] };
      const beforeBulk = await previewDriveBackup(
        s().c,
        actor().request,
        selection,
      );
      await folder();
      const input = await offer();
      await retargetDriveBackup(s().c, actor().request, input);
      expect(
        await finite(() =>
          requestDriveBackupBulk(s().c, actor().request, {
            ...selection,
            commandId: f().id(),
            expectedDigest: beforeBulk.digest,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        await finite(() =>
          requestDriveBackup(s().c, actor().request, {
            ...old.input,
            commandId: f().id(),
            expectedEpoch: input.expectedEpoch,
            expectedSettingsVersion: input.expectedSettingsVersion,
            kind: "redo",
            priorJobId: old.receipt.jobId,
            priorJobVersion: 2,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      const parent = await f().uow.run((u) =>
        u.driveBackupRequests.find(old.receipt.requestId),
      );
      if (!parent)
        throw new BusinessRuleError("FIXTURE", "受付状態を確認してください。");
      expect(
        await finite(() =>
          f().uow.run((u) => insertSnapshotJob(s().c, u, parent, captured, 1)),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        (await f().uow.run((u) => u.driveBackupJobs.find(old.receipt.jobId)))
          ?.targetId,
      ).toBe(captured.target.id);
    });
    it("keeps head/transfer evidence after 90-day prune and rolls back a thrown head transaction", async () => {
      const old = await cancelled();
      await folder();
      const now = new Date(
        s().controls.now.getTime() + DRIVE_BACKUP_LIMITS.historyMs + 1,
      );
      await f().uow.run((u) => u.driveBackupJobs.prune(now, 100));
      expect(
        await f().uow.run((u) =>
          u.driveBackupJobs.history(actor().accountId, new Date(1), 100),
        ),
      ).toEqual([]);
      expect(
        await f().uow.run((u) => u.driveBackupTransfers.find(old.transfer!.id)),
      ).toMatchObject({ jobId: null, phase: "cancelled" });
      const input = await offer();
      const before = await oldRows();
      const heads = await f().db.select().from(driveBackupTargetHeads);
      expect(
        await finite(() =>
          retargetDriveBackup(
            {
              ...s().c,
              unitOfWorkProvider: {
                run: (work) =>
                  f().uow.run(async (u) => {
                    await work(u);
                    throw new BusinessRuleError(
                      "ROLLBACK",
                      "検証用ロールバックです。",
                    );
                  }),
              },
            },
            actor().request,
            input,
          ),
        ),
      ).toBe("ROLLBACK");
      expect(await oldRows()).toEqual(before);
      expect(await f().db.select().from(driveBackupTargetHeads)).toEqual(heads);
      expect(
        (await retargetDriveBackup(s().c, actor().request, input)).accepted,
      ).toBe(true);
    });
  },
);

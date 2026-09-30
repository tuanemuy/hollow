import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { cancelDriveBackups } from "@repo/core/application/integration/drive/backup/cancellation";
import {
  getDriveBackup,
  getDriveBackupHistory,
} from "@repo/core/application/integration/drive/backup/read";
import { backupSessionBinding } from "@repo/core/application/integration/drive/backup/recovery";
import {
  cancelDriveBackup,
  requestDriveBackup,
} from "@repo/core/application/integration/drive/backup/request";
import {
  backupPhase,
  runDriveBackup,
} from "@repo/core/application/integration/drive/backup/runner";
import {
  beginDriveAuthorization,
  driveFolderConfirmation,
  exchangeDriveAuthorization,
} from "@repo/core/application/integration/drive/connection";
import { disconnectDrive } from "@repo/core/application/integration/drive/control";
import { reconcileDriveClosures } from "@repo/core/application/integration/drive/runner";
import { moveNoteInTransaction } from "@repo/core/application/move/usecases";
import { beginNotePurge } from "@repo/core/application/note/purge";
import { trashNoteInTransaction } from "@repo/core/application/note/trash";
import { requestWorkspaceDeletion } from "@repo/core/application/workspace/deletion";
import {
  changeWorkspaceMember,
  leaveWorkspace,
} from "@repo/core/application/workspace/membership";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveOwner } from "@repo/core/domain/integration/drive";
import { DRIVE_BACKUP_LIMITS } from "@repo/core/domain/integration/driveBackup";
import { createNote } from "@repo/core/domain/note/entity";
import { trashLifecycle } from "@repo/core/domain/note/lifecycle";
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
  type BackupCase,
  type BackupFixture,
  backupCase,
  backupConfigured,
  backupFixture,
  backupFixtureCreatedAt,
  backupFixtureHistory,
  backupNow,
  finite,
  gate,
} from "./driveBackupFixtures";

describe.skipIf(!backupConfigured)(
  "Drive backup application on one isolated DB",
  () => {
    let fixture: BackupFixture | undefined;
    let scenario: BackupCase | undefined;
    function f() {
      if (!fixture)
        throw new BusinessRuleError(
          "FIXTURE_MISSING",
          "検証器具がありません。",
        );
      return fixture;
    }
    function s() {
      if (!scenario)
        throw new BusinessRuleError(
          "FIXTURE_MISSING",
          "検証器具がありません。",
        );
      return scenario;
    }
    beforeAll(async () => {
      fixture = await backupFixture();
    });
    beforeEach(async (context) => {
      if (f().failed) context.skip();
      scenario = await backupCase(f());
    });
    afterEach(async (context) => {
      const owned = scenario;
      scenario = undefined;
      const clean = context.task.result?.state === "pass";
      if (!clean && fixture) fixture.failed = true;
      if (owned) {
        try {
          await owned.close(clean);
        } catch {
          f().failed = true;
          throw new BusinessRuleError(
            "FIXTURE_CLOSE_FAILED",
            "検証資源の終了を確認できません。DBは保持しています。",
          );
        }
      }
    });
    afterAll(async () => {
      const owned = fixture;
      fixture = undefined;
      await owned?.close();
    });
    async function row(id: string) {
      const value = await f().uow.run((u) => u.driveBackupTransfers.find(id));
      if (!value)
        throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
      return value;
    }
    async function deleteClaim(key: string) {
      const token = f().id();
      return f().uow.run(async (u) => {
        const claimed = await u.objectOperations.claimDelete(
          key,
          token,
          null,
          backupNow,
          new Date(backupNow.getTime() + 1000),
        );
        if (claimed) await u.objectOperations.releaseDelete(key, token);
        return claimed;
      });
    }
    async function rollback(
      work: (c: HollowContainer, u: HollowUnitOfWorkContext) => Promise<void>,
    ) {
      const wakes = s().calls.wakes;
      expect(
        await finite(() =>
          f().uow.run(async (u) => {
            const scoped = {
              ...s().c,
              unitOfWorkProvider: {
                run: <T>(
                  fn: (context: HollowUnitOfWorkContext) => Promise<T>,
                ) => fn(u),
              },
            };
            await work(scoped, u);
            throw new BusinessRuleError(
              "FIXTURE_ROLLBACK",
              "検証用ロールバックです。",
            );
          }),
        ),
      ).toBe("FIXTURE_ROLLBACK");
      expect(s().calls.wakes).toBe(wakes);
    }

    async function interrupted() {
      s().controls.unknownFirst = true;
      s().controls.queryKind = "unknown";
      const accepted = await s().admission();
      await s().run(accepted.transfer!.id);
      const old = await row(accepted.transfer!.id);
      expect(
        old.phase === "failed" &&
          old.owner.state === "closed" &&
          old.sessionEnvelope !== null,
      ).toBe(true);
      s().controls.unknownFirst = false;
      s().controls.queryKind = null;
      return { accepted, old };
    }
    async function retry(old: Awaited<ReturnType<typeof row>>) {
      const connection = await f().uow.run((u) =>
        u.driveConnections.find(old.identity.accountId),
      );
      const receipt = await requestDriveBackup(s().c, f().actors[0]!.request, {
        kind: "retry",
        commandId: f().id(),
        noteId: old.identity.noteId,
        expectedEpoch: connection!.epoch,
        expectedSettingsVersion: connection!.settingsVersion,
        priorTransferId: old.id,
        priorVersion: old.version,
      });
      const result = await f().uow.run((u) =>
        u.driveBackupTransfers.forJob(receipt.jobId),
      );
      if (result.kind !== "found")
        throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
      return result.row;
    }
    it("S2 initial accepts a new command after unstarted cancellation without changing the old receipt", async () => {
      const first = await s().admission();
      await cancelDriveBackup(s().c, first.actor.request, {
        jobId: first.receipt.jobId,
      });
      const old = await row(first.transfer!.id);
      const oldJob = await f().uow.run((u) =>
        u.driveBackupJobs.find(first.receipt.jobId),
      );
      expect(
        await requestDriveBackup(s().c, first.actor.request, first.input),
      ).toEqual({ ...first.receipt, accepted: false });
      expect(
        await f().uow.run((u) =>
          u.driveBackupTransfers.canStartUnallocated(old.targetId),
        ),
      ).toBe(true);
      const [a, b] = await Promise.all([s().admission(), s().admission()]);
      expect(a.receipt.jobId).toBe(b.receipt.jobId);
      expect(a.receipt.jobId).not.toBe(first.receipt.jobId);
      expect(Number(a.receipt.accepted) + Number(b.receipt.accepted)).toBe(1);
      const exact = await f().uow.run((u) =>
        u.driveBackupTransfers.forJob(a.receipt.jobId),
      );
      if (exact.kind !== "found")
        throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
      const nextJob = await f().uow.run((u) =>
        u.driveBackupJobs.find(a.receipt.jobId),
      );
      expect(nextJob?.retryOf).toBeNull();
      expect(nextJob?.attempt).toBe(1);
      expect(exact.row.targetId).toBe(old.targetId);
      expect(exact.row.identity.folder).toEqual(old.identity.folder);
      await s().run(exact.row.id);
      expect((await row(exact.row.id)).phase).toBe("succeeded");
      expect(s().calls.allocate === 1 && s().calls.start === 1).toBe(true);
      expect(await row(old.id)).toEqual(old);
      expect(
        await f().uow.run((u) => u.driveBackupJobs.find(first.receipt.jobId)),
      ).toEqual(oldJob);
    });
    it("S2 initial rejects a different current folder key after unstarted cancellation", async () => {
      const first = await s().admission();
      await cancelDriveBackup(s().c, first.actor.request, {
        jobId: first.receipt.jobId,
      });
      const old = await row(first.transfer!.id);
      await f().uow.run(async (u) => {
        const c = await u.driveConnections.find(first.actor.accountId);
        if (c?.state !== "linked" || !c.folder)
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        expect(
          await u.driveConnections.replace(
            {
              ...c,
              version: c.version + 1,
              settingsVersion: c.settingsVersion + 1,
              folder: {
                ...c.folder,
                resourceKeyEnvelope: s().service.protector.protect(
                  "different",
                  {
                    purpose: "resource-key",
                    accountId: c.accountId,
                    subject: c.credential.subject,
                    epoch: c.epoch,
                    fileId: c.folder.id,
                  },
                ),
              },
            },
            c.version,
            "folder",
          ),
        ).toBe(true);
      });
      expect(await finite(() => s().admission())).toBe("DRIVE_BACKUP_UNKNOWN");
      expect(await row(old.id)).toEqual(old);
      expect(s().calls.opens + s().calls.allocate + s().calls.start).toBe(0);
    });
    it("S2 initial rejects an allocated target even when its transfer was cancelled before claim", async () => {
      const first = await s().admission();
      await f().uow.run(async (u) => {
        const target = await u.driveBackupTargets.find(
          first.transfer!.targetId,
        );
        if (!target)
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        expect(
          await u.driveBackupTargets.replace(
            {
              ...target,
              state: "allocated",
              fileId: "fixture-reserved",
              version: target.version + 1,
            },
            target.version,
          ),
        ).toBe(true);
      });
      await cancelDriveBackup(s().c, first.actor.request, {
        jobId: first.receipt.jobId,
      });
      expect(
        await f().uow.run((u) =>
          u.driveBackupTransfers.canStartUnallocated(first.transfer!.targetId),
        ),
      ).toBe(false);
      expect(await finite(() => s().admission())).toBe("DRIVE_BACKUP_UNKNOWN");
      expect(s().calls.allocate + s().calls.start).toBe(0);
    });
    it("S2 initial rejects an old started owner outside the latest hundred cancelled rows", async () => {
      const first = await s().admission();
      const initial = first.transfer!;
      await f().uow.run(async (u) => {
        const parent = await u.driveBackupRequests.find(
          first.receipt.requestId,
        );
        const job = await u.driveBackupJobs.find(first.receipt.jobId);
        if (!parent || !job || job.state !== "queued")
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        const owner: DriveOwner = {
          state: "active",
          runtimeGeneration: s().execution.runtimeGeneration,
          token: f().id(),
        };
        const claimed = backupPhase(
          initial,
          "checking",
          {
            owner,
          },
          backupNow,
        );
        expect(
          await u.driveBackupTransfers.claim(claimed, initial.version),
        ).toBe(true);
        const [cancelled] = await u.driveBackupTransfers.cancel(
          { kind: "note", noteId: initial.identity.noteId },
          backupNow,
        );
        if (!cancelled || cancelled.owner.state !== "active")
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        expect(
          await u.driveBackupTransfers.replace(
            {
              ...cancelled,
              owner: { ...cancelled.owner, state: "closed" },
              version: cancelled.version + 1,
            },
            cancelled.version,
          ),
        ).toBe(true);
        for (let index = 1; index <= backupFixtureHistory.rows; index++) {
          const at = backupFixtureCreatedAt(index);
          const requestId = f().id();
          const jobId = f().id();
          await u.driveBackupRequests.insert({
            ...parent,
            id: requestId,
            commandId: f().id(),
            createdAt: at,
          });
          await u.driveBackupJobs.insert({
            ...job,
            id: jobId,
            requestId,
            createdAt: at,
            updatedAt: at,
          });
          await u.driveBackupTransfers.insert({
            ...initial,
            id: f().id(),
            jobId,
            createdAt: at,
            updatedAt: at,
          });
          await u.driveBackupTransfers.cancel(
            { kind: "note", noteId: initial.identity.noteId },
            at,
          );
        }
      });
      const shown = await f().uow.run((u) =>
        u.driveBackupTransfers.forTarget(initial.targetId),
      );
      expect(shown).toHaveLength(100);
      expect(
        shown.every((v) => v.phase === "cancelled" && v.owner.state === "none"),
      ).toBe(true);
      expect(
        await f().uow.run((u) =>
          u.driveBackupTransfers.canStartUnallocated(initial.targetId),
        ),
      ).toBe(false);
      expect(await finite(() => s().admission())).toBe("DRIVE_BACKUP_UNKNOWN");
      expect(s().calls.opens + s().calls.allocate + s().calls.start).toBe(0);
    });
    it("S2 initial does not replace a failed session", async () => {
      const { old } = await interrupted();
      expect(await finite(() => s().admission())).toBe("DRIVE_BACKUP_UNKNOWN");
      expect(await row(old.id)).toEqual(old);
      expect(s().calls.start).toBe(1);
    });
    it("S2 initial deduplicates instead of replacing a physically unproven owner", async () => {
      s().controls.holdClose = true;
      const first = await s().admission();
      await s().run(first.transfer!.id);
      const held = await row(first.transfer!.id);
      expect(held.owner.state).toBe("unknown");
      const again = await s().admission();
      expect(again.receipt).toEqual({ ...first.receipt, accepted: false });
      expect(await row(held.id)).toEqual(held);
      expect(s().calls.allocate === 1 && s().calls.start === 1).toBe(true);
      s().releasePhysical();
      await reconcileDriveClosures(s().c);
      await s().retirePins();
    });
    it("S2 initial exact job lookup distinguishes missing, unique and ambiguous rows", async () => {
      const first = await s().admission();
      expect(
        await f().uow.run((u) => u.driveBackupTransfers.forJob(f().id())),
      ).toEqual({ kind: "missing" });
      expect(
        (
          await f().uow.run((u) =>
            u.driveBackupTransfers.forJob(first.receipt.jobId),
          )
        ).kind,
      ).toBe("found");
      await rollback(async (_c, u) => {
        const old = first.transfer!;
        expect(
          await u.driveBackupTransfers.replace(
            backupPhase(old, "cancelled", { cancelGeneration: 1 }, backupNow),
            old.version,
          ),
        ).toBe(true);
        await u.driveBackupTransfers.insert({ ...old, id: f().id() });
        expect(
          await u.driveBackupTransfers.forJob(first.receipt.jobId),
        ).toEqual({ kind: "ambiguous" });
      });
      expect((await row(first.transfer!.id)).phase).toBe("queued");
    });
    it("S2 rejects an original-less note before backup rows, source, owner or provider effects", async () => {
      const noteId = f().id();
      await f().uow.run((u) =>
        u.notes.insert(
          createNote(
            {
              id: noteId,
              accountId: f().actors[0]!.accountId,
              title: "No original",
              html: "<p>empty</p>",
              text: "empty",
            },
            backupNow,
          ),
        ),
      );
      const commandId = f().id();
      const connection = await f().uow.run((u) =>
        u.driveConnections.find(f().actors[0]!.accountId),
      );
      expect(
        await finite(() =>
          requestDriveBackup(s().c, f().actors[0]!.request, {
            commandId,
            noteId,
            expectedEpoch: connection!.epoch,
            expectedSettingsVersion: connection!.settingsVersion,
          }),
        ),
      ).toBe("DRIVE_BACKUP_SOURCE_INVALID");
      expect(
        await f().uow.run((u) =>
          u.driveBackupRequests.command(f().actors[0]!.accountId, commandId),
        ),
      ).toBeNull();
      expect(
        await f().uow.run((u) =>
          u.driveBackupTransfers.live({ kind: "note", noteId }),
        ),
      ).toHaveLength(0);
      expect(
        await f().uow.run((u) =>
          u.driveBackupRecords.forNote(noteId, f().actors[0]!.accountId),
        ),
      ).toHaveLength(0);
      expect(
        s().calls.opens +
          s().calls.allocate +
          s().calls.start +
          s().calls.query +
          s().calls.inspect,
      ).toBe(0);
    });
    it("S2 serializes concurrent distinct commands onto one live target and one upload", async () => {
      const [a, b] = await Promise.all([s().admission(), s().admission()]);
      expect(a.receipt.jobId).toBe(b.receipt.jobId);
      expect(Number(a.receipt.accepted) + Number(b.receipt.accepted)).toBe(1);
      await s().run(a.transfer!.id);
      expect((await row(a.transfer!.id)).phase).toBe("succeeded");
      expect(s().calls.allocate === 1 && s().calls.start === 1).toBe(true);
    });
    it("S2 reuses the immutable record after ninety-day history pruning without uploading", async () => {
      const a = await s().admission();
      await s().run(a.transfer!.id);
      const saved = await f().uow.run((u) =>
        u.driveBackupRecords.target(a.transfer!.targetId),
      );
      const now = new Date(backupNow.getTime() + DRIVE_BACKUP_LIMITS.historyMs);
      await f().uow.run((u) => u.driveBackupJobs.prune(now, 100));
      expect(
        await f().uow.run((u) =>
          u.driveBackupJobs.history(a.actor.accountId, backupNow, 100),
        ),
      ).toHaveLength(0);
      const next = await s().admission();
      const job = await f().uow.run((u) =>
        u.driveBackupJobs.find(next.receipt.jobId),
      );
      expect(job?.state === "succeeded" && job.recordId === saved?.id).toBe(
        true,
      );
      expect(s().calls.allocate === 1 && s().calls.start === 1).toBe(true);
    });
    for (const position of [0, 1, -1, DRIVE_BACKUP_LIMITS.chunkBytes + 17])
      it(`S2 retries an old failed session conservatively at reported position ${position}`, async () => {
        const { old } = await interrupted();
        const beforeUploads = s().calls.uploads.length;
        s().controls.statusOffset = position;
        const next = await retry(old);
        expect(
          next.received === 0 &&
            next.sessionEnvelope === null &&
            next.phase === "queued",
        ).toBe(true);
        await s().run(next.id);
        const saved = await row(next.id);
        expect(saved.phase).toBe(position === 0 ? "succeeded" : "failed");
        expect(s().calls.uploads.length > beforeUploads).toBe(position === 0);
        expect(s().calls.start).toBe(1);
        expect(await row(old.id)).toEqual(old);
      });
    it("S2 accepts complete metadata from status independently of missing old intent", async () => {
      const { old } = await interrupted();
      const beforeUploads = s().calls.uploads.length;
      s().controls.queryKind = "complete";
      const next = await retry(old);
      await s().run(next.id);
      expect((await row(next.id)).phase).toBe("succeeded");
      expect(s().calls.uploads.length).toBe(beforeUploads);
      expect(await row(old.id)).toEqual(old);
    });
    for (const key of ["fixture-folder-resource", "different", null])
      it(`S2 compares target key semantics under old and new epoch AAD (${key === null ? "null" : key === "different" ? "different" : "same"})`, async () => {
        const { old } = await interrupted();
        const before = await f().uow.run((u) =>
          u.driveBackupTargets.find(old.targetId),
        );
        await f().uow.run(async (u) => {
          const connection = await u.driveConnections.find(
            old.identity.accountId,
          );
          if (connection?.state !== "linked")
            throw new BusinessRuleError(
              "FIXTURE_CONNECTION",
              "検証連携がありません。",
            );
          const epoch = connection.epoch + 1;
          const credentialVersion = connection.credentialVersion + 1;
          const credential = s().service.protector.reveal(
            connection.credential.envelope,
            {
              purpose: "credential",
              accountId: connection.accountId,
              subject: connection.credential.subject,
              epoch: connection.epoch,
              credentialVersion: connection.credentialVersion,
            },
          );
          const next = {
            ...connection,
            epoch,
            credentialVersion,
            version: connection.version + 1,
            settingsVersion: connection.settingsVersion + 1,
            folder: null,
            autoBackup: false,
            lastUsedAt: null,
            credential: {
              ...connection.credential,
              envelope: s().service.protector.protect(credential, {
                purpose: "credential",
                accountId: connection.accountId,
                subject: connection.credential.subject,
                epoch,
                credentialVersion,
              }),
            },
          };
          expect(
            await u.driveConnections.replace(next, connection.version, "adopt"),
          ).toBe(true);
          expect(
            await u.driveConnections.replace(
              {
                ...next,
                version: next.version + 1,
                settingsVersion: next.settingsVersion + 1,
                folder: {
                  ...connection.folder!,
                  resourceKeyEnvelope:
                    key === null
                      ? null
                      : s().service.protector.protect(key, {
                          purpose: "resource-key",
                          accountId: connection.accountId,
                          subject: connection.credential.subject,
                          epoch,
                          fileId: connection.folder!.id,
                        }),
                },
              },
              next.version,
              "folder",
            ),
          ).toBe(true);
        });
        const beforeUploads = s().calls.uploads.length;
        s().controls.statusOffset = 0;
        if (key === "fixture-folder-resource") {
          const next = await retry(old);
          expect(next.identity.epoch).toBe(old.identity.epoch + 1);
          expect(next.identity.folder).toEqual(before!.folder);
          await s().run(next.id);
          expect((await row(next.id)).phase).toBe("succeeded");
        } else {
          expect(await finite(() => retry(old))).not.toBe("resolved");
          expect(s().calls.uploads.length).toBe(beforeUploads);
        }
        expect(await row(old.id)).toEqual(old);
        const after = await f().uow.run((u) =>
          u.driveBackupTargets.find(old.targetId),
        );
        expect(after!.folder).toEqual(before!.folder);
        expect(after!.folderEpoch).toBe(before!.folderEpoch);
      });
    for (const kind of ["session-expired", "conflict", "unknown"] as const)
      it(`S2 recreates the same-ID session only after explicit ${kind}`, async () => {
        const { old } = await interrupted();
        s().controls.queryKind = kind;
        const next = await retry(old);
        await s().run(next.id);
        expect(s().calls.start).toBe(kind === "session-expired" ? 2 : 1);
        expect((await row(next.id)).phase).toBe(
          kind === "session-expired" ? "succeeded" : "failed",
        );
        expect(s().calls.allocate).toBe(1);
      });
    it("S2 does not repeat a start with an unrecorded Location even on explicit retry", async () => {
      s().controls.startUnknown = true;
      const accepted = await s().admission();
      await s().run(accepted.transfer!.id);
      const old = await row(accepted.transfer!.id);
      expect(old.sessionEnvelope).toBeNull();
      const next = await retry(old);
      await s().run(next.id);
      expect(
        s().calls.start === 1 &&
          s().calls.query === 0 &&
          s().calls.uploads.length === 0,
      ).toBe(true);
      expect((await row(next.id)).phase).toBe("failed");
    });
    it("S2 preserves retryOf past history expiry until its dependent transfer closes", async () => {
      const { old } = await interrupted();
      s().controls.statusOffset = 0;
      const next = await retry(old);
      const cutoff = new Date(
        backupNow.getTime() + DRIVE_BACKUP_LIMITS.historyMs,
      );
      await f().uow.run((u) => u.driveBackupJobs.prune(cutoff, 100));
      expect(
        await f().uow.run((u) => u.driveBackupJobs.find(old.jobId!)),
      ).not.toBeNull();
      expect(
        await f().uow.run((u) =>
          u.driveBackupJobs.history(old.identity.accountId, backupNow, 100),
        ),
      ).toHaveLength(0);
      await s().run(next.id);
      await f().uow.run((u) => u.driveBackupJobs.prune(cutoff, 100));
      expect(
        await f().uow.run((u) => u.driveBackupJobs.find(old.jobId!)),
      ).toBeNull();
      expect((await row(old.id)).jobId).toBeNull();
    });
    it("S2 preserves nonterminal upload intent through real local closure and reclaims with status first", async () => {
      const a = await s().admission();
      const owner = {
        state: "active" as const,
        runtimeGeneration: s().execution.runtimeGeneration,
        token: f().id(),
      };
      const target = {
        kind: "backup" as const,
        id: a.transfer!.id,
        owner: {
          runtimeGeneration: owner.runtimeGeneration,
          token: owner.token,
        },
      };
      expect(
        await finite(() =>
          s().execution.withCaller(
            target,
            () =>
              f().uow.run(async (u) => {
                const old = await u.driveBackupTransfers.find(target.id);
                const claimed = backupPhase(
                  old!,
                  "checking",
                  { owner, readPinned: true },
                  backupNow,
                );
                return (await u.driveBackupTransfers.claim(
                  claimed,
                  old!.version,
                ))
                  ? claimed
                  : null;
              }),
            async (claimed) => {
              const h = s().execution.run(target, async (signal) => {
                const savedTarget = await f().uow.run(async (u) => {
                  const old = await u.driveBackupTargets.find(claimed.targetId);
                  const next = {
                    ...old!,
                    state: "allocated" as const,
                    fileId: "backup-file",
                    version: old!.version + 1,
                  };
                  expect(
                    await u.driveBackupTargets.replace(next, old!.version),
                  ).toBe(true);
                  const sessionEnvelope = s().service.protector.protect(
                    "fixture-session",
                    backupSessionBinding(claimed, "backup-file"),
                  );
                  expect(
                    await u.driveBackupTransfers.replace(
                      backupPhase(
                        claimed,
                        "uploading",
                        {
                          sessionEnvelope,
                          offset: 0,
                          length: DRIVE_BACKUP_LIMITS.chunkBytes,
                        },
                        backupNow,
                      ),
                      claimed.version,
                    ),
                  ).toBe(true);
                  return next;
                });
                await s().service.backup!.provider.startResumable({
                  accessToken: "fixture",
                  signal,
                  fileId: "backup-file",
                  folderId: savedTarget.folder.id,
                  folderResourceKey: null,
                  marker: savedTarget.marker,
                  name: claimed.identity.name,
                  bytes: claimed.identity.bytes,
                });
                await s().service.backup!.provider.uploadChunk({
                  accessToken: "fixture",
                  signal,
                  session: "fixture-session",
                  bytes: claimed.identity.bytes,
                  offset: 0,
                  chunk: new Uint8Array(DRIVE_BACKUP_LIMITS.chunkBytes),
                });
                return true;
              });
              await h.result;
              await h.closed;
              throw new BusinessRuleError(
                "FIXTURE_SAVE_FAILED",
                "検証用保存失敗です。",
              );
            },
          ),
        ),
      ).toBe("FIXTURE_SAVE_FAILED");
      expect(s().execution.accepting()).toBe(false);
      const before = await row(target.id);
      expect(before.phase).toBe("uploading");
      expect(await reconcileDriveClosures(s().c)).toBe(1);
      const closed = await row(target.id);
      expect(
        closed.phase === "uploading" &&
          closed.owner.state === "closed" &&
          closed.received === 0 &&
          !closed.readPinned,
      ).toBe(true);
      expect(closed.sessionEnvelope).toBe(before.sessionEnvelope);
      expect(closed.deadlineAt).toEqual(before.deadlineAt);
      expect(s().execution.accepting()).toBe(true);
      await cancelDriveBackup(s().c, a.actor.request, {
        jobId: a.receipt.jobId,
      });
      await s().run(target.id);
      expect((await row(target.id)).phase).toBe("succeeded");
      expect(
        s().calls.start === 1 &&
          s().calls.query === 1 &&
          s().calls.uploads.at(-1)?.offset === DRIVE_BACKUP_LIMITS.chunkBytes,
      ).toBe(true);
    });
    it("persists one success, exact command replay and existing-record reuse without a second upload", async () => {
      const accepted = await s().admission();
      expect(accepted.receipt.accepted).toBe(true);
      expect(accepted.transfer).toBeDefined();
      expect(await s().run(accepted.transfer!.id)).toBe("resolved");
      const current = await row(accepted.transfer!.id);
      expect(current.phase).toBe("succeeded");
      expect(current.owner.state).toBe("closed");
      expect(current.readPinned || current.refreshPending).toBe(false);
      const replay = await requestDriveBackup(
        s().c,
        accepted.actor.request,
        accepted.input,
      );
      expect(replay).toEqual({ ...accepted.receipt, accepted: false });
      const newer = await s().admission(accepted.actor, accepted.original);
      const job = await f().uow.run((u) =>
        u.driveBackupJobs.find(newer.receipt.jobId),
      );
      expect(job?.state).toBe("succeeded");
      expect(s().calls.allocate).toBe(1);
      expect(s().calls.start).toBe(1);
      expect(s().calls.uploads).toEqual([
        { offset: 0, length: DRIVE_BACKUP_LIMITS.chunkBytes },
        { offset: DRIVE_BACKUP_LIMITS.chunkBytes, length: 17 },
      ]);
      const get = await getDriveBackup(s().c, accepted.actor.request, {
        noteId: accepted.original.noteId,
        commandId: accepted.input.commandId,
      });
      expect(get.records).toHaveLength(1);
      expect(get.processing).toHaveLength(0);
      expect(get.receipt?.jobs[0]?.state).toBe("succeeded");
      expect(JSON.stringify(get).includes("fixture-session")).toBe(false);
      expect(JSON.stringify(get).includes("fixture-access")).toBe(false);
      expect(
        (await getDriveBackupHistory(s().c, accepted.actor.request)).rows,
      ).toHaveLength(2);
      const saved = await f().uow.run((u) =>
        u.driveBackupRecords.forNote(
          accepted.original.noteId,
          accepted.actor.accountId,
        ),
      );
      expect(saved[0]?.folder.resourceKeyEnvelope).not.toBe(
        current.identity.folder.resourceKeyEnvelope,
      );
      expect(await deleteClaim(accepted.original.storageKey)).toBe(true);
    });
    it("queries a missing ACK once and resumes only at its confirmed offset", async () => {
      s().controls.unknownFirst = true;
      const accepted = await s().admission();
      expect(await s().run(accepted.transfer!.id)).toBe("resolved");
      expect((await row(accepted.transfer!.id)).phase).toBe("succeeded");
      expect(s().calls.query).toBe(1);
      expect(s().calls.uploads.map((value) => value.offset)).toEqual([
        0,
        DRIVE_BACKUP_LIMITS.chunkBytes,
      ]);
    });
    it("resumes a confirmed zero offset on the same session and file without allocating again", async () => {
      s().controls.unknownFirst = true;
      s().controls.statusOffset = 0;
      const accepted = await s().admission();
      await s().run(accepted.transfer!.id);
      const saved = await row(accepted.transfer!.id);
      expect(saved.phase).toBe("succeeded");
      expect(s().calls.uploads.map((value) => value.offset)).toEqual([
        0,
        0,
        DRIVE_BACKUP_LIMITS.chunkBytes,
      ]);
      expect(s().calls.query).toBe(1);
      const target = await f().uow.run((u) =>
        u.driveBackupTargets.find(saved.targetId),
      );
      expect(target?.state).toBe("confirmed");
      expect(target?.fileId).toBe("backup-file");
      expect(s().calls.allocate).toBe(1);
      expect(s().calls.start).toBe(1);
    });
    it.each([
      "quota",
      "trashed",
      "missing",
    ] as const)("preserves originals on %s without a success record", async (mode) => {
      if (mode === "quota") s().controls.uploadFailure = "DRIVE_BACKUP_QUOTA";
      else s().controls.folder = mode;
      const accepted = await s().admission();
      expect(await s().run(accepted.transfer!.id)).toBe("resolved");
      const saved = await row(accepted.transfer!.id);
      const expected =
        mode === "quota"
          ? "DRIVE_BACKUP_QUOTA"
          : mode === "trashed"
            ? "DRIVE_BACKUP_FOLDER_TRASHED"
            : "DRIVE_BACKUP_FOLDER_UNAVAILABLE";
      expect(saved.phase === "failed" ? saved.failure : null).toBe(expected);
      expect(saved.owner.state).toBe("closed");
      expect(
        await f().uow.run((u) => u.imports.findOriginal(accepted.original.id)),
      ).not.toBeNull();
      expect(
        await f().uow.run((u) =>
          u.driveBackupRecords.forNote(
            accepted.original.noteId,
            accepted.actor.accountId,
          ),
        ),
      ).toHaveLength(0);
      expect(s().calls.allocate).toBe(mode === "quota" ? 1 : 0);
    });
    it("rejects a foreign actor and a workspace viewer before any backup side effect", async () => {
      expect(
        await finite(() => s().admission(f().actors[1]!, f().originals[0]!)),
      ).toBe("NOTE_NOT_FOUND");
      expect(
        await finite(() => s().admission(f().actors[2]!, f().originals[1]!)),
      ).toBe("NOTE_NOT_FOUND");
      expect(s().calls.opens + s().calls.allocate).toBe(0);
      expect(
        (
          await f().uow.run((u) =>
            u.driveBackupJobs.queued(f().actors[0]!.accountId),
          )
        ).global,
      ).toBe(0);
    });
    it("admits a workspace editor independently from the original creator", async () => {
      const accepted = await s().admission(f().actors[1]!, f().originals[1]!);
      await s().run(accepted.transfer!.id);
      expect((await row(accepted.transfer!.id)).phase).toBe("succeeded");
      expect(
        (
          await getDriveBackup(s().c, f().actors[0]!.request, {
            noteId: accepted.original.noteId,
          })
        ).records,
      ).toHaveLength(0);
      expect(
        (
          await getDriveBackup(s().c, accepted.actor.request, {
            noteId: accepted.original.noteId,
          })
        ).records,
      ).toHaveLength(1);
    });
    it("rejects changed-payload command reuse without adding jobs", async () => {
      const accepted = await s().admission();
      expect(
        await finite(() =>
          requestDriveBackup(s().c, accepted.actor.request, {
            ...accepted.input,
            noteId: f().originals[2]!.noteId,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        await f().uow.run((u) =>
          u.driveBackupJobs.forRequest(accepted.receipt.requestId),
        ),
      ).toHaveLength(1);
    });
    it("cancels a queued job without opening a source or manufacturing an owner", async () => {
      const accepted = await s().admission();
      expect(
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        }),
      ).toEqual({ cancelled: true });
      expect(await s().run(accepted.transfer!.id)).toBe("resolved");
      const saved = await row(accepted.transfer!.id);
      expect(saved.phase).toBe("cancelled");
      expect(saved.owner.state).toBe("none");
      expect(s().calls.opens).toBe(0);
      expect(
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        }),
      ).toEqual({ cancelled: false });
    });
    it.each([
      "before",
      "after",
    ] as const)("serializes manual cancellation %s the persisted claim", async (timing) => {
      const accepted = await s().admission();
      const ready = gate();
      const resume = gate();
      let first = true;
      const c = {
        ...s().c,
        unitOfWorkProvider: {
          async run<T>(
            work: (u: HollowUnitOfWorkContext) => Promise<T>,
          ): Promise<T> {
            if (!first) return f().uow.run(work);
            first = false;
            if (timing === "before") {
              ready.resolve();
              await resume.promise;
            }
            const result = await f().uow.run(work);
            if (timing === "after") {
              ready.resolve();
              await resume.promise;
            }
            return result;
          },
        },
      };
      const running = finite(() =>
        runDriveBackup(
          c,
          accepted.transfer!.id,
          s().execution.runtimeGeneration,
        ),
      );
      try {
        await ready.promise;
        const before = await row(accepted.transfer!.id);
        expect(before.phase).toBe(timing === "before" ? "queued" : "checking");
        expect(
          (
            await f().uow.run((u) =>
              u.driveBackupJobs.find(accepted.receipt.jobId),
            )
          )?.state,
        ).toBe("queued");
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        });
        if (timing === "after")
          expect(await row(accepted.transfer!.id)).toEqual(before);
      } finally {
        resume.resolve();
        expect(await running).toBe("resolved");
      }
      expect((await row(accepted.transfer!.id)).phase).toBe(
        timing === "before" ? "cancelled" : "succeeded",
      );
      expect(s().calls.opens).toBe(timing === "before" ? 0 : 1);
    });
    it.each([
      "success",
      "quota",
      "unknown",
    ] as const)("retains the started %s result after a manual cancellation request", async (mode) => {
      const ready = gate();
      const resume = gate();
      s().trackRelease(resume.resolve);
      s().controls.holdClose = mode === "unknown";
      if (mode === "quota") s().controls.uploadFailure = "DRIVE_BACKUP_QUOTA";
      s().controls.beforeRead = async () => {
        ready.resolve();
        await resume.promise;
      };
      const accepted = await s().admission();
      const running = s().run(accepted.transfer!.id);
      await ready.promise;
      const before = await row(accepted.transfer!.id);
      expect(
        await finite(() =>
          cancelDriveBackup(s().c, f().actors[1]!.request, {
            jobId: accepted.receipt.jobId,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        }),
      ).toEqual({ cancelled: true });
      expect(await row(accepted.transfer!.id)).toEqual(before);
      expect(
        (
          await f().uow.run((u) =>
            u.driveBackupRequests.find(accepted.receipt.requestId),
          )
        )?.cancelledAt,
      ).toEqual(backupNow);
      expect(
        (
          await getDriveBackup(s().c, accepted.actor.request, {
            noteId: accepted.original.noteId,
          })
        ).processing[0]?.manualCancellationRequested,
      ).toBe(true);
      expect(
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        }),
      ).toEqual({ cancelled: false });
      resume.resolve();
      expect(await running).toBe("resolved");
      const saved = await row(accepted.transfer!.id);
      expect(saved.phase).toBe(mode === "success" ? "succeeded" : "failed");
      if (saved.phase === "failed")
        expect(saved.failure).toBe(
          mode === "quota" ? "DRIVE_BACKUP_QUOTA" : "DRIVE_BACKUP_UNKNOWN",
        );
      expect(saved.cancelGeneration).toBe(0);
      const result = await getDriveBackup(s().c, accepted.actor.request, {
        noteId: accepted.original.noteId,
      });
      expect(result.records).toHaveLength(mode === "success" ? 1 : 0);
      expect(
        await cancelDriveBackup(s().c, accepted.actor.request, {
          jobId: accepted.receipt.jobId,
        }),
      ).toEqual({ cancelled: false });
      if (mode === "unknown") {
        expect(saved.owner.state).toBe("unknown");
        expect(saved.readPinned).toBe(true);
        expect(await deleteClaim(accepted.original.storageKey)).toBe(false);
        s().releasePhysical();
        await reconcileDriveClosures(s().c);
        await s().retirePins();
        expect((await row(accepted.transfer!.id)).owner.state).toBe("closed");
      }
    });
    it("externally cancels after manual cancellation and keeps delete protection until physical close", async () => {
      const ready = gate();
      const resume = gate();
      s().trackRelease(resume.resolve);
      s().controls.holdClose = true;
      s().controls.beforeRead = async () => {
        ready.resolve();
        await resume.promise;
      };
      const accepted = await s().admission();
      const running = s().run(accepted.transfer!.id);
      await ready.promise;
      expect(await deleteClaim(accepted.original.storageKey)).toBe(false);
      await cancelDriveBackup(s().c, accepted.actor.request, {
        jobId: accepted.receipt.jobId,
      });
      expect((await row(accepted.transfer!.id)).cancelGeneration).toBe(0);
      await f().uow.run((u) =>
        cancelDriveBackups(
          s().c,
          u,
          { kind: "note", noteId: accepted.original.noteId },
          backupNow,
        ),
      );
      resume.resolve();
      expect(await running).toBe("resolved");
      const held = await row(accepted.transfer!.id);
      expect(held.phase).toBe("cancelled");
      expect(held.owner.state).toBe("unknown");
      expect(held.readPinned).toBe(true);
      expect(s().writers.size).toBe(1);
      expect(await deleteClaim(accepted.original.storageKey)).toBe(false);
      await f().uow.run((u) =>
        u.objectOperations.recoverWrites("different-runtime"),
      );
      expect(await deleteClaim(accepted.original.storageKey)).toBe(false);
      s().releasePhysical();
      await reconcileDriveClosures(s().c);
      await s().retirePins();
      const closed = await row(accepted.transfer!.id);
      expect(closed.phase).toBe("cancelled");
      expect(closed.owner.state).toBe("closed");
      expect(closed.readPinned).toBe(false);
      expect(await deleteClaim(accepted.original.storageKey)).toBe(true);
    });
    it("does not dispatch abort or wake from a rolled-back cancellation", async () => {
      const accepted = await s().admission();
      await rollback(async (c, u) => {
        await cancelDriveBackups(
          c,
          u,
          { kind: "note", noteId: accepted.original.noteId },
          backupNow,
        );
        expect(
          (await u.driveBackupTransfers.find(accepted.transfer!.id))?.phase,
        ).toBe("cancelled");
      });
      expect((await row(accepted.transfer!.id)).phase).toBe("queued");
    });
    it.each([
      "trash",
      "purge",
      "move",
      "downgrade",
      "remove",
      "leave",
      "workspace-delete",
      "disconnect",
    ] as const)("connects the %s hook to the same transactional backup fence", async (hook) => {
      const personal =
        hook === "trash" ||
        hook === "purge" ||
        hook === "move" ||
        hook === "disconnect";
      const actor = personal ? f().actors[0]! : f().actors[1]!;
      const accepted = await s().admission(
        actor,
        f().originals[personal ? 0 : 1]!,
      );
      await rollback(async (c, u) => {
        const note = await u.notes.findById(accepted.original.noteId);
        if (!note)
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        if (hook === "trash")
          await trashNoteInTransaction(c, u, actor.accountId, {
            id: note.id,
            version: note.version,
            cancelProcessing: true,
          });
        else if (hook === "purge") {
          const lifecycle = trashLifecycle(backupNow, f().id());
          await u.notes.save(
            { ...note, lifecycle, version: note.version + 1 },
            note.version,
          );
          await beginNotePurge(
            c,
            u,
            { id: note.id, operationId: lifecycle.operationId },
            "manual",
            actor.accountId,
          );
        } else if (hook === "move") {
          const expected = await u.moves.inspect(
            note.id,
            { kind: "workspace", workspaceId: f().workspaceId },
            backupNow,
            (value) => c.tokens.hash(value),
          );
          await moveNoteInTransaction(
            c,
            u,
            actor.accountId,
            expected,
            backupNow,
          );
        } else if (hook === "downgrade" || hook === "remove")
          await changeWorkspaceMember(c, f().actors[0]!.request.sessionToken, {
            workspaceId: f().workspaceId,
            accountId: actor.accountId,
            expectedRole: "editor",
            role: hook === "remove" ? null : "viewer",
            ownerConfirmed: false,
          });
        else if (hook === "leave")
          await leaveWorkspace(c, actor.request.sessionToken, {
            workspaceId: f().workspaceId,
          });
        else if (hook === "workspace-delete")
          await requestWorkspaceDeletion(
            c,
            f().actors[0]!.request.sessionToken,
            {
              workspaceId: f().workspaceId,
              requestId: f().id(),
              confirmation: "Backup fixture",
            },
          );
        else {
          const connection = await u.driveConnections.find(actor.accountId);
          if (!connection)
            throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
          await disconnectDrive(c, actor.request, {
            commandId: f().id(),
            expectedEpoch: connection.epoch,
            expectedSettingsVersion: connection.settingsVersion,
            confirmation: await driveFolderConfirmation(u, actor.accountId),
          });
        }
        expect(
          (await u.driveBackupTransfers.find(accepted.transfer!.id))?.phase,
        ).toBe("cancelled");
      });
      expect((await row(accepted.transfer!.id)).phase).toBe("queued");
    });
    it.each([
      false,
      true,
    ])("cancels the old backup only when candidate exchange succeeds: failure=%s", async (failure) => {
      const accepted = await s().admission();
      const connection = await f().uow.run((u) =>
        u.driveConnections.find(accepted.actor.accountId),
      );
      if (!connection)
        throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
      s().controls.exchangeFailure = failure;
      await beginDriveAuthorization(s().c, accepted.actor.request, {
        commandId: f().id(),
        expectedEpoch: connection.epoch,
        expectedSettingsVersion: connection.settingsVersion,
        confirmation: await f().uow.run((u) =>
          driveFolderConfirmation(u, accepted.actor.accountId),
        ),
        consent: true,
        chooseAccount: true,
      });
      expect(
        await finite(() =>
          exchangeDriveAuthorization(
            s().c,
            accepted.actor.request,
            { state: s().authorizationState(), code: "fixture-code" },
            s().execution.runtimeGeneration,
          ),
        ),
      ).toBe("resolved");
      expect((await row(accepted.transfer!.id)).phase).toBe(
        failure ? "queued" : "cancelled",
      );
      const after = await f().uow.run((u) =>
        u.driveConnections.find(accepted.actor.accountId),
      );
      expect(after?.epoch).toBe(connection.epoch + (failure ? 0 : 1));
      expect(after?.folder === null).toBe(!failure);
    });
    it("retains a refresh owner when its subscriber aborts, then fences it only after successful relink", async () => {
      const actor = f().actors[0]!;
      await f().uow.run(async (u) => {
        const old = await u.driveConnections.find(actor.accountId);
        if (!old || old.state !== "linked")
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        const credentialVersion = old.credentialVersion + 1;
        const envelope = s().service.protector.protect(
          JSON.stringify({
            version: 1,
            accessToken: "fixture-expired",
            refreshToken: "fixture-refresh",
          }),
          {
            purpose: "credential",
            accountId: actor.accountId,
            subject: old.credential.subject,
            epoch: old.epoch,
            credentialVersion,
          },
        );
        expect(
          await u.driveConnections.replace(
            {
              ...old,
              credentialVersion,
              version: old.version + 1,
              credential: {
                ...old.credential,
                envelope,
                accessExpiresAt: new Date(backupNow.getTime() - 1),
              },
            },
            old.version,
            "refresh",
          ),
        ).toBe(true);
      });
      const ready = gate();
      const resume = gate();
      s().trackRelease(resume.resolve);
      s().controls.beforeRefresh = async () => {
        ready.resolve();
        await resume.promise;
      };
      const accepted = await s().admission();
      const running = s().run(accepted.transfer!.id);
      await ready.promise;
      const before = await row(accepted.transfer!.id);
      expect(before.refreshPending && before.readPinned).toBe(true);
      const controller = new AbortController();
      const subscriber = s().execution.waitForChange(
        s().execution.changeRevision(),
        controller.signal,
      );
      controller.abort();
      expect(await subscriber).toBe("stopped");
      expect((await row(before.id)).refreshPending).toBe(true);
      expect(await deleteClaim(accepted.original.storageKey)).toBe(false);
      const connection = await f().uow.run((u) =>
        u.driveConnections.find(actor.accountId),
      );
      if (!connection)
        throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
      await beginDriveAuthorization(s().c, actor.request, {
        commandId: f().id(),
        expectedEpoch: connection.epoch,
        expectedSettingsVersion: connection.settingsVersion,
        confirmation: await f().uow.run((u) =>
          driveFolderConfirmation(u, actor.accountId),
        ),
        consent: true,
        chooseAccount: true,
      });
      await exchangeDriveAuthorization(
        s().c,
        actor.request,
        { state: s().authorizationState(), code: "fixture-code" },
        s().execution.runtimeGeneration,
      );
      const cancelled = await row(before.id);
      expect(cancelled.phase).toBe("cancelled");
      expect(cancelled.refreshPending && cancelled.readPinned).toBe(true);
      const adopted = await f().uow.run((u) =>
        u.driveConnections.find(actor.accountId),
      );
      expect(adopted?.epoch).toBe(connection.epoch + 1);
      resume.resolve();
      expect(await running).toBe("resolved");
      const closed = await row(before.id);
      expect(closed.phase).toBe("cancelled");
      expect(closed.owner.state).toBe("closed");
      expect(closed.refreshPending || closed.readPinned).toBe(false);
      const final = await f().uow.run((u) =>
        u.driveConnections.find(actor.accountId),
      );
      expect(final?.credentialVersion).toBe(adopted?.credentialVersion);
      expect(s().calls.refresh).toBe(1);
      expect(s().calls.allocate).toBe(0);
    });
  },
);

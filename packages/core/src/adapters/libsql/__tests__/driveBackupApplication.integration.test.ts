import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { cancelDriveBackups } from "@repo/core/application/integration/drive/backup/cancellation";
import {
  getDriveBackup,
  getDriveBackupHistory,
} from "@repo/core/application/integration/drive/backup/read";
import {
  cancelDriveBackup,
  requestDriveBackup,
} from "@repo/core/application/integration/drive/backup/request";
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
import { DRIVE_BACKUP_LIMITS } from "@repo/core/domain/integration/driveBackup";
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
    it("keeps cancelled source ownership and delete protection until late physical close", async () => {
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

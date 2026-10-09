import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { setDriveAutoBackup } from "@repo/core/application/integration/drive/autoSetting";
import {
  getDriveBackupActivity,
  getDriveBackupDetail,
} from "@repo/core/application/integration/drive/backup/activity";
import { fillBackupQueue } from "@repo/core/application/integration/drive/backup/admission";
import { admitAutomaticInTransaction } from "@repo/core/application/integration/drive/backup/automatic";
import {
  cancelDriveBackupParent,
  previewDriveBackup,
  requestDriveBackupBulk,
  retryDriveBackupParent,
} from "@repo/core/application/integration/drive/backup/bulk";
import {
  backupImpactIds,
  cancelDriveBackups,
} from "@repo/core/application/integration/drive/backup/cancellation";
import { requestDriveBackup } from "@repo/core/application/integration/drive/backup/request";
import { runDriveBackupQueue } from "@repo/core/application/integration/drive/backup/runner";
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
import type { Original } from "@repo/core/domain/import/entity";
import { driveConfirmedFoldersMatch } from "@repo/core/domain/integration/drive";
import { DRIVE_BACKUP_LIMITS } from "@repo/core/domain/integration/driveBackup";
import { createNote } from "@repo/core/domain/note/entity";
import { trashLifecycle } from "@repo/core/domain/note/lifecycle";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  "S3 auto/bulk with an isolated DB for each scenario",
  () => {
    let fixture: BackupFixture | undefined;
    let scenario: BackupCase | undefined;
    const personal: Original[] = [];
    const workspace: Original[] = [];
    const f = () => {
      if (!fixture)
        throw new BusinessRuleError(
          "FIXTURE_MISSING",
          "検証器具がありません。",
        );
      return fixture;
    };
    const s = () => {
      if (!scenario)
        throw new BusinessRuleError(
          "FIXTURE_MISSING",
          "検証器具がありません。",
        );
      return scenario;
    };
    const actor = (index = 0) => f().actors[index]!;
    let fixtureSequence = 1;
    beforeEach(async () => {
      fixture = await backupFixture({
        s3: true,
        bytes: 1024,
        label: `application-v${++fixtureSequence}`,
      });
      personal.splice(0);
      workspace.splice(0);
      await f().uow.run(async (u) => {
        for (let n = 0; n < 510; n++) {
          const noteId = f().id();
          await u.notes.insert(
            createNote(
              {
                id: noteId,
                accountId: actor().accountId,
                ...(n >= 500
                  ? {
                      owner: {
                        kind: "workspace" as const,
                        workspaceId: f().workspaceId,
                      },
                    }
                  : {}),
                title: `S3 original ${n}`,
                html: "<p>fixture</p>",
                text: "fixture",
              },
              backupNow,
            ),
          );
          const original: Original = {
            ...f().originals[0]!,
            id: f().id(),
            noteId,
            name: `s3-${n}.pdf`,
            storageKey: `s3-original-${n}`,
            activeJobId: f().id(),
          };
          await u.imports.insertOriginal(original);
          f().originals.push(original);
          (n >= 500 ? workspace : personal).push(original);
        }
      });
      expect(f().originals.length).toBe(513);
      scenario = await backupCase(f());
    }, 60000);
    afterEach(async (context) => {
      const own = scenario;
      const ownedFixture = fixture;
      scenario = undefined;
      const clean = context.task.result?.state === "pass";
      if (!clean && ownedFixture) ownedFixture.failed = true;
      try {
        if (own) await own.close(clean, true);
      } catch {
        if (ownedFixture) ownedFixture.failed = true;
        throw new BusinessRuleError(
          "FIXTURE_CLOSE_FAILED",
          "検証環境の終了を確認できません。",
        );
      } finally {
        fixture = undefined;
        await ownedFixture?.close();
      }
    });
    async function connection(index = 0) {
      const row = await f().uow.run((u) =>
        u.driveConnections.find(actor(index).accountId),
      );
      if (!row || row.state !== "linked" || !row.folder)
        throw new BusinessRuleError("FIXTURE_CONNECTION", "連携がありません。");
      return row;
    }
    async function auto(enabled: boolean, index = 0) {
      const row = await connection(index);
      return setDriveAutoBackup(s().c, actor(index).request, {
        expectedEpoch: row.epoch,
        expectedSettingsVersion: row.settingsVersion,
        enabled,
      });
    }
    async function admit(
      original = personal[0]!,
      index = 0,
      c = s().c,
      commandId = f().id(),
    ) {
      return f().uow.run((u) =>
        admitAutomaticInTransaction(c, u, {
          accountId: actor(index).accountId,
          noteId: original.noteId,
          originalId: original.id,
          commandId,
        }),
      );
    }
    async function bulk(originals: readonly Original[], index = 0) {
      const input = {
        noteIds: originals.map((o) => o.noteId),
        workspaceId:
          originals === workspace || workspace.includes(originals[0]!)
            ? f().workspaceId
            : null,
      };
      const preview = await previewDriveBackup(
        s().c,
        actor(index).request,
        input,
      );
      return requestDriveBackupBulk(s().c, actor(index).request, {
        ...input,
        commandId: f().id(),
        expectedDigest: preview.digest,
      });
    }
    const jobs = (id: string) =>
      f().uow.run((u) => u.driveBackupJobs.forRequest(id));
    async function transfer(jobId: string) {
      const value = await f().uow.run((u) =>
        u.driveBackupTransfers.forJob(jobId),
      );
      if (value.kind !== "found")
        throw new BusinessRuleError("FIXTURE_TRANSFER", "転送がありません。");
      return value.row;
    }
    async function failPending(id: string) {
      await f().uow.run(async (u) => {
        const job = await u.driveBackupJobs.find(id);
        if (!job || job.terminalAt !== null)
          throw new BusinessRuleError("FIXTURE_JOB", "受付がありません。");
        expect(
          await u.driveBackupJobs.replace(
            {
              ...job,
              state: "failed",
              failure: "DRIVE_BACKUP_UNAVAILABLE",
              bytes: 0,
              version: job.version + 1,
              updatedAt: s().controls.now,
              terminalAt: s().controls.now,
            },
            job.version,
          ),
        ).toBe(true);
      });
    }
    async function rollback(
      work: (c: HollowContainer, u: HollowUnitOfWorkContext) => Promise<void>,
    ) {
      const wakes = s().calls.wakes;
      expect(
        await finite(() =>
          f().uow.run(async (u) => {
            const c = {
              ...s().c,
              unitOfWorkProvider: {
                run: <T>(fn: (tx: HollowUnitOfWorkContext) => Promise<T>) =>
                  fn(u),
              },
            };
            await work(c, u);
            throw new BusinessRuleError(
              "FIXTURE_ROLLBACK",
              "意図したrollbackです。",
            );
          }),
        ),
      ).toBe("FIXTURE_ROLLBACK");
      expect(s().calls.wakes).toBe(wakes);
    }

    it("F OFF and ON setting never backfill existing originals", async () => {
      expect(await admit()).toBeNull();
      await auto(true);
      expect(
        (await getDriveBackupActivity(s().c, actor().request)).rows,
      ).toHaveLength(0);
      expect(s().calls.allocate).toBe(0);
      expect(s().calls.opens).toBe(0);
    });
    it("F primary original and automatic receipt commit together while a rollback leaves neither", async () => {
      await auto(true);
      const noteId = f().id();
      const originalId = f().id();
      const commandId = f().id();
      expect(
        await finite(() =>
          f().uow.run(async (u) => {
            await u.notes.insert(
              createNote(
                {
                  id: noteId,
                  accountId: actor().accountId,
                  title: "atomic",
                  html: "",
                  text: "",
                },
                backupNow,
              ),
            );
            await u.imports.insertOriginal({
              ...personal[0]!,
              id: originalId,
              noteId,
              storageKey: "atomic-rollback",
              activeJobId: f().id(),
            });
            await admitAutomaticInTransaction(s().c, u, {
              accountId: actor().accountId,
              noteId,
              originalId,
              commandId,
            });
            throw new BusinessRuleError(
              "FIXTURE_ROLLBACK",
              "意図したrollbackです。",
            );
          }),
        ),
      ).toBe("FIXTURE_ROLLBACK");
      expect(
        await f().uow.run((u) => u.imports.findOriginal(originalId)),
      ).toBeNull();
      expect(
        await f().uow.run((u) =>
          u.driveBackupRequests.command(actor().accountId, commandId),
        ),
      ).toBeNull();
      const receipt = await admit();
      expect(receipt).not.toBeNull();
      const [job] = await jobs(receipt!);
      expect(job?.admissionIdentity?.originalId).toBe(personal[0]!.id);
      expect(
        (await f().uow.run((u) => u.driveBackupTransfers.forJob(job!.id))).kind,
      ).toBe("missing");
    });
    it("F same upload command remains one automatic child and one fixed target", async () => {
      await auto(true);
      const command = f().id();
      const first = await admit(personal[0]!, 0, s().c, command);
      expect(await admit(personal[0]!, 0, s().c, command)).toBe(first);
      expect((await jobs(first!)).length).toBe(1);
    });
    it("F workspace upload belongs to the uploader's Drive", async () => {
      await auto(true, 1);
      const id = await admit(workspace[0]!, 1);
      const [job] = await jobs(id!);
      expect(job?.accountId).toBe(actor(1).accountId);
      expect(job?.admissionIdentity?.workspaceId).toBe(f().workspaceId);
      expect(job?.admissionIdentity?.subject).toBe(
        `backup-subject-${actor(1).accountId}`,
      );
    });
    it.each([
      "ready",
      "failed",
      "needs_ai",
    ] as const)("F conversion result %s remains independent of backup", async (state) => {
      await f().uow.run((u) =>
        u.imports.saveOriginal({ ...personal[0]!, state }),
      );
      await auto(true);
      const receipt = await admit();
      await fillBackupQueue(s().c);
      const [job] = await jobs(receipt!);
      expect(await s().run((await transfer(job!.id)).id)).toBe("resolved");
      expect((await jobs(receipt!))[0]?.state).toBe("succeeded");
      expect(
        (await f().uow.run((u) => u.imports.findOriginal(personal[0]!.id)))
          ?.state,
      ).toBe(state);
      await f().uow.run((u) => u.imports.saveOriginal(personal[0]!));
    });
    it("F OFF only stops future admissions and does not invalidate accepted work", async () => {
      await auto(true);
      const receipt = await admit();
      await auto(false);
      expect(await admit(personal[1]!)).toBeNull();
      await fillBackupQueue(s().c);
      const [job] = await jobs(receipt!);
      expect(await s().run((await transfer(job!.id)).id)).toBe("resolved");
      expect((await jobs(receipt!))[0]?.state).toBe("succeeded");
    });
    it.each([
      "unconfigured",
      "needs-relink",
    ] as const)("F %s acceptance keeps a snapshot failure and the original", async (mode) => {
      await auto(true);
      let c: HollowContainer = s().c;
      if (mode === "needs-relink") {
        const row = await connection();
        await f().uow.run(async (u) => {
          expect(
            await u.driveConnections.replace(
              { ...row, state: "needs-relink", version: row.version + 1 },
              row.version,
              "invalidate",
            ),
          ).toBe(true);
        });
      } else {
        const { drive, ...rest } = c;
        void drive;
        c = rest;
      }
      const receipt = await admit(personal[0]!, 0, c);
      const [job] = await jobs(receipt!);
      expect(job?.state).toBe("failed");
      expect(job?.admissionIdentity?.originalId).toBe(personal[0]!.id);
      expect(job?.targetId).not.toBeNull();
      expect(s().calls.allocate).toBe(0);
    });
    it("G preview excludes no-original and already-processing targets without changing the selection", async () => {
      await bulk([personal[0]!]);
      const noteId = f().id();
      await f().uow.run((u) =>
        u.notes.insert(
          createNote(
            {
              id: noteId,
              accountId: actor().accountId,
              title: "no original",
              html: "",
              text: "",
            },
            backupNow,
          ),
        ),
      );
      const input = {
        noteIds: [personal[0]!.noteId, personal[1]!.noteId, noteId, f().id()],
        workspaceId: null,
      };
      const result = await previewDriveBackup(s().c, actor().request, input);
      expect([
        result.selected,
        result.processing,
        result.pending,
        result.noOriginal,
        result.denied,
      ]).toEqual([4, 1, 1, 1, 1]);
    });
    it("G 500 fixed targets remain pending with no transfer/owner/pin and 501 is refused", async () => {
      const receipt = await bulk(personal);
      expect(receipt.count).toBe(500);
      expect(
        (await jobs(receipt.requestId)).every(
          (j) =>
            j.targetId !== null &&
            j.admissionIdentity !== null &&
            j.state === "queued",
        ),
      ).toBe(true);
      expect(
        (await f().uow.run((u) => u.driveBackupJobs.queued(actor().accountId)))
          .global,
      ).toBe(0);
      expect(s().calls.opens).toBe(0);
      expect(
        await finite(() =>
          previewDriveBackup(s().c, actor().request, {
            noteIds: [
              ...personal.map((o) => o.noteId),
              f().originals[0]!.noteId,
            ],
            workspaceId: null,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
    });
    it("G duplicate IDs, empty and entirely excluded targets create no parent", async () => {
      for (const noteIds of [[], [personal[0]!.noteId, personal[0]!.noteId]])
        expect(
          await finite(() =>
            previewDriveBackup(s().c, actor().request, {
              noteIds,
              workspaceId: null,
            }),
          ),
        ).toBe("DRIVE_CONTEXT_CHANGED");
      const input = { noteIds: [f().id()], workspaceId: null };
      const preview = await previewDriveBackup(s().c, actor().request, input);
      expect(
        await finite(() =>
          requestDriveBackupBulk(s().c, actor().request, {
            ...input,
            commandId: f().id(),
            expectedDigest: preview.digest,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        (await getDriveBackupActivity(s().c, actor().request)).rows,
      ).toHaveLength(0);
    });
    it("G same command deduplicates after acceptance, but a stale different command requires confirmation", async () => {
      const selected = { noteIds: [personal[0]!.noteId], workspaceId: null };
      const preview = await previewDriveBackup(
        s().c,
        actor().request,
        selected,
      );
      const input = {
        ...selected,
        commandId: f().id(),
        expectedDigest: preview.digest,
      };
      const first = await requestDriveBackupBulk(s().c, actor().request, input);
      expect(
        (await requestDriveBackupBulk(s().c, actor().request, input)).requestId,
      ).toBe(first.requestId);
      expect(
        await finite(() =>
          requestDriveBackupBulk(s().c, actor().request, {
            ...input,
            commandId: f().id(),
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
    });
    it("G concurrent manual/auto commands after bulk acceptance keep the same target and active job", async () => {
      await auto(true);
      const first = await bulk([personal[0]!]);
      const current = await connection();
      const [automatic, manual] = await Promise.all([
        admit(),
        requestDriveBackup(s().c, actor().request, {
          noteId: personal[0]!.noteId,
          commandId: f().id(),
          expectedEpoch: current.epoch,
          expectedSettingsVersion: current.settingsVersion,
        }),
      ]);
      expect(automatic).toBe(first.requestId);
      expect(manual.requestId).toBe(first.requestId);
      expect(await jobs(first.requestId)).toHaveLength(1);
    });
    it("G parent and transfer limits are directly account10/11 and global100/101 using actor11", async () => {
      for (let a = 0; a < 10; a++)
        for (let n = 0; n < 10; n++) await bulk([workspace[n]!], a);
      expect(
        await f().uow.run((u) =>
          u.driveBackupRequests.unfinished(actor().accountId),
        ),
      ).toEqual({ account: 10, global: 100 });
      expect(await finite(() => bulk([personal[0]!]))).toBe(
        "DRIVE_BACKUP_UNAVAILABLE",
      );
      expect(await finite(() => bulk([workspace[0]!], 10))).toBe(
        "DRIVE_BACKUP_UNAVAILABLE",
      );
      await fillBackupQueue(s().c);
      expect(
        await f().uow.run((u) => u.driveBackupJobs.queued(actor().accountId)),
      ).toEqual({ account: 10, global: 100 });
      await auto(true, 10);
      const failed = await admit(workspace[0]!, 10);
      expect((await jobs(failed!))[0]?.state).toBe("failed");
      expect(
        (
          await f().uow.run((u) =>
            u.driveBackupRequests.unfinished(actor(10).accountId),
          )
        ).global,
      ).toBe(100);
    }, 60000);
    it("G admitted transfer cap leaves later ordinals fixed and unstarted in a 500-child parent", async () => {
      const receipt = await bulk(personal);
      await fillBackupQueue(s().c);
      const children = await jobs(receipt.requestId);
      let count = 0;
      for (const job of children)
        if (
          (await f().uow.run((u) => u.driveBackupTransfers.forJob(job.id)))
            .kind === "found"
        )
          count++;
      expect(count).toBe(10);
      expect(children[499]?.admissionIdentity?.originalId).toBe(
        personal[499]!.id,
      );
      expect(
        (
          await f().uow.run((u) =>
            u.driveBackupRequests.unfinished(actor().accountId),
          )
        ).account,
      ).toBe(1);
    });
    it("G pending expiry is a retryable snapshot failure and a new attempt receives one new deadline", async () => {
      const parent = await bulk([personal[0]!]);
      s().controls.now = new Date(
        s().controls.now.getTime() + DRIVE_BACKUP_LIMITS.executionMs,
      );
      await fillBackupQueue(s().c);
      const [old] = await jobs(parent.requestId);
      expect(old?.state).toBe("failed");
      expect(
        (await f().uow.run((u) => u.driveBackupTransfers.forJob(old!.id))).kind,
      ).toBe("missing");
      const retried = await retryDriveBackupParent(s().c, actor().request, {
        requestId: parent.requestId,
        expectedGeneration: 1,
        commandId: f().id(),
      });
      expect(retried.requestId).toBe(parent.requestId);
      await fillBackupQueue(s().c);
      const [child] = await jobs(retried.receiptId);
      const row = await transfer(child!.id);
      expect(row.deadlineAt.getTime()).toBe(
        s().controls.now.getTime() + DRIVE_BACKUP_LIMITS.executionMs,
      );
      expect(await f().uow.run((u) => u.driveBackupJobs.find(old!.id))).toEqual(
        old,
      );
    });
    it("G failed retry reactivates the original parent generation and permits cancelling it again", async () => {
      const parent = await bulk([personal[0]!, personal[1]!]);
      const original = await jobs(parent.requestId);
      await failPending(original[0]!.id);
      await cancelDriveBackupParent(s().c, actor().request, {
        requestId: parent.requestId,
        expectedGeneration: 1,
      });
      const result = await retryDriveBackupParent(s().c, actor().request, {
        requestId: parent.requestId,
        expectedGeneration: 1,
        commandId: f().id(),
      });
      const root = await f().uow.run((u) =>
        u.driveBackupRequests.find(parent.requestId),
      );
      expect(root?.generation).toBe(2);
      expect(root?.cancelledAt).toBeNull();
      expect(
        (await getDriveBackupActivity(s().c, actor().request)).rows[0]?.state,
      ).toBe("processing");
      expect(
        (
          await cancelDriveBackupParent(s().c, actor().request, {
            requestId: parent.requestId,
            expectedGeneration: 2,
          })
        ).cancelled,
      ).toBe(true);
      expect((await jobs(result.receiptId))[0]?.state).toBe("cancelled");
      expect((await jobs(parent.requestId))[1]?.state).toBe("cancelled");
    });
    it("G manual parent cancellation cancels pending jobs without allocating a file", async () => {
      const parent = await bulk([personal[0]!]);
      expect(
        (
          await cancelDriveBackupParent(s().c, actor().request, {
            requestId: parent.requestId,
            expectedGeneration: 1,
          })
        ).cancelled,
      ).toBe(true);
      await fillBackupQueue(s().c);
      expect((await jobs(parent.requestId))[0]?.state).toBe("cancelled");
      expect(s().calls.allocate).toBe(0);
      expect(
        (
          await cancelDriveBackupParent(s().c, actor().request, {
            requestId: parent.requestId,
            expectedGeneration: 1,
          })
        ).cancelled,
      ).toBe(false);
    });
    it("G mixed success/failure keeps success immutable and retries only the failed ordinal on the same file", async () => {
      const parent = await bulk([personal[0]!, personal[1]!]);
      await fillBackupQueue(s().c);
      const children = await jobs(parent.requestId);
      expect(await s().run((await transfer(children[0]!.id)).id)).toBe(
        "resolved",
      );
      s().controls.uploadFailure = "DRIVE_BACKUP_QUOTA";
      await s().run((await transfer(children[1]!.id)).id);
      s().controls.uploadFailure = null;
      const before = await jobs(parent.requestId);
      expect(before.map((j) => j.state)).toEqual(["succeeded", "failed"]);
      const receipt = await retryDriveBackupParent(s().c, actor().request, {
        requestId: parent.requestId,
        expectedGeneration: 1,
        commandId: f().id(),
      });
      expect(await jobs(receipt.receiptId)).toHaveLength(1);
      await fillBackupQueue(s().c);
      await s().run(
        (await transfer((await jobs(receipt.receiptId))[0]!.id)).id,
      );
      expect((await jobs(parent.requestId))[0]).toEqual(before[0]);
      expect(s().calls.allocate).toBe(2);
      expect(
        (await getDriveBackupActivity(s().c, actor().request)).rows[0]?.state,
      ).toBe("succeeded");
    });
    it("E stable impact IDs survive admission and missing old receipts cannot skip pending cancellation", async () => {
      const parent = await bulk([personal[0]!]);
      const scope = { kind: "account" as const, accountId: actor().accountId };
      const before = await f().uow.run((u) => backupImpactIds(u, scope));
      const confirmation = await f().uow.run((u) =>
        driveFolderConfirmation(u, actor().accountId, (v) =>
          s().c.tokens.hash(v),
        ),
      );
      expect(confirmation.backupImpact?.count).toBe(1);
      expect(
        driveConfirmedFoldersMatch(
          { ...confirmation, backupImpact: undefined },
          confirmation,
        ),
      ).toBe(false);
      await fillBackupQueue(s().c);
      expect(await f().uow.run((u) => backupImpactIds(u, scope))).toEqual(
        before,
      );
      expect((await jobs(parent.requestId))[0]?.id).toBe(before[0]?.slice(4));
    });
    it("E pending account cancellation fences admission and allows target purge only afterward", async () => {
      const parent = await bulk([personal[0]!]);
      await f().uow.run(async (u) => {
        const note = await u.notes.findById(personal[0]!.noteId);
        if (!note)
          throw new BusinessRuleError("FIXTURE_NOTE", "ノートがありません。");
        await u.notes.save(
          {
            ...note,
            lifecycle: { kind: "purging", purgeId: f().id() },
            version: note.version + 1,
          },
          note.version,
        );
      });
      expect(
        await finite(() =>
          f().uow.run((u) =>
            u.driveBackupTargets.purgeNote(personal[0]!.noteId),
          ),
        ),
      ).not.toBe("resolved");
      await f().uow.run((u) =>
        cancelDriveBackups(
          s().c,
          u,
          { kind: "account", accountId: actor().accountId },
          s().controls.now,
        ),
      );
      await fillBackupQueue(s().c);
      expect((await jobs(parent.requestId))[0]?.state).toBe("cancelled");
      expect(s().calls.wakes).toBeGreaterThan(0);
      await f().uow.run((u) =>
        u.driveBackupTargets.purgeNote(personal[0]!.noteId),
      );
      expect((await jobs(parent.requestId))[0]?.admissionIdentity).toBeNull();
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
    ] as const)("E %s cancels fixed waiting jobs in the same Tx and rollback emits no wake", async (hook) => {
      const isPersonal = ["trash", "purge", "move", "disconnect"].includes(
        hook,
      );
      const a = actor(isPersonal ? 0 : 1);
      const original = isPersonal ? personal[0]! : workspace[0]!;
      const parent = await bulk([original], isPersonal ? 0 : 1);
      const [job] = await jobs(parent.requestId);
      await rollback(async (c, u) => {
        const note = await u.notes.findById(original.noteId);
        if (!note)
          throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
        if (hook === "trash")
          await trashNoteInTransaction(c, u, a.accountId, {
            id: note.id,
            version: note.version,
            cancelProcessing: true,
          });
        else if (hook === "purge") {
          const lifecycle = trashLifecycle(s().controls.now, f().id());
          await u.notes.save(
            { ...note, lifecycle, version: note.version + 1 },
            note.version,
          );
          await beginNotePurge(
            c,
            u,
            { id: note.id, operationId: lifecycle.operationId },
            "manual",
            a.accountId,
          );
        } else if (hook === "move") {
          const expected = await u.moves.inspect(
            note.id,
            { kind: "workspace", workspaceId: f().workspaceId },
            s().controls.now,
            (v) => c.tokens.hash(v),
          );
          await moveNoteInTransaction(
            c,
            u,
            a.accountId,
            expected,
            s().controls.now,
          );
        } else if (hook === "downgrade" || hook === "remove")
          await changeWorkspaceMember(c, actor().request.sessionToken, {
            workspaceId: f().workspaceId,
            accountId: a.accountId,
            expectedRole: "editor",
            role: hook === "remove" ? null : "viewer",
            ownerConfirmed: false,
          });
        else if (hook === "leave")
          await leaveWorkspace(c, a.request.sessionToken, {
            workspaceId: f().workspaceId,
          });
        else if (hook === "workspace-delete")
          await requestWorkspaceDeletion(c, actor().request.sessionToken, {
            workspaceId: f().workspaceId,
            requestId: f().id(),
            confirmation: "Backup fixture",
          });
        else {
          const row = await u.driveConnections.find(a.accountId);
          if (!row)
            throw new BusinessRuleError("FIXTURE_ROW", "検証行がありません。");
          await disconnectDrive(c, a.request, {
            commandId: f().id(),
            expectedEpoch: row.epoch,
            expectedSettingsVersion: row.settingsVersion,
            confirmation: await driveFolderConfirmation(u, a.accountId, (v) =>
              c.tokens.hash(v),
            ),
          });
        }
        expect((await u.driveBackupJobs.find(job!.id))?.state).toBe(
          "cancelled",
        );
        expect((await u.driveBackupTransfers.forJob(job!.id)).kind).toBe(
          "missing",
        );
      });
      expect((await jobs(parent.requestId))[0]?.state).toBe("queued");
      expect(s().calls.allocate).toBe(0);
    });
    it.each([
      false,
      true,
    ])("E candidate failure=%s preserves waiting jobs; success alone fences the old epoch", async (failure) => {
      const parent = await bulk([personal[0]!]);
      const before = await connection();
      s().controls.exchangeFailure = failure;
      await beginDriveAuthorization(s().c, actor().request, {
        commandId: f().id(),
        expectedEpoch: before.epoch,
        expectedSettingsVersion: before.settingsVersion,
        confirmation: await f().uow.run((u) =>
          driveFolderConfirmation(u, actor().accountId, (v) =>
            s().c.tokens.hash(v),
          ),
        ),
        consent: true,
        chooseAccount: true,
      });
      await exchangeDriveAuthorization(
        s().c,
        actor().request,
        { state: s().authorizationState(), code: "fixture-code" },
        s().execution.runtimeGeneration,
      );
      expect((await jobs(parent.requestId))[0]?.state).toBe(
        failure ? "queued" : "cancelled",
      );
      const after = await f().uow.run((u) =>
        u.driveConnections.find(actor().accountId),
      );
      expect(after?.epoch).toBe(before.epoch + (failure ? 0 : 1));
      expect(after?.folder === null).toBe(!failure);
    });
    it.each([
      "success",
      "quota",
      "unknown",
    ] as const)("G parent cancel retains an already-started %s result and rejects stale/foreign cancellation", async (mode) => {
      const parent = await bulk([personal[0]!, personal[1]!]);
      await fillBackupQueue(s().c);
      const children = await jobs(parent.requestId);
      const first = await transfer(children[0]!.id);
      const ready = gate();
      const resume = gate();
      s().trackRelease(resume.resolve);
      s().controls.beforeRead = async () => {
        ready.resolve();
        await resume.promise;
      };
      s().controls.holdClose = mode === "unknown";
      if (mode === "quota") s().controls.uploadFailure = "DRIVE_BACKUP_QUOTA";
      const running = s().run(first.id);
      await ready.promise;
      const before = await transfer(children[0]!.id);
      expect(
        await finite(() =>
          cancelDriveBackupParent(s().c, actor(1).request, {
            requestId: parent.requestId,
            expectedGeneration: 1,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        await finite(() =>
          cancelDriveBackupParent(s().c, actor().request, {
            requestId: parent.requestId,
            expectedGeneration: 2,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      expect(
        await cancelDriveBackupParent(s().c, actor().request, {
          requestId: parent.requestId,
          expectedGeneration: 1,
        }),
      ).toEqual({ cancelled: true, waiting: 1 });
      expect(await transfer(children[0]!.id)).toEqual(before);
      expect((await jobs(parent.requestId))[1]?.state).toBe("cancelled");
      resume.resolve();
      expect(await running).toBe("resolved");
      const result = await transfer(children[0]!.id);
      expect(result.phase).toBe(mode === "success" ? "succeeded" : "failed");
      if (result.phase === "failed")
        expect(result.failure).toBe(
          mode === "quota" ? "DRIVE_BACKUP_QUOTA" : "DRIVE_BACKUP_UNKNOWN",
        );
      expect(result.cancelGeneration).toBe(0);
      if (mode === "unknown") {
        expect(result.owner.state).toBe("unknown");
        expect(result.readPinned).toBe(true);
        s().releasePhysical();
        await reconcileDriveClosures(s().c);
        await s().retirePins();
      }
      expect(
        (
          await cancelDriveBackupParent(s().c, actor().request, {
            requestId: parent.requestId,
            expectedGeneration: 1,
          })
        ).cancelled,
      ).toBe(false);
    });
    it("E external cancellation after a parent cancel still fences the started owner and retains its pin until physical close", async () => {
      const parent = await bulk([personal[0]!]);
      await fillBackupQueue(s().c);
      const [child] = await jobs(parent.requestId);
      const first = await transfer(child!.id);
      const ready = gate();
      const resume = gate();
      s().trackRelease(resume.resolve);
      s().controls.holdClose = true;
      s().controls.beforeRead = async () => {
        ready.resolve();
        await resume.promise;
      };
      const running = s().run(first.id);
      await ready.promise;
      await cancelDriveBackupParent(s().c, actor().request, {
        requestId: parent.requestId,
        expectedGeneration: 1,
      });
      await f().uow.run((u) =>
        cancelDriveBackups(
          s().c,
          u,
          { kind: "note", noteId: personal[0]!.noteId },
          s().controls.now,
        ),
      );
      resume.resolve();
      await running;
      const held = await transfer(child!.id);
      expect(held.phase).toBe("cancelled");
      expect(held.owner.state).toBe("unknown");
      expect(held.readPinned).toBe(true);
      expect(s().writers.size).toBe(1);
      s().releasePhysical();
      await reconcileDriveClosures(s().c);
      await s().retirePins();
      const closed = await transfer(child!.id);
      expect(closed.owner.state).toBe("closed");
      expect(closed.readPinned).toBe(false);
    });
    it("G queue advances across actors and a deferred ordinal without holding a waiting source", async () => {
      const first = await bulk([workspace[0]!, workspace[1]!], 0);
      const second = await bulk([workspace[0]!], 1);
      const result = await runDriveBackupQueue(
        s().c,
        s().execution.runtimeGeneration,
      );
      expect(result.more).toBe(false);
      expect(
        (await jobs(first.requestId)).every((j) => j.state === "succeeded"),
      ).toBe(true);
      expect((await jobs(second.requestId))[0]?.state).toBe("succeeded");
      expect(s().calls.allocate).toBe(3);
      expect(s().writers.size).toBe(0);
    });
    it("H activity and detail are actor-bound, finite pages and contain no snapshot or key", async () => {
      const parent = await bulk(personal);
      const page = await getDriveBackupActivity(s().c, actor().request);
      const detail = await getDriveBackupDetail(s().c, actor().request, {
        requestId: parent.requestId,
        generation: 1,
      });
      expect(detail.rows.length).toBe(50);
      expect(detail.next).toBe(50);
      expect(
        new TextEncoder().encode(JSON.stringify(detail)).byteLength,
      ).toBeLessThan(65536);
      expect(JSON.stringify(page)).not.toContain("resourceKeyEnvelope");
      expect(JSON.stringify(detail)).not.toContain("storageKey");
      expect(
        await finite(() =>
          getDriveBackupDetail(s().c, actor(1).request, {
            requestId: parent.requestId,
            generation: 1,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
    });
    it("H root and all latest ordinals remain physically available through a recent retry receipt, while the 90-day root is hidden", async () => {
      const root = await bulk([personal[0]!, personal[1]!, personal[2]!]);
      const initial = await jobs(root.requestId);
      await fillBackupQueue(s().c);
      await s().run((await transfer(initial[0]!.id)).id);
      s().controls.uploadFailure = "DRIVE_BACKUP_QUOTA";
      await s().run((await transfer(initial[1]!.id)).id);
      s().controls.uploadFailure = null;
      await cancelDriveBackupParent(s().c, actor().request, {
        requestId: root.requestId,
        expectedGeneration: 1,
      });
      const old = await jobs(root.requestId);
      expect(old.map((j) => j.state)).toEqual([
        "succeeded",
        "failed",
        "cancelled",
      ]);
      const baseTime = s().controls.now.getTime();
      const day = 24 * 60 * 60 * 1000;
      const expiresAt = new Date(baseTime + 180 * day);
      await f().uow.run(async (u) => {
        const tokenHash = s().c.tokens.hash(actor().request.sessionToken!);
        const session = await u.accounts.findSession(tokenHash);
        if (!session)
          throw new BusinessRuleError(
            "FIXTURE_SESSION",
            "検証本人がありません。",
          );
        await u.accounts.deleteSession(tokenHash);
        await u.accounts.saveSession({ ...session, expiresAt });
        if (session.browser)
          await u.authBrowsers.ensure(
            session.browser.hash,
            expiresAt,
            backupNow,
          );
      });
      s().controls.now = new Date(baseTime + 89 * day);
      const retry = await retryDriveBackupParent(s().c, actor().request, {
        requestId: root.requestId,
        expectedGeneration: 1,
        commandId: f().id(),
      });
      const latest = await jobs(retry.receiptId);
      for (const job of latest) await failPending(job.id);
      s().controls.now = new Date(baseTime + DRIVE_BACKUP_LIMITS.historyMs + 1);
      await f().uow.run((u) => u.driveBackupJobs.prune(s().controls.now, 100));
      expect(
        await f().uow.run((u) => u.driveBackupRequests.find(root.requestId)),
      ).not.toBeNull();
      expect(
        (
          await f().uow.run((u) => u.driveBackupJobs.latest(root.requestId))
        ).map((j) => j.id),
      ).toEqual([old[0]!.id, latest[0]!.id, old[2]!.id]);
      expect(
        await f().uow.run((u) => u.driveBackupJobs.find(old[0]!.id)),
      ).toEqual(old[0]);
      expect(
        await f().uow.run((u) => u.driveBackupJobs.find(old[2]!.id)),
      ).toEqual(old[2]);
      const activity = await getDriveBackupActivity(s().c, actor().request);
      expect(activity.rows.some((row) => row.id === root.requestId)).toBe(
        false,
      );
      expect(activity.rows.some((row) => row.id === retry.receiptId)).toBe(
        true,
      );
      expect(
        await finite(() =>
          getDriveBackupDetail(s().c, actor().request, {
            requestId: root.requestId,
            generation: 2,
          }),
        ),
      ).toBe("DRIVE_CONTEXT_CHANGED");
      s().controls.now = new Date(baseTime + 179 * day + 1);
      for (let n = 0; n < 3; n++)
        await f().uow.run((u) =>
          u.driveBackupJobs.prune(s().controls.now, 100),
        );
      expect(
        await f().uow.run((u) => u.driveBackupRequests.find(root.requestId)),
      ).toBeNull();
      expect(
        await f().uow.run((u) => u.driveBackupRequests.find(retry.receiptId)),
      ).toBeNull();
    });
    it("J repository identity and SQL generation guards retain the original receipt", async () => {
      const parent = await bulk([personal[0]!]);
      const [job] = await jobs(parent.requestId);
      await rollback(async (_c, u) => {
        const current = await u.driveBackupJobs.find(job!.id);
        if (!current?.admissionIdentity)
          throw new BusinessRuleError("FIXTURE_JOB", "検証行がありません。");
        const identity = {
          ...current.admissionIdentity,
          storageKey: "different-original",
        };
        expect(
          await finite(() =>
            u.driveBackupJobs.replace(
              {
                ...current,
                admissionIdentity: identity,
                version: current.version + 1,
              },
              current.version,
            ),
          ),
        ).not.toBe("resolved");
      });
      const root = await f().uow.run((u) =>
        u.driveBackupRequests.find(parent.requestId),
      );
      expect(root?.generation).toBe(1);
      expect(
        await finite(() =>
          f().uow.run((u) =>
            u.driveBackupRequests.advanceRoot(
              parent.requestId,
              root!.version,
              1,
            ),
          ),
        ),
      ).not.toBe("resolved");
      expect((await jobs(parent.requestId))[0]).toEqual(job);
    });
  },
);

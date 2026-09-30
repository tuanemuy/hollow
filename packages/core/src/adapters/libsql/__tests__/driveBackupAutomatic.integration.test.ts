import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import {
  insertSnapshotJob,
  parentRoom,
} from "@repo/core/application/integration/drive/backup/admission";
import { admitAutomaticInTransaction } from "@repo/core/application/integration/drive/backup/automatic";
import type { DriveConnection } from "@repo/core/domain/integration/drive";
import type {
  DriveBackupJob,
  DriveBackupRequest,
} from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it } from "vitest";
import { backupNow, closedWorld } from "./driveBackupFixtures";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const off: DriveConnection = {
  accountId: id(1),
  state: "unlinked",
  epoch: 0,
  version: 1,
  credentialVersion: 0,
  settingsVersion: 1,
  admissionSequence: 0,
  autoBackup: false,
  credential: null,
  folder: null,
  lastUsedAt: null,
  updatedAt: backupNow,
};
describe("automatic backup application ports without DB or external effects", () => {
  it.each([
    null,
    off,
  ])("does not read an original or allocate anything when automatic backup is off", async (row) => {
    let reads = 0;
    const u = closedWorld<HollowUnitOfWorkContext>({
      driveConnections: closedWorld<
        HollowUnitOfWorkContext["driveConnections"]
      >({
        find: async () => {
          reads++;
          return row;
        },
      }),
    });
    expect(
      await admitAutomaticInTransaction(closedWorld<HollowContainer>({}), u, {
        accountId: id(1),
        noteId: id(2),
        originalId: id(3),
        commandId: id(4),
      }),
    ).toBeNull();
    expect(reads).toBe(1);
  });
  it.each([
    { account: 9, global: 99, room: true },
    { account: 10, global: 99, room: false },
    { account: 9, global: 100, room: false },
  ])("keeps parent backlog limits separate from transfer owners", async (value) => {
    const u = closedWorld<HollowUnitOfWorkContext>({
      driveBackupRequests: closedWorld<
        HollowUnitOfWorkContext["driveBackupRequests"]
      >({
        unfinished: async () => ({
          account: value.account,
          global: value.global,
        }),
      }),
    });
    expect(await parentRoom(u, id(1))).toBe(value.room);
  });
  it.each([
    "DRIVE_BACKUP_UNAVAILABLE",
    "DRIVE_BACKUP_REFRESH_REQUIRED",
  ] as const)("preserves complete immutable source/target on a known automatic acceptance failure", async (failure) => {
    const folder = {
      id: "folder",
      name: "保存先",
      driveId: null,
      resourceKeyEnvelope: null,
      checkedAt: backupNow,
    };
    const identity = {
      accountId: id(1),
      noteId: id(2),
      originalId: id(3),
      workspaceId: null,
      ownershipGeneration: 1,
      storageKey: "original",
      bytes: 1024,
      sha256: "a".repeat(64),
      name: "original.pdf",
      subject: "subject",
      epoch: 1,
      settingsVersion: 1,
      folder,
    };
    const parent: DriveBackupRequest = {
      id: id(4),
      accountId: id(1),
      commandId: id(5),
      intentDigest: "b".repeat(64),
      kind: "automatic",
      version: 1,
      count: 1,
      createdAt: backupNow,
      cancelledAt: null,
    };
    const saved: DriveBackupJob[] = [];
    const u = closedWorld<HollowUnitOfWorkContext>({
      driveBackupJobs: closedWorld<HollowUnitOfWorkContext["driveBackupJobs"]>({
        insert: async (row) => {
          saved.push(row);
        },
      }),
    });
    const c = closedWorld<HollowContainer>({
      clock: { now: () => backupNow },
      idGenerator: closedWorld<HollowContainer["idGenerator"]>({
        next: () => id(6),
      }),
    });
    const result = await insertSnapshotJob(
      c,
      u,
      parent,
      {
        identity,
        target: {
          id: id(7),
          originalId: id(3),
          noteId: id(2),
          accountId: id(1),
          subject: "subject",
          marker: id(8),
          folder,
          folderEpoch: 1,
          fileId: null,
          state: "unallocated",
          version: 1,
          createdAt: backupNow,
          updatedAt: backupNow,
        },
        record: null,
        title: "原本",
      },
      0,
      { failure },
    );
    expect(result.state).toBe("failed");
    expect(result.admissionIdentity).toEqual(identity);
    expect(result.targetId).toBe(id(7));
    expect(saved).toEqual([result]);
  });
});

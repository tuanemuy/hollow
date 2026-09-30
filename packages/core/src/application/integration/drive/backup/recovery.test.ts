import type { DriveConnection } from "@repo/core/domain/integration/drive";
import type {
  DriveBackupTarget,
  DriveBackupTransfer,
} from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it } from "vitest";
import type { DriveSecretProtector } from "../ports";
import {
  backupFolderCurrent,
  backupReceivedWithinIntent,
  backupSessionBinding,
  backupTargetMatches,
} from "./recovery";

const now = new Date("2026-10-01T00:00:00Z");
const folder = {
  id: "folder",
  driveId: null,
  name: "Folder",
  resourceKeyEnvelope: "old",
  checkedAt: now,
};
const target: DriveBackupTarget = {
  id: "target",
  accountId: "actor",
  subject: "sub",
  noteId: "note",
  originalId: "original",
  folder,
  folderEpoch: 1,
  state: "allocated",
  fileId: "file",
  marker: "marker",
  version: 1,
  createdAt: now,
  updatedAt: now,
};
const connection: DriveConnection = {
  accountId: "actor",
  state: "linked",
  epoch: 2,
  version: 2,
  credentialVersion: 2,
  settingsVersion: 2,
  admissionSequence: 1,
  autoBackup: false,
  lastUsedAt: null,
  updatedAt: now,
  folder: { ...folder, resourceKeyEnvelope: "new" },
  credential: {
    subject: "sub",
    email: null,
    envelope: "credential",
    scopes: [],
    accessExpiresAt: now,
    connectedAt: now,
  },
};
const row: DriveBackupTransfer = {
  id: "transfer",
  targetId: "target",
  jobId: "job",
  phase: "failed",
  failure: "DRIVE_BACKUP_UNKNOWN",
  identity: {
    accountId: "actor",
    subject: "sub",
    noteId: "note",
    originalId: "original",
    folder,
    epoch: 2,
    settingsVersion: 2,
    bytes: 100,
    sha256: "a".repeat(64),
    storageKey: "key",
    name: "source",
    ownershipGeneration: 1,
    workspaceId: null,
  },
  owner: { state: "closed", runtimeGeneration: "runtime", token: "token" },
  credentialVersion: 2,
  version: 4,
  cancelGeneration: 0,
  received: 20,
  sessionEnvelope: "session",
  statusAttempts: 1,
  createdAt: now,
  updatedAt: now,
  deadlineAt: new Date(now.getTime() + 1000),
  readPinned: false,
  refreshPending: false,
};
function protector(unequal = false): DriveSecretProtector {
  return {
    available: () => true,
    protect: () => "protected",
    reveal: (envelope, binding) => {
      if (
        binding.purpose !== "resource-key" ||
        binding.accountId !== "actor" ||
        binding.subject !== "sub" ||
        binding.fileId !== "folder" ||
        !(
          (envelope === "old" && binding.epoch === 1) ||
          (envelope === "new" && binding.epoch === 2)
        )
      )
        throw { code: "BINDING" };
      return unequal ? envelope : "same-plaintext";
    },
  };
}
describe("Drive backup recovery evidence", () => {
  it("separates current credentials from immutable target ciphertext and its old AAD", () => {
    expect(backupFolderCurrent(protector(), target, connection)).toBe(true);
    expect(backupTargetMatches(row, target)).toBe(true);
    expect(row.identity.epoch !== target.folderEpoch).toBe(true);
    expect(backupFolderCurrent(protector(true), target, connection)).toBe(
      false,
    );
  });
  it("rejects wrong epochs, unknown envelopes and locator mismatch", () => {
    expect(
      backupFolderCurrent(
        protector(),
        { ...target, folderEpoch: 2 },
        connection,
      ),
    ).toBe(false);
    expect(
      backupFolderCurrent(
        protector(),
        { ...target, folder: { ...folder, resourceKeyEnvelope: "unknown" } },
        connection,
      ),
    ).toBe(false);
    expect(
      backupFolderCurrent(protector(), target, {
        ...connection,
        folder: { ...folder, id: "other" },
      }),
    ).toBe(false);
  });
  it("accepts only null/null and never confuses missing and nonnull resource keys", () => {
    const empty = {
      ...target,
      folder: { ...folder, resourceKeyEnvelope: null },
    };
    const current = {
      ...connection,
      folder: { ...folder, resourceKeyEnvelope: null },
    };
    expect(backupFolderCurrent(protector(), empty, current)).toBe(true);
    expect(backupFolderCurrent(protector(), empty, connection)).toBe(false);
    expect(backupFolderCurrent(protector(), target, current)).toBe(false);
  });
  it("binds sessions to their own transfer and credential epoch", () => {
    const old = backupSessionBinding(
      { ...row, id: "old-transfer", identity: { ...row.identity, epoch: 1 } },
      "file",
    );
    const current = backupSessionBinding(row, "file");
    expect(old).not.toEqual(current);
    expect(old).toMatchObject({
      epoch: 1,
      transferId: "old-transfer",
      fileId: "file",
    });
    expect(current).toMatchObject({
      epoch: 2,
      transferId: "transfer",
      fileId: "file",
    });
  });
  for (const phase of ["failed", "reconciling"] as const)
    for (const offset of [0, 19, 20, 21, 100, 101, Number.NaN, 20.5])
      it(`${phase} adopts only its exact confirmed position: ${offset}`, () => {
        const value: DriveBackupTransfer =
          phase === "failed"
            ? row
            : { ...row, phase, sessionEnvelope: "session" };
        expect(backupReceivedWithinIntent(value, offset)).toBe(offset === 20);
      });
  for (const offset of [19, 20, 39, 40, 41, 100])
    it(`uploading requires a durable intent upper bound: ${offset}`, () => {
      const value: DriveBackupTransfer = {
        ...row,
        phase: "uploading",
        sessionEnvelope: "session",
        offset: 20,
        length: 20,
      };
      expect(backupReceivedWithinIntent(value, offset)).toBe(
        offset >= 20 && offset <= 40,
      );
    });
});

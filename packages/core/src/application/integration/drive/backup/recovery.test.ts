import type { DriveConnection } from "@repo/core/domain/integration/drive";
import type {
  DriveBackupJob,
  DriveBackupTarget,
  DriveBackupTransfer,
} from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it } from "vitest";
import type { HollowUnitOfWorkContext } from "../../../execution/hollowUnitOfWork";
import type { DriveSecretProtector } from "../ports";
import {
  backupFolderCurrent,
  backupReceivedWithinIntent,
  backupRetryEvidence,
  backupSameSource,
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

describe("S3 exact job/version recovery evidence", () => {
  const job: DriveBackupJob = {
    id: "job",
    requestId: "request",
    accountId: "actor",
    ordinal: 0,
    attempt: 1,
    retryOf: null,
    noteId: "note",
    targetId: "target",
    title: "原本",
    version: 1,
    createdAt: now,
    updatedAt: now,
    terminalAt: now,
    state: "failed",
    failure: "DRIVE_BACKUP_UNAVAILABLE",
    bytes: 0,
    admissionIdentity: row.identity,
  };
  function context(
    exact: Awaited<
      ReturnType<HollowUnitOfWorkContext["driveBackupTransfers"]["forJob"]>
    >,
    safe = false,
    current = true,
  ) {
    let proofs = 0;
    const u = {
      driveBackupTargets: { isCurrent: async () => current },
      driveBackupTransfers: {
        forJob: async () => exact,
        canRetryUnstarted: async () => {
          proofs++;
          return safe;
        },
      },
    } as unknown as HollowUnitOfWorkContext;
    return { u, proofs: () => proofs };
  }
  it("does not revive an old captured job after its head was replaced", async () => {
    const f = context({ kind: "found", row }, true, false);
    expect(
      await backupRetryEvidence(f.u, job, target, row.identity),
    ).toBeNull();
    expect(f.proofs()).toBe(0);
  });
  it("allows a snapshot-only failure only with the exact unstarted repository proof", async () => {
    for (const safe of [false, true]) {
      const f = context({ kind: "missing" }, safe);
      expect(
        await backupRetryEvidence(
          f.u,
          job,
          { ...target, state: "unallocated", fileId: null },
          row.identity,
        ),
      ).toEqual(safe ? { kind: "unstarted" } : null);
      expect(f.proofs()).toBe(1);
    }
  });
  it("rejects legacy missing and ambiguous rows without inventing an initial transfer", async () => {
    for (const exact of [{ kind: "missing" }, { kind: "ambiguous" }] as const) {
      const f = context(exact, true);
      expect(
        await backupRetryEvidence(
          f.u,
          { ...job, admissionIdentity: null },
          target,
          row.identity,
        ),
      ).toBeNull();
      expect(f.proofs()).toBe(0);
    }
  });
  it("keeps the closed predecessor for S2 same-ID/session recovery", async () => {
    const f = context({ kind: "found", row });
    expect(
      await backupRetryEvidence(f.u, job, target, {
        ...row.identity,
        epoch: 3,
        settingsVersion: 8,
      }),
    ).toEqual({ kind: "started", prior: row });
    expect(f.proofs()).toBe(0);
  });
  it("rejects unknown owners and source movement rather than accepting a fresh start", async () => {
    const f = context({
      kind: "found",
      row: {
        ...row,
        owner: {
          state: "unknown",
          runtimeGeneration: "runtime",
          token: "token",
        },
      },
    });
    expect(
      await backupRetryEvidence(f.u, job, target, row.identity),
    ).toBeNull();
    const g = context({ kind: "found", row }, true);
    expect(
      await backupRetryEvidence(g.u, job, target, {
        ...row.identity,
        ownershipGeneration: 2,
      }),
    ).toBeNull();
    expect(g.proofs()).toBe(0);
  });
  it("ignores only credential/settings revisions, not fixed source or folder identity", () => {
    expect(
      backupSameSource(row.identity, {
        ...row.identity,
        epoch: 3,
        settingsVersion: 7,
      }),
    ).toBe(true);
    for (const patch of [
      { subject: "other" },
      { originalId: "other" },
      { workspaceId: "other" },
      { storageKey: "other" },
      { sha256: "b".repeat(64) },
      { folder: { ...folder, id: "other" } },
    ])
      expect(
        backupSameSource(row.identity, { ...row.identity, ...patch }),
      ).toBe(false);
  });
});
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

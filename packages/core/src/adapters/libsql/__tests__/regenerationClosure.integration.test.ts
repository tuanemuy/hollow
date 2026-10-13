import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { regenerationRecordState } from "@repo/core/application/regeneration/current";
import type { Account } from "@repo/core/domain/account/entity";
import type { Original } from "@repo/core/domain/import/entity";
import type { DriveConnection } from "@repo/core/domain/integration/drive";
import {
  type DriveBackupRecord,
  type DriveBackupTarget,
  driveBackupRecordSchema,
  driveBackupTargetSchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import { describe, expect, it } from "vitest";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-10-01T00:00:00.000Z");
const record: DriveBackupRecord = parseDriveBackup(driveBackupRecordSchema, {
  id: id(1),
  version: 1,
  targetId: id(2),
  noteId: id(3),
  originalId: id(4),
  accountId: id(5),
  subject: "recorded-subject",
  fileId: "recorded-file",
  folder: {
    id: "recorded-folder",
    name: "Recorded folder",
    driveId: "recorded-drive",
    resourceKeyEnvelope: "synthetic-record-folder-envelope",
    checkedAt: now,
  },
  bytes: 128,
  sha256: "a".repeat(64),
  createdAt: now,
  webViewLink: null,
  resourceKeyEnvelope: "synthetic-record-file-envelope",
});
const target: DriveBackupTarget = parseDriveBackup(driveBackupTargetSchema, {
  id: record.targetId,
  originalId: record.originalId,
  noteId: record.noteId,
  accountId: record.accountId,
  subject: record.subject,
  marker: id(6),
  folder: {
    ...record.folder,
    resourceKeyEnvelope: "synthetic-target-folder-envelope",
  },
  folderEpoch: 1,
  version: 2,
  createdAt: now,
  updatedAt: now,
  state: "confirmed",
  fileId: record.fileId,
});
const original: Original = {
  id: record.originalId,
  noteId: record.noteId,
  accountId: id(7),
  name: "original.html",
  bytes: record.bytes,
  storageKey: "synthetic-local-original",
  sha256: record.sha256,
  format: "html",
  state: "ready",
  coverage: "complete",
  activeJobId: id(8),
  createdAt: now,
};
const recorder: Account = {
  id: record.accountId,
  email: "recorder@example.test",
  passwordHash: "synthetic-password-hash",
  google: null,
  authVersion: 1,
  createdAt: now,
  status: "verified",
  verifiedAt: now,
};
const linked: Extract<DriveConnection, { state: "linked" }> = {
  accountId: record.accountId,
  epoch: 3,
  version: 4,
  credentialVersion: 5,
  settingsVersion: 6,
  admissionSequence: 7,
  autoBackup: false,
  lastUsedAt: null,
  updatedAt: now,
  state: "linked",
  credential: {
    subject: record.subject,
    email: "recorder@example.test",
    envelope: "synthetic-credential-envelope",
    scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
    accessExpiresAt: new Date("2026-10-01T01:00:00.000Z"),
    connectedAt: now,
  },
  folder: null,
};

function closedWorld<T extends object>(values: Partial<T>): T {
  return new Proxy(values, {
    get(target, key) {
      if (!Object.hasOwn(target, key))
        throw new Error("UNEXPECTED_PORT_ACCESS");
      return Reflect.get(target, key);
    },
    set() {
      throw new Error("UNEXPECTED_PORT_WRITE");
    },
  }) as T;
}

function fixture(
  options: {
    record?: DriveBackupRecord;
    original?: Original | null;
    target?: DriveBackupTarget | null;
    recorder?: Account | null;
    connection?: DriveConnection | null;
  } = {},
) {
  const {
    record: selected = record,
    original: storedOriginal = original,
    target: storedTarget = target,
    recorder: storedRecorder = recorder,
    connection = linked,
  } = options;
  const calls: string[] = [];
  const u = closedWorld<HollowUnitOfWorkContext>({
    imports: closedWorld<HollowUnitOfWorkContext["imports"]>({
      async findOriginal(originalId) {
        expect(originalId).toBe(selected.originalId);
        calls.push("original");
        return storedOriginal;
      },
    }),
    driveBackupTargets: closedWorld<
      HollowUnitOfWorkContext["driveBackupTargets"]
    >({
      async find(targetId) {
        expect(targetId).toBe(selected.targetId);
        calls.push("target");
        return storedTarget;
      },
    }),
    accounts: closedWorld<HollowUnitOfWorkContext["accounts"]>({
      async findById(accountId) {
        expect(accountId).toBe(selected.accountId);
        calls.push("recorder");
        return storedRecorder;
      },
    }),
    driveConnections: closedWorld<HollowUnitOfWorkContext["driveConnections"]>({
      async find(accountId) {
        expect(accountId).toBe(selected.accountId);
        calls.push("connection");
        return connection;
      },
    }),
  });
  return { u, selected, calls };
}

const available = { format: "html", availability: "available", reason: null };
const invalid = {
  format: null,
  availability: "unavailable",
  reason: "source-invalid",
};

describe("DB-free regeneration availability ports; no authorization/keyset evidence", () => {
  it("projects valid record identity with the recorder's current same-sub connection", async () => {
    const { u, calls } = fixture();
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
      available,
    );
    expect(calls).toEqual(["original", "target", "recorder", "connection"]);
  });

  it("rejects record identity inconsistent with the selected note/original/target", async () => {
    const changes: Partial<DriveBackupRecord>[] = [
      { noteId: id(30) },
      { originalId: id(31) },
      { targetId: id(32) },
      { accountId: id(33) },
      { subject: "other-subject" },
      { fileId: "other-file" },
      { bytes: record.bytes + 1 },
      { sha256: "b".repeat(64) },
      { folder: { ...record.folder, id: "other-folder" } },
      { folder: { ...record.folder, driveId: "other-drive" } },
    ];
    for (const patch of changes) {
      const selected = parseDriveBackup(driveBackupRecordSchema, {
        ...record,
        ...patch,
      });
      const { u, calls } = fixture({ record: selected });
      expect(await regenerationRecordState(u, record.noteId, selected)).toEqual(
        invalid,
      );
      expect(calls).toEqual(["original", "target"]);
    }
  });

  it("rejects missing or mismatched local content identity without reading local bytes", async () => {
    const originals: (Original | null)[] = [
      null,
      { ...original, id: id(30) },
      { ...original, noteId: id(31) },
      { ...original, bytes: original.bytes + 1 },
      { ...original, sha256: "b".repeat(64) },
    ];
    for (const value of originals) {
      const { u } = fixture({ original: value });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
        invalid,
      );
    }
  });

  it("rejects missing, unconfirmed or mismatched historical target identity", async () => {
    const changes = [
      { id: id(30) },
      { noteId: id(31) },
      { originalId: id(32) },
      { accountId: id(33) },
      { subject: "other-subject" },
      { state: "allocated" },
      { state: "unknown" },
      { state: "unallocated", fileId: null },
      { fileId: "other-file" },
      { folder: { ...target.folder, id: "other-folder" } },
      { folder: { ...target.folder, driveId: null } },
    ];
    const targets: (DriveBackupTarget | null)[] = [
      null,
      ...changes.map((patch) =>
        parseDriveBackup(driveBackupTargetSchema, { ...target, ...patch }),
      ),
    ];
    for (const value of targets) {
      const { u } = fixture({ target: value });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
        invalid,
      );
    }
  });

  it("derives format from the matched Original rather than inventing a record format", async () => {
    const { u } = fixture({ original: { ...original, format: "markdown" } });
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
      ...available,
      format: "markdown",
    });
  });

  it("projects matched audio availability without key decryption or external I/O", async () => {
    const { u, calls } = fixture({
      original: { ...original, format: "audio" },
    });
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
      ...available,
      format: "audio",
    });
    expect(calls).toEqual(["original", "target", "recorder", "connection"]);
  });

  it("requires a present verified recorder but does not expose their details", async () => {
    const recorders: (Account | null)[] = [
      null,
      { ...recorder, status: "unverified", verifiedAt: null },
    ];
    for (const value of recorders) {
      const { u, calls } = fixture({ recorder: value });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
        format: "html",
        availability: "unavailable",
        reason: "recorder-unavailable",
      });
      expect(calls).toEqual(["original", "target", "recorder"]);
    }
  });

  it("distinguishes no linked connection from one requiring relink", async () => {
    const connections: (DriveConnection | null)[] = [
      null,
      {
        ...linked,
        state: "unlinked",
        credential: null,
        folder: null,
        autoBackup: false,
        lastUsedAt: null,
      },
    ];
    for (const connection of connections) {
      const { u } = fixture({ connection });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
        format: "html",
        availability: "unavailable",
        reason: "drive-unlinked",
      });
    }
    const { u } = fixture({ connection: { ...linked, state: "needs-relink" } });
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
      format: "html",
      availability: "unavailable",
      reason: "drive-needs-relink",
    });
  });

  it("does not replace the record's subject with another linked account", async () => {
    for (const state of ["linked", "needs-relink"] as const) {
      const { u } = fixture({
        connection: {
          ...linked,
          state,
          credential: { ...linked.credential, subject: "different-subject" },
        },
      });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual({
        format: "html",
        availability: "unavailable",
        reason: "drive-account-changed",
      });
    }
  });

  it("does not consult recorder workspace membership or the current backup head", async () => {
    const { u, calls } = fixture();
    expect(() => u.workspaces).toThrow("UNEXPECTED_PORT_ACCESS");
    expect(() => u.driveBackupTargets.original).toThrow(
      "UNEXPECTED_PORT_ACCESS",
    );
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
      available,
    );
    expect(calls).toEqual(["original", "target", "recorder", "connection"]);
  });

  it("keeps an old record usable after same-sub relink or a current-folder change", async () => {
    for (const folder of [
      null,
      {
        ...record.folder,
        id: "new-folder",
        driveId: "new-drive",
        resourceKeyEnvelope: "synthetic-new-envelope",
      },
    ]) {
      const { u } = fixture({
        connection: {
          ...linked,
          epoch: 9,
          credentialVersion: 10,
          settingsVersion: 11,
          folder,
        },
      });
      expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
        available,
      );
    }
  });

  it("does not compare differently bound record and target resource-key envelopes", async () => {
    expect(target.folder.resourceKeyEnvelope).not.toBe(
      record.folder.resourceKeyEnvelope,
    );
    const { u } = fixture();
    expect(await regenerationRecordState(u, record.noteId, record)).toEqual(
      available,
    );
  });
});

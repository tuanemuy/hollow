import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "../error";
import {
  backupFolderMatches,
  DRIVE_BACKUP_LIMITS,
  driveBackupBulkSummarySchema,
  driveBackupFailureSchema,
  driveBackupIdentitySchema,
  driveBackupJobSchema,
  driveBackupRecordSchema,
  driveBackupRequestSchema,
  driveBackupTargetSchema,
  driveBackupTerminal,
  driveBackupTransferSchema,
  parseDriveBackup,
} from "./driveBackup";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = new Date("2026-09-30T00:00:00.000Z");
const before = new Date(now.getTime() - 1);
const folder = {
  id: "folder",
  name: "保存先",
  driveId: null,
  resourceKeyEnvelope: null,
  checkedAt: now,
};
const identity = {
  noteId: id(1),
  originalId: id(2),
  accountId: id(3),
  workspaceId: null,
  ownershipGeneration: 1,
  storageKey: "synthetic-original",
  bytes: 2_097_153,
  sha256: "a".repeat(64),
  name: "original.pdf",
  subject: "subject",
  epoch: 1,
  settingsVersion: 1,
  folder,
};
describe("S3 immutable admission and parent generation", () => {
  const summary = {
    version: 1 as const,
    digest: "a".repeat(64),
    selected: 500,
    noOriginal: 1,
    denied: 1,
    processing: 1,
    recorded: 1,
    pending: 496,
  };
  it("counts exclusive exclusions, saved originals and all 500 fixed targets", () => {
    expect(driveBackupBulkSummarySchema.safeParse(summary).success).toBe(true);
    expect(
      driveBackupBulkSummarySchema.safeParse({ ...summary, pending: 497 })
        .success,
    ).toBe(false);
    expect(
      driveBackupBulkSummarySchema.safeParse({
        ...summary,
        selected: 501,
        pending: 497,
      }).success,
    ).toBe(false);
  });
  it("rejects snapshot job identity detached from target, note or actor", () => {
    for (const patch of [
      { targetId: null },
      { noteId: id(90) },
      { accountId: id(91) },
    ])
      expect(
        driveBackupJobSchema.safeParse({
          ...job,
          state: "queued",
          bytes: 0,
          terminalAt: null,
          admissionIdentity: identity,
          ...patch,
        }).success,
      ).toBe(false);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "queued",
        bytes: 0,
        terminalAt: null,
        admissionIdentity: identity,
      }).success,
    ).toBe(true);
  });
  it("keeps root summaries separate from one-hop retry generations", () => {
    const root = {
      ...request,
      kind: "bulk",
      generation: 1,
      count: 497,
      rootRequestId: null,
      bulkSummary: summary,
    };
    expect(driveBackupRequestSchema.safeParse(root).success).toBe(true);
    expect(
      driveBackupRequestSchema.safeParse({
        ...root,
        rootRequestId: root.id,
        generation: 2,
      }).success,
    ).toBe(false);
    expect(
      driveBackupRequestSchema.safeParse({
        ...root,
        id: id(99),
        rootRequestId: root.id,
        generation: 2,
        bulkSummary: null,
        count: 1,
      }).success,
    ).toBe(true);
    expect(
      driveBackupRequestSchema.safeParse({
        ...root,
        id: id(99),
        rootRequestId: root.id,
        generation: 1,
        bulkSummary: null,
        count: 1,
      }).success,
    ).toBe(false);
  });
});
const active = {
  state: "active" as const,
  runtimeGeneration: "runtime",
  token: "owner",
};
const closed = { ...active, state: "closed" as const };
const unknown = { ...active, state: "unknown" as const };
const transfer = {
  id: id(4),
  jobId: id(5),
  targetId: id(6),
  identity,
  owner: active,
  credentialVersion: 1,
  version: 1,
  cancelGeneration: 0,
  received: 0,
  sessionEnvelope: null,
  statusAttempts: 0,
  createdAt: now,
  updatedAt: now,
  deadlineAt: new Date(now.getTime() + DRIVE_BACKUP_LIMITS.executionMs),
  readPinned: true,
  refreshPending: false,
  phase: "checking",
};
const request = {
  id: id(7),
  accountId: identity.accountId,
  commandId: id(8),
  intentDigest: "b".repeat(64),
  kind: "manual",
  version: 1,
  createdAt: now,
  cancelledAt: null,
  count: 1,
};
const target = {
  id: transfer.targetId,
  originalId: identity.originalId,
  noteId: identity.noteId,
  accountId: identity.accountId,
  subject: identity.subject,
  marker: id(9),
  folder,
  folderEpoch: 1,
  version: 1,
  createdAt: now,
  updatedAt: now,
  state: "unallocated",
  fileId: null,
};
const job = {
  id: transfer.jobId,
  requestId: request.id,
  accountId: identity.accountId,
  ordinal: 0,
  attempt: 1,
  retryOf: null,
  noteId: identity.noteId,
  targetId: target.id,
  title: "原本",
  version: 1,
  createdAt: now,
  updatedAt: now,
  state: "queued",
  terminalAt: null,
  bytes: 0,
};
const record = {
  id: id(10),
  version: 1,
  targetId: target.id,
  noteId: identity.noteId,
  originalId: identity.originalId,
  accountId: identity.accountId,
  subject: identity.subject,
  fileId: "file",
  folder,
  bytes: identity.bytes,
  sha256: identity.sha256,
  createdAt: now,
  webViewLink: null,
  resourceKeyEnvelope: null,
};

describe("Drive backup closed domain values", () => {
  it("accepts the initial request, target, job, transfer and immutable record shapes", () => {
    expect(driveBackupRequestSchema.safeParse(request).success).toBe(true);
    expect(driveBackupTargetSchema.safeParse(target).success).toBe(true);
    expect(driveBackupJobSchema.safeParse(job).success).toBe(true);
    expect(driveBackupTransferSchema.safeParse(transfer).success).toBe(true);
    expect(driveBackupRecordSchema.safeParse(record).success).toBe(true);
  });
  it("parses persisted instants without mutating its source", () => {
    const input = { ...request, createdAt: now.toISOString() };
    const result = parseDriveBackup(driveBackupRequestSchema, input);
    expect(result.createdAt.getTime()).toBe(now.getTime());
    expect(typeof input.createdAt).toBe("string");
  });
  it("projects malformed input into one finite business code", () => {
    let code = "not-thrown";
    try {
      parseDriveBackup(driveBackupRequestSchema, { ...request, count: 0 });
    } catch (error) {
      code = error instanceof BusinessRuleError ? error.code : "unexpected";
    }
    expect(code).toBe("DRIVE_BACKUP_STATE_INVALID");
  });
  it.each([
    0,
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects an invalid version %s", (version) => {
    expect(
      driveBackupTransferSchema.safeParse({ ...transfer, version }).success,
    ).toBe(false);
  });
  it("bounds original bytes and rejects unsafe storage identities", () => {
    expect(
      driveBackupIdentitySchema.safeParse({
        ...identity,
        bytes: DRIVE_BACKUP_LIMITS.originalBytes,
      }).success,
    ).toBe(true);
    for (const patch of [
      { bytes: 0 },
      { bytes: DRIVE_BACKUP_LIMITS.originalBytes + 1 },
      { storageKey: "../original" },
      { sha256: "A".repeat(64) },
      { workspaceId: "unknown" },
    ])
      expect(
        driveBackupIdentitySchema.safeParse({ ...identity, ...patch }).success,
      ).toBe(false);
  });
  it("caps bulk count and ordinal independently", () => {
    expect(
      driveBackupRequestSchema.safeParse({ ...request, count: 500 }).success,
    ).toBe(true);
    expect(
      driveBackupRequestSchema.safeParse({ ...request, count: 501 }).success,
    ).toBe(false);
    expect(
      driveBackupJobSchema.safeParse({ ...job, ordinal: 499 }).success,
    ).toBe(true);
    expect(
      driveBackupJobSchema.safeParse({ ...job, ordinal: 500 }).success,
    ).toBe(false);
  });
  it("requires a file ID exactly for allocated, unknown and confirmed targets", () => {
    for (const state of ["allocated", "unknown", "confirmed"]) {
      expect(
        driveBackupTargetSchema.safeParse({
          ...target,
          state,
          fileId: "same-file",
        }).success,
      ).toBe(true);
      expect(
        driveBackupTargetSchema.safeParse({ ...target, state }).success,
      ).toBe(false);
    }
    expect(
      driveBackupTargetSchema.safeParse({ ...target, fileId: "unexpected" })
        .success,
    ).toBe(false);
  });
  it("binds uploading ranges to confirmed progress and the bounded source", () => {
    const upload = {
      ...transfer,
      phase: "uploading",
      sessionEnvelope: "opaque",
      received: 1,
      offset: 1,
      length: DRIVE_BACKUP_LIMITS.chunkBytes,
    };
    expect(driveBackupTransferSchema.safeParse(upload).success).toBe(true);
    for (const patch of [
      { offset: 0 },
      { length: 0 },
      { length: DRIVE_BACKUP_LIMITS.chunkBytes + 1 },
      { received: identity.bytes, offset: identity.bytes, length: 1 },
      { sessionEnvelope: null },
    ])
      expect(
        driveBackupTransferSchema.safeParse({ ...upload, ...patch }).success,
      ).toBe(false);
  });
  it("requires an opaque session for reconciliation and bounds status attempts", () => {
    const value = {
      ...transfer,
      phase: "reconciling",
      sessionEnvelope: "opaque",
      statusAttempts: 3,
    };
    expect(driveBackupTransferSchema.safeParse(value).success).toBe(true);
    expect(
      driveBackupTransferSchema.safeParse({ ...value, statusAttempts: 4 })
        .success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({ ...value, sessionEnvelope: null })
        .success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({
        ...value,
        received: identity.bytes + 1,
      }).success,
    ).toBe(false);
  });
  it("allows cancellation to retain an unknown owner and both pending resources", () => {
    const value = {
      ...transfer,
      phase: "cancelled",
      owner: unknown,
      cancelGeneration: 1,
      refreshPending: true,
      received: 1024,
    };
    expect(driveBackupTransferSchema.safeParse(value).success).toBe(true);
    expect(
      driveBackupTransferSchema.safeParse({ ...value, phase: "checking" })
        .success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({
        ...value,
        failure: "DRIVE_BACKUP_CANCELLED",
      }).success,
    ).toBe(false);
  });
  it.each([
    "readPinned",
    "refreshPending",
  ] as const)("requires owner:none to have no %s", (field) => {
    const queued = {
      ...transfer,
      phase: "queued",
      owner: { state: "none" },
      readPinned: false,
      refreshPending: false,
    };
    expect(driveBackupTransferSchema.safeParse(queued).success).toBe(true);
    expect(
      driveBackupTransferSchema.safeParse({ ...queued, [field]: true }).success,
    ).toBe(false);
  });
  it.each([
    "readPinned",
    "refreshPending",
  ] as const)("requires closed owners to release %s", (field) => {
    const value = { ...transfer, owner: closed, readPinned: false };
    expect(driveBackupTransferSchema.safeParse(value).success).toBe(true);
    expect(
      driveBackupTransferSchema.safeParse({ ...value, [field]: true }).success,
    ).toBe(false);
  });
  it("requires full progress, a record and real closure for success", () => {
    const value = {
      ...transfer,
      phase: "succeeded",
      owner: closed,
      readPinned: false,
      received: identity.bytes,
      recordId: record.id,
    };
    expect(driveBackupTransferSchema.safeParse(value).success).toBe(true);
    for (const patch of [
      { owner: active },
      { owner: unknown },
      { received: identity.bytes - 1 },
      { recordId: undefined },
      { refreshPending: true },
      { cancelGeneration: 1 },
    ])
      expect(
        driveBackupTransferSchema.safeParse({ ...value, ...patch }).success,
      ).toBe(false);
  });
  it("keeps terminal result variants exclusive", () => {
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "succeeded",
        terminalAt: now,
        bytes: identity.bytes,
        recordId: record.id,
      }).success,
    ).toBe(true);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "failed",
        terminalAt: now,
        failure: "DRIVE_BACKUP_DENIED",
      }).success,
    ).toBe(true);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "cancelled",
        terminalAt: now,
      }).success,
    ).toBe(true);
    for (const patch of [
      { bytes: 1 },
      { state: "failed", terminalAt: now },
      { state: "succeeded", terminalAt: now },
      {
        state: "cancelled",
        terminalAt: now,
        failure: "DRIVE_BACKUP_CANCELLED",
      },
    ])
      expect(driveBackupJobSchema.safeParse({ ...job, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects job progress beyond the original maximum", () => {
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "running",
        bytes: DRIVE_BACKUP_LIMITS.originalBytes,
      }).success,
    ).toBe(true);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "running",
        bytes: DRIVE_BACKUP_LIMITS.originalBytes + 1,
      }).success,
    ).toBe(false);
  });
  it("rejects reversed persisted lifetimes", () => {
    expect(
      driveBackupRequestSchema.safeParse({ ...request, cancelledAt: before })
        .success,
    ).toBe(false);
    expect(
      driveBackupTargetSchema.safeParse({ ...target, updatedAt: before })
        .success,
    ).toBe(false);
    expect(
      driveBackupJobSchema.safeParse({ ...job, updatedAt: before }).success,
    ).toBe(false);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "cancelled",
        terminalAt: before,
      }).success,
    ).toBe(false);
    expect(
      driveBackupJobSchema.safeParse({
        ...job,
        state: "cancelled",
        terminalAt: new Date(now.getTime() + 1),
      }).success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({ ...transfer, updatedAt: before })
        .success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({ ...transfer, deadlineAt: now })
        .success,
    ).toBe(false);
  });
  it("makes record version immutable and excludes job or credential lifetime fields", () => {
    for (const patch of [
      { version: 2 },
      { jobId: job.id },
      { credentialEnvelope: "unexpected" },
      { sha256: "invalid" },
    ])
      expect(
        driveBackupRecordSchema.safeParse({ ...record, ...patch }).success,
      ).toBe(false);
    expect(
      driveBackupRecordSchema.safeParse({
        ...record,
        folder: { ...folder, resourceKeyEnvelope: "record-bound" },
      }).success,
    ).toBe(true);
  });
  it("rejects provider-native failure text and unknown payload fields", () => {
    expect(driveBackupFailureSchema.safeParse("provider error").success).toBe(
      false,
    );
    expect(
      driveBackupTransferSchema.safeParse({
        ...transfer,
        accessToken: "unexpected",
      }).success,
    ).toBe(false);
    expect(
      driveBackupTransferSchema.safeParse({
        ...transfer,
        phase: "failed",
        failure: "provider error",
      }).success,
    ).toBe(false);
  });
  it("matches folder identity without using display name or check time", () => {
    expect(
      backupFolderMatches(folder, {
        ...folder,
        name: "別名",
        checkedAt: before,
      }),
    ).toBe(true);
    for (const patch of [
      { id: "other" },
      { driveId: "shared-drive" },
      { resourceKeyEnvelope: "other-binding" },
    ])
      expect(backupFolderMatches(folder, { ...folder, ...patch })).toBe(false);
  });
  it("classifies exactly the three terminal phases without mutating a value", () => {
    for (const phase of ["succeeded", "failed", "cancelled"] as const)
      expect(driveBackupTerminal(phase)).toBe(true);
    for (const phase of [
      "queued",
      "checking",
      "allocating",
      "refreshing",
      "initiating",
      "uploading",
      "reconciling",
      "verifying",
    ] as const)
      expect(driveBackupTerminal(phase)).toBe(false);
    const original = JSON.stringify(transfer);
    parseDriveBackup(driveBackupTransferSchema, transfer);
    expect(JSON.stringify(transfer)).toBe(original);
  });
});

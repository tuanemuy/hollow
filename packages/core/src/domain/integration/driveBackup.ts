import { z } from "zod";
import { BusinessRuleError } from "../error";
import {
  driveFolderSchema,
  driveOwnerSchema,
  driveSubjectSchema,
} from "./drive";

export const DRIVE_BACKUP_LIMITS = {
  chunkBytes: 1_048_576,
  sourceReadBytes: 65_536,
  originalBytes: 209_715_200,
  executionMs: 1_800_000,
  httpMs: 30_000,
  closeMs: 5_000,
  historyMs: 90 * 86_400_000,
  globalOwners: 1,
  accountOwners: 1,
  globalQueued: 100,
  accountQueued: 10,
  scanLimit: 100,
  statusAttempts: 3,
} as const;

const number = z.number().int().safe().nonnegative();
const version = number.min(1);
const instant = z.union([
  z.date(),
  z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v)),
]);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const identifier = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[A-Za-z0-9_-]+$/);
const envelope = z.string().min(1).max(65_536);

export const driveBackupFailureSchema = z.enum([
  "DRIVE_BACKUP_CANCELLED",
  "DRIVE_BACKUP_EXPIRED",
  "DRIVE_BACKUP_CHANGED",
  "DRIVE_BACKUP_SOURCE_INVALID",
  "DRIVE_BACKUP_SOURCE_CHANGED",
  "DRIVE_BACKUP_SOURCE_UNAVAILABLE",
  "DRIVE_BACKUP_UNKNOWN",
  "DRIVE_BACKUP_CONFLICT",
  "DRIVE_BACKUP_UNAVAILABLE",
  "DRIVE_BACKUP_QUOTA",
  "DRIVE_BACKUP_RATE_LIMIT",
  "DRIVE_BACKUP_DENIED",
  "DRIVE_BACKUP_FOLDER_TRASHED",
  "DRIVE_BACKUP_FOLDER_UNAVAILABLE",
  "DRIVE_BACKUP_REFRESH_REQUIRED",
  "DRIVE_BACKUP_FOLDER_CHANGED",
]);
export type DriveBackupFailure = z.infer<typeof driveBackupFailureSchema>;

export const driveBackupIdentitySchema = z
  .object({
    noteId: z.uuid(),
    originalId: z.uuid(),
    accountId: z.uuid(),
    workspaceId: z.uuid().nullable(),
    ownershipGeneration: version,
    storageKey: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/),
    bytes: version.max(DRIVE_BACKUP_LIMITS.originalBytes),
    sha256: hash,
    name: z.string().min(1).max(255),
    subject: driveSubjectSchema,
    epoch: version,
    settingsVersion: version,
    folder: driveFolderSchema,
  })
  .strict();
export type DriveBackupIdentity = z.infer<typeof driveBackupIdentitySchema>;

export const driveBackupBulkSummarySchema = z
  .object({
    version: z.literal(1),
    digest: hash,
    selected: version.max(500),
    noOriginal: number.max(500),
    denied: number.max(500),
    processing: number.max(500),
    recorded: number.max(500),
    pending: number.max(500),
  })
  .strict()
  .refine(
    (v) =>
      v.selected ===
      v.noOriginal + v.denied + v.processing + v.recorded + v.pending,
  );
export type DriveBackupBulkSummary = z.infer<
  typeof driveBackupBulkSummarySchema
>;

export const driveBackupRequestSchema = z
  .object({
    id: z.uuid(),
    accountId: z.uuid(),
    commandId: z.uuid(),
    intentDigest: hash,
    kind: z.enum(["manual", "automatic", "bulk"]),
    version,
    createdAt: instant,
    cancelledAt: instant.nullable(),
    count: version.max(500),
    bulkSummary: driveBackupBulkSummarySchema.nullable().optional(),
    rootRequestId: z.uuid().nullable().optional(),
    generation: version.optional(),
  })
  .strict()
  .refine(
    (v) =>
      (v.cancelledAt === null || v.cancelledAt >= v.createdAt) &&
      (!v.rootRequestId ||
        (v.kind === "bulk" &&
          v.rootRequestId !== v.id &&
          (v.generation ?? 1) > 1)) &&
      (!v.bulkSummary ||
        (v.kind === "bulk" &&
          !v.rootRequestId &&
          v.count === v.bulkSummary.recorded + v.bulkSummary.pending)),
  );
export type DriveBackupRequest = z.infer<typeof driveBackupRequestSchema>;

const jobBase = {
  id: z.uuid(),
  requestId: z.uuid(),
  accountId: z.uuid(),
  ordinal: number.max(499),
  attempt: version,
  retryOf: z.uuid().nullable(),
  noteId: z.uuid().nullable(),
  targetId: z.uuid().nullable(),
  title: z.string().max(1000),
  version,
  createdAt: instant,
  updatedAt: instant,
  admissionIdentity: driveBackupIdentitySchema.nullable().optional(),
  rootOrdinal: number.max(499).nullable().optional(),
};
export const driveBackupJobSchema = z
  .discriminatedUnion("state", [
    z
      .object({
        ...jobBase,
        state: z.literal("queued"),
        terminalAt: z.null(),
        bytes: z.literal(0),
      })
      .strict(),
    z
      .object({
        ...jobBase,
        state: z.literal("running"),
        terminalAt: z.null(),
        bytes: number.max(DRIVE_BACKUP_LIMITS.originalBytes),
      })
      .strict(),
    z
      .object({
        ...jobBase,
        state: z.literal("succeeded"),
        terminalAt: instant,
        bytes: number.max(DRIVE_BACKUP_LIMITS.originalBytes),
        recordId: z.uuid(),
      })
      .strict(),
    z
      .object({
        ...jobBase,
        state: z.literal("failed"),
        terminalAt: instant,
        bytes: number.max(DRIVE_BACKUP_LIMITS.originalBytes),
        failure: driveBackupFailureSchema,
      })
      .strict(),
    z
      .object({
        ...jobBase,
        state: z.literal("cancelled"),
        terminalAt: instant,
        bytes: number.max(DRIVE_BACKUP_LIMITS.originalBytes),
      })
      .strict(),
  ])
  .refine(
    (v) =>
      v.updatedAt >= v.createdAt &&
      (!v.admissionIdentity ||
        (v.targetId !== null &&
          v.noteId === v.admissionIdentity.noteId &&
          v.accountId === v.admissionIdentity.accountId)) &&
      (v.terminalAt === null ||
        (v.terminalAt >= v.createdAt && v.terminalAt <= v.updatedAt)),
  );
export type DriveBackupJob = z.infer<typeof driveBackupJobSchema>;
export type DriveBackupSnapshotJob = DriveBackupJob &
  Readonly<{
    admissionIdentity: DriveBackupIdentity;
    targetId: string;
    noteId: string;
  }>;

export function backupHasSnapshot(
  job: DriveBackupJob,
): job is DriveBackupSnapshotJob {
  return (
    job.admissionIdentity != null &&
    job.targetId !== null &&
    job.noteId !== null
  );
}

const targetBase = {
  id: z.uuid(),
  originalId: z.uuid(),
  noteId: z.uuid(),
  accountId: z.uuid(),
  subject: driveSubjectSchema,
  marker: z.uuid(),
  folder: driveFolderSchema,
  folderEpoch: version,
  version,
  createdAt: instant,
  updatedAt: instant,
};
export const driveBackupTargetSchema = z
  .discriminatedUnion("state", [
    z
      .object({
        ...targetBase,
        state: z.literal("unallocated"),
        fileId: z.null(),
      })
      .strict(),
    z
      .object({
        ...targetBase,
        state: z.enum(["allocated", "unknown", "confirmed"]),
        fileId: identifier,
      })
      .strict(),
  ])
  .refine((v) => v.updatedAt >= v.createdAt);
export type DriveBackupTarget = z.infer<typeof driveBackupTargetSchema>;

export const driveBackupTargetHeadSchema = z
  .object({
    originalId: z.uuid(),
    accountId: z.uuid(),
    subject: driveSubjectSchema,
    targetId: z.uuid(),
    version,
  })
  .strict();
export type DriveBackupTargetHead = z.infer<typeof driveBackupTargetHeadSchema>;
export type DriveBackupTargetTuple = Pick<
  DriveBackupTargetHead,
  "originalId" | "accountId" | "subject"
>;
export type RetargetPersistenceEvidence =
  | Readonly<{
      kind: "never-sent";
      head: DriveBackupTargetHead;
      target: Extract<DriveBackupTarget, { state: "unallocated" }>;
      closure: "never-owned" | "closed-before-create";
    }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "active"
        | "already-saved"
        | "allocated"
        | "delivery-unknown"
        | "ownership-unproven"
        | "changed"
        | "invalid-evidence";
    }>;

const transferBase = {
  id: z.uuid(),
  jobId: z.uuid().nullable(),
  targetId: z.uuid(),
  identity: driveBackupIdentitySchema,
  owner: driveOwnerSchema,
  credentialVersion: version,
  version,
  cancelGeneration: number,
  received: number,
  sessionEnvelope: envelope.nullable(),
  statusAttempts: number.max(DRIVE_BACKUP_LIMITS.statusAttempts),
  createdAt: instant,
  updatedAt: instant,
  deadlineAt: instant,
  readPinned: z.boolean(),
  refreshPending: z.boolean(),
};
export const driveBackupTransferSchema = z
  .discriminatedUnion("phase", [
    z
      .object({
        ...transferBase,
        phase: z.enum([
          "queued",
          "checking",
          "allocating",
          "refreshing",
          "initiating",
          "verifying",
        ]),
      })
      .strict(),
    z
      .object({
        ...transferBase,
        phase: z.literal("uploading"),
        sessionEnvelope: envelope,
        offset: number,
        length: version.max(DRIVE_BACKUP_LIMITS.chunkBytes),
      })
      .strict(),
    z
      .object({
        ...transferBase,
        phase: z.literal("reconciling"),
        sessionEnvelope: envelope,
      })
      .strict(),
    z
      .object({
        ...transferBase,
        phase: z.literal("succeeded"),
        recordId: z.uuid(),
      })
      .strict(),
    z
      .object({
        ...transferBase,
        phase: z.literal("failed"),
        failure: driveBackupFailureSchema,
      })
      .strict(),
    z.object({ ...transferBase, phase: z.literal("cancelled") }).strict(),
  ])
  .refine(
    (value) =>
      value.received <= value.identity.bytes &&
      value.updatedAt >= value.createdAt &&
      value.deadlineAt > value.createdAt &&
      (value.phase !== "uploading" ||
        (value.offset === value.received &&
          value.offset + value.length <= value.identity.bytes)) &&
      (value.owner.state !== "none" ||
        (!value.readPinned &&
          !value.refreshPending &&
          (value.phase === "queued" ||
            value.phase === "cancelled" ||
            value.phase === "failed"))) &&
      (value.owner.state !== "closed" ||
        (!value.readPinned && !value.refreshPending)) &&
      (value.phase !== "succeeded" ||
        (value.owner.state === "closed" &&
          value.received === value.identity.bytes)) &&
      (value.cancelGeneration === 0 || value.phase === "cancelled"),
  );
export type DriveBackupTransfer = z.infer<typeof driveBackupTransferSchema>;

export const driveBackupRecordSchema = z
  .object({
    id: z.uuid(),
    version: z.literal(1),
    targetId: z.uuid(),
    noteId: z.uuid(),
    originalId: z.uuid(),
    accountId: z.uuid(),
    subject: driveSubjectSchema,
    fileId: identifier,
    folder: driveFolderSchema,
    bytes: version.max(DRIVE_BACKUP_LIMITS.originalBytes),
    sha256: hash,
    createdAt: instant,
    webViewLink: z.string().url().max(4096).nullable(),
    resourceKeyEnvelope: envelope.nullable(),
  })
  .strict();
export type DriveBackupRecord = z.infer<typeof driveBackupRecordSchema>;

export function parseDriveBackup<S extends z.ZodType>(
  schema: S,
  value: unknown,
): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BusinessRuleError(
      "DRIVE_BACKUP_STATE_INVALID",
      "バックアップの保存状態を確認できません。",
    );
  return result.data;
}

export function backupFolderMatches(
  a: DriveBackupIdentity["folder"],
  b: DriveBackupIdentity["folder"],
): boolean {
  return (
    a.id === b.id &&
    a.driveId === b.driveId &&
    a.resourceKeyEnvelope === b.resourceKeyEnvelope
  );
}

export function driveBackupTerminal(
  phase: DriveBackupTransfer["phase"],
): boolean {
  return phase === "succeeded" || phase === "failed" || phase === "cancelled";
}

import { z } from "zod";
import { BusinessRuleError } from "../error";

export const DRIVE_LIMITS = {
  authorizationMs: 600_000,
  receiptMs: 86_400_000,
  historyMs: 90 * 86_400_000,
  pickerMs: 300_000,
  operationMs: 600_000,
  httpMs: 10_000,
  executionMs: 30_000,
  closeMs: 5_000,
  httpBytes: 65_536,
  certificateBytes: 262_144,
  requestBytes: 16_384,
  globalOwners: 2,
  accountOwners: 1,
  accountQueued: 10,
  globalQueued: 100,
  browserAttempts: 3,
  browserRecent: 5,
  pruneBatch: 100,
  pruneMs: 60_000,
} as const;

const integer = z.number().int().safe().nonnegative();
const version = integer.min(1);
const instant = z
  .union([
    z.date(),
    z
      .string()
      .datetime({ offset: true })
      .transform((v) => new Date(v)),
  ])
  .refine((d) => Number.isSafeInteger(d.getTime()));
const bounded = (max: number) =>
  z
    .string()
    .min(1)
    .refine((v) => new TextEncoder().encode(v).length <= max);
const identifier = bounded(1024).regex(/^[A-Za-z0-9_-]+$/);
const tokenHash = bounded(128);
const envelope = bounded(65_536);
export const driveIntentDigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const driveConfirmedFoldersSchema = z
  .object({
    version: z.literal(1),
    expectedEpoch: integer,
    sequence: integer,
    ids: z
      .array(z.uuid())
      .max(11)
      .refine(
        (ids) =>
          new Set(ids).size === ids.length &&
          ids.every((id, i) => i === 0 || ids[i - 1]! < id),
      ),
  })
  .strict();
export type DriveConfirmedFolders = z.infer<typeof driveConfirmedFoldersSchema>;
export const driveCredentialUseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z
    .object({
      kind: z.literal("bound"),
      runtimeGeneration: tokenHash,
      ownerToken: tokenHash,
      version,
    })
    .strict(),
  z
    .object({
      kind: z.literal("self-refreshed"),
      runtimeGeneration: tokenHash,
      ownerToken: tokenHash,
      fromVersion: version,
      version,
    })
    .strict()
    .refine((v) => v.version === v.fromVersion + 1),
]);
export type DriveCredentialUse = z.infer<typeof driveCredentialUseSchema>;
const payloadFits = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length <= 65_536;
export const driveSubjectSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\x21-\x7e]+$/);
export const driveFailureSchema = z.enum([
  "DRIVE_CANCELLED",
  "DRIVE_EXPIRED",
  "DRIVE_CONTEXT_CHANGED",
  "DRIVE_CONNECTION_CHANGED",
  "DRIVE_EXCHANGE_UNKNOWN",
  "DRIVE_REFRESH_UNKNOWN",
  "DRIVE_SCOPE_REQUIRED",
  "DRIVE_REFRESH_REQUIRED",
  "DRIVE_UNVERIFIED",
  "DRIVE_PROVIDER_REJECTED",
  "DRIVE_UNAVAILABLE",
  "DRIVE_RATE_LIMIT",
  "DRIVE_FOLDER_TRASHED",
  "DRIVE_FOLDER_DENIED",
  "DRIVE_FOLDER_UNAVAILABLE",
  "DRIVE_FOLDER_INVALID",
  "DRIVE_CREATE_UNKNOWN",
  "DRIVE_CREATE_CONFLICT",
]);
export type DriveFailure = z.infer<typeof driveFailureSchema>;

export const driveOwnerSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("none") }).strict(),
  ...(["active", "unknown", "closed"] as const).map((state) =>
    z
      .object({
        state: z.literal(state),
        runtimeGeneration: tokenHash,
        token: tokenHash,
      })
      .strict(),
  ),
]);
export type DriveOwner = z.infer<typeof driveOwnerSchema>;
export function driveOwnerHeld(owner: DriveOwner): boolean {
  return owner.state === "active" || owner.state === "unknown";
}

export const driveContextSchema = z
  .object({
    accountId: z.uuid(),
    sessionHash: tokenHash,
    authVersion: version,
    browserHash: tokenHash,
    browserEpoch: version,
  })
  .strict();
export type DriveContext = z.infer<typeof driveContextSchema>;

export const driveFolderSchema = z
  .object({
    id: identifier,
    name: bounded(4096),
    driveId: identifier.nullable(),
    resourceKeyEnvelope: envelope.nullable(),
    checkedAt: instant,
  })
  .strict();
export type DriveFolder = z.infer<typeof driveFolderSchema>;
export const driveCredentialSchema = z
  .object({
    subject: driveSubjectSchema,
    email: z.string().email().max(320).nullable(),
    envelope,
    scopes: z
      .array(bounded(256))
      .min(1)
      .max(32)
      .refine((v) => new Set(v).size === v.length)
      .refine(
        (v) =>
          v.includes("openid") &&
          v.includes("https://www.googleapis.com/auth/drive.file"),
      ),
    accessExpiresAt: instant,
    connectedAt: instant,
  })
  .strict();
export type DriveCredential = z.infer<typeof driveCredentialSchema>;

const connectionBase = {
  accountId: z.uuid(),
  epoch: integer,
  version,
  credentialVersion: integer,
  settingsVersion: version,
  admissionSequence: integer,
  autoBackup: z.literal(false),
  lastUsedAt: instant.nullable(),
  updatedAt: instant,
};
export const driveConnectionSchema = z.discriminatedUnion("state", [
  z
    .object({
      ...connectionBase,
      state: z.literal("unlinked"),
      credential: z.null(),
      folder: z.null(),
      lastUsedAt: z.null(),
    })
    .strict(),
  z
    .object({
      ...connectionBase,
      epoch: version,
      credentialVersion: version,
      state: z.literal("linked"),
      credential: driveCredentialSchema,
      folder: driveFolderSchema.nullable(),
    })
    .strict(),
  z
    .object({
      ...connectionBase,
      epoch: version,
      credentialVersion: version,
      state: z.literal("needs-relink"),
      credential: driveCredentialSchema,
      folder: driveFolderSchema.nullable(),
    })
    .strict(),
]);
export type DriveConnection = z.infer<typeof driveConnectionSchema>;

const recordBase = {
  id: z.uuid(),
  accountId: z.uuid(),
  commandId: z.uuid(),
  intentDigest: driveIntentDigestSchema,
  context: driveContextSchema.nullable(),
  expectedEpoch: integer,
  expectedSettingsVersion: version,
  version,
  cancelGeneration: integer,
  owner: driveOwnerSchema,
  createdAt: instant,
  expiresAt: instant,
  updatedAt: instant,
  terminalAt: instant.nullable(),
};
const attemptData = z.discriminatedUnion("phase", [
  z
    .object({ phase: z.literal("pending"), verifierEnvelope: envelope })
    .strict(),
  z.object({ phase: z.literal("exchanging") }).strict(),
  z
    .object({ phase: z.literal("candidate"), candidateEnvelope: envelope })
    .strict(),
  z.object({ phase: z.literal("completed"), resultEpoch: version }).strict(),
  z
    .object({ phase: z.literal("failed"), failure: driveFailureSchema })
    .strict(),
]);
export const driveAttemptSchema = z
  .object({
    ...recordBase,
    stateHash: tokenHash,
    nonceHash: tokenHash,
    expectedCredentialVersion: integer,
    confirmedAdmissionSequence: integer,
    confirmedFolderIdsEnvelope: envelope.nullable(),
    returnTo: z.literal("settings"),
    data: attemptData,
  })
  .strict()
  .superRefine((v, c) => {
    const terminal = v.data.phase === "completed" || v.data.phase === "failed";
    if (
      !payloadFits(v.data) ||
      v.updatedAt < v.createdAt ||
      (v.terminalAt !== null &&
        (v.terminalAt < v.createdAt || v.terminalAt > v.updatedAt)) ||
      v.expiresAt.getTime() !==
        v.createdAt.getTime() + DRIVE_LIMITS.authorizationMs ||
      terminal !== (v.terminalAt !== null) ||
      terminal !== (v.confirmedFolderIdsEnvelope === null) ||
      (!terminal && v.context === null) ||
      (v.context !== null && v.context.accountId !== v.accountId) ||
      (v.context === null && driveOwnerHeld(v.owner)) ||
      (v.data.phase === "pending" && v.owner.state !== "none") ||
      (v.data.phase === "exchanging" && !driveOwnerHeld(v.owner)) ||
      (v.data.phase === "completed" &&
        v.data.resultEpoch !== v.expectedEpoch + 1) ||
      ((v.data.phase === "candidate" || v.data.phase === "completed") &&
        v.owner.state !== "closed")
    ) {
      c.addIssue({ code: "custom", message: "DRIVE_STATE_INVALID" });
    }
  });
export type DriveAttempt = z.infer<typeof driveAttemptSchema>;

const terminalData = {
  phase: z.literal("failed"),
  failure: driveFailureSchema,
};
const refreshData = z.discriminatedUnion("phase", [
  z.object({ kind: z.literal("refresh"), phase: z.literal("queued") }).strict(),
  z
    .object({ kind: z.literal("refresh"), phase: z.literal("running") })
    .strict(),
  z
    .object({
      kind: z.literal("refresh"),
      phase: z.literal("completed"),
      resultCredentialVersion: version,
    })
    .strict(),
  z.object({ kind: z.literal("refresh"), ...terminalData }).strict(),
]);
const pickerData = z.discriminatedUnion("phase", [
  z.object({ kind: z.literal("picker"), phase: z.literal("queued") }).strict(),
  z.object({ kind: z.literal("picker"), phase: z.literal("running") }).strict(),
  z
    .object({
      kind: z.literal("picker"),
      phase: z.literal("awaiting-selection"),
      ticketHash: tokenHash,
    })
    .strict(),
  z
    .object({ kind: z.literal("picker"), phase: z.literal("completed") })
    .strict(),
  z.object({ kind: z.literal("picker"), ...terminalData }).strict(),
]);
const selectedInput = {
  fileId: identifier,
  resourceKeyEnvelope: envelope.nullable(),
  pickerId: z.uuid(),
};
const selectData = z.discriminatedUnion("phase", [
  z
    .object({
      kind: z.literal("folder-select"),
      phase: z.literal("queued"),
      ...selectedInput,
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-select"),
      phase: z.literal("running"),
      ...selectedInput,
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-select"),
      phase: z.literal("ready"),
      targetId: identifier,
      targetKeyEnvelope: envelope.nullable(),
      sourceId: identifier,
      targetName: bounded(4096).nullable().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-select"),
      phase: z.literal("verifying-target"),
      targetId: identifier,
      targetKeyEnvelope: envelope.nullable(),
      sourceId: identifier,
      targetName: bounded(4096).nullable().optional(),
      confirmedReadyVersion: version,
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-select"),
      phase: z.literal("completed"),
      folderId: identifier,
    })
    .strict(),
  z.object({ kind: z.literal("folder-select"), ...terminalData }).strict(),
]);
const creationIdentity = {
  fileId: identifier,
  marker: tokenHash,
  sends: z.number().int().min(0).max(2),
  observedParent: identifier.nullable(),
  targetName: bounded(4096).nullable().optional(),
};
const createData = z.discriminatedUnion("phase", [
  z
    .object({ kind: z.literal("folder-create"), phase: z.literal("queued") })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("allocating"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("prepared"),
      ...creationIdentity,
      sends: z.literal(0),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("running"),
      ...creationIdentity,
      sends: z.number().int().min(1).max(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("reconciling"),
      ...creationIdentity,
      sends: z.number().int().min(1).max(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("ready"),
      ...creationIdentity,
      sends: z.number().int().min(1).max(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      phase: z.literal("completed"),
      ...creationIdentity,
      sends: z.number().int().min(1).max(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("folder-create"),
      ...terminalData,
      identity: z.object(creationIdentity).strict().nullable(),
    })
    .strict(),
]);
const disconnectData = z.discriminatedUnion("phase", [
  z
    .object({ kind: z.literal("disconnect"), phase: z.literal("queued") })
    .strict(),
  z
    .object({
      kind: z.literal("disconnect"),
      phase: z.literal("completed"),
      resultEpoch: version,
    })
    .strict(),
  z.object({ kind: z.literal("disconnect"), ...terminalData }).strict(),
]);
export const driveControlDataSchema = z.union([
  refreshData,
  pickerData,
  selectData,
  createData,
  disconnectData,
]);
export type DriveControlData = z.infer<typeof driveControlDataSchema>;
export const driveControlSchema = z
  .object({
    ...recordBase,
    subject: driveSubjectSchema,
    expectedCredentialVersion: version,
    credentialUse: driveCredentialUseSchema,
    data: driveControlDataSchema,
  })
  .strict()
  .superRefine((v, c) => {
    const terminal = v.data.phase === "completed" || v.data.phase === "failed";
    const waiting = ["awaiting-selection", "ready", "prepared"].includes(
      v.data.phase,
    );
    const active = ["running", "allocating", "verifying-target"].includes(
      v.data.phase,
    );
    const duration =
      v.data.kind === "picker"
        ? DRIVE_LIMITS.pickerMs
        : DRIVE_LIMITS.operationMs;
    if (
      !payloadFits(v.data) ||
      !driveCredentialUseMatches(v) ||
      v.updatedAt < v.createdAt ||
      (v.terminalAt !== null &&
        (v.terminalAt < v.createdAt || v.terminalAt > v.updatedAt)) ||
      v.expectedEpoch < 1 ||
      v.expiresAt.getTime() !== v.createdAt.getTime() + duration ||
      terminal !== (v.terminalAt !== null) ||
      (!terminal && v.context === null) ||
      (v.context !== null && v.context.accountId !== v.accountId) ||
      (v.context === null && driveOwnerHeld(v.owner)) ||
      (v.data.phase === "queued" && v.owner.state !== "none") ||
      (waiting && v.owner.state !== "closed") ||
      (active && !driveOwnerHeld(v.owner)) ||
      (v.data.kind === "refresh" &&
        v.data.phase === "completed" &&
        (v.credentialUse.kind !== "self-refreshed" ||
          v.data.resultCredentialVersion !== v.credentialUse.version)) ||
      (v.data.kind === "disconnect" &&
        v.data.phase === "completed" &&
        v.data.resultEpoch !== v.expectedEpoch + 1) ||
      (v.data.phase === "completed" && driveOwnerHeld(v.owner))
    ) {
      c.addIssue({ code: "custom", message: "DRIVE_STATE_INVALID" });
    }
  });
export type DriveControl = z.infer<typeof driveControlSchema>;

function driveCredentialUseMatches(
  v: Readonly<{
    data: DriveControlData;
    owner: DriveOwner;
    credentialUse: DriveCredentialUse;
  }>,
): boolean {
  const use = v.credentialUse;
  if (v.data.kind === "disconnect" || v.owner.state === "none")
    return use.kind === "none";
  return (
    use.kind !== "none" &&
    use.ownerToken === v.owner.token &&
    use.runtimeGeneration === v.owner.runtimeGeneration
  );
}

export function driveConfirmedFoldersMatch(
  confirmed: DriveConfirmedFolders,
  current: DriveConfirmedFolders,
): boolean {
  return (
    confirmed.expectedEpoch === current.expectedEpoch &&
    confirmed.sequence === current.sequence &&
    current.ids.every((id) => confirmed.ids.includes(id))
  );
}

export function driveStateInvalid(): never {
  throw new BusinessRuleError(
    "DRIVE_STATE_INVALID",
    "Drive連携状態を確認できませんでした。",
  );
}
export function parseDrive<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) return driveStateInvalid();
  return result.data;
}

export function driveOwnerTransition(
  before: DriveOwner,
  after: DriveOwner,
): boolean {
  if (before.state === "none")
    return after.state === "none" || after.state === "active";
  if (after.state === "none") return false;
  const same =
    before.runtimeGeneration === after.runtimeGeneration &&
    before.token === after.token;
  if (before.state === "closed")
    return (
      (same && after.state === "closed") || (!same && after.state === "active")
    );
  return (
    same &&
    (after.state === before.state ||
      after.state === "unknown" ||
      after.state === "closed")
  );
}

export function driveCanClaim(
  input: Readonly<{ globalHeld: number; accountHeld: number }>,
): boolean {
  return (
    Number.isSafeInteger(input.globalHeld) &&
    Number.isSafeInteger(input.accountHeld) &&
    input.globalHeld >= 0 &&
    input.accountHeld >= 0 &&
    input.globalHeld < DRIVE_LIMITS.globalOwners &&
    input.accountHeld < DRIVE_LIMITS.accountOwners
  );
}

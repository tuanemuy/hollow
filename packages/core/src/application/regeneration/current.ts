import type { ImportFormat } from "@repo/core/domain/import/entity";
import {
  retainedBackupRecord,
  type StoredBackupRecord,
} from "@repo/core/domain/integration/driveBackupRepository";
import type {
  RegenerationConsumer,
  SourceAccess,
  SourceInputReceipt,
  SourceMemoryBytes,
} from "@repo/core/domain/regeneration/source";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote } from "../workspace/access";
import { sourceStateInvalid } from "./services";

export async function requireRegenerationNote(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  token: string | null,
  noteId: string,
) {
  const account = await requireAccount(c, u.accounts, token);
  const note = await requireNote(
    u,
    await u.notes.findById(noteId),
    account.id,
    "edit",
  );
  if (
    note.owner.kind === "workspace" &&
    (await u.workspaces.find(note.owner.workspaceId))?.state !== "active"
  )
    throw new NotFoundError(
      "NOTE_NOT_FOUND",
      "ノートが見つからないか、現在はアクセスできません。",
    );
  return { account, note };
}

export type RegenerationRecordState = Readonly<{
  format: ImportFormat | null;
}> &
  (
    | Readonly<{ availability: "available"; reason: null }>
    | Readonly<{
        availability: "unavailable";
        reason:
          | "source-invalid"
          | "format-unsupported"
          | "recorder-unavailable"
          | "drive-unlinked"
          | "drive-needs-relink"
          | "drive-account-changed";
      }>
  );

export async function regenerationRecordState(
  u: HollowUnitOfWorkContext,
  noteId: string,
  record: StoredBackupRecord,
): Promise<RegenerationRecordState> {
  if (retainedBackupRecord(record))
    return {
      format: null,
      availability: "unavailable",
      reason: "recorder-unavailable",
    };
  const original = await u.imports.findOriginal(record.originalId);
  const target = await u.driveBackupTargets.find(record.targetId);
  if (
    record.noteId !== noteId ||
    !original ||
    original.id !== record.originalId ||
    original.noteId !== noteId ||
    original.bytes !== record.bytes ||
    original.sha256 !== record.sha256 ||
    !target ||
    target.id !== record.targetId ||
    target.state !== "confirmed" ||
    target.noteId !== noteId ||
    target.originalId !== record.originalId ||
    target.accountId !== record.accountId ||
    target.subject !== record.subject ||
    target.fileId !== record.fileId ||
    target.folder.id !== record.folder.id ||
    target.folder.driveId !== record.folder.driveId
  )
    return {
      format: null,
      availability: "unavailable",
      reason: "source-invalid",
    };
  const format = original.format;
  const recorder = await u.accounts.findById(record.accountId);
  if (!recorder || recorder.status !== "verified")
    return {
      format,
      availability: "unavailable",
      reason: "recorder-unavailable",
    };
  const connection = await u.driveConnections.find(record.accountId);
  if (!connection || connection.state === "unlinked")
    return {
      format,
      availability: "unavailable",
      reason: "drive-unlinked",
    };
  if (connection.credential.subject !== record.subject)
    return {
      format,
      availability: "unavailable",
      reason: "drive-account-changed",
    };
  if (connection.state === "needs-relink")
    return {
      format,
      availability: "unavailable",
      reason: "drive-needs-relink",
    };
  return { format, availability: "available", reason: null };
}

export async function findCurrentDriveSource(
  u: HollowUnitOfWorkContext,
  input: Readonly<{
    consumer: RegenerationConsumer;
    access: SourceAccess;
    executorId: string;
    noteId: string;
    originalId: string;
    ownershipGeneration: number | null;
    source: Readonly<{ sha256: string; bytes: number }>;
    fingerprint?: string;
  }>,
) {
  if (input.access.origin !== "drive-record") return null;
  const binding = await u.regenerationBindings.find(input.access.bindingId);
  if (
    !binding ||
    binding.consumer.kind !== input.consumer.kind ||
    binding.consumer.id !== input.consumer.id ||
    binding.executorId !== input.executorId ||
    binding.cancelGeneration !== 0 ||
    (input.fingerprint !== undefined &&
      binding.fingerprint !== input.fingerprint) ||
    binding.originalId !== input.originalId ||
    binding.noteId !== input.noteId ||
    binding.ownershipGeneration !== input.ownershipGeneration
  )
    return null;
  const record = await u.regenerationRecords.find(
    binding.noteId,
    binding.recordId,
  );
  const connection = await u.driveConnections.find(binding.credentialOwnerId);
  if (
    !record ||
    retainedBackupRecord(record) ||
    record.accountId !== binding.credentialOwnerId ||
    record.subject !== binding.subject ||
    record.originalId !== input.originalId ||
    record.sha256 !== input.source.sha256 ||
    record.bytes !== input.source.bytes ||
    !connection ||
    connection.state !== "linked" ||
    connection.epoch !== binding.driveEpoch ||
    connection.credential.subject !== binding.subject ||
    (await regenerationRecordState(u, binding.noteId, record)).availability !==
      "available"
  )
    return null;
  return { binding, record, connection };
}

export async function currentDriveSource(
  u: HollowUnitOfWorkContext,
  input: Parameters<typeof findCurrentDriveSource>[1],
) {
  const drive = await findCurrentDriveSource(u, input);
  if (input.access.origin === "drive-record" && !drive)
    return sourceStateInvalid();
  return drive;
}

export async function driveLlmGeneration(
  u: HollowUnitOfWorkContext,
  value: import("@repo/core/domain/llm/entity").LlmConversion,
) {
  if (value.access.origin !== "drive-record") return null;
  const binding = await u.regenerationBindings.find(value.access.bindingId);
  return binding &&
    binding.consumer.kind === "llm-conversion" &&
    binding.consumer.id === value.jobId &&
    binding.executorId === value.accountId &&
    binding.noteId === value.noteId &&
    binding.originalId === value.source.originalId &&
    binding.fingerprint === value.requestDigest
    ? binding.ownershipGeneration
    : sourceStateInvalid();
}

export async function inputConsumer(
  u: HollowUnitOfWorkContext,
  consumer: RegenerationConsumer,
  now: Date,
) {
  if (consumer.kind === "machine-regeneration") {
    const row = await u.machineRegenerations.find(consumer.id);
    if (!row) return sourceStateInvalid();
    return {
      consumer,
      executorId: row.executorId,
      noteId: row.noteId,
      noteVersion: row.noteVersion,
      ownershipGeneration: row.ownershipGeneration,
      originalId: row.originalId,
      source: row.source,
      access: row.access,
      memory: row.sourceMemoryBytes,
      receipt: row.inputReceipt,
      owner: row.owner,
      live:
        row.phase !== "terminal" &&
        row.cancelGeneration === 0 &&
        row.deadlineAt > now,
      write: (receipt: SourceInputReceipt, memory: SourceMemoryBytes) =>
        u.machineRegenerations.replace(
          {
            ...row,
            inputReceipt: receipt,
            sourceMemoryBytes: memory,
            version: row.version + 1,
            updatedAt: now,
          },
          row.version,
        ),
    };
  }
  if (consumer.kind === "llm-conversion") {
    const row = await u.llmConversions.find(consumer.id);
    if (!row) return sourceStateInvalid();
    return {
      consumer,
      executorId: row.accountId,
      noteId: row.noteId,
      noteVersion: row.noteVersion,
      ownershipGeneration:
        row.access.origin === "drive-record"
          ? await driveLlmGeneration(u, row)
          : row.sourceOwnershipGeneration,
      originalId: row.source.originalId,
      source: row.source,
      access: row.access,
      memory: row.sourceMemoryBytes,
      receipt: row.inputReceipt,
      owner: row.owner,
      live:
        row.phase !== "terminal" &&
        row.cancelGeneration === 0 &&
        row.deadlineAt > now,
      write: (receipt: SourceInputReceipt, memory: SourceMemoryBytes) =>
        u.llmConversions.replace(
          {
            ...row,
            inputReceipt: receipt,
            sourceMemoryBytes: memory,
            version: row.version + 1,
            updatedAt: now,
          },
          row.version,
        ),
    };
  }
  const row = await u.llmPdfPreviews.find(consumer.id);
  if (!row) return sourceStateInvalid();
  return {
    consumer,
    executorId: row.accountId,
    noteId: row.noteId,
    noteVersion: row.noteVersion,
    ownershipGeneration: row.ownershipGeneration,
    originalId: row.source.originalId,
    source: row.source,
    access: row.access,
    memory: row.sourceMemoryBytes,
    receipt: row.inputReceipt,
    owner: row.owner,
    live:
      row.state === "running" &&
      row.cancelGeneration === 0 &&
      row.expiresAt > now,
    write: (receipt: SourceInputReceipt, memory: SourceMemoryBytes) =>
      u.llmPdfPreviews.replace(
        {
          ...row,
          inputReceipt: receipt,
          sourceMemoryBytes: memory,
          version: row.version + 1,
          updatedAt: now,
        },
        row.version,
      ),
  };
}

export async function currentInput(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  consumer: RegenerationConsumer,
) {
  const input = await inputConsumer(u, consumer, c.clock.now());
  if (
    !input.live ||
    input.owner.state !== "active" ||
    input.access.origin === "redacted" ||
    (await u.accounts.findById(input.executorId))?.status !== "verified"
  )
    return sourceStateInvalid();
  const note = await requireNote(
    u,
    await u.notes.findById(input.noteId),
    input.executorId,
    "edit",
  );
  const original = await u.imports.findOriginal(input.originalId);
  const ownershipGeneration = await u.driveBackupTransfers.sourceGeneration(
    note.id,
  );
  if (
    note.version !== input.noteVersion ||
    (input.ownershipGeneration !== null &&
      ownershipGeneration !== input.ownershipGeneration) ||
    !original ||
    original.noteId !== note.id ||
    original.sha256 !== input.source.sha256 ||
    original.bytes !== input.source.bytes ||
    (note.owner.kind === "workspace" &&
      (await u.workspaces.find(note.owner.workspaceId))?.state !== "active")
  )
    return sourceStateInvalid();
  return { ...input, original, ownershipGeneration };
}

export async function currentMachine(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: import("@repo/core/domain/regeneration/entity").MachineRegeneration,
) {
  const now = c.clock.now();
  const account = await u.accounts.findById(value.executorId);
  if (
    account?.status !== "verified" ||
    value.cancelGeneration !== 0 ||
    value.deadlineAt <= now ||
    value.access.origin === "redacted"
  )
    return sourceStateInvalid();
  const note = await requireNote(
    u,
    await u.notes.findById(value.noteId),
    value.executorId,
    "edit",
  );
  const original = await u.imports.findOriginal(value.originalId);
  const job = await u.jobs.find(value.id);
  const head = await u.revisions.head(note.id);
  if (
    note.version !== value.noteVersion ||
    head?.currentNo !== value.originalRevisionNo ||
    !original ||
    original.state !== "processing" ||
    original.noteId !== note.id ||
    original.activeJobId !== value.id ||
    original.sha256 !== value.source.sha256 ||
    original.bytes !== value.source.bytes ||
    original.format !== value.source.format ||
    (await u.driveBackupTransfers.sourceGeneration(note.id)) !==
      value.ownershipGeneration ||
    (note.owner.kind === "workspace" &&
      (await u.workspaces.find(note.owner.workspaceId))?.state !== "active") ||
    !job ||
    job.accountId !== value.executorId ||
    job.noteVersion !== value.noteVersion ||
    job.state === "cancelled" ||
    (value.owner.state === "active" &&
      (job.state !== "running" || job.leaseToken !== value.owner.token))
  )
    return sourceStateInvalid();
  await currentDriveSource(u, {
    consumer: { kind: "machine-regeneration", id: value.id },
    access: value.access,
    executorId: value.executorId,
    noteId: value.noteId,
    originalId: value.originalId,
    ownershipGeneration: value.ownershipGeneration,
    source: value.source,
    fingerprint: value.requestDigest,
  });
  return { note, original, job };
}

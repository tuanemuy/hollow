import type { ImportFormat } from "@repo/core/domain/import/entity";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import type {
  RegenerationConsumer,
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
  record: DriveBackupRecord,
): Promise<RegenerationRecordState> {
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
  if (format === "audio")
    return {
      format,
      availability: "unavailable",
      reason: "format-unsupported",
    };
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
      ownershipGeneration: row.sourceOwnershipGeneration,
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

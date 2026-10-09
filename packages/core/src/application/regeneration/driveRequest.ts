import { BusinessRuleError } from "@repo/core/domain/error";
import { sourceBindingSchema } from "@repo/core/domain/regeneration/entity";
import {
  MACHINE_RECIPE,
  machineFormat,
} from "@repo/core/domain/regeneration/machine";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import {
  findCurrentDriveSource,
  regenerationRecordState,
  requireRegenerationNote,
} from "./current";
import { admitMachineRegeneration } from "./request";

export type DriveMachineRequest = Readonly<{
  noteId: string;
  noteVersion: number;
  recordId: string;
  commandId: string;
  confirmed: true;
}>;

export function driveMachineIntent(input: DriveMachineRequest) {
  return JSON.stringify([
    "drive-machine-request/v1",
    MACHINE_RECIPE,
    input.noteId,
    input.noteVersion,
    input.recordId,
    "machine",
  ]);
}

export async function requestDriveMachineRegeneration(
  c: HollowContainer,
  token: string | null,
  input: DriveMachineRequest,
) {
  const machine = c.machine;
  if (!machine?.provider || !machine.drive)
    throw new BusinessRuleError(
      "REGENERATION_UNAVAILABLE",
      "再生成は現在利用できません。",
    );
  const digest = c.tokens.hash(driveMachineIntent(input));
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const { account, note } = await requireRegenerationNote(
      c,
      u,
      token,
      input.noteId,
    );
    const prior = await u.machineRegenerations.command(
      account.id,
      input.commandId,
    );
    if (await u.llmConversions.command(account.id, input.commandId))
      throw new ConflictError(
        "REGENERATION_COMMAND_CHANGED",
        "操作の内容が一致しません。",
      );
    if (prior) {
      if (
        prior.noteId !== note.id ||
        prior.requestDigest !== digest ||
        prior.access.origin !== "drive-record"
      )
        throw new ConflictError(
          "REGENERATION_COMMAND_CHANGED",
          "操作の内容が一致しません。",
        );
      if (
        !(await findCurrentDriveSource(u, {
          consumer: { kind: "machine-regeneration", id: prior.id },
          access: prior.access,
          executorId: account.id,
          noteId: note.id,
          originalId: prior.originalId,
          ownershipGeneration: prior.ownershipGeneration,
          source: prior.source,
          fingerprint: prior.requestDigest,
        }))
      )
        throw new BusinessRuleError(
          "REGENERATION_SOURCE_INVALID",
          "取得元は現在利用できません。",
        );
      return { jobId: prior.id, noteId: prior.noteId };
    }
    if (note.version !== input.noteVersion)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "本文が更新されました。最新の本文を確認してください。",
      );
    const record = await u.regenerationRecords.find(note.id, input.recordId);
    if (
      !record ||
      (await regenerationRecordState(u, note.id, record)).availability !==
        "available"
    )
      throw new BusinessRuleError(
        "REGENERATION_SOURCE_INVALID",
        "取得元は現在利用できません。",
      );
    const original = await u.imports.findOriginal(record.originalId);
    const connection = await u.driveConnections.find(record.accountId);
    if (
      !original ||
      !machineFormat(original.format) ||
      original.bytes > 52_428_800
    )
      throw new BusinessRuleError(
        "REGENERATION_FORMAT_UNAVAILABLE",
        "この形式は機械再生成に対応していません。",
      );
    if (
      connection?.state !== "linked" ||
      connection.credential.subject !== record.subject
    )
      throw new BusinessRuleError(
        "REGENERATION_SOURCE_INVALID",
        "取得元は現在利用できません。",
      );
    const jobId = c.idGenerator.next();
    const binding = sourceBindingSchema.parse({
      id: c.idGenerator.next(),
      recordId: record.id,
      executorId: account.id,
      credentialOwnerId: record.accountId,
      noteId: note.id,
      originalId: original.id,
      subject: record.subject,
      driveEpoch: connection.epoch,
      ownershipGeneration: await u.driveBackupTransfers.sourceGeneration(
        note.id,
      ),
      fingerprint: digest,
      consumer: { kind: "machine-regeneration", id: jobId },
      cancelGeneration: 0,
      version: 1,
      createdAt: c.clock.now(),
    });
    await u.regenerationBindings.insert(binding);
    return admitMachineRegeneration(c, u, {
      executorId: account.id,
      note,
      original,
      commandId: input.commandId,
      requestDigest: digest,
      access: { origin: "drive-record", bindingId: binding.id },
      jobId,
    });
  });
  machine.wake();
  return result;
}

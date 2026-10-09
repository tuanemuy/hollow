import { BusinessRuleError } from "@repo/core/domain/error";
import type { Original } from "@repo/core/domain/import/entity";
import type { Note } from "@repo/core/domain/note/entity";
import { machineRegenerationSchema } from "@repo/core/domain/regeneration/entity";
import {
  MACHINE_DEADLINE_MS,
  MACHINE_RECIPE,
  machineFormat,
} from "@repo/core/domain/regeneration/machine";
import type { SourceAccess } from "@repo/core/domain/regeneration/source";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { ensureRevisionHead } from "../note/commitNote";
import { requireRegenerationNote } from "./current";
export async function admitMachineRegeneration(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  input: Readonly<{
    executorId: string;
    note: Note;
    original: Original;
    commandId: string;
    requestDigest: string;
    access: Exclude<SourceAccess, { origin: "redacted" }>;
    jobId?: string;
  }>,
) {
  const { note, original } = input;
  if (!machineFormat(original.format))
    throw new BusinessRuleError(
      "REGENERATION_FORMAT_UNAVAILABLE",
      "この形式は機械再生成に対応していません。",
    );
  if (
    original.state === "processing" ||
    (await u.jobs.activeForNote(note.id)).length ||
    (await u.machineRegenerations.activeForNote(note.id)) ||
    (await u.llmConversions.activeForNote(note.id))
  )
    throw new ConflictError(
      "REGENERATION_PROCESSING",
      "処理の完了をお待ちください。",
    );
  const now = c.clock.now();
  const head = await ensureRevisionHead(u, note);
  const id = input.jobId ?? c.idGenerator.next();
  const batchId = c.idGenerator.next();
  const generation = await u.driveBackupTransfers.sourceGeneration(note.id);
  const value = machineRegenerationSchema.parse({
    id,
    executorId: input.executorId,
    noteId: note.id,
    originalId: original.id,
    commandId: input.commandId,
    requestDigest: input.requestDigest,
    access: input.access,
    sourceMemoryBytes: 0,
    inputReceipt: null,
    source: {
      sha256: original.sha256,
      bytes: original.bytes,
      format: original.format,
    },
    noteVersion: note.version,
    ownershipGeneration: generation,
    originalRevisionNo: head.currentNo,
    previous: {
      state: original.state,
      coverage: original.coverage,
      activeJobId: original.activeJobId,
    },
    phase: "queued",
    outcome: "pending",
    failure: null,
    resultVersion: null,
    owner: { state: "none", runtimeId: null, token: null },
    cancelGeneration: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deadlineAt: new Date(now.getTime() + MACHINE_DEADLINE_MS),
    terminalAt: null,
  });
  await u.imports.insertBatch({
    requestedVisibility: "private",
    id: batchId,
    accountId: input.executorId,
    workspaceId:
      note.owner.kind === "workspace" ? note.owner.workspaceId : null,
    createdAt: now,
    useAi: false,
    cancelledAt: null,
  });
  await u.jobs.insert({
    id,
    batchId,
    originalId: original.id,
    accountId: input.executorId,
    noteId: note.id,
    noteVersion: note.version,
    useAi: false,
    createdAt: now,
    updatedAt: now,
    attempt: 0,
    retryOf: null,
    state: "queued",
    leaseToken: null,
    leaseUntil: null,
    failure: null,
  });
  await u.machineRegenerations.insert(value);
  await u.imports.saveOriginal({
    ...original,
    activeJobId: id,
    state: "processing",
  });
  return { jobId: id, noteId: note.id };
}

export async function requestMachineRegeneration(
  c: HollowContainer,
  token: string | null,
  input: Readonly<{ noteId: string; commandId: string }>,
) {
  if (!c.machine)
    throw new BusinessRuleError(
      "REGENERATION_UNAVAILABLE",
      "再生成は現在利用できません。",
    );
  const digest = c.tokens.hash(JSON.stringify([MACHINE_RECIPE, input.noteId]));
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
      if (prior.noteId !== note.id || prior.requestDigest !== digest)
        throw new ConflictError(
          "REGENERATION_COMMAND_CHANGED",
          "操作の内容が一致しません。",
        );
      return { jobId: prior.id, noteId: prior.noteId };
    }
    const original = await u.imports.findByNote(note.id);
    if (!original || !machineFormat(original.format))
      throw new BusinessRuleError(
        "REGENERATION_FORMAT_UNAVAILABLE",
        "この形式は機械再生成に対応していません。",
      );
    return admitMachineRegeneration(c, u, {
      executorId: account.id,
      note,
      original,
      commandId: input.commandId,
      requestDigest: digest,
      access: { origin: "local-original", bindingId: null },
    });
  });
  c.machine.wake();
  return result;
}

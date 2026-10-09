import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import { z } from "zod";
import { requireAccount as requireRegenerationNoteAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope } from "../workspace/access";
import {
  type RegenerationRecordState,
  regenerationRecordState,
  requireRegenerationNote,
} from "./current";

const pageSize = 25;
const responseBytes = 16 * 1024;
const cursorSchema = z
  .object({
    noteId: z.uuid(),
    createdAt: z.string().max(24).datetime(),
    id: z.uuid(),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
const pageInputSchema = z
  .object({ noteId: z.uuid(), cursor: cursorSchema.nullish() })
  .strict();
const exactInputSchema = z
  .object({ noteId: z.uuid(), recordId: z.uuid() })
  .strict();

export type RegenerationSourceCursor = z.infer<typeof cursorSchema>;
export type RegenerationSourceCandidate = Readonly<{
  recordId: string;
  bytes: number;
  createdAt: string;
  mine: boolean;
}> &
  RegenerationRecordState;
export type RegenerationSourcesPage = Readonly<{
  items: readonly RegenerationSourceCandidate[];
  next: RegenerationSourceCursor | null;
}>;

function invalidInput() {
  return new BusinessRuleError(
    "REGENERATION_INPUT_INVALID",
    "再生成する原本をもう一度選択してください。",
  );
}

function cursorDigest(
  c: HollowContainer,
  cursor: Pick<RegenerationSourceCursor, "noteId" | "createdAt" | "id">,
) {
  return c.tokens.hash(
    JSON.stringify([
      "regeneration-source-cursor",
      1,
      cursor.noteId,
      cursor.createdAt,
      cursor.id,
    ]),
  );
}

function boundedResponse<T>(value: T): T {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength > responseBytes
  )
    throw new BusinessRuleError(
      "REGENERATION_SOURCES_UNAVAILABLE",
      "原本の一覧を取得できません。時間をおいて再度お試しください。",
    );
  return value;
}

async function candidate(
  u: HollowUnitOfWorkContext,
  noteId: string,
  accountId: string,
  record: DriveBackupRecord,
): Promise<RegenerationSourceCandidate> {
  if (record.noteId !== noteId)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "原本の記録を確認できません。",
    );
  const state = await regenerationRecordState(u, noteId, record);
  return {
    recordId: record.id,
    bytes: record.bytes,
    createdAt: record.createdAt.toISOString(),
    mine: record.accountId === accountId,
    ...state,
  };
}

export async function getRegenerationSources(
  c: HollowContainer,
  token: string | null,
  input: Readonly<{
    noteId: string;
    cursor?: RegenerationSourceCursor | null | undefined;
  }>,
): Promise<RegenerationSourcesPage> {
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) throw invalidInput();
  const { noteId, cursor } = parsed.data;
  if (
    cursor &&
    (cursor.noteId !== noteId ||
      new Date(cursor.createdAt).toISOString() !== cursor.createdAt ||
      cursor.digest !== cursorDigest(c, cursor))
  )
    throw invalidInput();
  return c.unitOfWorkProvider.run(async (u) => {
    const { account, note } = await requireRegenerationNote(
      c,
      u,
      token,
      noteId,
    );
    const rows = await u.regenerationRecords.page(
      note.id,
      cursor ? { createdAt: new Date(cursor.createdAt), id: cursor.id } : null,
    );
    if (rows.length > pageSize + 1)
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "原本の記録を確認できません。",
      );
    const items: RegenerationSourceCandidate[] = [];
    for (const record of rows.slice(0, pageSize))
      items.push(await candidate(u, note.id, account.id, record));
    const last = items.at(-1);
    const next =
      rows.length > pageSize && last
        ? { noteId: note.id, createdAt: last.createdAt, id: last.recordId }
        : null;
    return boundedResponse({
      items,
      next: next ? { ...next, digest: cursorDigest(c, next) } : null,
    });
  });
}

export async function getRegenerationSource(
  c: HollowContainer,
  token: string | null,
  input: Readonly<{ noteId: string; recordId: string }>,
): Promise<RegenerationSourceCandidate> {
  const parsed = exactInputSchema.safeParse(input);
  if (!parsed.success) throw invalidInput();
  const { noteId, recordId } = parsed.data;
  return c.unitOfWorkProvider.run(async (u) => {
    const { account, note } = await requireRegenerationNote(
      c,
      u,
      token,
      noteId,
    );
    const record = await u.regenerationRecords.find(note.id, recordId);
    if (!record || record.id !== recordId || record.noteId !== note.id)
      throw new NotFoundError(
        "REGENERATION_SOURCE_NOT_FOUND",
        "再生成する原本が見つかりません。もう一度選択してください。",
      );
    return boundedResponse(await candidate(u, note.id, account.id, record));
  });
}

const publicMachineFailures = [
  "REGENERATION_SOURCE_INVALID",
  "REGENERATION_SOURCE_CHANGED",
  "REGENERATION_SOURCE_UNAVAILABLE",
  "REGENERATION_INTERRUPTED",
  "REGENERATION_OWNERSHIP_UNKNOWN",
  "REGENERATION_CANCELLED",
  "REGENERATION_TIMEOUT",
  "REGENERATION_UNSUPPORTED",
  "REGENERATION_RESOURCE_LIMIT",
] as const;
function publicMachineFailure(value: string | null) {
  if (value === null) return null;
  return (
    publicMachineFailures.find((code) => code === value) ??
    "REGENERATION_FAILED"
  );
}
export function machineView(
  value: import("@repo/core/domain/regeneration/entity").MachineRegeneration,
  undoAvailable = false,
) {
  const base = {
    id: value.id,
    noteId: value.noteId,
    phase: value.phase,
    outcome: value.outcome,
    failure: publicMachineFailure(value.failure),
    cancelRequested: value.cancelGeneration > 0,
    ownershipUnconfirmed: value.owner.state === "unknown",
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
    resultVersion: value.resultVersion,
  };
  return value.phase === "terminal" && value.outcome === "succeeded"
    ? {
        ...base,
        phase: "terminal" as const,
        outcome: "succeeded" as const,
        undoAvailable,
      }
    : { ...base, undoAvailable: false as const };
}
async function authorizedMachineView(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  token: string | null,
  value: import("@repo/core/domain/regeneration/entity").MachineRegeneration,
) {
  const { note } = await requireRegenerationNote(c, u, token, value.noteId);
  const undoAvailable =
    value.phase === "terminal" &&
    value.outcome === "succeeded" &&
    value.owner.state === "closed" &&
    value.sourceMemoryBytes === 0 &&
    note.version === value.resultVersion &&
    !!(await u.revisions.find(note.id, value.originalRevisionNo)) &&
    !(await u.jobs.activeForNote(note.id)).length &&
    !(await u.machineRegenerations.activeForNote(note.id)) &&
    !(await u.llmConversions.activeForNote(note.id));
  return machineView(value, undoAvailable);
}
export async function getMachineCommand(
  c: HollowContainer,
  token: string | null,
  input: Readonly<{ noteId: string; commandId?: string | undefined }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const { account } = await requireRegenerationNote(
      c,
      u,
      token,
      input.noteId,
    );
    const original = input.commandId
      ? null
      : await u.imports.findByNote(input.noteId);
    const value = input.commandId
      ? await u.machineRegenerations.command(account.id, input.commandId)
      : original
        ? await u.machineRegenerations.find(original.activeJobId)
        : null;
    return value?.noteId === input.noteId && value.executorId === account.id
      ? authorizedMachineView(c, u, token, value)
      : null;
  });
}

export async function getMachineRegeneration(
  c: HollowContainer,
  token: string | null,
  id: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const account = await requireRegenerationNoteAccount(c, u.accounts, token);
    const value = await u.machineRegenerations.find(id);
    if (!value || value.executorId !== account.id)
      throw new NotFoundError(
        "REGENERATION_NOT_FOUND",
        "再生成の履歴が見つかりません。",
      );
    return authorizedMachineView(c, u, token, value);
  });
}
export async function listMachineRegenerations(
  c: HollowContainer,
  token: string | null,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const account = await requireRegenerationNoteAccount(c, u.accounts, token);
    const rows = await u.machineRegenerations.page(account.id, null);
    const visible = [];
    for (const value of rows.slice(0, 25)) {
      const note = await u.notes.findById(value.noteId);
      if (
        note?.lifecycle.kind === "active" &&
        (await canScope(u, note.owner, account.id, "read"))
      )
        visible.push(machineView(value));
    }
    return visible;
  });
}

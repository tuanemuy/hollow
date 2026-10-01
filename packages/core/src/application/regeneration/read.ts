import { BusinessRuleError } from "@repo/core/domain/error";
import type { DriveBackupRecord } from "@repo/core/domain/integration/driveBackup";
import { z } from "zod";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
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

import {
  ConflictError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import type { Note } from "@repo/core/domain/note/entity";
import type { NoteRepository } from "@repo/core/domain/note/ports/noteRepository";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { accounts, conversionJobs, notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { referenceJobs } from "../referenceSchema";

function lifecycle(
  row: Pick<
    typeof notes.$inferSelect,
    "lifecycle" | "trashedAt" | "purgeAfter" | "trashOperationId"
  >,
): Note["lifecycle"] {
  if (
    row.lifecycle === "active" &&
    !row.trashedAt &&
    !row.purgeAfter &&
    !row.trashOperationId
  )
    return { kind: "active" };
  if (
    row.lifecycle === "trashed" &&
    row.trashedAt &&
    row.purgeAfter &&
    row.trashOperationId
  )
    return {
      kind: "trashed",
      trashedAt: row.trashedAt,
      purgeAfter: row.purgeAfter,
      operationId: row.trashOperationId,
    };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "Invalid note lifecycle",
  );
}
function lifecycleColumns(note: Note) {
  const state = note.lifecycle;
  return {
    lifecycle: state.kind,
    trashedAt: state.kind === "trashed" ? state.trashedAt : null,
    purgeAfter: state.kind === "trashed" ? state.purgeAfter : null,
    trashOperationId: state.kind === "trashed" ? state.operationId : null,
  };
}

function toNote(row: typeof notes.$inferSelect): Note {
  const owner = row.ownerAccountId
    ? { kind: "personal" as const, accountId: row.ownerAccountId }
    : row.ownerWorkspaceId
      ? { kind: "workspace" as const, workspaceId: row.ownerWorkspaceId }
      : null;
  if (!owner)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Note has no owner",
    );
  return {
    id: row.id,
    owner,
    lifecycle: lifecycle(row),
    title: row.title,
    html: row.html,
    display: row.display,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    visibility: "private",
    status: "ready",
  };
}

export class LibsqlNoteRepository implements NoteRepository {
  constructor(private readonly db: HollowTransaction) {}
  async listPersonal(accountId: string) {
    const rows = await this.db
      .select()
      .from(notes)
      .where(
        and(eq(notes.ownerAccountId, accountId), eq(notes.lifecycle, "active")),
      )
      .orderBy(desc(notes.updatedAt), desc(notes.id));
    return rows.map(toNote);
  }
  async listTrashed(
    accountId: string,
    before: Readonly<{ at: Date; id: string }> | undefined,
    limit: number,
  ) {
    const rows = await this.db
      .select({
        id: notes.id,
        title: notes.title,
        lifecycle: notes.lifecycle,
        trashedAt: notes.trashedAt,
        purgeAfter: notes.purgeAfter,
        trashOperationId: notes.trashOperationId,
      })
      .from(notes)
      .where(
        and(
          eq(notes.ownerAccountId, accountId),
          eq(notes.lifecycle, "trashed"),
          before
            ? or(
                lt(notes.trashedAt, before.at),
                and(eq(notes.trashedAt, before.at), lt(notes.id, before.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(notes.trashedAt), desc(notes.id))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      lifecycle: lifecycle(row),
    }));
  }
  async findById(id: string) {
    const [row] = await this.db.select().from(notes).where(eq(notes.id, id));
    return row ? toNote(row) : null;
  }
  async unsettledDisplays(limit: number) {
    const kind = sql<string>`json_extract(${notes.display}, '$.initialization.kind')`;
    const jobId = sql<string>`json_extract(${notes.display}, '$.initialization.jobId')`;
    const terminal = ["succeeded", "failed", "cancelled"] as const;
    const rows = await this.db
      .select({ note: notes })
      .from(notes)
      .innerJoin(
        accounts,
        and(
          eq(accounts.id, notes.ownerAccountId),
          eq(notes.lifecycle, "active"),
          isNotNull(accounts.verifiedAt),
        ),
      )
      .leftJoin(
        conversionJobs,
        and(eq(kind, "conversion"), eq(conversionJobs.id, jobId)),
      )
      .leftJoin(
        referenceJobs,
        and(eq(kind, "reference"), eq(referenceJobs.id, jobId)),
      )
      .where(
        or(
          and(
            eq(kind, "conversion"),
            or(
              isNull(conversionJobs.id),
              and(
                eq(conversionJobs.noteId, notes.id),
                eq(conversionJobs.accountId, accounts.id),
                inArray(conversionJobs.state, terminal),
              ),
            ),
          ),
          and(
            eq(kind, "reference"),
            or(
              isNull(referenceJobs.id),
              and(
                eq(referenceJobs.noteId, notes.id),
                eq(referenceJobs.accountId, accounts.id),
                inArray(referenceJobs.state, terminal),
              ),
            ),
          ),
        ),
      )
      .limit(limit);
    return rows.map((row) => toNote(row.note));
  }
  async insert(note: Note) {
    await this.db.insert(notes).values({
      ...note,
      ...lifecycleColumns(note),
      ownerAccountId:
        note.owner.kind === "personal" ? note.owner.accountId : null,
      ownerWorkspaceId:
        note.owner.kind === "workspace" ? note.owner.workspaceId : null,
    });
  }
  async save(note: Note, expectedVersion: number) {
    const rows = await this.db
      .update(notes)
      .set({
        ...lifecycleColumns(note),
        title: note.title,
        html: note.html,
        display: note.display,
        version: note.version,
        updatedAt: note.updatedAt,
      })
      .where(and(eq(notes.id, note.id), eq(notes.version, expectedVersion)))
      .returning({ id: notes.id });
    if (!rows.length)
      throw new ConflictError(
        "NOTE_CONFLICT",
        "ノートが更新されました。再読み込みしてください。",
      );
  }
}

import {
  ConflictError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import type { Note, NoteOwner } from "@repo/core/domain/note/entity";
import type { NoteRepository } from "@repo/core/domain/note/ports/noteRepository";
import type { ScopeCursor } from "@repo/core/domain/workspace/entity";
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
import { accounts, conversionJobs, notes, originals } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { referenceJobs } from "../referenceSchema";
import { noteSharing } from "../sharingSchema";
import { scopeCondition } from "./scopeCapacityRepository";

function lifecycle(
  row: Pick<
    typeof notes.$inferSelect,
    "lifecycle" | "trashedAt" | "purgeAfter" | "trashOperationId"
  >,
): Note["lifecycle"] {
  if (
    row.lifecycle === "purging" &&
    !row.trashedAt &&
    !row.purgeAfter &&
    row.trashOperationId
  )
    return { kind: "purging", purgeId: row.trashOperationId };
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
    trashOperationId:
      state.kind === "trashed"
        ? state.operationId
        : state.kind === "purging"
          ? state.purgeId
          : null,
  };
}

function toNote(
  row: typeof notes.$inferSelect,
  visibility: Note["visibility"] | null,
): Note {
  if (visibility === null)
    throw new SystemError(
      SystemErrorCode.DataIntegrityError,
      "Note sharing is missing",
    );
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
    creator: row.creatorId
      ? { kind: "account", accountId: row.creatorId }
      : { kind: "unknown" },
    owner,
    lifecycle: lifecycle(row),
    title: row.title,
    html: row.html,
    display: row.display,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    visibility,
    status: "ready",
  };
}

export class LibsqlNoteRepository implements NoteRepository {
  constructor(private readonly db: HollowTransaction) {}
  async listScoped(
    scope: NoteOwner,
    before: ScopeCursor | undefined,
    limit: number,
  ) {
    return this.db
      .select({
        id: notes.id,
        title: notes.title,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        status: sql<
          "ready" | "processing" | "needs_ai" | "failed" | "cancelled"
        >`coalesce(${originals.state}, 'ready')`,
        thumbnailUrl: sql<
          string | null
        >`(select '/api/notes/'||${notes.id}||'/assets/'||a.id from assets a join note_asset_references r on r.asset_id=a.id where r.note_id=${notes.id} and r.version=0 and a.kind='image' and a.state='ready' limit 1)`,
      })
      .from(notes)
      .leftJoin(originals, eq(originals.noteId, notes.id))
      .where(
        and(
          scopeCondition(
            scope,
            sql`${notes.ownerWorkspaceId}`,
            sql`${notes.ownerAccountId}`,
          ),
          eq(notes.lifecycle, "active"),
          before
            ? or(
                lt(notes.updatedAt, before.at),
                and(eq(notes.updatedAt, before.at), lt(notes.id, before.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(notes.updatedAt), desc(notes.id))
      .limit(limit);
  }
  async listPersonal(accountId: string) {
    const rows = await this.db
      .select({ note: notes, visibility: noteSharing.visibility })
      .from(notes)
      .leftJoin(noteSharing, eq(noteSharing.noteId, notes.id))
      .where(
        and(eq(notes.ownerAccountId, accountId), eq(notes.lifecycle, "active")),
      )
      .orderBy(desc(notes.updatedAt), desc(notes.id));
    return rows.map((row) => toNote(row.note, row.visibility));
  }
  async listTrashed(
    scope: NoteOwner,
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
          scopeCondition(
            scope,
            sql`${notes.ownerWorkspaceId}`,
            sql`${notes.ownerAccountId}`,
          ),
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
    const [row] = await this.db
      .select({ note: notes, visibility: noteSharing.visibility })
      .from(notes)
      .leftJoin(noteSharing, eq(noteSharing.noteId, notes.id))
      .where(eq(notes.id, id));
    return row ? toNote(row.note, row.visibility) : null;
  }
  async unsettledDisplays(limit: number) {
    const kind = sql<string>`json_extract(${notes.display}, '$.initialization.kind')`;
    const jobId = sql<string>`json_extract(${notes.display}, '$.initialization.jobId')`;
    const terminal = ["succeeded", "failed", "cancelled"] as const;
    const rows = await this.db
      .select({ note: notes, visibility: noteSharing.visibility })
      .from(notes)
      .leftJoin(noteSharing, eq(noteSharing.noteId, notes.id))
      .leftJoin(
        conversionJobs,
        and(eq(kind, "conversion"), eq(conversionJobs.id, jobId)),
      )
      .leftJoin(
        referenceJobs,
        and(eq(kind, "reference"), eq(referenceJobs.id, jobId)),
      )
      .innerJoin(
        accounts,
        and(
          eq(
            accounts.id,
            sql`coalesce(${conversionJobs.accountId},${referenceJobs.accountId},${notes.creatorId},${notes.ownerAccountId})`,
          ),
          isNotNull(accounts.verifiedAt),
        ),
      )
      .where(
        and(
          eq(notes.lifecycle, "active"),
          sql`(${notes.ownerAccountId}=${accounts.id} or exists(select 1 from workspace_members m join workspaces w on w.id=m.workspace_id where m.workspace_id=${notes.ownerWorkspaceId} and m.account_id=${accounts.id} and m.role in ('owner','editor') and w.state='active'))`,
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
        ),
      )
      .limit(limit);
    return rows.map((row) => toNote(row.note, row.visibility));
  }
  async insert(note: Note) {
    await this.db.insert(notes).values({
      ...note,
      creatorId:
        note.creator?.kind === "account" ? note.creator.accountId : null,
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

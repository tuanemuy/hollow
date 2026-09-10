import type { RevisionRepository } from "@repo/core/domain/note/ports/revisionRepository";
import type {
  NoteRevision,
  RevisionHead,
} from "@repo/core/domain/note/revision";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { noteRevisions, revisionHeads } from "../revisionSchema";

export class LibsqlRevisionRepository implements RevisionRepository {
  constructor(private readonly db: HollowTransaction) {}
  async head(noteId: string) {
    return (
      (
        await this.db
          .select()
          .from(revisionHeads)
          .where(eq(revisionHeads.noteId, noteId))
      )[0] ?? null
    );
  }
  async saveHead(head: RevisionHead) {
    await this.db
      .insert(revisionHeads)
      .values(head)
      .onConflictDoUpdate({ target: revisionHeads.noteId, set: head });
  }
  async find(noteId: string, revisionNo: number) {
    return (
      (
        await this.db
          .select()
          .from(noteRevisions)
          .where(
            and(
              eq(noteRevisions.noteId, noteId),
              eq(noteRevisions.revisionNo, revisionNo),
            ),
          )
      )[0] ?? null
    );
  }
  async list(noteId: string) {
    return this.db
      .select()
      .from(noteRevisions)
      .where(eq(noteRevisions.noteId, noteId))
      .orderBy(desc(noteRevisions.revisionNo));
  }
  async insert(revision: NoteRevision) {
    await this.db.insert(noteRevisions).values(revision);
  }
  async prune(noteId: string, keep: number) {
    const discarded = (await this.list(noteId))
      .slice(keep)
      .map((r) => r.revisionNo);
    if (discarded.length)
      await this.db
        .delete(noteRevisions)
        .where(
          and(
            eq(noteRevisions.noteId, noteId),
            inArray(noteRevisions.revisionNo, discarded),
          ),
        );
    return discarded;
  }
}

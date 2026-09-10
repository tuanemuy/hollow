import type { NoteRevision, RevisionHead } from "../revision";

export interface RevisionRepository {
  head(noteId: string): Promise<RevisionHead | null>;
  saveHead(head: RevisionHead): Promise<void>;
  find(noteId: string, revisionNo: number): Promise<NoteRevision | null>;
  list(noteId: string): Promise<readonly NoteRevision[]>;
  insert(revision: NoteRevision): Promise<void>;
  prune(noteId: string, keep: number): Promise<readonly number[]>;
}

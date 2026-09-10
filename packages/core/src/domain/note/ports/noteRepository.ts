import type { Note } from "../entity";

export interface NoteRepository {
  listPersonal(accountId: string): Promise<readonly Note[]>;
  findById(id: string): Promise<Note | null>;
  unsettledDisplays(limit: number): Promise<readonly Note[]>;
  insert(note: Note): Promise<void>;
  save(note: Note, expectedVersion: number): Promise<void>;
}

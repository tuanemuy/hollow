import type { Original } from "../../import/entity";
import type { ScopeCursor } from "../../workspace/entity";
import type { Note, NoteOwner } from "../entity";

export type NoteCard = Readonly<
  Pick<Note, "id" | "title" | "createdAt" | "updatedAt"> & {
    status: Original["state"];
    thumbnailUrl: string | null;
  }
>;

export interface NoteRepository {
  listScoped(
    scope: NoteOwner,
    before: ScopeCursor | undefined,
    limit: number,
  ): Promise<readonly NoteCard[]>;
  listPersonal(accountId: string): Promise<readonly Note[]>;
  listTrashed(
    scope: NoteOwner,
    before: Readonly<{ at: Date; id: string }> | undefined,
    limit: number,
  ): Promise<readonly Pick<Note, "id" | "title" | "lifecycle">[]>;
  findById(id: string): Promise<Note | null>;
  unsettledDisplays(limit: number): Promise<readonly Note[]>;
  insert(note: Note): Promise<void>;
  save(note: Note, expectedVersion: number): Promise<void>;
}

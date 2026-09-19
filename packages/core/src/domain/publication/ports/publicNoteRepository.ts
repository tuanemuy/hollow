import type { PublicNoteIdentity } from "../entity";

export interface PublicNoteRepository {
  find(noteId: string): Promise<PublicNoteIdentity | null>;
  resolve(
    publicId: string,
    urlGeneration: number,
  ): Promise<PublicNoteIdentity | null>;
  create(identity: PublicNoteIdentity): Promise<void>;
  revoke(noteId: string, expectedEpoch: number): Promise<boolean>;
}

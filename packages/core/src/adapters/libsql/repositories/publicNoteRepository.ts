import type { PublicNoteIdentity } from "@repo/core/domain/publication/entity";
import type { PublicNoteRepository } from "@repo/core/domain/publication/ports/publicNoteRepository";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { publicNoteIdentities } from "../publicationSchema";

export class LibsqlPublicNoteRepository implements PublicNoteRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(noteId: string) {
    const [row] = await this.db
      .select()
      .from(publicNoteIdentities)
      .where(eq(publicNoteIdentities.noteId, noteId));
    return row ?? null;
  }
  async resolve(publicId: string, urlGeneration: number) {
    const [row] = await this.db
      .select()
      .from(publicNoteIdentities)
      .where(
        and(
          eq(publicNoteIdentities.publicId, publicId),
          eq(publicNoteIdentities.urlGeneration, urlGeneration),
        ),
      );
    return row ?? null;
  }
  async create(identity: PublicNoteIdentity) {
    await this.db.insert(publicNoteIdentities).values(identity);
  }
  async revoke(noteId: string, expectedEpoch: number) {
    return (
      (
        await this.db
          .update(publicNoteIdentities)
          .set({ accessEpoch: sql`${publicNoteIdentities.accessEpoch}+1` })
          .where(
            and(
              eq(publicNoteIdentities.noteId, noteId),
              eq(publicNoteIdentities.accessEpoch, expectedEpoch),
            ),
          )
          .returning()
      ).length === 1
    );
  }
}

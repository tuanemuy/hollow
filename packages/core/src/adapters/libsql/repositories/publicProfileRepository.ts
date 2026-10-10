import type { PublicProfileRepository } from "@repo/core/domain/account/ports/publicProfileRepository";
import type { PublicProfile } from "@repo/core/domain/account/profile";
import { and, eq, ne, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { publicProfiles } from "../publicationSchema";

export class LibsqlPublicProfileRepository implements PublicProfileRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(accountId: string) {
    const [row] = await this.db
      .select()
      .from(publicProfiles)
      .where(
        and(
          eq(publicProfiles.accountId, accountId),
          sql`exists(select 1 from accounts a where a.id=${publicProfiles.accountId} and a.state='active')`,
        ),
      );
    return row ?? null;
  }
  async findByHandle(handle: string) {
    const [row] = await this.db
      .select()
      .from(publicProfiles)
      .where(
        and(
          eq(publicProfiles.handle, handle),
          sql`exists(select 1 from accounts a where a.id=${publicProfiles.accountId} and a.state='active')`,
        ),
      );
    return row ?? null;
  }
  async handleExists(handle: string, exceptAccountId: string) {
    return (
      (
        await this.db
          .select({ id: publicProfiles.accountId })
          .from(publicProfiles)
          .where(
            and(
              eq(publicProfiles.handle, handle),
              ne(publicProfiles.accountId, exceptAccountId),
            ),
          )
          .limit(1)
      ).length > 0
    );
  }
  async hasPublicNotes(accountId: string) {
    return (
      (
        await this.db.all(
          sql`select 1 from notes n join note_sharing s on s.note_id=n.id where n.owner_workspace_id is null and n.owner_account_id=${accountId} and s.visibility='public' limit 1`,
        )
      ).length > 0
    );
  }
  async ensure(accountId: string) {
    await this.db
      .insert(publicProfiles)
      .values({ accountId })
      .onConflictDoNothing();
  }
  async save(profile: PublicProfile, expectedVersion: number) {
    return (
      (
        await this.db
          .update(publicProfiles)
          .set({
            handle: profile.handle,
            bio: profile.bio,
            iconId: profile.iconId,
            version: expectedVersion + 1,
          })
          .where(
            and(
              eq(publicProfiles.accountId, profile.accountId),
              eq(publicProfiles.version, expectedVersion),
            ),
          )
          .returning()
      ).length === 1
    );
  }
}

import type { WorkspacePublication } from "@repo/core/domain/publication/entity";
import type { WorkspacePublicationRepository } from "@repo/core/domain/publication/ports/workspacePublicationRepository";
import { eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { workspacePublications } from "../publicationSchema";

export class LibsqlWorkspacePublicationRepository
  implements WorkspacePublicationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async resolve(slug: string) {
    const [row] = await this.db.all<{
      workspaceId: string;
      settingsVersion: number;
      publicationVersion: number;
    }>(
      sql`select w.id workspaceId,w.settings_version settingsVersion,p.version publicationVersion from workspaces w join workspace_public_settings p on p.workspace_id=w.id where w.state='active' and w.slug=${slug} and p.page_public=1`,
    );
    return row ?? null;
  }
  async find(workspaceId: string) {
    const [row] = await this.db
      .select()
      .from(workspacePublications)
      .where(eq(workspacePublications.workspaceId, workspaceId));
    return row ?? { workspaceId, pagePublic: false, version: 0 };
  }
  async save(publication: WorkspacePublication, expectedVersion: number) {
    if ((await this.find(publication.workspaceId)).version !== expectedVersion)
      return false;
    return (
      (
        await this.db
          .insert(workspacePublications)
          .values({ ...publication, version: expectedVersion + 1 })
          .onConflictDoUpdate({
            target: workspacePublications.workspaceId,
            set: {
              pagePublic: publication.pagePublic,
              version: expectedVersion + 1,
            },
            setWhere: eq(workspacePublications.version, expectedVersion),
          })
          .returning()
      ).length === 1
    );
  }
  async remove(workspaceId: string) {
    await this.db
      .delete(workspacePublications)
      .where(eq(workspacePublications.workspaceId, workspaceId));
  }
}

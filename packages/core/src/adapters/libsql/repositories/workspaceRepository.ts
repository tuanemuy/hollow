import type {
  Workspace,
  WorkspaceRole,
} from "@repo/core/domain/workspace/entity";
import type { WorkspaceRepository } from "@repo/core/domain/workspace/ports/workspaceRepository";
import { and, asc, count, eq, gt } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { workspaceMembers, workspaces } from "../workspaceSchema";

export class LibsqlWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    return (
      (
        await this.db.select().from(workspaces).where(eq(workspaces.id, id))
      )[0] ?? null
    );
  }
  async role(id: string, accountId: string) {
    return (
      (
        await this.db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .innerJoin(
            workspaces,
            and(
              eq(workspaces.id, workspaceMembers.workspaceId),
              eq(workspaces.state, "active"),
            ),
          )
          .where(
            and(
              eq(workspaceMembers.workspaceId, id),
              eq(workspaceMembers.accountId, accountId),
            ),
          )
      )[0]?.role ?? null
    );
  }
  async list(accountId: string, after: string | undefined, limit: number) {
    return (
      await this.db
        .select({ workspace: workspaces, role: workspaceMembers.role })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(
          and(
            eq(workspaceMembers.accountId, accountId),
            eq(workspaces.state, "active"),
            after ? gt(workspaces.id, after) : undefined,
          ),
        )
        .orderBy(asc(workspaces.id))
        .limit(limit)
    ).map((r) => ({ ...r.workspace, role: r.role }));
  }
  async countCreated(accountId: string) {
    return (
      (
        await this.db
          .select({ n: count() })
          .from(workspaces)
          .where(
            and(
              eq(workspaces.creatorId, accountId),
              eq(workspaces.state, "active"),
            ),
          )
      )[0]?.n ?? 0
    );
  }
  async slugExists(slug: string) {
    return (
      (
        await this.db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, slug))
          .limit(1)
      ).length > 0
    );
  }
  async create(workspace: Workspace) {
    await this.db.insert(workspaces).values(workspace);
    await this.membership(workspace.id, workspace.creatorId, "owner");
  }
  async membership(
    workspaceId: string,
    accountId: string,
    role: WorkspaceRole | null,
  ) {
    if (role)
      await this.db
        .insert(workspaceMembers)
        .values({ workspaceId, accountId, role })
        .onConflictDoUpdate({
          target: [workspaceMembers.workspaceId, workspaceMembers.accountId],
          set: { role },
        });
    else
      await this.db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.accountId, accountId),
          ),
        );
  }
}

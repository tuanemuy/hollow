import type {
  Workspace,
  WorkspaceRole,
} from "@repo/core/domain/workspace/entity";
import type { WorkspaceRepository } from "@repo/core/domain/workspace/ports/workspaceRepository";
import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import { accounts } from "../hollowSchema";
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
    await this.join(
      workspace.id,
      workspace.creatorId,
      "owner",
      workspace.createdAt,
    );
  }
  async settingsVersion(id: string) {
    return (
      (
        await this.db
          .select({ v: workspaces.settingsVersion })
          .from(workspaces)
          .where(eq(workspaces.id, id))
      )[0]?.v ?? 0
    );
  }
  async updateSettings(
    id: string,
    expected: number,
    fields: Pick<Workspace, "name" | "description" | "slug">,
  ) {
    return (
      (
        await this.db
          .update(workspaces)
          .set({ ...fields, settingsVersion: expected + 1 })
          .where(
            and(
              eq(workspaces.id, id),
              eq(workspaces.settingsVersion, expected),
            ),
          )
          .returning({ id: workspaces.id })
      ).length === 1
    );
  }
  async members(id: string, after: string | undefined, limit: number) {
    return this.db
      .select({
        accountId: workspaceMembers.accountId,
        email: accounts.email,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(accounts, eq(accounts.id, workspaceMembers.accountId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, id),
          after ? gt(workspaceMembers.accountId, after) : undefined,
        ),
      )
      .orderBy(asc(workspaceMembers.accountId))
      .limit(limit);
  }
  async ownerCount(id: string) {
    return (
      (
        await this.db
          .select({ n: count() })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, id),
              eq(workspaceMembers.role, "owner"),
            ),
          )
      )[0]?.n ?? 0
    );
  }
  async join(id: string, accountId: string, role: WorkspaceRole, now: Date) {
    await this.db
      .insert(workspaceMembers)
      .values({ workspaceId: id, accountId, role, joinedAt: now })
      .onConflictDoNothing();
  }
  async cancelActorJobs(id: string, accountId: string, now: Date) {
    const activeConversion = sql`SELECT j.id FROM conversion_jobs j JOIN notes n ON n.id=j.note_id WHERE n.owner_workspace_id=${id} AND j.account_id=${accountId} AND j.state IN ('queued','running')`;
    const activeReference = sql`SELECT j.id FROM reference_jobs j JOIN notes n ON n.id=j.note_id WHERE n.owner_workspace_id=${id} AND j.account_id=${accountId} AND j.state IN ('queued','running')`;
    await this.db.run(
      sql`UPDATE originals SET state='cancelled' WHERE active_job_id IN (${activeConversion})`,
    );
    await this.db.run(
      sql`UPDATE notes SET display=json_set(display,'$.initialization',json('{"kind":"complete","reason":"interrupted"}')),version=version+1 WHERE owner_workspace_id=${id} AND (json_extract(display,'$.initialization.jobId') IN (${activeConversion}) OR json_extract(display,'$.initialization.jobId') IN (${activeReference}))`,
    );
    await this.db.run(
      sql`UPDATE reference_settings SET active_job_id=NULL WHERE active_job_id IN (${activeReference})`,
    );
    await this.db.run(
      sql`UPDATE conversion_jobs SET state='cancelled',lease_token=NULL,lease_until=NULL,failure=NULL,updated_at=${now.getTime()} WHERE id IN (${activeConversion})`,
    );
    await this.db.run(
      sql`UPDATE reference_jobs SET state='cancelled',lease_token=NULL,lease_until=NULL,failure=NULL,cancel_requested=1,updated_at=${now.getTime()} WHERE id IN (${activeReference})`,
    );
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

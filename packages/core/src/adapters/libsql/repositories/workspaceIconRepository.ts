import type {
  IconOutput,
  WorkspaceIcon,
} from "@repo/core/domain/workspace/icon";
import type { WorkspaceIconRepository } from "@repo/core/domain/workspace/ports/workspaceIconRepository";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { workspaceIcons } from "../workspaceIconSchema";
import { workspaces } from "../workspaceSchema";

function icon(row: typeof workspaceIcons.$inferSelect): WorkspaceIcon {
  const output =
    row.sha256 && row.width && row.height
      ? {
          bytes: row.bytes,
          sha256: row.sha256,
          width: row.width,
          height: row.height,
        }
      : null;
  if (row.state === "ready" || row.state === "writing") {
    if (!output) throw new Error("Incomplete icon provenance");
    return { ...row, state: row.state, output };
  }
  return { ...row, state: row.state, output };
}
export class LibsqlWorkspaceIconRepository implements WorkspaceIconRepository {
  constructor(private readonly db: HollowTransaction) {}
  async create(row: WorkspaceIcon) {
    await this.db.insert(workspaceIcons).values({
      ...row,
      sha256: row.output?.sha256 ?? null,
      width: row.output?.width ?? null,
      height: row.output?.height ?? null,
    });
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(workspaceIcons)
      .where(eq(workspaceIcons.id, id));
    return row ? icon(row) : null;
  }
  async processing(id: string, expiresAt: Date) {
    return (
      (
        await this.db
          .update(workspaceIcons)
          .set({ state: "processing", expiresAt })
          .where(
            and(
              eq(workspaceIcons.id, id),
              eq(workspaceIcons.state, "awaiting"),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async writing(id: string, output: IconOutput) {
    return (
      (
        await this.db
          .update(workspaceIcons)
          .set({ state: "writing", ...output })
          .where(
            and(
              eq(workspaceIcons.id, id),
              eq(workspaceIcons.state, "processing"),
            ),
          )
          .returning()
      ).length > 0
    );
  }
  async adopt(
    id: string,
    workspaceId: string,
    expectedVersion: number,
    now: Date,
  ) {
    const [w] = await this.db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.settingsVersion, expectedVersion),
          eq(workspaces.state, "active"),
        ),
      );
    const current = await this.find(id);
    if (
      !w ||
      current?.state !== "writing" ||
      current.workspaceId !== workspaceId
    )
      return false;
    await this.db
      .update(workspaces)
      .set({ iconId: id, settingsVersion: expectedVersion + 1 })
      .where(eq(workspaces.id, workspaceId));
    await this.db
      .update(workspaceIcons)
      .set({ state: "ready" })
      .where(eq(workspaceIcons.id, id));
    if (w.iconId) await this.fence(w.iconId, now);
    return true;
  }
  async fence(id: string, now: Date) {
    await this.db
      .update(workspaceIcons)
      .set({ state: "cleanup", nextAttemptAt: now })
      .where(
        and(
          eq(workspaceIcons.id, id),
          sql`not exists(select 1 from workspaces where icon_id=${id})`,
        ),
      );
  }
  async invalidateActor(workspaceId: string, actorId: string, now: Date) {
    await this.db
      .update(workspaceIcons)
      .set({ state: "cleanup", nextAttemptAt: now })
      .where(
        and(
          eq(workspaceIcons.workspaceId, workspaceId),
          eq(workspaceIcons.actorId, actorId),
          inArray(workspaceIcons.state, ["awaiting", "processing", "writing"]),
        ),
      );
  }
  async expire(now: Date) {
    await this.db.run(
      sql`update workspace_icons set state='cleanup',next_attempt_at=${now.getTime()} where id in (select i.id from workspace_icons i where i.state in ('awaiting','processing','writing') and i.expires_at<=${now.getTime()} and not exists(select 1 from object_writes w where w.kind='icon-upload' and w.owner_id=i.id and w.active=1) order by i.expires_at,i.id limit 20)`,
    );
  }
  async cleanupCandidates(now: Date, limit: number) {
    return (
      await this.db
        .select()
        .from(workspaceIcons)
        .where(
          and(
            eq(workspaceIcons.state, "cleanup"),
            lte(workspaceIcons.nextAttemptAt, now),
            sql`not exists(select 1 from object_writes w where w.kind='icon-upload' and w.owner_id=${workspaceIcons.id} and w.active=1)`,
          ),
        )
        .orderBy(workspaceIcons.nextAttemptAt, workspaceIcons.id)
        .limit(limit)
    ).map(icon);
  }
  async retryCleanup(id: string, next: Date) {
    await this.db
      .update(workspaceIcons)
      .set({ nextAttemptAt: next, failure: "ICON_CLEANUP_RETRY" })
      .where(
        and(eq(workspaceIcons.id, id), eq(workspaceIcons.state, "cleanup")),
      );
  }
  async finishCleanup(id: string, token: string) {
    return (
      (
        await this.db
          .delete(workspaceIcons)
          .where(
            and(
              eq(workspaceIcons.id, id),
              eq(workspaceIcons.state, "cleanup"),
              sql`exists(select 1 from object_deletes d where d.storage_key=${workspaceIcons.storageKey} and d.token=${token} and d.done=1)`,
              sql`not exists(select 1 from object_writes w where w.kind='icon-upload' and w.owner_id=${workspaceIcons.id} and w.active=1)`,
              sql`not exists(select 1 from workspaces where icon_id=${id})`,
            ),
          )
          .returning()
      ).length > 0
    );
  }
}

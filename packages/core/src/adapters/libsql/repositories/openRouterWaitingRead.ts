import type { OpenRouterWaitingReadPort } from "@repo/core/application/integration/openRouter/ports";
import { and, count, eq, exists, gt, isNull, or } from "drizzle-orm";
import { notes, originals } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { workspaceMembers, workspaces } from "../workspaceSchema";

export class LibsqlOpenRouterWaitingRead implements OpenRouterWaitingReadPort {
  constructor(private readonly db: HollowTransaction) {}
  async list(accountId: string, afterId: string | undefined, limit: number) {
    const workspaceRead = exists(
      this.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .innerJoin(
          workspaceMembers,
          eq(workspaceMembers.workspaceId, workspaces.id),
        )
        .where(
          and(
            eq(workspaces.id, notes.ownerWorkspaceId),
            eq(workspaces.state, "active"),
            eq(workspaceMembers.accountId, accountId),
          ),
        ),
    );
    const predicate = and(
      eq(notes.lifecycle, "active"),
      eq(originals.state, "needs_ai"),
      or(
        and(
          eq(notes.ownerAccountId, accountId),
          isNull(notes.ownerWorkspaceId),
        ),
        and(isNull(notes.ownerAccountId), workspaceRead),
      ),
    );
    const [total] = await this.db
      .select({ n: count() })
      .from(notes)
      .innerJoin(originals, eq(originals.noteId, notes.id))
      .where(predicate);
    const size = Math.min(50, Math.max(1, limit));
    const rows = await this.db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .innerJoin(originals, eq(originals.noteId, notes.id))
      .where(
        and(
          predicate,
          afterId === undefined ? undefined : gt(notes.id, afterId),
        ),
      )
      .orderBy(notes.id)
      .limit(size + 1);
    const items = rows.slice(0, size);
    return {
      items,
      total: total?.n ?? 0,
      next: rows.length > size ? (items.at(-1)?.id ?? null) : null,
    };
  }
}

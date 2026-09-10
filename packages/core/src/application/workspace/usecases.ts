import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import type { NoteCard } from "@repo/core/domain/note/ports/noteRepository";
import {
  SCOPE_PAGE_SIZE,
  type ScopeSelection,
  selectedScope,
  type Workspace,
  type WorkspaceRole,
  workspaceFields,
  workspaceSlug,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { requireScope, scopeUsage, scopeView } from "./access";

export type WorkspaceView = Readonly<
  Pick<Workspace, "id" | "name" | "description" | "slug" | "iconId"> & {
    role: WorkspaceRole;
  }
>;
export type NoteCardView = Readonly<
  Omit<NoteCard, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  }
>;
export async function getScopeUsage(
  c: HollowContainer,
  token: string | null,
  input: ScopeSelection = {},
) {
  return c.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(c, context.accounts, token);
    const scope = await requireScope(
      context,
      selectedScope(account.id, input),
      account.id,
    );
    return {
      scope: await scopeView(context, scope, account.id),
      usage: await scopeUsage(context, scope, c.clock.now()),
    };
  });
}
const view = (w: Workspace & { role: WorkspaceRole }): WorkspaceView => ({
  id: w.id,
  name: w.name,
  description: w.description,
  slug: w.slug,
  role: w.role,
  iconId: w.iconId ?? null,
});
export async function createWorkspace(
  c: HollowContainer,
  token: string | null,
  input: { name: string; description: string; slug?: string },
) {
  const fields = workspaceFields(input);
  return c.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(c, context.accounts, token);
    if ((await context.workspaces.countCreated(account.id)) >= 20)
      throw new BusinessRuleError(
        "WORKSPACE_LIMIT",
        "作成できるワークスペースは20件までです。",
      );
    if (fields.slug && (await context.workspaces.slugExists(fields.slug)))
      throw new BusinessRuleError(
        "WORKSPACE_SLUG_TAKEN",
        "このスラッグは使われています。候補を選び直してください。",
      );
    const workspace: Workspace = {
      id: c.idGenerator.next(),
      creatorId: account.id,
      ...fields,
      state: "active",
      createdAt: c.clock.now(),
    };
    await context.workspaces.create(workspace);
    return view({ ...workspace, role: "owner" });
  });
}
export async function listWorkspaces(
  c: HollowContainer,
  token: string | null,
  input: { cursor?: string } = {},
) {
  return c.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(c, context.accounts, token);
    const rows = await context.workspaces.list(
      account.id,
      input.cursor,
      SCOPE_PAGE_SIZE + 1,
    );
    const page = rows.slice(0, SCOPE_PAGE_SIZE);
    return {
      items: page.map(view),
      nextCursor:
        rows.length > SCOPE_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
    };
  });
}
export async function checkWorkspaceSlug(
  c: HollowContainer,
  token: string | null,
  input: { slug: string },
) {
  const slug = workspaceSlug(input.slug);
  return c.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(c, context.accounts, token);
    const now = c.clock.now();
    const key = `workspace-slug:${account.id}`;
    const previous = await context.accounts.findThrottle(key);
    const attempts =
      previous && previous.blockedUntil > now ? previous.attempts + 1 : 1;
    if (attempts > 60)
      throw new BusinessRuleError(
        "WORKSPACE_SLUG_RATE",
        "スラッグ確認が多すぎます。1分ほど待ってください。",
      );
    await context.accounts.saveThrottle({
      key,
      attempts,
      blockedUntil:
        previous && previous.blockedUntil > now
          ? previous.blockedUntil
          : new Date(now.getTime() + 60_000),
      lastAttemptAt: now,
    });
    if (!slug || !(await context.workspaces.slugExists(slug)))
      return { available: true, suggestions: [] as string[] };
    const suggestions: string[] = [];
    for (let i = 2; i <= 6 && suggestions.length < 3; i++) {
      const candidate = `${slug.slice(0, 60).replace(/-+$/, "")}-${i}`;
      if (!(await context.workspaces.slugExists(candidate)))
        suggestions.push(candidate);
    }
    return { available: false, suggestions };
  });
}
export function decodeNoteCursor(value: string | undefined, scope: NoteOwner) {
  if (value === undefined) return undefined;
  try {
    const row: unknown = JSON.parse(value);
    if (
      !row ||
      typeof row !== "object" ||
      !("scope" in row) ||
      !("at" in row) ||
      !("id" in row) ||
      row.scope !== JSON.stringify(scope) ||
      typeof row.at !== "string" ||
      typeof row.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(row.id)
    )
      throw Error();
    const at = new Date(row.at);
    if (!Number.isFinite(at.getTime())) throw Error();
    return { at, id: row.id };
  } catch {
    throw new BusinessRuleError(
      "SCOPE_CURSOR",
      "続きの条件が変わりました。最初のページから開いてください。",
    );
  }
}
export async function listScopedNotes(
  c: HollowContainer,
  token: string | null,
  input: ScopeSelection & { cursor?: string } = {},
) {
  return c.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(c, context.accounts, token);
    const scope = await requireScope(
      context,
      selectedScope(account.id, input),
      account.id,
    );
    const rows = await context.notes.listScoped(
      scope,
      decodeNoteCursor(input.cursor, scope),
      SCOPE_PAGE_SIZE + 1,
    );
    const page = rows.slice(0, SCOPE_PAGE_SIZE);
    const last = page.at(-1);
    const items: NoteCardView[] = page.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
    return {
      items,
      nextCursor:
        rows.length > SCOPE_PAGE_SIZE && last
          ? JSON.stringify({
              scope: JSON.stringify(scope),
              at: last.updatedAt.toISOString(),
              id: last.id,
            })
          : null,
      scope: await scopeView(context, scope, account.id),
      usage: await scopeUsage(context, scope, c.clock.now()),
    };
  });
}

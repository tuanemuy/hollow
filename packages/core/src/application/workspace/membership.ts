import { BusinessRuleError } from "@repo/core/domain/error";
import {
  type WorkspaceRole,
  workspaceFields,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { WorkspaceSettingsView } from "./invitationViews";
export async function requireWorkspaceOwner(
  c: HollowUnitOfWorkContext,
  id: string,
  accountId: string,
) {
  const workspace = await c.workspaces.find(id);
  if (
    !workspace ||
    workspace.state !== "active" ||
    (await c.workspaces.role(id, accountId)) !== "owner"
  )
    throw new NotFoundError(
      "WORKSPACE_OWNER_REQUIRED",
      "現在のオーナーだけが操作できます。",
    );
  return workspace;
}
export async function getWorkspaceSettings(
  container: HollowContainer,
  token: string | null,
  input: { workspaceId: string; cursor?: string },
): Promise<WorkspaceSettingsView> {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const w = await c.workspaces.find(input.workspaceId);
    const role = await c.workspaces.role(input.workspaceId, account.id);
    if (!w || !role || w.state !== "active")
      throw new NotFoundError(
        "WORKSPACE_NOT_FOUND",
        "このスペースにはアクセスできません。",
      );
    const rows = await c.workspaces.members(w.id, input.cursor, 51);
    const page = rows.slice(0, 50);
    return {
      id: w.id,
      name: w.name,
      description: w.description,
      slug: w.slug,
      role,
      accountId: account.id,
      settingsVersion: await c.workspaces.settingsVersion(w.id),
      iconId: w.iconId ?? null,
      ownerCount: await c.workspaces.ownerCount(w.id),
      members: page.map((m) => ({
        ...m,
        displayName: null,
        joinedAt: m.joinedAt?.toISOString() ?? null,
      })),
      nextCursor: rows.length > 50 ? (page.at(-1)?.accountId ?? null) : null,
    };
  });
}
export async function updateWorkspaceSettings(
  container: HollowContainer,
  token: string | null,
  input: {
    workspaceId: string;
    settingsVersion: number;
    name: string;
    description: string;
    slug?: string;
  },
) {
  const fields = workspaceFields(input);
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const w = await requireWorkspaceOwner(c, input.workspaceId, account.id);
    if ((await c.workspaces.settingsVersion(w.id)) !== input.settingsVersion)
      throw new ConflictError(
        "WORKSPACE_SETTINGS_CHANGED",
        "設定が更新されました。現在の設定を確認してください。",
      );
    if (
      fields.slug &&
      fields.slug !== w.slug &&
      (await c.workspaces.slugExists(fields.slug))
    )
      throw new BusinessRuleError(
        "WORKSPACE_SLUG_TAKEN",
        "このスラッグは使われています。別の候補を選んでください。",
      );
    if (!fields.slug && (await c.workspacePublications.find(w.id)).pagePublic)
      throw new BusinessRuleError(
        "WORKSPACE_PUBLIC_SLUG_REQUIRED",
        "先にワークスペースの公開ページを非公開にしてからスラッグを解除してください。",
      );
    if (
      fields.name === w.name &&
      fields.description === w.description &&
      fields.slug === w.slug
    )
      return;
    if (
      !(await c.workspaces.updateSettings(w.id, input.settingsVersion, fields))
    )
      throw new ConflictError(
        "WORKSPACE_SETTINGS_CHANGED",
        "設定が更新されました。現在の設定を確認してください。",
      );
  });
}
async function mutateMembership(
  c: HollowUnitOfWorkContext,
  workspaceId: string,
  targetId: string,
  old: WorkspaceRole,
  next: WorkspaceRole | null,
  now: Date,
) {
  if (old === next) return;
  if (
    old === "owner" &&
    next !== "owner" &&
    (await c.workspaces.ownerCount(workspaceId)) <= 1
  )
    throw new BusinessRuleError(
      "WORKSPACE_LAST_OWNER",
      "最後のオーナーです。別のメンバーをオーナーにしてから操作してください。",
    );
  if (old === "owner" && next !== "owner") {
    await c.invitations.invalidateIssuer(workspaceId, targetId, now);
    await c.workspaceIcons.invalidateActor(workspaceId, targetId, now);
  }
  if (old !== "viewer" && (next === null || next === "viewer")) {
    await c.batches.cancelScopeActor(workspaceId, targetId, now);
    await c.workspaces.cancelActorJobs(workspaceId, targetId, now);
  }
  const rank: Readonly<Record<WorkspaceRole, number>> = {
    owner: 3,
    editor: 2,
    viewer: 1,
  };
  if (next === null || rank[next] < rank[old])
    await c.pdfRequests.cancelWorkspaceMember(workspaceId, targetId, now);
  if (next === null || rank[next] < rank[old])
    await c.zipRequests.cancelWorkspaceMember(
      workspaceId,
      targetId,
      next === null ? "membership-ended" : "role-downgrade",
      now,
    );
  await c.workspaces.membership(workspaceId, targetId, next);
}
export async function changeWorkspaceMember(
  container: HollowContainer,
  token: string | null,
  input: {
    workspaceId: string;
    accountId: string;
    role: WorkspaceRole | null;
    expectedRole: WorkspaceRole;
    ownerConfirmed: boolean;
  },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await requireWorkspaceOwner(c, input.workspaceId, account.id);
    if (account.id === input.accountId)
      throw new BusinessRuleError(
        "WORKSPACE_SELF_ROLE",
        "自分のロールは変更できません。脱退は専用操作を使ってください。",
      );
    const old = await c.workspaces.role(input.workspaceId, input.accountId);
    if (old === input.role) return;
    if (old !== input.expectedRole || !old)
      throw new ConflictError(
        "WORKSPACE_MEMBER_CHANGED",
        "メンバー情報が更新されました。もう一度確認してください。",
      );
    if (input.role === "owner" && !input.ownerConfirmed)
      throw new BusinessRuleError(
        "WORKSPACE_OWNER_CONFIRM",
        "オーナー権限の付与を確認してください。",
      );
    await mutateMembership(
      c,
      input.workspaceId,
      input.accountId,
      old,
      input.role,
      container.clock.now(),
    );
  });
}
export async function leaveWorkspace(
  container: HollowContainer,
  token: string | null,
  input: { workspaceId: string },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const role = await c.workspaces.role(input.workspaceId, account.id);
    if (!role) return;
    await mutateMembership(
      c,
      input.workspaceId,
      account.id,
      role,
      null,
      container.clock.now(),
    );
  });
}

import { BusinessRuleError } from "@repo/core/domain/error";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireWorkspaceOwner } from "../workspace/membership";
import type {
  SetWorkspacePublicationInput,
  WorkspacePublicationView,
} from "./views";

async function view(
  c: HollowUnitOfWorkContext,
  accountId: string,
  workspaceId: string,
  appUrl: string,
): Promise<WorkspacePublicationView> {
  const w = await c.workspaces.find(workspaceId);
  const role = await c.workspaces.role(workspaceId, accountId);
  if (!w || w.state !== "active" || !role)
    throw new NotFoundError(
      "WORKSPACE_NOT_FOUND",
      "このスペースにはアクセスできません。",
    );
  const publication = await c.workspacePublications.find(workspaceId);
  return {
    actorId: accountId,
    workspaceId,
    name: w.name,
    slug: w.slug,
    pagePublic: publication.pagePublic,
    settingsVersion: await c.workspaces.settingsVersion(workspaceId),
    publicationVersion: publication.version,
    canEdit: role === "owner",
    url:
      publication.pagePublic && w.slug
        ? new URL(`/w/${w.slug}`, appUrl).href
        : null,
  };
}
export async function getWorkspacePublication(
  container: HollowContainer,
  token: string | null,
  workspaceId: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return view(c, account.id, workspaceId, container.appUrl);
  });
}
export async function setWorkspacePublication(
  container: HollowContainer,
  token: string | null,
  input: SetWorkspacePublicationInput,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const w = await requireWorkspaceOwner(c, input.workspaceId, account.id);
    const publication = await c.workspacePublications.find(w.id);
    if (
      (await c.workspaces.settingsVersion(w.id)) !== input.settingsVersion ||
      publication.version !== input.publicationVersion
    )
      throw new ConflictError(
        "WORKSPACE_PUBLICATION_CHANGED",
        "設定が更新されました。現在の設定を確認してください。",
      );
    if (input.pagePublic && !w.slug)
      throw new BusinessRuleError(
        "WORKSPACE_PUBLIC_SLUG_REQUIRED",
        "公開ページにはスラッグの設定が必要です。",
      );
    if (
      publication.pagePublic !== input.pagePublic &&
      !(await c.workspacePublications.save(
        { ...publication, pagePublic: input.pagePublic },
        input.publicationVersion,
      ))
    )
      throw new ConflictError(
        "WORKSPACE_PUBLICATION_CHANGED",
        "設定が更新されました。現在の設定を確認してください。",
      );
    return view(c, account.id, w.id, container.appUrl);
  });
}

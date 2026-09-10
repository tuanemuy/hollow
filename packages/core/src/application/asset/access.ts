import {
  type Asset,
  type AssetReference,
  type HistoryAssetReference,
  MEDIA_LIMITS,
  type MediaDraft,
} from "@repo/core/domain/asset/entity";
import { selectedScope } from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote, requireScope } from "../workspace/access";

export const assetNotFound = () =>
  new NotFoundError(
    "ASSET_NOT_FOUND",
    "メディアが見つからないか、閲覧できません。",
  );
export async function requireDraft(
  context: HollowUnitOfWorkContext,
  id: string,
  accountId: string,
  now: Date,
  operation: "read" | "edit" = "edit",
) {
  const draft = await context.assets.findDraft(id);
  if (!draft || draft.accountId !== accountId || draft.expiresAt <= now)
    throw assetNotFound();
  if (draft.noteId)
    await requireNote(
      context,
      await context.notes.findById(draft.noteId),
      accountId,
      operation,
    );
  else
    await requireScope(
      context,
      selectedScope(accountId, { workspaceId: draft.workspaceId ?? undefined }),
      accountId,
      "edit",
    );
  return draft;
}
export async function canReadDraftAsset(
  context: HollowUnitOfWorkContext,
  asset: Asset,
  draft: MediaDraft,
) {
  if (asset.draftId !== draft.id) return false;
  if (!asset.committedToNote) return true;
  return !!draft.noteId && context.assets.isReferenced(draft.noteId, asset.id);
}
export async function authorizedAsset(
  context: HollowUnitOfWorkContext,
  accountId: string,
  reference: AssetReference,
  now: Date,
  purpose: "read" | "save" = "read",
) {
  const asset = await context.assets.find(reference.assetId);
  if (!asset || asset.state !== "ready") throw assetNotFound();
  if (reference.scope === "drafts") {
    const draft = await requireDraft(
      context,
      reference.scopeId,
      accountId,
      now,
      purpose === "read" && asset.committedToNote ? "read" : "edit",
    );
    if (asset.draftId !== reference.scopeId) throw assetNotFound();
    if (purpose === "read" && !(await canReadDraftAsset(context, asset, draft)))
      throw assetNotFound();
  } else {
    await requireNote(
      context,
      await context.notes.findById(reference.scopeId),
      accountId,
      purpose === "save" ? "edit" : "read",
    );
    if (!(await context.assets.isReferenced(reference.scopeId, asset.id))) {
      const origin =
        purpose === "save" && asset.draftId
          ? await context.assets.findDraft(asset.draftId)
          : null;
      if (
        purpose !== "save" ||
        !(
          origin?.noteId === reference.scopeId ||
          asset.sourceNoteId === reference.scopeId
        ) ||
        (asset.unreferencedAt &&
          asset.unreferencedAt.getTime() + MEDIA_LIMITS.unreferencedMs <=
            now.getTime())
      )
        throw assetNotFound();
    }
  }
  return asset;
}
export async function getAsset(
  container: HollowContainer,
  token: string | null,
  reference: AssetReference | HistoryAssetReference,
) {
  return container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    if (reference.scope === "history")
      return authorizedHistoryAsset(context, account.id, reference);
    return authorizedAsset(
      context,
      account.id,
      reference,
      container.clock.now(),
    );
  });
}
export async function authorizedHistoryAsset(
  context: HollowUnitOfWorkContext,
  accountId: string,
  reference: HistoryAssetReference,
) {
  await requireNote(
    context,
    await context.notes.findById(reference.scopeId),
    accountId,
  );
  if (!(await context.revisions.find(reference.scopeId, reference.revisionNo)))
    throw assetNotFound();
  if (
    !(
      await context.assets.referenceIds(reference.scopeId, reference.revisionNo)
    ).includes(reference.assetId)
  )
    throw assetNotFound();
  const asset = await context.assets.find(reference.assetId);
  if (!asset || asset.state !== "ready") throw assetNotFound();
  return asset;
}

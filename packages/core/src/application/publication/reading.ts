import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { publicNotePath } from "@repo/core/domain/publication/entity";
import { renderAuthorizedHtml } from "../asset/references";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";

export type PublicSelector = Readonly<{
  publicId: string;
  urlGeneration: number;
}>;
export const publicNotFound = () =>
  new NotFoundError("PUBLIC_NOT_FOUND", "このページは利用できません。");

export async function currentPublicNote(
  u: HollowUnitOfWorkContext,
  selector: PublicSelector,
) {
  const identity = await u.publicNotes.resolve(
    selector.publicId,
    selector.urlGeneration,
  );
  if (!identity) throw publicNotFound();
  const note = await u.notes.findById(identity.noteId);
  const settings = await u.sharing.find(identity.noteId);
  if (
    !note ||
    settings?.visibility !== "public" ||
    !(await u.sharing.scope(identity.noteId))
  )
    throw publicNotFound();
  if (note.lifecycle.kind === "trashed")
    throw new NotFoundError("PUBLIC_TRASHED", "このページは利用できません。");
  if (note.lifecycle.kind !== "active") throw publicNotFound();
  return { identity, note, settings };
}
async function snapshot(c: HollowContainer, selector: PublicSelector) {
  return c.unitOfWorkProvider.run(async (u) => {
    const { identity, note, settings } = await currentPublicNote(u, selector);
    const path = publicNotePath(identity);
    const accepted: string[] = [];
    const rewrite = new Map<string, string>();
    let image: string | null = null;
    for (const url of c.htmlSanitizer.assetUrls(note.html)) {
      const ref = parseAssetUrl(url);
      if (!ref || ref.scope !== "notes" || ref.scopeId !== note.id) continue;
      const asset = await u.assets.find(ref.assetId);
      if (
        !asset ||
        asset.state !== "ready" ||
        !(await u.assets.isReferenced(note.id, asset.id))
      )
        continue;
      accepted.push(url);
      rewrite.set(url, `${path}/assets/${asset.id}`);
      if (
        image === null &&
        ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          asset.mime,
        )
      )
        image = `${path}/assets/${asset.id}`;
    }
    for (const entry of await u.references.entries(note.id))
      if (
        entry.current &&
        entry.state === "acquired" &&
        entry.finalUrl?.startsWith("data:") &&
        note.html.includes(entry.finalUrl)
      )
        accepted.push(entry.finalUrl);
    const creatorId =
      note.creator?.kind === "account" ? note.creator.accountId : null;
    const author = await u.displayNames.author(creatorId);
    const creator = creatorId ? await u.publicProfiles.find(creatorId) : null;
    let owner: Readonly<{ label: string; url: string }> | null = null;
    if (note.owner.kind === "personal") {
      const profile = await u.publicProfiles.find(note.owner.accountId);
      if (profile?.handle) {
        const name = await u.displayNames.find(note.owner.accountId);
        owner = {
          label: name.displayName ?? "表示名未設定",
          url: `/@${profile.handle}`,
        };
      }
    } else {
      const publication = await u.workspacePublications.find(
        note.owner.workspaceId,
      );
      if (publication.pagePublic) {
        const w = await u.workspaces.find(note.owner.workspaceId);
        if (w?.state === "active" && w.slug)
          owner = { label: w.name, url: `/w/${w.slug}` };
      }
    }
    const data = {
      publicId: identity.publicId,
      urlGeneration: identity.urlGeneration,
      path,
      title: note.title,
      html: note.html,
      display: note.display,
      updatedAt: note.updatedAt.toISOString(),
      author,
      authorUrl: creator?.handle ? `/@${creator.handle}` : null,
      owner,
      tags: await u.browseIndex.tagsForNote(note.id, note.owner),
      description: Array.from(c.htmlSanitizer.sanitize(note.html).text.trim())
        .slice(0, 160)
        .join(""),
      image,
    };
    return {
      data,
      accepted,
      rewrite,
      stamp: JSON.stringify({
        data,
        noteVersion: note.version,
        owner: note.owner,
        shareVersion: settings.version,
        accessEpoch: identity.accessEpoch,
        accepted,
      }),
    };
  });
}
export async function readPublicNote(
  c: HollowContainer,
  selector: PublicSelector,
  signal?: AbortSignal,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const initial = await snapshot(c, selector);
    const rendered = await renderAuthorizedHtml(
      c,
      initial.data.html,
      new Set(initial.accepted),
      true,
      signal,
    );
    const latest = await snapshot(c, selector);
    if (latest.stamp !== initial.stamp) continue;
    return {
      ...initial.data,
      html: c.htmlSanitizer.rewriteAssets(rendered.html, initial.rewrite),
      links: rendered.links,
      removed: rendered.removed,
      externalSources: rendered.externalSources,
      assetUrls: rendered.assetUrls.map(
        (url) => initial.rewrite.get(url) ?? url,
      ),
    };
  }
  throw new SystemError(
    SystemErrorCode.ShareSnapshotChanged,
    "公開内容が更新されました。再読み込みしてください。",
  );
}
export async function getPublicAsset(
  c: HollowContainer,
  selector: PublicSelector,
  assetId: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const { note } = await currentPublicNote(u, selector);
    const asset = await u.assets.find(assetId);
    if (
      !asset ||
      asset.state !== "ready" ||
      !(await u.assets.isReferenced(note.id, assetId))
    )
      throw publicNotFound();
    return asset;
  });
}

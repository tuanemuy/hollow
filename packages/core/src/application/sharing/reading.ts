import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { SHARE_GRANT_MS } from "@repo/core/domain/sharing/entity";
import { renderAuthorizedHtml } from "../asset/references";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { referenceReaderEntries } from "../reference/view";
import { canScope } from "../workspace/access";
import { shareServices } from "./settings";

export function shareNotFound(): never {
  throw new NotFoundError("SHARE_NOT_FOUND", "このリンクは利用できません。");
}
async function current(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  token: string,
) {
  const settings = await u.sharing.findByTokenHash(c.tokens.hash(token));
  if (!settings || settings.visibility === "private") return shareNotFound();
  const note = await u.notes.findById(settings.noteId);
  const scope = await u.sharing.scope(settings.noteId);
  if (!note || note.lifecycle.kind !== "active" || !scope)
    return shareNotFound();
  return { settings, note, scope };
}
async function permitted(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  token: string,
  browser: string | null,
) {
  const snapshot = await current(c, u, token);
  if (!snapshot.settings.passwordHash) return { ...snapshot, allowed: true };
  const grant = browser
    ? await u.sharing.findGrant(snapshot.note.id, c.tokens.hash(browser))
    : null;
  return {
    ...snapshot,
    allowed: Boolean(
      grant &&
        grant.linkGeneration === snapshot.settings.linkGeneration &&
        grant.grantEpoch === snapshot.settings.grantEpoch &&
        grant.expiresAt > c.clock.now(),
    ),
  };
}
export async function checkShareAvailable(c: HollowContainer, token: string) {
  await c.unitOfWorkProvider.run(async (u) => {
    await current(c, u, token);
  });
}
export async function unlockShare(
  c: HollowContainer,
  token: string,
  browser: string,
  password: string,
) {
  const prepared = await c.unitOfWorkProvider.run(async (u) => {
    const snapshot = await current(c, u, token);
    if (!snapshot.settings.passwordHash) return { kind: "open" as const };
    await u.sharing.prune(c.clock.now());
    const admission = await u.sharing.reservePassword(
      snapshot.note.id,
      c.tokens.hash(browser),
      c.clock.now(),
    );
    return admission.kind === "blocked"
      ? admission
      : {
          kind: "verify" as const,
          settings: snapshot.settings,
          reservation: admission.reservation,
          passwordHash: snapshot.settings.passwordHash,
        };
  });
  if (prepared.kind === "open") return { kind: "accepted" as const };
  if (prepared.kind === "blocked")
    return {
      kind: "blocked" as const,
      retryAt: prepared.retryAt.toISOString(),
    };
  const valid = await shareServices(c).passwordWork.run(() =>
    c.passwordHasher.verify(password, prepared.passwordHash),
  );
  return c.unitOfWorkProvider.run(async (u) => {
    const snapshot = await current(c, u, token);
    if (
      snapshot.settings.linkGeneration !== prepared.settings.linkGeneration ||
      snapshot.settings.grantEpoch !== prepared.settings.grantEpoch ||
      snapshot.settings.passwordHash !== prepared.passwordHash
    )
      return shareNotFound();
    const now = c.clock.now();
    await u.sharing.finishPassword(prepared.reservation, valid, now);
    if (!valid) return { kind: "incorrect" as const };
    await u.sharing.saveGrant({
      noteId: snapshot.note.id,
      browserHash: c.tokens.hash(browser),
      linkGeneration: snapshot.settings.linkGeneration,
      grantEpoch: snapshot.settings.grantEpoch,
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + SHARE_GRANT_MS),
    });
    return { kind: "accepted" as const };
  });
}
async function snapshot(
  c: HollowContainer,
  token: string,
  browser: string | null,
  session: string | null,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const permission = await permitted(c, u, token, browser);
    if (!permission.allowed) return { kind: "gate" as const };
    const { note, settings, scope } = permission;
    const accepted: string[] = [];
    const rewrite = new Map<string, string>();
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
      rewrite.set(url, `/s/${token}/assets/${asset.id}`);
    }
    const entries = await u.references.entries(note.id);
    for (const entry of entries)
      if (
        entry.current &&
        entry.state === "acquired" &&
        entry.finalUrl?.startsWith("data:") &&
        note.html.includes(entry.finalUrl)
      )
        accepted.push(entry.finalUrl);
    const auth = session
      ? await u.accounts.findSession(c.tokens.hash(session))
      : null;
    const actor =
      auth && auth.expiresAt > c.clock.now()
        ? await u.accounts.findById(auth.accountId)
        : null;
    const canEdit =
      actor?.status === "verified" &&
      (await canScope(u, note.owner, actor.id, "edit"));
    const data = {
      noteId: note.id,
      title: note.title,
      references: referenceReaderEntries(entries),
      html: note.html,
      display: note.display,
      updatedAt: note.updatedAt.toISOString(),
      author: await u.displayNames.author(
        note.creator?.kind === "account" ? note.creator.accountId : null,
      ),
      tags: await u.browseIndex.tagsForNote(note.id, note.owner),
      canEdit,
      actorId: canEdit ? actor?.id : null,
    };
    return {
      kind: "content" as const,
      data,
      accepted,
      rewrite,
      stamp: JSON.stringify({
        data,
        noteVersion: note.version,
        scope,
        shareVersion: settings.version,
        accepted,
      }),
    };
  });
}
export async function readSharedNote(
  c: HollowContainer,
  token: string,
  browser: string | null,
  session: string | null = null,
  externalReading = true,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const initial = await snapshot(c, token, browser, session);
    if (initial.kind === "gate") return { kind: "gate" as const };
    const rendered = await renderAuthorizedHtml(
      c,
      initial.data.html,
      new Set(initial.accepted),
      externalReading,
    );
    const latest = await snapshot(c, token, browser, session);
    if (latest.kind === "gate") return shareNotFound();
    if (latest.stamp !== initial.stamp) continue;
    return {
      kind: "content" as const,
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
    "共有内容が更新されました。再読み込みしてください。",
  );
}
export async function getSharedAsset(
  c: HollowContainer,
  token: string,
  browser: string | null,
  assetId: string,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const access = await permitted(c, u, token, browser);
    if (!access.allowed) return shareNotFound();
    const asset = await u.assets.find(assetId);
    if (
      !asset ||
      asset.state !== "ready" ||
      !(await u.assets.isReferenced(access.note.id, assetId))
    )
      return shareNotFound();
    return asset;
  });
}

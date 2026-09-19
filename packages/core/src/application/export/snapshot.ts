import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { Note } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ExternalRenderSources } from "../ports/htmlSanitizer";
import { canScope } from "../workspace/access";
import { EXPORT_DOCUMENT_PROFILE, type ExportMediaSlot } from "./document";
import type { ExportAuthority } from "./ports";
import type { ExportSource } from "./source";

export type ExportAccess =
  | Readonly<{ kind: "account"; noteId: string; session: string | null }>
  | Readonly<{ kind: "link"; token: string; browser: string }>;
export const exportNotFound = (): never => {
  throw new NotFoundError("EXPORT_NOT_FOUND", "この書き出しは利用できません。");
};
export type ExportSnapshot = Readonly<{
  note: Note;
  authority: ExportAuthority;
  media: readonly ExportMediaSlot[];
  sources: readonly ExportSource[];
  identity: string;
}>;

export async function readExportSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  access: ExportAccess,
): Promise<ExportSnapshot> {
  let note: Note;
  let authority: ExportAuthority;
  if (access.kind === "account") {
    const sessionHash = access.session ? c.tokens.hash(access.session) : "";
    const session = sessionHash
      ? await u.accounts.findSession(sessionHash)
      : null;
    const actor =
      session && session.expiresAt > c.clock.now()
        ? await u.accounts.findById(session.accountId)
        : null;
    const found =
      actor?.status === "verified"
        ? await u.notes.findById(access.noteId)
        : null;
    if (
      !found ||
      found.lifecycle.kind !== "active" ||
      !actor ||
      !(await canScope(u, found.owner, actor.id, "read"))
    )
      return exportNotFound();
    note = found;
    authority = { kind: "account", accountId: actor.id, sessionHash };
  } else {
    const tokenHash = c.tokens.hash(access.token);
    const browserHash = c.tokens.hash(access.browser);
    const sharing = await u.sharing.findByTokenHash(tokenHash);
    if (
      !sharing ||
      sharing.visibility !== "link" ||
      !(await u.sharing.scope(sharing.noteId))
    )
      return exportNotFound();
    const found = await u.notes.findById(sharing.noteId);
    if (!found || found.lifecycle.kind !== "active") return exportNotFound();
    if (sharing.passwordHash) {
      const grant = await u.sharing.findGrant(found.id, browserHash);
      if (
        !grant ||
        grant.expiresAt <= c.clock.now() ||
        grant.linkGeneration !== sharing.linkGeneration ||
        grant.grantEpoch !== sharing.grantEpoch
      )
        return exportNotFound();
    }
    note = found;
    authority = {
      kind: "link",
      tokenHash,
      browserHash,
      linkGeneration: sharing.linkGeneration,
      grantEpoch: sharing.grantEpoch,
    };
  }
  if (!note.html.trim())
    throw new BusinessRuleError(
      "EXPORT_EMPTY",
      "本文が空のためダウンロードできません。変換または本文の保存を完了してからやり直してください。",
    );
  const sources: ExportSource[] = [];
  const media: ExportMediaSlot[] = [];
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
    const slot = { id: asset.id, url, mime: asset.mime, bytes: asset.bytes };
    media.push(slot);
    sources.push({
      ...slot,
      kind: "object",
      key: asset.storageKey,
      sha256: asset.sha256,
    });
  }
  const identity = c.tokens.hash(
    JSON.stringify({
      profile: EXPORT_DOCUMENT_PROFILE,
      title: note.title,
      html: note.html,
      style: note.display.style,
      media,
      sources,
    }),
  );
  return { note, authority, media, sources, identity };
}

export async function inspectExportSources(
  c: HollowContainer,
  snapshot: ExportSnapshot,
  signal: AbortSignal,
) {
  const prepared = c.referencing?.processor.prepare(snapshot.note.html);
  const external: {
    images: string[];
    media: string[];
    backgrounds: string[];
    fonts: string[];
  } = { images: [], media: [], backgrounds: [], fonts: [] };
  const media = [...snapshot.media];
  const sources = [...snapshot.sources];
  if (prepared && c.referencing) {
    const candidates = prepared.candidates;
    const remote = candidates
      .filter(
        (candidate) =>
          /^https?:\/\//i.test(candidate.url) &&
          new URL(candidate.url).hostname !== new URL(c.appUrl).hostname,
      )
      .slice(0, 200);
    const inspections = new Map(
      (
        await c.referencing.fetcher.inspectMany(
          remote.map((v) => v.url),
          { signal },
        )
      ).map((value) => [value.url, value.allowed]),
    );
    for (const candidate of remote) {
      if (!inspections.get(candidate.url) || candidate.kind === "stylesheet")
        continue;
      const bucket =
        candidate.kind === "image"
          ? external.images
          : candidate.kind === "video"
            ? external.media
            : candidate.kind === "background"
              ? external.backgrounds
              : external.fonts;
      if (!bucket.includes(candidate.url)) bucket.push(candidate.url);
    }
    const seen = new Set<string>();
    for (const candidate of candidates
      .filter((value) => value.url.startsWith("data:"))
      .slice(0, 200)) {
      const uri = candidate.url;
      if (
        !uri.startsWith("data:") ||
        seen.has(uri) ||
        uri.length > 45000 ||
        !c.inlineMedia
      )
        continue;
      seen.add(uri);
      const decoded = c.referencing.processor.decodeDataUri(uri);
      if (decoded.bytes.byteLength > 32768 || decoded.bytes.byteLength < 1)
        continue;
      const inspected = await c.inlineMedia.inspect({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(decoded.bytes);
            controller.close();
          },
        }),
        bytes: decoded.bytes.byteLength,
        signal,
      });
      if (inspected.kind !== "image") continue;
      const data = inspected.sanitizedSvg ?? decoded.bytes;
      const slot = {
        id: `inline-${media.length}`,
        url: uri,
        mime: inspected.mime,
        bytes: data.byteLength,
      };
      media.push(slot);
      sources.push({ ...slot, kind: "inline", data });
    }
  }
  return { media, sources, external: external satisfies ExternalRenderSources };
}

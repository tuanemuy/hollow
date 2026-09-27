import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { Note } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ExternalRenderSources } from "../ports/htmlSanitizer";
import { currentPublicNote, type PublicSelector } from "../publication/reading";
import { canScope } from "../workspace/access";
import { EXPORT_DOCUMENT_PROFILE, type ExportMediaSlot } from "./document";
import type { ExportAuthority } from "./ports";
import type { ExportSource } from "./source";

export type ExportAccess =
  | Readonly<{ kind: "account"; noteId: string; session: string | null }>
  | Readonly<{
      kind: "public";
      publicId: string;
      urlGeneration: number;
      browser: string;
    }>
  | Readonly<{ kind: "link"; token: string; browser: string }>;
export const exportNotFound = (): never => {
  throw new NotFoundError("EXPORT_NOT_FOUND", "この書き出しは利用できません。");
};
export type ExportContentSnapshot = Readonly<{
  note: Note;
  media: readonly ExportMediaSlot[];
  sources: readonly ExportSource[];
  identity: string;
}>;
export type ExportSnapshot = ExportContentSnapshot &
  Readonly<{ authority: ExportAuthority }>;

export async function publicExportPage(
  c: HollowContainer,
  selector: PublicSelector,
) {
  const snapshot = () =>
    c.unitOfWorkProvider.run(async (u) => {
      const { identity, note, settings } = await currentPublicNote(u, selector);
      return {
        title: note.title,
        hasBody: Boolean(note.html.trim()),
        path: `/p/${identity.publicId}/${identity.urlGeneration}`,
        noteVersion: note.version,
        owner: note.owner,
        sharingVersion: settings.version,
        accessEpoch: identity.accessEpoch,
      };
    });
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await snapshot();
    const after = await snapshot();
    if (JSON.stringify(before) === JSON.stringify(after))
      return { title: after.title, hasBody: after.hasBody, path: after.path };
  }
  return exportNotFound();
}

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
  } else if (access.kind === "public") {
    const identity = await u.publicNotes.resolve(
      access.publicId,
      access.urlGeneration,
    );
    if (!identity) return exportNotFound();
    const found = await u.notes.findById(identity.noteId);
    const settings = await u.sharing.find(identity.noteId);
    if (
      !found ||
      found.lifecycle.kind !== "active" ||
      settings?.visibility !== "public" ||
      !(await u.sharing.scope(identity.noteId))
    )
      return exportNotFound();
    note = found;
    authority = {
      kind: "public",
      publicId: identity.publicId,
      urlGeneration: identity.urlGeneration,
      accessEpoch: identity.accessEpoch,
      browserHash: c.tokens.hash(access.browser),
    };
  } else {
    const tokenHash = c.tokens.hash(access.token);
    const browserHash = c.tokens.hash(access.browser);
    const sharing = await u.sharing.findByTokenHash(tokenHash);
    if (
      !sharing ||
      sharing.visibility === "private" ||
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
  return { ...(await buildExportContentSnapshot(c, u, note)), authority };
}

export async function buildExportContentSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  note: Note,
): Promise<ExportContentSnapshot> {
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
  return { note, media, sources, identity };
}

export async function inspectExportSources(
  c: Pick<HollowContainer, "appUrl" | "referencing" | "inlineMedia">,
  snapshot: ExportContentSnapshot,
  signal: AbortSignal,
  inspectionPolicy: "best-effort" | "require-determinate" = "best-effort",
) {
  if (inspectionPolicy === "require-determinate") signal.throwIfAborted();
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
    const results = await c.referencing.fetcher
      .inspectMany(
        remote.map((v) => v.url),
        { signal },
      )
      .catch((error: unknown) => {
        if (inspectionPolicy === "require-determinate") signal.throwIfAborted();
        throw error;
      });
    if (inspectionPolicy === "require-determinate") {
      signal.throwIfAborted();
      if (
        results.some(
          (value) =>
            !value.allowed &&
            value.reason !== "REFERENCE_URL" &&
            value.reason !== "REFERENCE_PRIVATE",
        )
      )
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          "外部参照の安全性を確認できませんでした。時間を置いて再確認してください。",
        );
    }
    const inspections = new Map(
      results.map((value) => [value.url, value.allowed]),
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

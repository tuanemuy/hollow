import { assetUrl, parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { assertHtmlSize } from "@repo/core/domain/note/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ExternalRenderSources } from "../ports/htmlSanitizer";
import { requireNote } from "../workspace/access";
import { authorizedAsset, canReadDraftAsset, requireDraft } from "./access";

export async function saveAssetReferences(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  accountId: string,
  html: string,
  noteId: string,
  draftId?: string,
) {
  const now = container.clock.now();
  if (draftId) {
    const draft = await requireDraft(context, draftId, accountId, now);
    if (draft.noteId && draft.noteId !== noteId)
      throw new BusinessRuleError(
        "MEDIA_DRAFT_SCOPE",
        "このメディア下書きは別のノートに属しています。",
      );
  }
  const urls = new Map<string, string>();
  const ids: string[] = [];
  for (const url of container.htmlSanitizer.assetUrls(html)) {
    const ref = parseAssetUrl(url);
    if (
      !ref ||
      (ref.scope === "notes" ? ref.scopeId !== noteId : ref.scopeId !== draftId)
    )
      throw new BusinessRuleError(
        "MEDIA_REFERENCE",
        "別のノートや下書きのメディアは参照できません。挿入し直してください。",
      );
    await authorizedAsset(context, accountId, ref, now, "save");
    urls.set(
      url,
      assetUrl({ scope: "notes", scopeId: noteId, assetId: ref.assetId }),
    );
    ids.push(ref.assetId);
  }
  return { html: container.htmlSanitizer.rewriteAssets(html, urls), ids };
}
export async function renderNote(
  container: HollowContainer,
  token: string | null,
  input: {
    html: string;
    noteId?: string;
    draftId?: string;
    externalReading?: boolean;
  },
) {
  assertHtmlSize(input.html);
  const sourceNotices = container.htmlSanitizer.sanitize(input.html).removed;
  const document = container.referencing?.processor.prepare(input.html);
  const safe = container.htmlSanitizer.sanitize(document?.html ?? input.html);
  const permission = await container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    const now = container.clock.now();
    if (input.noteId)
      await requireNote(
        context,
        await context.notes.findById(input.noteId),
        account.id,
      );
    const draft = input.draftId
      ? await requireDraft(context, input.draftId, account.id, now)
      : null;
    if (draft) {
      if (draft.noteId && draft.noteId !== input.noteId)
        throw new BusinessRuleError(
          "MEDIA_DRAFT_SCOPE",
          "下書きのノートが一致しません。",
        );
    }
    const accepted = new Set<string>();
    for (const url of container.htmlSanitizer.assetUrls(safe.html)) {
      const ref = parseAssetUrl(url);
      if (
        !ref ||
        (ref.scope === "notes"
          ? ref.scopeId !== input.noteId
          : ref.scopeId !== input.draftId)
      )
        continue;
      const asset = await context.assets.find(ref.assetId);
      if (!asset || asset.state !== "ready") continue;
      if (
        ref.scope === "drafts"
          ? draft && (await canReadDraftAsset(context, asset, draft))
          : await context.assets.isReferenced(ref.scopeId, asset.id)
      )
        accepted.add(url);
    }
    const entries = input.noteId
      ? await context.references.entries(input.noteId)
      : [];
    for (const entry of entries)
      if (
        entry.current &&
        entry.state === "acquired" &&
        entry.finalUrl?.startsWith("data:") &&
        safe.html.includes(entry.finalUrl)
      )
        accepted.add(entry.finalUrl);
    return { accepted };
  });
  const rendered = await renderAuthorizedHtml(
    container,
    safe.html,
    permission.accepted,
    input.externalReading,
  );
  return {
    ...rendered,
    canonical: safe.html,
    removed: [
      ...new Set([
        ...sourceNotices,
        ...(document?.notices.map((notice) => notice.message) ?? []),
        ...safe.removed,
        ...rendered.removed,
      ]),
    ],
  };
}
export async function renderAuthorizedHtml(
  container: HollowContainer,
  html: string,
  accepted: ReadonlySet<string>,
  externalReading?: boolean,
  signal?: AbortSignal,
) {
  const document = container.referencing?.processor.prepare(html);
  const safe = container.htmlSanitizer.sanitize(document?.html ?? html);
  const external: {
    images: string[];
    media: string[];
    backgrounds: string[];
    fonts: string[];
  } = { images: [], media: [], backgrounds: [], fonts: [] };
  if (container.referencing && document && externalReading !== false) {
    const seen = new Set<string>();
    const candidates = document.candidates
      .slice(0, 200)
      .filter(
        (c) =>
          /^https?:\/\//i.test(c.url) &&
          new URL(c.url).hostname !== new URL(container.appUrl).hostname,
      );
    const inspections = await container.referencing.fetcher.inspectMany(
      candidates.map((c) => c.url),
      { signal },
    );
    const approved = new Map(inspections.map((i) => [i.url, i]));
    for (const candidate of candidates) {
      if (
        candidate.kind === "stylesheet" ||
        !/^https?:\/\//i.test(candidate.url) ||
        seen.has(`${candidate.kind}\0${candidate.url}`)
      )
        continue;
      seen.add(`${candidate.kind}\0${candidate.url}`);
      const checked = approved.get(candidate.url);
      if (!checked?.allowed) continue;
      const bucket =
        candidate.kind === "image"
          ? external.images
          : candidate.kind === "video"
            ? external.media
            : candidate.kind === "background"
              ? external.backgrounds
              : external.fonts;
      bucket.push(checked.url);
    }
  }
  const rendered = container.htmlSanitizer.render(
    safe.html,
    accepted,
    external satisfies ExternalRenderSources,
  );
  return {
    ...rendered,
    removed: [
      ...new Set([
        ...safe.removed,
        ...rendered.removed,
        ...(externalReading === false &&
        document?.candidates.some((c) => /^https?:\/\//i.test(c.url))
          ? [
              "この閲覧環境ではリクエスト用途を確認できないため、外部参照の直接表示を停止しました。本文と内部メディアは表示できます。",
            ]
          : []),
      ]),
    ],
  };
}

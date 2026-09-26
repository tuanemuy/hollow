import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { Note } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope } from "../workspace/access";
import { PDF_DOCUMENT_PROFILE, type PdfMediaSlot } from "./document";
import type { PdfSource } from "./ports";

export const pdfNotFound = (): never => {
  throw new NotFoundError("PDF_NOT_FOUND", "このPDFは利用できません。");
};
export function pdfContext(c: HollowContainer) {
  if (!c.pdf || !c.importing?.storage)
    throw new BusinessRuleError(
      "PDF_NOT_CONFIGURED",
      "この環境ではPDF生成が構成されていません。HTMLまたはMarkdownでダウンロードできます。",
    );
  return c.pdf;
}
export type PdfSnapshot = Readonly<{
  note: Note;
  identity: string;
  media: readonly PdfMediaSlot[];
  sources: readonly PdfSource[];
}>;

export async function readPdfSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  accountId: string,
  noteId: string,
): Promise<PdfSnapshot> {
  const actor = await u.accounts.findById(accountId);
  const note = await u.notes.findById(noteId);
  if (
    !actor ||
    actor.status !== "verified" ||
    !note ||
    note.lifecycle.kind !== "active"
  )
    return pdfNotFound();
  const scoped = await canScope(u, note.owner, accountId, "read");
  const sharing = scoped ? null : await u.sharing.find(note.id);
  if (
    !scoped &&
    (sharing?.visibility !== "public" || !(await u.sharing.scope(note.id)))
  )
    return pdfNotFound();
  return buildPdfSnapshot(c, u, note);
}

export async function buildPdfSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  note: Note,
): Promise<PdfSnapshot> {
  if (!note.html.trim())
    throw new BusinessRuleError(
      "PDF_EMPTY",
      "本文が空のためPDFを生成できません。変換または本文の保存を完了してください。",
    );
  const pdf = pdfContext(c);
  const media: PdfMediaSlot[] = [];
  const sources: PdfSource[] = [];
  for (const url of new Set(c.htmlSanitizer.assetUrls(note.html))) {
    const ref = parseAssetUrl(url);
    if (!ref || ref.scope !== "notes" || ref.scopeId !== note.id) continue;
    const asset = await u.assets.find(ref.assetId);
    if (
      !asset ||
      asset.state !== "ready" ||
      !(await u.assets.isReferenced(note.id, asset.id))
    )
      continue;
    const slot = {
      id: `asset-${media.length}`,
      url,
      mime: asset.mime,
      bytes: asset.bytes,
    };
    media.push(slot);
    sources.push({
      id: slot.id,
      kind: "stored",
      mime: slot.mime,
      bytes: slot.bytes,
      key: asset.storageKey,
      sha256: asset.sha256,
    });
  }
  const identity = c.tokens.hash(
    JSON.stringify({
      profile: PDF_DOCUMENT_PROFILE,
      runtime: pdf.supervisor.profile,
      title: note.title,
      html: note.html,
      style: note.display.style,
      defaultCss: pdf.defaultCss,
      media,
      sources,
    }),
  );
  return { note, identity, media, sources };
}

export async function preparePdfSources(
  c: HollowContainer,
  snapshot: PdfSnapshot,
  signal: AbortSignal,
) {
  const media = [...snapshot.media];
  const sources = [...snapshot.sources];
  if (c.referencing && c.inlineMedia) {
    const seen = new Set<string>();
    for (const candidate of c.referencing.processor.prepare(snapshot.note.html)
      .candidates) {
      signal.throwIfAborted();
      const uri = candidate.url;
      if (!uri.startsWith("data:") || seen.has(uri)) continue;
      seen.add(uri);
      if (uri.length > 45000) continue;
      const decoded = c.referencing.processor.decodeDataUri(uri);
      if (decoded.bytes.byteLength < 1 || decoded.bytes.byteLength > 32768)
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
      sources.push({
        id: slot.id,
        kind: "inline",
        mime: slot.mime,
        bytes: slot.bytes,
        data,
      });
    }
  }
  return { media, sources };
}

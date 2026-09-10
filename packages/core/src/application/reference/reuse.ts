import { assetUrl, MEDIA_LIMITS } from "@repo/core/domain/asset/entity";
import type { Note } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
export async function reuseReferences(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  note: Note,
  html: string,
) {
  const processor = container.referencing?.processor;
  if (!processor) return { html, notices: [] };
  const entries = await context.references.entries(note.id);
  const replacements = new Map<string, string>();
  for (const entry of entries) {
    if (entry.state !== "acquired") continue;
    if (entry.assetId) {
      const asset = await context.assets.find(entry.assetId);
      if (
        !asset ||
        asset.state !== "ready" ||
        asset.sourceNoteId !== note.id ||
        (asset.unreferencedAt &&
          asset.unreferencedAt.getTime() + MEDIA_LIMITS.unreferencedMs <=
            container.clock.now().getTime())
      )
        continue;
      replacements.set(
        entry.url,
        assetUrl({ scope: "notes", scopeId: note.id, assetId: asset.id }),
      );
    } else if (entry.finalUrl?.startsWith("data:"))
      replacements.set(entry.url, entry.finalUrl);
  }
  const incoming = processor.styles(html);
  const styles = processor
    .styles(note.html)
    .filter(
      (style) =>
        (style.materialized || Boolean(style.css.trim())) &&
        entries.some(
          (entry) =>
            entry.state === "acquired" &&
            entry.kind === "stylesheet" &&
            entry.url === style.url,
        ) &&
        incoming.some(
          (candidate) => candidate.url === style.url && !candidate.css.trim(),
        ),
    );
  return processor.rewrite(html, replacements, styles);
}

import { createHash } from "node:crypto";
import type { LlmSourceIdentity } from "@repo/core/domain/llm/entity";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  type PdfPageIdentity,
  type PdfPageManifest,
  pdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";

export function pdfPagesIdentity(
  source: LlmSourceIdentity<"pdf">,
  pages: readonly PdfPageIdentity[],
): PdfPageManifest {
  const sha256 = createHash("sha256")
    .update(
      JSON.stringify([
        "pdf-pages-v4",
        source.kind,
        source.originalId,
        source.sha256,
        source.bytes,
        source.format,
        PDF_PAGE_POLICY,
        PDF_PAGE_RENDERER,
        pages.length,
        pages.map((p) => [p.ordinal, p.width, p.height, p.bytes, p.sha256]),
      ]),
    )
    .digest("hex");
  return pdfPageManifest({
    kind: "pdf-pages",
    preparationVersion: 4,
    source,
    policy: PDF_PAGE_POLICY,
    renderer: PDF_PAGE_RENDERER,
    total: pages.length,
    pages,
    sha256,
  });
}

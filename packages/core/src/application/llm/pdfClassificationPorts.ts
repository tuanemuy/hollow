import type { LlmSourceIdentity } from "@repo/core/domain/llm/entity";
import type {
  PdfChoice,
  PdfPageIdentity,
  PdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import type { LlmImageRaster } from "./ports";

export type PdfClassificationInput = Readonly<{
  source: LlmSourceIdentity<"pdf">;
  bytes: Uint8Array;
}>;

/** Resolves only after the owned classifier, children and pipes have closed. */
export interface LlmPdfClassifier {
  classify(
    input: PdfClassificationInput,
    signal: AbortSignal,
  ): Promise<PdfChoice>;
}

export interface LlmPdfPagesPreparer {
  prepare(
    input: PdfClassificationInput,
    signal: AbortSignal,
  ): Promise<PdfPageManifest>;
  redraw(
    input: PdfClassificationInput &
      Readonly<{
        manifest: PdfPageManifest;
        page: PdfPageIdentity;
      }>,
    signal: AbortSignal,
  ): Promise<LlmImageRaster>;
}

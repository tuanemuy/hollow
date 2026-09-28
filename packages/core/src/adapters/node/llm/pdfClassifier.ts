import type {
  LlmPdfClassifier,
  LlmPdfPagesPreparer,
  PdfClassificationInput,
} from "@repo/core/application/llm/pdfClassificationPorts";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import type { PdfChoice } from "@repo/core/domain/llm/pdfPreview";
import type { NodeLlmDocumentPreparer } from "./documentPreparer";

export class NodeLlmPdfClassifier implements LlmPdfClassifier {
  constructor(
    private readonly text: NodeLlmDocumentPreparer,
    private readonly pages: LlmPdfPagesPreparer,
  ) {}
  async classify(
    input: PdfClassificationInput,
    signal: AbortSignal,
  ): Promise<PdfChoice> {
    let reason: "VISUAL_CONTENT" | "ORDER_UNPROVEN";
    try {
      const result = await this.text.prepare(
        { ...input, preparationVersion: 2, promptVersion: 1 },
        signal,
      );
      if (result.coverage.kind !== "pdf-text")
        throw new LlmOperationError("LLM_SOURCE_INVALID", "not-sent", true);
      return {
        kind: "strict-text",
        preparationVersion: 2,
        promptVersion: 1,
        modelKind: "chat-text",
        preparedDocumentHash: result.identity.sha256,
        pages: result.coverage.pages.length,
        policy: "strict-text-v1",
      };
    } catch (error) {
      if (
        !(error instanceof LlmOperationError) ||
        !error.closed ||
        (error.code !== "LLM_PDF_VISUAL_REQUIRED" &&
          error.code !== "LLM_PDF_ORDER_UNPROVEN")
      )
        throw error;
      reason =
        error.code === "LLM_PDF_VISUAL_REQUIRED"
          ? "VISUAL_CONTENT"
          : "ORDER_UNPROVEN";
    }
    const manifest = await this.pages.prepare(input, signal);
    return {
      kind: "pages",
      preparationVersion: 4,
      promptVersion: 3,
      modelKind: "chat-image",
      manifest,
      reason,
    };
  }
}

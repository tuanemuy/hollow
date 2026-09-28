import { fileURLToPath } from "node:url";
import { NodeLlmDocumentPreparer } from "../../node/llm/documentPreparer";
import { NodeLlmPdfClassifier } from "../../node/llm/pdfClassifier";
import { NodeLlmPdfPagesPreparer } from "../../node/llm/pdfPagesPreparer";

export function pdfFixtureServices() {
  const pdfPages = new NodeLlmPdfPagesPreparer(
    fileURLToPath(new URL("../../node/llm/pdfPagesChild.mjs", import.meta.url)),
  );
  return {
    pdfPages,
    pdfClassifier: new NodeLlmPdfClassifier(
      new NodeLlmDocumentPreparer(
        new URL("../../node/llm/documentWorker.mjs", import.meta.url),
      ),
      pdfPages,
    ),
  };
}

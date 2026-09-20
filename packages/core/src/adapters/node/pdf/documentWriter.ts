import { Worker } from "node:worker_threads";
import {
  PDF_DOCUMENT_PROFILE,
  type PdfDocumentInput,
  type PdfDocumentPlan,
  type PdfDocumentWriter,
} from "@repo/core/application/pdf/document";
import { BusinessRuleError } from "@repo/core/domain/error";
import { z } from "zod";
import { exportFilename } from "../exportDocument/filename";

const failed = (code = "PDF_DOCUMENT_FAILED") =>
  new BusinessRuleError(
    code,
    "文書を安全にPDFへ準備できませんでした。生成サービスの負荷や設定を確認してからやり直してください。",
  );
const plan = z.strictObject({
  profile: z.literal(PDF_DOCUMENT_PROFILE),
  filename: z.string(),
  segments: z.array(
    z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("text"), value: z.string() }),
      z.strictObject({ kind: z.literal("media"), id: z.string() }),
    ]),
  ),
  mediaIds: z.array(z.string()),
  notices: z.array(z.string()),
});
export class IsolatedPdfDocumentWriter implements PdfDocumentWriter {
  constructor(private readonly workerPath: string | URL) {}
  async plan(
    input: PdfDocumentInput,
    signal: AbortSignal,
  ): Promise<PdfDocumentPlan> {
    if (signal.aborted) throw failed("PDF_CANCELLED");
    const inputBytes = Buffer.byteLength(JSON.stringify(input));
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath, {
        workerData: input,
        resourceLimits: {
          maxOldGenerationSizeMb: 128,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
        stdout: true,
        stderr: true,
      });
    } catch {
      throw failed();
    }
    worker.stdout.resume();
    worker.stderr.resume();
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error: Error | null, value?: PdfDocumentPlan) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        void worker.terminate().then(
          () => {
            if (signal.aborted) reject(failed("PDF_CANCELLED"));
            else if (error) reject(error);
            else if (value) resolve(value);
            else reject(failed());
          },
          () => reject(failed()),
        );
      };
      const abort = () => finish(failed("PDF_CANCELLED"));
      const timer = setTimeout(() => finish(failed("PDF_DEADLINE")), 30000);
      worker.once("message", (message: unknown) => {
        const result = z
          .strictObject({ ok: z.literal(true), value: plan })
          .safeParse(message);
        if (!result.success) return finish(failed());
        const value = result.data.value;
        const used = new Set(
          value.segments.flatMap((s) => (s.kind === "media" ? [s.id] : [])),
        );
        const allowed = new Set(input.media.map((s) => s.id));
        if (
          value.filename !==
            exportFilename(input.title, input.noteId, "html").replace(
              /\.html$/,
              ".pdf",
            ) ||
          value.mediaIds.length !== used.size ||
          value.mediaIds.some((id) => !used.has(id) || !allowed.has(id)) ||
          Buffer.byteLength(JSON.stringify(value)) >
            inputBytes * (32 + input.appUrl.length) + 65536
        )
          return finish(failed());
        finish(null, value);
      });
      worker.once("error", () => finish(failed("PDF_RESOURCE_CAPACITY")));
      worker.once("exit", () => finish(failed()));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}

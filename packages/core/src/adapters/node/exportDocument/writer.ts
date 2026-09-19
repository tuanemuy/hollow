import { Worker } from "node:worker_threads";
import type {
  ExportDocumentInput,
  ExportDocumentPlan,
  ExportDocumentWriter,
} from "@repo/core/application/export/document";
import { exportFilename } from "./filename";
import {
  checkInput,
  failure,
  isFailureCode,
  plannedBytes,
  planSchema,
} from "./limits";

export class IsolatedExportDocumentWriter implements ExportDocumentWriter {
  constructor(private readonly workerPath: string | URL) {}

  async plan(
    input: ExportDocumentInput,
    signal: AbortSignal,
  ): Promise<ExportDocumentPlan> {
    if (signal.aborted) throw failure("EXPORT_DOCUMENT_CANCELLED");
    const checked = checkInput(input);
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath, {
        workerData: checked,
        resourceLimits: {
          maxOldGenerationSizeMb: 128,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
        stdout: true,
        stderr: true,
      });
    } catch {
      throw failure("EXPORT_DOCUMENT_INVALID");
    }
    worker.stdout.resume();
    worker.stderr.resume();
    return new Promise<ExportDocumentPlan>((resolve, reject) => {
      let settled = false;
      const finish = (error: Error | null, value?: ExportDocumentPlan) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        void worker.terminate().then(
          () => {
            if (signal.aborted) reject(failure("EXPORT_DOCUMENT_CANCELLED"));
            else if (error) reject(error);
            else if (value) resolve(value);
            else reject(failure("EXPORT_DOCUMENT_INVALID"));
          },
          () => reject(failure("EXPORT_DOCUMENT_INVALID")),
        );
      };
      const abort = () => finish(failure("EXPORT_DOCUMENT_CANCELLED"));
      const timer = setTimeout(
        () => finish(failure("EXPORT_DOCUMENT_TIMEOUT")),
        30_000,
      );
      worker.once("message", (message: unknown) => {
        if (!message || typeof message !== "object" || !("ok" in message))
          return finish(failure("EXPORT_DOCUMENT_INVALID"));
        if (message.ok === false)
          return finish(
            failure(
              "code" in message && isFailureCode(message.code)
                ? message.code
                : "EXPORT_DOCUMENT_INVALID",
            ),
          );
        if (message.ok !== true || !("value" in message))
          return finish(failure("EXPORT_DOCUMENT_INVALID"));
        const parsed = planSchema.safeParse(message.value);
        if (!parsed.success) return finish(failure("EXPORT_DOCUMENT_INVALID"));
        const value = parsed.data;
        try {
          if (
            value.filename !==
              exportFilename(checked.title, checked.noteId, checked.format) ||
            value.mime !==
              (checked.format === "html"
                ? "text/html; charset=utf-8"
                : "text/markdown; charset=utf-8") ||
            value.maxBytes !== plannedBytes(value, checked)
          )
            return finish(failure("EXPORT_DOCUMENT_INVALID"));
        } catch {
          return finish(failure("EXPORT_DOCUMENT_INVALID"));
        }
        return finish(null, value);
      });
      worker.once("error", (error) =>
        finish(
          failure(
            error !== null &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "ERR_WORKER_OUT_OF_MEMORY"
              ? "EXPORT_DOCUMENT_LIMIT"
              : "EXPORT_DOCUMENT_INVALID",
          ),
        ),
      );
      worker.once("exit", () => finish(failure("EXPORT_DOCUMENT_INVALID")));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}

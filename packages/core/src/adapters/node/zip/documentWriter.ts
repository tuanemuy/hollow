import { Worker } from "node:worker_threads";
import type {
  ExportDocumentInput,
  ExportDocumentPlan,
  ExportDocumentWriter,
} from "@repo/core/application/export/document";
import { ZipExecutionUnprovenError } from "@repo/core/application/zip/executionError";
import { exportFilename } from "../exportDocument/filename";
import {
  checkInput,
  failure,
  isFailureCode,
  plannedBytes,
  planSchema,
} from "../exportDocument/limits";

export class IsolatedZipDocumentWriter implements ExportDocumentWriter {
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
      let stopping = false;
      let exited = false;
      let result: ExportDocumentPlan | undefined;
      let error: Error | undefined;
      const clean = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        worker.removeListener("message", message);
      };
      const finish = () => {
        if (settled || !exited) return;
        settled = true;
        clean();
        if (signal.aborted) reject(failure("EXPORT_DOCUMENT_CANCELLED"));
        else if (error) reject(error);
        else if (result) resolve(result);
        else reject(failure("EXPORT_DOCUMENT_INVALID"));
      };
      const unproven = () => {
        if (exited) return finish();
        if (settled) return;
        settled = true;
        clean();
        reject(new ZipExecutionUnprovenError());
      };
      const stop = () => {
        if (settled || stopping) return;
        stopping = true;
        try {
          void worker.terminate().then(
            () => (exited ? finish() : unproven()),
            () => (exited ? finish() : unproven()),
          );
        } catch {
          unproven();
        }
      };
      const abort = () => {
        error = failure("EXPORT_DOCUMENT_CANCELLED");
        stop();
      };
      const timer = setTimeout(() => {
        error = failure("EXPORT_DOCUMENT_TIMEOUT");
        stop();
      }, 30_000);
      const message = (value: unknown) => {
        if (stopping || settled) return;
        if (!value || typeof value !== "object" || !("ok" in value)) {
          error = failure("EXPORT_DOCUMENT_INVALID");
        } else if (value.ok === false) {
          error = failure(
            "code" in value && isFailureCode(value.code)
              ? value.code
              : "EXPORT_DOCUMENT_INVALID",
          );
        } else if (value.ok === true && "value" in value) {
          const parsed = planSchema.safeParse(value.value);
          if (parsed.success) {
            try {
              const plan = parsed.data;
              if (
                plan.filename ===
                  exportFilename(
                    checked.title,
                    checked.noteId,
                    checked.format,
                  ) &&
                plan.mime ===
                  (checked.format === "html"
                    ? "text/html; charset=utf-8"
                    : "text/markdown; charset=utf-8") &&
                plan.maxBytes === plannedBytes(plan, checked)
              )
                result = plan;
            } catch {
              error = failure("EXPORT_DOCUMENT_INVALID");
            }
          }
          if (!result) error = failure("EXPORT_DOCUMENT_INVALID");
        } else error = failure("EXPORT_DOCUMENT_INVALID");
        stop();
      };
      worker.on("message", message);
      worker.on("error", (value: Error) => {
        error = failure(
          "code" in value && value.code === "ERR_WORKER_OUT_OF_MEMORY"
            ? "EXPORT_DOCUMENT_LIMIT"
            : "EXPORT_DOCUMENT_INVALID",
        );
        stop();
      });
      worker.once("exit", () => {
        exited = true;
        finish();
      });
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}

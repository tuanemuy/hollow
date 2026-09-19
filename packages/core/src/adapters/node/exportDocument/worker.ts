import { parentPort, workerData } from "node:worker_threads";
import { isFailureCode } from "./limits";
import { planExportDocument } from "./plan";

try {
  parentPort?.postMessage({ ok: true, value: planExportDocument(workerData) });
} catch (error) {
  const code =
    error instanceof Error && "code" in error && isFailureCode(error.code)
      ? error.code
      : "EXPORT_DOCUMENT_INVALID";
  parentPort?.postMessage({ ok: false, code });
} finally {
  parentPort?.close();
}

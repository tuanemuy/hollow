import { createHash } from "node:crypto";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import tls from "node:tls";
import { parentPort, workerData } from "node:worker_threads";
import { fail, preparedDocument } from "./documentBlocks.mjs";

const noNetwork = () => fail("LLM_DOCUMENT_UNSUPPORTED");
net.connect = noNetwork;
net.createConnection = noNetwork;
net.Socket.prototype.connect = noNetwork;
tls.connect = noNetwork;
http.request = noNetwork;
http.get = noNetwork;
https.request = noNetwork;
https.get = noNetwork;
dns.lookup = noNetwork;
dns.resolve = noNetwork;
dns.promises.lookup = noNetwork;
dns.promises.resolve = noNetwork;
globalThis.fetch = noNetwork;
syncBuiltinESMExports();
for (const method of ["log", "error", "warn", "info", "debug"])
  console[method] = () => {};
const codes = new Set([
  "LLM_SOURCE_CHANGED",
  "LLM_SOURCE_INVALID",
  "LLM_RESOURCE_LIMIT",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_DOCUMENT_NO_TEXT",
  "LLM_PDF_VISUAL_REQUIRED",
  "LLM_PDF_ORDER_UNPROVEN",
]);

try {
  const input = workerData;
  if (
    !input ||
    input.preparationVersion !== 2 ||
    input.promptVersion !== 1 ||
    !(input.bytes instanceof Uint8Array) ||
    input.media !== undefined ||
    !input.source ||
    input.source.kind !== "original" ||
    !["docx", "xlsx", "pptx", "pdf"].includes(input.source.format) ||
    typeof input.source.originalId !== "string" ||
    !input.source.originalId ||
    !/^[0-9a-f]{64}$/.test(input.source.sha256) ||
    !Number.isSafeInteger(input.source.bytes)
  )
    fail("LLM_SOURCE_INVALID");
  if (input.bytes.length < 1 || input.bytes.length > 50 * 1024 * 1024)
    fail("LLM_RESOURCE_LIMIT");
  if (
    input.bytes.length !== input.source.bytes ||
    createHash("sha256").update(input.bytes).digest("hex") !==
      input.source.sha256
  )
    fail("LLM_SOURCE_CHANGED");
  const bytes = Buffer.from(input.bytes);
  const result =
    input.source.format === "pdf"
      ? await (await import("./documentPdf.mjs")).preparePdf(bytes)
      : await (await import("./documentOffice.mjs")).prepareOffice(
          bytes,
          input.source.format,
        );
  parentPort?.postMessage({
    ok: true,
    value: preparedDocument(
      input.source,
      result.blocks,
      result.coverage,
      result.notices,
    ),
  });
} catch (error) {
  parentPort?.postMessage({
    ok: false,
    code: codes.has(error?.code) ? error.code : "LLM_DOCUMENT_CORRUPT",
  });
} finally {
  parentPort?.close();
}

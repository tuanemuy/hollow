import dns from "node:dns";
import { close, createReadStream, createWriteStream } from "node:fs";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import { Readable } from "node:stream";
import { finished, pipeline } from "node:stream/promises";
import tls from "node:tls";

const denied = () => {
  throw new Error("LLM_DOCUMENT_UNSUPPORTED");
};
net.connect = net.createConnection = net.Socket.prototype.connect = denied;
tls.connect = http.request = http.get = https.request = https.get = denied;
dns.lookup = dns.resolve = dns.promises.lookup = dns.promises.resolve = denied;
globalThis.fetch = denied;
syncBuiltinESMExports();

let warned = false;
const methods = ["log", "warn", "error", "info", "debug"];
const previous = methods.map((method) => [method, console[method]]);
for (const method of methods)
  console[method] = () => {
    warned = true;
  };
const codes = new Set([
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_RESOURCE_LIMIT",
  "LLM_TIMEOUT",
  "LLM_UNAVAILABLE",
]);
const input = createReadStream(null, {
  fd: 0,
  autoClose: true,
  highWaterMark: 65536,
});
const output = createWriteStream(null, {
  fd: 1,
  autoClose: true,
  highWaterMark: 65536,
});
const binary = createWriteStream(null, {
  fd: 3,
  autoClose: true,
  highWaterMark: 65536,
});
const streams = [input, output, binary];
const closed = streams.map(
  (stream) => new Promise((resolve) => stream.once("close", resolve)),
);
const endings = streams.map((stream) => finished(stream).catch(() => {}));
const controller = new AbortController();
let timedOut = false;
const abort = () => controller.abort();
process.once("SIGTERM", abort);
const timer = setTimeout(() => {
  timedOut = true;
  abort();
}, 120000);
const abortCode = () => (timedOut ? "LLM_TIMEOUT" : "LLM_UNAVAILABLE");
const destroyInput = () => input.destroy(new Error("LLM_UNAVAILABLE"));
controller.signal.addEventListener("abort", destroyInput, { once: true });
let reply;
let png;
try {
  const action = process.env.HOLLOW_PDF_PAGES_ACTION;
  const rawOrdinal = process.env.HOLLOW_PDF_PAGES_ORDINAL;
  if (
    (action !== "prepare" && action !== "redraw") ||
    (action === "prepare" && rawOrdinal !== undefined) ||
    (action === "redraw" &&
      !/^(?:[0-9]|[12][0-9]|3[01])$/.test(rawOrdinal ?? ""))
  )
    denied();
  const chunks = [];
  let bytes = 0;
  for await (const chunk of input) {
    bytes += chunk.length;
    if (bytes > 50 * 1024 * 1024) throw new Error("LLM_RESOURCE_LIMIT");
    chunks.push(chunk);
  }
  const source = Buffer.concat(chunks, bytes);
  const renderer = await import("./pdfPagesRenderer.mjs");
  if (action === "prepare") {
    reply = {
      version: 1,
      ok: true,
      pages: await renderer.inspect(source, controller.signal),
    };
  } else {
    const { png: raster, ...page } = await renderer.redraw(
      source,
      Number(rawOrdinal),
      controller.signal,
    );
    png = raster;
    reply = { version: 1, ok: true, page };
  }
} catch (error) {
  reply = {
    version: 1,
    ok: false,
    code: codes.has(error?.message) ? error.message : "LLM_DOCUMENT_CORRUPT",
  };
}

try {
  if (warned) reply = { version: 1, ok: false, code: "LLM_DOCUMENT_CORRUPT" };
  if (controller.signal.aborted)
    reply = { version: 1, ok: false, code: abortCode() };
  if (reply.ok && png) {
    if (png.byteLength > 4 * 1024 * 1024) throw new Error("LLM_RESOURCE_LIMIT");
    await pipeline(
      Readable.from(
        (function* () {
          for (let offset = 0; offset < png.byteLength; offset += 65536)
            yield png.subarray(offset, offset + 65536);
        })(),
      ),
      binary,
      { signal: controller.signal },
    );
  } else {
    binary.end();
    await endings[2];
    await closed[2];
  }
} catch {
  reply = {
    version: 1,
    ok: false,
    code: controller.signal.aborted ? abortCode() : "LLM_DOCUMENT_CORRUPT",
  };
  binary.destroy();
}

clearTimeout(timer);
controller.signal.removeEventListener("abort", destroyInput);
if (!input.destroyed) input.destroy();
await Promise.all([endings[0], closed[0], endings[2], closed[2]]);

// Publish metadata only after library work, raster delivery and the last idle turn.
process.once("beforeExit", () => {
  void (async () => {
    try {
      if (warned)
        reply = { version: 1, ok: false, code: "LLM_DOCUMENT_CORRUPT" };
      if (controller.signal.aborted)
        reply = { version: 1, ok: false, code: abortCode() };
      if (!reply.ok) process.exitCode = 1;
      const json = Buffer.from(JSON.stringify(reply));
      if (json.byteLength > 65536) throw new Error("LLM_RESOURCE_LIMIT");
      await pipeline(Readable.from([json]), output);
    } catch {
      process.exitCode = 1;
    } finally {
      for (const stream of streams) if (!stream.destroyed) stream.destroy();
      await Promise.all([...endings, ...closed]);
      await new Promise((resolve) => close(2, resolve));
      process.removeListener("SIGTERM", abort);
      for (const [method, callback] of previous) console[method] = callback;
    }
  })();
});

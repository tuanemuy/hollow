import dns from "node:dns";
import { close, createReadStream, createWriteStream } from "node:fs";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import { Readable } from "node:stream";
import { finished, pipeline } from "node:stream/promises";
import tls from "node:tls";

const bad = () => {
  throw new Error("LLM_IMAGE_UNSUPPORTED");
};
net.connect = net.createConnection = net.Socket.prototype.connect = bad;
tls.connect = http.request = http.get = https.request = https.get = bad;
dns.lookup = dns.resolve = dns.promises.lookup = dns.promises.resolve = bad;
globalThis.fetch = bad;
syncBuiltinESMExports();
for (const method of ["log", "error", "warn", "info", "debug"])
  console[method] = () => {};

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
const metadata = createWriteStream(null, {
  fd: 3,
  autoClose: true,
  highWaterMark: 16384,
});
const streams = [input, output, metadata];
const endings = streams.map((stream) => finished(stream).catch(() => {}));
const closed = streams.map(
  (stream) => new Promise((resolve) => stream.once("close", resolve)),
);
const errors = new Set([
  "LLM_IMAGE_CORRUPT",
  "LLM_IMAGE_UNSUPPORTED",
  "LLM_IMAGE_MULTIFRAME",
  "LLM_RESOURCE_LIMIT",
]);
const json = async (value) => {
  const bytes = Buffer.from(JSON.stringify(value));
  if (bytes.length > 16384) throw new Error("LLM_RESOURCE_LIMIT");
  await pipeline(Readable.from([bytes]), metadata);
};
try {
  let size = 0;
  const chunks = [];
  for await (const chunk of input) {
    size += chunk.length;
    if (size > 50 * 1024 * 1024) throw new Error("LLM_RESOURCE_LIMIT");
    chunks.push(chunk);
  }
  const { normalizeImage } = await import("./imageCodec.mjs");
  const result = await normalizeImage(Buffer.concat(chunks, size));
  await pipeline(
    Readable.from(
      (function* () {
        for (let offset = 0; offset < result.png.length; offset += 65536)
          yield result.png.subarray(offset, offset + 65536);
      })(),
    ),
    output,
  );
  await json(result.metadata);
} catch (error) {
  process.exitCode = 1;
  if (!output.destroyed) output.destroy();
  if (!metadata.destroyed) {
    try {
      await json({
        version: 1,
        ok: false,
        code: errors.has(error?.message) ? error.message : "LLM_IMAGE_CORRUPT",
      });
    } catch {}
  }
} finally {
  for (const stream of streams) if (!stream.destroyed) stream.destroy();
  await Promise.all([...endings, ...closed]);
  await new Promise((resolve) => close(2, () => resolve()));
}

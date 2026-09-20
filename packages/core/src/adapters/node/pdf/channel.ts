import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import path from "node:path";
import type { PdfPackManifest } from "./workspace";

export async function openPdfChannel(
  directory: string,
  manifest: PdfPackManifest,
  signal: AbortSignal,
) {
  const generation = randomUUID();
  const credential = randomBytes(32).toString("hex");
  const slots = new Map<
    string,
    (typeof manifest.slots)[number] & { requests: number }
  >(manifest.slots.map((slot) => [randomUUID(), { ...slot, requests: 0 }]));
  const paths = new Map(
    [...slots].map(([id, slot]) => [slot.id, `/g/${generation}/slot/${id}`]),
  );
  const sockets = new Set<Socket>();
  const tasks = new Set<Promise<void>>();
  let readers = 0;
  let peakReaders = 0;
  let bytes = 0;
  let fatal = false;
  let closing = false;
  let document = "";
  let origin = "";
  let requests = 0;
  let rejected = 0;
  const pack = await open(
    path.join(directory, "resources.pack"),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await pack.stat();
    if (
      !info.isFile() ||
      info.size !== manifest.bytes ||
      (info.mode & 0o777) !== 0o400
    )
      throw Error("pack-size");
    const sum = createHash("sha256");
    const buffer = Buffer.alloc(65536);
    let position = 0;
    while (position < manifest.bytes) {
      signal.throwIfAborted();
      const result = await pack.read(
        buffer,
        0,
        Math.min(buffer.length, manifest.bytes - position),
        position,
      );
      if (!result.bytesRead) throw Error("pack-short");
      sum.update(buffer.subarray(0, result.bytesRead));
      position += result.bytesRead;
    }
    if (sum.digest("hex") !== manifest.sha256) throw Error("pack-hash");
  } catch (error) {
    await pack.close();
    throw error;
  }
  function validHeader(value: string | string[] | undefined) {
    return (
      typeof value === "string" &&
      value.length === credential.length &&
      timingSafeEqual(Buffer.from(value), Buffer.from(credential))
    );
  }
  async function handle(req: IncomingMessage, res: ServerResponse) {
    requests++;
    const reject = () => {
      rejected++;
      res.writeHead(404, {
        "Cache-Control": "no-store",
        "Content-Length": "0",
      });
      res.end();
    };
    if (
      closing ||
      signal.aborted ||
      req.method !== "GET" ||
      req.headers.host !== origin.slice(7) ||
      !validHeader(req.headers["x-render-capability"]) ||
      req.headers.cookie ||
      req.headers.authorization ||
      req.headers.range
    )
      return reject();
    if (req.url === "/document") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(document),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": `default-src 'none'; img-src ${origin}; font-src ${origin}; style-src 'unsafe-inline'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'`,
      });
      res.end(document);
      return;
    }
    const prefix = `/g/${generation}/slot/`;
    const slot = req.url?.startsWith(prefix)
      ? slots.get(req.url.slice(prefix.length))
      : undefined;
    if (!slot || slot.requests >= 4 || readers >= 4) return reject();
    slot.requests++;
    readers++;
    peakReaders = Math.max(peakReaders, readers);
    try {
      res.writeHead(200, {
        "Content-Type": slot.mime,
        "Content-Length": slot.bytes,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      const hash = createHash("sha256");
      let cursor = 0;
      const chunk = Buffer.alloc(65536);
      while (cursor < slot.bytes) {
        if (signal.aborted || closing || res.destroyed)
          throw Error("channel-cancelled");
        const result = await pack.read(
          chunk,
          0,
          Math.min(chunk.length, slot.bytes - cursor),
          slot.offset + cursor,
        );
        if (!result.bytesRead) throw Error("slot-short");
        hash.update(chunk.subarray(0, result.bytesRead));
        cursor += result.bytesRead;
        bytes += result.bytesRead;
        if (bytes > manifest.bytes * 4) throw Error("replay-budget");
        await new Promise<void>((resolve, reject) =>
          res.write(chunk.subarray(0, result.bytesRead), (error) =>
            error ? reject(error) : resolve(),
          ),
        );
      }
      if (cursor !== slot.bytes || hash.digest("hex") !== slot.sha256)
        throw Error("slot-hash");
      res.end();
    } catch {
      fatal = true;
      res.destroy();
    } finally {
      readers--;
    }
  }
  const server = http.createServer((req, res) => {
    const task = handle(req, res);
    tasks.add(task);
    void task
      .catch(() => {
        fatal = true;
        res.destroy();
      })
      .finally(() => tasks.delete(task));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.headersTimeout = 5000;
  server.requestTimeout = 5000;
  server.maxConnections = 8;
  server.maxHeadersCount = 16;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (error) {
    await pack.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") throw Error("channel-address");
  origin = `http://127.0.0.1:${address.port}`;
  const allowed = new Set([
    `${origin}/document`,
    ...[...paths.values()].map((p) => origin + p),
  ]);
  let closed: Promise<void> | null = null;
  return {
    origin,
    paths,
    allowed,
    header: { "x-render-capability": credential },
    setDocument(value: string) {
      document = value;
    },
    assertReady() {
      if (fatal || readers || tasks.size || signal.aborted)
        throw Error("channel-not-ready");
    },
    stats() {
      return {
        requests,
        rejected,
        bytes,
        readers,
        peakReaders,
        sockets: sockets.size,
        tasks: tasks.size,
        fatal,
      };
    },
    identifiers() {
      return [origin, generation, credential, ...paths.values()];
    },
    close() {
      if (closed) return closed;
      closed = (async () => {
        closing = true;
        const done = [...sockets].map(
          (socket) =>
            new Promise<void>((resolve) => {
              socket.once("close", resolve);
              socket.destroy();
            }),
        );
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await Promise.all(done);
        await Promise.allSettled([...tasks]);
        await pack.close();
        if (readers || sockets.size || tasks.size) throw Error("channel-close");
      })();
      return closed;
    },
  };
}

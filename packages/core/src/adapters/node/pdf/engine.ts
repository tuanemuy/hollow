import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { PDF_DOCUMENT_PROFILE } from "@repo/core/application/pdf/document";
import puppeteer, {
  type Browser,
  type ConnectionTransport,
} from "puppeteer-core";
import { z } from "zod";
import { openPdfChannel } from "./channel";
import { pdfWorkspacePath } from "./workspace";

const count = z.number().int().safe().nonnegative();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const configSchema = z.object({
  version: z.literal(1),
  node: z.string(),
  engine: z.string(),
  chrome: z.string(),
  profile: z.string(),
  outputBytes: count.positive(),
  nativeTempBytes: count.positive(),
  renderMs: count.positive(),
});
const manifestSchema = z.strictObject({
  version: z.literal(1),
  computeId: z.string().uuid(),
  generation: count.positive(),
  bytes: count.positive(),
  sha256: sha,
  slots: z.array(
    z.strictObject({
      id: z.string(),
      mime: z.string(),
      bytes: count.positive(),
      sha256: sha,
      offset: count,
    }),
  ),
  plan: z.strictObject({
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
  }),
});
function readJson(file: string, max: number) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile() || info.uid !== process.getuid?.() || info.size > max)
      throw Error("input");
    return JSON.parse(fs.readFileSync(fd, "utf8"));
  } finally {
    fs.closeSync(fd);
  }
}
function emit(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}
async function diskBytes(directory: string) {
  let total = 0;
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    if (!current) break;
    let info: Awaited<ReturnType<typeof lstat>>;
    try {
      info = await lstat(current);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        continue;
      throw error;
    }
    if (info.isSymbolicLink()) continue;
    if (info.isDirectory()) {
      for (const name of await readdir(current))
        pending.push(path.join(current, name));
    } else if (info.isFile()) total += info.size;
  }
  return total;
}

async function main() {
  process.umask(0o077);
  const [root, id, lockText] = process.argv.slice(2);
  if (
    !root ||
    !id ||
    !lockText ||
    !path.isAbsolute(root) ||
    !/^\d+$/.test(lockText)
  )
    throw Error("arguments");
  const lock = Number(lockText);
  fs.fstatSync(lock);
  await new Promise<void>((resolve, reject) => {
    let received = "";
    const data = (chunk: Buffer) => {
      received += chunk.toString();
      if (received === "go\n") {
        process.stdin.off("data", data);
        resolve();
      } else if (received.length > 3) reject(Error("go"));
    };
    process.stdin.on("data", data);
    process.stdin.once("end", () => reject(Error("parent-ended")));
  });
  process.stdin.destroy();
  const directory = pdfWorkspacePath(root, id);
  const partial = path.join(directory, "output.partial.pdf");
  const controller = new AbortController();
  let externallyAborted = false;
  let resourceExceeded = false;
  let renderDeadline = false;
  const abort = () => {
    externallyAborted = true;
    controller.abort();
  };
  process.on("SIGTERM", abort);
  process.on("SIGINT", abort);
  const config = configSchema.parse(
    readJson(path.join(root, "runtime.json"), 16384),
  );
  const admission = z
    .strictObject({ bytes: count.positive(), sha256: sha })
    .parse(readJson(path.join(directory, "admission.json"), 4096));
  const manifestFile = path.join(directory, "manifest.json");
  const manifestFd = fs.openSync(
    manifestFile,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  let manifest: z.infer<typeof manifestSchema>;
  try {
    const info = fs.fstatSync(manifestFd);
    if (
      !info.isFile() ||
      info.size !== admission.bytes ||
      info.uid !== process.getuid?.()
    )
      throw Error("manifest");
    const raw = fs.readFileSync(manifestFd);
    if (createHash("sha256").update(raw).digest("hex") !== admission.sha256)
      throw Error("manifest-hash");
    manifest = manifestSchema.parse(JSON.parse(raw.toString("utf8")));
  } finally {
    fs.closeSync(manifestFd);
  }
  if (
    manifest.computeId !== id ||
    new Set(manifest.slots.map((s) => s.id)).size !== manifest.slots.length
  )
    throw Error("manifest");
  let end = 0;
  for (const slot of manifest.slots) {
    if (
      slot.offset !== end ||
      !Number.isSafeInteger(end + slot.bytes) ||
      /[\r\n]/.test(slot.mime)
    )
      throw Error("slot");
    end += slot.bytes;
  }
  if (end !== manifest.bytes) throw Error("manifest");
  let channel: Awaited<ReturnType<typeof openPdfChannel>> | undefined;
  let browser: Browser | undefined;
  let chrome: ChildProcess | undefined;
  let transport: ConnectionTransport | undefined;
  let sink: fs.WriteStream | undefined;
  let success = false;
  let code = "render-failed";
  let bytes = 0;
  let digest: string | null = null;
  let protocolClosed = true;
  let channelClosed = false;
  let ownedPartial = false;
  let polling: Promise<void> | null = null;
  const poll = setInterval(() => {
    if (polling) return;
    polling = diskBytes(path.join(directory, "native"))
      .then(
        (value) => {
          if (value > config.nativeTempBytes) {
            resourceExceeded = true;
            controller.abort();
          }
        },
        () => {
          resourceExceeded = true;
          controller.abort();
        },
      )
      .finally(() => {
        polling = null;
      });
  }, 100);
  const deadline = setTimeout(() => {
    renderDeadline = true;
    controller.abort();
  }, config.renderMs);
  try {
    channel = await openPdfChannel(directory, manifest, controller.signal);
    const body = channel.paths.get("font-body");
    const mono = channel.paths.get("font-code");
    if (!body || !mono) throw Error("fonts");
    const style = `<style>@font-face{font-family:HollowPdfBody;src:url('${body}')}@font-face{font-family:HollowPdfCode;src:url('${mono}')}body{font-family:HollowPdfBody,sans-serif!important}pre,code,kbd,samp{font-family:HollowPdfCode,monospace!important}@page{size:A4;margin:16mm}img{max-width:100%}</style>`;
    let html = manifest.plan.segments
      .map((segment) => {
        if (segment.kind === "text") return segment.value;
        const url = channel?.paths.get(segment.id);
        if (!url) throw Error("slot");
        return url;
      })
      .join("");
    const head = html.indexOf("</head>");
    if (head < 0) throw Error("document");
    html = html.slice(0, head) + style + html.slice(head);
    channel.setDocument(html);
    const args = await puppeteer.defaultArgs({
      headless: "shell",
      userDataDir: path.join(directory, "native/profile"),
      args: [
        "--remote-debugging-pipe",
        "--disable-gpu",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-sync",
        "--disable-quic",
        "--proxy-server=http://127.0.0.1:9",
        "--proxy-bypass-list=127.0.0.1",
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
      ],
    });
    if (
      args.includes("--no-sandbox") ||
      args.includes("--disable-setuid-sandbox")
    )
      throw Error("sandbox");
    chrome = spawn(config.chrome, args, {
      env: {
        PATH: "/usr/bin:/bin",
        TMPDIR: path.join(directory, "native"),
        LANG: "ja_JP.UTF-8",
      },
      stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"],
    });
    chrome.stdout?.resume();
    chrome.stderr?.resume();
    const input = chrome.stdio[3];
    const output = chrome.stdio[4];
    if (!(input instanceof Writable) || !(output instanceof Readable))
      throw Error("pipe");
    let pending = "";
    transport = {
      send(message) {
        input.write(`${message}\0`);
      },
      close() {
        input.destroy();
        output.destroy();
      },
    };
    output.on("data", (chunk) => {
      pending += chunk.toString();
      if (pending.length > 4 * 1024 * 1024) {
        controller.abort();
        return;
      }
      while (true) {
        const position = pending.indexOf("\0");
        if (position === -1) break;
        const message = pending.slice(0, position);
        pending = pending.slice(position + 1);
        transport?.onmessage?.(message);
      }
    });
    output.on("close", () => transport?.onclose?.());
    browser = await puppeteer.connect({ transport, protocolTimeout: 10000 });
    controller.signal.addEventListener(
      "abort",
      () => {
        void browser?.close().catch(() => {});
      },
      { once: true },
    );
    controller.signal.throwIfAborted();
    emit({ event: "stage", name: "browser-ready" });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setCacheEnabled(false);
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (channel?.allowed.has(request.url()) && request.method() === "GET")
        void request
          .continue({ headers: { ...request.headers(), ...channel.header } })
          .catch(() => {});
      else void request.abort("blockedbyclient").catch(() => {});
    });
    await page.goto(`${channel.origin}/document`, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load("16px HollowPdfBody", "日本語"),
        document.fonts.load("16px HollowPdfCode", "日本語"),
      ]);
      await document.fonts.ready;
    });
    const ready = await page.evaluate(() => ({
      body: document.fonts.check("16px HollowPdfBody", "日本語"),
      code: document.fonts.check("16px HollowPdfCode", "日本語"),
      images: [...document.images].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    }));
    if (
      !ready.body ||
      !ready.code ||
      !ready.images ||
      (await page.cookies()).length
    )
      throw Error("resources");
    channel.assertReady();
    emit({ event: "stage", name: "document-ready" });
    const client = await page.createCDPSession();
    const printed = await client.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      transferMode: "ReturnAsStream",
    });
    if (!printed.stream) throw Error("stream");
    const stream = printed.stream;
    protocolClosed = false;
    sink = fs.createWriteStream(partial, {
      flags: "wx",
      mode: 0o600,
      highWaterMark: 65536,
    });
    await once(sink, "open");
    ownedPartial = true;
    const sum = createHash("sha256");
    for (;;) {
      controller.signal.throwIfAborted();
      const result = await client.send("IO.read", {
        handle: stream,
        size: 65536,
      });
      const chunk = Buffer.from(
        result.data,
        result.base64Encoded ? "base64" : "utf8",
      );
      if (chunk.length > 65536 || bytes + chunk.length > config.outputBytes) {
        resourceExceeded = true;
        throw Error("output");
      }
      sum.update(chunk);
      bytes += chunk.length;
      if (!sink.write(chunk)) await once(sink, "drain");
      if (result.eof) break;
    }
    await client.send("IO.close", { handle: stream });
    protocolClosed = true;
    sink.end();
    await once(sink, "close");
    channel.assertReady();
    digest = sum.digest("hex");
    success = true;
    emit({ event: "stage", name: "rendered" });
  } catch {
    success = false;
  } finally {
    if (sink && !sink.closed) {
      sink.destroy();
      await once(sink, "close").catch(() => {});
    }
    if (browser) await browser.close().catch(() => {});
    transport?.close();
    if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGTERM");
      const timer = setTimeout(() => chrome?.kill("SIGKILL"), 2000);
      await once(chrome, "close").catch(() => {});
      clearTimeout(timer);
    }
    const failedBeforeCleanup = controller.signal.aborted;
    if (channel) {
      controller.abort();
      emit({ event: "stage", name: "channel-closing" });
      try {
        await channel.close();
        channelClosed = true;
      } catch {
        success = false;
      }
    }
    clearInterval(poll);
    await polling;
    clearTimeout(deadline);
    const chromeClosed =
      !chrome || chrome.exitCode !== null || chrome.signalCode !== null;
    if (!protocolClosed) protocolClosed = chromeClosed;
    if (success && channel) {
      const fd = fs.openSync(
        partial,
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
      );
      try {
        const identifiers = channel.identifiers();
        const buffer = Buffer.alloc(65536);
        let offset = 0;
        let tail = "";
        while (offset < bytes) {
          const n = fs.readSync(
            fd,
            buffer,
            0,
            Math.min(buffer.length, bytes - offset),
            offset,
          );
          if (!n) {
            success = false;
            break;
          }
          const text = tail + buffer.subarray(0, n).toString("latin1");
          if (identifiers.some((value) => text.includes(value))) {
            success = false;
            code = "identifier";
            break;
          }
          tail = text.slice(-4096);
          offset += n;
        }
      } catch {
        success = false;
      } finally {
        fs.closeSync(fd);
      }
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (
      externallyAborted ||
      failedBeforeCleanup ||
      renderDeadline ||
      resourceExceeded
    )
      success = false;
    if (
      !chromeClosed ||
      !channelClosed ||
      !protocolClosed ||
      (sink && !sink.closed)
    ) {
      success = false;
      code = "close-unproven";
    } else if (resourceExceeded) code = "resource-limit";
    else if (renderDeadline) code = "deadline";
    else if (externallyAborted || failedBeforeCleanup) code = "cancelled";
    else if (success) code = "ok";
    if (success) fs.renameSync(partial, path.join(directory, "output.pdf"));
    else if (ownedPartial && fs.existsSync(partial)) fs.unlinkSync(partial);
    emit({
      event: "render-closed",
      ok: success,
      code,
      bytes,
      sha256: success ? digest : null,
      chromeClosed,
      channelClosed,
      sinkClosed: !sink || sink.closed,
      protocolClosed,
    });
    fs.closeSync(lock);
    process.exitCode = success ? 0 : 1;
  }
}

main().catch(() => {
  emit({
    event: "render-closed",
    ok: false,
    code: "close-unproven",
    bytes: 0,
    sha256: null,
    chromeClosed: false,
    channelClosed: false,
    sinkClosed: false,
    protocolClosed: false,
  });
  process.exitCode = 1;
});

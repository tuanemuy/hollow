import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(
  createRequire(import.meta.url).resolve("@repo/core/package.json"),
);
const codes = new Set([
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_RESOURCE_LIMIT",
  "LLM_TIMEOUT",
  "LLM_UNAVAILABLE",
]);
const fail = (code) => {
  throw new Error(code);
};

function inputPolicy(bytes, ordinal) {
  if (!(bytes instanceof Uint8Array) || !bytes.byteLength)
    fail("LLM_DOCUMENT_CORRUPT");
  if (bytes.byteLength > 50 * 1024 * 1024) fail("LLM_RESOURCE_LIMIT");
  if (
    ordinal !== null &&
    (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= 32)
  )
    fail("LLM_DOCUMENT_UNSUPPORTED");
  const raw = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .toString("latin1")
    .replace(/#([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  if (
    /\/(?:JavaScript|JS|Launch|URI|RichMedia|XFA|EmbeddedFiles|Filespec|OpenAction|AA)\b/.test(
      raw,
    )
  )
    fail("LLM_DOCUMENT_UNSUPPORTED");
}

async function renderDocument(bytes, ordinal, signal) {
  if (signal.aborted) fail("LLM_UNAVAILABLE");
  inputPolicy(bytes, ordinal);
  let task;
  let page;
  let rendering;
  let destruction;
  let pageTimer;
  let pageStarted;
  let reason;
  let interrupt;
  const interrupted = new Promise((_, reject) => {
    interrupt = reject;
  });
  // Cancellation races a library operation, but destruction is still awaited below.
  void interrupted.catch(() => {});
  const destroy = () => {
    if (task && !destruction)
      destruction = Promise.resolve().then(() => task.destroy());
    return destruction;
  };
  const stop = (code) => {
    if (reason) return;
    reason = code;
    try {
      rendering?.cancel();
    } catch {}
    void destroy()?.catch(() => {});
    interrupt(new Error(code));
  };
  const abort = () => stop("LLM_UNAVAILABLE");
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => stop("LLM_TIMEOUT"), 120000);
  const started = performance.now();
  const pending = new Set();
  const check = () => {
    if (reason) fail(reason);
    if (signal.aborted) fail("LLM_UNAVAILABLE");
    if (
      performance.now() - started > 120000 ||
      (pageStarted !== undefined && performance.now() - pageStarted > 10000)
    )
      fail("LLM_TIMEOUT");
  };
  const wait = async (work) => {
    const owned = Promise.resolve(work);
    pending.add(owned);
    void owned.then(
      () => pending.delete(owned),
      () => pending.delete(owned),
    );
    const result = await Promise.race([owned, interrupted]);
    check();
    return result;
  };
  try {
    check();
    const modulePath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
    const directory = path.resolve(path.dirname(modulePath), "../..");
    const pdfjs = await wait(import(pathToFileURL(modulePath).href));
    const canvas = createRequire(modulePath)("@napi-rs/canvas");
    task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      stopAtErrors: true,
      isEvalSupported: false,
      useSystemFonts: false,
      useWorkerFetch: false,
      disableFontFace: true,
      enableXfa: false,
      cMapUrl: `${directory}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${directory}/standard_fonts/`,
      wasmUrl: `${directory}/wasm/`,
      verbosity: 1,
    });
    const document = await wait(task.promise);
    if (
      !Number.isSafeInteger(document.numPages) ||
      document.numPages < 1 ||
      document.numPages > 32
    )
      fail("LLM_RESOURCE_LIMIT");
    if (ordinal !== null && ordinal >= document.numPages)
      fail("LLM_DOCUMENT_UNSUPPORTED");
    if ((await wait(document.getPermissions())) !== null)
      fail("LLM_DOCUMENT_ENCRYPTED");
    if (
      document.isPureXfa ||
      (await wait(document.hasJSActions())) ||
      (await wait(document.getJSActions())) ||
      (await wait(document.getOpenAction())) ||
      (await wait(document.getAttachments())) ||
      (await wait(document.getFieldObjects()))
    )
      fail("LLM_DOCUMENT_UNSUPPORTED");
    const optional = await wait(
      document.getOptionalContentConfig({ intent: "display" }),
    );
    if (
      optional &&
      (optional.getOrder()?.length || !optional[Symbol.iterator]().next().done)
    )
      fail("LLM_DOCUMENT_UNSUPPORTED");
    const pages = [];
    let total = 0;
    let selected;
    const first = ordinal ?? 0;
    const end = ordinal === null ? document.numPages : ordinal + 1;
    for (let index = first; index < end; index++) {
      pageStarted = performance.now();
      pageTimer = setTimeout(() => stop("LLM_TIMEOUT"), 10000);
      page = await wait(document.getPage(index + 1));
      try {
        if (await wait(page.getJSActions())) fail("LLM_DOCUMENT_UNSUPPORTED");
        const annotations = await wait(page.getAnnotations({ intent: "any" }));
        if (
          !annotations.every(
            (annotation) =>
              annotation.subtype === "Square" &&
              annotation.hasAppearance === true &&
              !annotation.actions,
          )
        )
          fail("LLM_DOCUMENT_UNSUPPORTED");
        const viewport = page.getViewport({ scale: 2 });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        if (
          !Number.isSafeInteger(width) ||
          !Number.isSafeInteger(height) ||
          width < 1 ||
          height < 1 ||
          width > 1728 ||
          height > 1728 ||
          width * height > 3000000
        )
          fail("LLM_RESOURCE_LIMIT");
        await wait(
          page.getOperatorList({
            intent: "display",
            annotationMode: pdfjs.AnnotationMode.ENABLE,
          }),
        );
        const target = canvas.createCanvas(width, height);
        let encoding;
        try {
          rendering = page.render({
            canvasContext: target.getContext("2d"),
            viewport,
            background: "rgb(255,255,255)",
            intent: "display",
            annotationMode: pdfjs.AnnotationMode.ENABLE,
          });
          await wait(rendering.promise);
          rendering = undefined;
          encoding = target.encode("png");
          const png = await wait(encoding);
          if (!png.byteLength || png.byteLength > 4 * 1024 * 1024)
            fail("LLM_RESOURCE_LIMIT");
          total += png.byteLength;
          if (total > 64 * 1024 * 1024) fail("LLM_RESOURCE_LIMIT");
          const metadata = {
            ordinal: index,
            width,
            height,
            bytes: png.byteLength,
            sha256: createHash("sha256").update(png).digest("hex"),
          };
          pages.push(metadata);
          if (ordinal !== null) selected = { ...metadata, png };
        } finally {
          if (rendering) {
            rendering.cancel();
            await rendering.promise.catch(() => {});
            rendering = undefined;
          }
          if (encoding) await encoding.catch(() => {});
          // Release the backing raster before admitting the next page.
          target.width = 0;
          target.height = 0;
        }
      } finally {
        clearTimeout(pageTimer);
        pageTimer = undefined;
        page.cleanup();
        page = undefined;
        pageStarted = undefined;
      }
    }
    check();
    return ordinal === null ? pages : selected;
  } catch (error) {
    if (reason) fail(reason);
    if (error?.name === "PasswordException") fail("LLM_DOCUMENT_ENCRYPTED");
    fail(codes.has(error?.message) ? error.message : "LLM_DOCUMENT_CORRUPT");
  } finally {
    clearTimeout(pageTimer);
    let cleanupFailed = false;
    try {
      rendering?.cancel();
      page?.cleanup();
    } catch {
      cleanupFailed = true;
    } finally {
      try {
        try {
          await destroy();
        } catch {
          cleanupFailed = true;
        } finally {
          await Promise.allSettled(pending);
        }
        if (cleanupFailed) fail("LLM_DOCUMENT_CORRUPT");
        check();
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    }
  }
}

/** Runs inside the single-request child; that boundary captures library warnings. */
export async function inspect(bytes, signal) {
  return renderDocument(bytes, null, signal);
}

/** Recreates one previously inspected page; the parent verifies its fixed hash. */
export async function redraw(bytes, ordinal, signal) {
  return renderDocument(bytes, ordinal, signal);
}

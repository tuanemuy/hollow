import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { isLlmOperationError } from "@repo/core/application/llm/ports";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import { PDF_LLM_LIMITS } from "@repo/core/domain/llm/pdfPreview";
import {
  afterAll,
  afterEach,
  describe,
  expect,
  it as registerTest,
  vi,
} from "vitest";
import { z } from "zod";
import { NodeLlmDocumentPreparer } from "./documentPreparer";
import { NodeLlmPdfClassifier } from "./pdfClassifier";
import {
  NodeLlmPdfPagesPreparer,
  type PdfPagesChildFactory,
} from "./pdfPagesPreparer";
import { inspect, redraw } from "./pdfPagesRenderer.mjs";

const failure = z.enum([
  "LLM_DOCUMENT_CORRUPT",
  "LLM_DOCUMENT_ENCRYPTED",
  "LLM_DOCUMENT_UNSUPPORTED",
  "LLM_RESOURCE_LIMIT",
  "LLM_TIMEOUT",
  "LLM_UNAVAILABLE",
]);
const pageSchema = z
  .object({
    ordinal: z.number().int().min(0).max(31),
    width: z.number().int().positive().max(1728),
    height: z.number().int().positive().max(1728),
    bytes: z
      .number()
      .int()
      .positive()
      .max(4 * 1024 * 1024),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
const replySchema = z.union([
  z
    .object({
      version: z.literal(1),
      ok: z.literal(true),
      pages: z.array(pageSchema).min(1).max(32),
    })
    .strict(),
  z
    .object({ version: z.literal(1), ok: z.literal(true), page: pageSchema })
    .strict(),
  z
    .object({ version: z.literal(1), ok: z.literal(false), code: failure })
    .strict(),
]);
type Reply = z.infer<typeof replySchema>;
type Page = Readonly<{
  draw?: string;
  width?: number;
  height?: number;
  rotate?: number;
  crop?: boolean;
  image?: boolean;
  annotation?: "appearance" | "missing";
  corrupt?: boolean;
}>;
type Feature = "normal" | "action" | "layer" | "form" | "encrypted";

function stream(bytes: Buffer | string, dictionary = ""): Buffer {
  const data = typeof bytes === "string" ? Buffer.from(bytes, "ascii") : bytes;
  return Buffer.concat([
    Buffer.from(`<< /Length ${data.length} ${dictionary} >>\nstream\n`),
    data,
    Buffer.from("\nendstream"),
  ]);
}

function pdf(pages: readonly Page[], feature: Feature = "normal"): Buffer {
  const objects: Buffer[] = [
    Buffer.alloc(0),
    Buffer.alloc(0),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];
  const ids: number[] = [];
  for (const page of pages) {
    const id = objects.length + 1;
    ids.push(id);
    objects.push(Buffer.alloc(0));
    const content = objects.length + 1;
    objects.push(
      page.corrupt
        ? stream(Buffer.from([1, 2, 3, 4]), "/Filter /FlateDecode")
        : stream(page.draw ?? ""),
    );
    let resources = "/Font << /F1 3 0 R >>";
    let annotations = "";
    if (page.image) {
      const image = objects.length + 1;
      objects.push(
        stream(
          deflateSync(
            Buffer.from([255, 0, 0, 0, 180, 0, 0, 0, 255, 255, 200, 0]),
          ),
          "/Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode",
        ),
      );
      resources += ` /XObject << /Im ${image} 0 R >>`;
    }
    if (page.annotation) {
      const appearance = objects.length + 1;
      objects.push(
        stream(
          "1 0 0 rg 0 0 80 20 re f",
          "/Type /XObject /Subtype /Form /BBox [0 0 80 20] /Resources << >>",
        ),
      );
      const annotation = objects.length + 1;
      objects.push(
        Buffer.from(
          `<< /Type /Annot /Subtype /Square /Rect [30 40 110 60] /F 4 ${page.annotation === "appearance" ? `/AP << /N ${appearance} 0 R >>` : ""} >>`,
        ),
      );
      annotations = ` /Annots [${annotation} 0 R]`;
    }
    objects[id - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width ?? 300} ${page.height ?? 400}] ${page.crop ? "/CropBox [20 30 280 370]" : ""} ${page.rotate ? `/Rotate ${page.rotate}` : ""} /Resources << ${resources} >> /Contents ${content} 0 R${annotations} >>`,
    );
  }
  let catalog = "";
  let trailer = "";
  if (feature === "action")
    catalog = "/OpenAction << /S /JavaScript /JS (ignored) >>";
  if (feature === "layer") {
    const id = objects.length + 1;
    objects.push(Buffer.from("<< /Type /OCG /Name (Layer) >>"));
    catalog = `/OCProperties << /OCGs [${id} 0 R] /D << /Order [] /ON [${id} 0 R] >> >>`;
  }
  if (feature === "form") {
    const id = objects.length + 1;
    objects.push(
      Buffer.from(
        `<< /Type /Annot /Subtype /Widget /FT /Tx /T (Field) /V (Value) /Rect [30 40 110 60] /P ${ids[0]} 0 R >>`,
      ),
    );
    catalog = `/AcroForm << /Fields [${id} 0 R] >>`;
  }
  if (feature === "encrypted") {
    const id = objects.length + 1;
    objects.push(
      Buffer.from(
        `<< /Filter /Standard /V 2 /R 3 /Length 128 /P -4 /O <${"00".repeat(32)}> /U <${"00".repeat(32)}> >>`,
      ),
    );
    trailer = `/Encrypt ${id} 0 R`;
  }
  objects[0] = Buffer.from(`<< /Type /Catalog /Pages 2 0 R ${catalog} >>`);
  objects[1] = Buffer.from(
    `<< /Type /Pages /Count ${ids.length} /Kids [${ids.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );
  const parts = [Buffer.from("%PDF-1.7\n", "ascii")];
  const offsets: number[] = [];
  let length = parts[0].length;
  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const part = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    parts.push(part);
    length += part.length;
  }
  parts.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${trailer} >>\nstartxref\n${length}\n%%EOF\n`,
    ),
  );
  return Buffer.concat(parts);
}

const text = "BT /F1 18 Tf 30 350 Td (Synthetic page) Tj ET";
const normal = () =>
  pdf([{ draw: text }, { draw: "0 0 1 RG 20 40 200 200 re S" }, {}]);
let transferred = 0;
let originals = 0;
const pending = new Set<Promise<number | null>>();
const children: Array<{
  child: ChildProcess;
  closed: Promise<void>;
  pipes: Set<unknown>;
}> = [];
const it = (name: string, run: () => Promise<void>) =>
  registerTest(name, run, 30000);

afterAll(async () => {
  await Promise.all(pending);
  expect(pending.size).toBe(0);
});
afterEach(async (context) => {
  vi.useRealTimers();
  await Promise.all(children.map((child) => child.closed));
  expect(children.every((child) => child.pipes.size === 4)).toBe(true);
  for (const { child } of children) {
    let gone = child.pid === undefined;
    if (child.pid !== undefined) {
      try {
        process.kill(child.pid, 0);
      } catch (error) {
        gone =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ESRCH";
      }
    }
    expect(gone).toBe(true);
  }
  context.task.meta.fixturePid = process.pid;
  context.task.meta.fixtureClosed = pending.size === 0;
  children.length = 0;
});

function owned(script?: string): PdfPagesChildFactory {
  return (file, args, options) => {
    if (
      children.some(
        (child) =>
          child.child.exitCode === null && child.child.signalCode === null,
      )
    )
      throw Error("FIXTURE_CONCURRENT");
    const child = spawn(
      file,
      script === undefined ? [...args] : ["-e", script],
      options,
    );
    const pipes = new Set<unknown>();
    for (const pipe of child.stdio) pipe?.once("close", () => pipes.add(pipe));
    const closed = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    children.push({ child, closed, pipes });
    return child;
  };
}
function preparer(script?: string) {
  return new NodeLlmPdfPagesPreparer(
    fileURLToPath(new URL("./pdfPagesChild.mjs", import.meta.url)),
    owned(script),
  );
}
function sourceInput(bytes = normal()) {
  return {
    bytes,
    source: {
      kind: "original" as const,
      format: "pdf" as const,
      originalId: "self-pdf",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}
async function failureCode(work: Promise<unknown>) {
  try {
    await work;
    return "ACCEPTED";
  } catch (error) {
    return isLlmOperationError(error) && error.closed ? error.code : "UNPROVEN";
  }
}

async function child(source: Buffer, action = "prepare", ordinal?: string) {
  if (
    pending.size ||
    source.length > 65536 ||
    originals + source.length > 2 * 1024 * 1024 ||
    transferred + source.length + 4 * 1024 * 1024 + 65536 > 64 * 1024 * 1024
  )
    throw new Error("FIXTURE_LIMIT");
  originals += source.length;
  const processChild = spawn(
    process.execPath,
    [fileURLToPath(new URL("./pdfPagesChild.mjs", import.meta.url))],
    {
      env: {
        NODE_DISABLE_COMPILE_CACHE: "1",
        LANG: "C",
        TZ: "UTC",
        HOLLOW_PDF_PAGES_ACTION: action,
        ...(ordinal === undefined ? {} : { HOLLOW_PDF_PAGES_ORDINAL: ordinal }),
      },
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    },
  );
  const raster = processChild.stdio[3];
  if (!(raster instanceof Readable)) throw new Error("FIXTURE_PIPE");
  const pipes = [
    processChild.stdin,
    processChild.stdout,
    processChild.stderr,
    raster,
  ];
  let closes = 0;
  let ioError = false;
  let timedOut = false;
  let overflow = false;
  let metadataBytes = 0;
  let pngBytes = 0;
  let stderrBytes = 0;
  const metadata: Buffer[] = [];
  const png: Buffer[] = [];
  const closed = pipes.map(
    (pipe) =>
      new Promise<void>((resolve) => {
        pipe.once("close", () => {
          closes++;
          resolve();
        });
        pipe.on("error", () => {
          ioError = true;
        });
      }),
  );
  const exit = new Promise<number | null>((resolve) => {
    processChild.once("error", () => {
      ioError = true;
    });
    processChild.once("close", resolve);
  });
  pending.add(exit);
  let terminationRequested = false;
  const terminate = () => {
    if (terminationRequested) return;
    terminationRequested = true;
    processChild.kill("SIGTERM");
  };
  const timer = setTimeout(() => {
    timedOut = true;
    terminate();
  }, 15000);
  processChild.stdout.on("data", (chunk: Buffer) => {
    metadataBytes += chunk.length;
    if (metadataBytes <= 65536) metadata.push(chunk);
    else {
      overflow = true;
      terminate();
    }
  });
  raster.on("data", (chunk: Buffer) => {
    pngBytes += chunk.length;
    if (pngBytes <= 4 * 1024 * 1024) png.push(chunk);
    else {
      overflow = true;
      terminate();
    }
  });
  processChild.stderr.on("data", (chunk: Buffer) => {
    stderrBytes += chunk.length;
    if (stderrBytes > 4096) {
      overflow = true;
      terminate();
    }
  });
  try {
    processChild.stdin.end(source);
    const code = await exit;
    await Promise.all(closed);
    transferred += source.length + metadataBytes + pngBytes + stderrBytes;
    let reply: Reply;
    try {
      reply = replySchema.parse(
        JSON.parse(Buffer.concat(metadata).toString("utf8")),
      );
    } catch {
      throw new Error("FIXTURE_PROTOCOL");
    }
    return {
      reply,
      png: Buffer.concat(png),
      code,
      closes,
      timedOut,
      overflow,
      ioError,
      stderrBytes,
    };
  } finally {
    clearTimeout(timer);
    for (const pipe of pipes) if (!pipe.destroyed) pipe.destroy();
    await exit;
    await Promise.all(closed);
    pending.delete(exit);
  }
}

function closed(result: Awaited<ReturnType<typeof child>>): void {
  expect(result.closes).toBe(4);
  expect(result.timedOut || result.overflow || result.ioError).toBe(false);
  expect(result.stderrBytes).toBe(0);
}
async function rejected(
  source: Buffer,
  expected: z.infer<typeof failure>,
): Promise<void> {
  const result = await child(source);
  closed(result);
  expect(result.reply.ok).toBe(false);
  expect(result.png.length).toBe(0);
  expect(result.code).toBe(1);
  if (result.reply.ok) throw new Error("FIXTURE_UNEXPECTED_SUCCESS");
  expect(result.reply.code).toBe(expected);
}

describe("PDF page renderer / single-request child", () => {
  it("inspects every text/vector/blank page without returning PNG", async () => {
    const result = await child(normal());
    closed(result);
    expect(result.code).toBe(0);
    expect(
      result.reply.ok &&
        "pages" in result.reply &&
        result.reply.pages.length === 3,
    ).toBe(true);
    expect(result.png.length).toBe(0);
    if (!result.reply.ok || !("pages" in result.reply))
      throw new Error("FIXTURE_SHAPE");
    expect(
      result.reply.pages.every(
        (page, ordinal) =>
          page.ordinal === ordinal && page.width === 600 && page.height === 800,
      ),
    ).toBe(true);
  });

  it("redraws exact ordinal and metadata/hash, including the blank final page", async () => {
    const source = normal();
    const prepared = await child(source);
    closed(prepared);
    if (!prepared.reply.ok || !("pages" in prepared.reply))
      throw new Error("FIXTURE_SHAPE");
    for (const page of prepared.reply.pages) {
      const result = await child(source, "redraw", String(page.ordinal));
      closed(result);
      expect(result.code).toBe(0);
      expect(
        result.reply.ok &&
          "page" in result.reply &&
          JSON.stringify(result.reply.page) === JSON.stringify(page),
      ).toBe(true);
      expect(
        result.png.length === page.bytes &&
          createHash("sha256").update(result.png).digest("hex") === page.sha256,
      ).toBe(true);
      expect(
        result.png
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      ).toBe(true);
    }
  });

  it("retains image/mixed/column pages as three ordered rasters", async () => {
    const source = pdf([
      { image: true, draw: "q 200 0 0 200 50 100 cm /Im Do Q" },
      { image: true, draw: `${text}\nq 140 0 0 140 80 100 cm /Im Do Q` },
      { draw: `${text}\nBT /F1 18 Tf 160 250 Td (Second column) Tj ET` },
    ]);
    const result = await child(source);
    closed(result);
    expect(
      result.reply.ok &&
        "pages" in result.reply &&
        result.reply.pages.length === 3,
    ).toBe(true);
  });

  it("honors rotation/CropBox and vetted Square appearance", async () => {
    const result = await child(
      pdf([
        { draw: text, rotate: 90 },
        { draw: text, crop: true },
        { annotation: "appearance" },
      ]),
    );
    closed(result);
    if (!result.reply.ok || !("pages" in result.reply))
      throw new Error("FIXTURE_SHAPE");
    expect(
      result.reply.pages[0].width === 800 &&
        result.reply.pages[0].height === 600,
    ).toBe(true);
    expect(
      result.reply.pages[1].width === 520 &&
        result.reply.pages[1].height === 680,
    ).toBe(true);
    expect(result.reply.pages.length).toBe(3);
  });

  it("rejects the whole document when the last stream warns or fails", async () => {
    await rejected(
      pdf([{ draw: text }, {}, { corrupt: true }]),
      "LLM_DOCUMENT_CORRUPT",
    );
  });
  it("rejects the whole document when the last page exceeds dimensions", async () => {
    await rejected(pdf([{}, {}, { width: 865 }]), "LLM_RESOURCE_LIMIT");
  });
  it("accepts the exact 1728px edge without lowering resolution", async () => {
    const result = await child(pdf([{ width: 864, height: 10 }]));
    closed(result);
    expect(
      result.reply.ok &&
        "pages" in result.reply &&
        result.reply.pages[0].width === 1728 &&
        result.reply.pages[0].height === 20,
    ).toBe(true);
  });
  it("requires appearance rather than silently dropping annotations", async () => {
    await rejected(
      pdf([{ annotation: "missing" }]),
      "LLM_DOCUMENT_UNSUPPORTED",
    );
  });
  for (const feature of ["action", "layer", "form"] as const)
    it(`rejects ${feature} without partial output`, async () => {
      await rejected(pdf([{}], feature), "LLM_DOCUMENT_UNSUPPORTED");
    });
  it("rejects encrypted content without exposing the library exception", async () => {
    await rejected(pdf([{}], "encrypted"), "LLM_DOCUMENT_ENCRYPTED");
  });
  it("allows exactly 32 small pages and refuses 33", async () => {
    const result = await child(
      pdf(Array.from({ length: 32 }, () => ({ width: 10, height: 10 }))),
    );
    closed(result);
    expect(
      result.reply.ok &&
        "pages" in result.reply &&
        result.reply.pages.length === 32,
    ).toBe(true);
    await rejected(
      pdf(Array.from({ length: 33 }, () => ({ width: 10, height: 10 }))),
      "LLM_RESOURCE_LIMIT",
    );
  });
  it("rejects malformed input with finite metadata only", async () => {
    await rejected(
      Buffer.from("invalid synthetic input"),
      "LLM_DOCUMENT_CORRUPT",
    );
  });
  it("rejects a redraw ordinal outside the document", async () => {
    const result = await child(normal(), "redraw", "3");
    closed(result);
    expect(
      !result.reply.ok && result.reply.code === "LLM_DOCUMENT_UNSUPPORTED",
    ).toBe(true);
    expect(result.png.length).toBe(0);
  });
  it("rejects noncanonical protocol ordinals before library work", async () => {
    const result = await child(normal(), "redraw", "01");
    closed(result);
    expect(
      !result.reply.ok && result.reply.code === "LLM_DOCUMENT_UNSUPPORTED",
    ).toBe(true);
  });
  it("rejects pre-aborted direct calls without a global console hook", async () => {
    const original = console.warn;
    const controller = new AbortController();
    controller.abort();
    for (const run of [
      () => inspect(normal(), controller.signal),
      () => redraw(normal(), 0, controller.signal),
    ]) {
      let code = "SUCCESS";
      try {
        await run();
      } catch (error) {
        code =
          error instanceof Error && failure.safeParse(error.message).success
            ? error.message
            : "UNSAFE_ERROR";
      }
      expect(code).toBe("LLM_UNAVAILABLE");
    }
    expect(console.warn === original).toBe(true);
  });
  it("parent binds source and all page metadata then verifies every redraw", async () => {
    const input = sourceInput();
    const adapter = preparer();
    const signal = new AbortController().signal;
    const manifest = await adapter.prepare(input, signal);
    expect(
      manifest.total === 3 &&
        manifest.source.originalId === input.source.originalId,
    ).toBe(true);
    for (const page of manifest.pages) {
      const raster = await adapter.redraw({ ...input, manifest, page }, signal);
      expect(
        raster.bytes.length === page.bytes &&
          raster.width === page.width &&
          raster.height === page.height,
      ).toBe(true);
    }
    expect(
      (await failureCode(
        adapter.redraw(
          {
            ...input,
            manifest: { ...manifest, sha256: "0".repeat(64) },
            page: manifest.pages[0],
          },
          signal,
        ),
      )) === "LLM_SOURCE_CHANGED",
    ).toBe(true);
  });
  it("parent discards early binary when final metadata reports a late failure", async () => {
    const signal = new AbortController().signal;
    const input = sourceInput();
    const manifest = await preparer().prepare(input, signal);
    const script = `const fs=require('node:fs');process.stdin.resume();process.stdin.on('end',()=>{fs.writeSync(3,Buffer.alloc(100));fs.closeSync(3);process.stdout.end(JSON.stringify({version:1,ok:false,code:'LLM_DOCUMENT_CORRUPT'}));process.exitCode=1;});`;
    expect(
      (await failureCode(
        preparer(script).redraw(
          { ...input, manifest, page: manifest.pages[0] },
          signal,
        ),
      )) === "LLM_DOCUMENT_CORRUPT",
    ).toBe(true);
  });
  it("parent refuses oversized metadata before retaining excess and waits for closure", async () => {
    const script = `process.stdin.resume();process.stdin.on('end',()=>process.stdout.end(Buffer.alloc(65537,32)));`;
    expect(
      (await failureCode(
        preparer(script).prepare(sourceInput(), new AbortController().signal),
      )) === "LLM_RESOURCE_LIMIT",
    ).toBe(true);
  });
  it("classifier preserves strict identity and only visual/order rejection selects pages", async () => {
    const document = new NodeLlmDocumentPreparer(
      new URL("./documentWorker.mjs", import.meta.url),
    );
    const classifier = new NodeLlmPdfClassifier(document, preparer());
    const signal = new AbortController().signal;
    const input = sourceInput(pdf([{ draw: text }]));
    const strict = await document.prepare(
      { ...input, preparationVersion: 2, promptVersion: 1 },
      signal,
    );
    const choice = await classifier.classify(input, signal);
    expect(
      choice.kind === "strict-text" &&
        choice.preparedDocumentHash === strict.identity.sha256,
    ).toBe(true);
    const visual = sourceInput(
      pdf([
        { image: true, draw: "q 200 0 0 200 50 100 cm /Im Do Q" },
        { image: true, draw: `${text}\nq 140 0 0 140 80 100 cm /Im Do Q` },
        { draw: `${text}\nBT /F1 18 Tf 160 250 Td (Second column) Tj ET` },
      ]),
    );
    const pages = await classifier.classify(visual, signal);
    expect(pages.kind === "pages" && pages.manifest.total === 3).toBe(true);
  });
  it("classifier never converts corrupt content into a page fallback", async () => {
    const document = new NodeLlmDocumentPreparer(
      new URL("./documentWorker.mjs", import.meta.url),
    );
    const classifier = new NodeLlmPdfClassifier(document, preparer());
    const input = sourceInput(pdf([{ draw: text }, {}, { corrupt: true }]));
    expect(
      (await failureCode(
        classifier.classify(input, new AbortController().signal),
      )) === "LLM_DOCUMENT_CORRUPT",
    ).toBe(true);
  });
  it("owner rejects the first excess raster byte and awaits actual four-pipe closure", async () => {
    const input = sourceInput();
    const signal = new AbortController().signal;
    const manifest = await preparer().prepare(input, signal);
    const script = `const fs=require('node:fs');process.stdin.resume();process.stdin.on('end',()=>{for(let i=0;i<65;i++)fs.writeSync(3,Buffer.alloc(i===64?1:65536));});`;
    expect(
      (await failureCode(
        preparer(script).redraw(
          { ...input, manifest, page: manifest.pages[0] },
          signal,
        ),
      )) === "LLM_RESOURCE_LIMIT",
    ).toBe(true);
  });
  it("owner abort observes real close rather than counting SIGTERM as proof", async () => {
    const controller = new AbortController();
    const work = preparer(
      "process.stdin.resume();process.stdout.write(' ');setTimeout(()=>process.exit(0),2000);",
    ).prepare(sourceInput(), controller.signal);
    const child = children.at(-1)?.child;
    if (!child?.stdout) throw Error("FIXTURE_CHILD");
    await new Promise<void>((resolve) =>
      child.stdout?.once("data", () => resolve()),
    );
    controller.abort();
    expect((await failureCode(work)) === "LLM_UNAVAILABLE").toBe(true);
    expect(children.every((child) => child.pipes.size === 4)).toBe(true);
  });
  it("owner deadline retains unknown until a bounded self-exiting child actually closes", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const work = preparer(
      "process.on('SIGTERM',()=>{});process.stdin.resume();process.stdout.write(' ');setTimeout(()=>process.exit(0),1500);",
    ).prepare(sourceInput(), controller.signal);
    const result = work.then(
      () => ({ code: "ACCEPTED", closed: true }),
      (error) =>
        isLlmOperationError(error)
          ? { code: error.code, closed: error.closed }
          : { code: "UNEXPECTED", closed: false },
    );
    const child = children.at(-1)?.child;
    if (!child?.stdout) throw Error("FIXTURE_CHILD");
    await new Promise<void>((resolve) =>
      child.stdout?.once("data", () => resolve()),
    );
    await vi.advanceTimersByTimeAsync(
      PDF_LLM_LIMITS.prepareMs + LLM_LIMITS.stopMs,
    );
    const unknown = await result;
    expect(
      unknown.code === "LLM_OWNERSHIP_UNKNOWN" &&
        !unknown.closed &&
        child.exitCode === null,
    ).toBe(true);
    vi.useRealTimers();
    await Promise.all(children.map((child) => child.closed));
    expect(children.every((child) => child.pipes.size === 4)).toBe(true);
  });
});

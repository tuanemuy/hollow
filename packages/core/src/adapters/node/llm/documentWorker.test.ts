import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { deflateSync } from "node:zlib";
import type {
  LlmDocumentPreparedSource,
  LlmPrepareInput,
} from "@repo/core/application/llm/ports";
import type {
  LlmDocumentFormat,
  LlmFailure,
} from "@repo/core/domain/llm/entity";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  documentManifestHash,
  documentSegmentHash,
} from "./documentIdentity.mjs";
import { classifyLayout } from "./documentPdfLayout.mjs";
import { classifyOperators } from "./documentPdfOperators.mjs";

type Reply =
  | { ok: true; value: LlmDocumentPreparedSource }
  | { ok: false; code: LlmFailure };
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";

type LayoutItem = {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
};
const layoutItem = (
  str = "Text",
  x = 40,
  y = 240,
  width = 24,
  em = 12,
  extra: Partial<LayoutItem> = {},
): LayoutItem => ({
  str,
  dir: "ltr",
  transform: [em, 0, 0, em, x, y],
  width,
  height: em,
  ...extra,
});
type LayoutCase = readonly [string, readonly LayoutItem[], number | string];
const layoutCases: readonly LayoutCase[] = [
  ["empty", [], "empty"],
  ["one-horizontal-line", [layoutItem()], 1],
  [
    "ordinary-two-left-aligned-lines",
    [layoutItem(), layoutItem("Next", 40, 220)],
    2,
  ],
  [
    "heading-font-size-and-body",
    [layoutItem("Heading", 40, 240, 84, 24), layoutItem("Body", 40, 200)],
    2,
  ],
  ["whole-word-run", [layoutItem("Hello world", 40, 240, 66)], 1],
  [
    "same-text-adjacent-fragments",
    [layoutItem("Hello ", 40, 240, 36), layoutItem("world", 76, 240, 30)],
    1,
  ],
  [
    "same-text-separate-space-fragment",
    [
      layoutItem("Hello", 40, 240, 30),
      layoutItem(" ", 70, 240, 3),
      layoutItem("world", 73, 240, 30),
    ],
    1,
  ],
  [
    "same-cjk-one-em-space-whole-run",
    [layoutItem("日本語 第一頁", 40, 240, 126, 18)],
    1,
  ],
  [
    "same-cjk-one-em-space-fragmented",
    [
      layoutItem("日本語", 40, 240, 54, 18),
      layoutItem(" ", 94, 240, 18, 18, { height: 0 }),
      layoutItem("第一頁", 112, 240, 54, 18),
    ],
    1,
  ],
  [
    "explicit-space-over-one-em",
    [
      layoutItem(),
      layoutItem(" ", 64, 240, 12.001, 12, { height: 0 }),
      layoutItem("Other", 76.001),
    ],
    "AMBIGUOUS_SPACING",
  ],
  [
    "large-column-gap-space-item",
    [
      layoutItem("Left", 40),
      layoutItem(" ", 64, 240, 171, 12, { height: 0 }),
      layoutItem("Right", 235),
    ],
    "AMBIGUOUS_SPACING",
  ],
  [
    "consecutive-space-items",
    [
      layoutItem(),
      layoutItem(" ", 64, 240, 3, 12, { height: 0 }),
      layoutItem(" ", 67, 240, 3, 12, { height: 0 }),
      layoutItem("Next", 70),
    ],
    "AMBIGUOUS_SPACING",
  ],
  [
    "space-not-adjacent-to-left",
    [
      layoutItem(),
      layoutItem(" ", 66, 240, 3, 12, { height: 0 }),
      layoutItem("Next", 69),
    ],
    "ROW_GAP",
  ],
  [
    "space-not-adjacent-to-right",
    [
      layoutItem(),
      layoutItem(" ", 64, 240, 3, 12, { height: 0 }),
      layoutItem("Next", 69),
    ],
    "ROW_GAP",
  ],
  [
    "zero-height-non-space",
    [layoutItem("Text", 40, 240, 24, 12, { height: 0 })],
    "INVALID_METRICS",
  ],
  [
    "space-invalid-metric",
    [layoutItem(), layoutItem(" ", 64, 240, 3, 12, { height: Number.NaN })],
    "INVALID_METRICS",
  ],
  [
    "cjk-contiguous-fragments",
    [layoutItem("日", 40, 240, 12), layoutItem("本語", 52, 240, 24)],
    1,
  ],
  [
    "font-run-change",
    [layoutItem("Text", 40, 240, 24), layoutItem("bold", 68, 240, 20, 10)],
    1,
  ],
  [
    "same-row-baseline-tolerance",
    [layoutItem(), layoutItem("Near", 64, 239.4)],
    1,
  ],
  ["row-gap-exact-half-em", [layoutItem(), layoutItem("Near", 70)], 1],
  [
    "row-gap-over-half-em",
    [layoutItem(), layoutItem("Near", 70.001)],
    "ROW_GAP",
  ],
  [
    "two-columns-row-major",
    [
      layoutItem("Left", 40),
      layoutItem("Right", 235),
      layoutItem("Left", 40, 210),
      layoutItem("Right", 235, 210),
    ],
    "ROW_GAP",
  ],
  [
    "two-columns-column-major",
    [
      layoutItem("Left", 40),
      layoutItem("Left", 40, 210),
      layoutItem("Right", 235),
      layoutItem("Right", 235, 210),
    ],
    "VERTICAL_ORDER",
  ],
  [
    "staggered-columns",
    [
      layoutItem("Left", 40),
      layoutItem("Right", 235, 225),
      layoutItem("Left", 40, 210),
    ],
    "MULTIPLE_ANCHORS",
  ],
  [
    "single-displaced-second-line",
    [layoutItem(), layoutItem("Next", 100, 220)],
    "MULTIPLE_ANCHORS",
  ],
  ["anchor-exact-half-em", [layoutItem(), layoutItem("Next", 46, 220)], 2],
  [
    "anchor-over-half-em",
    [layoutItem(), layoutItem("Next", 46.001, 220)],
    "MULTIPLE_ANCHORS",
  ],
  [
    "anchor-does-not-drift-per-row",
    [layoutItem(), layoutItem("Next", 45, 220), layoutItem("Next", 50, 200)],
    "MULTIPLE_ANCHORS",
  ],
  [
    "centered-heading-not-proven-column",
    [layoutItem("Heading", 150), layoutItem("Body", 40, 200)],
    "MULTIPLE_ANCHORS",
  ],
  [
    "paragraph-indent-one-em-not-supported",
    [layoutItem(), layoutItem("Next", 52, 210)],
    "MULTIPLE_ANCHORS",
  ],
  [
    "vertical-overlap",
    [layoutItem(), layoutItem("Next", 40, 234)],
    "OVERLAPPING_LINES",
  ],
  [
    "line-advance-exact",
    [layoutItem("First", 40, 240, 25, 10), layoutItem("Next", 40, 230, 20, 10)],
    2,
  ],
  [
    "line-advance-under",
    [
      layoutItem("First", 40, 240, 25, 10),
      layoutItem("Next", 40, 230.001, 20, 10),
    ],
    "OVERLAPPING_LINES",
  ],
  [
    "same-row-backwards",
    [layoutItem("Right", 100), layoutItem("Left", 40)],
    "OVERLAPPING_RUNS",
  ],
  [
    "same-row-overlap",
    [layoutItem(), layoutItem("Other", 63)],
    "OVERLAPPING_RUNS",
  ],
  ["minor-kerning-overlap", [layoutItem(), layoutItem("Near", 63.5)], 1],
  [
    "vertical-text",
    [layoutItem("Text", 40, 240, 24, 12, { dir: "ttb" })],
    "DIRECTION_OR_ROTATION",
  ],
  [
    "rtl-text",
    [layoutItem("Text", 40, 240, 24, 12, { dir: "rtl" })],
    "DIRECTION_OR_ROTATION",
  ],
  [
    "rotation",
    [
      layoutItem("Text", 40, 240, 24, 12, {
        transform: [0, 12, -12, 0, 40, 240],
      }),
    ],
    "DIRECTION_OR_ROTATION",
  ],
  ["invalid-nan", [layoutItem("Text", 40, 240, Number.NaN)], "INVALID_METRICS"],
  ["invalid-zero-width", [layoutItem("Text", 40, 240, 0)], "INVALID_METRICS"],
  ["outside-page", [layoutItem("Text", 395)], "OUTSIDE_PAGE"],
  [
    "repeated-whitespace-inside-one-run",
    [layoutItem("Left   Right", 40, 240, 100)],
    "AMBIGUOUS_SPACING",
  ],
  ["stretched-one-run", [layoutItem("A B", 40, 240, 200)], "AMBIGUOUS_SPACING"],
  [
    "whitespace-only-not-proven-blank",
    [layoutItem(" ", 40, 240, 3)],
    "WHITESPACE_ONLY",
  ],
];

describe("adopted PDF left-column-v1 pure boundaries", () => {
  it.each(layoutCases)("%s", (_name, items, expected) => {
    const result = classifyLayout(items, [0, 0, 400, 300]);
    if (expected === "empty") expect(result.kind).toBe("empty");
    else if (typeof expected === "number") {
      expect(result.kind).toBe("single-column");
      if (result.kind === "single-column") expect(result.lines).toBe(expected);
    } else {
      expect(result.kind).toBe("indeterminate");
      if (result.kind === "indeterminate") expect(result.reason).toBe(expected);
    }
  });
  it("does not mutate full text or input when column order is indeterminate", () => {
    const items = [
      layoutItem("Left", 40),
      layoutItem("Right", 235),
      layoutItem("Left", 40, 210),
      layoutItem("Right", 235, 210),
    ];
    const before = JSON.stringify(items);
    expect(classifyLayout(items, [0, 0, 400, 300]).kind).toBe("indeterminate");
    expect(JSON.stringify(items) === before).toBe(true);
  });
});

const operatorNames = [
  "save",
  "restore",
  "transform",
  "setFillRGBColor",
  "setFillGray",
  "setFillColorSpace",
  "setFillColor",
  "showText",
  "eoClip",
  "constructPath",
  "endPath",
  "eoFill",
  "stroke",
  "beginMarkedContentProps",
  "setGState",
  "paintImageXObject",
  "setLineWidth",
];
const operatorCodes: Readonly<Record<string, number>> = Object.fromEntries(
  operatorNames.map((name, index) => [name, index + 1]),
);
type OperatorRow = readonly [string, ...unknown[]];
const pageRect = new Float32Array([
  0, 0, 0, 1, 720, 0, 1, 720, 540, 1, 0, 540, 4,
]);
const pathOperator = (paint: string, data = pageRect): OperatorRow => [
  "constructPath",
  operatorCodes[paint],
  [data],
  [0, 0, 720, 540],
];
type OperatorCase = readonly [
  string,
  readonly OperatorRow[],
  "clean" | "visual" | "unknown",
];
const operatorCases: readonly OperatorCase[] = [
  [
    "full-white-background",
    [["setFillRGBColor", "#ffffff"], pathOperator("eoFill"), ["showText"]],
    "clean",
  ],
  [
    "full-page-clip",
    [["eoClip"], pathOperator("endPath"), ["showText"]],
    "clean",
  ],
  [
    "color-not-background",
    [["setFillRGBColor", "#ffeeff"], pathOperator("eoFill")],
    "visual",
  ],
  ["unknown-color-not-background", [pathOperator("eoFill")], "visual"],
  [
    "white-after-text",
    [["setFillRGBColor", "#ffffff"], ["showText"], pathOperator("eoFill")],
    "visual",
  ],
  [
    "partial-white-rectangle",
    [
      ["setFillRGBColor", "#ffffff"],
      pathOperator(
        "eoFill",
        new Float32Array([0, 0, 0, 1, 700, 0, 1, 700, 540, 1, 0, 540, 4]),
      ),
    ],
    "visual",
  ],
  [
    "curve-is-visual",
    [
      ["setFillRGBColor", "#ffffff"],
      pathOperator(
        "eoFill",
        new Float32Array([0, 0, 0, 2, 720, 0, 720, 540, 0, 540, 4]),
      ),
    ],
    "visual",
  ],
  [
    "diagonal-polygon",
    [
      ["setFillRGBColor", "#ffffff"],
      pathOperator(
        "eoFill",
        new Float32Array([0, 0, 0, 1, 720, 540, 1, 720, 0, 1, 0, 540, 4]),
      ),
    ],
    "visual",
  ],
  ["stroked-rectangle", [pathOperator("stroke")], "visual"],
  [
    "unknown-graphics-state",
    [["setGState"], ["setFillRGBColor", "#ffffff"], pathOperator("eoFill")],
    "unknown",
  ],
  ["optional-content", [["beginMarkedContentProps", "OC"]], "unknown"],
  ["non-oc-mark", [["beginMarkedContentProps", "Span"]], "clean"],
  [
    "nonidentity-transform",
    [
      ["transform", 2, 0, 0, 2, 0, 0],
      ["setFillRGBColor", "#ffffff"],
      pathOperator("eoFill"),
    ],
    "visual",
  ],
  [
    "restore-white-scope",
    [
      ["save"],
      ["setFillRGBColor", "#ffffff"],
      ["restore"],
      pathOperator("eoFill"),
    ],
    "visual",
  ],
  ["unmatched-restore", [["restore"]], "unknown"],
  ["unclosed-save", [["save"]], "unknown"],
  ["pending-clip", [["eoClip"]], "unknown"],
  ["image-is-visual", [["paintImageXObject"]], "visual"],
  [
    "line-width-is-state-not-ink",
    [["setLineWidth", 0.1], ["showText"]],
    "clean",
  ],
  [
    "nonfinite-path",
    [
      ["setFillRGBColor", "#ffffff"],
      pathOperator(
        "eoFill",
        new Float32Array([
          0,
          0,
          0,
          1,
          Number.NaN,
          0,
          1,
          720,
          540,
          1,
          0,
          540,
          4,
        ]),
      ),
    ],
    "visual",
  ],
];
describe("adopted PDF operator pure boundaries", () => {
  it.each(operatorCases)("%s", (_name, rows, expected) => {
    const result = classifyOperators(
      {
        fnArray: rows.map((row) => operatorCodes[row[0]]),
        argsArray: rows.map((row) => row.slice(1)),
      },
      operatorCodes,
      [0, 0, 720, 540],
      new Set(["showText"]),
    );
    expect(
      expected === "clean"
        ? !result.visual && !result.unknown
        : result[expected],
    ).toBe(true);
  });
});
function crc(bytes: Buffer) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function zip(
  parts: Readonly<Record<string, string | Buffer>>,
  encrypted = false,
) {
  const files: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, input] of Object.entries(parts)) {
    const value = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const stored = encrypted ? Buffer.concat([Buffer.alloc(12), value]) : value;
    const filename = Buffer.from(name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(encrypted ? 1 : 0, 6);
    header.writeUInt32LE(crc(value), 14);
    header.writeUInt32LE(stored.length, 18);
    header.writeUInt32LE(value.length, 22);
    header.writeUInt16LE(filename.length, 26);
    files.push(header, filename, stored);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(encrypted ? 1 : 0, 8);
    directory.writeUInt32LE(crc(value), 16);
    directory.writeUInt32LE(stored.length, 20);
    directory.writeUInt32LE(value.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += header.length + filename.length + stored.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(Buffer.concat(central).length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, ...central, end]);
}
const relationships = (body: string) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
const relation = (id: string, type: string, target: string, external = false) =>
  `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"${external ? ' TargetMode="External"' : ""}/>`;
const p = (text: string, properties = "") =>
  `<w:p>${properties}<w:r><w:t>${text}</w:t></w:r></w:p>`;
function docx(
  body: string,
  additions: Readonly<Record<string, string | Buffer>> = {},
) {
  return zip({
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "word/document.xml"),
    ),
    "word/document.xml": `<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}</w:body></w:document>`,
    ...additions,
  });
}
function pptxBody(body: string, notes = "") {
  return zip({
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": relationships(
      relation("r1", "officeDocument", "ppt/presentation.xml"),
    ),
    "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="1" r:id="s1"/></p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": relationships(
      relation("s1", "slide", "slides/slide1.xml"),
    ),
    "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`,
    ...(notes
      ? {
          "ppt/slides/_rels/slide1.xml.rels": relationships(
            relation("n1", "notesSlide", "../notesSlides/notesSlide1.xml"),
          ),
          "ppt/notesSlides/notesSlide1.xml": `<p:notes xmlns:p="${P}" xmlns:a="${A}">${notes}</p:notes>`,
        }
      : {}),
  });
}
const pptxRun = (value: string) =>
  `<a:r><a:t xml:space="preserve">${value}</a:t></a:r>`;
const pptxCell = (value: string) =>
  `<a:tbl><a:tr><a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${value}</a:txBody></a:tc></a:tr></a:tbl>`;
function pdf(
  contents: readonly string[],
  streamMode?: Readonly<{ page: number; kind: "corrupt" | "flate" }>,
) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${contents.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${contents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, content] of contents.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
    );
    const encoded = streamMode?.page === index;
    const stream = encoded
      ? `${(streamMode.kind === "corrupt" ? Buffer.from([1, 2, 3, 4]) : deflateSync(content)).toString("hex")}>`
      : content;
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)}${encoded ? " /Filter [/ASCIIHexDecode /FlateDecode]" : ""} >>\nstream\n${stream}\nendstream`,
    );
  }
  let body = "%PDF-1.7\n";
  const positions = [0];
  for (const [index, value] of objects.entries()) {
    positions.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${value}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${positions
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}
const textPdf = "BT /F1 12 Tf 30 340 Td (First) Tj 0 -20 Td (Second) Tj ET";
function input(
  bytes: Buffer,
  format: LlmDocumentFormat,
): Extract<LlmPrepareInput, { preparationVersion: 2 }> {
  return {
    bytes,
    source: {
      kind: "original",
      originalId: "synthetic-document",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      format,
    },
    preparationVersion: 2,
    promptVersion: 1,
  };
}
async function run(value: LlmPrepareInput): Promise<Reply> {
  const worker = new Worker(new URL("./documentWorker.mjs", import.meta.url), {
    workerData: value,
    stdout: true,
    stderr: true,
    resourceLimits: {
      maxOldGenerationSizeMb: 256,
      maxYoungGenerationSizeMb: 16,
      stackSizeMb: 4,
    },
  });
  const pipe = (stream: NodeJS.ReadableStream) =>
    new Promise<void>((resolve) => {
      stream.once("close", resolve);
      stream.once("end", resolve);
      stream.resume();
    });
  const pipes = [pipe(worker.stdout), pipe(worker.stderr)];
  let reply: Reply | undefined;
  let failed = false;
  let exited = false;
  worker.on("message", (message: Reply) => {
    reply = message;
  });
  worker.on("error", () => {
    failed = true;
  });
  const closed = new Promise<number>((resolve) =>
    worker.once("exit", (code) => {
      exited = true;
      resolve(code);
    }),
  );
  const timer = setTimeout(() => {
    void worker.terminate();
  }, 10000);
  try {
    const exit = await closed;
    await Promise.all(pipes);
    if (failed || exit !== 0 || !reply)
      throw new Error("SYNTHETIC_DOCUMENT_WORKER_FAILED");
    return reply;
  } finally {
    clearTimeout(timer);
    if (!exited) await worker.terminate();
    await closed;
    await Promise.all(pipes);
  }
}
function prepared(reply: Reply) {
  if (!reply.ok) throw new Error(`SYNTHETIC_DOCUMENT_${reply.code}`);
  return reply.value;
}
const html = (value: LlmDocumentPreparedSource) =>
  value.segments.map((segment) => segment.html).join("");
function coverage(
  value: LlmDocumentPreparedSource,
  source: LlmPrepareInput["source"],
) {
  let count = 0;
  for (const [ordinal, segment] of value.segments.entries()) {
    expect(segment.identity.ordinal).toBe(ordinal);
    expect(segment.firstBlock).toBe(count);
    expect(segment.blockCount).toBeGreaterThan(0);
    expect(Buffer.byteLength(segment.html)).toBeLessThanOrEqual(65536);
    count += segment.blockCount;
  }
  expect(count).toBe(value.blocks);
  const manifest = createHash("sha256")
    .update(
      JSON.stringify([
        "hollow.prepare",
        2,
        source.format,
        source.sha256,
        value.coverage,
        value.notices,
        value.segments.map((s) => [
          s.identity.ordinal,
          s.firstBlock,
          s.blockCount,
          s.html,
        ]),
      ]),
    )
    .digest("hex");
  expect(value.identity.sha256 === manifest).toBe(true);
  for (const segment of value.segments)
    expect(
      segment.identity.sha256 ===
        createHash("sha256")
          .update(
            JSON.stringify([
              "hollow.segment",
              2,
              manifest,
              segment.identity.ordinal,
              segment.firstBlock,
              segment.blockCount,
              segment.html,
            ]),
          )
          .digest("hex"),
    ).toBe(true);
}

describe("recipe2 document Worker", () => {
  it.each([
    [
      "explicit",
      `${pptxRun("First")}<a:br/>${pptxRun("Second")}`,
      "First<br>Second",
    ],
    [
      "edge-consecutive",
      `<a:br/>${pptxRun("First")}<a:br/><a:br/>${pptxRun("Second")}<a:br/>`,
      "<br>First<br><br>Second<br>",
    ],
    [
      "run-field-space",
      `${pptxRun("Fi")}${pptxRun("rst ")}<a:fld id="field" type="slidenum"><a:rPr/><a:pPr/><a:t>2</a:t></a:fld><a:br/><a:r><a:rPr/><a:t>&amp;&lt;</a:t></a:r>`,
      "First 2<br>&amp;&lt;",
    ],
  ])("preserves PPTX inline boundaries: %s", async (_, body, expected) => {
    const request = input(
      pptxBody(`<p:grpSp><a:p>${body}</a:p></p:grpSp>`),
      "pptx",
    );
    const result = prepared(await run(request));
    expect(html(result) === `<p>${expected}</p>`).toBe(true);
    coverage(result, request.source);
  });
  it("preserves PPTX speaker-note line breaks", async () => {
    const result = prepared(
      await run(
        input(
          pptxBody(
            `<a:p>${pptxRun("Slide")}</a:p>`,
            `<a:p>${pptxRun("First")}<a:br/>${pptxRun("Second")}</a:p>`,
          ),
          "pptx",
        ),
      ),
    );
    expect(html(result) === "<p>Slide</p><p>First<br>Second</p>").toBe(true);
  });
  it.each([
    [
      "inline",
      `<a:p>${pptxRun("First")}<a:br/>${pptxRun("Second")}</a:p>`,
      "First<br>Second",
    ],
    [
      "paragraph",
      `<a:p>${pptxRun("First")}</a:p><a:p>${pptxRun("Second")}</a:p>`,
      "<p>First</p><p>Second</p>",
    ],
    [
      "empty-paragraph",
      `<a:p/><a:p>${pptxRun("First")}<a:br/><a:br/></a:p><a:p/>`,
      "<p></p><p>First<br><br></p><p></p>",
    ],
  ])("preserves PPTX table boundaries: %s", async (_, body, expected) => {
    const request = input(pptxBody(pptxCell(body)), "pptx");
    const result = prepared(await run(request));
    expect(
      html(result) ===
        `<table><tbody><tr><td>${expected}</td></tr></tbody></table>`,
    ).toBe(true);
    coverage(result, request.source);
  });
  it("rejects unknown PPTX inline boundaries instead of dropping them", async () => {
    const reply = await run(
      input(
        pptxBody(
          `<a:p>${pptxRun("First")}<a:unknownBoundary/>${pptxRun("Second")}</a:p>`,
        ),
        "pptx",
      ),
    );
    expect(!reply.ok && reply.code === "LLM_DOCUMENT_UNSUPPORTED").toBe(true);
  });
  it("keeps plain PPTX paragraph and single-cell bytes and recipe2 hashes unchanged", async () => {
    const request = input(
      pptxBody(
        `<a:p>${pptxRun("First")}</a:p>${pptxCell(`<a:p>${pptxRun("Second")}</a:p>`)}`,
      ),
      "pptx",
    );
    const value = prepared(await run(request));
    const expected =
      "<p>First</p><table><tbody><tr><td>Second</td></tr></tbody></table>";
    expect(html(value) === expected).toBe(true);
    const first = value.segments[0];
    if (!first) throw Error("SYNTHETIC_MISSING_SEGMENT");
    const hash = documentManifestHash(
      request.source,
      value.coverage,
      value.notices,
      [{ ...first, html: expected }],
    );
    expect(value.identity.sha256 === hash).toBe(true);
    expect(
      first.identity.sha256 === documentSegmentHash(hash, 0, 0, 2, expected),
    ).toBe(true);
  });
  it("changes affected PPTX identity rather than accepting the old collapsed boundary", async () => {
    const request = input(
      pptxBody(`<a:p>${pptxRun("First")}<a:br/>${pptxRun("Second")}</a:p>`),
      "pptx",
    );
    const value = prepared(await run(request));
    const legacy = value.segments.map((segment) => ({
      ...segment,
      html: segment.html.replace("<br>", ""),
    }));
    expect(
      value.identity.sha256 !==
        documentManifestHash(
          request.source,
          value.coverage,
          value.notices,
          legacy,
        ),
    ).toBe(true);
  });
  it.each([
    0, 1,
  ])("keeps the indivisible PPTX table boundary at 64 KiB plus %i", async (extra) => {
    const overhead = Buffer.byteLength(
      "<table><tbody><tr><td><br></td></tr></tbody></table>",
    );
    const body = `<a:p>${pptxRun("x".repeat(65536 - overhead + extra))}<a:br/></a:p>`;
    const reply = await run(input(pptxBody(pptxCell(body)), "pptx"));
    if (extra)
      expect(!reply.ok && reply.code === "LLM_RESOURCE_LIMIT").toBe(true);
    else
      expect(
        reply.ok &&
          reply.value.blocks === 1 &&
          Buffer.byteLength(html(reply.value)) === 65536,
      ).toBe(true);
  });
  it("does not turn a break-only PPTX into text success", async () => {
    const reply = await run(
      input(pptxBody("<a:p><a:br/><a:br/></a:p>"), "pptx"),
    );
    expect(!reply.ok && reply.code === "LLM_DOCUMENT_NO_TEXT").toBe(true);
  });
  it.each([
    `<a:p><a:rPr>${pptxRun("Hidden")}</a:rPr>${pptxRun("First")}</a:p>`,
    `<a:p>${pptxRun("First")}<a:br><a:unknownBoundary/></a:br></a:p>`,
    pptxCell(`<a:p>${pptxRun("First")}</a:p><a:unknownBoundary/>`),
  ])("rejects unsupported PPTX boundary content without silent omission %#", async (body) => {
    const reply = await run(input(pptxBody(body), "pptx"));
    expect(!reply.ok && reply.code === "LLM_DOCUMENT_UNSUPPORTED").toBe(true);
  });
  it("rejects CRC corruption before exposing otherwise valid text", async () => {
    const bytes = docx(p("CRC synthetic"));
    const index = bytes.indexOf(Buffer.from("CRC synthetic"));
    expect(index >= 0).toBe(true);
    bytes[index] = 88;
    expect(await run(input(bytes, "docx"))).toEqual({
      ok: false,
      code: "LLM_DOCUMENT_CORRUPT",
    });
  });
  it("rejects encrypted ZIP flags", async () => {
    const bytes = zip({ "synthetic.xml": "<synthetic/>" }, true);
    expect(await run(input(bytes, "docx"))).toEqual({
      ok: false,
      code: "LLM_DOCUMENT_ENCRYPTED",
    });
  });
  it("rejects unaccounted body text rather than returning only known paragraphs", async () => {
    expect(
      await run(
        input(
          docx(`${p("known")}<m:t xmlns:m="urn:synthetic">unknown</m:t>`),
          "docx",
        ),
      ),
    ).toEqual({ ok: false, code: "LLM_DOCUMENT_UNSUPPORTED" });
  });
  it("rejects PDF page 201 before partial preparation", async () => {
    expect(
      await run(input(pdf(Array.from({ length: 201 }, () => textPdf)), "pdf")),
    ).toEqual({ ok: false, code: "LLM_RESOURCE_LIMIT" });
  });
  it("canonicalizes manifest object keys without erasing coverage or notice changes", async () => {
    const request = input(
      docx(p("same text"), { "word/media/test.png": Buffer.from([1]) }),
      "docx",
    );
    const result = prepared(await run(request));
    if (result.coverage.kind !== "office-text")
      throw new Error("SYNTHETIC_COVERAGE");
    const value = result.coverage;
    const reordered = {
      uninterpretedMedia: value.uninterpretedMedia,
      units: value.units.map((unit) => ({
        blockCount: unit.blockCount,
        firstBlock: unit.firstBlock,
        kind: unit.kind,
        ordinal: unit.ordinal,
      })),
      textComplete: value.textComplete,
      format: value.format,
      kind: value.kind,
    };
    const notices = result.notices.map((notice) => ({
      count: notice.count,
      unit: notice.unit,
      code: notice.code,
    }));
    const hash = documentManifestHash(
      request.source,
      reordered,
      notices,
      result.segments,
    );
    expect(hash === result.identity.sha256).toBe(true);
    expect(
      documentManifestHash(
        request.source,
        { ...reordered, uninterpretedMedia: 2 },
        notices,
        result.segments,
      ) === hash,
    ).toBe(false);
    expect(
      documentManifestHash(
        request.source,
        reordered,
        notices.map((notice) => ({ ...notice, count: 2 })),
        result.segments,
      ) === hash,
    ).toBe(false);
    const pdfCoverage = {
      kind: "pdf-text",
      pages: [
        { ordinal: 0, class: "text-covered", firstBlock: 0, blockCount: 1 },
      ],
    } as const;
    const pdfReordered = {
      pages: [
        { blockCount: 1, firstBlock: 0, class: "text-covered", ordinal: 0 },
      ],
      kind: "pdf-text",
    } as const;
    expect(
      documentManifestHash(request.source, pdfCoverage, [], result.segments) ===
        documentManifestHash(request.source, pdfReordered, [], result.segments),
    ).toBe(true);
  });
  it("preserves DOCX heading, paragraph, table and all ancillary unit order", async () => {
    const bytes = docx(
      p("見出し", '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>') +
        p("本文") +
        `<w:tbl><w:tr><w:tc>${p("左")}</w:tc><w:tc>${p("右")}</w:tc></w:tr></w:tbl>`,
      {
        "word/header1.xml": `<w:hdr xmlns:w="${W}">${p("付属")}</w:hdr>`,
        "word/footnotes.xml": `<w:footnotes xmlns:w="${W}"><w:footnote w:id="1">${p("脚注")}</w:footnote></w:footnotes>`,
      },
    );
    const request = input(bytes, "docx");
    const result = prepared(await run(request));
    expect(html(result)).toBe(
      "<h1>見出し</h1><p>本文</p><table><tbody><tr><td><p>左</p></td><td><p>右</p></td></tr></tbody></table><p>付属</p><p>脚注</p>",
    );
    expect(
      result.coverage.kind === "office-text" &&
        result.coverage.units.map((unit) => unit.kind).join(","),
    ).toBe("body,header,footnote");
    coverage(result, request.source);
  });
  it("preserves numbered lists and safe text without active attributes", async () => {
    const bytes = docx(
      p(
        "項目 &lt;script&gt;",
        '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>',
      ),
      {
        "word/numbering.xml": `<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="3"/><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>`,
      },
    );
    expect(html(prepared(await run(input(bytes, "docx"))))).toBe(
      '<ol start="3"><li>項目 &lt;script&gt;</li></ol>',
    );
  });
  it("includes hidden text and reports uninterpreted media", async () => {
    const bytes = docx(p("隠れた文字", "<w:pPr><w:vanish/></w:pPr>"), {
      "word/media/synthetic.png": Buffer.from([1, 2, 3]),
    });
    const result = prepared(await run(input(bytes, "docx")));
    expect(html(result).includes("隠れた文字")).toBe(true);
    expect(result.notices.map((n) => n.code)).toEqual([
      "OFFICE_HIDDEN_CONTENT_INCLUDED",
      "OFFICE_MEDIA_UNINTERPRETED",
    ]);
  });
  it("splits a long Japanese paragraph without losing code points", async () => {
    const text = "あ😀".repeat(18000);
    const request = input(docx(p(text)), "docx");
    const value = prepared(await run(request));
    expect(value.segments.length).toBeGreaterThan(1);
    expect(html(value).replace(/<\/?p>/g, "") === text).toBe(true);
    coverage(value, request.source);
  });
  it("rejects one indivisible oversized DOCX table", async () => {
    const bytes = docx(
      `<w:tbl><w:tr><w:tc>${p("あ".repeat(22000))}</w:tc></w:tr></w:tbl>`,
    );
    expect(await run(input(bytes, "docx"))).toEqual({
      ok: false,
      code: "LLM_RESOURCE_LIMIT",
    });
  });
  it("rejects more than sixteen segments without truncation", async () => {
    expect(await run(input(docx(p("a".repeat(1048576))), "docx"))).toEqual({
      ok: false,
      code: "LLM_RESOURCE_LIMIT",
    });
  });
  it.each([
    [
      "unknown part",
      { "word/unknown.xml": "<x>hidden</x>" },
      "LLM_DOCUMENT_UNSUPPORTED",
    ],
    [
      "external relationship",
      {
        "word/_rels/document.xml.rels": relationships(
          relation("r2", "image", "https://never.invalid/no", true),
        ),
      },
      "LLM_DOCUMENT_UNSUPPORTED",
    ],
    [
      "missing relationship",
      {
        "word/_rels/document.xml.rels": relationships(
          relation("r2", "image", "media/missing.png"),
        ),
      },
      "LLM_DOCUMENT_CORRUPT",
    ],
    ["malformed XML", { "word/styles.xml": "<x>" }, "LLM_DOCUMENT_CORRUPT"],
    [
      "XML entity declaration",
      { "word/styles.xml": '<!DOCTYPE x [<!ENTITY y "text">]><x/>' },
      "LLM_DOCUMENT_UNSUPPORTED",
    ],
    [
      "XML depth",
      { "word/styles.xml": "<x>".repeat(129) + "</x>".repeat(129) },
      "LLM_RESOURCE_LIMIT",
    ],
  ] as const)("rejects %s before returning partial text", async (_name, additions, code) => {
    expect(await run(input(docx(p("正常な先頭"), additions), "docx"))).toEqual({
      ok: false,
      code,
    });
  });
  it("rejects unsupported text structures", async () => {
    expect(
      await run(input(docx(`<w:ins>${p("変更履歴")}</w:ins>`), "docx")),
    ).toEqual({ ok: false, code: "LLM_DOCUMENT_UNSUPPORTED" });
  });
  it("rejects reserved markers in source text", async () => {
    expect(
      await run(input(docx(p("[[hollow-media:synthetic]]")), "docx")),
    ).toEqual({ ok: false, code: "LLM_SOURCE_INVALID" });
  });
  it("rejects empty documents", async () => {
    expect(await run(input(docx(p("")), "docx"))).toEqual({
      ok: false,
      code: "LLM_DOCUMENT_NO_TEXT",
    });
  });
  it("rejects CFB encrypted/legacy containers", async () => {
    expect(
      await run(input(Buffer.from("d0cf11e0a1b11ae100000000", "hex"), "docx")),
    ).toEqual({ ok: false, code: "LLM_DOCUMENT_ENCRYPTED" });
  });
  it("rejects original identity changes", async () => {
    const value = input(docx(p("本文")), "docx");
    expect(
      await run({
        ...value,
        source: { ...value.source, sha256: "0".repeat(64) },
      }),
    ).toEqual({ ok: false, code: "LLM_SOURCE_CHANGED" });
  });
  it("preserves XLSX sheet order, hidden sheet, coordinates, merge and cached formula", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("表一");
    sheet.getCell("A1").value = "結合";
    sheet.mergeCells("A1:B1");
    sheet.getCell("A2").value = { formula: "1+2", result: 3 };
    sheet.getCell("A2").numFmt = "0.00";
    workbook.addWorksheet("隠れた表", { state: "hidden" }).getCell("C3").value =
      "末尾";
    const request = input(
      Buffer.from(await workbook.xlsx.writeBuffer()),
      "xlsx",
    );
    const result = prepared(await run(request));
    expect(html(result).includes('colspan="2"')).toBe(true);
    expect(html(result).includes("A2: 3 [formula: 1+2] [format: 0.00]")).toBe(
      true,
    );
    expect(html(result).includes("C3: 末尾")).toBe(true);
    expect(
      result.notices.some((n) => n.code === "OFFICE_HIDDEN_CONTENT_INCLUDED"),
    ).toBe(true);
    coverage(result, request.source);
  });
  it("does not recalculate XLSX formulas with absent cached results", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("表").getCell("A1").value = { formula: "1+2" };
    expect(
      await run(input(Buffer.from(await workbook.xlsx.writeBuffer()), "xlsx")),
    ).toEqual({ ok: false, code: "LLM_DOCUMENT_UNSUPPORTED" });
  });
  it("keeps PPTX presentation order, grouped text, tables and notes", async () => {
    const paragraph = (text: string) =>
      `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`;
    const bytes = zip({
      "[Content_Types].xml": "<Types/>",
      "_rels/.rels": relationships(
        relation("r1", "officeDocument", "ppt/presentation.xml"),
      ),
      "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="2" r:id="s2"/><p:sldId id="1" r:id="s1"/></p:sldIdLst></p:presentation>`,
      "ppt/_rels/presentation.xml.rels": relationships(
        relation("s1", "slide", "slides/slide1.xml") +
          relation("s2", "slide", "slides/slide2.xml"),
      ),
      "ppt/slides/slide2.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:spTree><p:grpSp>${paragraph("先頭")}${paragraph("グループ")}</p:grpSp><a:tbl><a:tr><a:tc>${paragraph("表")}</a:tc></a:tr></a:tbl></p:spTree></p:sld>`,
      "ppt/slides/_rels/slide2.xml.rels": relationships(
        relation("n1", "notesSlide", "../notesSlides/notesSlide1.xml"),
      ),
      "ppt/notesSlides/notesSlide1.xml": `<p:notes xmlns:p="${P}" xmlns:a="${A}">${paragraph("メモ")}</p:notes>`,
      "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}" show="0">${paragraph("最終")}</p:sld>`,
    });
    const result = prepared(await run(input(bytes, "pptx")));
    expect(html(result)).toBe(
      "<p>先頭</p><p>グループ</p><table><tbody><tr><td>表</td></tr></tbody></table><p>メモ</p><p>最終</p>",
    );
    expect(
      result.coverage.kind === "office-text" &&
        result.coverage.units.map((u) => u.kind).join(","),
    ).toBe("slide,speaker-notes,slide");
  });
  it("accepts strict single-column text plus proven blank pages", async () => {
    const request = input(pdf([textPdf, ""]), "pdf");
    const result = prepared(await run(request));
    expect(html(result)).toBe("<p>First</p><p>Second</p>");
    expect(
      result.coverage.kind === "pdf-text" &&
        result.coverage.pages.map((p) => p.class).join(","),
    ).toBe("text-covered,proven-blank");
    coverage(result, request.source);
  });
  it("rejects all blank PDF pages", async () => {
    expect(await run(input(pdf([""]), "pdf"))).toEqual({
      ok: false,
      code: "LLM_DOCUMENT_NO_TEXT",
    });
  });
  it.each([
    0, 1, 2, 3,
  ])("rejects PDF warning recovery at page position %s without partial coverage", async (page) => {
    const contents = page === 3 ? [textPdf] : [textPdf, textPdf, textPdf];
    const result = await run(
      input(
        pdf(contents, { page: page === 3 ? 0 : page, kind: "corrupt" }),
        "pdf",
      ),
    );
    expect(!result.ok && result.code === "LLM_DOCUMENT_CORRUPT").toBe(true);
  });
  it("accepts PDF warning-free compressed text with complete blank coverage", async () => {
    const request = input(
      pdf([textPdf, ""], { page: 0, kind: "flate" }),
      "pdf",
    );
    const result = prepared(await run(request));
    expect(html(result) === "<p>First</p><p>Second</p>").toBe(true);
    expect(
      result.coverage.kind === "pdf-text" &&
        result.coverage.pages.map((page) => page.class).join(",") ===
          "text-covered,proven-blank",
    ).toBe(true);
    coverage(result, request.source);
  });
  it.each([
    false,
    true,
  ])("restores the isolated PDF console after corrupt=%s", async (corrupt) => {
    const worker = new Worker(
      `const { parentPort, workerData } = require('node:worker_threads');
         (async () => {
           const methods = ['log', 'warn', 'error', 'info', 'debug'];
           const before = methods.map(method => console[method]);
           try {
             const { preparePdf } = await import(workerData.module);
             await preparePdf(workerData.bytes);
           } catch {}
           parentPort.postMessage(methods.every((method, index) => console[method] === before[index]));
           parentPort.close();
         })();`,
      {
        eval: true,
        workerData: {
          module: new URL("./documentPdf.mjs", import.meta.url).href,
          bytes: pdf(
            [textPdf, ""],
            corrupt ? { page: 1, kind: "corrupt" } : undefined,
          ),
        },
        stdout: true,
        stderr: true,
      },
    );
    let restored = false;
    let failed = false;
    worker.on("message", (value: unknown) => {
      restored = value === true;
    });
    worker.on("error", () => {
      failed = true;
    });
    const pipes = [worker.stdout, worker.stderr].map(
      (stream) =>
        new Promise<void>((resolve) => {
          stream.once("end", resolve);
          stream.once("close", resolve);
          stream.resume();
        }),
    );
    const closed = new Promise<number>((resolve) =>
      worker.once("exit", resolve),
    );
    const timer = setTimeout(() => {
      void worker.terminate();
    }, 10000);
    try {
      expect(await closed).toBe(0);
      await Promise.all(pipes);
      expect(restored && !failed).toBe(true);
    } finally {
      clearTimeout(timer);
      await closed;
      await Promise.all(pipes);
    }
  });
  it("rejects mixed visual PDF without returning earlier covered pages", async () => {
    expect(await run(input(pdf([textPdf, "0 0 20 20 re f"]), "pdf"))).toEqual({
      ok: false,
      code: "LLM_PDF_VISUAL_REQUIRED",
    });
  });
  it("rejects multiple PDF column anchors", async () => {
    expect(
      await run(
        input(
          pdf(["BT /F1 12 Tf 30 340 Td (Left) Tj 180 -20 Td (Right) Tj ET"]),
          "pdf",
        ),
      ),
    ).toEqual({ ok: false, code: "LLM_PDF_ORDER_UNPROVEN" });
  });
  it("rejects unknown PDF text rendering mode", async () => {
    expect(
      await run(
        input(pdf(["BT /F1 12 Tf 3 Tr 30 340 Td (Invisible) Tj ET"]), "pdf"),
      ),
    ).toEqual({ ok: false, code: "LLM_PDF_ORDER_UNPROVEN" });
  });
  it("rejects a corrupt PDF with a safe finite code", async () => {
    expect(await run(input(Buffer.from("%PDF-1.7\ninvalid"), "pdf"))).toEqual({
      ok: false,
      code: "LLM_DOCUMENT_CORRUPT",
    });
  });
});

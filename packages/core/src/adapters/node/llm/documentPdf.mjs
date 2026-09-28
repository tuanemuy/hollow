import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fail, textBlocks } from "./documentBlocks.mjs";
import { classifyLayout, POLICY } from "./documentPdfLayout.mjs";
import { classifyOperators } from "./documentPdfOperators.mjs";

const require = createRequire(
  createRequire(import.meta.url).resolve("@repo/core/package.json"),
);
const allow = new Set([
  "dependency",
  "beginText",
  "endText",
  "setFont",
  "moveText",
  "setTextMatrix",
  "showText",
  "showSpacedText",
  "nextLine",
  "nextLineShowText",
  "nextLineSetSpacingShowText",
  "setLeading",
  "setCharSpacing",
  "setWordSpacing",
  "setHScale",
  "setTextRise",
  "setFillRGBColor",
  "setFillGray",
  "save",
  "restore",
  "transform",
  "setFillColorSpace",
  "setFillColor",
]);

export async function preparePdf(bytes) {
  const modulePath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const directory = path.resolve(path.dirname(modulePath), "../..");
  const pdfjs = await import(pathToFileURL(modulePath).href);
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    stopAtErrors: true,
    isEvalSupported: false,
    useSystemFonts: false,
    useWorkerFetch: false,
    disableFontFace: true,
    cMapUrl: `${directory}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${directory}/standard_fonts/`,
    wasmUrl: `${directory}/wasm/`,
    verbosity: 0,
  });
  try {
    const document = await task.promise;
    if ((await document.getPermissions()) !== null)
      fail("LLM_DOCUMENT_ENCRYPTED");
    if (document.numPages > 200) fail("LLM_RESOURCE_LIMIT");
    if ((await document.getOptionalContentConfig())?.getOrder()?.length)
      fail("LLM_PDF_ORDER_UNPROVEN");
    const blocks = [];
    const pages = [];
    for (let ordinal = 0; ordinal < document.numPages; ordinal++) {
      const page = await document.getPage(ordinal + 1);
      try {
        const content = await page.getTextContent();
        const operators = await page.getOperatorList();
        const annotations = await page.getAnnotations();
        const items = content.items.filter(
          (item) => "str" in item && item.str.length,
        );
        const drawing = classifyOperators(
          operators,
          pdfjs.OPS,
          page.view,
          allow,
        );
        if (drawing.visual) fail("LLM_PDF_VISUAL_REQUIRED");
        if (drawing.unknown || annotations.length || page.rotate !== 0)
          fail("LLM_PDF_ORDER_UNPROVEN");
        const layout = classifyLayout(items, page.view);
        if (layout.kind === "indeterminate") fail("LLM_PDF_ORDER_UNPROVEN");
        if (
          !items.length &&
          operators.fnArray.some((op) =>
            [
              pdfjs.OPS.showText,
              pdfjs.OPS.showSpacedText,
              pdfjs.OPS.nextLineShowText,
              pdfjs.OPS.nextLineSetSpacingShowText,
            ].includes(op),
          )
        )
          fail("LLM_PDF_ORDER_UNPROVEN");
        const firstBlock = blocks.length;
        let line = "";
        let previous;
        for (const item of items) {
          const em = Math.max(
            Math.abs(item.transform[0]),
            Math.abs(item.transform[3]),
            item.height,
          );
          if (
            previous &&
            Math.abs(previous.y - item.transform[5]) >
              POLICY.baselineEm * Math.min(previous.em, em)
          ) {
            blocks.push(...textBlocks(line));
            line = "";
          }
          line += item.str;
          previous = { y: item.transform[5], em };
        }
        if (line) blocks.push(...textBlocks(line));
        pages.push({
          ordinal,
          class: items.length ? "text-covered" : "proven-blank",
          firstBlock,
          blockCount: blocks.length - firstBlock,
        });
      } finally {
        page.cleanup();
      }
    }
    return { blocks, coverage: { kind: "pdf-text", pages }, notices: [] };
  } catch (error) {
    if (error?.name === "PasswordException") fail("LLM_DOCUMENT_ENCRYPTED");
    throw error;
  } finally {
    await task.destroy();
  }
}

import path from "node:path";
import ExcelJS from "exceljs";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import yauzl from "yauzl";
import {
  escapeHtml,
  fail,
  SEGMENT_BYTES,
  textBlocks,
} from "./documentBlocks.mjs";

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
});
const corrupt = () => fail("LLM_DOCUMENT_CORRUPT");
const unsupported = () => fail("LLM_DOCUMENT_UNSUPPORTED");
function nodes(tree, tag) {
  const result = [];
  const stack = [...(tree ?? [])].reverse();
  while (stack.length) {
    const node = stack.pop();
    if (node[tag]) result.push(node);
    const children = Object.entries(node)
      .filter(([key, value]) => key !== ":@" && Array.isArray(value))
      .flatMap(([, value]) => value);
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  return result;
}
const texts = (tree, tag) =>
  nodes(tree, tag).flatMap((node) =>
    node[tag]
      .filter((item) => item["#text"] !== undefined)
      .map((item) => String(item["#text"])),
  );
const attr = (node, name) => node?.[":@"]?.[`@${name}`];
const childAttr = (tree, tag, name) => attr(nodes(tree, tag)[0], name);
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
async function readParts(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex")))
    fail("LLM_DOCUMENT_ENCRYPTED");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      bytes,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip) return reject(new Error("CORRUPT"));
        const parts = new Map();
        let total = 0;
        let entries = 0;
        let settled = false;
        let current;
        const stop = (code) => {
          if (settled) return;
          settled = true;
          current?.destroy();
          zip.close();
          reject(Object.assign(new Error(code), { code }));
        };
        zip.on("error", () => stop("LLM_DOCUMENT_CORRUPT"));
        zip.on("end", () => {
          if (!settled) {
            settled = true;
            zip.close();
            resolve(parts);
          }
        });
        zip.on("entry", (entry) => {
          entries++;
          const name = entry.fileName;
          if (
            entries > 4096 ||
            entry.uncompressedSize > 128 * 1024 * 1024 ||
            (/\.(xml|rels)$/i.test(name) &&
              entry.uncompressedSize > 16 * 1024 * 1024)
          )
            return stop("LLM_RESOURCE_LIMIT");
          if (entry.generalPurposeBitFlag & 1)
            return stop("LLM_DOCUMENT_ENCRYPTED");
          if (
            parts.has(name) ||
            name.length > 1024 ||
            name.includes("\\") ||
            name.startsWith("/") ||
            name.split("/").some((part) => part === ".." || part === ".") ||
            Array.from(name).some((c) => c.codePointAt(0) < 32)
          )
            return stop("LLM_DOCUMENT_CORRUPT");
          if (((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000)
            return stop("LLM_DOCUMENT_UNSUPPORTED");
          zip.openReadStream(entry, (readError, stream) => {
            if (readError || !stream) return stop("LLM_DOCUMENT_CORRUPT");
            current = stream;
            const chunks = [];
            let count = 0;
            stream.on("error", () => stop("LLM_DOCUMENT_CORRUPT"));
            stream.on("data", (chunk) => {
              count += chunk.length;
              total += chunk.length;
              if (
                total > 128 * 1024 * 1024 ||
                count > entry.uncompressedSize ||
                (/\.(xml|rels)$/i.test(name) && count > 16 * 1024 * 1024)
              )
                return stop("LLM_RESOURCE_LIMIT");
              chunks.push(chunk);
            });
            stream.on("end", () => {
              if (settled) return;
              const value = Buffer.concat(chunks);
              if (
                value.length !== entry.uncompressedSize ||
                crc(value) !== entry.crc32 ||
                (name.endsWith("/") && value.length)
              )
                return stop("LLM_DOCUMENT_CORRUPT");
              parts.set(name, value);
              current = undefined;
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}
function parse(bytes) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    corrupt();
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) unsupported();
  let depth = 0;
  for (const token of source.matchAll(
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>/g,
  )) {
    if (/^<\?|^<!/u.test(token[0])) continue;
    if (token[0].startsWith("</")) depth--;
    else if (!token[0].endsWith("/>")) depth++;
    if (depth > 128) fail("LLM_RESOURCE_LIMIT");
  }
  if (XMLValidator.validate(source) !== true) corrupt();
  return xml.parse(source);
}
function target(base, relationship) {
  const value = attr(relationship, "Target");
  if (attr(relationship, "TargetMode") === "External") unsupported();
  if (
    typeof value !== "string" ||
    !value ||
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.includes("\\") ||
    value.includes("%") ||
    value.includes("#")
  )
    corrupt();
  const resolved = value.startsWith("/")
    ? value.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(base), value));
  if (
    resolved.startsWith("../") ||
    resolved.startsWith("/") ||
    resolved === ".."
  )
    corrupt();
  return resolved;
}
function integer(value, fallback = 1) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 200000) corrupt();
  return number;
}
function sameText(source, consumed) {
  if (JSON.stringify(source) !== JSON.stringify(consumed)) unsupported();
}
function textInventory(tree, accepted) {
  const stack = [{ tree, parent: "" }];
  while (stack.length) {
    const frame = stack.pop();
    for (const node of frame.tree ?? [])
      for (const [key, value] of Object.entries(node)) {
        if (
          key === "#text" &&
          String(value).trim() &&
          frame.parent !== accepted
        )
          unsupported();
        if (key !== ":@" && Array.isArray(value))
          stack.push({ tree: value, parent: key });
      }
  }
}
function nonempty(blocks) {
  return blocks.some((block) => block.replace(/<[^>]*>/g, "").trim());
}

export async function prepareOffice(bytes, format) {
  const parts = await readParts(bytes);
  for (const name of parts.keys()) if (name.endsWith("/")) parts.delete(name);
  const parsed = new Map();
  for (const [name, value] of parts)
    if (/\.(xml|rels)$/i.test(name)) parsed.set(name, parse(value));
  const relations = (name) => nodes(parsed.get(name), "Relationship");
  for (const [name] of parsed)
    if (name.endsWith(".rels")) {
      const ids = new Set();
      const base =
        name === "_rels/.rels"
          ? "root.xml"
          : name.replace("/_rels/", "/").replace(/\.rels$/, "");
      for (const relationship of relations(name)) {
        const id = attr(relationship, "Id");
        if (
          !id ||
          ids.has(id) ||
          !attr(relationship, "Type") ||
          !parts.has(target(base, relationship))
        )
          corrupt();
        ids.add(id);
      }
    }
  if (!parts.has("[Content_Types].xml") || !parts.has("_rels/.rels")) corrupt();
  const rootRelations = relations("_rels/.rels").filter((r) =>
    attr(r, "Type").endsWith("/officeDocument"),
  );
  const expectedRoot = {
    docx: "word/document.xml",
    pptx: "ppt/presentation.xml",
    xlsx: "xl/workbook.xml",
  }[format];
  if (
    rootRelations.length !== 1 ||
    target("root.xml", rootRelations[0]) !== expectedRoot
  )
    corrupt();
  const blocks = [];
  const units = [];
  const notices = [];
  const addUnit = (kind, value, hidden = false) => {
    const ordinal = units.length;
    const firstBlock = blocks.length;
    blocks.push(...value);
    units.push({
      ordinal,
      kind,
      firstBlock,
      blockCount: blocks.length - firstBlock,
    });
    if (hidden)
      notices.push({
        code: "OFFICE_HIDDEN_CONTENT_INCLUDED",
        unit: ordinal,
        count: 1,
      });
  };
  let media = 0;
  if (format === "docx") {
    const allowed =
      /^(\[Content_Types\]\.xml|_rels\/\.rels|word\/(document|styles|numbering|settings|fontTable|webSettings|header\d+|footer\d+|footnotes|endnotes|comments)\.xml|word\/_rels\/[^/]+\.rels|docProps\/[^/]+\.xml|word\/media\/[^/]+|word\/theme\/[^/]+\.xml)$/;
    if ([...parts.keys()].some((name) => !allowed.test(name))) unsupported();
    const names = [
      "word/document.xml",
      ...[...parts.keys()]
        .filter((name) => /^word\/(header\d+|footer\d+)\.xml$/.test(name))
        .sort(),
      ...[
        "word/footnotes.xml",
        "word/endnotes.xml",
        "word/comments.xml",
      ].filter((name) => parts.has(name)),
    ];
    if (!parsed.has(names[0])) corrupt();
    for (const [name, tree] of parsed) {
      if (
        [
          "w:ins",
          "w:del",
          "w:fldChar",
          "w:fldSimple",
          "w:instrText",
          "w:altChunk",
          "w:txbxContent",
          "w:object",
          "w:sym",
          "mc:AlternateContent",
        ].some((tag) => nodes(tree, tag).length)
      )
        unsupported();
      if (
        (!names.includes(name) && texts(tree, "w:t").length) ||
        texts(tree, "a:t").length
      )
        unsupported();
    }
    const numbering = new Map();
    const numberingTree = parsed.get("word/numbering.xml");
    for (const num of nodes(numberingTree, "w:num")) {
      const abstractId = childAttr(num["w:num"], "w:abstractNumId", "w:val");
      const definition = nodes(numberingTree, "w:abstractNum").find(
        (item) => attr(item, "w:abstractNumId") === abstractId,
      );
      if (!definition || nodes(num["w:num"], "w:lvlOverride").length)
        unsupported();
      const levels = nodes(definition["w:abstractNum"], "w:lvl");
      numbering.set(attr(num, "w:numId"), levels);
    }
    const counters = new Map();
    const styles = new Map(
      nodes(parsed.get("word/styles.xml"), "w:style").map((node) => [
        attr(node, "w:styleId"),
        node["w:style"],
      ]),
    );
    for (const name of names) {
      const consumed = [];
      const tree = parsed.get(name);
      textInventory(tree, "w:t");
      const paragraph = (children, inTable = false) => {
        const values = texts(children, "w:t");
        consumed.push(...values);
        let text = "";
        const visit = (items) => {
          for (const node of items ?? []) {
            if (node["w:t"])
              text += node["w:t"]
                .filter((n) => n["#text"] !== undefined)
                .map((n) => String(n["#text"]))
                .join("");
            else if (node["w:tab"]) text += "\t";
            else if (node["w:br"] || node["w:cr"]) text += "\n";
            else
              for (const [key, value] of Object.entries(node))
                if (key !== ":@" && Array.isArray(value)) visit(value);
          }
        };
        visit(children);
        const styleId = childAttr(children, "w:pStyle", "w:val");
        const level =
          childAttr(children, "w:outlineLvl", "w:val") ??
          childAttr(styles.get(styleId), "w:outlineLvl", "w:val");
        const heading =
          /^Heading([1-6])$/i.exec(styleId ?? "")?.[1] ??
          (level !== undefined && Number(level) < 6
            ? String(Number(level) + 1)
            : null);
        if (nodes(children, "w:numPr").length) {
          const id = childAttr(children, "w:numId", "w:val");
          const ilvl = childAttr(children, "w:ilvl", "w:val") ?? "0";
          const definition = numbering
            .get(id)
            ?.find((item) => attr(item, "w:ilvl") === ilvl);
          if (!definition || ilvl !== "0") unsupported();
          const kind = childAttr(definition["w:lvl"], "w:numFmt", "w:val");
          if (kind !== "decimal" && kind !== "bullet") unsupported();
          const start =
            counters.get(id) ??
            integer(childAttr(definition["w:lvl"], "w:start", "w:val"));
          counters.set(id, start + 1);
          const tag = kind === "bullet" ? "ul" : "ol";
          return [
            `<${tag}${tag === "ol" ? ` start="${start}"` : ""}><li>${escapeHtml(text)}</li></${tag}>`,
          ];
        }
        return inTable
          ? [`<p>${escapeHtml(text)}</p>`]
          : textBlocks(text, heading ? `h${heading}` : "p");
      };
      const walk = (items) => {
        const out = [];
        for (const node of items ?? []) {
          if (node["w:tbl"]) {
            if (nodes(node["w:tbl"], "w:tbl").length) unsupported();
            const rows = [];
            for (const row of nodes(node["w:tbl"], "w:tr")) {
              const cells = [];
              for (const cell of nodes(row["w:tr"], "w:tc")) {
                if (nodes(cell["w:tc"], "w:vMerge").length) unsupported();
                const span = integer(
                  childAttr(cell["w:tc"], "w:gridSpan", "w:val"),
                );
                const body = nodes(cell["w:tc"], "w:p")
                  .flatMap((p) => paragraph(p["w:p"], true))
                  .join("");
                cells.push(
                  `<td${span > 1 ? ` colspan="${span}"` : ""}>${body}</td>`,
                );
              }
              rows.push(`<tr>${cells.join("")}</tr>`);
            }
            out.push(`<table><tbody>${rows.join("")}</tbody></table>`);
          } else if (node["w:p"]) out.push(...paragraph(node["w:p"]));
          else
            for (const [key, value] of Object.entries(node))
              if (key !== ":@" && Array.isArray(value))
                out.push(...walk(value));
        }
        return out;
      };
      const value = walk(tree);
      sameText(texts(tree, "w:t"), consumed);
      const kind =
        name === "word/document.xml"
          ? "body"
          : /header/.test(name)
            ? "header"
            : /footer/.test(name)
              ? "footer"
              : /footnotes/.test(name)
                ? "footnote"
                : /endnotes/.test(name)
                  ? "endnote"
                  : "comment";
      addUnit(kind, value, nodes(tree, "w:vanish").length > 0);
    }
    media = [...parts.keys()].filter((name) =>
      name.startsWith("word/media/"),
    ).length;
  } else if (format === "pptx") {
    const allowed =
      /^(\[Content_Types\]\.xml|_rels\/\.rels|docProps\/[^/]+\.xml|ppt\/(presentation|presProps|viewProps|tableStyles)\.xml|ppt\/_rels\/[^/]+\.rels|ppt\/(slides|notesSlides|slideLayouts|slideMasters|notesMasters)\/(?:_rels\/)?[^/]+\.(?:xml|rels)|ppt\/theme\/[^/]+\.xml|ppt\/media\/[^/]+)$/;
    if ([...parts.keys()].some((name) => !allowed.test(name))) unsupported();
    if (
      [...parsed].some(
        ([name, tree]) =>
          /slideLayouts|slideMasters|notesMasters/.test(name) &&
          texts(tree, "a:t").length,
      )
    )
      unsupported();
    const map = new Map(
      relations("ppt/_rels/presentation.xml.rels").map((r) => [
        attr(r, "Id"),
        target("ppt/presentation.xml", r),
      ]),
    );
    const order = nodes(parsed.get("ppt/presentation.xml"), "p:sldId").map(
      (node) => map.get(attr(node, "r:id")),
    );
    if (
      !order.length ||
      new Set(order).size !== order.length ||
      order.some((name) => !parts.has(name))
    )
      corrupt();
    if (order.length > 200) fail("LLM_RESOURCE_LIMIT");
    const used = new Set();
    const addSlide = (name, kind) => {
      if (used.has(name)) corrupt();
      used.add(name);
      const tree = parsed.get(name);
      textInventory(tree, "a:t");
      const consumed = [];
      const inventory = (items) => {
        const out = [];
        for (const node of items ?? []) {
          if (node["a:t"])
            out.push(...texts([node], "a:t").map((value) => ["text", value]));
          else if (node["a:br"]) out.push(["break"]);
          else
            for (const [key, value] of Object.entries(node))
              if (key !== ":@" && Array.isArray(value))
                out.push(...inventory(value));
        }
        return out;
      };
      const inline = (items, scope = "paragraph") => {
        let out = "";
        for (const node of items ?? []) {
          for (const [key, value] of Object.entries(node)) {
            if (key === ":@") continue;
            if (key === "#text" && !String(value).trim()) continue;
            if (key === "a:t" && scope === "run") {
              const values = texts([node], "a:t");
              consumed.push(...values.map((text) => ["text", text]));
              out += values.join("");
            } else if (
              (key === "a:r" || key === "a:fld") &&
              scope === "paragraph"
            ) {
              out += inline(value, "run");
            } else if (key === "a:br" && scope === "paragraph") {
              if (inventory(value).length) unsupported();
              if (
                value.some((child) =>
                  Object.keys(child).some(
                    (tag) => !["a:rPr", ":@", "#text"].includes(tag),
                  ),
                )
              )
                unsupported();
              consumed.push(["break"]);
              out += "\n";
            } else if (
              (scope === "paragraph" &&
                ["a:pPr", "a:endParaRPr"].includes(key)) ||
              (scope === "run" && ["a:rPr", "a:pPr"].includes(key))
            ) {
              if (inventory(value).length) unsupported();
            } else unsupported();
          }
        }
        return out;
      };
      const paragraph = (children) => {
        return textBlocks(inline(children));
      };
      const cellParagraphs = (items, scope = "cell") => {
        const out = [];
        for (const node of items ?? [])
          for (const [key, value] of Object.entries(node)) {
            if (key === ":@" || (key === "#text" && !String(value).trim()))
              continue;
            if (key === "a:p") out.push(inline(value));
            else if (key === "a:txBody" && scope === "cell")
              out.push(...cellParagraphs(value, "body"));
            else if (
              (scope === "cell" && key === "a:tcPr") ||
              (scope === "body" && ["a:bodyPr", "a:lstStyle"].includes(key))
            ) {
              if (inventory(value).length) unsupported();
            } else unsupported();
          }
        return out;
      };
      const walk = (items) => {
        const out = [];
        for (const node of items ?? []) {
          if (node["a:tbl"]) {
            const rows = nodes(node["a:tbl"], "a:tr").map((row) => {
              const cells = nodes(row["a:tr"], "a:tc").map((cell) => {
                const value = cellParagraphs(cell["a:tc"]);
                if (
                  attr(cell, "hMerge") === "1" ||
                  attr(cell, "vMerge") === "1"
                ) {
                  if (value.some(Boolean)) unsupported();
                  return "";
                }
                const colspan = integer(attr(cell, "gridSpan"));
                const rowspan = integer(attr(cell, "rowSpan"));
                const content = value
                  .map((text) => {
                    const escaped = text
                      .split("\n")
                      .map(escapeHtml)
                      .join("<br>");
                    return value.length > 1 ? `<p>${escaped}</p>` : escaped;
                  })
                  .join("");
                return `<td${colspan > 1 ? ` colspan="${colspan}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}>${content}</td>`;
              });
              return `<tr>${cells.join("")}</tr>`;
            });
            out.push(`<table><tbody>${rows.join("")}</tbody></table>`);
          } else if (node["a:p"]) out.push(...paragraph(node["a:p"]));
          else
            for (const [key, value] of Object.entries(node))
              if (key !== ":@" && Array.isArray(value))
                out.push(...walk(value));
        }
        return out;
      };
      const value = walk(tree);
      sameText(inventory(tree), consumed);
      addUnit(
        kind,
        value,
        nodes(tree, "p:sld").some((node) => attr(node, "show") === "0"),
      );
    };
    for (const name of order) {
      addSlide(name, "slide");
      for (const relationship of relations(
        `${name.replace("/slides/", "/slides/_rels/")}.rels`,
      ))
        if (attr(relationship, "Type").endsWith("/notesSlide"))
          addSlide(target(name, relationship), "speaker-notes");
    }
    if (
      [...parsed].some(
        ([name, tree]) =>
          /^ppt\/(slides|notesSlides)\//.test(name) &&
          !used.has(name) &&
          texts(tree, "a:t").length,
      )
    )
      unsupported();
    media = [...parts.keys()].filter((name) =>
      name.startsWith("ppt/media/"),
    ).length;
  } else if (format === "xlsx") {
    const allowed =
      /^(\[Content_Types\]\.xml|_rels\/\.rels|docProps\/[^/]+\.xml|xl\/(workbook|styles|sharedStrings)\.xml|xl\/_rels\/[^/]+\.rels|xl\/worksheets\/(?:_rels\/)?[^/]+\.(?:xml|rels)|xl\/theme\/[^/]+\.xml)$/;
    if ([...parts.keys()].some((name) => !allowed.test(name))) unsupported();
    let count = 0;
    const sheetMap = new Map(
      relations("xl/_rels/workbook.xml.rels").map((r) => [
        attr(r, "Id"),
        target("xl/workbook.xml", r),
      ]),
    );
    const rawSheets = nodes(parsed.get("xl/workbook.xml"), "sheet");
    const sheetParts = rawSheets.map((node) =>
      sheetMap.get(attr(node, "r:id")),
    );
    if (
      sheetParts.some((name) => !name || !parsed.has(name)) ||
      new Set(sheetParts).size !== sheetParts.length
    )
      corrupt();
    if (rawSheets.length > 100) fail("LLM_RESOURCE_LIMIT");
    const cellAddress = (value) => {
      const match = /^([A-Z]{1,3})([1-9][0-9]*)$/.exec(value ?? "");
      if (!match) corrupt();
      let column = 0;
      for (const c of match[1]) column = column * 26 + c.charCodeAt(0) - 64;
      const row = Number(match[2]);
      if (column > 16384 || row > 1048576) corrupt();
      return { row, column };
    };
    for (const [name, tree] of parsed)
      if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) {
        if (!sheetParts.includes(name)) unsupported();
        count += nodes(tree, "c").length;
        if (count > 200000) fail("LLM_RESOURCE_LIMIT");
        for (const cell of nodes(tree, "c"))
          if (nodes(cell.c, "f").length && !nodes(cell.c, "v").length)
            unsupported();
        let merged = 0;
        for (const node of nodes(tree, "mergeCell")) {
          const range = attr(node, "ref")?.split(":");
          if (!range || range.length !== 2) corrupt();
          const a = cellAddress(range[0]);
          const b = cellAddress(range[1]);
          if (b.row < a.row || b.column < a.column) corrupt();
          merged += (b.row - a.row + 1) * (b.column - a.column + 1);
          if (merged > 200000) fail("LLM_RESOURCE_LIMIT");
        }
      }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    if (
      wb.worksheets.length !== rawSheets.length ||
      wb.worksheets.some(
        (sheet, index) => sheet.name !== attr(rawSheets[index], "name"),
      )
    )
      unsupported();
    if (!wb.worksheets.length) fail("LLM_DOCUMENT_NO_TEXT");
    if (wb.worksheets.length > 100) fail("LLM_RESOURCE_LIMIT");
    let visited = 0;
    for (const sheet of wb.worksheets) {
      const tableRows = [];
      let hidden =
        sheet.state !== "visible" ||
        sheet.columns.some((column) => column.hidden);
      const merges = new Map(
        (sheet.model.merges ?? []).map((range) => [range.split(":")[0], range]),
      );
      sheet.eachRow((row) => {
        if (row.hidden) hidden = true;
        const cells = [];
        row.eachCell((cell) => {
          if (cell.isMerged && cell.master.address !== cell.address) return;
          visited++;
          if (visited > 200000) fail("LLM_RESOURCE_LIMIT");
          if (cell.formula && cell.result === undefined) unsupported();
          const merge = merges.get(cell.address);
          let colspan = 1;
          let rowspan = 1;
          if (merge) {
            const end = sheet.getCell(merge.split(":")[1]);
            colspan = end.col - cell.col + 1;
            rowspan = end.row - cell.row + 1;
          }
          const details = `${cell.address}: ${cell.text}${cell.formula ? ` [formula: ${cell.formula}]` : ""}${cell.numFmt ? ` [format: ${cell.numFmt}]` : ""}`;
          cells.push(
            `<td${colspan > 1 ? ` colspan="${colspan}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}>${escapeHtml(details)}</td>`,
          );
        });
        if (cells.length) tableRows.push(`<tr>${cells.join("")}</tr>`);
      });
      const table = tableRows.length
        ? `<table><caption>${escapeHtml(sheet.name)}</caption><tbody>${tableRows.join("")}</tbody></table>`
        : "";
      addUnit("sheet", table ? [table] : [], hidden);
    }
  } else unsupported();
  if (!nonempty(blocks)) fail("LLM_DOCUMENT_NO_TEXT");
  if (blocks.some((block) => Buffer.byteLength(block) > SEGMENT_BYTES))
    fail("LLM_RESOURCE_LIMIT");
  if (media)
    notices.push({ code: "OFFICE_MEDIA_UNINTERPRETED", unit: 0, count: media });
  return {
    blocks,
    coverage: {
      kind: "office-text",
      format,
      textComplete: true,
      units,
      uninterpretedMedia: media,
    },
    notices,
  };
}

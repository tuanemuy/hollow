import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { parentPort, workerData } from "node:worker_threads";

const LIMIT = {
  input: 50 * 1024 * 1024,
  total: 128 * 1024 * 1024,
  xml: 16 * 1024 * 1024,
  entries: 4096,
  depth: 128,
  output: 800 * 1024,
  pages: 2000,
};
function fail(code) {
  throw Object.assign(new Error(code), { code });
}
function noNetwork() {
  fail("IMPORT_NETWORK_BLOCKED");
}
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

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
const list = (value) =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : [value];
function decode(bytes) {
  try {
    const encoding =
      bytes[0] === 0xff && bytes[1] === 0xfe
        ? "utf-16le"
        : bytes[0] === 0xfe && bytes[1] === 0xff
          ? "utf-16be"
          : "utf-8";
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13)
        fail("IMPORT_INVALID_ENCODING");
    }
    return text;
  } catch (error) {
    if (error.code === "IMPORT_INVALID_ENCODING") throw error;
    fail("IMPORT_INVALID_ENCODING");
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, start) => {
  let value = start;
  for (let index = 0; index < 8; index++)
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function updateCrc(crc, bytes) {
  let value = crc;
  for (const byte of bytes)
    value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return value;
}

async function zipParts(bytes) {
  const { default: yauzl } = await import("yauzl");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      Buffer.from(bytes),
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error) {
          reject(error);
          return;
        }
        const parts = new Map();
        const names = new Set();
        let declared = 0;
        let actual = 0;
        let stopped = false;
        const stop = (cause) => {
          if (stopped) return;
          stopped = true;
          zip.close();
          reject(cause);
        };
        const limit = () =>
          stop(
            Object.assign(new Error("limit"), {
              code: "IMPORT_RESOURCE_LIMIT",
            }),
          );
        zip.on("error", stop);
        zip.on("end", () => {
          if (!stopped) resolve({ parts, names });
        });
        zip.on("entry", (entry) => {
          if (stopped) return;
          if (names.has(entry.fileName)) {
            stop(new Error("duplicate part"));
            return;
          }
          names.add(entry.fileName);
          declared += entry.uncompressedSize;
          if (
            names.size > LIMIT.entries ||
            entry.fileName.length > 1024 ||
            declared > LIMIT.total ||
            entry.uncompressedSize > LIMIT.total
          ) {
            limit();
            return;
          }
          if (entry.generalPurposeBitFlag & 1) {
            stop(
              Object.assign(new Error("encrypted"), {
                code: "IMPORT_ENCRYPTED",
              }),
            );
            return;
          }
          const isXml = /\.(xml|rels)$/i.test(entry.fileName);
          if (isXml && entry.uncompressedSize > LIMIT.xml) {
            limit();
            return;
          }
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) {
              stop(streamError);
              return;
            }
            const chunks = [];
            let expanded = 0;
            let crc = 0xffffffff;
            stream.on("error", stop);
            stream.on("data", (chunk) => {
              expanded += chunk.length;
              actual += chunk.length;
              if (
                actual > LIMIT.total ||
                expanded > entry.uncompressedSize ||
                (isXml && expanded > LIMIT.xml)
              ) {
                stream.destroy();
                limit();
                return;
              }
              crc = updateCrc(crc, chunk);
              if (isXml) chunks.push(chunk);
            });
            stream.on("end", () => {
              if (stopped) return;
              if (
                expanded !== entry.uncompressedSize ||
                (crc ^ 0xffffffff) >>> 0 !== entry.crc32
              ) {
                stop(new Error("CRC or size mismatch"));
                return;
              }
              if (isXml) {
                try {
                  parts.set(entry.fileName, decode(Buffer.concat(chunks)));
                } catch (cause) {
                  stop(cause);
                  return;
                }
              }
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}

async function xmlTools(parts) {
  const { XMLParser, XMLValidator } = await import("fast-xml-parser");
  const xmlOptions = {
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: true,
    trimValues: false,
    transformTagName: (name) => name.split(":").at(-1),
  };
  const parser = new XMLParser(xmlOptions);
  const ordered = new XMLParser({ ...xmlOptions, preserveOrder: true });
  function validate(raw) {
    if (typeof raw !== "string") fail("IMPORT_CORRUPT");
    if (/<!\s*(DOCTYPE|ENTITY)/i.test(raw)) fail("IMPORT_UNSAFE_XML");
    let depth = 0;
    const withoutLiterals = raw.replace(
      /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/g,
      "",
    );
    for (const token of withoutLiterals.matchAll(/<\/?[^>]+>/g)) {
      if (token[0].startsWith("</")) depth--;
      else if (!token[0].endsWith("/>")) depth++;
      if (depth > LIMIT.depth) fail("IMPORT_RESOURCE_LIMIT");
    }
    if (XMLValidator.validate(raw) !== true) fail("IMPORT_CORRUPT");
  }
  for (const raw of parts.values()) validate(raw);
  return {
    tree(name) {
      const raw = parts.get(name);
      validate(raw);
      return parser.parse(raw);
    },
    order(name) {
      const raw = parts.get(name);
      validate(raw);
      return ordered.parse(raw);
    },
  };
}

function relationships(part, tools, parts, names) {
  const relName = path.posix.join(
    path.posix.dirname(part),
    "_rels",
    `${path.posix.basename(part)}.rels`,
  );
  if (!parts.has(relName)) return [];
  return list(tools.tree(relName).Relationships?.Relationship).map(
    (relationship) => {
      const rawTarget = relationship["@_Target"];
      if (typeof rawTarget !== "string") fail("IMPORT_CORRUPT");
      const external = relationship["@_TargetMode"] === "External";
      let target = rawTarget;
      if (!external) {
        try {
          target = decodeURIComponent(rawTarget.split("#")[0]);
        } catch {
          fail("IMPORT_CORRUPT");
        }
        if (target.includes("\\")) fail("IMPORT_CORRUPT");
        target = target.startsWith("/")
          ? target.slice(1)
          : path.posix.normalize(
              path.posix.join(path.posix.dirname(part), target),
            );
        if (target.startsWith("../")) fail("IMPORT_CORRUPT");
      }
      return {
        id: relationship["@_Id"],
        type: String(relationship["@_Type"] ?? "")
          .split("/")
          .at(-1),
        target,
        external,
        missing: !external && !names.has(target),
      };
    },
  );
}

function collectParagraphs(nodes) {
  const result = [];
  function text(nodesToRead) {
    let output = "";
    for (const node of list(nodesToRead))
      for (const [name, value] of Object.entries(node)) {
        if (name === "#text") output += String(value);
        else if (name === "br") output += "\n";
        else if (name !== ":@" && Array.isArray(value)) output += text(value);
      }
    return output;
  }
  function visit(children) {
    for (const node of list(children))
      for (const [name, value] of Object.entries(node)) {
        if (name === "p") result.push(text(value));
        else if (name !== ":@" && Array.isArray(value)) visit(value);
      }
  }
  visit(nodes);
  return result;
}

function textValues(node, keys = new Set(["t", "v"])) {
  const found = [];
  function walk(value) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (keys.has(key)) {
        for (const item of list(child)) {
          if (typeof item === "string" || typeof item === "number")
            found.push(String(item));
          else if (item && typeof item === "object" && "#text" in item)
            found.push(String(item["#text"]));
          else walk(item);
        }
      } else if (!key.startsWith("@_")) walk(child);
    }
  }
  walk(node);
  return found;
}

function result(html, notices, hasText) {
  if (Buffer.byteLength(html) > LIMIT.output || notices.length > 10000)
    fail("IMPORT_RESOURCE_LIMIT");
  return {
    html,
    coverage: hasText ? (notices.length ? "partial" : "complete") : "no_text",
    notices,
  };
}
const paragraphHtml = (text) =>
  text
    .split(/\n\s*\n/)
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
function notice(notices, code, location, message) {
  notices.push({ code, location, message });
}

async function classify(bytes, filename, archive) {
  const buffer = Buffer.from(bytes);
  if (buffer.length > LIMIT.input) fail("IMPORT_RESOURCE_LIMIT");
  if (buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1") {
    const { default: CFB } = await import("cfb");
    const container = CFB.read(buffer, { type: "buffer" });
    if (
      container.FullPaths.some((name) => name.endsWith("/EncryptionInfo")) &&
      container.FullPaths.some((name) => name.endsWith("/EncryptedPackage"))
    )
      fail("IMPORT_ENCRYPTED");
    fail("IMPORT_UNSUPPORTED");
  }
  if (
    buffer.subarray(0, 4).toString("hex") === "504b0304" ||
    buffer.subarray(0, 4).toString("hex") === "504b0506"
  ) {
    const zip = archive ?? (await zipParts(bytes));
    if (!zip.parts.has("[Content_Types].xml")) fail("IMPORT_UNSUPPORTED");
    const tools = await xmlTools(zip.parts);
    const types = list(tools.tree("[Content_Types].xml").Types?.Override);
    const candidates = [
      ["docx", "word/document.xml", "wordprocessingml.document.main+xml"],
      ["xlsx", "xl/workbook.xml", "spreadsheetml.sheet.main+xml"],
      ["pptx", "ppt/presentation.xml", "presentationml.presentation.main+xml"],
    ].filter(([, part, type]) =>
      types.some(
        (item) =>
          item["@_PartName"] === `/${part}` &&
          String(item["@_ContentType"]).endsWith(type),
      ),
    );
    if (candidates.length !== 1) fail("IMPORT_UNSUPPORTED");
    if (!zip.parts.has(candidates[0][1])) fail("IMPORT_CORRUPT");
    return candidates[0][0];
  }
  if (buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) return "pdf";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    if (
      buffer.length < 33 ||
      buffer.toString("ascii", 12, 16) !== "IHDR" ||
      buffer.readUInt32BE(16) === 0 ||
      buffer.readUInt32BE(20) === 0
    )
      fail("IMPORT_CORRUPT");
    return "image";
  }
  if (/^GIF8[79]a/.test(buffer.toString("ascii", 0, 6))) {
    if (
      buffer.length < 14 ||
      !buffer.readUInt16LE(6) ||
      !buffer.readUInt16LE(8)
    )
      fail("IMPORT_CORRUPT");
    return "image";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    if (buffer.length < 12) fail("IMPORT_CORRUPT");
    return "image";
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF") {
    if (buffer.length < 20 || buffer.readUInt32LE(4) + 8 < buffer.length)
      fail("IMPORT_CORRUPT");
    if (buffer.toString("ascii", 8, 12) === "WEBP") return "image";
    if (
      buffer.toString("ascii", 8, 12) === "WAVE" &&
      buffer.includes(Buffer.from("fmt "))
    )
      return "audio";
  }
  if (buffer.toString("ascii", 0, 4) === "fLaC" && buffer.length >= 42)
    return "audio";
  if (
    buffer.toString("ascii", 0, 4) === "OggS" &&
    buffer.length >= 27 &&
    buffer[4] === 0
  )
    return "audio";
  if (
    buffer.toString("ascii", 0, 3) === "ID3" &&
    buffer.length >= 10 &&
    buffer[3] >= 2 &&
    buffer[3] <= 4
  ) {
    if ([...buffer.subarray(6, 10)].some((byte) => byte > 127))
      fail("IMPORT_CORRUPT");
    const size =
      (buffer[6] << 21) + (buffer[7] << 14) + (buffer[8] << 7) + buffer[9];
    if (size + 10 >= LIMIT.input * 4) fail("IMPORT_CORRUPT");
    return "audio";
  }
  if (
    buffer.length > 4 &&
    buffer[0] === 0xff &&
    buffer[1] !== 0xfe &&
    (buffer[1] & 0xe0) === 0xe0 &&
    (buffer[1] & 6) !== 0 &&
    (buffer[2] & 0xf0) !== 0xf0 &&
    (buffer[2] & 0x0c) !== 0x0c
  )
    return "audio";
  if (
    buffer.length >= 24 &&
    buffer.toString("ascii", 4, 8) === "ftyp" &&
    /M4A |M4B /.test(buffer.toString("ascii", 8, 24))
  )
    return "audio";
  const text = decode(bytes);
  if (
    /^\s*(?:<!doctype\s+html\b|<html\b|<(?:head|body|p|h[1-6]|div|article|section|table|style)\b)/i.test(
      text,
    )
  )
    return "html";
  const extension = path.extname(filename).toLowerCase();
  if ([".md", ".markdown"].includes(extension)) return "markdown";
  if ([".html", ".htm"].includes(extension)) return "html";
  if ([".txt", ".text", ""].includes(extension)) return "text";
  fail("IMPORT_UNSUPPORTED");
}

async function extractOffice(bytes, format, archive) {
  const { parts, names } = archive;
  const tools = await xmlTools(parts);
  const notices = [];
  if (format === "docx") {
    const { default: mammoth } = await import("mammoth");
    const extracted = await mammoth.extractRawText(
      { buffer: Buffer.from(bytes) },
      { externalFileAccess: false },
    );
    let text = extracted.value;
    for (const name of names) {
      if (
        /^word\/(header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(
          name,
        )
      ) {
        const extra = textValues(tools.tree(name), new Set(["t"])).join("\n");
        if (extra.trim()) text += `\n\n${name}\n${extra}`;
      }
      if (/^word\/(media|embeddings|charts|diagrams)\//.test(name))
        notice(
          notices,
          "UNEXTRACTED_PART",
          name,
          "画像・埋め込み・図表の内容は本文の文字抽出に含まれません。元ファイルを確認してください。",
        );
    }
    for (const warning of extracted.messages)
      notice(
        notices,
        "DOCUMENT_NOTICE",
        "word/document.xml",
        warning.type === "warning"
          ? "文書の一部の構造を文字として読み取れませんでした。元ファイルを確認してください。"
          : "文書の抽出結果を元ファイルと確認してください。",
      );
    for (const relation of relationships(
      "word/document.xml",
      tools,
      parts,
      names,
    )) {
      if (relation.external && relation.type !== "hyperlink")
        notice(
          notices,
          "EXTERNAL_PART",
          "word/document.xml",
          "外部参照の内容は取得していません。",
        );
      if (relation.missing)
        notice(
          notices,
          "UNREADABLE_PART",
          relation.target,
          "参照先の情報がファイルに含まれていません。元ファイルを確認してください。",
        );
    }
    return result(paragraphHtml(text), notices, Boolean(text.trim()));
  }
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes));
    let html = "";
    let hasText = false;
    let cellCount = 0;
    function cellText(value, location) {
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value.toISOString();
      if (typeof value !== "object") return String(value);
      if ("formula" in value || "sharedFormula" in value) {
        if (value.result === undefined) {
          notice(
            notices,
            "FORMULA_NOT_CALCULATED",
            location,
            "数式の保存済み計算結果がありません。元のアプリで再計算して保存してください。",
          );
          return `[計算結果なし: ${value.formula ?? value.sharedFormula}]`;
        }
        return cellText(value.result, location);
      }
      if ("richText" in value)
        return value.richText.map((item) => item.text).join("");
      if ("error" in value) return value.error;
      if ("text" in value) return value.text;
      notice(
        notices,
        "UNEXTRACTED_CELL",
        location,
        "未対応のセル形式です。元ファイルを確認してください。",
      );
      return "";
    }
    for (const sheet of workbook.worksheets) {
      html += `<section><h2>${escapeHtml(sheet.name)}</h2><table>`;
      sheet.eachRow((row) => {
        html += "<tr>";
        row.eachCell({ includeEmpty: true }, (cell) => {
          if (++cellCount > 200000) fail("IMPORT_RESOURCE_LIMIT");
          if (cell.isMerged && cell.master.address !== cell.address) return;
          const value = cellText(cell.value, `${sheet.name}!${cell.address}`);
          hasText ||= Boolean(value.trim());
          html += `<td>${escapeHtml(value)}</td>`;
          if (Buffer.byteLength(html) > LIMIT.output)
            fail("IMPORT_RESOURCE_LIMIT");
        });
        html += "</tr>";
      });
      html += "</table></section>";
    }
    for (const name of names)
      if (
        /^xl\/(charts|drawings|media|embeddings|externalLinks)\//.test(name) &&
        !name.endsWith("/")
      )
        notice(
          notices,
          "UNEXTRACTED_PART",
          name,
          "図表・画像・埋め込み・外部参照は表の文字抽出に含まれません。元ファイルを確認してください。",
        );
    return result(html, notices, hasText);
  }
  const presentation = tools.tree("ppt/presentation.xml");
  const rootRelations = relationships(
    "ppt/presentation.xml",
    tools,
    parts,
    names,
  );
  let html = "";
  let hasText = false;
  let index = 0;
  const visited = new Set();
  for (const id of list(presentation.presentation?.sldIdLst?.sldId)) {
    if (++index > LIMIT.pages) fail("IMPORT_RESOURCE_LIMIT");
    const relation = rootRelations.find(
      (item) => item.id === id["@_r:id"] && item.type === "slide",
    );
    if (
      !relation ||
      relation.external ||
      relation.missing ||
      !relation.target.startsWith("ppt/slides/")
    )
      fail("IMPORT_CORRUPT");
    const part = relation.target;
    const texts = collectParagraphs(tools.order(part));
    const slideVisited = new Set([part]);
    visited.add(part);
    const queue = relationships(part, tools, parts, names).map((item) => ({
      ...item,
      from: part,
    }));
    while (queue.length) {
      const item = queue.shift();
      if (item.external) {
        if (item.type !== "hyperlink")
          notice(
            notices,
            "EXTERNAL_PART",
            item.from,
            "外部参照の内容は取得していません。",
          );
        continue;
      }
      if (slideVisited.has(item.target)) continue;
      slideVisited.add(item.target);
      visited.add(item.target);
      if (
        ["slideLayout", "slideMaster", "notesMaster", "theme"].includes(
          item.type,
        )
      )
        continue;
      if (item.missing) {
        notice(
          notices,
          "UNREADABLE_PART",
          item.target,
          "参照先の情報がファイルに含まれていません。元ファイルを確認してください。",
        );
        continue;
      }
      if (item.type === "notesSlide") {
        const noteTree = tools.tree(item.target);
        for (const shape of list(noteTree.notes?.cSld?.spTree?.sp)) {
          const placeholder = shape.nvSpPr?.nvPr?.ph?.["@_type"];
          if (["sldNum", "dt", "hdr", "ftr", "sldImg"].includes(placeholder))
            continue;
          texts.push(...textValues(shape.txBody, new Set(["t"])));
        }
      } else if (item.type === "chart")
        texts.push(...textValues(tools.tree(item.target)));
      else if (["diagramData", "diagramDrawing"].includes(item.type))
        texts.push(...textValues(tools.tree(item.target), new Set(["t"])));
      else if (
        [
          "diagramColors",
          "diagramLayout",
          "diagramQuickStyle",
          "chartStyle",
          "chartColorStyle",
          "themeOverride",
          "tags",
        ].includes(item.type)
      )
        continue;
      else {
        notice(
          notices,
          "UNEXTRACTED_PART",
          item.target,
          "画像・埋め込みなど、この部分の内容は文字抽出に含まれません。元ファイルを確認してください。",
        );
        continue;
      }
      queue.push(
        ...relationships(item.target, tools, parts, names).map((child) => ({
          ...child,
          from: item.target,
        })),
      );
    }
    const text = texts.filter((line) => line.trim()).join("\n");
    hasText ||= Boolean(text.trim());
    html += `<section><h2>スライド ${index}</h2>${paragraphHtml(text)}</section>`;
  }
  if (!index) fail("IMPORT_CORRUPT");
  for (const name of names)
    if (
      /^ppt\/(charts|diagrams|embeddings|notesSlides)\/[^/]+\.xml$/.test(
        name,
      ) &&
      !visited.has(name)
    )
      notice(
        notices,
        "UNEXTRACTED_PART",
        name,
        "スライドから参照されていない付属情報は抽出していません。",
      );
  return result(html, notices, hasText);
}

async function extractPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const base = fileURLToPath(
    new URL("../../", import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs")),
  );
  const task = getDocument({
    data: Uint8Array.from(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    useWorkerFetch: false,
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    verbosity: 0,
    maxImageSize: 16_000_000,
  });
  try {
    const document = await task.promise;
    if (document.numPages > LIMIT.pages) fail("IMPORT_RESOURCE_LIMIT");
    let html = "";
    let hasText = false;
    const notices = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      try {
        const content = await page.getTextContent();
        const text = content.items
          .filter((item) => "str" in item)
          .map((item) => item.str + (item.hasEOL ? "\n" : " "))
          .join("")
          .trim();
        if (!text)
          notice(
            notices,
            "PAGE_NO_TEXT",
            `page:${index}`,
            `${index} ページ目の文字を抽出できませんでした。画像や図の内容は元ファイルを確認してください。`,
          );
        else {
          hasText = true;
          html += `<section><h2>ページ ${index}</h2>${paragraphHtml(text)}</section>`;
        }
        if (Buffer.byteLength(html) > LIMIT.output)
          fail("IMPORT_RESOURCE_LIMIT");
      } finally {
        page.cleanup();
      }
    }
    return result(html, notices, hasText);
  } finally {
    await task.destroy();
  }
}

async function main() {
  const bytes = workerData.bytes;
  if (!(bytes instanceof Uint8Array) || bytes.length > LIMIT.input)
    fail("IMPORT_RESOURCE_LIMIT");
  if (workerData.operation === "detect")
    return classify(bytes, workerData.filename);
  const format = workerData.format;
  const isZip = Buffer.from(bytes.subarray(0, 2)).toString("ascii") === "PK";
  const archive = isZip ? await zipParts(bytes) : undefined;
  const detected = await classify(
    bytes,
    `input.${format === "text" ? "txt" : format === "markdown" ? "md" : format}`,
    archive,
  );
  if (detected !== format) fail("IMPORT_UNSUPPORTED");
  if (["docx", "xlsx", "pptx"].includes(format))
    return extractOffice(bytes, format, archive);
  if (format === "pdf") return extractPdf(bytes);
  if (["image", "audio"].includes(format))
    return result(
      "",
      [
        {
          code: "NEEDS_AI",
          location: "document",
          message: "この形式から文字を抽出するには AI 連携が必要です。",
        },
      ],
      false,
    );
  const text = decode(bytes);
  if (format === "html") return result(text, [], Boolean(text.trim()));
  if (format === "markdown") {
    const { marked } = await import("marked");
    return result(
      await marked.parse(text, { async: true }),
      [],
      Boolean(text.trim()),
    );
  }
  return result(paragraphHtml(text), [], Boolean(text.trim()));
}

try {
  parentPort.postMessage({ ok: true, value: await main() });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    code:
      error.name === "PasswordException"
        ? "IMPORT_ENCRYPTED"
        : typeof error.code === "string"
          ? error.code
          : "IMPORT_CORRUPT",
  });
}

import {
  PDF_DOCUMENT_PROFILE,
  type PdfDocumentInput,
  type PdfDocumentPlan,
  type PdfDocumentSegment,
} from "@repo/core/application/pdf/document";
import { BusinessRuleError } from "@repo/core/domain/error";
import { type AnyNode, type ChildNode, Element, isTag, Text } from "domhandler";
import { parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";
import { exportFilename } from "../exportDocument/filename";
import { processCss } from "../reference/cssPolicy";
import {
  mediaAttributes,
  parseHtml,
  serializeHtml as serializeShallow,
} from "../reference/htmlDocument";
import { structureOptions } from "../reference/htmlStructure";

const unavailable = "未取得または許可されていない媒体参照を除去しました。";
const unsafeCss = "安全に表示できない装飾を除去しました。";
const videoNotice = "動画を含むノートです。PDFには映像を収録していません。";
const audioNotice = "音声を含むノートです。PDFには音声を収録していません。";
const invalid = () =>
  new BusinessRuleError(
    "PDF_DOCUMENT_INVALID",
    "文書を安全にPDFへ書き出せませんでした。",
  );
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function elements(nodes: readonly AnyNode[]): Element[] {
  const result: Element[] = [];
  const pending = [...nodes];
  while (pending.length) {
    const node = pending.pop();
    if (!node) break;
    if (isTag(node)) result.push(node);
    if ("children" in node)
      for (const child of node.children) pending.push(child);
  }
  return result;
}

function serialize(root: AnyNode): string {
  const pending: (AnyNode | string)[] = [root];
  const parts: string[] = [];
  while (pending.length) {
    const node = pending.pop();
    if (node === undefined) break;
    if (typeof node === "string") {
      parts.push(node);
      continue;
    }
    if (isTag(node)) {
      const shallow = serializeShallow(
        new Element(node.name, { ...node.attribs }, [], node.type),
      );
      const closing = `</${node.name}>`;
      if (!shallow.endsWith(closing)) {
        parts.push(shallow);
        continue;
      }
      parts.push(shallow.slice(0, -closing.length));
      pending.push(closing);
    } else if (!("children" in node)) {
      parts.push(serializeShallow(node));
      continue;
    }
    if ("children" in node)
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child) pending.push(child);
      }
  }
  return parts.join("");
}

function safeLink(raw: string, appUrl: string): string | null {
  if (
    !raw ||
    raw.length > 8192 ||
    /[\p{Cc}\p{Cf}\\]/u.test(raw) ||
    raw.startsWith("//")
  )
    return null;
  if (raw.startsWith("#")) return raw;
  try {
    const url = new URL(raw, appUrl);
    return ["http:", "https:", "mailto:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function staticMedia(
  input: PdfDocumentInput,
  nodes: readonly Element[],
  notices: Set<string>,
) {
  const slots = new Map(input.media.map((slot) => [slot.url, slot]));
  for (const node of nodes) {
    if (node.name !== "video" && node.name !== "audio") continue;
    const notice = node.name === "video" ? videoNotice : audioNotice;
    notices.add(notice);
    const poster = slots.get(node.attribs.poster ?? "");
    const children: ChildNode[] = [];
    if (poster?.mime.startsWith("image/")) {
      children.push(
        new Element("img", {
          src: poster.url,
          alt: "動画の静止画",
          ...(node.attribs.width ? { width: node.attribs.width } : {}),
          ...(node.attribs.height ? { height: node.attribs.height } : {}),
        }),
      );
    } else if (node.attribs.poster) notices.add(unavailable);
    children.push(
      ...node.children.filter(
        (child) => !isTag(child) || !["source", "track"].includes(child.name),
      ),
      new Element("p", {}, [new Text(notice)]),
    );
    node.name = "figure";
    for (const name of ["src", "poster", "srcset", "controls", "preload"])
      delete node.attribs[name];
    node.children = children;
    for (const child of children) child.parent = node;
  }
}

function build(
  input: PdfDocumentInput,
  previous: string | null,
): PdfDocumentPlan {
  const slots = new Map(input.media.map((slot) => [slot.url, slot]));
  if (
    slots.size !== input.media.length ||
    new Set(input.media.map((slot) => slot.id)).size !== input.media.length
  )
    throw invalid();
  let app: URL;
  try {
    app = new URL(input.appUrl);
  } catch {
    throw invalid();
  }
  if (!/^https?:$/.test(app.protocol) || app.username || app.password)
    throw invalid();
  const raw = parseHtml(input.html);
  const notices = new Set<string>();
  staticMedia(input, raw.elements, notices);
  const current = elements(raw.document.children);
  if (input.style === "default")
    for (const node of current) {
      delete node.attribs.style;
      if (node.name === "style") node.children = [];
    }
  const allowed = (url: string) => {
    if (slots.has(url)) return true;
    notices.add(unavailable);
    return false;
  };
  const firstCss = processCss(current, new Map(), { allow: allowed });
  if (firstCss.notices.length) notices.add(unsafeCss);
  const collision = [
    input.html,
    input.title,
    input.defaultCss,
    input.appUrl,
    input.noteId,
    serialize(raw.document),
    ...input.media.flatMap((slot) => [slot.id, slot.url, slot.mime]),
    previous ?? "",
  ].join("\n");
  let next = 0;
  let prefix: string;
  do {
    prefix = `https://hollow-pdf-plan-${next++}.invalid/slot/`;
  } while (collision.includes(prefix));
  const replacements = new Map(
    input.media.map((slot, index) => [slot.url, `${prefix}${index}/end`]),
  );
  const markers = new Map(
    input.media.map((slot, index) => [`${prefix}${index}/end`, slot.id]),
  );
  mediaAttributes(current, (url, kind) =>
    kind === "image" && allowed(url) ? (replacements.get(url) ?? null) : null,
  );
  const css = processCss(current, replacements, {
    allow: (url) => markers.has(url),
  });
  if (css.notices.length) notices.add(unsafeCss);
  const before = serialize(raw.document);
  const structured = sanitizeHtml(before, {
    ...structureOptions,
    nestingLimit: Buffer.byteLength(before) + 1,
    transformTags: {
      a: (_name, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
  if (structured !== before)
    notices.add("安全に出力できない要素または属性を除去しました。");
  const document = parseDocument(structured, { decodeEntities: true });
  if (input.style === "default") {
    const style = new Element("style", {}, [new Text(input.defaultCss)]);
    if (processCss([style], new Map(), { allow: () => false }).notices.length)
      notices.add(unsafeCss);
    document.children.unshift(style);
  }
  for (const node of elements(document.children)) {
    delete node.attribs["data-hollow-stylesheet-base"];
    if (node.name === "a") {
      const href = safeLink(node.attribs.href ?? "", input.appUrl);
      if (href) node.attribs.href = href;
      else delete node.attribs.href;
    }
  }
  const csp =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";
  const appendix = notices.size
    ? `<aside aria-label="PDFについて"><hr><h2>PDFについて</h2><ul>${[...notices].map((notice) => `<li>${escapeHtml(notice)}</li>`).join("")}</ul></aside>`
    : "";
  const output = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"><title>${escapeHtml(input.title)}</title></head><body>${serialize(document)}${appendix}</body></html>`;
  // Sanitization may join user text into a marker-shaped string.
  if (previous === null) return build(input, output);
  const segments: PdfDocumentSegment[] = [];
  const mediaIds = new Set<string>();
  let cursor = 0;
  while (cursor < output.length) {
    const start = output.indexOf(prefix, cursor);
    if (start < 0) {
      segments.push({ kind: "text", value: output.slice(cursor) });
      break;
    }
    if (start > cursor)
      segments.push({ kind: "text", value: output.slice(cursor, start) });
    const end = output.indexOf("/end", start + prefix.length);
    const id = end < 0 ? undefined : markers.get(output.slice(start, end + 4));
    if (!id) throw invalid();
    segments.push({ kind: "media", id });
    mediaIds.add(id);
    cursor = end + 4;
  }
  return {
    profile: PDF_DOCUMENT_PROFILE,
    filename: exportFilename(input.title, input.noteId, "html").replace(
      /\.html$/,
      ".pdf",
    ),
    segments,
    mediaIds: [...mediaIds],
    notices: [...notices],
  };
}

export function planPdfDocument(input: PdfDocumentInput): PdfDocumentPlan {
  return build(input, null);
}

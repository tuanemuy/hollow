import type {
  ExportDocumentInput,
  ExportDocumentPlan,
  ExportSegment,
} from "@repo/core/application/export/document";
import type { ReferenceNotice } from "@repo/core/application/ports/referenceProcessor";
import { type AnyNode, Element, isTag, Text } from "domhandler";
import { parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";
import { processCss } from "../reference/cssPolicy";
import {
  mediaAttributes,
  parseHtml,
  referenceUrl,
  serializeHtml as serializeShallow,
} from "../reference/htmlDocument";
import { structureOptions } from "../reference/htmlStructure";
import { exportFilename } from "./filename";
import {
  checkInput,
  failure,
  outputBounds,
  PROFILE,
  plannedBytes,
} from "./limits";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const escapeMarkdown = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/[\\`*_{}[\]<>#!|+\-=().~]/g, "\\$&");
const markdownDestination = (value: string) =>
  value
    .replace(/[<>\s]/g, (character) => encodeURIComponent(character))
    .replace(/&/g, "&amp;");
const markdownTitle = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, " ");
const unavailableNotice =
  "未取得または許可されていない媒体参照を除去しました。";
const cssNotice = "安全に表示できない装飾を除去しました。";

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

function allElements(nodes: readonly AnyNode[]): Element[] {
  const result: Element[] = [];
  const pending = nodes.map((node) => ({ node, depth: 0 }));
  while (pending.length) {
    const item = pending.pop();
    if (!item) break;
    if (isTag(item.node)) result.push(item.node);
    if ("children" in item.node)
      for (const node of item.node.children)
        pending.push({ node, depth: item.depth + 1 });
  }
  return result;
}

function textContent(node: AnyNode): string {
  const pending = [node];
  const parts: string[] = [];
  while (pending.length) {
    const current = pending.pop();
    if (!current) break;
    if (current.type === "text") parts.push(current.data);
    else if ("children" in current)
      for (let i = current.children.length - 1; i >= 0; i--) {
        const child = current.children[i];
        if (child) pending.push(child);
      }
  }
  return parts.join("");
}

function serializeHtml(root: AnyNode): string {
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
      const shallow = new Element(
        node.name,
        { ...node.attribs },
        [],
        node.type,
      );
      const serialized = serializeShallow(shallow);
      const closing = `</${node.name}>`;
      if (!serialized.endsWith(closing)) {
        parts.push(serialized);
        continue;
      }
      parts.push(serialized.slice(0, -closing.length));
      pending.push(closing);
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child) pending.push(child);
      }
    } else if ("children" in node) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child) pending.push(child);
      }
    } else parts.push(serializeShallow(node));
  }
  return parts.join("");
}

function longestBackticks(text: string): number {
  let longest = 0;
  for (const match of text.matchAll(/`+/g))
    longest = Math.max(longest, match[0].length);
  return longest;
}

function markdown(nodes: readonly AnyNode[], collisionSource: string): string {
  const lowerCollisionSource = collisionSource.toLowerCase();
  const definitions = new Map<string, { label: string; title: string }>();
  let next = 0;
  const reference = (url: string, title: string): string => {
    const key = JSON.stringify([url, title]);
    let entry = definitions.get(key);
    if (!entry) {
      let label: string;
      do {
        label = `hollow-asset-${++next}`;
      } while (lowerCollisionSource.includes(label));
      entry = { label, title };
      definitions.set(key, entry);
    }
    return entry.label;
  };
  const rendered = new Map<AnyNode, string>();
  const render = (node: AnyNode) => rendered.get(node) ?? "";
  const renderNode = (node: AnyNode): string => {
    if (node.type === "text")
      return escapeMarkdown(node.data.replace(/[ \t\r\n\f]+/g, " "));
    if (!isTag(node)) return "";
    const attrs = Object.keys(node.attribs);
    const fallback = () =>
      [
        "p",
        "div",
        "section",
        "article",
        "table",
        "pre",
        "blockquote",
        "ul",
        "ol",
        "style",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ].includes(node.name)
        ? `\n\n${serializeHtml(node)}\n\n`
        : serializeHtml(node);
    const allowed =
      node.name === "a"
        ? ["href", "title", "rel"]
        : node.name === "img"
          ? ["src", "alt", "title"]
          : [];
    if (attrs.some((key) => !allowed.includes(key))) return fallback();
    const children = () => node.children.map(render).join("");
    switch (node.name) {
      case "li":
        return node.parent &&
          isTag(node.parent) &&
          ["ul", "ol"].includes(node.parent.name)
          ? children()
          : fallback();
      case "p":
        return `\n\n${children().trim()}\n\n`;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return `\n\n${"#".repeat(Number(node.name[1]))} ${children().trim()}\n\n`;
      case "strong":
      case "b":
      case "em":
      case "i": {
        const content = children();
        if (!content || content !== content.trim()) return fallback();
        const marker = node.name === "strong" || node.name === "b" ? "**" : "*";
        return `${marker}${content}${marker}`;
      }
      case "br":
        return "  \n";
      case "hr":
        return "\n\n---\n\n";
      case "a": {
        const href = node.attribs.href;
        if (!href) return children();
        const destination = markdownDestination(href);
        const title = node.attribs.title
          ? ` "${markdownTitle(node.attribs.title)}"`
          : "";
        return `[${children()}](<${destination}>${title})`;
      }
      case "img": {
        const src = node.attribs.src;
        return src
          ? `![${escapeMarkdown((node.attribs.alt ?? "").replace(/[\r\n]/g, " "))}][${reference(src, node.attribs.title ?? "")}]`
          : fallback();
      }
      case "code": {
        if (node.children.some((child) => child.type !== "text"))
          return serializeHtml(node);
        const text = textContent(node);
        if (/[\r\n]/.test(text) || !text.trim()) return fallback();
        const width = longestBackticks(text) + 1;
        const fence = "`".repeat(width);
        return `${fence} ${text} ${fence}`;
      }
      case "pre": {
        if (
          node.children.some(
            (child) =>
              child.type !== "text" &&
              !(
                isTag(child) &&
                child.name === "code" &&
                !Object.keys(child.attribs).length &&
                child.children.every((part) => part.type === "text")
              ),
          )
        )
          return serializeHtml(node);
        const text = textContent(node);
        const fence = "`".repeat(Math.max(3, longestBackticks(text) + 1));
        return `\n\n${fence}\n${text}${text.endsWith("\n") ? "" : "\n"}${fence}\n\n`;
      }
      case "blockquote":
        return `\n\n${children()
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      case "ul":
      case "ol": {
        if (
          node.children.some((child) =>
            child.type === "text"
              ? !!child.data.trim()
              : !isTag(child) ||
                child.name !== "li" ||
                Object.keys(child.attribs).length,
          )
        )
          return serializeHtml(node);
        let ordinal = 0;
        return `\n\n${node.children
          .filter(isTag)
          .map((item) => {
            const marker = node.name === "ul" ? "- " : `${++ordinal}. `;
            return render(item)
              .trim()
              .split("\n")
              .map(
                (line, index) =>
                  `${index ? " ".repeat(marker.length) : marker}${line}`,
              )
              .join("\n");
          })
          .join("\n")}\n\n`;
      }
      default:
        return fallback();
    }
  };
  const pending = [...nodes];
  const order: AnyNode[] = [];
  while (pending.length) {
    const node = pending.pop();
    if (!node) break;
    order.push(node);
    if ("children" in node) pending.push(...node.children);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    if (!node) continue;
    rendered.set(node, renderNode(node));
    if ("children" in node)
      for (const child of node.children) rendered.delete(child);
  }
  let value = nodes.map(render).join("").trim();
  for (const [key, entry] of definitions) {
    if (!value.includes(`][${entry.label}]`)) continue;
    const [url] = JSON.parse(key) as [string, string];
    const title = entry.title ? ` "${markdownTitle(entry.title)}"` : "";
    value += `\n\n[${entry.label}]: <${markdownDestination(url)}>${title}`;
  }
  return `${value}\n`;
}

export function planExportDocument(
  value: ExportDocumentInput,
): ExportDocumentPlan {
  return buildPlan(value, null);
}

function buildPlan(
  value: ExportDocumentInput,
  previousOutput: string | null,
): ExportDocumentPlan {
  const input = checkInput(value);
  const raw = parseHtml(input.html);
  const bounds = outputBounds(input);
  const notices = new Set<string>();
  const slots = new Map(input.media.map((slot) => [slot.url, slot]));
  const allowed = (
    url: string,
    kind: keyof ExportDocumentInput["external"],
  ) => {
    if (slots.has(url)) return true;
    const normalized = referenceUrl(url);
    if (
      normalized &&
      /^https?:\/\//i.test(normalized) &&
      input.external[kind].includes(normalized)
    )
      return true;
    if (/^data:/i.test(url)) throw failure("EXPORT_MEDIA_UNAVAILABLE");
    notices.add(unavailableNotice);
    return false;
  };
  if (input.style === "default") {
    for (const element of raw.elements) {
      delete element.attribs.style;
      if (element.name === "style") element.children = [];
    }
  }
  const hasCss = raw.elements.some(
    (element) =>
      Boolean(element.attribs.style) ||
      (element.name === "style" && element.children.length > 0),
  );
  const initialCss = hasCss
    ? processCss(raw.elements, new Map(), {
        allow: (url, kind) =>
          allowed(url, kind === "font" ? "fonts" : "backgrounds"),
      })
    : { notices: [] };
  if (initialCss.notices.length) notices.add(cssNotice);
  const canonical = serializeHtml(raw.document);
  const collisionSource = [
    canonical,
    input.html,
    input.title,
    input.defaultCss,
    input.appUrl,
    ...input.media.flatMap((slot) => [slot.id, slot.url, slot.mime]),
    ...Object.values(input.external).flat(),
  ].join("\n");
  let index = 0;
  let prefix: string;
  do {
    prefix = `https://hollow-export-${index++}.invalid/slot/`;
  } while (
    collisionSource.includes(prefix) ||
    previousOutput?.includes(prefix)
  );
  const replacements = new Map(
    input.media.map((slot, i) => [slot.url, `${prefix}${i}/end`]),
  );
  const markers = new Map(
    input.media.map((slot, i) => [`${prefix}${i}/end`, slot.id]),
  );
  const mediaNotices: ReferenceNotice[] = [];
  mediaAttributes(
    raw.elements,
    (url, kind) =>
      allowed(url, kind === "image" ? "images" : "media")
        ? (replacements.get(url) ?? url)
        : null,
    mediaNotices,
  );
  if (mediaNotices.length) notices.add(unavailableNotice);
  const css = hasCss
    ? processCss(raw.elements, replacements, {
        allow: (url, kind) =>
          markers.has(url) ||
          allowed(url, kind === "font" ? "fonts" : "backgrounds"),
      })
    : { notices: [] };
  if (css.notices.length) notices.add(cssNotice);
  const beforeStructure = serializeHtml(raw.document);
  const structured = {
    html: sanitizeHtml(beforeStructure, {
      ...structureOptions,
      nestingLimit: Buffer.byteLength(beforeStructure) + 1,
      transformTags: {
        a: (_name, attribs) => ({
          tagName: "a",
          attribs: { ...attribs, rel: "noopener noreferrer" },
        }),
      },
    }),
  };
  if (structured.html !== beforeStructure)
    notices.add("安全に出力できない要素または属性を除去しました。");
  if (Buffer.byteLength(structured.html) > bounds.text)
    throw failure("EXPORT_DOCUMENT_LIMIT");
  const document = parseDocument(structured.html, { decodeEntities: true });
  if (input.style === "default") {
    const style = new Element("style", {}, [new Text(input.defaultCss)]);
    processCss([style], new Map(), { allow: () => false });
    document.children.unshift(style);
  }
  for (const element of allElements(document.children)) {
    delete element.attribs["data-hollow-stylesheet-base"];
    if (element.name === "a") {
      const href = safeLink(element.attribs.href ?? "", input.appUrl);
      if (href) element.attribs.href = href;
      else delete element.attribs.href;
    }
  }
  const body = serializeHtml(document);
  if (input.format === "markdown")
    notices.add(
      "Markdown 閲覧器によっては埋め込み画像や HTML を表示できません。",
    );
  if (Object.values(input.external).some((urls) => urls.length > 0))
    notices.add(
      "外部参照は確認時点で許可されたURLです。後日の変更やオフライン時の表示は保証されません。",
    );
  const noticeHtml = notices.size
    ? `<aside aria-label="書き出しについて"><hr><h2>書き出しについて</h2><ul>${[...notices].map((notice) => `<li>${escapeHtml(notice)}</li>`).join("")}</ul></aside>`
    : "";
  const noticeMarkdown = notices.size
    ? `\n\n---\n\n> 書き出しについて\n>\n${[...notices].map((notice) => `> ${escapeMarkdown(notice)}\n`).join(">\n")}`
    : "";
  const csp =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; media-src data: https: http:; font-src data: https: http:; base-uri 'none'; form-action 'none'";
  const output =
    input.format === "html"
      ? `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"><title>${escapeHtml(input.title)}</title></head><body>${body}${noticeHtml}</body></html>`
      : markdown(document.children, collisionSource) + noticeMarkdown;
  if (Buffer.byteLength(output) > bounds.text)
    throw failure("EXPORT_DOCUMENT_LIMIT");
  // Sanitizing and converting can join user text into a marker-shaped string.
  if (previousOutput === null) return buildPlan(input, output);
  const segments: ExportSegment[] = [];
  let cursor = 0;
  while (cursor < output.length) {
    const start = output.indexOf(prefix, cursor);
    if (start === -1) {
      segments.push({ kind: "text", value: output.slice(cursor) });
      break;
    }
    if (start > cursor)
      segments.push({ kind: "text", value: output.slice(cursor, start) });
    const end = output.indexOf("/end", start + prefix.length);
    const id =
      end === -1 ? undefined : markers.get(output.slice(start, end + 4));
    if (!id) throw failure("EXPORT_DOCUMENT_INVALID");
    segments.push({ kind: "media", id });
    cursor = end + 4;
  }
  return {
    profile: PROFILE,
    filename: exportFilename(input.title, input.noteId, input.format),
    mime:
      input.format === "html"
        ? "text/html; charset=utf-8"
        : "text/markdown; charset=utf-8",
    segments,
    maxBytes: plannedBytes({ segments }, input),
    notices: [...notices],
  };
}

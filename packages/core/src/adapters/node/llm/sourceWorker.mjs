import { createHash } from "node:crypto";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import tls from "node:tls";
import { parentPort, workerData } from "node:worker_threads";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}
function noNetwork() {
  fail("LLM_SOURCE_INVALID");
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

const MAX_INPUT = 50 * 1024 * 1024;
const MAX_SEGMENT = 64 * 1024;
const MAX_SEGMENTS = 16;
const allowed = new Set([
  "p",
  "div",
  "section",
  "article",
  "main",
  "header",
  "footer",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "pre",
  "code",
  "strong",
  "em",
  "b",
  "i",
  "s",
  "del",
  "u",
  "sub",
  "sup",
  "span",
  "br",
  "hr",
  "a",
  "figure",
  "figcaption",
  "picture",
]);
const dropped = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "noscript",
  "head",
  "svg",
  "math",
  "link",
  "meta",
  "base",
]);
const atomic = new Set(["table", "pre", "code"]);
const voids = new Set(["br", "hr"]);
const notices = new Set();
const mediaMap = new Map();
const mediaCounts = new Map();
let mediaOccurrences = 0;
const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
const size = (text) => Buffer.byteLength(text, "utf8");

function rejectReserved(node, depth = 0) {
  if (depth > 128) fail("LLM_RESOURCE_LIMIT");
  if (
    /\[\[hollow-media:/i.test(node.value ?? "") ||
    (node.attrs ?? []).some((attribute) =>
      /\[\[hollow-media:/i.test(attribute.value),
    )
  )
    fail("LLM_SOURCE_INVALID");
  for (const child of node.childNodes ?? []) rejectReserved(child, depth + 1);
  if (node.content) rejectReserved(node.content, depth + 1);
}

function clean(node, depth = 0) {
  if (depth > 128) fail("LLM_RESOURCE_LIMIT");
  if (
    /\[\[hollow-media:/i.test(node.value ?? "") ||
    (node.attrs ?? []).some((attribute) =>
      /\[\[hollow-media:/i.test(attribute.value),
    )
  )
    fail("LLM_SOURCE_INVALID");
  if (node.nodeName === "#text") return { text: node.value };
  if (node.nodeName === "#comment" || node.nodeName === "#documentType")
    return null;
  if (dropped.has(node.tagName)) {
    notices.add("能動要素・スタイルは本文準備から除外しました。");
    return null;
  }
  if (["img", "video", "audio", "source", "canvas"].includes(node.tagName)) {
    notices.add("画像・音声・動画の内容は解釈していません。");
    const src = node.attrs?.find(
      (attribute) => attribute.name === "src",
    )?.value;
    const placeholder = mediaMap.get(src);
    if (placeholder) {
      if (++mediaOccurrences > 200) fail("LLM_RESOURCE_LIMIT");
      mediaCounts.set(placeholder, (mediaCounts.get(placeholder) ?? 0) + 1);
      return { placeholder };
    }
    const alt = node.attrs?.find(
      (attribute) => attribute.name === "alt",
    )?.value;
    return {
      tag: "span",
      children: [
        { text: alt ? `[画像の代替テキスト: ${alt}]` : "[媒体の内容は未解釈]" },
        ...(node.childNodes ?? [])
          .map((child) => clean(child, depth + 1))
          .filter(Boolean),
      ],
    };
  }
  const children = (node.childNodes ?? [])
    .map((child) => clean(child, depth + 1))
    .filter(Boolean);
  const attrs = (node.attrs ?? []).filter((attribute) => {
    const numeric =
      ((node.tagName === "td" || node.tagName === "th") &&
        ["colspan", "rowspan"].includes(attribute.name)) ||
      (node.tagName === "ol" && attribute.name === "start") ||
      (node.tagName === "li" && attribute.name === "value");
    return (
      numeric &&
      /^-?\d+$/.test(attribute.value) &&
      Number.isSafeInteger(Number(attribute.value))
    );
  });
  return {
    tag: allowed.has(node.tagName) ? node.tagName : "",
    children,
    attrs,
  };
}

function opening(node) {
  const attrs = (node.attrs ?? [])
    .map(({ name, value }) => ` ${name}="${escapeHtml(value)}"`)
    .join("");
  return `<${node.tag}${attrs}>`;
}

function serialize(node) {
  if ("placeholder" in node) return node.placeholder;
  if ("text" in node) return escapeHtml(node.text);
  const body = node.children.map(serialize).join("");
  if (!node.tag) return body;
  return voids.has(node.tag)
    ? opening(node)
    : `${opening(node)}${body}</${node.tag}>`;
}

function* split(node, budget) {
  if (budget < 16) fail("LLM_RESOURCE_LIMIT");
  if ("placeholder" in node) {
    if (size(node.placeholder) > budget) fail("LLM_RESOURCE_LIMIT");
    yield node.placeholder;
    return;
  }
  if ("text" in node) {
    let part = "";
    let bytes = 0;
    for (const character of node.text) {
      const escaped = escapeHtml(character);
      const length = size(escaped);
      if (bytes + length > budget) {
        yield part;
        part = "";
        bytes = 0;
      }
      part += escaped;
      bytes += length;
    }
    if (part) yield part;
    return;
  }
  if (atomic.has(node.tag)) {
    const value = serialize(node);
    if (size(value) > budget) fail("LLM_RESOURCE_LIMIT");
    yield value;
    return;
  }
  if (voids.has(node.tag)) {
    yield opening(node);
    return;
  }
  const start = node.tag ? opening(node) : "";
  const end = node.tag ? `</${node.tag}>` : "";
  const available = budget - size(start + end);
  let body = "";
  let bytes = 0;
  for (const child of node.children) {
    for (const part of split(child, available)) {
      const length = size(part);
      if (bytes + length > available) {
        yield start + body + end;
        body = "";
        bytes = 0;
      }
      body += part;
      bytes += length;
    }
  }
  if (body) yield start + body + end;
}

async function prepare() {
  const { bytes, format, media = [] } = workerData;
  if (
    !(bytes instanceof Uint8Array) ||
    !["text", "html", "markdown"].includes(format)
  )
    fail("LLM_SOURCE_INVALID");
  if (bytes.byteLength > MAX_INPUT) fail("LLM_RESOURCE_LIMIT");
  if (!Array.isArray(media) || media.length > 200) fail("LLM_RESOURCE_LIMIT");
  const placeholders = new Set();
  for (const entry of media) {
    if (
      !entry ||
      typeof entry.sourceUrl !== "string" ||
      !entry.sourceUrl ||
      size(entry.sourceUrl) > 2048 ||
      /\[\[hollow-media:/i.test(entry.sourceUrl) ||
      typeof entry.placeholder !== "string" ||
      !/^\[\[hollow-media:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\]$/.test(
        entry.placeholder,
      ) ||
      mediaMap.has(entry.sourceUrl) ||
      placeholders.has(entry.placeholder)
    )
      fail("LLM_SOURCE_INVALID");
    mediaMap.set(entry.sourceUrl, entry.placeholder);
    placeholders.add(entry.placeholder);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("LLM_SOURCE_INVALID");
  }
  if (!text.trim()) fail("LLM_SOURCE_INVALID");
  if (/\[\[hollow-media:/i.test(text)) fail("LLM_SOURCE_INVALID");
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13)
      fail("LLM_SOURCE_INVALID");
  }
  let roots;
  if (format === "text") {
    roots = text
      .replace(/\r\n?/g, "\n")
      .split(/\n[\t ]*\n/)
      .map((part) => ({
        tag: "p",
        children: part
          .split("\n")
          .flatMap((line, index) =>
            index
              ? [{ tag: "br", children: [] }, { text: line }]
              : [{ text: line }],
          ),
      }));
  } else {
    const { parse } = await import("parse5");
    if (format === "markdown") {
      const { marked } = await import("marked");
      text = marked.parse(text, { async: false, gfm: true });
    }
    const document = parse(text);
    rejectReserved(document);
    const html = document.childNodes.find((node) => node.tagName === "html");
    const body = html?.childNodes.find((node) => node.tagName === "body");
    roots = (body?.childNodes ?? []).map((node) => clean(node)).filter(Boolean);
    if (/<(?:script|style|link|meta|base)\b/i.test(text))
      notices.add("能動要素・スタイルは本文準備から除外しました。");
  }
  const segments = [];
  let current = "";
  let count = 0;
  let first = 0;
  let blocks = 0;
  function flush() {
    if (!count) return;
    if (segments.length >= MAX_SEGMENTS) fail("LLM_RESOURCE_LIMIT");
    segments.push({
      identity: {
        kind: "prepared-segment",
        sha256: createHash("sha256").update(current).digest("hex"),
        ordinal: segments.length,
      },
      html: current,
      firstBlock: first,
      blockCount: count,
    });
    current = "";
    count = 0;
    first = blocks;
  }
  for (const root of roots) {
    for (const part of split(root, MAX_SEGMENT)) {
      if (!part) continue;
      if (size(current) + size(part) > MAX_SEGMENT) flush();
      current += part;
      count++;
      blocks++;
      if (segments.length >= MAX_SEGMENTS) fail("LLM_RESOURCE_LIMIT");
    }
  }
  flush();
  if (!blocks) fail("LLM_SOURCE_INVALID");
  return {
    segments,
    blocks,
    notices: [...notices],
    media: [...mediaCounts].map(([placeholder, occurrences]) => ({
      placeholder,
      occurrences,
    })),
  };
}

try {
  parentPort.postMessage({ ok: true, value: await prepare() });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    code:
      error?.code === "LLM_RESOURCE_LIMIT"
        ? "LLM_RESOURCE_LIMIT"
        : "LLM_SOURCE_INVALID",
  });
}
parentPort.close();

import type {
  Candidate,
  ReferenceDocument,
  ReferenceNotice,
  ReferenceProcessor,
} from "@repo/core/application/ports/referenceProcessor";
import { BusinessRuleError } from "@repo/core/domain/error";
import * as css from "css-tree";
import { isText, Text } from "domhandler";
import { processCss } from "./cssPolicy";
import {
  candidateCollector,
  mediaAttributes,
  parseHtml,
  referenceUrl,
  serializeHtml,
} from "./htmlDocument";
import { sanitizeStructure } from "./htmlStructure";

const dataTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);
const dataFailure = () =>
  new BusinessRuleError(
    "REFERENCE_DATA_URI",
    "data URI の形式・内容・サイズを読み取れませんでした。",
  );

function process(
  source: string,
  replacements: ReadonlyMap<string, string>,
  styles: readonly { url: string; css: string; finalUrl: string }[],
): ReferenceDocument {
  const sourceState = parseHtml(source);
  const initial = sanitizeStructure(source, true);
  const raw = parseHtml(initial.html);
  const notices: ReferenceNotice[] = initial.removed.map((message) => ({
    code: "REFERENCE_HTML_REMOVED",
    location: "html",
    message,
  }));
  mediaAttributes(
    sourceState.elements,
    (url, _kind, location) => {
      if (!referenceUrl(url))
        notices.push({
          code: "REFERENCE_URL",
          location,
          message: "安全に解決できないメディア URL を除去しました。",
          source: url.slice(0, 8192),
        });
      return url;
    },
    notices,
  );
  for (const element of raw.elements) {
    if (
      element.name !== "link" ||
      !(element.attribs.rel ?? "")
        .toLowerCase()
        .split(/\s+/)
        .includes("stylesheet")
    )
      continue;
    const url = referenceUrl(element.attribs.href ?? "");
    if (!url || url.startsWith("data:")) {
      notices.push({
        code: "REFERENCE_STYLESHEET_URL",
        location: "link@href",
        message: "安全に解決できない stylesheet 参照を除去しました。",
        source: (element.attribs.href ?? "").slice(0, 1024),
      });
      continue;
    }
    element.name = "style";
    element.attribs = { "data-hollow-stylesheet": url };
    element.children = [];
  }
  const structural = sanitizeStructure(serializeHtml(raw.document));
  notices.push(
    ...structural.removed.map((message) => ({
      code: "REFERENCE_HTML_REMOVED",
      location: "html",
      message,
    })),
  );
  const { document, elements, overBudget } = parseHtml(structural.html);
  const candidates: Candidate[] = [];
  const collect = candidateCollector(candidates, notices, replacements);
  for (const element of elements) {
    const marker =
      element.name === "style"
        ? element.attribs["data-hollow-stylesheet"]
        : undefined;
    if (!marker) continue;
    const url = referenceUrl(marker);
    if (!url || url.startsWith("data:")) {
      delete element.attribs["data-hollow-stylesheet"];
      notices.push({
        code: "REFERENCE_STYLESHEET_URL",
        location: "style",
        message: "不正な stylesheet 候補を除去しました。",
      });
      continue;
    }
    element.attribs["data-hollow-stylesheet"] = url;
    candidates.push({
      url,
      kind: "stylesheet",
      location: "style@data-hollow-stylesheet",
    });
    const fetched = styles.find(
      (style) => style.url === url || style.url === marker,
    );
    if (fetched) {
      const finalUrl = referenceUrl(fetched.finalUrl);
      if (!finalUrl || !/^(?:https?:\/\/|bundle:)/.test(finalUrl)) {
        notices.push({
          code: "REFERENCE_STYLESHEET_URL",
          location: url,
          message: "stylesheet の最終 URL を確認できません。",
        });
        continue;
      }
      element.attribs["data-hollow-stylesheet-base"] = finalUrl;
      const text = new Text(fetched.css);
      text.parent = element;
      element.children = [text];
    }
  }
  mediaAttributes(
    elements,
    (url, kind, location) => collect(url, kind, location),
    notices,
  );
  const css = processCss(elements, replacements, {
    skip: overBudget || sourceState.overBudget,
  });
  candidates.push(...css.candidates);
  notices.push(...css.notices);
  let html = serializeHtml(document);
  if (Buffer.byteLength(html) > 800 * 1024) {
    for (const element of elements
      .filter((element) => element.name === "style")
      .reverse()) {
      element.children = [];
      notices.push({
        code: "REFERENCE_CSS_BUDGET",
        location: element.attribs["data-hollow-stylesheet"] ?? "style",
        message:
          "取込後の本文容量を超えるため装飾を省略し、本文を保持しました。",
      });
      html = serializeHtml(document);
      if (Buffer.byteLength(html) <= 800 * 1024) break;
    }
  }
  if (Buffer.byteLength(html) > 800 * 1024)
    throw new BusinessRuleError(
      "REFERENCE_RESOURCE_LIMIT",
      "参照取込後の本文が 800 KiB を超えます。文書を分割してください。",
    );
  return { html, candidates, notices };
}

export class NodeReferenceProcessor implements ReferenceProcessor {
  hasDecoration(html: string): boolean {
    const safe = this.prepare(html);
    const { elements } = parseHtml(safe.html);
    const declarations = elements.flatMap((element) => [
      {
        input: element.attribs.style ?? "",
        context: "declarationList" as const,
      },
      {
        input:
          element.name === "style"
            ? element.children
                .filter(isText)
                .map((node) => node.data)
                .join("")
            : "",
        context: "stylesheet" as const,
      },
    ]);
    return declarations.some(({ input, context }) => {
      if (!input) return false;
      const ast = css.parse(input, {
        context,
        parseCustomProperty: true,
      });
      let decorated = false;
      css.walk(ast, (node) => {
        if (node.type !== "Declaration") return;
        const property = css.ident.decode(node.property).toLowerCase();
        if (property.startsWith("--")) return;
        if (css.lexer.matchProperty(property, node.value).matched)
          decorated = true;
        else if (css.lexer.getProperty(property)) {
          css.walk(node.value, (value) => {
            if (
              value.type === "Function" &&
              css.ident.decode(value.name).toLowerCase() === "var" &&
              value.children.first?.type === "Identifier" &&
              css.ident.decode(value.children.first.name).startsWith("--") &&
              value.children.first.name.length > 2
            )
              decorated = true;
          });
        }
      });
      return decorated;
    });
  }
  prepare(html: string) {
    return process(html, new Map(), []);
  }
  styles(html: string) {
    const { elements, overBudget } = parseHtml(html);
    if (overBudget) return [];
    return elements.flatMap((element) => {
      if (element.name !== "style") return [];
      const url = referenceUrl(element.attribs["data-hollow-stylesheet"] ?? "");
      if (!url || url.startsWith("data:")) return [];
      const finalUrl = referenceUrl(
        element.attribs["data-hollow-stylesheet-base"] ?? url,
      );
      if (!finalUrl) return [];
      const css = element.children
        .filter(isText)
        .map((child) => child.data)
        .join("");
      return [
        {
          url,
          css,
          finalUrl,
          materialized:
            Boolean(element.attribs["data-hollow-stylesheet-base"]) &&
            /^(?:https?:\/\/|bundle:)/.test(finalUrl),
        },
      ];
    });
  }
  rewrite(
    html: string,
    replacements: ReadonlyMap<string, string>,
    styles: readonly { url: string; css: string; finalUrl: string }[],
  ) {
    return process(html, replacements, styles);
  }
  decodeCss(bytes: Uint8Array): string {
    if (bytes.byteLength > 1024 * 1024)
      throw new BusinessRuleError(
        "REFERENCE_CSS_SIZE",
        "stylesheet が 1 MiB を超えています。",
      );
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (value.includes("\0")) throw new Error("NUL");
      return value;
    } catch {
      throw new BusinessRuleError(
        "REFERENCE_CSS_ENCODING",
        "stylesheet を UTF-8 として読み取れませんでした。",
      );
    }
  }
  decodeDataUri(uri: string) {
    if (uri.length > 800 * 1024) throw dataFailure();
    const match = /^data:([^;,]+)((?:;[^,]*)?),(.*)$/is.exec(uri);
    if (!match) throw dataFailure();
    const mime = (match[1] ?? "").toLowerCase();
    const parameters = (match[2] ?? "").toLowerCase();
    if (
      !dataTypes.has(mime) ||
      !/^(?:;charset=utf-8)?(?:;base64)?$/.test(parameters)
    )
      throw dataFailure();
    const body = match[3] ?? "";
    let bytes: Uint8Array;
    if (parameters.endsWith(";base64")) {
      let payload: string;
      try {
        payload = decodeURIComponent(body);
      } catch {
        throw dataFailure();
      }
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          payload,
        ) ||
        !payload
      )
        throw dataFailure();
      bytes = Uint8Array.from(Buffer.from(payload, "base64"));
    } else {
      const output: number[] = [];
      for (let index = 0; index < body.length; ) {
        if (body[index] === "%") {
          const octet = body.slice(index + 1, index + 3);
          if (!/^[a-f0-9]{2}$/i.test(octet)) throw dataFailure();
          output.push(Number.parseInt(octet, 16));
          index += 3;
        } else {
          const point = body.codePointAt(index);
          if (point === undefined) throw dataFailure();
          output.push(...new TextEncoder().encode(String.fromCodePoint(point)));
          index += point > 0xffff ? 2 : 1;
        }
      }
      bytes = Uint8Array.from(output);
    }
    if (!bytes.byteLength) throw dataFailure();
    return { bytes, mime };
  }
  encodeDataUri(bytes: Uint8Array, mime: string): string {
    if (
      !dataTypes.has(mime) ||
      !bytes.byteLength ||
      bytes.byteLength > 800 * 1024
    )
      throw dataFailure();
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }
}

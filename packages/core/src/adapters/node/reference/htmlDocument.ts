import type {
  Candidate,
  ReferenceKind,
  ReferenceNotice,
} from "@repo/core/application/ports/referenceProcessor";
import { BusinessRuleError } from "@repo/core/domain/error";
import serialize from "dom-serializer";
import { type AnyNode, type Document, type Element, isTag } from "domhandler";
import { parseDocument } from "htmlparser2";

export const referenceLimit = () =>
  new BusinessRuleError(
    "REFERENCE_RESOURCE_LIMIT",
    "参照文書の解析可能な規模を超えました。文書を分割してください。",
  );
export function parseHtml(source: string): {
  document: Document;
  elements: Element[];
  overBudget: boolean;
} {
  if (Buffer.byteLength(source) > 800 * 1024) throw referenceLimit();
  const document = parseDocument(source, { decodeEntities: true });
  const elements: Element[] = [];
  const pending = document.children.map((node) => ({ node, depth: 0 }));
  let nodes = 0;
  let overBudget = false;
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    if (++nodes > 10_000 || entry.depth > 128) overBudget = true;
    if (isTag(entry.node)) elements.push(entry.node);
    if ("children" in entry.node)
      for (const node of entry.node.children)
        pending.push({ node, depth: entry.depth + 1 });
  }
  return { document, elements: elements.reverse(), overBudget };
}
export const serializeHtml = (document: AnyNode) =>
  serialize(document, { encodeEntities: "utf8" });

export function referenceUrl(raw: string, base?: string): string | null {
  if (
    !raw ||
    raw.length > 800 * 1024 ||
    Array.from(raw).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  if (/^data:/i.test(raw)) return `data:${raw.slice(5)}`;
  if (
    raw.startsWith("bundle:") ||
    (base?.startsWith("bundle:") && !/^[a-z][a-z0-9+.-]*:/i.test(raw))
  ) {
    try {
      const target = raw.startsWith("bundle:") ? raw.slice(7) : raw;
      if (
        /^[a-z][a-z0-9+.-]*:/i.test(target) ||
        target.includes("\\") ||
        target.startsWith("//")
      )
        return null;
      const resolved = new URL(
        target,
        `https://bundle.invalid/${base?.slice(7) ?? ""}`,
      );
      return `bundle:${resolved.pathname.slice(1)}${resolved.search}${resolved.hash}`;
    } catch {
      return null;
    }
  }
  if (raw.length > 8192 || raw.startsWith("//") || raw.startsWith("#"))
    return null;
  try {
    const url = base ? new URL(raw, base) : new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return !base && !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.includes("\\")
      ? raw
      : null;
  }
}

export type SrcsetEntry = { url: string; descriptor: string };
export function parseSrcset(input: string): SrcsetEntry[] {
  const result: SrcsetEntry[] = [];
  let position = 0;
  while (position < input.length) {
    while (position < input.length && /[\s,]/.test(input[position] ?? ""))
      position++;
    const start = position;
    while (position < input.length && !/\s/.test(input[position] ?? ""))
      position++;
    let url = input.slice(start, position);
    let descriptor = "";
    if (url.endsWith(",")) url = url.replace(/,+$/, "");
    else {
      const descriptorStart = position;
      while (position < input.length && input[position] !== ",") position++;
      descriptor = input.slice(descriptorStart, position).trim();
    }
    if (
      url &&
      (!descriptor ||
        /^(?:[1-9]\d*w|(?:\d+(?:\.\d+)?|\.\d+)x)$/.test(descriptor)) &&
      (!descriptor.endsWith("x") || Number(descriptor.slice(0, -1)) > 0)
    )
      result.push({ url, descriptor });
    if (result.length > 1000) throw referenceLimit();
  }
  return result;
}
export const srcsetString = (entries: readonly SrcsetEntry[]) =>
  entries
    .map(({ url, descriptor }) => `${url}${descriptor ? ` ${descriptor}` : ""}`)
    .join(", ");

export function mediaAttributes(
  elements: readonly Element[],
  visit: (
    url: string,
    kind: "image" | "video",
    location: string,
  ) => string | null,
  notices?: ReferenceNotice[],
) {
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    if (!element || !["img", "video", "audio", "source"].includes(element.name))
      continue;
    const image =
      element.name === "img" ||
      (element.name === "source" &&
        element.parent &&
        isTag(element.parent) &&
        element.parent.name === "picture");
    const kind = image ? "image" : "video";
    for (const attribute of ["src", "poster", "srcset"] as const) {
      const raw = element.attribs[attribute];
      if (!raw) continue;
      const location = `${element.name}[${index}]@${attribute}`;
      if (attribute === "srcset") {
        const parsed = parseSrcset(raw);
        const result = parsed.flatMap((entry) => {
          const url = visit(entry.url, image ? "image" : kind, location);
          return url ? [{ ...entry, url }] : [];
        });
        if (!parsed.length)
          notices?.push({
            code: "REFERENCE_SRCSET",
            location,
            message: "解析できない srcset を除去しました。",
            source: raw.slice(0, 1024),
          });
        if (result.length) element.attribs[attribute] = srcsetString(result);
        else delete element.attribs[attribute];
      } else {
        const url = visit(
          raw,
          attribute === "poster" ? "image" : kind,
          location,
        );
        if (url) element.attribs[attribute] = url;
        else delete element.attribs[attribute];
      }
    }
  }
}

export function candidateCollector(
  candidates: Candidate[],
  notices: ReferenceNotice[],
  replacements: ReadonlyMap<string, string>,
) {
  return (
    raw: string,
    kind: ReferenceKind,
    location: string,
    base?: string,
  ) => {
    const url = referenceUrl(raw, base);
    if (!url) {
      notices.push({
        code: "REFERENCE_URL",
        location,
        message: "安全に解決できない参照 URL を除去しました。",
        source: raw.slice(0, 1024),
      });
      return null;
    }
    const replaced = replacements.get(url) ?? replacements.get(raw) ?? url;
    if (!referenceUrl(replaced)) {
      notices.push({
        code: "REFERENCE_URL",
        location,
        message: "置換先の参照 URL を許可できません。",
      });
      return null;
    }
    candidates.push({ url: replaced, kind, location });
    if (url.startsWith("bundle:") && (kind === "background" || kind === "font"))
      notices.push({
        code: "REFERENCE_BUNDLE_EXTERNAL",
        location,
        message: "同梱 CSS の相対背景・フォントは外部表示できません。",
        source: url.slice(0, 1024),
      });
    return replaced;
  };
}

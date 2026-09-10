import type {
  ExternalRenderSources,
  HtmlSanitizer,
} from "@repo/core/application/ports/htmlSanitizer";
import {
  parseAssetUrl,
  parseHistoryAssetUrl,
} from "@repo/core/domain/asset/entity";
import sanitizeHtml from "sanitize-html";
import { processCss } from "./reference/cssPolicy";
import {
  mediaAttributes,
  parseHtml,
  referenceUrl,
  serializeHtml,
} from "./reference/htmlDocument";
import { sanitizeStructure } from "./reference/htmlStructure";

const emptyExternal = (): {
  images: string[];
  media: string[];
  backgrounds: string[];
  fonts: string[];
} => ({ images: [], media: [], backgrounds: [], fonts: [] });

export const NodeHtmlSanitizer: HtmlSanitizer = {
  assetUrls(source) {
    const { elements, overBudget } = parseHtml(sanitizeStructure(source).html);
    const urls = new Set<string>();
    mediaAttributes(elements, (url) => {
      if (parseAssetUrl(url) || parseHistoryAssetUrl(url)) urls.add(url);
      return url;
    });
    const css = processCss(elements, new Map(), { skip: overBudget });
    for (const candidate of css.candidates)
      if (parseAssetUrl(candidate.url) || parseHistoryAssetUrl(candidate.url))
        urls.add(candidate.url);
    return [...urls];
  },
  rewriteAssets(source, replacements) {
    const sanitized = NodeHtmlSanitizer.sanitize(source);
    const { document, elements } = parseHtml(sanitized.html);
    mediaAttributes(elements, (url) => replacements.get(url) ?? url);
    processCss(elements, replacements);
    return serializeHtml(document);
  },
  render(source, allowedAssets, external = emptyExternal()) {
    const sanitized = NodeHtmlSanitizer.sanitize(source);
    const { document, elements } = parseHtml(sanitized.html);
    const links: { id: string; url: string; label: string }[] = [];
    const used = new Set<string>();
    const removed = new Set(sanitized.removed);
    const externalSources = emptyExternal();
    const permitted = (
      url: string,
      category: keyof ExternalRenderSources,
    ): boolean => {
      if (allowedAssets.has(url)) {
        used.add(url);
        return true;
      }
      const normalized = referenceUrl(url);
      if (
        normalized &&
        /^https?:\/\//i.test(normalized) &&
        external[category].includes(normalized)
      ) {
        if (!externalSources[category].includes(normalized))
          externalSources[category].push(normalized);
        return true;
      }
      removed.add("未取得または閲覧できないメディアの参照");
      return false;
    };
    mediaAttributes(elements, (url, kind) =>
      permitted(url, kind === "image" ? "images" : "media") ? url : null,
    );
    const css = processCss(elements, new Map(), {
      allow: (url, kind) =>
        permitted(url, kind === "font" ? "fonts" : "backgrounds"),
    });
    for (const notice of css.notices) removed.add(notice.message);
    for (const element of elements) {
      if (element.name !== "a") continue;
      const url = element.attribs.href;
      if (
        url &&
        /^(https?:\/\/|mailto:)/i.test(url) &&
        !Array.from(url).some(
          (character) =>
            character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
        )
      ) {
        const id = `link-${links.length}`;
        links.push({ id, url, label: url });
        element.attribs["data-hollow-link"] = id;
      }
      delete element.attribs.href;
      delete element.attribs.target;
      delete element.attribs.name;
      element.name = "span";
    }
    return {
      html: serializeHtml(document),
      links,
      removed: [...removed],
      assetUrls: [...used],
      externalSources,
    };
  },
  sanitize(source) {
    const input = parseHtml(source);
    const structural = sanitizeStructure(source);
    const { document, elements, overBudget } = parseHtml(structural.html);
    const css = processCss(elements, new Map(), {
      skip: overBudget || input.overBudget,
    });
    mediaAttributes(elements, (url) => referenceUrl(url));
    const html = serializeHtml(document);
    const text = sanitizeHtml(
      html.replace(/<\/(?:p|h[1-6]|div|li|tr)>/gi, "$&\n"),
      {
        allowedTags: [],
        allowedAttributes: {},
        nonTextTags: ["style", "script", "textarea", "option"],
      },
    );
    return {
      html,
      text: text
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">"),
      removed: [
        ...structural.removed,
        ...css.notices.map((notice) => notice.message),
      ],
    };
  },
};

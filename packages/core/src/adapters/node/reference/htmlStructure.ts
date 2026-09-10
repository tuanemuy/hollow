import sanitizeHtml from "sanitize-html";

export const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "video",
  "audio",
  "source",
  "picture",
  "style",
  "span",
];
const common = [
  "id",
  "class",
  "style",
  "title",
  "lang",
  "dir",
  "aria-label",
  "data-*",
];
export const allowedAttributes: Record<string, string[]> = {
  "*": common,
  a: ["href", "name", "target", "rel"],
  img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"],
  video: ["src", "controls", "width", "height", "poster", "preload"],
  audio: ["src", "controls", "preload"],
  source: ["src", "srcset", "sizes", "type", "media"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start", "reversed", "type"],
  li: ["value"],
};
export const structureOptions: sanitizeHtml.IOptions = {
  allowedTags,
  allowedAttributes,
  allowVulnerableTags: true,
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    video: ["http", "https", "data"],
    source: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  parseStyleAttributes: false,
  nestingLimit: 128,
};

export function sanitizeStructure(
  source: string,
  keepStylesheetLinks = false,
): { html: string; removed: string[] } {
  const removed = new Set<string>();
  const html = sanitizeHtml(source, {
    ...structureOptions,
    ...(keepStylesheetLinks
      ? {
          allowedTags: [...allowedTags, "link"],
          allowedAttributes: { ...allowedAttributes, link: ["href", "rel"] },
        }
      : {}),
    transformTags: {
      "*": (tagName, attribs) => {
        if (
          !allowedTags.includes(tagName) &&
          !(keepStylesheetLinks && tagName === "link")
        )
          removed.add(`<${tagName}> 要素`);
        const supported = [
          ...common,
          ...(allowedAttributes[tagName] ?? []),
          ...(keepStylesheetLinks && tagName === "link" ? ["href", "rel"] : []),
        ];
        for (const [name, value] of Object.entries(attribs)) {
          if (!supported.includes(name) && !name.startsWith("data-"))
            removed.add(`<${tagName}> の ${name} 属性`);
          if (["href", "src", "poster"].includes(name)) {
            const normalized = Array.from(value)
              .filter((character) => character.charCodeAt(0) > 32)
              .join("");
            const mediaData =
              name === "src" &&
              ["img", "video", "source"].includes(tagName) &&
              /^data:/i.test(normalized);
            if (
              !mediaData &&
              /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(normalized) &&
              !/^(?:https?:|mailto:)/i.test(normalized)
            )
              removed.add(`<${tagName}> の危険な ${name} URL`);
          }
        }
        return {
          tagName,
          attribs:
            tagName === "a"
              ? { ...attribs, rel: "noopener noreferrer" }
              : attribs,
        };
      },
    },
  });
  return { html, removed: [...removed] };
}

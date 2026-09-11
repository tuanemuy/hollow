import type {
  NoteProjection,
  ProjectedText,
  ProjectionSegment,
} from "@repo/core/application/browse/ports";
import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { BROWSE_VERSION, searchTokens } from "@repo/core/domain/browse/query";
import { BusinessRuleError } from "@repo/core/domain/error";
import { assertHtmlSize } from "@repo/core/domain/note/entity";
import * as css from "css-tree";
import { type DefaultTreeAdapterMap, parse } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
const blocks = new Set(
  "address article aside blockquote caption dd details dialog div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section summary table tbody td tfoot th thead tr ul".split(
    " ",
  ),
);
const excluded = new Set(["script", "style", "head", "template"]);
const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

export function projectText(display: string): ProjectedText {
  const segments: ProjectionSegment[] = [];
  const normalized: string[] = [];
  let length = 0;
  let displayLength = 0;
  for (const part of segmenter.segment(display)) {
    const value = part.segment.normalize("NFKC").toLowerCase();
    normalized.push(value);
    const valueLength = Array.from(value).length;
    const partLength = Array.from(part.segment).length;
    const next: ProjectionSegment = [
      length,
      length + valueLength,
      displayLength,
      displayLength + partLength,
    ];
    const previous = segments.at(-1);
    if (
      previous &&
      previous[1] === next[0] &&
      previous[3] === next[2] &&
      previous[1] - previous[0] === previous[3] - previous[2] &&
      valueLength === partLength
    )
      segments[segments.length - 1] = [
        previous[0],
        next[1],
        previous[2],
        next[3],
      ];
    else segments.push(next);
    length += valueLength;
    displayLength += partLength;
  }
  const text = normalized.join("");
  const whole = display.normalize("NFKC").toLowerCase();
  const words: [string, number][] = [];
  let previousOffset = 0;
  let cpOffset = 0;
  for (const match of whole.matchAll(/[a-z0-9]+/g)) {
    cpOffset += Array.from(whole.slice(previousOffset, match.index)).length;
    words.push([match[0], cpOffset]);
    previousOffset = match.index;
  }
  return {
    display,
    normalized: whole,
    words,
    segments:
      text === whole || Array.from(whole).length === length ? segments : [],
  };
}

type Winner = Readonly<{ value: string; important: boolean }>;
function visibility(style: string) {
  const winners = new Map<string, Winner>();
  if (!style) return winners;
  let tree: css.CssNode;
  try {
    tree = css.parse(style, { context: "declarationList" });
  } catch {
    return winners;
  }
  css.walk(tree, (node) => {
    if (node.type !== "Declaration") return;
    const property = css.ident.decode(node.property).toLowerCase();
    if (!["display", "visibility", "content-visibility"].includes(property))
      return;
    const generated = css.generate(node.value);
    const unknown = /\b(?:var|env)\(/i.test(generated);
    if (!unknown && css.lexer.matchProperty(property, node.value).error) return;
    const previous = winners.get(property);
    if (previous?.important && !node.important) return;
    winners.set(property, {
      value: unknown ? "unknown" : css.ident.decode(generated).toLowerCase(),
      important: Boolean(node.important),
    });
  });
  return winners;
}

export function projectNote(
  input: Readonly<{ title: string; html: string }>,
): NoteProjection {
  assertHtmlSize(input.html);
  const document = parse(input.html);
  const pieces: string[] = [];
  let nodes = 0;
  let leadImage: string | null = null;
  let mediaLabel: string | null = null;
  const boundary = () => {
    if (pieces.length && pieces.at(-1) !== "\n") pieces.push("\n");
  };
  function visit(
    node: Node,
    depth: number,
    inheritedHidden: boolean,
    inheritedBody: boolean,
  ) {
    let hidden = inheritedHidden;
    let inBody = inheritedBody;
    if (++nodes > 10000 || depth > 128)
      throw new BusinessRuleError(
        "PROJECTION_LIMIT",
        "本文の構造が大きすぎます。HTMLを分割してください。",
      );
    if (node.nodeName === "#text") {
      if (inBody && !hidden && "value" in node) pieces.push(node.value);
      return;
    }
    if ("tagName" in node) {
      if (excluded.has(node.tagName)) return;
      inBody ||= node.tagName === "body";
      if (node.attrs.some((a) => a.name === "hidden")) return;
      const styles = visibility(
        node.attrs.find((a) => a.name === "style")?.value ?? "",
      );
      if (
        styles.get("display")?.value === "none" ||
        styles.get("content-visibility")?.value === "hidden"
      )
        return;
      const visible = styles.get("visibility")?.value;
      hidden =
        visible === "visible"
          ? false
          : visible === "hidden" || visible === "collapse"
            ? true
            : hidden;
      if (
        inBody &&
        !hidden &&
        ["img", "svg", "video", "audio"].includes(node.tagName) &&
        !mediaLabel
      ) {
        mediaLabel =
          node.tagName === "img" || node.tagName === "svg"
            ? "画像"
            : node.tagName === "video"
              ? "動画"
              : "音声";
        const src = node.attrs.find((a) => a.name === "src")?.value ?? "";
        if (node.tagName === "img" && parseAssetUrl(src)?.scope === "notes")
          leadImage = src;
      }
      if (inBody && (blocks.has(node.tagName) || node.tagName === "br"))
        boundary();
    }
    if ("childNodes" in node)
      for (const child of node.childNodes)
        visit(child, depth + 1, hidden, inBody);
    if ("tagName" in node && inBody && blocks.has(node.tagName)) boundary();
  }
  visit(document, 0, false, false);
  const title = projectText(input.title);
  const body = projectText(
    pieces
      .join("")
      .replace(/[\t\f\v ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim(),
  );
  return {
    version: BROWSE_VERSION,
    sourceTitle: input.title,
    sourceHtml: input.html,
    title,
    body,
    tokens: searchTokens(`${title.normalized}\n${body.normalized}`),
    leadImage,
    mediaLabel,
  };
}

import type {
  LlmResultProcessor,
  LlmVerifiedMedia,
} from "@repo/core/application/llm/ports";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import { parseAssetUrl } from "@repo/core/domain/asset/entity";
import { MAX_HTML_BYTES } from "@repo/core/domain/note/entity";
import { type DefaultTreeAdapterTypes, parseFragment, serialize } from "parse5";

const marker =
  /\[\[hollow-media:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\]/g;
const invalid = () =>
  new LlmOperationError("LLM_RESPONSE_INVALID", "possible", true);
const forbidden = new Set([
  "img",
  "video",
  "audio",
  "source",
  "iframe",
  "object",
  "embed",
  "script",
  "style",
  "link",
  "template",
]);
const reserved = (text: string) => /\[\[hollow-media:/i.test(text);
export class NodeLlmResultProcessor implements LlmResultProcessor {
  restore(
    contents: readonly string[],
    media: readonly LlmVerifiedMedia[],
  ): string {
    const source = contents.join("\n");
    if (Buffer.byteLength(source) > MAX_HTML_BYTES)
      throw new LlmOperationError("LLM_RESOURCE_LIMIT", "possible", true);
    const expected = new Map(media.map((item) => [item.placeholder, item]));
    if (
      expected.size !== media.length ||
      media.length > 200 ||
      media.some(
        (item) =>
          parseAssetUrl(item.assetUrl)?.scope !== "notes" ||
          !Number.isSafeInteger(item.occurrences) ||
          item.occurrences < 1,
      )
    )
      throw invalid();
    const seen = new Map<string, number>();
    const root = parseFragment(source);
    function visit(parent: DefaultTreeAdapterTypes.ParentNode) {
      const children: DefaultTreeAdapterTypes.ChildNode[] = [];
      for (const child of parent.childNodes) {
        if (child.nodeName === "#text" && "value" in child) {
          const text = child.value;
          let end = 0;
          for (const match of text.matchAll(marker)) {
            const token = match[0];
            const item = expected.get(token);
            if (!item) throw invalid();
            const prefix = text.slice(end, match.index);
            if (reserved(prefix)) throw invalid();
            if (prefix)
              children.push({
                nodeName: "#text",
                value: prefix,
                parentNode: parent,
              });
            const html =
              item.kind === "image"
                ? `<img src="${item.assetUrl}" alt="">`
                : `<video controls src="${item.assetUrl}"></video>`;
            const replacement = parseFragment(html).childNodes;
            for (const node of replacement) {
              node.parentNode = parent;
              children.push(node);
            }
            seen.set(token, (seen.get(token) ?? 0) + 1);
            end = match.index + token.length;
          }
          const suffix = text.slice(end);
          if (reserved(suffix)) throw invalid();
          if (suffix)
            children.push({
              nodeName: "#text",
              value: suffix,
              parentNode: parent,
            });
        } else if ("tagName" in child) {
          if (child.attrs.some((attr) => reserved(attr.value))) throw invalid();
          if (forbidden.has(child.tagName)) {
            if (
              reserved(serialize(child)) ||
              ("content" in child && reserved(serialize(child.content)))
            )
              throw invalid();
            continue;
          }
          child.attrs = child.attrs.filter(
            (attr) =>
              !["src", "srcset", "poster", "background", "style"].includes(
                attr.name,
              ),
          );
          visit(child);
          children.push(child);
        } else if ("data" in child && reserved(child.data)) {
          throw invalid();
        }
      }
      parent.childNodes = children;
    }
    visit(root);
    for (const item of media)
      if (seen.get(item.placeholder) !== item.occurrences) throw invalid();
    const html = serialize(root);
    if (Buffer.byteLength(html) > MAX_HTML_BYTES)
      throw new LlmOperationError("LLM_RESOURCE_LIMIT", "possible", true);
    return html;
  }
}

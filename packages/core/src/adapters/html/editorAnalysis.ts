import {
  projectText,
  serializeTextChanges,
} from "@repo/core/application/note/editorText";
import type {
  HtmlDiagnostic,
  ProjectedNode,
  TextPatch,
  VisualProjection,
  VisualSource,
} from "@repo/core/application/ports/htmlEditor";
import { type AnyNode, type Document, isTag, type Text } from "domhandler";
import { parseDocument } from "htmlparser2";
import { type DefaultTreeAdapterMap, parse, parseFragment } from "parse5";

const children = (node: AnyNode): AnyNode[] =>
  "children" in node ? node.children : [];
function bounded(source: string) {
  if (new TextEncoder().encode(source).byteLength > 800 * 1024)
    throw new Error("本文は 800 KB 以内にしてください。入力は保持しています。");
}
function checkTree(document: Document) {
  let count = 0;
  const pending = [{ node: document as AnyNode, depth: 0 }];
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    if (++count > 10_000 || entry.depth > 128)
      throw new Error("HTML の要素数または深さの上限です。分割してください。");
    for (const node of children(entry.node))
      pending.push({ node, depth: entry.depth + 1 });
  }
}
export function diagnoseHtml(source: string): readonly HtmlDiagnostic[] {
  bounded(source);
  checkTree(parseDocument(source));
  const diagnostics: HtmlDiagnostic[] = [];
  parseFragment(source, {
    scriptingEnabled: false,
    onParseError(error) {
      if (diagnostics.length < 100)
        diagnostics.push({
          code: error.code,
          line: error.startLine,
          column: error.startCol,
          offset: error.startOffset,
        });
    },
  });
  return diagnostics;
}

type PNode = DefaultTreeAdapterMap["node"];
type PText = DefaultTreeAdapterMap["textNode"];
type Span = {
  id: string;
  start: number;
  end: number;
  value: string;
  prefix: string;
  display: string;
};

export class HtmlVisualSession {
  private readonly ast: Document;
  private readonly nodes = new Map<string, Text>();
  readonly projection: VisualProjection;
  private html: string;
  constructor(readonly source: VisualSource) {
    bounded(source.canonical);
    this.html = source.canonical;
    this.ast = parseDocument(source.canonical, {
      decodeEntities: true,
      withStartIndices: true,
      withEndIndices: true,
    });
    checkTree(this.ast);
    const renderAst = parseDocument(source.rendered, {
      decodeEntities: true,
      withStartIndices: true,
      withEndIndices: true,
    });
    checkTree(renderAst);
    const spans: Span[] = [];
    const pair = (a: AnyNode, b: AnyNode, excluded = false): void => {
      if (a.type !== b.type && !(isTag(a) && isTag(b)))
        throw new Error(
          "表示の要素型が変化しています。HTML モードを利用してください。",
        );
      if (a.type === "text") {
        if (b.type !== "text" || a.data !== b.data)
          throw new Error("表示の文字が正本と一致しません。");
        if (!excluded) {
          const id = `t${this.nodes.size}`;
          const prefix =
            a.parent &&
            isTag(a.parent) &&
            a.parent.name === "pre" &&
            a.parent.children[0] === a
              ? (/^(\r\n|\r|\n)/.exec(a.data)?.[0] ?? "")
              : "";
          if (b.startIndex === null || b.endIndex === null)
            throw new Error("文字の由来を確認できません。");
          if (
            prefix &&
            !source.rendered
              .slice(b.startIndex, b.endIndex + 1)
              .startsWith(prefix)
          )
            throw new Error("先頭改行の由来を確認できません。");
          this.nodes.set(id, a);
          spans.push({
            id,
            start: b.startIndex + prefix.length,
            end: b.endIndex + 1,
            value: a.data,
            prefix,
            display: projectText(a.data, prefix).display,
          });
        }
        return;
      }
      if (
        isTag(a) &&
        (!isTag(b) ||
          (a.name !== b.name && !(a.name === "a" && b.name === "span")))
      )
        throw new Error("表示の構造が変化しています。");
      const ac = children(a);
      const bc = children(b);
      if (ac.length !== bc.length)
        throw new Error("表示の構造が変化しています。");
      ac.forEach((node, index) => {
        const target = bc[index];
        if (!target) throw new Error("表示対象を確認できません。");
        pair(
          node,
          target,
          excluded || (isTag(a) && ["style", "script"].includes(a.name)),
        );
      });
    };
    pair(this.ast, renderAst);
    const bodyStart = source.document.indexOf("<body>") + 6;
    if (
      bodyStart < 6 ||
      source.document.slice(bodyStart, bodyStart + source.rendered.length) !==
        source.rendered
    )
      throw new Error("完成した本文の投影が一致しません。");
    const parsed = parse(source.document, {
      sourceCodeLocationInfo: true,
      scriptingEnabled: false,
    });
    const projected: PText[] = [];
    const collect = (node: PNode, depth = 0): void => {
      if (depth > 132) throw new Error("表示の深さの上限です。");
      if (
        node.nodeName === "#text" &&
        "value" in node &&
        node.sourceCodeLocation
      )
        projected.push(node);
      if ("childNodes" in node)
        for (const child of node.childNodes) collect(child, depth + 1);
    };
    collect(parsed);
    projected.sort(
      (a, b) =>
        (a.sourceCodeLocation?.endOffset ?? 0) -
        (a.sourceCodeLocation?.startOffset ?? 0) -
        ((b.sourceCodeLocation?.endOffset ?? 0) -
          (b.sourceCodeLocation?.startOffset ?? 0)),
    );
    const used = new Set<string>();
    const origins = new Map<PText, string[]>();
    const issues = new Set<string>();
    let comparisons = 0;
    const textLocation = (node: PText) => {
      const location = node.sourceCodeLocation;
      const parent = node.parentNode;
      if (
        !location ||
        !parent ||
        !("tagName" in parent) ||
        parent.tagName !== "pre" ||
        parent.childNodes[0] !== node
      )
        return location;
      const startTag = parent.sourceCodeLocation?.startTag;
      if (!startTag) return location;
      const prefix = /^(\r\n|\r|\n)/.exec(
        source.document.slice(startTag.endOffset),
      )?.[0];
      // parse5 can begin a pre Text location after its first decoded entity.
      return prefix
        ? { ...location, startOffset: startTag.endOffset + prefix.length }
        : location;
    };
    for (const node of projected) {
      const location = textLocation(node);
      if (!location) continue;
      const candidates = spans.filter((span) => {
        if (++comparisons > 2_000_000)
          throw new Error("文字対応の照合上限です。文書を分割してください。");
        return (
          !used.has(span.id) &&
          span.start + bodyStart >= location.startOffset &&
          span.end + bodyStart <= location.endOffset
        );
      });
      if (
        candidates.length &&
        candidates.map((span) => span.display).join("") === node.value
      ) {
        origins.set(
          node,
          candidates.map((span) => span.id),
        );
        for (const span of candidates) used.add(span.id);
      }
    }
    const model = (node: PNode): ProjectedNode => {
      if (node.nodeName === "#text" && "value" in node) {
        const ids = origins.get(node) ?? [];
        const location = textLocation(node);
        if (
          !ids.length &&
          location &&
          spans.some(
            (span) =>
              span.start + bodyStart < location.endOffset &&
              span.end + bodyStart > location.startOffset,
          )
        )
          issues.add(
            "HTML5 の文字投影を一意に対応できません。HTML モードで確認してください。",
          );
        return { type: 3, value: node.value, ids };
      }
      if (node.nodeName === "#comment" && "data" in node)
        return { type: 8, value: node.data };
      return {
        type: node.nodeName === "#document" ? 9 : 1,
        name: "tagName" in node ? node.tagName : null,
        namespace: "namespaceURI" in node ? node.namespaceURI : null,
        attrs:
          "attrs" in node
            ? node.attrs
                .map((a) => [a.name, a.value, a.namespace ?? ""] as const)
                .sort((a, b) => a.join("\0").localeCompare(b.join("\0")))
            : [],
        children:
          "childNodes" in node
            ? node.childNodes
                .filter((child) => child.nodeName !== "#documentType")
                .map(model)
            : [],
      };
    };
    const expected = model(parsed);
    for (const span of spans)
      if (!used.has(span.id) && span.display)
        issues.add(
          "元の文字の表示位置を確認できません。HTML モードで確認してください。",
        );
    this.projection = {
      generation: source.generation,
      expected,
      texts: spans.map(({ id, value, prefix }) => {
        const node = this.nodes.get(id);
        if (!node || node.startIndex === null || node.endIndex === null)
          throw new Error("正本の文字範囲がありません。");
        return {
          id,
          value,
          prefix,
          start: node.startIndex,
          end: node.endIndex + 1,
        };
      }),
      issues: [...issues],
    };
  }
  patch(generation: string, patches: readonly TextPatch[]) {
    if (generation !== this.source.generation || patches.length > 10_000)
      throw new Error("編集の世代が一致しません。");
    const ids = new Set<string>();
    for (const patch of patches) {
      const node = this.nodes.get(patch.id);
      if (!node || ids.has(patch.id) || node.data !== patch.before)
        throw new Error("編集対象の文字が変化しています。");
      ids.add(patch.id);
    }
    for (const patch of patches) {
      const node = this.nodes.get(patch.id);
      if (node) node.data = patch.after;
    }
    const next = serializeTextChanges(
      this.source.canonical,
      this.projection.texts,
      new Map([...this.nodes].map(([id, node]) => [id, node.data])),
    );
    try {
      bounded(next);
    } catch (error) {
      for (const patch of patches) {
        const node = this.nodes.get(patch.id);
        if (node) node.data = patch.before;
      }
      throw error;
    }
    if (patches.some((patch) => patch.before !== patch.after)) this.html = next;
    return this.html;
  }
}

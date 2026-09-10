import type {
  Candidate,
  ReferenceNotice,
} from "@repo/core/application/ports/referenceProcessor";
import * as css from "css-tree";
import { type Element, isTag, Text } from "domhandler";
import { candidateCollector, referenceLimit } from "./htmlDocument";

const decode = (value: string) => css.ident.decode(value).toLowerCase();
const placement = new Set([
  "position",
  "inset",
  "inset-inline",
  "inset-block",
  "inset-inline-start",
  "inset-inline-end",
  "inset-block-start",
  "inset-block-end",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "inline-size",
  "block-size",
  "transform",
  "translate",
  "scale",
  "rotate",
  "z-index",
]);
const neutralize = new Set([
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "transform",
  "translate",
  "scale",
  "rotate",
  "z-index",
]);
type RecordEntry = {
  declaration: css.Declaration;
  list: css.List<css.CssNode>;
  item: css.ListItem<css.CssNode>;
  property: string;
  value: string;
  location: string;
};
type Sheet = {
  element: Element;
  inline: boolean;
  ast: css.CssNode;
  base?: string;
  location: string;
};

function comparable(node: css.CssNode): string {
  const cloned = css.clone(node);
  css.walk(cloned, (entry, item, list) => {
    if (entry.type === "Identifier") entry.name = decode(entry.name);
    if (
      entry.type === "Number" ||
      entry.type === "Dimension" ||
      entry.type === "Percentage"
    ) {
      const numeric = Number(entry.value);
      if (Number.isFinite(numeric)) entry.value = String(numeric);
      if (entry.type === "Dimension") entry.unit = decode(entry.unit);
      if (numeric === 0 && entry.type !== "Number" && list)
        list.replace(item, list.createItem({ type: "Number", value: "0" }));
    }
  });
  return css.generate(cloned).toLowerCase();
}

function matcher(
  selector: css.Selector,
  step: () => void,
): (target: Element) => boolean {
  type Simple = css.ClassSelector | css.IdSelector | css.TypeSelector;
  const compounds: Simple[][] = [[]];
  const combinators: string[] = [];
  selector.children.forEach((node) => {
    if (["ClassSelector", "IdSelector", "TypeSelector"].includes(node.type))
      compounds[compounds.length - 1]?.push(node as Simple);
    else if (node.type === "Combinator" && [" ", ">"].includes(node.name)) {
      combinators.push(node.name);
      compounds.push([]);
    } else throw new Error("Unsupported selector");
  });
  if (compounds.some((nodes) => !nodes.length) || compounds.length > 128)
    throw new Error("Unsupported selector");
  const compound = (nodes: readonly Simple[], target: Element) =>
    nodes.every((node) => {
      step();
      if (node.type === "ClassSelector")
        return (target.attribs.class ?? "")
          .split(/\s+/)
          .includes(css.ident.decode(node.name));
      if (node.type === "IdSelector")
        return target.attribs.id === css.ident.decode(node.name);
      return node.name === "*" || target.name === decode(node.name);
    });
  const matches = (target: Element, index = compounds.length - 1): boolean => {
    step();
    const current = compounds[index];
    if (!current || !compound(current, target)) return false;
    if (index === 0) return true;
    if (combinators[index - 1] === ">")
      return (
        !!target.parent &&
        isTag(target.parent) &&
        matches(target.parent, index - 1)
      );
    for (let parent = target.parent; parent; parent = parent.parent)
      if (isTag(parent) && matches(parent, index - 1)) return true;
    return false;
  };
  return matches;
}

type CssOptions = {
  allow?: (url: string, kind: "background" | "font") => boolean;
  skip?: boolean;
};
export function processCss(
  elements: readonly Element[],
  replacements: ReadonlyMap<string, string>,
  options: CssOptions = {},
): { candidates: Candidate[]; notices: ReferenceNotice[] } {
  try {
    if (options.skip || elements.length > 10_000) throw referenceLimit();
    return processCssWithinBudget(elements, replacements, options);
  } catch (error) {
    if (
      !(error instanceof RangeError) &&
      !(
        error instanceof Error &&
        "code" in error &&
        error.code === "REFERENCE_RESOURCE_LIMIT"
      )
    )
      throw error;
    for (const element of elements) {
      delete element.attribs.style;
      if (element.name === "style") element.children = [];
    }
    return {
      candidates: [],
      notices: [
        {
          code: "REFERENCE_CSS_BUDGET",
          location: "css",
          message:
            "CSS・要素の解析上限を超えたため装飾を適用せず、本文を保持しました。",
        },
      ],
    };
  }
}

function processCssWithinBudget(
  elements: readonly Element[],
  replacements: ReadonlyMap<string, string>,
  options: CssOptions,
): { candidates: Candidate[]; notices: ReferenceNotice[] } {
  const notices: ReferenceNotice[] = [];
  const candidates: Candidate[] = [];
  const collect = candidateCollector(candidates, notices, replacements);
  const sheets: Sheet[] = [];
  const records = new Map<Element, RecordEntry[]>();
  let totalBytes = 0;
  let totalNodes = 0;
  let steps = 0;
  const step = () => {
    if (++steps > 2_000_000) throw referenceLimit();
  };
  function addSheet(
    element: Element,
    input: string,
    inline: boolean,
    location: string,
  ) {
    const bytes = Buffer.byteLength(input);
    if (bytes > 1024 * 1024 || totalBytes + bytes > 512 * 1024) {
      notices.push({
        code: "REFERENCE_CSS_BUDGET",
        location,
        message:
          "CSS の容量上限を超えたため、この装飾を適用せず本文を保持しました。",
      });
      if (inline) delete element.attribs.style;
      else element.children = [];
      return;
    }
    totalBytes += bytes;
    try {
      const ast = css.parse(input, {
        context: inline ? "declarationList" : "stylesheet",
        parseCustomProperty: true,
        positions: false,
      });
      css.walk(ast, () => {
        if (++totalNodes > 100_000) throw referenceLimit();
      });
      sheets.push({
        element,
        inline,
        ast,
        location,
        ...(element.attribs["data-hollow-stylesheet-base"]
          ? { base: element.attribs["data-hollow-stylesheet-base"] }
          : {}),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "REFERENCE_RESOURCE_LIMIT"
      )
        throw error;
      notices.push({
        code: "REFERENCE_CSS_PARSE",
        location,
        message: "解析できない CSS を除去しました。",
        source: input.slice(0, 1024),
      });
      if (inline) delete element.attribs.style;
      else element.children = [];
    }
  }
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    if (!element) continue;
    if (element.name === "style")
      addSheet(
        element,
        element.children
          .map((node) => (node.type === "text" ? node.data : ""))
          .join(""),
        false,
        `style[${index}]`,
      );
    if (element.attribs.style)
      addSheet(
        element,
        element.attribs.style,
        true,
        `${element.name}[${index}]@style`,
      );
  }
  function drop(
    node: css.CssNode,
    item: css.ListItem<css.CssNode>,
    list: css.List<css.CssNode>,
    location: string,
    code: string,
  ) {
    notices.push({
      code,
      location,
      message:
        "未対応または安全に配置・参照を判断できない CSS を除去しました。",
      source: css.generate(node).slice(0, 1024),
    });
    list.remove(item);
  }
  function declaration(
    node: css.Declaration,
    item: css.ListItem<css.CssNode>,
    list: css.List<css.CssNode>,
    sheet: Sheet,
    targets: readonly Element[] | null,
    font: boolean,
  ) {
    const property = decode(node.property);
    let raw = false;
    css.walk(node.value, (entry) => {
      step();
      if (entry.type === "Raw") raw = true;
    });
    if (
      raw ||
      /^(?:animation|transition)/.test(property) ||
      ["behavior", "-moz-binding"].includes(property)
    ) {
      drop(
        node,
        item,
        list,
        sheet.location,
        raw ? "REFERENCE_CSS_RAW" : "REFERENCE_CSS_DYNAMIC",
      );
      return;
    }
    if (placement.has(property) && targets === null) {
      drop(node, item, list, sheet.location, "REFERENCE_CSS_SELECTOR");
      return;
    }
    let rejected = false;
    const kind: "background" | "font" = font ? "font" : "background";
    const rewrite = (url: string) => {
      const normalized = collect(url, kind, sheet.location, sheet.base);
      if (!normalized || (options.allow && !options.allow(normalized, kind))) {
        rejected = true;
        return url;
      }
      return normalized;
    };
    css.walk(node.value, (entry) => {
      step();
      if (entry.type === "Url") entry.value = rewrite(entry.value);
      if (
        entry.type === "Function" &&
        ["image-set", "-webkit-image-set"].includes(decode(entry.name))
      )
        entry.children.forEach((child) => {
          if (child.type === "String") child.value = rewrite(child.value);
        });
    });
    if (rejected) {
      drop(node, item, list, sheet.location, "REFERENCE_CSS_URL");
      return;
    }
    if (placement.has(property)) {
      const record: RecordEntry = {
        declaration: node,
        item,
        list,
        property,
        value: comparable(node.value),
        location: sheet.location,
      };
      for (const target of targets ?? []) {
        step();
        const set = records.get(target) ?? [];
        set.push(record);
        records.set(target, set);
      }
    }
  }
  function clean(
    list: css.List<css.CssNode>,
    sheet: Sheet,
    context: "sheet" | "rule" | "font",
    targets: readonly Element[] | null,
  ) {
    list.forEach((node, item) => {
      step();
      if (node.type === "Declaration" && context !== "sheet") {
        declaration(node, item, list, sheet, targets, context === "font");
        return;
      }
      if (node.type === "Rule" && context === "sheet") {
        let rawPrelude = node.prelude.type !== "SelectorList";
        css.walk(node.prelude, (entry) => {
          step();
          if (entry.type === "Raw") rawPrelude = true;
        });
        if (rawPrelude) {
          drop(node, item, list, sheet.location, "REFERENCE_CSS_RAW");
          return;
        }
        let matched: Element[] | null = null;
        if (node.prelude.type === "SelectorList") {
          let predicates: ((target: Element) => boolean)[] | null = null;
          try {
            predicates = node.prelude.children.toArray().map((entry) => {
              if (entry.type !== "Selector")
                throw new Error("Unsupported selector");
              return matcher(entry, step);
            });
          } catch {
            predicates = null;
          }
          if (predicates)
            matched = elements.filter((element) =>
              predicates.some((predicate) => predicate(element)),
            );
        }
        clean(node.block.children, sheet, "rule", matched);
        return;
      }
      if (node.type === "Atrule" && context === "sheet") {
        const name = decode(node.name);
        let unsupported = false;
        if (node.prelude)
          css.walk(node.prelude, (entry) => {
            step();
            if (entry.type === "Raw" || entry.type === "Url")
              unsupported = true;
          });
        if (
          ["media", "supports", "layer", "font-face"].includes(name) &&
          node.block &&
          !unsupported
        ) {
          clean(
            node.block.children,
            sheet,
            name === "font-face" ? "font" : "sheet",
            null,
          );
          return;
        }
        drop(
          node,
          item,
          list,
          sheet.location,
          name === "import" ? "REFERENCE_CSS_IMPORT" : "REFERENCE_CSS_AT_RULE",
        );
        return;
      }
      drop(
        node,
        item,
        list,
        sheet.location,
        node.type === "Raw" ? "REFERENCE_CSS_RAW" : "REFERENCE_CSS_STRUCTURE",
      );
    });
  }
  for (const sheet of sheets) {
    if (sheet.ast.type === "StyleSheet" || sheet.ast.type === "DeclarationList")
      clean(
        sheet.ast.children,
        sheet,
        sheet.inline ? "rule" : "sheet",
        sheet.inline ? [sheet.element] : null,
      );
  }
  const rejected = new Map<RecordEntry, string>();
  for (const set of records.values()) {
    step();
    const has = (property: string, expression: RegExp) =>
      set.some((record) => {
        step();
        return record.property === property && expression.test(record.value);
      });
    const positioned = has("position", /^(absolute|fixed|sticky)$/);
    const fullSize =
      has("width", /^100(?:%|[dsl]?vw)$/) &&
      has("height", /^100(?:%|[dsl]?vh)$/);
    const edges =
      has("inset", /^0(?: 0){0,3}$/) ||
      ["top", "right", "bottom", "left"].every((property) =>
        has(property, /^0$/),
      );
    const dynamic = set.some((record) => {
      step();
      return (
        /(?:var|calc|env)\(/.test(record.value) ||
        /^(?:inset-(?:inline|block)|inline-size|block-size)/.test(
          record.property,
        ) ||
        !css.lexer.matchProperty(record.property, record.declaration.value)
          .matched
      );
    });
    const full = positioned && (fullSize || edges);
    if (full || dynamic)
      for (const record of set) {
        step();
        if (neutralize.has(record.property) || dynamic)
          rejected.set(
            record,
            full ? "REFERENCE_CSS_OVERLAY" : "REFERENCE_CSS_PLACEMENT",
          );
      }
  }
  for (const [record, code] of rejected)
    drop(record.declaration, record.item, record.list, record.location, code);
  for (const sheet of sheets) {
    const output = css.generate(sheet.ast);
    if (sheet.inline) {
      if (output) sheet.element.attribs.style = output;
      else delete sheet.element.attribs.style;
    } else {
      const text = new Text(output.replace(/<\/style/gi, "\\3c /style"));
      text.parent = sheet.element;
      sheet.element.children = [text];
    }
  }
  return { candidates, notices };
}

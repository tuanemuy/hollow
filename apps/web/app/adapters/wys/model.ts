import render from "dom-serializer";
import { parseDocument } from "htmlparser2";
import {
  type Mark,
  type MarkSpec,
  type NodeSpec,
  type Node as PMNode,
  Schema,
} from "prosemirror-model";
import { TableMap, tableNodes } from "prosemirror-tables";

type AnyNode = ReturnType<typeof parseDocument>["children"][number];
type Element = Extract<AnyNode, { attribs: Record<string, string> }>;

const origin = { default: null, validate: "string|null" };
const base = { origin };
const label =
  (text: string): NonNullable<NodeSpec["toDOM"]> =>
  () => ["span", { contenteditable: "false", "data-wys-atom": "true" }, text];
const tables = tableNodes({
  tableGroup: "block",
  cellContent: "block+",
  cellAttributes: {},
});
for (const name of [
  "table",
  "table_row",
  "table_cell",
  "table_header",
] as const) {
  tables[name] = {
    ...tables[name],
    attrs: { ...tables[name].attrs, origin, section: { default: null } },
  };
}
tables.table.toDOM = () => ["table", ["tbody", 0]];
tables.table_row.toDOM = () => ["tr", 0];
for (const name of ["table_cell", "table_header"] as const) {
  tables[name].toDOM = (node) => [
    name === "table_cell" ? "td" : "th",
    {
      colspan: positive(node.attrs.colspan),
      rowspan: positive(node.attrs.rowspan),
    },
    0,
  ];
}
const mark = (tag: string): MarkSpec => ({
  attrs: base,
  toDOM: () => [tag, 0],
});
export const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: base,
      toDOM: () => ["p", 0],
    },
    heading: {
      group: "block",
      content: "inline*",
      defining: true,
      attrs: { ...base, level: { default: 1 } },
      toDOM: (node) => [`h${Math.min(6, positive(node.attrs.level))}`, 0],
    },
    blockquote: {
      group: "block",
      content: "block+",
      attrs: base,
      toDOM: () => ["blockquote", 0],
    },
    bullet_list: {
      group: "block",
      content: "list_item+",
      attrs: base,
      toDOM: () => ["ul", 0],
    },
    ordered_list: {
      group: "block",
      content: "list_item+",
      attrs: { ...base, order: { default: 1 } },
      toDOM: (node) => ["ol", { start: order(node.attrs.order) }, 0],
    },
    list_item: {
      content: "paragraph block*",
      defining: true,
      attrs: base,
      toDOM: () => ["li", 0],
    },
    code_block: {
      group: "block",
      content: "text*",
      marks: "",
      code: true,
      defining: true,
      attrs: { ...base, codeOrigin: { default: null } },
      toDOM: () => ["pre", ["code", 0]],
    },
    text: { group: "inline" },
    hard_break: {
      group: "inline",
      inline: true,
      selectable: false,
      attrs: base,
      toDOM: () => ["br"],
    },
    image: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { ...base, src: { default: "" }, alt: { default: "" } },
      toDOM: label("画像（表示はプレビュー）"),
    },
    video: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { ...base, src: { default: "" }, alt: { default: "" } },
      toDOM: label("動画（表示はプレビュー）"),
    },
    opaqueInline: {
      group: "inline",
      inline: true,
      atom: true,
      isolating: true,
      attrs: { id: {}, label: { default: "保持内容" } },
      toDOM: label("保持内容（HTMLで編集）"),
    },
    opaqueBlock: {
      group: "block",
      atom: true,
      isolating: true,
      attrs: { id: {}, label: { default: "保持内容" } },
      toDOM: () => [
        "div",
        { contenteditable: "false", "data-wys-atom": "true" },
        "保持内容（HTMLで編集）",
      ],
    },
    ...tables,
  },
  marks: {
    strong: mark("strong"),
    em: mark("em"),
    underline: mark("u"),
    code: mark("code"),
    link: {
      attrs: { ...base, href: { default: "" }, title: { default: "" } },
      inclusive: false,
      toDOM: () => ["span", { "data-wys-link": "true" }, 0],
    },
    span: { ...mark("span"), excludes: "" },
  },
});

export type SourceFragment = string | readonly [number, number];
export type Opaque = Readonly<{
  id: string;
  source: SourceFragment;
  kind: "inline" | "block";
  label: string;
}>;
export type Saved = Readonly<{
  tag: string;
  attrs: Readonly<Record<string, string>>;
  source: SourceFragment;
  depth: number;
  node?: PMNode | undefined;
}>;
export type Plan = Readonly<{
  source: string;
  doc: PMNode;
  opaque: ReadonlyMap<string, Opaque>;
  saved: ReadonlyMap<string, Saved>;
  losses: readonly { kind: string; reason: string }[];
  notices: readonly { kind: string; reason: string }[];
  lossCount: number;
  noticeCount: number;
  elapsedMs: number;
}>;
export const fragmentHtml = (
  plan: Pick<Plan, "source">,
  item: { source: SourceFragment },
): string =>
  typeof item.source === "string"
    ? item.source
    : plan.source.slice(item.source[0], item.source[1]);
const isElement = (node: AnyNode): node is Element =>
  "name" in node && "attribs" in node;
const childNodes = (node: AnyNode): AnyNode[] =>
  "children" in node ? node.children : [];
const textEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrEscape = (value: string) => textEscape(value).replace(/"/g, "&quot;");
function positive(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 1;
}
function order(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 1;
}
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const blockTags = new Set([
  "p",
  "div",
  "section",
  "aside",
  "article",
  "figure",
  "figcaption",
  "dl",
  "dt",
  "dd",
  "nav",
  "header",
  "footer",
  "main",
  "address",
  "hr",
  "table",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "style",
]);
const markTags: Record<string, string> = {
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "underline",
  code: "code",
  a: "link",
  span: "span",
};
const voidTags = new Set([
  "img",
  "br",
  "hr",
  "input",
  "source",
  "wbr",
  "meta",
  "link",
]);

export function prepare(html: string): Plan {
  const start = performance.now();
  const deadline = () => {
    if (performance.now() - start > 2000)
      throw new Error("変換の2秒上限です。原文をHTMLで保持してください。");
  };
  if (bytes(html) > 800 * 1024)
    throw new Error("HTMLは800KiB上限です。切り詰めません。");
  const ast = parseDocument(html, {
    decodeEntities: true,
    withStartIndices: true,
    withEndIndices: true,
  });
  let count = 0;
  const pending = [{ node: ast as AnyNode, depth: 0 }];
  while (pending.length) {
    deadline();
    const entry = pending.pop();
    if (!entry) break;
    if (++count > 10000 || entry.depth > 128)
      throw new Error("DOM10000/深さ128の上限です。原文を保持してください。");
    for (const node of childNodes(entry.node))
      pending.push({ node, depth: entry.depth + 1 });
  }
  const saved = new Map<string, Saved>();
  const opaque = new Map<string, Opaque>();
  const notices: { kind: string; reason: string }[] = [];
  const losses: { kind: string; reason: string }[] = [];
  const reportSpacing = (node: Element) => {
    if (
      node.children.some(
        (child) =>
          child.type === "text" && child.data.length > 0 && !child.data.trim(),
      )
    )
      losses.push({
        kind: "structure",
        reason: `${node.name}内の要素間空白は当該構造の編集時に正規化されます。white-space装飾の同値は保証しません。`,
      });
  };
  let next = 0;
  const raw = (node: AnyNode): SourceFragment =>
    node.startIndex != null && node.endIndex != null
      ? [node.startIndex, node.endIndex + 1]
      : render(node);
  const remember = (node: Element, depth: number): string => {
    const id = `s${next++}`;
    saved.set(id, {
      tag: node.name,
      attrs: { ...node.attribs },
      source: raw(node),
      depth,
    });
    return id;
  };
  const makeOpaque = (
    node: AnyNode,
    kind: "inline" | "block",
    reason: string,
  ): PMNode => {
    const id = `o${next++}`;
    const label = isElement(node) ? node.name : "文字・コメント";
    opaque.set(id, { id, kind, source: raw(node), label });
    notices.push({ kind: "opaque", reason });
    return schema.nodes[
      kind === "inline" ? "opaqueInline" : "opaqueBlock"
    ].create({ id, label });
  };
  const create = (
    name: string,
    node: Element,
    depth: number,
    content: readonly PMNode[] = [],
    attrs: Record<string, unknown> = {},
  ): PMNode => {
    const id = remember(node, depth);
    const result = schema.nodes[name].createChecked(
      { origin: id, ...attrs },
      content,
    );
    const original = saved.get(id);
    if (!original) throw new Error("保存用の要素対応を確認できません。");
    saved.set(id, { ...original, node: result });
    return result;
  };
  const inline = (
    nodes: readonly AnyNode[],
    depth: number,
    marks: readonly Mark[] = [],
  ): PMNode[] => {
    const result: PMNode[] = [];
    for (const node of nodes) {
      deadline();
      if (node.type === "text") {
        if (node.data) result.push(schema.text(node.data, marks));
        continue;
      }
      if (!isElement(node)) {
        result.push(makeOpaque(node, "inline", "非編集内容を保持").mark(marks));
        continue;
      }
      if (
        depth > 16 ||
        blockTags.has(node.name) ||
        node.name.includes(":") ||
        ["svg", "math"].includes(node.name)
      ) {
        result.push(
          makeOpaque(
            node,
            "inline",
            "inline内の非対応構造を最小部分木で保持",
          ).mark(marks),
        );
        continue;
      }
      const markName = markTags[node.name];
      if (
        markName &&
        !node.children.some((n) => isElement(n) && blockTags.has(n.name)) &&
        node.children.length
      ) {
        const id = remember(node, depth);
        const attrs =
          markName === "link"
            ? {
                origin: id,
                href: node.attribs.href ?? "",
                title: node.attribs.title ?? "",
              }
            : { origin: id };
        const nextMark = schema.marks[markName].create(attrs);
        if (
          marks.some((m) => m.type === nextMark.type) &&
          markName !== "span"
        ) {
          result.push(
            makeOpaque(node, "inline", "同一markの入れ子を保持").mark(marks),
          );
        } else
          result.push(
            ...inline(node.children, depth + 1, [...marks, nextMark]),
          );
      } else if (node.name === "br")
        result.push(create("hard_break", node, depth).mark(marks));
      else if (
        node.name === "img" ||
        (node.name === "video" && node.children.length === 0)
      ) {
        result.push(
          create(node.name === "img" ? "image" : "video", node, depth, [], {
            src: node.attribs.src ?? "",
            alt:
              node.attribs[node.name === "video" ? "aria-label" : "alt"] ?? "",
          }).mark(marks),
        );
      } else
        result.push(
          makeOpaque(node, "inline", "未知inline内容を原文保持").mark(marks),
        );
    }
    return result;
  };
  const synthetic = (nodes: readonly AnyNode[], depth: number): PMNode => {
    const result = schema.nodes.paragraph.createChecked(
      null,
      inline(nodes, depth),
    );
    const id = `s${next++}`;
    const wrapped = result.type.create({ origin: id }, result.content);
    const first = nodes[0]?.startIndex;
    const last = nodes[nodes.length - 1]?.endIndex;
    saved.set(id, {
      tag: "",
      attrs: {},
      source:
        first != null && last != null
          ? [first, last + 1]
          : nodes
              .map((node) =>
                fragmentHtml({ source: html }, { source: raw(node) }),
              )
              .join(""),
      depth,
      node: wrapped,
    });
    return wrapped;
  };
  const blocks = (nodes: readonly AnyNode[], depth: number): PMNode[] => {
    const result: PMNode[] = [];
    let run: AnyNode[] = [];
    const flush = () => {
      if (run.length) {
        result.push(synthetic(run, depth));
        run = [];
      }
    };
    for (const node of nodes) {
      deadline();
      if (
        node.type === "text" ||
        (isElement(node) &&
          (markTags[node.name] ||
            [
              "img",
              "video",
              "br",
              "sup",
              "sub",
              "small",
              "ruby",
              "time",
            ].includes(node.name)))
      ) {
        run.push(node);
        continue;
      }
      flush();
      if (!isElement(node)) {
        result.push(makeOpaque(node, "block", "コメント等を原文保持"));
        continue;
      }
      if (depth > 16) {
        result.push(makeOpaque(node, "block", "編集深さ16超を切り詰めず保持"));
        continue;
      }
      const tag = node.name;
      if (tag === "p" || /^h[1-6]$/.test(tag)) {
        result.push(
          create(
            tag === "p" ? "paragraph" : "heading",
            node,
            depth,
            inline(node.children, depth + 1),
            tag === "p" ? {} : { level: Number(tag[1]) },
          ),
        );
      } else if (tag === "blockquote")
        result.push(
          create(
            "blockquote",
            node,
            depth,
            nonempty(blocks(node.children, depth + 1)),
          ),
        );
      else if (tag === "ul" || tag === "ol") {
        const entries = node.children.filter(
          (n) => n.type !== "text" || n.data.trim(),
        );
        if (
          !entries.length ||
          entries.some((n) => !isElement(n) || n.name !== "li")
        ) {
          result.push(makeOpaque(node, "block", "不適合listを原文保持"));
          continue;
        }
        reportSpacing(node);
        if (
          tag === "ol" &&
          node.attribs.start !== undefined &&
          order(Number(node.attribs.start)) !== Number(node.attribs.start)
        )
          losses.push({
            kind: "attribute",
            reason: "非整数のol startは構造編集時に1へ正規化されます。",
          });
        const items = (entries as Element[]).map((item) => {
          const content = blocks(item.children, depth + 2);
          if (!content.length || content[0].type !== schema.nodes.paragraph) {
            content.unshift(schema.nodes.paragraph.create());
            losses.push({
              kind: "structure",
              reason:
                "list_itemの先頭編集段落を補います。元の非段落内容は保持します。",
            });
          }
          return create("list_item", item, depth + 1, content);
        });
        result.push(
          create(
            tag === "ul" ? "bullet_list" : "ordered_list",
            node,
            depth,
            items,
            tag === "ol"
              ? { order: order(Number(node.attribs.start ?? 1)) }
              : {},
          ),
        );
      } else if (tag === "pre") {
        const code =
          node.children.length === 1 &&
          isElement(node.children[0]) &&
          node.children[0].name === "code"
            ? node.children[0]
            : null;
        const texts = code ? code.children : node.children;
        if (texts.some((n) => n.type !== "text"))
          result.push(makeOpaque(node, "block", "非text code内容を原文保持"));
        else
          result.push(
            create(
              "code_block",
              node,
              depth,
              texts.flatMap((n) =>
                n.type === "text" && n.data ? [schema.text(n.data)] : [],
              ),
              { codeOrigin: code ? remember(code, depth + 1) : null },
            ),
          );
      } else if (tag === "table") result.push(table(node, depth));
      else
        result.push(
          makeOpaque(
            node,
            "block",
            tag === "style"
              ? "stylesheetは保存のみ・親DOMへ挿入しない"
              : "未知block/namespaceを最小部分木で保持",
          ),
        );
    }
    flush();
    return result;
  };
  const table = (node: Element, depth: number): PMNode => {
    const rows: { node: Element; section: string | null }[] = [];
    let invalid = false;
    let cells = 0;
    for (const child of node.children) {
      if (child.type === "text" && !child.data.trim()) continue;
      if (!isElement(child)) {
        invalid = true;
        break;
      }
      if (child.name === "tr") rows.push({ node: child, section: null });
      else if (["thead", "tbody", "tfoot"].includes(child.name)) {
        const section = remember(child, depth + 1);
        for (const row of child.children) {
          if (row.type === "text" && !row.data.trim()) continue;
          if (!isElement(row) || row.name !== "tr") {
            invalid = true;
            break;
          }
          rows.push({ node: row, section });
        }
      } else invalid = true;
    }
    const result: PMNode[] = [];
    for (const row of rows) {
      deadline();
      const columns: PMNode[] = [];
      for (const cell of row.node.children) {
        if (cell.type === "text" && !cell.data.trim()) continue;
        if (!isElement(cell) || !["td", "th"].includes(cell.name)) {
          invalid = true;
          break;
        }
        const colspan = Number(cell.attribs.colspan ?? 1);
        const rowspan = Number(cell.attribs.rowspan ?? 1);
        if (
          !Number.isSafeInteger(colspan) ||
          !Number.isSafeInteger(rowspan) ||
          colspan < 1 ||
          rowspan < 1 ||
          colspan > 1000 ||
          rowspan > 1000 ||
          cells + colspan * rowspan > 1000
        ) {
          invalid = true;
          break;
        }
        cells += colspan * rowspan;
        columns.push(
          create(
            cell.name === "td" ? "table_cell" : "table_header",
            cell,
            depth + 2,
            nonempty(blocks(cell.children, depth + 3)),
            { colspan, rowspan, colwidth: null },
          ),
        );
      }
      if (!columns.length) invalid = true;
      if (invalid) break;
      result.push(
        create("table_row", row.node, depth + 1, columns, {
          section: row.section,
        }),
      );
    }
    if (invalid || !result.length)
      return makeOpaque(
        node,
        "block",
        "不適合table/1000セル超をtable単位で保持",
      );
    const converted = create("table", node, depth, result);
    if (TableMap.get(converted).problems?.length)
      return makeOpaque(node, "block", "非矩形/重複span tableを補正せず保持");
    reportSpacing(node);
    for (const child of node.children)
      if (isElement(child) && ["thead", "tbody", "tfoot"].includes(child.name))
        reportSpacing(child);
    for (const row of rows) reportSpacing(row.node);
    return converted;
  };
  const doc = schema.nodes.doc.createChecked(
    null,
    nonempty(blocks(ast.children, 0)),
  );
  doc.check();
  const used = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name.startsWith("opaque")) used.add(String(node.attrs.id));
  });
  for (const id of opaque.keys()) if (!used.has(id)) opaque.delete(id);
  deadline();
  return {
    source: html,
    doc,
    opaque,
    saved,
    losses: losses.slice(0, 100),
    notices: notices.slice(0, 100),
    lossCount: losses.length,
    noticeCount: notices.length,
    elapsedMs: performance.now() - start,
  };
}

export type PackedPlan = Readonly<{
  source: string;
  doc: unknown;
  opaque: readonly (readonly [string, Opaque])[];
  saved: readonly (readonly [string, Omit<Saved, "node">])[];
  losses: Plan["losses"];
  notices: Plan["notices"];
  lossCount: number;
  noticeCount: number;
  elapsedMs: number;
}>;
export function pack(plan: Plan): PackedPlan {
  return {
    ...plan,
    doc: plan.doc.toJSON(),
    opaque: [...plan.opaque],
    saved: [...plan.saved].map(([id, value]) => {
      const { node, ...rest } = value;
      return [id, rest] as const;
    }),
  };
}
export function unpack(value: PackedPlan): Plan {
  const doc = schema.nodeFromJSON(value.doc);
  doc.check();
  const baseline = new Map<string, PMNode>();
  doc.descendants((node) => {
    if (typeof node.attrs.origin === "string")
      baseline.set(node.attrs.origin, node);
  });
  return {
    ...value,
    doc,
    opaque: new Map(value.opaque),
    saved: new Map(
      value.saved.map(([id, item]) => {
        return [id, { ...item, node: baseline.get(id) }];
      }),
    ),
  };
}
function nonempty(nodes: PMNode[]): PMNode[] {
  return nodes.length ? nodes : [schema.nodes.paragraph.create()];
}

const serialized = new WeakMap<Plan, WeakMap<PMNode, string>>();
export function serialize(plan: Plan, doc: PMNode): string {
  if (doc.type.schema !== schema) throw new Error("異なるschemaです。");
  let cache = serialized.get(plan);
  if (!cache) {
    cache = new WeakMap();
    serialized.set(plan, cache);
  }
  const start = performance.now();
  let count = 0;
  const check = (depth: number) => {
    if (++count > 10000 || depth > 128 || performance.now() - start > 2000)
      throw new Error("再合成の資源上限です。最新モデルを保持してください。");
  };
  const pending = [{ value: doc, depth: 0 }];
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    const { value, depth } = entry;
    check(depth);
    value.forEach((child) => {
      pending.push({ value: child, depth: depth + 1 });
    });
  }
  count = 0;
  if (doc.eq(plan.doc)) return plan.source;
  doc.check();
  const join = (a: string, b: string): string => {
    if (a.length + b.length > 800 * 1024)
      throw new Error("再合成HTMLは800KiB超です。切り詰めません。");
    return a + b;
  };
  const attributes = (attrs: Readonly<Record<string, string>>) =>
    Object.entries(attrs)
      .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${attrEscape(v)}"`))
      .join("");
  const wrap = (
    tag: string,
    attrs: Readonly<Record<string, string>>,
    content: string,
  ) =>
    !tag
      ? content
      : join(
          `<${tag}${attributes(attrs)}>`,
          voidTags.has(tag) ? "" : join(content, `</${tag}>`),
        );
  const savedFor = (id: unknown): Saved | undefined =>
    typeof id === "string" ? plan.saved.get(id) : undefined;
  const markTag: Record<string, string> = {
    strong: "strong",
    em: "em",
    underline: "u",
    code: "code",
    link: "a",
    span: "span",
  };
  const markData = (mark: Mark) => {
    const stored = savedFor(mark.attrs.origin);
    const attrs = { ...stored?.attrs };
    if (mark.type.name === "link") {
      attrs.href = String(mark.attrs.href);
      attrs.rel = "noopener noreferrer";
      if (mark.attrs.title) attrs.title = String(mark.attrs.title);
      else delete attrs.title;
    }
    return { tag: stored?.tag ?? markTag[mark.type.name], attrs };
  };
  const content = (parent: PMNode, depth: number): string => {
    let result = "";
    let active: readonly Mark[] = [];
    const close = (from: number) => {
      for (let i = active.length - 1; i >= from; i--)
        result = join(result, `</${markData(active[i]).tag}>`);
    };
    parent.forEach((child) => {
      const marks = [...child.marks].sort(
        (a, b) =>
          (savedFor(a.attrs.origin)?.depth ?? 1000) -
          (savedFor(b.attrs.origin)?.depth ?? 1000),
      );
      let common = 0;
      while (
        common < active.length &&
        common < marks.length &&
        active[common].eq(marks[common])
      )
        common++;
      close(common);
      for (let i = common; i < marks.length; i++) {
        const data = markData(marks[i]);
        result = join(result, `<${data.tag}${attributes(data.attrs)}>`);
      }
      active = marks;
      result = join(result, node(child, depth + 1));
    });
    close(0);
    return result;
  };
  const renderNode = (value: PMNode, depth: number): string => {
    check(depth);
    if (value.isText) return textEscape(value.text ?? "");
    const name = value.type.name;
    if (name === "opaqueInline" || name === "opaqueBlock") {
      const item = plan.opaque.get(String(value.attrs.id));
      if (!item || item.kind !== (name === "opaqueInline" ? "inline" : "block"))
        throw new Error("opaque sidecarがありません。欠落保存を拒否します。");
      return fragmentHtml(plan, item);
    }
    const stored = savedFor(value.attrs.origin);
    if (stored?.node?.eq(value)) return fragmentHtml(plan, stored);
    const attrs = { ...stored?.attrs };
    const tags: Record<string, string> = {
      paragraph: "p",
      heading: `h${Math.min(6, positive(value.attrs.level))}`,
      blockquote: "blockquote",
      bullet_list: "ul",
      ordered_list: "ol",
      list_item: "li",
      code_block: "pre",
      hard_break: "br",
      image: "img",
      video: "video",
      table: "table",
      table_row: "tr",
      table_cell: "td",
      table_header: "th",
      doc: "",
    };
    let tag = tags[name];
    if (tag === undefined) throw new Error("未対応モデルです。");
    if (stored && stored.tag === "") tag = "";
    if (name === "ordered_list") attrs.start = String(order(value.attrs.order));
    if (name === "image" || name === "video") {
      attrs.src = String(value.attrs.src);
      if (name === "image") attrs.alt = String(value.attrs.alt);
      else {
        attrs["aria-label"] = String(value.attrs.alt);
        if (!stored) {
          attrs.controls = "";
          attrs.preload = "metadata";
        }
      }
    }
    if (name === "table_cell" || name === "table_header") {
      for (const key of ["colspan", "rowspan"]) {
        if (positive(value.attrs[key]) !== 1)
          attrs[key] = String(positive(value.attrs[key]));
        else delete attrs[key];
      }
    }
    let inner: string;
    if (name === "table") {
      inner = "";
      let section: string | null = null;
      const close = () => {
        if (section) inner = join(inner, `</${savedFor(section)?.tag}>`);
      };
      value.forEach((row) => {
        const next =
          typeof row.attrs.section === "string" ? row.attrs.section : null;
        if (next !== section) {
          close();
          section = next;
          if (section) {
            const s = savedFor(section);
            if (!s || !["thead", "tbody", "tfoot"].includes(s.tag))
              throw new Error("table section不整合");
            inner = join(inner, `<${s.tag}${attributes(s.attrs)}>`);
          }
        }
        inner = join(inner, node(row, depth + 1));
      });
      close();
    } else inner = content(value, depth);
    if (name === "code_block") {
      const code = savedFor(value.attrs.codeOrigin);
      if (code) inner = wrap("code", code.attrs, inner);
    }
    return wrap(tag, attrs, inner);
  };
  const node = (value: PMNode, depth: number): string => {
    const previous = cache.get(value);
    if (previous !== undefined) return previous;
    const result = renderNode(value, depth);
    cache.set(value, result);
    return result;
  };
  const result = node(doc, 0);
  if (bytes(result) > 800 * 1024)
    throw new Error("再合成HTMLは800KiB超です。切り詰めません。");
  return result;
}

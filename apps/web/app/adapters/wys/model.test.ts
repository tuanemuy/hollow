import assert from "node:assert/strict";
import { history, undo } from "prosemirror-history";
import type { Node as PMNode } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { addColumnAfter, addRowAfter, TableMap } from "prosemirror-tables";
import { test } from "vitest";
import { fixtures } from "./fixtures";
import {
  fragmentHtml,
  pack,
  prepare,
  schema,
  serialize,
  unpack,
} from "./model";

function position(doc: PMNode, predicate: (node: PMNode) => boolean): number {
  let found: number | undefined;
  doc.descendants((node, pos) => {
    if (found === undefined && predicate(node)) found = pos;
  });
  assert.notEqual(found, undefined);
  return found!;
}
function insert(doc: PMNode, value = "追記"): PMNode {
  const state = EditorState.create({ schema, doc });
  return state.tr.insertText(
    value,
    position(doc, (node) => node.isText),
  ).doc;
}
for (const [name, html] of Object.entries(fixtures)) {
  test(`${name}: no model change preserves original bytes, including title-only/cancel`, () => {
    const plan = prepare(html);
    plan.doc.check();
    assert.equal(serialize(plan, plan.doc), html);
    assert.equal(serialize(plan, schema.nodeFromJSON(plan.doc.toJSON())), html);
    assert.deepEqual(plan.losses, []);
  });
}
test("ordinary model nodes and marks are explicit and editable", () => {
  const plan = prepare(fixtures.normal);
  assert.equal(plan.opaque.size, 0);
  const edited = insert(plan.doc);
  const html = serialize(plan, edited);
  assert.match(html, /追記見出し/);
  assert.match(html, /<strong>太字<\/strong>/);
  assert.match(html, /<ol start="3">/);
  assert.match(html, /<blockquote>/);
});
test("unknown inline/block and stylesheet survive surrounding typing with exact source", () => {
  const plan = prepare(fixtures.unknown);
  const html = serialize(plan, insert(plan.doc));
  assert.ok(plan.opaque.size >= 3);
  for (const item of plan.opaque.values())
    assert.equal(html.split(fragmentHtml(plan, item)).length - 1, 1);
  assert.match(html, /class="tone" style="color:blue" data-origin="forged"/);
  assert.match(
    html,
    /<span class="tone" style="font-weight:bold" data-x="2">編集可<\/span>/,
  );
  assert.equal(prepare(html).opaque.size, plan.opaque.size);
});
test("opaque explicit deletion and history undo restore exact fragments and original document", () => {
  const plan = prepare(fixtures.unknown);
  let state = EditorState.create({
    schema,
    doc: plan.doc,
    plugins: [history({ depth: 100 })],
  });
  const pos = position(state.doc, (n) => n.type.name === "opaqueInline");
  const target = state.doc.nodeAt(pos)!;
  const original = plan.opaque.get(target.attrs.id)!;
  state = state.apply(state.tr.delete(pos, pos + target.nodeSize));
  assert.ok(!serialize(plan, state.doc).includes(fragmentHtml(plan, original)));
  assert.equal(
    undo(state, (tr) => {
      state = state.apply(tr);
    }),
    true,
  );
  assert.equal(serialize(plan, state.doc), fixtures.unknown);
});
test("unknown namespace or invalid table is local; adjacent normal table/paragraph remains editable", () => {
  const namespace = prepare(fixtures.namespace);
  assert.equal(namespace.doc.firstChild!.type.name, "paragraph");
  assert.equal(namespace.doc.lastChild!.type.name, "paragraph");
  assert.equal(namespace.opaque.size, 2);
  const plan = prepare(fixtures.invalidNest);
  assert.equal(plan.doc.child(1).type.name, "opaqueBlock");
  assert.equal(plan.doc.child(2).type.name, "table");
  const html = serialize(plan, insert(plan.doc));
  assert.ok(
    html.includes("<table><div>不適合</div><tr><td>A</td></tr></table>"),
  );
  assert.match(html, /<td>通常<\/td>/);
});
test("ordinary and merged tables remain proper PM tables", () => {
  for (const html of [fixtures.table, fixtures.merged]) {
    const plan = prepare(html);
    const table = plan.doc.nodeAt(
      position(plan.doc, (n) => n.type.name === "table"),
    )!;
    assert.equal(TableMap.get(table).problems, null);
    assert.equal(plan.opaque.size, 0);
  }
});
test("table row/column insertion retains old cell text and section attrs", () => {
  const plan = prepare(fixtures.table);
  let state = EditorState.create({ schema, doc: plan.doc });
  const textPos = position(state.doc, (n) => n.isText && n.text === "A");
  state = state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, textPos)),
  );
  assert.equal(
    addRowAfter(state, (tr) => {
      state = state.apply(tr);
    }),
    true,
  );
  assert.equal(
    addColumnAfter(state, (tr) => {
      state = state.apply(tr);
    }),
    true,
  );
  const table = state.doc.nodeAt(
    position(state.doc, (n) => n.type.name === "table"),
  )!;
  assert.equal(TableMap.get(table).problems, null);
  assert.equal(table.childCount, 3);
  assert.equal(TableMap.get(table).width, 3);
  const html = serialize(plan, state.doc);
  for (const text of ["名前", "値", "A", "B"]) assert.ok(html.includes(text));
  assert.ok(html.includes('<thead data-kind="head">'));
  assert.equal(prepare(html).opaque.size, 0);
});
test("media/link/code attributes persist after nearby text changes", () => {
  const plan = prepare(fixtures.codeLinkMedia);
  assert.equal(plan.opaque.size, 0);
  const html = serialize(plan, insert(plan.doc));
  assert.match(html, /language-js/);
  assert.match(html, /href="https:\/\/example.com\//);
  assert.match(html, /<img src="\/api\/notes\/n\/assets\/a" alt="画像">/);
  assert.match(
    html,
    /<video src="https:\/\/example.com\/a.mp4" controls><\/video>/,
  );
});
test("saved class/style/data and arbitrary URL/event attributes never enter toDOM", () => {
  const plan = prepare(fixtures.dangerous);
  const specs: unknown[] = [];
  plan.doc.descendants((node) => {
    if (node.type.spec.toDOM) specs.push(node.type.spec.toDOM(node));
    for (const mark of node.marks)
      if (mark.type.spec.toDOM) specs.push(mark.type.spec.toDOM(mark, true));
  });
  const host = JSON.stringify(specs);
  for (const dangerous of [
    "display:none",
    "position:fixed",
    "javascript:",
    "bad.invalid",
    "onclick",
    "onerror",
    "alert(",
  ])
    assert.ok(!host.includes(dangerous), dangerous);
  assert.ok(host.includes("data-wys-link"));
});
test("fragment IDs are generated independently from user attributes and missing sidecars reject", () => {
  const plan = prepare('<p data-origin="o0">A<sup data-id="o0">B</sup></p>');
  const item = [...plan.opaque.values()][0];
  assert.ok(item);
  const edited = insert(plan.doc);
  assert.throws(
    () => serialize({ ...plan, opaque: new Map() }, edited),
    /sidecar/,
  );
  assert.match(serialize(plan, edited), /data-origin="o0"/);
});
test("1000-cell and depth-16 recommendations preserve source as opaque without truncating", () => {
  const table = "<table><tr>" + "<td>x</td>".repeat(1001) + "</tr></table>";
  const plan = prepare("<p>前</p>" + table + "<p>後</p>");
  assert.equal(plan.doc.child(1).type.name, "opaqueBlock");
  assert.ok(serialize(plan, insert(plan.doc)).includes(table));
  const deep = prepare(
    "<blockquote>".repeat(20) + "<p>deep</p>" + "</blockquote>".repeat(20),
  );
  assert.ok(deep.notices.some((n) => n.reason.includes("深さ16")));
  assert.equal(serialize(deep, deep.doc), deep.source);
});
test("global byte/DOM/depth limits reject instead of truncation", () => {
  assert.throws(
    () => prepare("日".repeat(Math.floor((800 * 1024) / 3) + 1)),
    /800KiB/,
  );
  assert.throws(() => prepare("<br>".repeat(10000)), /DOM10000/);
  assert.throws(
    () => prepare("<aside>".repeat(129) + "</aside>".repeat(129)),
    /深さ128/,
  );
  const exact =
    "日".repeat(Math.floor((800 * 1024) / 3)) + "x".repeat((800 * 1024) % 3);
  const plan = prepare(exact);
  assert.equal(serialize(plan, plan.doc), exact);
  assert.ok(plan.elapsedMs < 2000);
});
test("structured-clone pack/unpack preserves IDs, models and original source", () => {
  const plan = prepare(fixtures.unknown);
  const copy = unpack(structuredClone(pack(plan)));
  assert.ok(copy.doc.eq(plan.doc));
  assert.equal(serialize(copy, copy.doc), plan.source);
  assert.equal(
    serialize(copy, insert(copy.doc)),
    serialize(plan, insert(plan.doc)),
  );
});
test("edited empty media labels use the server canonical empty-attribute spelling", () => {
  const plan = prepare("<p>A</p>");
  const state = EditorState.create({ doc: plan.doc });
  const changed = state.apply(
    state.tr.insert(2, [
      schema.nodes.image.create({ src: "/image", alt: "" }),
      schema.nodes.video.create({ src: "/video", alt: "" }),
    ]),
  );
  const output = serialize(plan, changed.doc);
  assert.ok(output.includes('<img src="/image" alt>'));
  assert.ok(
    output.includes(
      '<video src="/video" aria-label controls preload="metadata">',
    ),
  );
});
test("normalization loss is distinct from opaque preservation and is bounded", () => {
  const html = "<ul>\n<li><p>A</p></li>\n<li><p>B</p></li>\n</ul><p>末</p>";
  const plan = prepare(html);
  assert.equal(plan.opaque.size, 0);
  assert.ok(
    plan.losses.some(
      (loss) => loss.kind === "structure" && loss.reason.includes("空白"),
    ),
  );
  assert.equal(serialize(plan, plan.doc), html);
  const many = prepare("<ul>\n<li>A</li>\n</ul>".repeat(150));
  assert.equal(many.losses.length, 100);
  assert.equal(many.lossCount, 150);
});
test("serialization refuses multiplied opaque payloads before materializing oversized output", () => {
  const plan = prepare("<aside>" + "x".repeat(420 * 1024) + "</aside>");
  const repeated = schema.nodes.doc.createChecked(null, [
    plan.doc.firstChild!,
    plan.doc.firstChild!,
  ]);
  assert.throws(() => serialize(plan, repeated), /800KiB/);
  assert.equal(serialize(plan, plan.doc), plan.source);
});
test("valid zero and negative ordered-list starts remain editable without value loss", () => {
  for (const start of [0, -2]) {
    const plan = prepare(`<ol start="${start}"><li>A</li></ol>`);
    assert.equal(plan.doc.firstChild!.attrs.order, start);
    assert.equal(plan.lossCount, 0);
    assert.match(
      serialize(plan, insert(plan.doc)),
      new RegExp(`start="${start}"`),
    );
  }
});

import { undoDepth } from "prosemirror-history";
import { TextSelection } from "prosemirror-state";
import { tableEditing } from "prosemirror-tables";
import { describe, expect, it } from "vitest";
import { pack, prepare, schema, serialize, unpack } from "./model";
import { WYS_EPOCH_STEPS, WysSession } from "./session";
import { preserveBlockType } from "./transaction";

describe("complete WYS transaction admission", () => {
  it("rejects expanded escaped input before model, HTML, history or recovery changes", () => {
    const session = new WysSession(prepare("<p></p>"));
    expect(
      session.admit(session.state.tr.insertText("<".repeat(170000), 1)).kind,
    ).toBe("accepted");
    const state = session.state;
    const html = session.html;
    const epoch = session.epoch;
    const rejected = session.admit(state.tr.insertText("<".repeat(40000), 1));
    expect(rejected.kind).toBe("rejected");
    expect(session.state).toBe(state);
    expect(session.html).toBe(html);
    expect(session.epoch).toEqual(epoch);
    expect(session.admit(session.state.tr.insertText("最新z", 1)).kind).toBe(
      "accepted",
    );
    expect(session.html).toContain("最新z");
  });
  it("does not emit a changed body or recreate acknowledged backup for rejected toolbar R1", () => {
    const raw = `<p>${"&lt;".repeat(204798)}</p>`;
    const session = new WysSession(prepare(raw));
    session.admit(session.state.tr.insertText("x", 1));
    expect(new TextEncoder().encode(session.html).byteLength).toBe(819200);
    let backup: string | null = null;
    const before = session.state;
    preserveBlockType(schema.nodes.heading, 2)(before, (tr) => {
      const result = session.admit(tr);
      if (result.kind === "accepted" && result.bodyChanged)
        backup = result.html;
      expect(result.kind).toBe("rejected");
    });
    expect(session.state).toBe(before);
    expect(backup).toBeNull();
    const accepted = session.admit(before.tr.delete(1, 2));
    expect(accepted.kind === "accepted" && accepted.bodyChanged).toBe(true);
  });
  it("preserves individual source attrs through heading and code without putting them in schema DOM", () => {
    const session = new WysSession(
      prepare(
        '<p class="a" style="color:blue" data-k="one">A</p><p class="b" data-k="two">B</p>',
      ),
    );
    session.admit(
      session.state.tr.setSelection(
        TextSelection.create(session.state.doc, 1, 5),
      ),
    );
    preserveBlockType(schema.nodes.heading, 2)(session.state, (tr) =>
      session.admit(tr),
    );
    expect(session.html).toContain(
      '<h2 class="a" style="color:blue" data-k="one">A</h2>',
    );
    expect(session.html).toContain('<h2 class="b" data-k="two">B</h2>');
    expect(
      schema.nodes.heading.spec.toDOM?.(session.state.doc.firstChild!),
    ).toEqual(["h2", 0]);
    session.history("undo", () => {});
    expect(session.html).toBe(session.plan.source);
  });
  it("only resets history after successful complete recovery, retaining document, selection, opaque and raw", () => {
    const session = new WysSession(
      prepare('<p>A</p><aside data-x="keep">opaque</aside>'),
    );
    session.admit(session.state.tr.insertText("B", 1));
    const state = session.state;
    const html = session.html;
    expect(session.resetHistory(() => false)).toBe(false);
    expect(session.state).toBe(state);
    expect(undoDepth(session.state)).toBeGreaterThan(0);
    expect(
      session.resetHistory(() => {
        throw new Error("storage denied");
      }),
    ).toBe(false);
    expect(session.state).toBe(state);
    expect(session.resetHistory((value) => value === html)).toBe(true);
    expect(session.state.doc).toBe(state.doc);
    expect(session.state.selection.eq(state.selection)).toBe(true);
    expect(session.html).toBe(html);
    expect(undoDepth(session.state)).toBe(0);
  });
  it("bounds new steps but permits undo/redo at the epoch boundary", () => {
    const session = new WysSession(prepare("<p>A</p>"));
    for (let i = 0; i < WYS_EPOCH_STEPS; i++)
      session.admit(session.state.tr.insertText("x", 1));
    expect(session.admit(session.state.tr.insertText("y", 1))).toMatchObject({
      kind: "rejected",
      epoch: true,
    });
    expect(
      session.history("undo", (result) => expect(result.kind).toBe("accepted")),
    ).toBe(true);
    expect(
      session.history("redo", (result) => expect(result.kind).toBe("accepted")),
    ).toBe(true);
  });
  it("validates table appended repairs before accepting complete HTML", () => {
    const session = new WysSession(
      prepare("<table><tr><td>A</td><td>B</td></tr></table>"),
      [tableEditing()],
    );
    const result = session.admit(session.state.tr.insertText("日本語", 4));
    expect(result.kind).toBe("accepted");
    expect(session.html).toContain("日本語");
    expect(serialize(session.plan, session.state.doc)).toBe(session.html);
  });
  it("bounds forward plus large inverse payloads independently of the step counter", () => {
    const session = new WysSession(prepare(`<p>${"x".repeat(700000)}</p>`));
    let rejected = false;
    for (let i = 0; i < 20; i++) {
      const before = session.state;
      const html = session.html;
      const epoch = session.epoch;
      const result = session.admit(
        before.tr.insertText(
          (i % 2 ? "x" : "y").repeat(700000),
          1,
          before.doc.content.size - 1,
        ),
      );
      if (result.kind === "rejected") {
        expect(result.epoch).toBe(true);
        expect(session.state).toBe(before);
        expect(session.html).toBe(html);
        expect(session.epoch).toEqual(epoch);
        expect(session.epoch.steps).toBeLessThan(20);
        rejected = true;
        break;
      }
    }
    expect(rejected).toBe(true);
    expect(
      session.history("undo", (result) => expect(result.kind).toBe("accepted")),
    ).toBe(true);
    expect(
      session.history("redo", (result) => expect(result.kind).toBe("accepted")),
    ).toBe(true);
  });
  it("packs the baseline doc once and retains raw CRLF and opaque source spans", () => {
    const raw = '<p class="a">A\r\nB</p><aside data-k="x">保持</aside>';
    const plan = prepare(raw);
    const packed = pack(plan);
    const roundtrip = unpack(packed);
    expect(serialize(roundtrip, roundtrip.doc)).toBe(raw);
    expect(packed.saved.every(([, item]) => !("node" in item))).toBe(true);
    const session = new WysSession(roundtrip);
    session.admit(session.state.tr.insertText("日本語", 1));
    expect(session.html).toContain('<aside data-k="x">保持</aside>');
  });
});

import { deleteSelection } from "prosemirror-commands";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { prepare, schema } from "@/adapters/wys/model";
import { WysSession } from "@/adapters/wys/session";
import { preserveBlockType } from "@/adapters/wys/transaction";
import {
  admitWysCommand,
  applyWysAdmission,
  insertWysMedia,
  mediaPresentation,
  opaqueBoundarySelection,
  WysEditor,
  wysLinkRange,
} from "./WysEditor";

const callbacks = () => ({
  updateState: vi.fn(),
  onChange: vi.fn(),
  onNotice: vi.fn(),
});

describe("WYS host atomic acceptance boundary", () => {
  it("publishes only accepted body changes, never selection or rejected toolbar attempts", () => {
    const session = new WysSession(prepare("<p>AB</p>"));
    const target = callbacks();
    applyWysAdmission(
      session,
      session.admit(
        session.state.tr.setSelection(
          TextSelection.create(session.state.doc, 2),
        ),
      ),
      target,
    );
    expect(target.onChange).not.toHaveBeenCalled();
    applyWysAdmission(
      session,
      session.admit(session.state.tr.insertText("追記")),
      target,
    );
    expect(target.onChange).toHaveBeenCalledExactlyOnceWith("<p>A追記B</p>");
    const before = session.state;
    const rejected = session.admit(
      session.state.tr.insertText("x".repeat(800 * 1024)),
    );
    expect(rejected.kind).toBe("rejected");
    applyWysAdmission(session, rejected, target);
    expect(target.updateState).toHaveBeenLastCalledWith(before);
    expect(target.onChange).toHaveBeenCalledTimes(1);
    expect(target.onNotice).toHaveBeenCalledTimes(1);
  });
  it("R1: oversized code toolbar conversion leaves HTML, state and parent backup signal unchanged", () => {
    const html = `<p>${"x".repeat(800 * 1024 - 7)}</p>`;
    const session = new WysSession(prepare(html));
    const before = session.state;
    const target = callbacks();
    expect(
      admitWysCommand(
        session,
        preserveBlockType(schema.nodes.code_block),
        (result) => applyWysAdmission(session, result, target),
      ),
    ).toBe(true);
    expect(session.state).toBe(before);
    expect(session.html).toBe(html);
    expect(target.onChange).not.toHaveBeenCalled();
    expect(target.updateState).toHaveBeenCalledExactlyOnceWith(before);
    expect(target.onNotice).toHaveBeenCalledTimes(1);
  });
  it("inserts scoped media at selection and preserves undo/redo", () => {
    const session = new WysSession(prepare("<p>AB</p>"));
    session.admit(
      session.state.tr.setSelection(TextSelection.create(session.state.doc, 2)),
    );
    const target = callbacks();
    const result = insertWysMedia(
      session,
      { src: "/api/drafts/draft/assets/image", kind: "image", alt: "説明" },
      { draftId: "draft" },
    );
    applyWysAdmission(session, result, target);
    expect(result.kind).toBe("accepted");
    expect(session.html).toContain(
      'A<img src="/api/drafts/draft/assets/image" alt="説明">B',
    );
    const inserted = session.html;
    expect(
      session.history("undo", (value) =>
        applyWysAdmission(session, value, target),
      ),
    ).toBe(true);
    expect(session.html).toBe("<p>AB</p>");
    expect(
      session.history("redo", (value) =>
        applyWysAdmission(session, value, target),
      ),
    ).toBe(true);
    expect(session.html).toBe(inserted);
  });
  it("rejects a foreign media scope without model mutation or onChange", () => {
    const session = new WysSession(prepare("<p>keep</p>"));
    const before = session.state;
    const target = callbacks();
    const result = insertWysMedia(
      session,
      { src: "/api/notes/other/assets/image", kind: "image", alt: "" },
      { noteId: "own" },
    );
    applyWysAdmission(session, result, target);
    expect(result.kind).toBe("rejected");
    expect(session.state).toBe(before);
    expect(target.onChange).not.toHaveBeenCalled();
  });
  it("rejected oversized media insertion preserves the exact history state", () => {
    const html = `<p>${"x".repeat(800 * 1024 - 7)}</p>`;
    const session = new WysSession(prepare(html));
    const before = session.state;
    const result = insertWysMedia(
      session,
      { src: "/api/notes/own/assets/id", kind: "image", alt: "" },
      { noteId: "own" },
    );
    expect(result.kind).toBe("rejected");
    expect(session.state).toBe(before);
    expect(session.html).toBe(html);
  });
  it("edits the entire contiguous link across bold and italic runs", () => {
    const session = new WysSession(
      prepare(
        '<p><a href="https://example.com">AB<strong>CD</strong><em>EF</em>GH</a>tail</p>',
      ),
    );
    session.admit(
      session.state.tr.setSelection(TextSelection.create(session.state.doc, 6)),
    );
    expect(wysLinkRange(session.state)).toEqual({ from: 1, to: 9 });
    session.admit(
      session.state.tr.setSelection(
        TextSelection.create(session.state.doc, 11),
      ),
    );
    expect(wysLinkRange(session.state)).toEqual({ from: 11, to: 11 });
  });
});

describe("WYS opaque selection before explicit deletion", () => {
  it.each([
    "Backspace",
    "Delete",
  ])("selects inline opaque first for %s, deletes only the next explicit selection", (key) => {
    const html = "<p>A<sup class='saved'>未知</sup>B</p>";
    const session = new WysSession(prepare(html));
    session.admit(
      session.state.tr.setSelection(
        TextSelection.create(session.state.doc, key === "Backspace" ? 3 : 2),
      ),
    );
    const selected = opaqueBoundarySelection(session.state, key);
    expect(selected).toBeInstanceOf(NodeSelection);
    if (!selected) throw Error("selection");
    const target = callbacks();
    applyWysAdmission(
      session,
      session.admit(session.state.tr.setSelection(selected)),
      target,
    );
    expect(session.html).toBe(html);
    expect(target.onChange).not.toHaveBeenCalled();
    expect(opaqueBoundarySelection(session.state, key)).toBeNull();
    deleteSelection(session.state, (tr) =>
      applyWysAdmission(session, session.admit(tr), target),
    );
    expect(session.html).toBe("<p>AB</p>");
    session.history("undo", (value) =>
      applyWysAdmission(session, value, target),
    );
    expect(session.html).toBe(html);
  });
  it("selects a neighboring opaque block across a paragraph boundary", () => {
    const session = new WysSession(prepare("<aside>保持</aside><p>text</p>"));
    session.admit(
      session.state.tr.setSelection(TextSelection.create(session.state.doc, 2)),
    );
    expect(opaqueBoundarySelection(session.state, "Backspace")?.from).toBe(0);
    session.admit(
      session.state.tr.setSelection(TextSelection.create(session.state.doc, 3)),
    );
    expect(opaqueBoundarySelection(session.state, "Backspace")).toBeNull();
  });
});

describe("WYS trusted host rendering", () => {
  it.each([
    "https://outside.test/image.png",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
    "/api/notes/other/assets/id",
    "/api/notes/own/revisions/1/assets/id",
  ])("does not expose arbitrary media src %s", (src) => {
    expect(
      mediaPresentation(schema.nodes.image.create({ src, alt: "label" }), {
        noteId: "own",
      }),
    ).toEqual({ kind: "unavailable" });
  });
  it("permits only current scoped source and alt as literal text", () => {
    expect(
      mediaPresentation(
        schema.nodes.image.create({
          src: "/api/notes/own/assets/id",
          alt: "<script>alert(1)</script>",
          origin: "untrusted-style",
        }),
        { noteId: "own" },
      ),
    ).toEqual({
      kind: "image",
      src: "/api/notes/own/assets/id",
      alt: "<script>alert(1)</script>",
    });
  });
  it("does not mount raw canonical HTML or create an EditorView during SSR", () => {
    const html =
      '<style>body{display:none}</style><p onclick="evil()">SECRET_CANONICAL</p><img src="https://evil.test/pixel">';
    const markup = renderToString(
      createElement(WysEditor, {
        plan: prepare(html),
        html,
        disabled: false,
        scope: {},
        onChange: vi.fn(),
        onCompositionChange: vi.fn(),
        onFiles: vi.fn(),
        onNotice: vi.fn(),
        onReprepare: vi.fn(),
        onRecover: () => false,
      }),
    );
    expect(markup).toContain("編集画面を準備しています");
    expect(markup).not.toContain("SECRET_CANONICAL");
    expect(markup).not.toContain("evil.test");
    expect(markup).not.toContain("display:none");
  });
});

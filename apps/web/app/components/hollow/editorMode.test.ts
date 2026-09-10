import { history, undo } from "@codemirror/commands";
import { EditorState, Transaction } from "@codemirror/state";
import { diagnoseHtml } from "@repo/core/adapters/html/editorAnalysis";
import { describe, expect, it } from "vitest";
import {
  editorModeKey,
  isEditorMode,
  readEditorMode,
  resolveEditorMode,
  writeEditorMode,
} from "./editorMode";
import { htmlDiagnosticSelection, htmlSourceChange } from "./HtmlSourceEditor";

describe("device editor mode", () => {
  it("accepts only the three modes", () => {
    for (const mode of ["wysiwyg", "html", "visual"])
      expect(isEditorMode(mode)).toBe(true);
    for (const mode of [undefined, null, "", "HTML", "markdown", 1, {}])
      expect(isEditorMode(mode)).toBe(false);
  });
  it("separates users and treats invalid or missing values as unset", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(editorModeKey("a")).toBe("hollow:editor-mode:a");
    writeEditorMode(storage, "a", "visual");
    expect(readEditorMode(storage, "a")).toBe("visual");
    expect(readEditorMode(storage, "b")).toBeUndefined();
    values.set(editorModeKey("a"), '{"mode":"html"}');
    expect(readEditorMode(storage, "a")).toBeUndefined();
  });
  it("does not hide unavailable storage from the caller", () => {
    const failure = new Error("storage unavailable");
    expect(() =>
      readEditorMode(
        {
          getItem: () => {
            throw failure;
          },
        },
        "a",
      ),
    ).toThrow(failure);
    expect(() =>
      writeEditorMode(
        {
          setItem: () => {
            throw failure;
          },
        },
        "a",
        "html",
      ),
    ).toThrow(failure);
  });
  it("keeps new notes WYSIWYG except a recovered backup mode", () => {
    expect(
      resolveEditorMode({ isNew: true, explicit: "html", device: "visual" }),
    ).toBe("wysiwyg");
    expect(
      resolveEditorMode({ isNew: true, backup: "html", explicit: "visual" }),
    ).toBe("html");
  });
  it("resolves existing notes by backup, explicit route, device, then HTML", () => {
    expect(
      resolveEditorMode({
        isNew: false,
        backup: "visual",
        explicit: "html",
        device: "wysiwyg",
      }),
    ).toBe("visual");
    expect(
      resolveEditorMode({ isNew: false, explicit: "html", device: "wysiwyg" }),
    ).toBe("html");
    expect(resolveEditorMode({ isNew: false, device: "visual" })).toBe(
      "visual",
    );
    expect(resolveEditorMode({ isNew: false })).toBe("html");
  });
});

describe("controlled HTML source changes", () => {
  it("maps external updates without resetting selection or adding an undo step", () => {
    let state = EditorState.create({
      doc: "<p>body</p>",
      selection: { anchor: 5 },
      extensions: [history(), EditorState.lineSeparator.of("\n")],
    });
    state = state.update({
      changes: { from: 5, insert: "X" },
      selection: { anchor: 6 },
      annotations: Transaction.userEvent.of("input.type"),
    }).state;
    const value = `${state.doc.toString()}<footer>external</footer>`;
    const change = htmlSourceChange(state.doc.toString(), value);
    if (!change) throw new Error("expected external update");
    state = state.update({
      changes: change,
      annotations: Transaction.addToHistory.of(false),
    }).state;
    expect(state.selection.main.head).toBe(6);
    expect(
      undo({
        state,
        dispatch: (transaction) => {
          state = transaction.state;
        },
      }),
    ).toBe(true);
    expect(state.doc.toString()).toBe("<p>body</p><footer>external</footer>");
    expect(
      undo({
        state,
        dispatch: (transaction) => {
          state = transaction.state;
        },
      }),
    ).toBe(false);
  });
  it("retains mixed CRLF/CR/LF bytes in CodeMirror state", () => {
    const value = "<p>日本語</p>\r\n<div>x</div>\r\nlast\ronly\n";
    expect(
      EditorState.create({
        doc: value,
        extensions: [EditorState.lineSeparator.of("\n")],
      }).doc.toString(),
    ).toBe(value);
  });
  it.each([
    "\r\n",
    "\r",
    "\n",
  ])("maps raw diagnostic UTF-16 offsets without normalizing %j", (newline) => {
    const source = `<p>日本😀&amp;</p>${newline}<p>前方</p>${newline}<div a="1" a="2">後</div>`;
    const diagnostic = diagnoseHtml(source)[0];
    if (!diagnostic) throw new Error("missing diagnostic");
    const initial = EditorState.create({
      doc: source,
      extensions: [EditorState.lineSeparator.of("\n")],
    });
    const selected = initial.update({
      selection: htmlDiagnosticSelection(initial.doc.length, diagnostic.offset),
    }).state;
    expect(
      selected.doc.sliceString(
        selected.selection.main.from,
        selected.selection.main.to,
      ),
    ).toBe("=");
    expect(selected.doc.toString()).toBe(source);
    const eof = selected.update({
      selection: htmlDiagnosticSelection(selected.doc.length, source.length),
    }).state;
    expect(eof.selection.main.empty).toBe(true);
    expect(eof.selection.main.head).toBe(source.length);
    expect(eof.doc.toString()).toBe(source);
    expect(htmlDiagnosticSelection(source.length, source.length + 10)).toEqual({
      anchor: source.length,
      head: source.length,
    });
  });
  it("does not dispatch an unchanged parent echo", () => {
    expect(htmlSourceChange("<p>same</p>", "<p>same</p>")).toBeNull();
  });
  it("changes only the differing span, preserving unrelated selection/history ranges", () => {
    expect(htmlSourceChange("<p>before</p>", "<p>after</p>")).toEqual({
      from: 3,
      to: 9,
      insert: "after",
    });
    expect(htmlSourceChange("abc", "aXbc")).toEqual({
      from: 1,
      to: 1,
      insert: "X",
    });
    expect(htmlSourceChange("abc", "ac")).toEqual({
      from: 1,
      to: 2,
      insert: "",
    });
  });
  it("preserves Japanese, surrogate pairs, and exact line endings", () => {
    for (const [before, after] of [
      ["<p>日本語😀</p>\r\n", "<p>日本語😁</p>\r\n"],
      ["x😀z", "x😃z"],
      ["x\r\ny", "x\ny"],
      ["", "全角"],
    ]) {
      const change = htmlSourceChange(before, after);
      expect(change).not.toBeNull();
      if (change)
        expect(
          before.slice(0, change.from) +
            change.insert +
            before.slice(change.to),
        ).toBe(after);
    }
  });
  it("never truncates oversized input", () => {
    const after = `<p>${"a".repeat(800 * 1024 + 1)}</p>`;
    const change = htmlSourceChange("", after);
    expect(change?.insert).toBe(after);
  });
});

import {
  editedText,
  projectText,
  serializeTextChanges,
} from "@repo/core/application/note/editorText";
import type {
  EditableText,
  ProjectedNode,
  VisualProjection,
} from "@repo/core/application/ports/htmlEditor";

type Entry = { node: Text; ids: readonly string[] };
type Change = { id: string; before: string; after: string };
export class NoVisibleTextError extends Error {}
export class VisualTextHost {
  readonly values: Map<string, string>;
  private readonly entries: Entry[] = [];
  private readonly texts: Map<string, EditableText>;
  private readonly selectable = new Set<string>();
  private active: string | undefined;
  private composition: { id: string; before: string; time: number } | undefined;
  private undoStack: Change[] = [];
  private redoStack: Change[] = [];
  private readonly abort = new AbortController();
  private readonly doc: Document;
  constructor(
    private readonly options: {
      frame: HTMLIFrameElement;
      host: HTMLTextAreaElement;
      canonical: string;
      projection: VisualProjection;
      change(html: string, values: ReadonlyMap<string, string>): void;
      state(composing: boolean, empty: readonly string[]): void;
      notice(message: string): void;
      disabled(): boolean;
    },
  ) {
    const doc = options.frame.contentDocument;
    if (!doc || options.projection.issues.length)
      throw new Error(options.projection.issues[0] ?? "本文を確認できません。");
    this.doc = doc;
    this.values = new Map(
      options.projection.texts.map((text) => [text.id, text.value]),
    );
    this.texts = new Map(
      options.projection.texts.map((text) => [text.id, text]),
    );
    const compare = (node: Node, model: ProjectedNode): void => {
      if (node.nodeType !== model.type)
        throw new Error("表示の型が一致しません。編集を停止しました。");
      if (model.type === 3) {
        if (node.nodeValue !== model.value)
          throw new Error("表示の文字が一致しません。");
        if (model.ids.length)
          this.entries.push({ node: node as Text, ids: model.ids });
      } else if (model.type === 8) {
        if (node.nodeValue !== model.value)
          throw new Error("表示のコメントが一致しません。");
      } else {
        if (model.type === 1) {
          const element = node as Element;
          const attrs = [...element.attributes]
            .map((a) => [a.localName, a.value, a.namespaceURI ?? ""])
            .sort((a, b) => a.join("\0").localeCompare(b.join("\0")));
          if (
            element.localName !== model.name ||
            element.namespaceURI !== model.namespace ||
            JSON.stringify(attrs) !== JSON.stringify(model.attrs)
          )
            throw new Error("表示の要素・属性が一致しません。");
        }
        const children = [...node.childNodes].filter(
          (child) => child.nodeType !== 10,
        );
        if (children.length !== model.children.length)
          throw new Error("表示の構造が一致しません。");
        model.children.forEach((child, index) => {
          const target = children[index];
          if (target) compare(target, child);
        });
      }
    };
    compare(doc, options.projection.expected);
    for (const entry of this.entries) {
      let start = 0;
      for (const id of entry.ids) {
        const range = doc.createRange();
        const length = this.display(id).length;
        range.setStart(entry.node, start);
        range.setEnd(entry.node, start + length);
        const visibility = entry.node.parentElement
          ? doc.defaultView?.getComputedStyle(entry.node.parentElement)
              .visibility
          : "hidden";
        if (
          visibility !== "hidden" &&
          visibility !== "collapse" &&
          [...range.getClientRects()].some(
            (rect) => rect.width > 0 && rect.height > 0,
          )
        )
          this.selectable.add(id);
        start += length;
      }
    }
    if (!this.selectable.size)
      throw new NoVisibleTextError(
        "表示される編集可能な文字がありません。HTML モードで内容を保持します。",
      );
    const signal = this.abort.signal;
    doc.addEventListener("click", this.click, { capture: true, signal });
    for (const name of ["auxclick", "dragstart", "drop", "beforeinput"])
      doc.addEventListener(
        name,
        (event) => {
          event.preventDefault();
          options.notice(
            "文字を一か所ずつ選択してください。要素の移動・挿入はできません。",
          );
        },
        { capture: true, signal },
      );
    doc.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Tab") return;
        event.preventDefault();
        options.notice(
          "表示テキストをクリック、または文字一覧から選択してください。",
        );
      },
      { signal },
    );
    const host = options.host;
    host.addEventListener(
      "input",
      (event) => {
        if (!this.active || (event.isComposing && !this.composition)) return;
        const before = this.values.get(this.active) ?? "";
        this.change(
          this.active,
          editedText(before, host.value, this.texts.get(this.active)?.prefix),
          !this.composition,
        );
      },
      { signal },
    );
    host.addEventListener(
      "compositionstart",
      (event) => {
        if (!this.active || this.composition || host.hidden) return;
        this.composition = {
          id: this.active,
          before: this.values.get(this.active) ?? "",
          time: event.timeStamp,
        };
        this.emit();
      },
      { signal },
    );
    host.addEventListener(
      "compositionend",
      (event) => {
        const composition = this.composition;
        if (!composition || event.timeStamp < composition.time) return;
        this.composition = undefined;
        if (this.active !== composition.id || host.hidden) {
          this.emit();
          return;
        }
        const after = editedText(
          composition.before,
          host.value,
          this.texts.get(composition.id)?.prefix,
        );
        this.change(composition.id, after, false);
        if (after !== composition.before)
          this.remember({
            id: composition.id,
            before: composition.before,
            after,
          });
        this.emit();
      },
      { signal },
    );
    host.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.close();
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          ["z", "y", "b", "i", "u"].includes(event.key.toLowerCase())
        ) {
          event.preventDefault();
          if (event.key.toLowerCase() === "z") this.undo(event.shiftKey);
          else if (event.key.toLowerCase() === "y") this.undo(true);
          else options.notice("ビジュアル編集では書式を変更できません。");
        }
      },
      { signal },
    );
    host.addEventListener(
      "beforeinput",
      (event) => {
        if (/^(format|insertFromDrop|history)/.test(event.inputType))
          event.preventDefault();
      },
      { signal },
    );
    host.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();
        options.notice("ビジュアル編集ではファイルや要素を挿入できません。");
      },
      { signal },
    );
    host.addEventListener(
      "paste",
      (event) => {
        event.preventDefault();
        if (!this.active || this.composition) {
          options.notice("文字変換の確定を待ってください。");
          return;
        }
        const clipboard = event.clipboardData;
        if (
          !clipboard ||
          clipboard.files.length ||
          !clipboard.types.includes("text/plain")
        ) {
          options.notice(
            "文字だけをコピーしてください。HTMLのみ・ファイルは貼り付けできません。",
          );
          return;
        }
        host.setRangeText(
          clipboard.getData("text/plain").replace(/\r\n?/g, "\n"),
          host.selectionStart,
          host.selectionEnd,
          "end",
        );
        const before = this.values.get(this.active) ?? "";
        this.change(
          this.active,
          editedText(before, host.value, this.texts.get(this.active)?.prefix),
          true,
        );
      },
      { signal },
    );
    this.emit();
  }
  private display(id: string) {
    return projectText(this.values.get(id) ?? "", this.texts.get(id)?.prefix)
      .display;
  }
  private emit() {
    this.options.state(
      Boolean(this.composition),
      [...this.texts.keys()].filter((id) => !this.display(id)),
    );
  }
  private repaint() {
    for (const entry of this.entries)
      entry.node.data = entry.ids.map((id) => this.display(id)).join("");
  }
  private remember(change: Change) {
    this.undoStack.push(change);
    this.redoStack = [];
    let bytes = this.undoStack.reduce(
      (sum, item) => sum + 2 * (item.before.length + item.after.length),
      0,
    );
    while (this.undoStack.length > 100 || bytes > 8 * 1024 * 1024) {
      this.options.notice(
        "文字編集の undo 上限（100操作 / 8 MiB）に達したため、古い操作を解放しました。現在の入力は保持しています。",
      );
      const old = this.undoStack.shift();
      if (old) bytes -= 2 * (old.before.length + old.after.length);
    }
  }
  private change(id: string, value: string, remember: boolean) {
    const before = this.values.get(id);
    if (before === undefined || before === value) return;
    this.values.set(id, value);
    if (remember) this.remember({ id, before, after: value });
    this.repaint();
    // Only source ranges supplied by the verified AST are replaced with escaped Text.
    this.options.change(
      serializeTextChanges(
        this.options.canonical,
        this.options.projection.texts,
        this.values,
      ),
      this.values,
    );
    this.emit();
  }
  private click = (event: MouseEvent) => {
    event.preventDefault();
    if (this.composition || this.options.disabled()) {
      this.options.notice("文字変換または処理の完了を待ってください。");
      return;
    }
    const selection = this.doc.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      selection.anchorNode !== selection.focusNode
    ) {
      this.options.notice("複数の文字要素をまとめて編集できません。");
      return;
    }
    const matches: { id: string; offset: number }[] = [];
    for (const entry of this.entries) {
      let start = 0;
      for (const id of entry.ids) {
        const size = this.display(id).length;
        const range = this.doc.createRange();
        range.setStart(entry.node, start);
        range.setEnd(entry.node, start + size);
        if (
          [...range.getClientRects()].some(
            (rect) =>
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom,
          )
        ) {
          const caret = this.doc.caretPositionFromPoint?.(
            event.clientX,
            event.clientY,
          );
          matches.push({
            id,
            offset:
              caret?.offsetNode === entry.node
                ? Math.max(0, Math.min(size, caret.offset - start))
                : 0,
          });
        }
        start += size;
      }
    }
    if (matches.length !== 1) {
      this.options.notice(
        "文字の境界を一意に選択できません。文字一覧を利用してください。",
      );
      return;
    }
    const match = matches[0];
    if (match) this.select(match.id, match.offset);
  };
  select(id: string, offset = 0) {
    if (!this.selectable.has(id)) {
      this.options.notice("この文字は表示されていないため直接編集できません。");
      return;
    }
    if (this.composition || this.options.disabled() || !this.texts.has(id)) {
      this.options.notice("処理または文字変換の確定を待ってください。");
      return;
    }
    this.active = id;
    const entry = this.entries.find((item) => item.ids.includes(id));
    const rect = entry?.node.parentElement?.getBoundingClientRect();
    const frame = this.options.frame.getBoundingClientRect();
    const host = this.options.host;
    const style = entry?.node.parentElement
      ? this.doc.defaultView?.getComputedStyle(entry.node.parentElement)
      : undefined;
    host.hidden = false;
    host.value = this.display(id);
    Object.assign(host.style, {
      position: "fixed",
      left: `${Math.max(8, Math.min(window.innerWidth - 220, frame.left + (rect?.left ?? 0)))}px`,
      top: `${Math.max(8, Math.min(window.innerHeight - 150, frame.top + (rect?.top ?? 0)))}px`,
      width: `${Math.max(200, Math.min(window.innerWidth - 32, rect?.width ?? 300))}px`,
      height: "130px",
      fontFamily: style?.fontFamily ?? "inherit",
      fontSize: style?.fontSize ?? "16px",
      lineHeight: style?.lineHeight ?? "1.6",
    });
    host.focus();
    host.setSelectionRange(offset, offset);
  }
  close() {
    if (this.composition) {
      this.options.notice("文字変換の確定中です。確定してから閉じてください。");
      return;
    }
    this.options.host.hidden = true;
    this.active = undefined;
  }
  undo(redo = false) {
    if (this.composition) {
      this.options.notice("文字変換を確定してください。");
      return;
    }
    const change = (redo ? this.redoStack : this.undoStack).pop();
    if (!change) return;
    this.change(change.id, redo ? change.after : change.before, false);
    (redo ? this.undoStack : this.redoStack).push(change);
    this.select(change.id);
  }
  dispose() {
    this.abort.abort();
    this.options.host.hidden = true;
  }
}

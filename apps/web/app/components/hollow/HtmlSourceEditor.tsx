"use client";

import type { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import "./htmlSourceEditor.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onFiles: (files: File[]) => void;
  onCompositionChange?: (active: boolean) => void;
  selection?: { offset: number; sequence: number } | undefined;
};

export function htmlDiagnosticSelection(length: number, offset: number) {
  const anchor = Math.max(0, Math.min(length, offset));
  return { anchor, head: Math.min(anchor + 1, length) };
}

export function htmlSourceChange(before: string, after: string) {
  if (before === after) return null;
  let from = 0;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (
    from < oldEnd &&
    from < newEnd &&
    before.charCodeAt(from) === after.charCodeAt(from)
  )
    from++;
  if (
    from > 0 &&
    before.charCodeAt(from - 1) >= 0xd800 &&
    before.charCodeAt(from - 1) <= 0xdbff
  )
    from--;
  while (
    oldEnd > from &&
    newEnd > from &&
    before.charCodeAt(oldEnd - 1) === after.charCodeAt(newEnd - 1)
  ) {
    oldEnd--;
    newEnd--;
  }
  if (
    oldEnd < before.length &&
    before.charCodeAt(oldEnd) >= 0xdc00 &&
    before.charCodeAt(oldEnd) <= 0xdfff
  ) {
    oldEnd++;
    newEnd++;
  }
  return { from, to: oldEnd, insert: after.slice(from, newEnd) };
}

export function HtmlSourceEditor(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const controller = useRef<{
    sync: (value: string, disabled: boolean) => void;
    measure: () => void;
    reveal: (offset: number) => void;
  } | null>(null);
  const composing = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only an explicit retry recreates the view; current props are synchronized separately.
  useEffect(() => {
    let disposed = false;
    let view: EditorView | undefined;
    let finishComposition: ReturnType<typeof setTimeout> | undefined;
    let compositionFrame: number | undefined;
    setState("loading");
    void Promise.all([
      import("@codemirror/state"),
      import("@codemirror/view"),
      import("@codemirror/commands"),
      import("@codemirror/language"),
      import("@codemirror/lang-html"),
    ])
      .then(([stateApi, viewApi, commands, language, html]) => {
        if (disposed || !host.current) return;
        const external = stateApi.Annotation.define<boolean>();
        const editable = new stateApi.Compartment();
        let controlledValue = latest.current.value;
        let disabled = latest.current.disabled;
        let deferredValue: string | undefined;
        const editing = (locked: boolean) => [
          stateApi.EditorState.readOnly.of(locked),
          viewApi.EditorView.editable.of(!locked),
          viewApi.EditorView.contentAttributes.of({
            "aria-label": "HTML ソース",
            "aria-readonly": String(locked),
            "aria-multiline": "true",
            spellcheck: "false",
            tabindex: "0",
          }),
        ];
        const replace = (value: string) => {
          if (!view || disposed) return;
          const change = htmlSourceChange(view.state.doc.toString(), value);
          if (change)
            view.dispatch({
              changes: change,
              annotations: [
                external.of(true),
                stateApi.Transaction.addToHistory.of(false),
              ],
            });
        };
        const settleComposition = () => {
          if (disposed || !view) return;
          if (view.compositionStarted) {
            finishComposition = setTimeout(endComposition, 20);
            return;
          }
          composing.current = false;
          latest.current.onCompositionChange?.(false);
          if (deferredValue !== undefined) {
            const value = deferredValue;
            deferredValue = undefined;
            replace(value);
          }
        };
        const endComposition = () => {
          if (disposed) return;
          // Android may flush the final composition input on the next frame.
          compositionFrame = requestAnimationFrame(() => {
            finishComposition = setTimeout(settleComposition, 0);
          });
        };
        const startComposition = () => {
          if (finishComposition !== undefined) clearTimeout(finishComposition);
          if (compositionFrame !== undefined)
            cancelAnimationFrame(compositionFrame);
          composing.current = true;
          latest.current.onCompositionChange?.(true);
          endComposition();
        };
        view = new viewApi.EditorView({
          parent: host.current,
          state: stateApi.EditorState.create({
            doc: controlledValue,
            extensions: [
              stateApi.EditorState.lineSeparator.of("\n"),
              stateApi.EditorState.tabSize.of(2),
              html.html({ autoCloseTags: false }),
              viewApi.lineNumbers(),
              commands.history(),
              viewApi.keymap.of([
                ...commands.defaultKeymap,
                ...commands.historyKeymap,
              ]),
              language.syntaxHighlighting(language.defaultHighlightStyle),
              editable.of(editing(disabled)),
              stateApi.EditorState.transactionFilter.of((transaction) =>
                transaction.docChanged &&
                latest.current.disabled &&
                !transaction.annotation(external)
                  ? []
                  : transaction,
              ),
              viewApi.EditorView.updateListener.of((update) => {
                if (update.view.compositionStarted && !composing.current)
                  startComposition();
                if (
                  update.docChanged &&
                  update.transactions.some(
                    (transaction) =>
                      transaction.docChanged &&
                      !transaction.annotation(external),
                  )
                ) {
                  deferredValue = undefined;
                  latest.current.onChange(update.state.doc.toString());
                }
              }),
              viewApi.EditorView.domEventHandlers({
                dragover(event) {
                  if (!event.dataTransfer?.types.includes("Files"))
                    return false;
                  event.preventDefault();
                  return true;
                },
                drop(event) {
                  const files = [...(event.dataTransfer?.files ?? [])];
                  if (!files.length) return false;
                  event.preventDefault();
                  if (!latest.current.disabled) latest.current.onFiles(files);
                  return true;
                },
                compositionstart() {
                  startComposition();
                  return false;
                },
                compositionend() {
                  if (finishComposition !== undefined)
                    clearTimeout(finishComposition);
                  if (compositionFrame !== undefined)
                    cancelAnimationFrame(compositionFrame);
                  endComposition();
                  return false;
                },
              }),
            ],
          }),
        });
        controller.current = {
          reveal(offset) {
            if (!view || composing.current) return;
            const selection = htmlDiagnosticSelection(
              view.state.doc.length,
              offset,
            );
            view.dispatch({
              selection,
              effects: viewApi.EditorView.scrollIntoView(selection.anchor, {
                y: "center",
              }),
            });
            view.focus();
          },
          measure: () => view?.requestMeasure(),
          sync(value, locked) {
            if (!view || disposed) return;
            if (locked !== disabled) {
              disabled = locked;
              view.dispatch({ effects: editable.reconfigure(editing(locked)) });
            }
            if (value === controlledValue) return;
            controlledValue = value;
            if (value === view.state.doc.toString()) {
              deferredValue = undefined;
              return;
            }
            if (composing.current || view.compositionStarted)
              deferredValue = value;
            else replace(value);
          },
        };
        setState("ready");
      })
      .catch(() => {
        if (!disposed) {
          view?.destroy();
          view = undefined;
          controller.current = null;
          setState("failed");
        }
      });
    return () => {
      disposed = true;
      controller.current = null;
      if (finishComposition !== undefined) clearTimeout(finishComposition);
      if (compositionFrame !== undefined)
        cancelAnimationFrame(compositionFrame);
      view?.destroy();
      if (composing.current) {
        composing.current = false;
        latest.current.onCompositionChange?.(false);
      }
    };
  }, [attempt]);

  useEffect(() => {
    controller.current?.sync(props.value, props.disabled);
  }, [props.value, props.disabled]);

  useEffect(() => {
    if (state === "ready") controller.current?.measure();
  }, [state]);
  useEffect(() => {
    if (props.selection) controller.current?.reveal(props.selection.offset);
  }, [props.selection]);

  return (
    <div className="hollow-source-editor">
      <div ref={host} hidden={state !== "ready"} />
      {state === "loading" && <p role="status">HTML エディターを読み込み中…</p>}
      {state === "failed" && (
        <>
          <p role="alert">
            HTML
            エディターを読み込めませんでした。本文は保持しています。簡易入力で編集を続けられます。
          </p>
          <textarea
            aria-label="HTML ソース"
            value={props.value}
            disabled={props.disabled}
            spellCheck={false}
            onChange={(event) =>
              latest.current.onChange(event.currentTarget.value)
            }
            onCompositionStart={() => {
              composing.current = true;
              latest.current.onCompositionChange?.(true);
            }}
            onCompositionEnd={(event) => {
              latest.current.onChange(event.currentTarget.value);
              composing.current = false;
              latest.current.onCompositionChange?.(false);
            }}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes("Files"))
                event.preventDefault();
            }}
            onDrop={(event) => {
              if (!event.dataTransfer.files.length) return;
              event.preventDefault();
              if (!latest.current.disabled)
                latest.current.onFiles([...event.dataTransfer.files]);
            }}
          />
          <button
            type="button"
            className="hollow-button"
            disabled={props.disabled}
            onClick={() => {
              if (!composing.current) setAttempt((value) => value + 1);
            }}
          >
            エディターを再読み込み
          </button>
        </>
      )}
    </div>
  );
}

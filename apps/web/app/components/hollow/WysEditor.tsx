"use client";

import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import {
  baseKeymap,
  chainCommands,
  deleteSelection,
  lift,
  toggleMark,
  wrapIn,
} from "prosemirror-commands";
import { closeHistory, redoDepth, undoDepth } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Node as PMNode } from "prosemirror-model";
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from "prosemirror-schema-list";
import {
  type Command,
  type EditorState,
  NodeSelection,
  type Transaction,
} from "prosemirror-state";
import {
  addColumnAfter,
  addRowAfter,
  deleteColumn,
  deleteRow,
  goToNextCell,
  mergeCells,
  splitCell,
  tableEditing,
} from "prosemirror-tables";
import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
} from "prosemirror-view";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WysCanonicalAcknowledgement } from "@/adapters/wys/canonicalMedia";
import { fragmentHtml, type Plan, schema } from "@/adapters/wys/model";
import { type WysAdmission, WysSession } from "@/adapters/wys/session";
import { preserveBlockType } from "@/adapters/wys/transaction";
import { isMediaUrl, type MediaScope, safeParentLink } from "./editorMedia";
import { NoteContent } from "./NoteContent";
import "./wys-editor.css";

export type WysEditorProps = {
  plan: Plan;
  html: string;
  acknowledgement?: WysCanonicalAcknowledgement | undefined;
  disabled: boolean;
  scope: MediaScope;
  displayStyle?: DisplayStyle | undefined;
  onChange: (html: string) => void;
  onCompositionChange: (active: boolean) => void;
  onFiles: (files: File[]) => void;
  onNotice: (message: string) => void;
  onReprepare: (html: string) => void;
  onRecover: (html: string) => boolean;
  registerMediaInsertion?:
    | ((
        handler:
          | ((input: {
              src: string;
              kind: "image" | "video";
              alt: string;
            }) => boolean)
          | null,
      ) => void)
    | undefined;
};

export function applyWysAdmission(
  session: WysSession,
  result: WysAdmission,
  callbacks: {
    updateState: (state: EditorState) => void;
    onChange: (html: string) => void;
    onNotice: (message: string) => void;
  },
): void {
  callbacks.updateState(session.state);
  if (result.kind === "rejected") callbacks.onNotice(result.reason);
  else if (result.bodyChanged) callbacks.onChange(result.html);
}

export function opaqueBoundarySelection(
  state: EditorState,
  key: string,
): NodeSelection | null {
  if (!state.selection.empty || (key !== "Backspace" && key !== "Delete"))
    return null;
  const back = key === "Backspace";
  const { $from } = state.selection;
  const opaque = (node: PMNode | null): node is PMNode =>
    node?.type.name === "opaqueInline" || node?.type.name === "opaqueBlock";
  const direct = back ? $from.nodeBefore : $from.nodeAfter;
  if (opaque(direct))
    return NodeSelection.create(
      state.doc,
      back ? $from.pos - direct.nodeSize : $from.pos,
    );
  if (
    back
      ? $from.parentOffset !== 0
      : $from.parentOffset !== $from.parent.content.size
  )
    return null;
  for (let depth = $from.depth; depth > 0; depth--) {
    const edge = back ? $from.before(depth) : $from.after(depth);
    const resolved = state.doc.resolve(edge);
    const adjacent = back ? resolved.nodeBefore : resolved.nodeAfter;
    if (opaque(adjacent))
      return NodeSelection.create(
        state.doc,
        back ? edge - adjacent.nodeSize : edge,
      );
    if (adjacent) break;
  }
  return null;
}

export function mediaPresentation(
  node: PMNode,
  scope: MediaScope,
):
  | { kind: "image" | "video"; src: string; alt: string }
  | { kind: "unavailable" } {
  const kind = node.type.name;
  const src: unknown = node.attrs.src;
  if (
    (kind !== "image" && kind !== "video") ||
    typeof src !== "string" ||
    !isMediaUrl(src, scope)
  )
    return { kind: "unavailable" };
  return {
    kind,
    src,
    alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
  };
}

export function insertWysMedia(
  session: WysSession,
  input: { src: string; kind: "image" | "video"; alt: string },
  scope: MediaScope,
): WysAdmission {
  if (!isMediaUrl(input.src, scope))
    return {
      kind: "rejected",
      epoch: false,
      reason: "メディアの所属を確認できません。元の本文を保持しています。",
    };
  const type = input.kind === "image" ? schema.nodes.image : schema.nodes.video;
  return session.admit(
    closeHistory(
      session.state.tr
        .replaceSelectionWith(type.create({ src: input.src, alt: input.alt }))
        .scrollIntoView(),
    ),
  );
}

export function admitWysCommand(
  session: WysSession,
  command: Command,
  accept: (result: WysAdmission) => void,
  view?: EditorView,
): boolean {
  return command(
    session.state,
    (transaction) => accept(session.admit(closeHistory(transaction))),
    view,
  );
}

export function wysLinkRange(state: EditorState): { from: number; to: number } {
  const { from, to, $from } = state.selection;
  if (from !== to) return { from, to };
  const mark = $from.marks().find((item) => item.type === schema.marks.link);
  if (!mark) return { from, to };
  const spans: { from: number; to: number; linked: boolean }[] = [];
  $from.parent.forEach((child, offset) => {
    spans.push({
      from: $from.start() + offset,
      to: $from.start() + offset + child.nodeSize,
      linked: child.marks.some((item) => item.eq(mark)),
    });
  });
  const index = spans.findIndex(
    (span) => span.linked && span.from <= from && span.to >= from,
  );
  if (index < 0) return { from, to };
  let first = index;
  let last = index;
  while (first > 0 && spans[first - 1]?.linked) first--;
  while (last + 1 < spans.length && spans[last + 1]?.linked) last++;
  return { from: spans[first]?.from ?? from, to: spans[last]?.to ?? to };
}

type Runtime = { plan: Plan; session: WysSession; view: EditorView };
const composingMessage =
  "文字変換中です。確定するまで編集画面と入力を保持します。";

export function WysEditor(props: WysEditorProps) {
  const latest = useRef(props);
  latest.current = props;
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const composition = useRef(false);
  const compositionFrame = useRef<number | undefined>(undefined);
  const mountTicket = useRef(0);
  const mountLatest = useRef<() => void>(() => {});
  const mounted = useRef(false);
  const notifiedHtml = useRef<string | null>(null);
  const blockedExternal = useRef(false);
  const [ready, setReady] = useState(false);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    plan: Plan;
    id: string;
    html: string;
  } | null>(null);
  const [toolbar, setToolbar] = useState({ undo: 0, redo: 0, selected: "" });
  const [href, setHref] = useState("");
  const [alt, setAlt] = useState("");
  const [epochWarning, setEpochWarning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const createViews = useRef(nodeViews);
  const mediaInsertion = useRef<
    | ((input: {
        src: string;
        kind: "image" | "video";
        alt: string;
      }) => boolean)
    | null
  >(null);

  const notice = useCallback((value: string) => {
    setMessage(value);
    latest.current.onNotice(value);
  }, []);
  const allowed = useCallback(() => {
    const current = runtime.current;
    if (!current || latest.current.disabled) return false;
    if (composition.current || current.view.composing) {
      notice(composingMessage);
      return false;
    }
    if (blockedExternal.current) {
      notice("最新本文の再準備を待っています。現在の入力は保持しています。");
      return false;
    }
    return true;
  }, [notice]);
  const updateToolbar = useCallback((current: Runtime) => {
    const selection = current.session.state.selection;
    const activeLink = selection.$from
      .marks()
      .find((mark) => mark.type === schema.marks.link);
    setHref(
      typeof activeLink?.attrs.href === "string" ? activeLink.attrs.href : "",
    );
    setToolbar({
      undo: undoDepth(current.session.state),
      redo: redoDepth(current.session.state),
      selected:
        selection instanceof NodeSelection ? selection.node.type.name : "",
    });
    if (
      selection instanceof NodeSelection &&
      ["image", "video"].includes(selection.node.type.name)
    )
      setAlt(
        typeof selection.node.attrs.alt === "string"
          ? selection.node.attrs.alt
          : "",
      );
  }, []);
  const accept = useCallback(
    (current: Runtime, result: WysAdmission) => {
      if (result.kind === "rejected" && result.epoch) setEpochWarning(true);
      applyWysAdmission(current.session, result, {
        updateState: (state) => current.view.updateState(state),
        onChange: (html) => latest.current.onChange(html),
        onNotice: notice,
      });
      updateToolbar(current);
      const selection = current.session.state.selection;
      const selectedId =
        selection instanceof NodeSelection
          ? String(selection.node.attrs.id)
          : null;
      setPreview((previous) =>
        previous?.plan === current.plan && previous.id === selectedId
          ? previous
          : null,
      );
    },
    [notice, updateToolbar],
  );
  const history = useCallback(
    (direction: "undo" | "redo") => {
      if (!allowed()) return;
      const current = runtime.current;
      if (!current) return;
      if (
        !current.session.history(direction, (result) => accept(current, result))
      )
        notice(
          direction === "undo"
            ? "取り消せる操作がありません。"
            : "やり直せる操作がありません。",
        );
      current.view.focus();
    },
    [allowed, accept, notice],
  );
  const run = (command: Command) => {
    if (!allowed()) return;
    const current = runtime.current;
    if (!current) return;
    if (
      !admitWysCommand(
        current.session,
        command,
        (result) => accept(current, result),
        current.view,
      )
    )
      notice(
        "現在の選択には適用できません。文字や表のセルを選択してください。",
      );
    current.view.focus();
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      mountTicket.current++;
      if (compositionFrame.current !== undefined)
        cancelAnimationFrame(compositionFrame.current);
      runtime.current?.view.destroy();
      runtime.current = null;
      mediaInsertion.current = null;
      if (composition.current) latest.current.onCompositionChange(false);
    };
  }, []);

  useEffect(() => {
    props.registerMediaInsertion?.(mediaInsertion.current);
    return () => props.registerMediaInsertion?.(null);
  }, [props.registerMediaInsertion]);

  useEffect(() => {
    const desiredPlan = props.plan;
    const mount = () => {
      if (composition.current || runtime.current?.view.composing) return;
      const nextPlan = desiredPlan;
      if (runtime.current?.plan === nextPlan) return;
      const ticket = ++mountTicket.current;
      void import("prosemirror-view")
        .then(({ EditorView }) => {
          if (
            !mounted.current ||
            ticket !== mountTicket.current ||
            nextPlan !== latest.current.plan ||
            !host.current
          )
            return;
          if (composition.current || runtime.current?.view.composing) return;
          if (latest.current.html !== nextPlan.source) {
            blockedExternal.current = true;
            runtime.current?.view.setProps({ editable: () => false });
            if (notifiedHtml.current !== latest.current.html) {
              notifiedHtml.current = latest.current.html;
              latest.current.onReprepare(latest.current.html);
            }
            return;
          }
          runtime.current?.view.destroy();
          blockedExternal.current = false;
          host.current.replaceChildren();
          const historyKey =
            (direction: "undo" | "redo"): Command =>
            () => {
              history(direction);
              return true;
            };
          const session = new WysSession(nextPlan, [
            keymap({
              "Mod-z": historyKey("undo"),
              "Mod-y": historyKey("redo"),
              "Shift-Mod-z": historyKey("redo"),
              "Mod-b": toggleMark(schema.marks.strong),
              "Mod-i": toggleMark(schema.marks.em),
              "Mod-u": toggleMark(schema.marks.underline),
              Enter: chainCommands(
                splitListItem(schema.nodes.list_item),
                baseKeymap.Enter,
              ),
              Tab: chainCommands(
                goToNextCell(1),
                sinkListItem(schema.nodes.list_item),
              ),
              "Shift-Tab": chainCommands(
                goToNextCell(-1),
                liftListItem(schema.nodes.list_item),
              ),
            }),
            keymap(baseKeymap),
            tableEditing(),
          ]);
          const view = new EditorView(host.current, {
            state: session.state,
            attributes: {
              role: "textbox",
              "aria-label": "WYSIWYG 本文",
              "aria-multiline": "true",
              spellcheck: "true",
            },
            editable: () =>
              !latest.current.disabled &&
              (!blockedExternal.current || composition.current),
            nodeViews: createViews.current(latest.current.scope),
            dispatchTransaction(transaction: Transaction) {
              const current = runtime.current;
              if (!current || current.view !== view) return;
              if (
                (latest.current.disabled ||
                  (blockedExternal.current && !composition.current)) &&
                transaction.docChanged
              ) {
                view.updateState(session.state);
                notice("現在は本文を変更できません。入力を保持しています。");
                return;
              }
              accept(current, session.admit(transaction));
            },
            handleKeyDown(v, event) {
              if (composition.current || v.composing || event.isComposing)
                return false;
              const selection = opaqueBoundarySelection(v.state, event.key);
              if (!selection) return false;
              v.dispatch(v.state.tr.setSelection(selection));
              notice(
                "保持内容を選択しました。削除する場合はもう一度削除してください。",
              );
              return true;
            },
            handleDOMEvents: {
              compositionstart() {
                if (compositionFrame.current !== undefined)
                  cancelAnimationFrame(compositionFrame.current);
                composition.current = true;
                setComposing(true);
                latest.current.onCompositionChange(true);
                return false;
              },
              compositionend(v) {
                const finish = () => {
                  if (!mounted.current || runtime.current?.view !== v) return;
                  if (v.composing) {
                    compositionFrame.current = requestAnimationFrame(finish);
                    return;
                  }
                  composition.current = false;
                  v.setProps({
                    editable: () =>
                      !latest.current.disabled && !blockedExternal.current,
                  });
                  setComposing(false);
                  latest.current.onCompositionChange(false);
                  mountLatest.current();
                };
                compositionFrame.current = requestAnimationFrame(finish);
                return false;
              },
              paste(v, event) {
                event.preventDefault();
                if (!allowed()) return true;
                const clipboard = event.clipboardData;
                if (clipboard?.files.length) {
                  latest.current.onFiles(Array.from(clipboard.files));
                  return true;
                }
                if (
                  !clipboard ||
                  !Array.from(clipboard.types).includes("text/plain")
                ) {
                  notice(
                    "HTML だけの貼り付けはできません。プレーンテキストかファイルを選んでください。",
                  );
                  return true;
                }
                const text = clipboard
                  .getData("text/plain")
                  .replace(/\r\n?/g, "\n");
                if (text) {
                  v.dispatch(closeHistory(session.state.tr.insertText(text)));
                }
                return true;
              },
              drop(_view, event) {
                event.preventDefault();
                if (!allowed()) return true;
                const files = Array.from(event.dataTransfer?.files ?? []);
                if (files.length) latest.current.onFiles(files);
                else
                  notice(
                    "要素のドラッグは反映しません。文字はコピーして貼り付け、画像・動画はファイルを選んでください。",
                  );
                return true;
              },
            },
          });
          runtime.current = { plan: nextPlan, session, view };
          mediaInsertion.current = (input) => {
            if (!allowed()) return false;
            const current = runtime.current;
            if (!current || current.view !== view) return false;
            const result = insertWysMedia(
              current.session,
              input,
              latest.current.scope,
            );
            accept(current, result);
            return result.kind === "accepted" && result.bodyChanged;
          };
          latest.current.registerMediaInsertion?.(mediaInsertion.current);
          notifiedHtml.current = null;
          setPreview(null);
          setEpochWarning(false);
          setReady(true);
          updateToolbar(runtime.current);
        })
        .catch((error: unknown) => {
          if (mounted.current && ticket === mountTicket.current)
            notice(
              error instanceof Error
                ? error.message
                : "編集画面を開始できません。HTMLは保持しています。",
            );
        });
    };
    mountLatest.current = mount;
    mount();
  }, [props.plan, accept, history, allowed, updateToolbar, notice]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) {
      mountLatest.current();
      return;
    }
    if (current.plan !== props.plan) return;
    if (props.acknowledgement?.canonical === props.html)
      current.session.acknowledge(props.acknowledgement);
    if (props.html === current.session.html) {
      notifiedHtml.current = null;
      blockedExternal.current = false;
      current.view.setProps({ editable: () => !latest.current.disabled });
      return;
    }
    if (notifiedHtml.current === props.html) return;
    notifiedHtml.current = props.html;
    blockedExternal.current = true;
    current.view.setProps({
      editable: () => !latest.current.disabled && composition.current,
    });
    notice(
      current.session.acknowledgementNotice ||
        "本文の外部更新を確認しています。現在の入力を自動で置き換えず、再準備を待ちます。",
    );
    latest.current.onReprepare(props.html);
  }, [props.html, props.plan, props.acknowledgement, notice]);
  useEffect(() => {
    const disabled = props.disabled;
    runtime.current?.view.setProps({
      editable: () =>
        !disabled && (!blockedExternal.current || composition.current),
    });
  }, [props.disabled]);
  useEffect(() => {
    runtime.current?.view.setProps({
      nodeViews: createViews.current({
        noteId: props.scope.noteId,
        draftId: props.scope.draftId,
      }),
    });
  }, [props.scope.noteId, props.scope.draftId]);

  function nodeViews(scope: MediaScope): Record<string, NodeViewConstructor> {
    const media: NodeViewConstructor = (initial, view, getPos) => {
      const dom = document.createElement("span");
      dom.className = "wys-media";
      dom.contentEditable = "false";
      const select = document.createElement("button");
      select.type = "button";
      select.textContent =
        initial.type.name === "image" ? "画像を選択" : "動画を選択";
      select.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos === "number") {
          view.dispatch(
            view.state.tr.setSelection(
              NodeSelection.create(view.state.doc, pos),
            ),
          );
          view.focus();
        }
      });
      let element: HTMLElement | null = null;
      let previous = "";
      const update = (node: PMNode) => {
        if (node.type !== initial.type) return false;
        const spec = mediaPresentation(node, scope);
        const identity = JSON.stringify(spec);
        if (identity === previous) return true;
        previous = identity;
        if (element instanceof HTMLVideoElement) {
          element.pause();
          element.removeAttribute("src");
        }
        if (spec.kind === "image") {
          const img = document.createElement("img");
          img.alt = spec.alt;
          img.loading = "lazy";
          img.referrerPolicy = "no-referrer";
          img.src = spec.src;
          element = img;
        } else if (spec.kind === "video") {
          const video = document.createElement("video");
          video.controls = true;
          video.preload = "metadata";
          video.setAttribute("aria-label", spec.alt || "動画");
          video.src = spec.src;
          element = video;
        } else {
          element = document.createElement("span");
          element.textContent =
            "このメディアは本文プレビューで確認してください。";
        }
        dom.replaceChildren(element, select);
        return true;
      };
      update(initial);
      return {
        dom,
        update,
        selectNode: () => dom.classList.add("ProseMirror-selectednode"),
        deselectNode: () => dom.classList.remove("ProseMirror-selectednode"),
        stopEvent: () => true,
        ignoreMutation: () => true,
        destroy() {
          if (element instanceof HTMLVideoElement) {
            element.pause();
            element.removeAttribute("src");
          }
        },
      } satisfies NodeView;
    };
    const opaque: NodeViewConstructor = (node, view, getPos) => {
      const dom = document.createElement(
        node.type.name === "opaqueBlock" ? "div" : "span",
      );
      dom.className = "wys-opaque";
      dom.contentEditable = "false";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "保持内容を選択";
      button.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos === "number") {
          view.dispatch(
            view.state.tr.setSelection(
              NodeSelection.create(view.state.doc, pos),
            ),
          );
          view.focus();
        }
      });
      dom.appendChild(button);
      return {
        dom,
        selectNode: () => dom.classList.add("ProseMirror-selectednode"),
        deselectNode: () => dom.classList.remove("ProseMirror-selectednode"),
        stopEvent: () => true,
        ignoreMutation: () => true,
      };
    };
    return {
      image: media,
      video: media,
      opaqueInline: opaque,
      opaqueBlock: opaque,
    };
  }

  const addTable: Command = (state, dispatch) => {
    const cell = () => schema.nodes.table_cell.createAndFill();
    const cells = [cell(), cell(), cell(), cell()];
    if (cells.some((item) => item === null)) return false;
    const rows = [
      schema.nodes.table_row.createChecked(null, cells.slice(0, 2) as PMNode[]),
      schema.nodes.table_row.createChecked(null, cells.slice(2) as PMNode[]),
    ];
    dispatch?.(
      state.tr
        .replaceSelectionWith(schema.nodes.table.createChecked(null, rows))
        .scrollIntoView(),
    );
    return true;
  };
  const link = (remove: boolean) => {
    if (!allowed()) return;
    const value = href.trim();
    if (
      !remove &&
      (value.length > 8192 ||
        !safeParentLink(value) ||
        Array.from(value).some(
          (character) =>
            character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
        ))
    ) {
      notice("http / https / mailto のURLを入力してください。");
      return;
    }
    run((state, dispatch) => {
      const { from, to } = wysLinkRange(state);
      const mark = state.selection.$from
        .marks()
        .find((item) => item.type === schema.marks.link);
      if (from === to) return false;
      const transaction = state.tr.removeMark(from, to, schema.marks.link);
      if (!remove)
        transaction.addMark(
          from,
          to,
          schema.marks.link.create({ ...mark?.attrs, href: value }),
        );
      dispatch?.(transaction);
      return true;
    });
  };
  const previewOpaque = () => {
    if (!allowed()) return;
    const current = runtime.current;
    if (!current) return;
    const selection = current.session.state.selection;
    if (!(selection instanceof NodeSelection)) return;
    const id = String(selection.node.attrs.id);
    const item = current.plan.opaque.get(id);
    if (!item) {
      notice("保持内容を選択してください。");
      return;
    }
    setPreview({
      plan: current.plan,
      id,
      html: fragmentHtml(current.plan, item),
    });
  };
  const resetHistory = () => {
    if (!allowed()) return;
    if (
      !window.confirm(
        "現在の完全な本文を退避して、取り消し・やり直し履歴をすべて消します。直前の一件だけでなく、この作業の履歴全体が対象です。続けますか？",
      )
    )
      return;
    const current = runtime.current;
    if (!current) return;
    if (
      !current.session.resetHistory((html) => {
        try {
          return latest.current.onRecover(html);
        } catch {
          return false;
        }
      })
    ) {
      notice("最新本文の退避を確認できませんでした。履歴は消していません。");
      return;
    }
    current.view.updateState(current.session.state);
    setEpochWarning(false);
    updateToolbar(current);
    notice(
      "最新本文を退避し、この作業の取り消し・やり直し履歴を整理しました。",
    );
  };
  const inactive =
    props.disabled || composing || !ready || blockedExternal.current;
  const button = (text: string, action: () => void, extraDisabled = false) => (
    <button
      key={text}
      type="button"
      disabled={inactive || extraDisabled}
      onPointerDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {text}
    </button>
  );
  return (
    <section className="wys-editor" aria-label="WYSIWYG エディタ">
      <div className="wys-toolbar" role="toolbar" aria-label="本文の書式">
        {button("元に戻す", () => history("undo"), toolbar.undo === 0)}
        {button("やり直す", () => history("redo"), toolbar.redo === 0)}
        {button("太字", () => run(toggleMark(schema.marks.strong)))}
        {button("斜体", () => run(toggleMark(schema.marks.em)))}
        {button("下線", () => run(toggleMark(schema.marks.underline)))}
        {button("段落", () => run(preserveBlockType(schema.nodes.paragraph)))}
        {[1, 2, 3].map((level) =>
          button(`見出し${level}`, () =>
            run(preserveBlockType(schema.nodes.heading, level)),
          ),
        )}
        {button("コード", () =>
          run(preserveBlockType(schema.nodes.code_block)),
        )}
        {button("箇条書き", () => run(wrapInList(schema.nodes.bullet_list)))}
        {button("番号付き", () => run(wrapInList(schema.nodes.ordered_list)))}
        {button("リスト解除", () => run(liftListItem(schema.nodes.list_item)))}
        {button("引用", () => run(wrapIn(schema.nodes.blockquote)))}
        {button("引用解除", () => run(lift))}
        {button("表を作成", () => run(addTable))}
        {button("行を追加", () => run(addRowAfter))}
        {button("行を削除", () => run(deleteRow))}
        {button("列を追加", () => run(addColumnAfter))}
        {button("列を削除", () => run(deleteColumn))}
        {button("セルを結合", () => run(mergeCells))}
        {button("結合を解除", () => run(splitCell))}
        {button("画像・動画", () => fileInput.current?.click())}
      </div>
      <input
        ref={fileInput}
        className="wys-file-input"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,video/mp4,video/webm"
        tabIndex={-1}
        aria-label="挿入する画像または動画"
        disabled={inactive}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (allowed() && files.length) latest.current.onFiles(files);
        }}
      />
      <div className="wys-fields">
        <label>
          リンクURL
          <input
            type="url"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            disabled={inactive}
            placeholder="https://example.com"
          />
        </label>
        {button("リンク設定", () => link(false))}
        {button("リンク解除", () => link(true))}
        <label>
          画像・動画の説明
          <input
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            disabled={inactive}
          />
        </label>
        {button(
          "説明を適用",
          () =>
            run((state, dispatch) => {
              const selection = state.selection;
              if (
                !(selection instanceof NodeSelection) ||
                !["image", "video"].includes(selection.node.type.name)
              )
                return false;
              dispatch?.(
                state.tr.setNodeMarkup(selection.from, undefined, {
                  ...selection.node.attrs,
                  alt,
                }),
              );
              return true;
            }),
          !["image", "video"].includes(toolbar.selected),
        )}
      </div>
      <p className="wys-hint">
        文字を選択して書式を適用できます。貼り付けはプレーンテキストのみです。画像・動画はファイルを選ぶか、ここへドロップしてください。
      </p>
      {!ready && <p role="status">編集画面を準備しています…</p>}
      <div ref={host} className="wys-host" />
      <div className="wys-toolbar" role="toolbar" aria-label="保持内容と履歴">
        {button(
          "保持内容の詳細",
          previewOpaque,
          !toolbar.selected.startsWith("opaque"),
        )}
        {button(
          "選択した要素を削除",
          () => run(deleteSelection),
          !toolbar.selected,
        )}
        {button(
          "履歴を整理",
          resetHistory,
          toolbar.undo === 0 && toolbar.redo === 0 && !epochWarning,
        )}
      </div>
      {(message || composing) && (
        <p className="hollow-message" role="status" aria-live="polite">
          {composing ? composingMessage : message}
        </p>
      )}
      {epochWarning && (
        <p className="hollow-message">
          拒否した入力はまだ反映されていません。履歴整理後に入力をやり直すか、最新本文を保持してHTMLで続けてください。
        </p>
      )}
      {preview && preview.plan === props.plan && (
        <section className="wys-preview" aria-label="選択した保持内容の詳細">
          <h3>保持内容の詳細</h3>
          <p>
            内容は保存用HTMLのまま保持しています。変更するにはHTMLモードを使ってください。
          </p>
          <button type="button" onClick={() => setPreview(null)}>
            詳細を閉じる
          </button>
          <NoteContent
            html={preview.html}
            noteId={props.scope.noteId}
            draftId={props.scope.draftId}
            displayStyle={props.displayStyle}
            title="選択した保持内容"
          />
        </section>
      )}
    </section>
  );
}

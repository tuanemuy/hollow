"use client";
import type {
  VisualProjection,
  VisualSource,
} from "@repo/core/application/ports/htmlEditor";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderNoteFn } from "@/presentation/hollowMedia";
import {
  BrowserHtmlEditor,
  HtmlEditorError,
  htmlEditorErrorMessage,
} from "./BrowserHtmlEditor";
import { frameDocument, safeParentLink } from "./editorMedia";
import { NoVisibleTextError, VisualTextHost } from "./visualTextHost";

export function VisualEditor(props: {
  html: string;
  noteId?: string | undefined;
  draftId?: string | undefined;
  displayStyle?: DisplayStyle | undefined;
  disabled: boolean;
  onChange(html: string): void;
  onUnavailable(message: string): void;
  onState(state: { busy: boolean; composing: boolean; error: boolean }): void;
}) {
  const latest = useRef(props);
  latest.current = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<VisualTextHost | undefined>(undefined);
  const worker = useRef<BrowserHtmlEditor | undefined>(undefined);
  const own = useRef(new Set<string>());
  const failure = useRef(false);
  const sourceStyle = useRef(props.displayStyle);
  const rememberHtml = (html: string) => {
    own.current.add(html);
    while (own.current.size > 4) {
      const first = own.current.values().next().value;
      if (first !== undefined) own.current.delete(first);
    }
  };
  const [content, setContent] = useState<{
    source: VisualSource;
    projection: VisualProjection;
    links: readonly { id: string; url: string; label: string }[];
  }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [empty, setEmpty] = useState<readonly string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [reset, setReset] = useState(false);
  const composing = useRef(false);
  const acknowledged = useRef(new Map<string, string>());
  const desired = useRef(new Map<string, string>());
  const syncing = useRef(false);
  const activeGeneration = useRef("");
  const state = useCallback(
    (busy: boolean, failed = false) =>
      latest.current.onState({
        busy,
        composing: composing.current,
        error: failed || failure.current,
      }),
    [],
  );
  const sync = async () => {
    if (syncing.current || !worker.current || !content) return;
    syncing.current = true;
    state(true);
    const generation = content.source.generation;
    try {
      for (;;) {
        const patches = [...desired.current].flatMap(([id, after]) => {
          const before = acknowledged.current.get(id);
          return before !== undefined && before !== after
            ? [{ id, before, after }]
            : [];
        });
        if (!patches.length) break;
        await worker.current.patch(generation, patches);
        if (activeGeneration.current !== generation) return;
        for (const patch of patches)
          acknowledged.current.set(patch.id, patch.after);
      }
      state(false);
    } catch (cause) {
      if (activeGeneration.current === generation) {
        failure.current = true;
        setError(
          `入力は退避しています。${htmlEditorErrorMessage(cause)} 再初期化して再試行してください。`,
        );
        state(false, true);
      }
    } finally {
      syncing.current = false;
    }
  };
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    if (
      controller.current &&
      (!own.current.has(props.html) ||
        sourceStyle.current !== props.displayStyle)
    ) {
      failure.current = true;
      setReset(true);
      latest.current.onState({
        busy: false,
        composing: composing.current,
        error: true,
      });
    }
  }, [props.html, props.displayStyle]);
  useEffect(() => {
    const input = latest.current;
    sourceStyle.current = input.displayStyle;
    void attempt;
    let cancelled = false;
    const abort = new AbortController();
    const analyzer = new BrowserHtmlEditor();
    worker.current = analyzer;
    state(true);
    setError("");
    const deadline = window.setTimeout(() => {
      cancelled = true;
      abort.abort();
      analyzer.dispose();
      failure.current = true;
      setError(
        "表示の認可・投影確認が10秒を超えました。入力は保持しています。再初期化してください。",
      );
      state(false, true);
    }, 10000);
    void renderNoteFn({
      data: { html: input.html, noteId: input.noteId, draftId: input.draftId },
    })
      .then(async (rendered) => {
        if (cancelled) return;
        window.clearTimeout(deadline);
        const source: VisualSource = {
          generation: crypto.randomUUID(),
          canonical: rendered.canonical,
          rendered: rendered.html,
          document: frameDocument(
            rendered.html,
            rendered.assetUrls,
            location.origin,
            rendered.externalSources,
            input.displayStyle,
          ),
        };
        const projection = await analyzer.project(source, abort.signal);
        if (cancelled) return;
        if (projection.issues.length)
          throw new HtmlEditorError(projection.issues.join(" "));
        if (!projection.texts.length) {
          latest.current.onUnavailable(
            "編集できる文字がないため HTML モードで入力を保持します。端末の既定は変更していません。",
          );
          return;
        }
        activeGeneration.current = source.generation;
        acknowledged.current = new Map(
          projection.texts.map((text) => [text.id, text.value]),
        );
        desired.current = new Map(acknowledged.current);
        own.current.add(input.html);
        setContent({ source, projection, links: rendered.links });
        if (rendered.removed.length)
          setNotice(
            `安全な表示では除去された内容があります: ${rendered.removed.join("、")}`,
          );
      })
      .catch((cause: unknown) => {
        window.clearTimeout(deadline);
        if (!cancelled) {
          failure.current = true;
          setError(htmlEditorErrorMessage(cause));
          state(false, true);
        }
      });
    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
      abort.abort();
      analyzer.dispose();
    };
  }, [attempt, state]);
  useEffect(
    () => () => {
      controller.current?.dispose();
      worker.current?.dispose();
    },
    [],
  );
  const restart = () => {
    if (composing.current) {
      setNotice("文字変換を確定してください。");
      return;
    }
    controller.current?.dispose();
    controller.current = undefined;
    activeGeneration.current = "";
    worker.current?.dispose();
    own.current.clear();
    failure.current = false;
    setContent(undefined);
    setReset(false);
    setError("");
    setAttempt((n) => n + 1);
  };
  return (
    <div className="hollow-visual-editor">
      <p className="hollow-help">
        表示中の文字をクリックして直接入力できます。文字の構造・属性・書式は変わりません。空にした文字は一覧から再選択できます。
      </p>
      {(error || reset) && (
        <div className="hollow-message" role="alert">
          <p>
            {error ||
              "保存結果の構造が変化しています。現在の入力は保持しています。最新の入力から表示を再初期化してください。"}
          </p>
          <button type="button" className="hollow-button" onClick={restart}>
            現在の入力で再初期化
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="hollow-message">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            閉じる
          </button>
        </p>
      )}
      <div className="hollow-actions">
        <button
          type="button"
          className="hollow-button"
          onClick={() => controller.current?.undo()}
        >
          文字を元に戻す
        </button>
        <button
          type="button"
          className="hollow-button"
          onClick={() => controller.current?.undo(true)}
        >
          文字をやり直す
        </button>
        <button
          type="button"
          className="hollow-button"
          onClick={() => controller.current?.close()}
        >
          文字入力を閉じる
        </button>
      </div>
      {content && (
        <details>
          <summary>編集できる文字一覧（空の文字 {empty.length} 件）</summary>
          <div className="hollow-actions">
            {content.projection.texts.map((text, index) => (
              <button
                type="button"
                className="hollow-button"
                key={text.id}
                onClick={() => controller.current?.select(text.id)}
              >
                {index + 1}:{" "}
                {empty.includes(text.id)
                  ? "空の文字"
                  : text.value.slice(0, 30) || "空の文字"}
              </button>
            ))}
          </div>
        </details>
      )}
      {content ? (
        <iframe
          key={content.source.generation}
          ref={frame}
          title="ビジュアル編集の本文"
          className="hollow-note-frame"
          sandbox="allow-same-origin"
          referrerPolicy="no-referrer"
          srcDoc={content.source.document}
          onLoad={() => {
            if (!frame.current || !host.current) return;
            try {
              controller.current?.dispose();
              controller.current = new VisualTextHost({
                frame: frame.current,
                host: host.current,
                canonical: content.source.canonical,
                projection: content.projection,
                disabled: () => latest.current.disabled || failure.current,
                notice: setNotice,
                state: (active, ids) => {
                  composing.current = active;
                  setEmpty(ids);
                  state(syncing.current);
                },
                change: (html, values) => {
                  rememberHtml(html);
                  desired.current = new Map(values);
                  latest.current.onChange(html);
                  void syncRef.current();
                },
              });
              state(false);
            } catch (cause) {
              if (cause instanceof NoVisibleTextError) {
                latest.current.onUnavailable(cause.message);
                return;
              }
              failure.current = true;
              setError(
                "表示の構造・文字の対応を確認できないため編集を停止しました。入力は保持しています。HTML モードで確認するか再初期化してください。",
              );
              state(false, true);
            }
          }}
        />
      ) : (
        <p role="status">文字の対応を確認しています…</p>
      )}
      <textarea
        ref={host}
        hidden
        disabled={props.disabled}
        aria-label="選択した表示テキスト"
        spellCheck={false}
        style={{
          zIndex: 50,
          background: "white",
          color: "black",
          border: "2px solid #555",
          padding: 8,
        }}
      />
      {content?.links.some((link) => safeParentLink(link.url)) && (
        <nav aria-label="本文中のリンク">
          <ul>
            {content.links
              .filter((link) => safeParentLink(link.url))
              .map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

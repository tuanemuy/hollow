"use client";
import type { HtmlDiagnostic } from "@repo/core/application/ports/htmlEditor";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { useEffect, useRef, useState } from "react";
import { renderNoteFn } from "@/presentation/hollowMedia";
import { BrowserHtmlEditor, htmlEditorErrorMessage } from "./BrowserHtmlEditor";
import { frameDocument, safeParentLink } from "./editorMedia";

export function HtmlDiagnostics(props: {
  html: string;
  noteId?: string | undefined;
  draftId?: string | undefined;
  displayStyle?: DisplayStyle | undefined;
  onReady(html: string, ready: boolean): void;
  onSelect(offset: number): void;
}) {
  const latest = useRef(props);
  latest.current = props;
  const [attempt, setAttempt] = useState(0);
  const sourceKey = JSON.stringify([
    props.html,
    props.noteId,
    props.draftId,
    props.displayStyle,
    attempt,
  ]);
  const [loaded, setLoaded] = useState("");
  const [acknowledged, setAcknowledged] = useState<string>();
  const [result, setResult] = useState<{
    source: string;
    key: string;
    document: string;
    diagnostics: readonly HtmlDiagnostic[];
    removed: readonly string[];
    links: readonly { id: string; url: string; label: string }[];
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    void attempt;
    let cancelled = false;
    const analyzer = new BrowserHtmlEditor();
    const abort = new AbortController();
    latest.current.onReady(props.html, false);
    setError("");
    const deadline = window.setTimeout(() => {
      cancelled = true;
      abort.abort();
      analyzer.dispose();
      latest.current.onReady(props.html, false);
      setError(
        "安全なプレビューの確認が10秒を超えました。通信を確認して再試行してください。",
      );
    }, 10000);
    const timer = window.setTimeout(() => {
      void analyzer
        .diagnose(props.html, abort.signal)
        .then(async (diagnostics) => {
          const rendered = await renderNoteFn({
            data: {
              html: props.html,
              noteId: props.noteId,
              draftId: props.draftId,
            },
          });
          if (cancelled) return;
          window.clearTimeout(deadline);
          setResult({
            source: props.html,
            key: sourceKey,
            document: frameDocument(
              rendered.html,
              rendered.assetUrls,
              location.origin,
              rendered.externalSources,
              props.displayStyle,
            ),
            diagnostics,
            removed: rendered.removed,
            links: rendered.links,
          });
        })
        .catch((cause: unknown) => {
          window.clearTimeout(deadline);
          if (!cancelled) setError(htmlEditorErrorMessage(cause));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(deadline);
      abort.abort();
      analyzer.dispose();
    };
  }, [
    props.html,
    props.noteId,
    props.draftId,
    props.displayStyle,
    attempt,
    sourceKey,
  ]);
  const current = result?.key === sourceKey ? result : undefined;
  useEffect(() => {
    latest.current.onReady(
      props.html,
      Boolean(
        current &&
          loaded === sourceKey &&
          (!current.diagnostics.length || acknowledged === props.html),
      ),
    );
  }, [current, acknowledged, props.html, loaded, sourceKey]);
  return (
    <div>
      {error && (
        <div role="alert" className="hollow-message">
          <p>
            {error} 入力・退避は保持しています。保存は解析成功まで停止します。
          </p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            HTML 解析を再試行
          </button>
        </div>
      )}
      {!current && !error && (
        <p role="status">構文と安全なプレビューを確認中…</p>
      )}
      {current?.diagnostics.length ? (
        <div role="status" className="hollow-message">
          <p>
            HTML
            構文の警告（最大100件）。ブラウザが補正した安全なプレビューを確認してください。正常な省略タグや暗黙の
            tbody は警告対象ではありません。
          </p>
          <ul>
            {current.diagnostics.map((item) => (
              <li key={`${item.offset}:${item.code}`}>
                {item.line} 行 {item.column} 列: {item.code}
                <button
                  type="button"
                  className="hollow-button"
                  onClick={() => props.onSelect(item.offset)}
                >
                  該当箇所へ
                </button>
              </li>
            ))}
          </ul>
          {acknowledged !== props.html && (
            <button
              type="button"
              className="hollow-button"
              onClick={() => setAcknowledged(props.html)}
            >
              補正結果を確認して保存を許可
            </button>
          )}
        </div>
      ) : null}
      {current?.removed.length ? (
        <div role="status" className="hollow-message">
          <p>
            構文補正とは別に、安全のため除去する要素・属性・URL・CSSがあります。
          </p>
          <ul>
            {[...new Set(current.removed)].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {current && (
        <details className="hollow-preview" open>
          <summary>補正後の安全なプレビュー</summary>
          <iframe
            key={current.document}
            title="HTML プレビュー"
            className="hollow-note-frame"
            sandbox="allow-same-origin"
            referrerPolicy="no-referrer"
            srcDoc={current.document}
            onLoad={() => setLoaded(sourceKey)}
          />
        </details>
      )}
      {current?.links.some((link) => safeParentLink(link.url)) && (
        <nav aria-label="本文中のリンク">
          <ul>
            {current.links
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

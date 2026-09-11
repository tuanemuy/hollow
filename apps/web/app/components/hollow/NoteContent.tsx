"use client";

import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { useEffect, useRef, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { renderNoteFn } from "@/presentation/hollowMedia";
import { renderRevisionFn } from "@/presentation/hollowRevisions";
import { frameDocument, safeParentLink } from "./editorMedia";

export function NoteContent({
  html = "",
  noteId,
  draftId,
  title = "ノート本文",
  displayStyle = "default",
  revisionNo,
  onStatusChange,
}: {
  html?: string;
  noteId?: string | undefined;
  draftId?: string | undefined;
  title?: string;
  displayStyle?: DisplayStyle | undefined;
  revisionNo?: number;
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const headingSequence = useRef(0);
  const [headingPage, setHeadingPage] = useState(100);
  const [headings, setHeadings] = useState<{
    source: string;
    document: Document;
    items: readonly {
      key: number;
      element: HTMLElement;
      label: string;
      level: number;
    }[];
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const source = JSON.stringify([
    html,
    noteId,
    draftId,
    attempt,
    displayStyle,
    revisionNo,
    title,
  ]);
  const [error, setError] = useState<{
    source: string;
    message: string;
  } | null>(null);
  const [content, setContent] = useState<{
    source: string;
    document: string;
    links: readonly { id: string; url: string; label: string }[];
    removed: readonly string[];
    title: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setError(null);
    onStatusChange?.("loading");
    const timeout = window.setTimeout(() => {
      const request =
        revisionNo === undefined
          ? renderNoteFn({ data: { html, noteId, draftId } }).then(
              (result) => ({ ...result, title, displayStyle }),
            )
          : noteId
            ? renderRevisionFn({ data: { noteId, revisionNo } })
            : Promise.reject(new Error("履歴のノートを指定してください。"));
      void request
        .then((result) => {
          if (!cancelled) {
            setContent({
              source,
              document: frameDocument(
                result.html,
                result.assetUrls,
                window.location.origin,
                result.externalSources,
                result.displayStyle,
              ),
              links: result.links,
              removed: result.removed,
              title: result.title,
            });
            onStatusChange?.("ready");
          }
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            setError({ source, message: displayError(cause) });
            onStatusChange?.("error");
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    html,
    noteId,
    draftId,
    source,
    displayStyle,
    revisionNo,
    title,
    onStatusChange,
  ]);
  if (error?.source === source)
    return (
      <div className="hollow-message" role="alert">
        <p>本文を表示できませんでした。{error.message}</p>
        <button
          type="button"
          className="hollow-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          再試行
        </button>
      </div>
    );
  // Two srcdoc navigations during mount can leave Chromium's frame blank.
  // Mount only the sanitized document, never a temporary empty document.
  if (content === null || content.source !== source)
    return (
      <div className="hollow-note-frame" role="status">
        本文を読み込み中…
      </div>
    );
  return (
    <div>
      {headings?.source === source && headings.items.length > 0 && (
        <details className="hollow-original">
          <summary>見出し一覧（{headings.items.length}件）</summary>
          <nav aria-label="本文の見出し">
            <ol>
              {headings.items.slice(0, headingPage).map((heading) => (
                <li key={heading.key}>
                  <button
                    type="button"
                    className="hollow-button"
                    aria-label={`レベル${heading.level} ${heading.label}`}
                    onClick={() => {
                      if (
                        frame.current?.contentDocument !== headings.document ||
                        !heading.element.isConnected
                      )
                        return;
                      heading.element.scrollIntoView({ block: "start" });
                    }}
                  >
                    {heading.label}
                  </button>
                </li>
              ))}
            </ol>
            {headingPage < headings.items.length && (
              <button
                type="button"
                className="hollow-button"
                onClick={() => setHeadingPage((value) => value + 100)}
              >
                次の見出しを表示
              </button>
            )}
          </nav>
        </details>
      )}
      <iframe
        ref={frame}
        key={content.document}
        className="hollow-note-frame"
        title={content.title}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={content.document}
        onLoad={(event) => {
          const document = event.currentTarget.contentDocument;
          if (
            !document?.body ||
            frame.current !== event.currentTarget ||
            content.source !== source
          )
            return;
          const items = [
            ...document.body.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"),
          ].flatMap((element) => {
            const style = document.defaultView?.getComputedStyle(element);
            if (
              !element.getClientRects().length ||
              style?.visibility === "hidden" ||
              style?.visibility === "collapse"
            )
              return [];
            const label = [...element.innerText.trim()].slice(0, 200).join("");
            return label
              ? [
                  {
                    key: ++headingSequence.current,
                    element,
                    label,
                    level: Number(element.tagName.slice(1)),
                  },
                ]
              : [];
          });
          setHeadingPage(100);
          setHeadings({ source, document, items });
        }}
      />
      {content.links.length > 0 && (
        <nav aria-label="本文中のリンク">
          <p className="hollow-muted">本文中のリンク（別のタブで開きます）</p>
          <ul>
            {content.links
              .filter((link) => safeParentLink(link.url))
              .map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label || link.url}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      )}
      {content.removed.length > 0 && (
        <details className="hollow-message">
          <summary>安全のため表示しない内容があります</summary>
          <ul>
            {[...new Set(content.removed)].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

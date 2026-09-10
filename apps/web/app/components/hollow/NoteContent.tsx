"use client";

import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { useEffect, useState } from "react";
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
      <iframe
        key={content.document}
        className="hollow-note-frame"
        title={content.title}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={content.document}
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

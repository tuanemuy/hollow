"use client";

import type { BrowseNote } from "@repo/core/application/browse/ports";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { browseIdentity, searchProblem } from "@/presentation/browseInput";
import { browseNotesFn } from "@/presentation/browseServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { type PaletteSession, useBrowseContext } from "./BrowseContext";
import { browseAccessLost, browseErrorMessage } from "./BrowseError";
import { changeBrowse } from "./model";
import { matchesBrowseLocation } from "./requestState";
import { HighlightedText } from "./TextPreview";

type Candidates = {
  key: string;
  items: readonly BrowseNote[];
  total: number;
  loading: boolean;
  error: string;
  accessLost: boolean;
};
export function SearchPalette({
  session,
  scopeName,
  onClose,
}: {
  session: PaletteSession;
  scopeName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { rejectAccess } = useBrowseContext();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const listId = useId();
  const helpId = useId();
  const [draft, setDraft] = useState(session.conditions.query);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(-1);
  const [navigationError, setNavigationError] = useState("");
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const generation = useRef(0);
  const query = draft.trim();
  const problem = searchProblem(draft);
  const ready = !!query && !problem;
  const key = JSON.stringify([
    browseIdentity(session.conditions),
    query,
    attempt,
  ]);
  const current = useRef(key);
  current.current = key;
  const result = candidates?.key === key ? candidates : null;
  const items = result?.items ?? [];
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    input.current?.focus();
    return () => {
      generation.current++;
      node?.close();
    };
  }, []);
  useEffect(() => {
    const ticket = ++generation.current;
    setActive(-1);
    setNavigationError("");
    if (!ready) {
      setCandidates(null);
      return;
    }
    setCandidates({
      key,
      items: [],
      total: 0,
      loading: true,
      error: "",
      accessLost: false,
    });
    const timer = setTimeout(() => {
      const conditions = changeBrowse(session.conditions, {
        query,
        layout: "list",
        sort: "relevance",
      });
      const valid = () =>
        ticket === generation.current && current.current === key;
      void browseNotesFn({ data: conditions })
        .then((page) => {
          if (!valid()) return;
          if (
            page.scope.workspaceId !== session.scope.workspaceId ||
            browseIdentity({ ...page.conditions, cursor: undefined }) !==
              browseIdentity(conditions)
          )
            throw new Error("Search scope mismatch");
          setCandidates({
            key,
            items: page.items,
            total: page.total,
            loading: false,
            error: "",
            accessLost: false,
          });
        })
        .catch((cause) => {
          if (!valid()) return;
          const accessLost = browseAccessLost(cause);
          setCandidates({
            key,
            items: [],
            total: 0,
            loading: false,
            error: browseErrorMessage(cause),
            accessLost,
          });
          if (accessLost) {
            rejectAccess(cause);
            void router.invalidate();
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [key, query, ready, session, router, rejectAccess]);
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);
  const openNote = (id: string) => {
    setNavigationError("");
    const ticket = generation.current;
    void router
      .navigate({ to: "/notes/$noteId", params: { noteId: id } })
      .then(() => {
        if (
          ticket === generation.current &&
          router.state.location.pathname.replace(/\/$/, "") === `/notes/${id}`
        )
          close();
      })
      .catch((cause) => {
        if (ticket === generation.current && current.current === key)
          setNavigationError(displayError(cause));
      });
  };
  const apply = () => {
    if (!ready || result?.accessLost) return;
    setNavigationError("");
    const ticket = generation.current;
    const conditions = changeBrowse(session.conditions, {
      query,
      sort: "relevance",
    });
    void router
      .navigate({
        to: "/notes",
        search: conditions,
      })
      .then(() => {
        if (
          ticket === generation.current &&
          /^\/notes\/?$/.test(router.state.location.pathname) &&
          matchesBrowseLocation(conditions, router.state.location.search)
        )
          close();
      })
      .catch((cause) => {
        if (ticket === generation.current && current.current === key)
          setNavigationError(displayError(cause));
      });
  };
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="browse-palette"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="browse-palette-heading">
        <h2 id={titleId}>ノートを探す</h2>
        <button type="button" onClick={close} aria-label="検索を閉じる">
          閉じる <kbd>Esc</kbd>
        </button>
      </div>
      <div className="browse-palette-input">
        <span className="browse-fixed-scope" title={scopeName}>
          {scopeName}
        </span>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="ノートの検索語"
          aria-autocomplete="list"
          aria-expanded={ready && !result?.error}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 && items[active] ? `${listId}-${active}` : undefined
          }
          aria-describedby={helpId}
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (items.length)
                setActive((previous) =>
                  event.key === "ArrowDown"
                    ? (previous + 1) % items.length
                    : previous <= 0
                      ? items.length - 1
                      : previous - 1,
                );
            } else if (event.key === "Enter") {
              event.preventDefault();
              const note = items[active];
              if (note) openNote(note.id);
              else apply();
            }
          }}
        />
      </div>
      <p id={helpId} className="browse-palette-help">
        2〜200文字・16語以内。日本語は部分一致、英数字は語頭一致。↑↓で候補選択、Enterで開く。候補リンクの⌘/Ctrlクリックで別タブ。Escで取り消します。
      </p>
      {(session.conditions.tags.length > 0 || session.conditions.month) && (
        <p className="browse-palette-help">
          一覧のタグ{session.conditions.tags.length}件
          {session.conditions.month ? `・${session.conditions.month}` : ""}
          で絞り込み中。
        </p>
      )}
      <div className="browse-palette-actions">
        <button
          type="button"
          className="hollow-button hollow-primary"
          disabled={!ready || result?.accessLost}
          onClick={apply}
        >
          検索語を一覧の条件に適用
        </button>
      </div>
      {!query && (
        <p role="status">
          キーワードを入力すると、この文脈の候補が表示されます。
        </p>
      )}
      {problem && <p role="status">{problem}</p>}
      {ready && (!result || result.loading) && <p role="status">検索中…</p>}
      {result?.error && (
        <div role="alert">
          <p>{result.error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            再試行
          </button>
        </div>
      )}
      {navigationError && <p role="alert">{navigationError}</p>}
      <div
        className="browse-candidates"
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label="ノート候補"
      >
        {items.map((note, index) => (
          <div
            key={note.id}
            id={`${listId}-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={active === index}
          >
            <Link
              to="/notes/$noteId"
              params={{ noteId: note.id }}
              onFocus={() => setActive(index)}
              onClick={(event) => {
                if (
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey &&
                  event.button === 0
                ) {
                  event.preventDefault();
                  openNote(note.id);
                }
              }}
            >
              <h3>
                <HighlightedText parts={note.titleParts} />
              </h3>
              <p>
                <HighlightedText parts={note.excerpt} excerpt />
              </p>
            </Link>
          </div>
        ))}
      </div>
      {ready && result && !result.loading && !result.error && !items.length && (
        <div className="browse-palette-empty">
          <p>この文脈に一致するノートはありません。</p>
          <p>
            タグ・月を解除して探すには、検索語を一覧に適用して条件を解除してください。他のワークスペースは上部で文脈を切り替えます。
          </p>
        </div>
      )}
      {!!items.length && (
        <p className="browse-palette-help">
          {result?.total}件中、先頭{items.length}
          件の候補。すべての結果は一覧への適用で確認できます。
        </p>
      )}
    </dialog>
  );
}

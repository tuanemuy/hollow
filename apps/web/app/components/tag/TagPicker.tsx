"use client";

import type { TagReadPage } from "@repo/core/application/tag/ports";
import { useEffect, useId, useRef, useState } from "react";
import { browseErrorMessage } from "@/components/browse/BrowseError";
import { readTagsFn } from "@/presentation/tagServerFn";
import { tagAccessLost } from "./errors";
import { type TagChoice, type TagValue, tagScope, validTagName } from "./model";
import { TagDialog } from "./TagDialog";

export function TagPicker({
  noteId,
  title,
  workspaceId,
  tags,
  pending,
  error,
  onChange,
  onClose,
  onAccessLost,
  onRefresh,
}: {
  noteId: string;
  title: string;
  workspaceId: string | null;
  tags: readonly TagValue[];
  pending: boolean;
  error: string;
  onChange: (choice: TagChoice) => void;
  onClose: () => void;
  onAccessLost: (error: unknown) => void;
  onRefresh: (tags: readonly TagValue[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<TagReadPage | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [continued, setContinued] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const loadingTicket = useRef<symbol | null>(null);
  const callbacks = useRef({ onAccessLost, onRefresh });
  callbacks.current = { onAccessLost, onRefresh };
  const queryId = useId();
  const normalizedQuery = query.trim();
  const queryValid = [...query].length <= 200;
  // biome-ignore lint/correctness/useExhaustiveDependencies: An explicit retry starts a new read with unchanged query conditions.
  useEffect(() => {
    const ticket = ++generation.current;
    loadingTicket.current = null;
    setPage(null);
    setContinued(false);
    setLoadError("");
    if (pending) {
      setLoading(false);
      return;
    }
    if (!queryValid) {
      setLoading(false);
      setLoadError("検索は200文字以内にしてください。");
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      void readTagsFn({
        data: {
          purpose: "picker",
          noteId,
          query: normalizedQuery,
          ...tagScope(workspaceId),
        },
      })
        .then((result) => {
          if (ticket !== generation.current) return;
          if (
            result.kind !== "page" ||
            result.purpose !== "picker" ||
            result.scope.workspaceId !== workspaceId
          )
            throw new Error("Tag picker response mismatch");
          setPage(result);
          callbacks.current.onRefresh(result.selected);
        })
        .catch((cause: unknown) => {
          if (ticket !== generation.current) return;
          setLoadError(browseErrorMessage(cause));
          if (tagAccessLost(cause)) callbacks.current.onAccessLost(cause);
        })
        .finally(() => {
          if (ticket === generation.current) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [noteId, workspaceId, normalizedQuery, queryValid, attempt, pending]);
  const more = async () => {
    if (!page?.nextCursor || loading || loadingTicket.current || pending)
      return;
    const token = Symbol("tags-page");
    loadingTicket.current = token;
    const ticket = generation.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await readTagsFn({
        data: {
          purpose: "picker",
          noteId,
          query: normalizedQuery,
          cursor: page.nextCursor,
          ...tagScope(workspaceId),
        },
      });
      if (ticket !== generation.current) return;
      if (
        next.kind !== "page" ||
        next.purpose !== "picker" ||
        next.scope.workspaceId !== workspaceId ||
        next.identity !== page.identity
      )
        throw new Error("Tag picker page mismatch");
      setPage(next);
      setContinued(true);
      callbacks.current.onRefresh(next.selected);
    } catch (cause) {
      if (ticket !== generation.current) return;
      setLoadError(browseErrorMessage(cause));
      if (tagAccessLost(cause)) callbacks.current.onAccessLost(cause);
    } finally {
      if (ticket === generation.current && loadingTicket.current === token) {
        loadingTicket.current = null;
        setLoading(false);
      }
    }
  };
  const selected = new Set(tags.map((tag) => tag.id));
  const full = tags.length >= 50;
  return (
    <TagDialog title="タグを追加・解除" onClose={onClose} pending={pending}>
      <p className="tag-note-title">{title}</p>
      <p className="hollow-help">
        {page?.scope.name ?? "現在のスペース"} · {tags.length}/50個
      </p>
      <ul className="tag-chips" aria-label="付いているタグ">
        {tags.map((tag) => (
          <li key={tag.id}>
            <span>{tag.name}</span>
            <button
              type="button"
              disabled={pending || tag.id.startsWith("pending:")}
              aria-label={`タグ「${tag.name}」を外す`}
              onClick={() =>
                onChange({ change: { kind: "detach", tagId: tag.id }, tag })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {full && (
        <p role="status">
          50個まで付いています。追加する前にタグを外してください。
        </p>
      )}
      <label htmlFor={queryId}>タグを検索・作成</label>
      <input
        id={queryId}
        value={query}
        maxLength={800}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          if (next.trim() !== normalizedQuery) {
            generation.current++;
            setPage(null);
            setLoadError("");
            setLoading(true);
          }
          setQuery(next);
        }}
        placeholder="タグ名"
      />
      {loading && <p role="status">候補を読み込んでいます…</p>}
      {loadError && (
        <p role="alert">
          {loadError}{" "}
          <button
            type="button"
            disabled={loading}
            onClick={() => setAttempt((n) => n + 1)}
          >
            先頭から再試行
          </button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {page && !loadError && (
        <>
          <ul className="tag-candidates" aria-label="既存のタグ候補">
            {page.items.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  disabled={pending || selected.has(tag.id) || full}
                  aria-pressed={selected.has(tag.id)}
                  onClick={() =>
                    onChange({ change: { kind: "attach", tagId: tag.id }, tag })
                  }
                >
                  <span>{tag.name}</span>
                  <span>
                    {selected.has(tag.id) ? "選択済み" : `${tag.active}件`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!page.items.length && <p>候補はありません。</p>}
          {page.exact &&
            !page.items.some((tag) => tag.id === page.exact?.id) && (
              <button
                type="button"
                disabled={pending || full || selected.has(page.exact.id)}
                onClick={() => {
                  if (page.exact)
                    onChange({
                      change: { kind: "attach", tagId: page.exact.id },
                      tag: page.exact,
                    });
                }}
              >
                「{page.exact.name}」
                {selected.has(page.exact.id) ? "は選択済み" : "を付ける"}
              </button>
            )}
          {normalizedQuery && !page.exact && (
            <button
              className="hollow-button"
              type="button"
              disabled={pending || full || !validTagName(query)}
              onClick={() =>
                onChange({
                  change: { kind: "create", name: normalizedQuery },
                  tag: { id: `pending:${noteId}`, name: normalizedQuery },
                })
              }
            >
              「{normalizedQuery}」を作成して付ける
            </button>
          )}
          {normalizedQuery && !validTagName(query) && (
            <p role="status">作成するタグ名は1〜50文字にしてください。</p>
          )}
          {continued && (
            <button
              className="hollow-button"
              type="button"
              disabled={loading || pending}
              onClick={() => setAttempt((n) => n + 1)}
            >
              最初の候補へ
            </button>
          )}
          {page.nextCursor && (
            <button
              className="hollow-button"
              type="button"
              disabled={loading || pending}
              onClick={() => void more()}
            >
              次の候補を表示（最大50件）
            </button>
          )}
        </>
      )}
    </TagDialog>
  );
}

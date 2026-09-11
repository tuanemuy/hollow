"use client";

import type {
  BrowseConditions,
  BrowseTag,
} from "@repo/core/application/browse/ports";
import { useEffect, useRef, useState } from "react";
import { browseIdentity } from "@/presentation/browseInput";
import { browseTagsFn } from "@/presentation/browseServerFn";
import { browseAccessLost, browseErrorMessage } from "./BrowseError";

export function TagFilter({
  conditions,
  onSelect,
  onAccessLost,
}: {
  conditions: BrowseConditions;
  onSelect: (id: string) => void;
  onAccessLost: (error: unknown) => void;
}) {
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<readonly BrowseTag[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const identity = JSON.stringify([browseIdentity(conditions), attempt]);
  const current = useRef({ identity, query });
  current.current = { identity, query };
  const lost = useRef(onAccessLost);
  lost.current = onAccessLost;
  useEffect(() => {
    const ticket = ++generation.current;
    setItems([]);
    setCursor(null);
    setError("");
    setLoading(true);
    busy.current = true;
    const timer = setTimeout(() => {
      void browseTagsFn({ data: { conditions, tagQuery: query } })
        .then((response) => {
          if (
            ticket !== generation.current ||
            current.current.identity !== identity ||
            current.current.query !== query
          )
            return;
          setItems(response.items.filter((tag) => tag.count > 0));
          setCursor(response.nextCursor);
        })
        .catch((cause) => {
          if (
            ticket !== generation.current ||
            current.current.identity !== identity ||
            current.current.query !== query
          )
            return;
          setError(browseErrorMessage(cause));
          if (browseAccessLost(cause)) lost.current(cause);
        })
        .finally(() => {
          if (
            ticket === generation.current &&
            current.current.identity === identity &&
            current.current.query === query
          ) {
            setLoading(false);
            busy.current = false;
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [conditions, identity, query]);
  const more = async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    const ticket = generation.current;
    const valid = () =>
      ticket === generation.current &&
      current.current.identity === identity &&
      current.current.query === query;
    try {
      const response = await browseTagsFn({
        data: { conditions, tagQuery: query, tagCursor: cursor },
      });
      if (!valid()) return;
      setItems((previous) => {
        const ids = new Set(previous.map((tag) => tag.id));
        return [
          ...previous,
          ...response.items.filter((tag) => tag.count > 0 && !ids.has(tag.id)),
        ];
      });
      setCursor(response.nextCursor);
    } catch (cause) {
      if (valid()) {
        setError(browseErrorMessage(cause));
        if (browseAccessLost(cause)) lost.current(cause);
      }
    } finally {
      if (valid()) {
        busy.current = false;
        setLoading(false);
      }
    }
  };
  return (
    <details className="browse-tag-filter">
      <summary>
        タグで絞り込む <span>複数はAND</span>
      </summary>
      <label className="browse-tag-search">
        タグを探す
        <input
          type="search"
          value={query}
          onChange={(event) => {
            generation.current++;
            current.current.query = event.target.value;
            setQuery(event.target.value);
            setItems([]);
            setCursor(null);
            setError("");
            setLoading(true);
          }}
          maxLength={200}
          placeholder="この文脈のタグ"
        />
      </label>
      <div className="browse-tag-options" aria-busy={loading}>
        {items.map((tag) => (
          <button
            type="button"
            className="browse-chip"
            key={tag.id}
            aria-pressed={conditions.tags.includes(tag.id)}
            onClick={() => onSelect(tag.id)}
          >
            {tag.name}
            <span>{tag.count}</span>
          </button>
        ))}
      </div>
      {loading && <p role="status">タグを読み込み中…</p>}
      {!loading && !error && !items.length && (
        <p>この文脈で使われている一致するタグはありません。</p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() =>
              cursor ? void more() : setAttempt((value) => value + 1)
            }
            disabled={loading}
          >
            再試行
          </button>
        </p>
      )}
      {cursor && (
        <button type="button" onClick={() => void more()} disabled={loading}>
          タグの続きを読み込む
        </button>
      )}
    </details>
  );
}

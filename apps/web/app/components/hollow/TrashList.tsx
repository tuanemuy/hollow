"use client";

import type { TrashNoteView } from "@repo/core/application/note/trash";
import { Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { listTrashFn, restoreNoteFn } from "@/presentation/hollowTrash";
import "./trash.css";

type TrashPage = Awaited<ReturnType<typeof listTrashFn>>;
export function trashRestoreLabel(
  item: Pick<TrashNoteView, "canRestore" | "remainingDays">,
): string {
  return item.canRestore
    ? `復元できる期間: 残り ${item.remainingDays} 日`
    : "保持期限を過ぎたため復元できません（完全削除待ち）。";
}
export function TrashList({ initial }: { initial: TrashPage }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [visible, remove] = useOptimistic(items, (previous, id: string) =>
    previous.filter((item) => item.id !== id),
  );
  const [message, setMessage] = useState("");
  const [restoredId, setRestoredId] = useState<string>();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message || error) feedback.current?.focus();
  }, [message, error]);
  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }, [initial]);
  const restore = (item: TrashNoteView) => {
    if (busy.current || !item.canRestore) return;
    busy.current = true;
    start(async () => {
      setError("");
      setMessage("");
      setRestoredId(undefined);
      remove(item.id);
      let succeeded = false;
      try {
        await restoreNoteFn({
          data: { id: item.id, operationId: item.operationId },
        });
        succeeded = true;
        setItems((previous) =>
          previous.filter((entry) => entry.id !== item.id),
        );
        setMessage(
          `「${item.title}」を復元しました。取り消された処理は再開しません。`,
        );
        setRestoredId(item.id);
        await router.invalidate();
      } catch (cause) {
        setError(
          `${succeeded ? "復元は完了しました。一覧を更新できませんでした。" : "復元できませんでした。最新の状態を読み込んで確認してください。"}${displayError(cause)}`,
        );
      } finally {
        busy.current = false;
      }
    });
  };
  const load = (next?: string) => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      setError("");
      try {
        const page = await listTrashFn({ data: next ? { cursor: next } : {} });
        setItems((previous) =>
          next
            ? [
                ...previous,
                ...page.items.filter(
                  (item) => !previous.some((entry) => entry.id === item.id),
                ),
              ]
            : page.items,
        );
        setCursor(page.nextCursor);
      } catch (cause) {
        setError(displayError(cause));
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <section aria-busy={pending}>
      <div className="hollow-page-heading">
        <div>
          <p className="hollow-eyebrow">個人 / 非公開</p>
          <h1>ゴミ箱</h1>
        </div>
        <Link to="/notes" className="hollow-button">
          ノート一覧へ
        </Link>
      </div>
      <p>
        削除日の新しい順に表示しています。削除から30日を過ぎると復元できません。
      </p>
      <p className="hollow-help">
        残り日数は最終読み込み時点の値です。復元時にサーバーで期限を確認します。
      </p>
      <button
        type="button"
        className="hollow-button"
        disabled={pending}
        onClick={() => load()}
      >
        {pending ? "処理中…" : "最新の状態を読み込む"}
      </button>
      <div ref={feedback} tabIndex={-1}>
        {error && (
          <p className="hollow-message" role="alert">
            {error}
          </p>
        )}
        {message && (
          <div className="hollow-message">
            <p role="status">{message}</p>
            {restoredId && (
              <Link to="/notes/$noteId" params={{ noteId: restoredId }}>
                復元したノートを開く
              </Link>
            )}
          </div>
        )}
      </div>
      {!visible.length ? (
        <div className="hollow-empty">
          <h2>ゴミ箱は空です。</h2>
          <p>削除したノートはここに表示されます。</p>
        </div>
      ) : (
        <ul className="hollow-trash-list">
          {visible.map((item) => (
            <li
              key={`${item.id}:${item.operationId}`}
              className="hollow-trash-row"
            >
              <div>
                <h2>{item.title}</h2>
                <p>
                  削除日{" "}
                  <time dateTime={item.trashedAt}>
                    {new Date(item.trashedAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </time>
                </p>
                <p>{trashRestoreLabel(item)}</p>
                <p>
                  期限{" "}
                  <time dateTime={item.purgeAfter}>
                    {new Date(item.purgeAfter).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </time>
                </p>
              </div>
              <button
                type="button"
                className="hollow-button"
                disabled={pending || !item.canRestore}
                aria-label={`「${item.title}」を復元`}
                onClick={() => restore(item)}
              >
                {pending ? "処理中…" : "復元"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={() => load(cursor)}
        >
          次の50件を読み込む
        </button>
      )}
    </section>
  );
}

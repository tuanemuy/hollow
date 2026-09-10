"use client";

import type { PurgeView } from "@repo/core/application/note/purge";
import { useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { listNotePurgesFn, retryNotePurgeFn } from "@/presentation/hollowPurge";
import {
  purgeIsActive,
  purgeNeedsRefresh,
  purgeStateLabel,
} from "./PurgeState";

export function PurgeHistory({
  refreshKey = 0,
  onRead,
}: {
  refreshKey?: number;
  onRead?: (items: readonly PurgeView[]) => void;
}) {
  const router = useRouter();
  const callbacks = useRef(onRead);
  callbacks.current = onRead;
  const [items, setItems] = useState<readonly PurgeView[] | null>(null);
  const [optimistic, retryOptimistic] = useOptimistic(
    items,
    (previous, id: string) =>
      previous?.map((item) => ({ ...item, retrying: item.id === id })) ?? null,
  );
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(true);
  const [reload, setReload] = useState(0);
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const latest = useRef<readonly PurgeView[] | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message || actionError) feedback.current?.focus();
  }, [message, actionError]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh restarts the bounded polling sequence.
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      setReading(true);
      try {
        const result = await listNotePurgesFn();
        if (disposed) return;
        const terminal = result.items.some(
          (item) =>
            !purgeIsActive(item) &&
            latest.current?.some(
              (old) => old.id === item.id && old.state !== item.state,
            ),
        );
        latest.current = result.items;
        setItems(result.items);
        setError("");
        callbacks.current?.(result.items);
        if (terminal) {
          setMessage(
            "完全削除の処理状況が更新されました。各項目の結果を確認してください。",
          );
          try {
            await router.invalidate();
          } catch (cause) {
            if (!disposed)
              setError(
                `処理状況は取得しましたが、ゴミ箱を更新できませんでした。${displayError(cause)}`,
              );
          }
        }
      } catch (cause) {
        if (!disposed)
          setError(
            `処理状況を確認できません。削除完了とは限りません。${displayError(cause)}`,
          );
      } finally {
        if (!disposed) {
          setReading(false);
          if (latest.current?.some(purgeNeedsRefresh))
            timer = setTimeout(() => void read(), 5000);
        }
      }
    };
    void read();
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [refreshKey, reload, router]);

  const retry = (item: PurgeView) => {
    if (busy.current || item.state !== "failed") return;
    busy.current = true;
    start(async () => {
      retryOptimistic(item.id);
      setActionError("");
      setMessage("");
      try {
        await retryNotePurgeFn({ data: { id: item.id } });
        setMessage(
          `「${item.title}」の回収再試行を受け付けました。まだ完了ではありません。`,
        );
        await router.invalidate();
      } catch (cause) {
        setActionError(
          `回収再試行の結果を確認できません。処理状況を読み直します。${displayError(cause)}`,
        );
      } finally {
        busy.current = false;
        setReload((value) => value + 1);
      }
    });
  };
  return (
    <section
      className="hollow-purge-history"
      aria-labelledby="hollow-purge-heading"
    >
      <div className="hollow-trash-actions">
        <h2 id="hollow-purge-heading">完全削除の処理状況</h2>
        <button
          type="button"
          className="hollow-button"
          disabled={reading || pending}
          onClick={() => setReload((value) => value + 1)}
        >
          処理状況を更新
        </button>
      </div>
      <p className="hollow-help">
        自分の直近90日の結果と、未完了の回収を表示します。画面を閉じても処理は続きます。受付済みの完全削除は取消・復元できません。
      </p>
      <div ref={feedback} tabIndex={-1}>
        {message && (
          <p role="status" className="hollow-message">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="hollow-message">
            {error}
          </p>
        )}
        {actionError && (
          <p role="alert" className="hollow-message">
            {actionError}
          </p>
        )}
      </div>
      {items === null ? (
        <p role="status">
          {reading
            ? "完全削除の処理状況を読み込み中…"
            : "処理状況を取得できませんでした。更新して再試行してください。"}
        </p>
      ) : !optimistic?.length ? (
        <p>表示する完全削除の処理はありません。</p>
      ) : (
        <ul className="hollow-purge-list">
          {optimistic.map((item) => (
            <li key={item.id} className="hollow-purge-item">
              <h3>{item.title}</h3>
              <p role="status">
                {"retrying" in item && item.retrying
                  ? "回収再試行の受付を確認中…"
                  : purgeStateLabel(item)}
              </p>
              <p>
                回収済み {item.completed} / {item.total} 件
                {item.state !== "succeeded" && item.completed === item.total
                  ? "（ノートの削除は未完了）"
                  : ""}
              </p>
              {item.total > 0 && (
                <progress
                  max={item.total}
                  value={Math.min(item.completed, item.total)}
                  aria-label={`「${item.title}」の回収進捗`}
                />
              )}
              <p className="hollow-help">
                受付{" "}
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </time>
                <br />
                更新{" "}
                <time dateTime={item.updatedAt}>
                  {new Date(item.updatedAt).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </time>
              </p>
              {item.failure && <p className="hollow-message">{item.failure}</p>}
              {item.state === "failed" && (
                <>
                  <p>
                    回収が完了していません。未回収分の容量は保持されます。自動で再試行しますが、ここからすぐに再試行することもできます。ノートの復元はできません。
                  </p>
                  <button
                    type="button"
                    className="hollow-button"
                    disabled={pending || reading}
                    onClick={() => retry(item)}
                  >
                    未回収分を再試行
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

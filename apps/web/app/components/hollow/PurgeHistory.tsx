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
  acceptsPurgeHistoryRead,
  type PurgeHistoryCursor,
  type PurgeHistoryPage,
  type PurgeHistoryRequest,
  type PurgeHistoryScope,
  purgeHistoryEvidence,
  purgeHistoryIdentity,
  purgeHistoryWatch,
  shouldPollPurgeHistory,
  unconfirmedPurgeRequests,
} from "./PurgeHistoryState";
import { purgeIsActive, purgeStateLabel } from "./PurgeState";

const noRequests: readonly PurgeHistoryRequest[] = [];

export function PurgeHistory({
  refreshKey = 0,
  onRead,
  requests = noRequests,
}: {
  refreshKey?: number;
  onRead?: (items: readonly PurgeView[]) => void;
  requests?: readonly PurgeHistoryRequest[];
}) {
  const router = useRouter();
  const callbacks = useRef(onRead);
  callbacks.current = onRead;
  const [items, setItems] = useState<readonly PurgeView[] | null>(null);
  const [page, setPage] = useState<PurgeHistoryPage | null>(null);
  const [scope, setScope] = useState<PurgeHistoryScope>("unfinished");
  const [cursor, setCursor] = useState<PurgeHistoryCursor | null>(null);
  const identity = purgeHistoryIdentity(scope, cursor);
  const [shownIdentity, setShownIdentity] = useState<string | null>(null);
  const [shownScope, setShownScope] = useState<PurgeHistoryScope>("unfinished");
  const requestKey = JSON.stringify(requests);
  const requestRef = useRef(requests);
  requestRef.current = requests;
  const currentRead = useRef({ generation: 0, identity });
  const latestPage = useRef<PurgeHistoryPage | null>(null);
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
  const invalidateRead = () => {
    currentRead.current = {
      ...currentRead.current,
      generation: currentRead.current.generation + 1,
    };
  };
  useEffect(() => {
    if (message || actionError) feedback.current?.focus();
  }, [message, actionError]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh restarts the bounded polling sequence.
  useEffect(() => {
    const ticket = { generation: currentRead.current.generation + 1, identity };
    currentRead.current = ticket;
    let disposed = false;
    const isCurrent = () =>
      !disposed && acceptsPurgeHistoryRead(currentRead.current, ticket);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      setReading(true);
      try {
        const result = await listNotePurgesFn({
          data: {
            scope,
            ...(cursor ? { cursor } : {}),
            watch: purgeHistoryWatch(latestPage.current?.items ?? []),
            requests: requestRef.current,
          },
        });
        if (!isCurrent()) return;
        const evidence = purgeHistoryEvidence(result);
        const terminal = evidence.some(
          (item) =>
            !purgeIsActive(item) &&
            latest.current?.some(
              (old) => old.id === item.id && old.state !== item.state,
            ),
        );
        latest.current = evidence;
        latestPage.current = result;
        setPage(result);
        setItems(result.items);
        setShownIdentity(identity);
        setShownScope(scope);
        setError("");
        callbacks.current?.(evidence);
        if (terminal) {
          const finished = evidence.filter(
            (item) =>
              item.state === "succeeded" &&
              latestPage.current?.observed.some((p) => p.id === item.id),
          );
          setMessage(
            finished.length
              ? `完全削除が完了しました：${finished
                  .slice(0, 3)
                  .map((p) => p.title)
                  .join(
                    "、",
                  )}${finished.length > 3 ? ` ほか${finished.length - 3}件` : ""}。`
              : "完全削除の処理状況が更新されました。各項目の結果を確認してください。",
          );
          try {
            await router.invalidate();
          } catch (cause) {
            if (isCurrent())
              setError(
                `処理状況は取得しましたが、ゴミ箱を更新できませんでした。${displayError(cause)}`,
              );
          }
        }
      } catch (cause) {
        if (isCurrent())
          setError(
            `処理状況を確認できません。削除完了とは限りません。${displayError(cause)}`,
          );
      } finally {
        if (isCurrent()) {
          setReading(false);
          if (shouldPollPurgeHistory(latestPage.current, requestRef.current))
            timer = setTimeout(() => void read(), 5000);
        }
      }
    };
    void read();
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [refreshKey, reload, router, identity, scope, cursor, requestKey]);

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
      id="job-purges"
      className="hollow-purge-history"
      aria-labelledby="hollow-purge-heading"
    >
      <div className="hollow-trash-actions">
        <h2 id="hollow-purge-heading">完全削除の処理状況</h2>
        <button
          type="button"
          className="hollow-button"
          disabled={reading || pending}
          onClick={() => {
            invalidateRead();
            setReload((value) => value + 1);
          }}
        >
          処理状況を更新
        </button>
      </div>
      <p className="hollow-help">
        未完了の回収と、自分の直近90日の完了履歴を分けて表示します。画面を閉じても処理は続きます。受付済みの完全削除は取消・復元できません。
      </p>
      <fieldset
        className="hollow-trash-actions"
        aria-label="完全削除の表示範囲"
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {(["unfinished", "completed"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="hollow-button"
            aria-pressed={scope === value}
            disabled={pending}
            onClick={() => {
              invalidateRead();
              setScope(value);
              setCursor(null);
              setReload((value) => value + 1);
            }}
          >
            {value === "unfinished" ? "未完了" : "完了履歴（90日）"}
          </button>
        ))}
      </fieldset>
      {page && (
        <p role="status">
          未完了 {page.summary.unfinished} 件（処理中 {page.summary.active}{" "}
          件・失敗 {page.summary.failed} 件）
        </p>
      )}
      {unconfirmedPurgeRequests(requests, page).length > 0 && (
        <p role="status">
          受付結果が未確認の要求があります。状態を確認中です。見つからない要求を完了とは扱いません。
        </p>
      )}
      {shownIdentity !== null && shownIdentity !== identity && (
        <p role="status">
          前回取得した{shownScope === "unfinished" ? "未完了" : "完了履歴"}
          を表示しています。選択したページはまだ取得できていません。
        </p>
      )}
      {reading && items !== null && <p role="status">処理状況を更新中…</p>}
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
        <p>
          {shownScope === "completed"
            ? "直近90日の完了履歴はありません。"
            : page?.summary.unfinished === 0
              ? "未完了の完全削除はありません。過去の結果は「完了履歴（90日）」で確認できます。"
              : "このページに表示する未完了の処理はありません。「先頭へ」で最新の状態を確認してください。"}
        </p>
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
      <nav className="hollow-trash-actions" aria-label="完全削除のページ移動">
        <button
          type="button"
          className="hollow-button"
          disabled={reading || pending || cursor === null}
          onClick={() => {
            invalidateRead();
            setCursor(null);
          }}
        >
          先頭へ
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={
            reading ||
            pending ||
            shownIdentity !== identity ||
            !page?.nextCursor
          }
          onClick={() => {
            if (page?.nextCursor) {
              invalidateRead();
              setCursor(page.nextCursor);
            }
          }}
        >
          次の50件
        </button>
      </nav>
    </section>
  );
}

"use client";

import type { PurgeView } from "@repo/core/application/note/purge";
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
import { requestNotePurgeFn } from "@/presentation/hollowPurge";
import { listTrashFn, restoreNoteFn } from "@/presentation/hollowTrash";
import { PurgeConfirm } from "./PurgeConfirm";
import { PurgeHistory } from "./PurgeHistory";
import {
  type PurgeRequest,
  purgeRequestLabel,
  reconcilePurgeRequests,
} from "./PurgeState";
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
  const [purgeTarget, setPurgeTarget] = useState<TrashNoteView | null>(null);
  const [purgeRequests, setPurgeRequests] = useState<readonly PurgeRequest[]>(
    [],
  );
  const [purgeNoteIds, setPurgeNoteIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [purgeRefresh, setPurgeRefresh] = useState(0);
  const busy = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message || error) feedback.current?.focus();
  }, [message, error]);
  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }, [initial]);
  const readPurges = (purges: readonly PurgeView[]) => {
    setPurgeNoteIds(new Set(purges.map((item) => item.noteId)));
    setPurgeRequests((previous) =>
      reconcilePurgeRequests(previous, { purges }),
    );
    setItems((previous) =>
      previous.filter(
        (item) => !purges.some((purge) => purge.noteId === item.id),
      ),
    );
  };
  const purge = (item: TrashNoteView) => {
    if (busy.current || purgeRequests.length >= 10) return;
    busy.current = true;
    start(async () => {
      setError("");
      setMessage("");
      setRestoredId(undefined);
      setPurgeRequests((previous) => [
        ...previous.filter((value) => value.noteId !== item.id),
        {
          kind: "requesting",
          noteId: item.id,
          operationId: item.operationId,
          title: item.title,
        },
      ]);
      remove(item.id);
      let accepted = false;
      try {
        const result = await requestNotePurgeFn({
          data: { id: item.id, operationId: item.operationId },
        });
        accepted = true;
        setPurgeTarget(null);
        setItems((previous) =>
          previous.filter((value) => value.id !== item.id),
        );
        setPurgeRequests((previous) =>
          previous.map((value) =>
            value.noteId === item.id
              ? { ...value, kind: "accepted", purgeId: result.id }
              : value,
          ),
        );
        setMessage(
          `「${item.title}」の完全削除を受け付けました。復元できません。回収の完了は下の処理状況で確認してください。`,
        );
        await router.invalidate();
      } catch (cause) {
        if (!accepted)
          setPurgeRequests((previous) =>
            previous.map((value) =>
              value.noteId === item.id ? { ...value, kind: "unknown" } : value,
            ),
          );
        let detail = displayError(cause);
        try {
          const page = await listTrashFn({ data: {} });
          setItems(page.items);
          setCursor(page.nextCursor);
          setPurgeRequests((previous) =>
            reconcilePurgeRequests(previous, { trash: page.items }),
          );
        } catch (readFailure) {
          detail += ` 状態の再取得にも失敗しました。${displayError(readFailure)}`;
        }
        setError(
          `${accepted ? "完全削除の受付は完了しましたが、表示を更新できませんでした。" : "完全削除要求の結果を確認できません。削除済み・復元可能とは限りません。最新の一覧と処理状況を確認してください。"}${detail}`,
        );
      } finally {
        setPurgeTarget(null);
        setPurgeRefresh((value) => value + 1);
        busy.current = false;
      }
    });
  };
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
        setPurgeRequests((previous) =>
          reconcilePurgeRequests(previous, { trash: page.items }),
        );
      } catch (cause) {
        setError(displayError(cause));
      } finally {
        busy.current = false;
        setPurgeRefresh((value) => value + 1);
      }
    });
  };
  const shown = visible.filter(
    (item) =>
      !purgeNoteIds.has(item.id) &&
      !purgeRequests.some((request) => request.noteId === item.id),
  );
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
      {purgeRequests.map((request) => (
        <div
          key={`${request.noteId}:${request.operationId}`}
          className="hollow-message"
        >
          <p className="hollow-trash-title">{request.title}</p>
          <p role="status">{purgeRequestLabel(request)}</p>
          {request.kind === "unknown" && (
            <button
              className="hollow-button"
              type="button"
              disabled={pending}
              onClick={() => load()}
            >
              受付結果を確認する
            </button>
          )}
        </div>
      ))}
      {!shown.length ? (
        <div className="hollow-empty">
          <h2>
            {purgeRequests.length || purgeNoteIds.size
              ? "ゴミ箱に表示するノートはありません。"
              : "ゴミ箱は空です。"}
          </h2>
          <p>完全削除の受付後は、下の処理状況に表示されます。</p>
        </div>
      ) : (
        <ul className="hollow-trash-list">
          {shown.map((item) => (
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
              <div className="hollow-trash-actions hollow-purge-row-actions">
                <button
                  type="button"
                  className="hollow-button"
                  disabled={pending || !item.canRestore}
                  aria-label={`「${item.title}」を復元`}
                  onClick={() => restore(item)}
                >
                  {pending ? "処理中…" : "復元"}
                </button>
                <button
                  type="button"
                  className="hollow-button"
                  disabled={pending || purgeRequests.length >= 10}
                  aria-label={`「${item.title}」を完全に削除`}
                  onClick={() => setPurgeTarget(item)}
                >
                  完全に削除
                </button>
              </div>
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
      {purgeRequests.length >= 10 && (
        <p role="status">
          受付の確認が終わるまで、新しい完全削除をお待ちください。
        </p>
      )}
      <PurgeHistory
        refreshKey={purgeRefresh}
        onRead={readPurges}
        requests={purgeRequests
          .filter((p) => p.kind !== "requesting")
          .map(({ noteId, operationId }) => ({ noteId, operationId }))}
      />
      {purgeTarget && (
        <PurgeConfirm
          title={purgeTarget.title}
          pending={pending}
          onCancel={() => setPurgeTarget(null)}
          onConfirm={() => purge(purgeTarget)}
        />
      )}
    </section>
  );
}

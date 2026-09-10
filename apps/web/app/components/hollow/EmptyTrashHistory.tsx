"use client";

import type {
  EmptyTrashTargetView,
  EmptyTrashView,
} from "@repo/core/application/note/emptyTrash";
import { useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  cancelEmptyTrashFn,
  getEmptyTrashFn,
  listEmptyAttemptsFn,
  listEmptyTrashFn,
  retryEmptyTrashFn,
} from "@/presentation/hollowEmptyTrash";
import {
  acceptsEmptyRead,
  type EmptyAttempts,
  type EmptyCursor,
  type EmptyJobDetail,
  type EmptyList,
  type EmptyScope,
  emptyChildLabel,
  emptyEvidence,
  emptyNeedsPoll,
  emptyReadIdentity,
  emptyStateLabel,
  emptyWatch,
} from "./EmptyTrashState";

type Action = { job: EmptyTrashView } & (
  | { kind: "cancel" }
  | { kind: "retry"; ordinal?: number }
);
const timestamp = (value: string) =>
  new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

function Counts({ job }: { job: EmptyTrashView }) {
  const count = job.counts;
  return (
    <>
      <p>
        固定対象 {count.total} 件：完了 {count.succeeded} 件・失敗{" "}
        {count.failed} 件・取消 {count.cancelled} 件・未開始 {count.waiting}{" "}
        件・処理中 {count.active} 件
        {count.expired > 0 ? `・表示期限経過 ${count.expired} 件` : ""}
      </p>
      {count.total > 0 && (
        <progress
          max={count.total}
          value={Math.min(count.succeeded, count.total)}
          aria-label="固定対象のうち完全削除が完了した件数"
        />
      )}
      {count.expired > 0 && (
        <p className="hollow-help">
          表示期限を過ぎた対象名・試行の詳細は保持していません。集計には確認済みの結果だけを残し、期限経過だけで削除成功とは扱いません。
        </p>
      )}
    </>
  );
}

export function EmptyTrashHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const heading = useId();
  const [scope, setScope] = useState<EmptyScope>("unfinished");
  const [cursor, setCursor] = useState<EmptyCursor | null>(null);
  const [page, setPage] = useState<EmptyList | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [shownScope, setShownScope] = useState<EmptyScope>(scope);
  const [selected, setSelected] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmation, setConfirmation] = useState<Action | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const unconfirmedRef = useRef<string | null>(null);
  const [pending, start] = useTransition();
  const [optimistic, indicate] = useOptimistic<Action | null, Action>(
    null,
    (_old, next) => next,
  );
  const busy = useRef(false);
  const mounted = useRef(true);
  const latest = useRef<EmptyList | null>(null);
  const previousEvidence = useRef<readonly EmptyTrashView[]>([]);
  const identity = emptyReadIdentity(
    scope,
    cursor?.at ?? null,
    cursor?.id ?? null,
  );
  const gate = useRef({ generation: 0, identity });
  const feedback = useRef<HTMLDivElement>(null);
  const invalidateRead = () => {
    gate.current = { ...gate.current, generation: gate.current.generation + 1 };
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (message || actionError) feedback.current?.focus();
  }, [message, actionError]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh invalidates prior page reads, including their error/finally paths.
  useEffect(() => {
    const ticket = { generation: gate.current.generation + 1, identity };
    gate.current = ticket;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => !disposed && acceptsEmptyRead(gate.current, ticket);
    const read = async () => {
      if (!current()) return;
      setReading(true);
      try {
        const result = await listEmptyTrashFn({
          data: {
            scope,
            ...(cursor ? { cursor } : {}),
            watch: emptyWatch([
              ...(unconfirmedRef.current
                ? [{ id: unconfirmedRef.current }]
                : []),
              ...(latest.current?.items ?? []),
            ]),
          },
        });
        if (!current()) return;
        const evidence = emptyEvidence(result);
        if (
          unconfirmedRef.current &&
          evidence.some((job) => job.id === unconfirmedRef.current)
        ) {
          unconfirmedRef.current = null;
          setUnconfirmed(null);
        }
        const changed = evidence.filter(
          (job) =>
            previousEvidence.current.some(
              (old) =>
                old.id === job.id &&
                (old.state !== job.state || old.generation !== job.generation),
            ) &&
            (job.state === "succeeded" ||
              job.state === "failed" ||
              job.state === "cancelled"),
        );
        latest.current = result;
        previousEvidence.current = evidence;
        setPage(result);
        setShown(identity);
        setShownScope(scope);
        setError("");
        if (changed.length) {
          setMessage(
            changed
              .slice(0, 3)
              .map(
                (job) =>
                  `${timestamp(job.createdAt)} の一括削除：${emptyStateLabel(job)}`,
              )
              .join("。"),
          );
          try {
            await router.invalidate();
          } catch (cause) {
            if (current())
              setError(
                `結果は取得しましたが、ゴミ箱を更新できませんでした。${displayError(cause)}`,
              );
          }
        }
      } catch (cause) {
        if (current())
          setError(
            `一括削除の状態を確認できません。削除完了とは限りません。${displayError(cause)}`,
          );
      } finally {
        if (current()) {
          setReading(false);
          if (
            (latest.current?.summary.unfinished ?? 0) > 0 ||
            unconfirmedRef.current
          )
            timer = setTimeout(() => void read(), 5000);
        }
      }
    };
    if (!pending) void read();
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [identity, scope, cursor, refreshKey, reload, pending, router]);

  const act = (action: Action) => {
    if (busy.current || unconfirmedRef.current) return;
    busy.current = true;
    invalidateRead();
    start(async () => {
      indicate(action);
      setActionError("");
      setMessage("");
      try {
        if (action.kind === "cancel") {
          const result = await cancelEmptyTrashFn({
            data: { id: action.job.id, generation: action.job.generation },
          });
          if (!mounted.current) return;
          setMessage(
            result.cancelRequested
              ? "未開始分の取消を受け付けました。開始済みの回収は継続し、復元はできません。"
              : "実行世代が変わりました。取消受付は確認できていません。最新の結果を確認してください。",
          );
        } else {
          const result = await retryEmptyTrashFn({
            data: {
              id: action.job.id,
              generation: action.job.generation,
              ...(action.ordinal === undefined
                ? {}
                : { ordinal: action.ordinal }),
            },
          });
          if (!mounted.current) return;
          setMessage(
            result.retried > 0
              ? `失敗した ${result.retried} 件の再試行を受け付けました。成功・取消済みの対象は再実行しません。まだ回収完了ではありません。`
              : "新しい再試行の受付はありません。実行世代や対象の状態が変わっている可能性があります。最新の結果を確認してください。",
          );
        }
        if (mounted.current) setConfirmation(null);
        try {
          await router.invalidate();
        } catch (cause) {
          if (mounted.current)
            setActionError(
              `要求の応答は取得しましたが、画面を更新できませんでした。${displayError(cause)}`,
            );
        }
      } catch (cause) {
        if (mounted.current) {
          unconfirmedRef.current = action.job.id;
          setUnconfirmed(action.job.id);
          setConfirmation(null);
          setActionError(
            `操作の受付結果は未確認です。同じ一括処理の最新状態を読み直します。完了や取消済みとは扱いません。${displayError(cause)}`,
          );
        }
      } finally {
        busy.current = false;
        if (mounted.current) setReload((value) => value + 1);
      }
    });
  };

  return (
    <section className="hollow-purge-history" aria-labelledby={heading}>
      <div className="hollow-trash-actions">
        <h2 id={heading}>ゴミ箱を空にする処理の履歴</h2>
        <button
          type="button"
          className="hollow-button"
          disabled={reading || pending}
          onClick={() => {
            invalidateRead();
            setReload((value) => value + 1);
          }}
        >
          一括処理を更新
        </button>
      </div>
      <p className="hollow-help">
        本人の一括処理を表示します。件数は固定したノートの内訳で、ファイル数や過去の試行数ではありません。未完了と直近90日の終了した処理を分けて確認できます。
      </p>
      <fieldset
        className="hollow-trash-actions"
        aria-label="一括削除の表示範囲"
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
              setSelected(null);
              setReload((old) => old + 1);
            }}
          >
            {value === "unfinished" ? "未完了" : "完了・取消履歴（90日）"}
          </button>
        ))}
      </fieldset>
      {page && (
        <p role="status">
          未完了 {page.summary.unfinished} 件（進行中 {page.summary.active}{" "}
          件・失敗 {page.summary.failed} 件）
        </p>
      )}
      {unconfirmed && (
        <p role="status">
          操作した一括処理の状態を確認中です。確認できるまで追加の取消・再試行は停止します。
        </p>
      )}
      {shown !== null && shown !== identity && (
        <p role="status">
          前回取得した{shownScope === "unfinished" ? "未完了" : "終了した処理"}
          を表示しています。選択したページは未取得です。
        </p>
      )}
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
      {reading && <p role="status">一括削除の状態を読み込み中…</p>}
      {page === null ? (
        !reading && (
          <p>状態を取得できませんでした。更新して再試行してください。</p>
        )
      ) : page.items.length === 0 ? (
        <p>
          {shownScope === "completed"
            ? "直近90日の終了した一括処理はありません。"
            : page.summary.unfinished === 0
              ? "未完了の一括処理はありません。過去の結果は「完了・取消履歴（90日）」で確認できます。"
              : "このページの対象はありません。先頭へ戻って最新の状態を確認してください。"}
        </p>
      ) : (
        <ul className="hollow-purge-list">
          {page.items.map((job) => (
            <li key={job.id} className="hollow-purge-item">
              <h3>
                <time dateTime={job.createdAt}>{timestamp(job.createdAt)}</time>{" "}
                の一括削除
              </h3>
              <p role="status">
                {optimistic?.job.id === job.id
                  ? optimistic.kind === "cancel"
                    ? "未開始分の取消を確認中…"
                    : "失敗分の再試行を確認中…"
                  : emptyStateLabel(job)}
              </p>
              <Counts job={job} />
              {job.historical && (
                <p className="hollow-help">
                  90日を超えた元の処理です。未回収分や期限内の新しい試行に必要な情報を表示しています。
                </p>
              )}
              <p className="hollow-help">
                更新{" "}
                <time dateTime={job.updatedAt}>{timestamp(job.updatedAt)}</time>
                ・実行世代 {job.generation}
              </p>
              <div className="hollow-trash-actions">
                <button
                  type="button"
                  className="hollow-button"
                  aria-expanded={selected === job.id}
                  disabled={pending}
                  onClick={() =>
                    setSelected((old) => (old === job.id ? null : job.id))
                  }
                >
                  {selected === job.id
                    ? "内訳を閉じる"
                    : "対象ごとの結果を見る"}
                </button>
                {(job.state === "queued" || job.state === "running") &&
                  !job.cancelRequested && (
                    <button
                      type="button"
                      className="hollow-button"
                      disabled={
                        pending ||
                        reading ||
                        !!unconfirmed ||
                        shown !== identity
                      }
                      onClick={() => setConfirmation({ kind: "cancel", job })}
                    >
                      未開始分を取り消す
                    </button>
                  )}
                {job.counts.retryable > 0 && (
                  <button
                    type="button"
                    className="hollow-button"
                    disabled={
                      pending || reading || !!unconfirmed || shown !== identity
                    }
                    onClick={() => act({ kind: "retry", job })}
                  >
                    失敗分をまとめて再試行（{job.counts.retryable}件）
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <nav className="hollow-trash-actions" aria-label="一括削除のページ移動">
        <button
          type="button"
          className="hollow-button"
          disabled={reading || pending || cursor === null}
          onClick={() => {
            invalidateRead();
            setCursor(null);
            setSelected(null);
          }}
        >
          先頭へ
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={
            reading || pending || shown !== identity || !page?.nextCursor
          }
          onClick={() => {
            if (page?.nextCursor) {
              invalidateRead();
              setCursor(page.nextCursor);
              setSelected(null);
            }
          }}
        >
          次の50件
        </button>
      </nav>
      {selected && (
        <EmptyDetailPanel
          key={selected}
          id={selected}
          refreshKey={`${refreshKey}:${reload}`}
          pending={pending}
          action={optimistic}
          mutationBlocked={!!unconfirmed}
          onRetry={(job, ordinal) => act({ kind: "retry", job, ordinal })}
        />
      )}
      {confirmation?.kind === "cancel" && (
        <CancelEmptyDialog
          action={confirmation}
          pending={pending}
          onClose={() => setConfirmation(null)}
          onConfirm={() => act(confirmation)}
        />
      )}
    </section>
  );
}

function CancelEmptyDialog({
  action,
  pending,
  onClose,
  onConfirm,
}: {
  action: Action;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    cancel.current?.focus();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="hollow-trash-dialog"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <h2 id={heading}>未開始分を取り消しますか？</h2>
      <p>
        <time dateTime={action.job.createdAt}>
          {timestamp(action.job.createdAt)}
        </time>{" "}
        の一括削除（固定 {action.job.counts.total} 件）が対象です。
      </p>
      <p>
        これから削除を開始する対象だけを取り消します。確認中に開始した対象も含め、すでに開始済みの回収は継続します。削除されたノートやファイルは復元できません。
      </p>
      <div className="hollow-trash-actions">
        <button
          ref={cancel}
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={onClose}
        >
          戻る
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "取消受付を確認中…" : "未開始分を取り消す"}
        </button>
      </div>
    </dialog>
  );
}

function EmptyDetailPanel({
  id,
  refreshKey,
  pending,
  action,
  mutationBlocked,
  onRetry,
}: {
  id: string;
  refreshKey: string;
  pending: boolean;
  action: Action | null;
  mutationBlocked: boolean;
  onRetry: (job: EmptyTrashView, ordinal: number) => void;
}) {
  const heading = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [after, setAfter] = useState<number | null>(null);
  const [detail, setDetail] = useState<EmptyJobDetail | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmptyTrashTargetView | null>(null);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const identity = emptyReadIdentity(id, after);
  const gate = useRef({ generation: 0, identity });
  const latest = useRef<EmptyJobDetail | null>(null);
  const invalidateRead = () => {
    gate.current = { ...gate.current, generation: gate.current.generation + 1 };
  };
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Parent mutation completion explicitly refreshes this independent child page.
  useEffect(() => {
    const ticket = { generation: gate.current.generation + 1, identity };
    gate.current = ticket;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => !disposed && acceptsEmptyRead(gate.current, ticket);
    const read = async () => {
      if (!current()) return;
      setReading(true);
      try {
        const result = await getEmptyTrashFn({
          data: { id, ...(after === null ? {} : { after }) },
        });
        if (!current()) return;
        if (result.kind !== "job") {
          setError(
            "この要求は一括削除の受付済み処理ではありません。完了とは扱いません。",
          );
          return;
        }
        latest.current = result;
        setDetail(result);
        setShown(identity);
        setError("");
        setSelected((old) =>
          old
            ? (result.items.find((item) => item.ordinal === old.ordinal) ?? old)
            : null,
        );
      } catch (cause) {
        if (current())
          setError(
            `対象ごとの状態を取得できません。前回の結果を保持しています。${displayError(cause)}`,
          );
      } finally {
        if (current()) {
          setReading(false);
          if (latest.current && emptyNeedsPoll(latest.current.job))
            timer = setTimeout(() => void read(), 5000);
        }
      }
    };
    if (!pending) void read();
    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [id, after, identity, refreshKey, reload, pending]);
  return (
    <section className="hollow-purge-item" aria-labelledby={heading}>
      <h3 id={heading} ref={headingRef} tabIndex={-1}>
        一括削除の対象ごとの結果
      </h3>
      <p className="hollow-help">
        各対象の最新の試行だけを内訳に数えます。過去の明示的な再試行は、対象を選んで確認できます。
      </p>
      <button
        type="button"
        className="hollow-button"
        disabled={reading || pending}
        onClick={() => {
          invalidateRead();
          setReload((value) => value + 1);
        }}
      >
        内訳を更新
      </button>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {reading && <p role="status">対象ごとの状態を読み込み中…</p>}
      {shown !== null && shown !== identity && (
        <p role="status">
          選択したページは未取得です。前回のページを表示しています。
        </p>
      )}
      {detail && (
        <>
          <p role="status">{emptyStateLabel(detail.job)}</p>
          <Counts job={detail.job} />
          {detail.items.length === 0 ? (
            <p>
              このページに表示できる対象はありません。結果の保持期限が経過している場合があります。対象が見つからないことを削除成功とは扱いません。
            </p>
          ) : (
            <ul className="hollow-purge-list">
              {detail.items.map((item) => (
                <li key={item.ordinal} className="hollow-purge-item">
                  <h4>
                    {item.ordinal}.{" "}
                    {item.title || "名称の保持期限が経過した対象"}
                  </h4>
                  <p role="status">
                    {action?.kind === "retry" &&
                    action.job.id === id &&
                    (action.ordinal === undefined ||
                      action.ordinal === item.ordinal)
                      ? "再試行の受付を確認中…"
                      : emptyChildLabel(item.state, item.waiting)}
                  </p>
                  {item.state === "failed" && item.latest?.failure && (
                    <p className="hollow-message">{item.latest.failure}</p>
                  )}
                  {item.latest && (
                    <p className="hollow-help">
                      最終更新{" "}
                      <time dateTime={item.latest.updatedAt}>
                        {timestamp(item.latest.updatedAt)}
                      </time>
                      ・内部回復 {item.latest.recoveries} 回
                    </p>
                  )}
                  {item.state === "cancelled" && (
                    <p className="hollow-help">
                      未開始での取消、復元済みなど、現在の削除対象ではありません。取消を失敗として数えません。
                    </p>
                  )}
                  <div className="hollow-trash-actions">
                    <button
                      type="button"
                      className="hollow-button"
                      disabled={pending}
                      aria-expanded={selected?.ordinal === item.ordinal}
                      onClick={() =>
                        setSelected((old) =>
                          old?.ordinal === item.ordinal ? null : item,
                        )
                      }
                    >
                      試行履歴
                      {selected?.ordinal === item.ordinal
                        ? "を閉じる"
                        : "を見る"}
                    </button>
                    {item.state === "failed" && item.latest && (
                      <button
                        type="button"
                        className="hollow-button"
                        disabled={
                          pending ||
                          reading ||
                          mutationBlocked ||
                          shown !== identity
                        }
                        onClick={() => onRetry(detail.job, item.ordinal)}
                      >
                        この対象の失敗を再試行
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <nav
            className="hollow-trash-actions"
            aria-label="一括削除の対象ページ移動"
          >
            <button
              type="button"
              className="hollow-button"
              disabled={pending || reading || after === null}
              onClick={() => {
                invalidateRead();
                setAfter(null);
                setSelected(null);
              }}
            >
              対象の先頭へ
            </button>
            <button
              type="button"
              className="hollow-button"
              disabled={
                pending ||
                reading ||
                shown !== identity ||
                detail.nextCursor === null
              }
              onClick={() => {
                if (detail.nextCursor !== null) {
                  invalidateRead();
                  setAfter(detail.nextCursor);
                  setSelected(null);
                }
              }}
            >
              次の対象50件
            </button>
          </nav>
          {selected && (
            <AttemptPanel
              key={`${id}:${selected.ordinal}`}
              id={id}
              target={selected}
              pending={pending}
              refreshKey={`${refreshKey}:${reload}`}
            />
          )}
        </>
      )}
    </section>
  );
}

function AttemptPanel({
  id,
  target,
  pending,
  refreshKey,
}: {
  id: string;
  target: EmptyTrashTargetView;
  pending: boolean;
  refreshKey: string;
}) {
  const heading = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [cursor, setCursor] = useState<EmptyCursor | null>(null);
  const [page, setPage] = useState<EmptyAttempts | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [reading, setReading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const identity = emptyReadIdentity(
    id,
    target.ordinal,
    cursor?.at ?? null,
    cursor?.id ?? null,
  );
  const gate = useRef({ generation: 0, identity });
  const invalidateRead = () => {
    gate.current = { ...gate.current, generation: gate.current.generation + 1 };
  };
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Latest target identity/state changes refresh its selected attempt page without accumulating old pages.
  useEffect(() => {
    const ticket = { generation: gate.current.generation + 1, identity };
    gate.current = ticket;
    let disposed = false;
    const current = () => !disposed && acceptsEmptyRead(gate.current, ticket);
    const read = async () => {
      setReading(true);
      try {
        const result = await listEmptyAttemptsFn({
          data: { id, ordinal: target.ordinal, ...(cursor ? { cursor } : {}) },
        });
        if (current()) {
          setPage(result);
          setShown(identity);
          setError("");
        }
      } catch (cause) {
        if (current())
          setError(`試行履歴を取得できません。${displayError(cause)}`);
      } finally {
        if (current()) setReading(false);
      }
    };
    if (!pending) void read();
    return () => {
      disposed = true;
    };
  }, [
    id,
    target.ordinal,
    target.latest?.id,
    target.latest?.updatedAt,
    target.state,
    identity,
    cursor,
    pending,
    refreshKey,
    reload,
  ]);
  return (
    <section className="hollow-purge-item" aria-labelledby={heading}>
      <h4 id={heading} ref={headingRef} tabIndex={-1}>
        「{target.title || "対象"}」の試行履歴
      </h4>
      <p className="hollow-help">
        明示的な再試行を新しい試行として表示します。自動回復は同じ試行内の回数です。過去の結果は作成から90日を過ぎると表示されません。
      </p>
      <button
        type="button"
        className="hollow-button"
        disabled={pending || reading}
        onClick={() => {
          invalidateRead();
          setReload((value) => value + 1);
        }}
      >
        試行履歴を更新
      </button>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {reading && <p role="status">試行履歴を読み込み中…</p>}
      {shown !== null && shown !== identity && (
        <p role="status">
          前回の試行ページを表示しています。選択したページは未取得です。
        </p>
      )}
      {page &&
        (page.items.length === 0 ? (
          <p>
            表示できる試行履歴はありません。未開始または保持期限経過の可能性があります。
          </p>
        ) : (
          <ul className="hollow-purge-list">
            {page.items.map((attempt) => (
              <li key={attempt.id} className="hollow-purge-item">
                <p>
                  <time dateTime={attempt.createdAt}>
                    {timestamp(attempt.createdAt)}
                  </time>{" "}
                  {attempt.id === target.latest?.id
                    ? "（最新の試行）"
                    : "（過去の試行）"}
                </p>
                <p>{emptyChildLabel(attempt.state)}</p>
                {attempt.state === "failed" && (
                  <p className="hollow-message">{attempt.failure}</p>
                )}
                <p className="hollow-help">
                  更新{" "}
                  <time dateTime={attempt.updatedAt}>
                    {timestamp(attempt.updatedAt)}
                  </time>
                  ・内部回復 {attempt.recoveries} 回
                </p>
                {attempt.retryOf && (
                  <p className="hollow-help">
                    過去の失敗からの明示的な再試行です。
                  </p>
                )}
              </li>
            ))}
          </ul>
        ))}
      <nav className="hollow-trash-actions" aria-label="試行履歴のページ移動">
        <button
          type="button"
          className="hollow-button"
          disabled={pending || reading || cursor === null}
          onClick={() => {
            invalidateRead();
            setCursor(null);
          }}
        >
          試行履歴の先頭へ
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={
            pending || reading || shown !== identity || !page?.nextCursor
          }
          onClick={() => {
            if (page?.nextCursor) {
              invalidateRead();
              setCursor(page.nextCursor);
            }
          }}
        >
          次の試行50件
        </button>
      </nav>
    </section>
  );
}

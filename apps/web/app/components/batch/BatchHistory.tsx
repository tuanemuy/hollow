"use client";
import type { BatchConfirmation as Confirmation } from "@repo/core/application/batch/ports";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useBrowseContext } from "@/components/browse/BrowseContext";
import { jobDuration } from "@/components/hollow/importSelection";
import {
  cancelBatchFn,
  getBatchFn,
  listBatchesFn,
  retryBatchFn,
} from "@/presentation/batchServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { BatchConfirmation } from "./BatchConfirmation";
import { BatchDialog } from "./BatchDialog";
import { useBatchSelection } from "./BatchSelectionProvider";
import {
  type BatchContext,
  batchKindLabel,
  batchOperationLabel,
  batchStateLabel,
  confirmationInput,
  sameBatchContext,
  unknownBatchResult,
  visibilityLabel,
} from "./model";

type Page = Awaited<ReturnType<typeof listBatchesFn>>;
type Detail = Awaited<ReturnType<typeof getBatchFn>>;
export type BatchHistorySeed = { unfinished: Page; completed: Page };
type Action =
  | { kind: "cancel"; id: string; generation: number }
  | {
      kind: "retry";
      id: string;
      generation: number;
      items: readonly Confirmation[];
    };
const timestamp = (value: string) =>
  new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
function Counts({ parent }: { parent: Detail["parent"] }) {
  return (
    <p role="status">
      {batchStateLabel[parent.state]} · 対象{parent.total}件：完了
      {parent.counts.succeeded} / 失敗{parent.counts.failed} / 取消
      {parent.counts.cancelled} / 待機{parent.counts.queued} / 実行中
      {parent.counts.running}（受付時の対象外{parent.excluded}件）
    </p>
  );
}

export function BatchHistory({
  initial,
  selectedBatchId,
}: {
  initial?: BatchHistorySeed | undefined;
  selectedBatchId?: string | undefined;
}) {
  const selection = useBatchSelection();
  if (!selection.context) return null;
  return (
    <BatchHistoryInner
      key={JSON.stringify(selection.context)}
      initial={initial}
      selectedBatchId={selectedBatchId}
      owner={selection.context}
    />
  );
}

function BatchHistoryInner({
  initial,
  selectedBatchId,
  owner,
}: {
  initial?: BatchHistorySeed | undefined;
  selectedBatchId?: string | undefined;
  owner: BatchContext;
}) {
  const router = useRouter();
  const { userId } = useBrowseContext();
  const { watchParent, currentContext: currentParentContext } =
    useBatchSelection();
  const location = useRouterState({ select: (state) => state.location.href });
  const [scope, setScope] = useState<"unfinished" | "completed">("unfinished");
  const [cursor, setCursor] = useState<Page["next"]>(null);
  const [page, setPage] = useState<Page | null>(initial?.unfinished ?? null);
  const [selected, setSelected] = useState<string | null>(
    selectedBatchId ?? null,
  );
  const [after, setAfter] = useState<number | undefined>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [retryTarget, setRetryTarget] = useState<{
    detail: Detail;
    ids: readonly string[];
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Detail | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [transitionPending, start] = useTransition();
  const [optimistic, indicate] = useOptimistic<string | null, string>(
    null,
    (_previous, next) => next,
  );
  const busy = useRef<symbol | null>(null);
  const dialogOwner = useRef<string | null>(null);
  const mutationRevision = useRef(0);
  const context = JSON.stringify([
    userId,
    location,
    scope,
    cursor,
    selected,
    after,
  ]);
  const current = useRef({ context, epoch: 0, userId, mounted: true });
  if (current.current.context !== context) {
    current.current.epoch++;
    busy.current = null;
    mutationRevision.current++;
  }
  current.current.context = context;
  current.current.userId = userId;
  const pending = transitionPending && busy.current !== null;
  const currentContext = (): BatchContext | null =>
    sameBatchContext(owner, currentParentContext()) && current.current.mounted
      ? {
          ...owner,
          contextKey: current.current.context,
          contextEpoch: current.current.epoch,
        }
      : null;
  const dialogContext = {
    ...owner,
    contextKey: context,
    contextEpoch: current.current.epoch,
  };
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A different history context invalidates open operation dialogs.
  useEffect(() => {
    setRetryTarget(null);
    setCancelTarget(null);
    setError("");
  }, [context]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A changed actor cannot inherit a prior unknown request.
  useEffect(() => {
    setUnconfirmed(null);
    setMessage("");
  }, [userId]);
  useEffect(() => {
    setSelected(selectedBatchId ?? null);
    setAfter(undefined);
    setDetail(null);
  }, [selectedBatchId]);
  useEffect(() => {
    if (!cursor && initial) setPage(initial[scope]);
  }, [initial, scope, cursor]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Navigation and explicit refresh start a new guarded read generation.
  useEffect(() => {
    let disposed = false;
    let reading = false;
    const epoch = current.current.epoch;
    const valid = () =>
      !disposed && current.current.mounted && current.current.epoch === epoch;
    const read = async () => {
      if (reading || busy.current || !userId) return;
      reading = true;
      const readRevision = mutationRevision.current;
      const accepts = () =>
        valid() && readRevision === mutationRevision.current;
      try {
        const [nextPage, nextDetail] = await Promise.all([
          listBatchesFn({
            data: { scope, ...(cursor ? { before: cursor } : {}) },
          }),
          selected
            ? getBatchFn({
                data: {
                  id: selected,
                  ...(after !== undefined ? { after } : {}),
                },
              })
            : Promise.resolve(null),
        ]);
        if (accepts()) {
          setPage(nextPage);
          setDetail(nextDetail);
          setReadError("");
        }
      } catch (cause) {
        if (accepts()) {
          setReadError(
            `履歴を取得できません。未取得を処理完了とは扱いません。${displayError(cause)}`,
          );
          const serialized = extractSerializedError(cause);
          if (
            serialized.kind === "unauthorized" ||
            serialized.kind === "forbidden"
          ) {
            setPage(null);
            setDetail(null);
          }
          if (serialized.code === "BATCH_NOT_FOUND") setDetail(null);
        }
      } finally {
        reading = false;
      }
    };
    void read();
    const timer = setInterval(() => void read(), 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [scope, cursor, selected, after, userId, location, revision]);

  const mutate = (action: Action) => {
    if (busy.current || !userId) return;
    const operation = Symbol();
    busy.current = operation;
    mutationRevision.current++;
    const actor = userId;
    const epoch = current.current.epoch;
    const valid = () =>
      current.current.mounted &&
      current.current.userId === actor &&
      current.current.epoch === epoch &&
      sameBatchContext(owner, currentParentContext());
    setError("");
    start(async () => {
      indicate(
        action.kind === "cancel"
          ? "待機中の子の取消を送信しています…"
          : "失敗した対象の再試行を送信しています…",
      );
      try {
        if (action.kind === "cancel")
          await cancelBatchFn({
            data: { id: action.id, generation: action.generation },
          });
        else
          await retryBatchFn({
            data: {
              id: action.id,
              generation: action.generation,
              items: action.items.map(confirmationInput),
            },
          });
        if (!valid()) return;
        watchParent(action.id);
        setUnconfirmed(null);
        setRetryTarget(null);
        setCancelTarget(null);
        setMessage(
          action.kind === "cancel"
            ? "待機分の取消を受け付けました。実行中の結果と成功済みの変更は残ります。"
            : "同じ対象・同じ設定の再試行を受け付けました。全件完了ではありません。",
        );
        setRevision((value) => value + 1);
      } catch (cause) {
        if (!valid()) return;
        setError(displayError(cause));
        setUnconfirmed(unknownBatchResult(cause) ? action : null);
        setRetryTarget(null);
        setCancelTarget(null);
      } finally {
        try {
          if (valid()) await router.invalidate();
        } catch (cause) {
          if (valid()) setError(displayError(cause));
        }
        if (busy.current === operation) busy.current = null;
      }
    });
  };
  const prepareRetry = (parent: Detail, one?: string) => {
    if (
      busy.current ||
      unconfirmed ||
      parent.parent.counts.queued + parent.parent.counts.running > 0
    )
      return;
    const operation = Symbol();
    busy.current = operation;
    const epoch = current.current.epoch;
    const valid = () =>
      current.current.mounted &&
      current.current.epoch === epoch &&
      sameBatchContext(owner, currentParentContext());
    setError("");
    start(async () => {
      try {
        let ids: string[] = [];
        let next: number | undefined;
        let base: Detail | null = null;
        let pages = 0;
        do {
          if (++pages > 10)
            throw new Error("最大500件の再試行対象を確認できません。");
          const result = await getBatchFn({
            data: {
              id: parent.parent.id,
              ...(next !== undefined ? { after: next } : {}),
            },
          });
          if (!valid()) return;
          if (
            result.parent.generation !== parent.parent.generation ||
            result.parent.counts.queued + result.parent.counts.running > 0
          )
            throw new Error(
              "処理状態が変わりました。最新の履歴を確認してください。",
            );
          if (result.next !== null && result.next <= (next ?? -1))
            throw new Error("結果ページの順序を確認できません。");
          base ??= result;
          ids = [
            ...new Set([
              ...ids,
              ...result.items
                .filter(
                  (item) => item.retryable && (!one || item.noteId === one),
                )
                .map((item) => item.noteId),
            ]),
          ];
          if (ids.length > 500)
            throw new Error("再試行対象の件数を確認できません。");
          next = result.next ?? undefined;
        } while (next !== undefined);
        if (valid() && base) {
          if (!ids.length) setError("現在再試行できる失敗対象はありません。");
          else {
            dialogOwner.current = context;
            setRetryTarget({ detail: base, ids });
          }
        }
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      } finally {
        if (busy.current === operation) busy.current = null;
      }
    });
  };
  const switchScope = (next: typeof scope) => {
    setScope(next);
    setCursor(null);
    setPage(initial?.[next] ?? null);
    setSelected(null);
    setDetail(null);
    setAfter(undefined);
  };
  if (!sameBatchContext(owner, currentParentContext())) return null;
  return (
    <section className="batch-history" aria-label="一括整理の処理履歴">
      <h2>一括整理の処理</h2>
      <p>
        依頼した本人だけの履歴です。完了履歴は90日を過ぎると削除されます。画面や選択を閉じても、受理済み処理は継続します。
      </p>
      <div className="batch-actions">
        <button
          type="button"
          aria-pressed={scope === "unfinished"}
          disabled={pending}
          onClick={() => switchScope("unfinished")}
        >
          未完了
        </button>
        <button
          type="button"
          aria-pressed={scope === "completed"}
          disabled={pending}
          onClick={() => switchScope("completed")}
        >
          完了した処理
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setRevision((value) => value + 1)}
        >
          最新状態を確認
        </button>
      </div>
      {error && (
        <p role="alert" className="batch-warning">
          {error}
        </p>
      )}
      {readError && (
        <p role="alert" className="batch-warning">
          {readError}
        </p>
      )}
      {(optimistic || message) && <p role="status">{optimistic ?? message}</p>}
      {unconfirmed && (
        <div className="batch-warning" role="status">
          <p>
            要求の受付結果は未確認です。同じ対象・設定・世代で確認します。新しい再試行要求は作りません。
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => mutate(unconfirmed)}
          >
            同じ要求の結果を確認
          </button>
        </div>
      )}
      {!page ? (
        <p role="status">履歴を取得しています…</p>
      ) : (
        <>
          {!page.items.length && (
            <p>
              このページに{scope === "unfinished" ? "未完了" : "完了した"}
              処理はありません。
            </p>
          )}
          <ul className="batch-parents">
            {page.items.map((parent) => (
              <li key={parent.id}>
                <h3>
                  {batchKindLabel[parent.kind]} · 受付{" "}
                  {timestamp(parent.createdAt)}
                </h3>
                <Counts parent={parent} />
                <p>
                  更新：{timestamp(parent.updatedAt)} · 受付から最新更新まで{" "}
                  {jobDuration(parent.createdAt, parent.updatedAt)}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setSelected(parent.id);
                    setAfter(undefined);
                    setDetail(null);
                  }}
                >
                  子ごとの結果を開く
                </button>
              </li>
            ))}
          </ul>
          <div className="batch-actions">
            {cursor && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCursor(null);
                  setPage(null);
                }}
              >
                最初の50件
              </button>
            )}
            {page.next && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCursor(page.next);
                  setPage(null);
                }}
              >
                次の50件
              </button>
            )}
          </div>
        </>
      )}
      {selected && (
        <section className="batch-child-history">
          <h3>対象別の結果</h3>
          {!detail || detail.parent.id !== selected ? (
            <p role="status">子の結果を取得しています…</p>
          ) : (
            <>
              <p>{batchOperationLabel(detail.operation)}</p>
              <Counts parent={detail.parent} />
              {detail.operation.kind === "tag" &&
                detail.operation.change.kind === "create" && (
                  <p>
                    上記は初回の入力名です。タグ identity：
                    {detail.binding
                      ? `ID ${detail.binding} に固定済み。改名後も同じIDを使い、同名の別IDへ再作成しません。`
                      : "未確定。最初に成功する子と同時に確定します。"}
                  </p>
                )}
              <div className="batch-actions">
                {detail.parent.counts.queued > 0 && (
                  <button
                    type="button"
                    disabled={pending || !!unconfirmed}
                    onClick={() => {
                      dialogOwner.current = context;
                      setCancelTarget(detail);
                    }}
                  >
                    待機中の子を取り消す
                  </button>
                )}
                {detail.parent.counts.failed > 0 &&
                  detail.parent.counts.queued + detail.parent.counts.running ===
                    0 && (
                    <button
                      type="button"
                      disabled={pending || !!unconfirmed}
                      onClick={() => prepareRetry(detail)}
                    >
                      失敗した子だけ全件再確認
                    </button>
                  )}
              </div>
              <ol start={(after ?? -1) + 2}>
                {detail.items.map((item) => (
                  <li key={item.id}>
                    <h4>{item.title || "表示期限を過ぎた対象"}</h4>
                    <p>
                      {batchStateLabel[item.state]} · 試行{item.attemptNumber}
                      回目 · 更新{timestamp(item.updatedAt)}
                    </p>
                    {item.state === "failed" && item.failure && (
                      <p className="batch-warning">{item.failure.message}</p>
                    )}
                    {item.outcome?.kind === "sharing" && (
                      <p>
                        {visibilityLabel[item.outcome.visibility]}：
                        {item.outcome.change === "changed"
                          ? "公開範囲を変更しました。"
                          : "確認した条件が同じため変更不要でした。"}
                        実行時に保存した結果です。
                      </p>
                    )}
                    {item.title && (
                      <Link
                        to="/notes/$noteId"
                        params={{ noteId: item.noteId }}
                      >
                        現在のノートを開く（現在の権限を確認）
                      </Link>
                    )}
                    {item.retryable &&
                      detail.parent.counts.queued +
                        detail.parent.counts.running ===
                        0 && (
                        <button
                          type="button"
                          disabled={pending || !!unconfirmed}
                          onClick={() => prepareRetry(detail, item.noteId)}
                        >
                          この失敗だけ再確認
                        </button>
                      )}
                  </li>
                ))}
              </ol>
              <div className="batch-actions">
                {after !== undefined && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setAfter(undefined);
                      setDetail(null);
                    }}
                  >
                    最初の50件
                  </button>
                )}
                {detail.next !== null && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setAfter(detail.next ?? undefined);
                      setDetail(null);
                    }}
                  >
                    次の50件
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setSelected(null);
                    setDetail(null);
                  }}
                >
                  子の結果を閉じる
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {cancelTarget && dialogOwner.current === context && (
        <BatchDialog
          context={dialogContext}
          currentContext={currentContext}
          title="待機中の子を取り消す"
          pending={pending}
          onClose={() => setCancelTarget(null)}
        >
          <p>
            待機{cancelTarget.parent.counts.queued}件を取り消します。実行中
            {cancelTarget.parent.counts.running}
            件は完了を待ち、成功済みの変更は残します。
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              mutate({
                kind: "cancel",
                id: cancelTarget.parent.id,
                generation: cancelTarget.parent.generation,
              })
            }
          >
            待機分の取消を確定
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setCancelTarget(null)}
          >
            戻る
          </button>
        </BatchDialog>
      )}
      {retryTarget && dialogOwner.current === context && (
        <BatchConfirmation
          key={JSON.stringify(dialogContext)}
          context={dialogContext}
          currentContext={currentContext}
          ids={retryTarget.ids}
          source={retryTarget.detail.source}
          operation={retryTarget.detail.operation}
          description={
            retryTarget.detail.binding
              ? `確定済みのタグ ID ${retryTarget.detail.binding} を使います。初回の入力名から同名タグを作り直す操作ではありません。`
              : undefined
          }
          parent={{
            id: retryTarget.detail.parent.id,
            generation: retryTarget.detail.parent.generation,
          }}
          submitting={pending}
          onClose={() => setRetryTarget(null)}
          onConfirm={(items) =>
            mutate({
              kind: "retry",
              id: retryTarget.detail.parent.id,
              generation: retryTarget.detail.parent.generation,
              items,
            })
          }
        />
      )}
    </section>
  );
}

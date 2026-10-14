"use client";

import { useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";
import { displayError } from "@/presentation/errorDisplay";
import {
  confirmEmptyTrashFn,
  discardEmptyTrashFn,
  getEmptyTrashFn,
  prepareEmptyTrashFn,
} from "@/presentation/hollowEmptyTrash";
import { scopeSearch } from "@/presentation/workspaceInput";
import {
  canConfirmEmpty,
  type EmptyConfirmation,
  resolveEmptyConfirmation,
} from "./EmptyTrashState";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function EmptyTrashControl({
  onAccepted,
  disabled = false,
  workspaceId,
  scopeName = "個人",
}: {
  onAccepted: () => void;
  disabled?: boolean;
  workspaceId?: string | undefined;
  scopeName?: string;
}) {
  const router = useRouter();
  const authentication = useAuthenticationOperation();
  const [acceptedScope] = useState({ workspaceId, name: scopeName });
  const [state, setState] = useState<EmptyConfirmation>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [stage, setStage] = useOptimistic("", (_old, next: string) => next);
  const busy = useRef(false);
  const mounted = useRef(true);
  const notified = useRef<string | null>(null);
  const callback = useRef(onAccepted);
  callback.current = onAccepted;
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<{
    origin: HTMLButtonElement;
    current: () => boolean;
  } | null>(null);
  const heading = useId();
  const snapshot =
    state.kind === "prepared" || state.kind === "unknown"
      ? state.snapshot
      : null;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = opener.current;
    const current = authentication();
    const element = dialog.current;
    element?.showModal();
    cancelButton.current?.focus();
    return () => {
      element?.close();
      if (previous) returnFocus.current = { origin: previous, current };
    };
  }, [open, authentication]);
  useEffect(() => {
    if (open || pending) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (!mounted.current || !target?.current()) return;
    if (target.origin.isConnected && !target.origin.disabled)
      target.origin.focus();
  }, [open, pending]);
  useEffect(() => {
    if (!snapshot) return;
    setNow(Date.now());
    const timeout = setTimeout(
      () => setNow(Date.now()),
      Math.max(
        0,
        Math.min(2_147_483_647, Date.parse(snapshot.expiresAt) - Date.now()),
      ),
    );
    return () => clearTimeout(timeout);
  }, [snapshot]);

  const accepted = async (id: string) => {
    setState({ kind: "accepted", id });
    setOpen(false);
    setError("");
    setMessage(
      "ゴミ箱を空にする要求を受け付けました。まだ削除完了ではありません。下の一括処理履歴で結果を確認してください。",
    );
    if (notified.current !== id) {
      notified.current = id;
      callback.current();
    }
    try {
      await router.invalidate();
    } catch (cause) {
      if (mounted.current)
        setError(
          `受付は確認できましたが、画面を更新できませんでした。${displayError(cause)}`,
        );
    }
  };

  const prepare = () => {
    if (busy.current) return;
    if (snapshot) {
      setOpen(true);
      return;
    }
    if (disabled) return;
    busy.current = true;
    start(async () => {
      setStage("対象を確認中…");
      setError("");
      setMessage("");
      try {
        const result = await prepareEmptyTrashFn({
          data: scopeSearch(acceptedScope.workspaceId),
        });
        if (!mounted.current) return;
        setChecked(false);
        if (result.kind === "empty") {
          setState({ kind: "empty" });
          setMessage(
            `「${acceptedScope.name}」のゴミ箱は空です。削除処理は作成していません。`,
          );
        } else {
          setState({ kind: "prepared", snapshot: result });
          setNow(Date.now());
          setOpen(true);
        }
      } catch (cause) {
        if (mounted.current)
          setError(
            `対象の確認結果を取得できませんでした。削除の実行は依頼していません。${displayError(cause)}`,
          );
      } finally {
        busy.current = false;
      }
    });
  };

  const resolve = async (
    unknown: Extract<EmptyConfirmation, { kind: "unknown" }>,
  ) => {
    try {
      const result = await getEmptyTrashFn({
        data: { id: unknown.snapshot.id },
      });
      if (!mounted.current) return;
      const next = resolveEmptyConfirmation(unknown, result);
      setChecked(false);
      setNow(Date.now());
      setError("");
      if (next.kind === "accepted") {
        await accepted(next.id);
        return;
      }
      setState(next);
      if (next.kind === "idle") {
        setOpen(false);
        setMessage(
          "確認を取り消しました。この要求による削除は開始していません。",
        );
      } else if (next.kind === "prepared")
        setMessage(
          "同じ対象の確認待ちであることを確認しました。内容と期限を再確認してください。",
        );
      else
        setError(
          "同じ要求の状態を確認できませんでした。新しい対象では実行しません。",
        );
    } catch (cause) {
      if (mounted.current) {
        setState(unknown);
        setError(
          `要求 ${unknown.snapshot.id} の結果は未確認です。削除完了・取消完了とは限りません。${displayError(cause)}`,
        );
      }
    }
  };

  const act = (operation: "confirm" | "discard") => {
    if (busy.current || state.kind !== "prepared") return;
    if (
      operation === "confirm" &&
      (disabled || !canConfirmEmpty(state, checked, Date.now()))
    ) {
      setNow(Date.now());
      return;
    }
    const unknown = {
      kind: "unknown" as const,
      snapshot: state.snapshot,
      operation,
    };
    busy.current = true;
    start(async () => {
      setStage(
        operation === "confirm"
          ? "一括削除の受付を確認中…"
          : "確認の取消を確認中…",
      );
      setError("");
      setMessage("");
      try {
        if (operation === "confirm") {
          try {
            await confirmEmptyTrashFn({ data: { id: unknown.snapshot.id } });
          } catch (cause) {
            if (mounted.current) {
              setState(unknown);
              setChecked(false);
              setError(
                `受付結果は未確認です。同じ要求の状態を確認してください。${displayError(cause)}`,
              );
            }
            return;
          }
          if (mounted.current) await accepted(unknown.snapshot.id);
        } else {
          try {
            await discardEmptyTrashFn({ data: { id: unknown.snapshot.id } });
          } catch (cause) {
            if (mounted.current) {
              setState(unknown);
              setError(
                `取消結果は未確認です。同じ要求の状態を確認してください。${displayError(cause)}`,
              );
            }
            return;
          }
          await resolve(unknown);
        }
      } finally {
        busy.current = false;
      }
    });
  };

  const checkUnknown = () => {
    if (busy.current || state.kind !== "unknown") return;
    const unknown = state;
    busy.current = true;
    start(async () => {
      setStage("同じ要求の状態を確認中…");
      try {
        await resolve(unknown);
      } finally {
        busy.current = false;
      }
    });
  };
  const close = () => {
    if (busy.current) return;
    if (state.kind === "prepared") act("discard");
    else setOpen(false);
  };

  return (
    <section aria-label="ゴミ箱を空にする">
      <div className="hollow-trash-actions">
        <button
          ref={opener}
          type="button"
          className="hollow-button"
          disabled={pending || (disabled && !snapshot)}
          onClick={prepare}
        >
          {pending
            ? stage || "確認中…"
            : snapshot
              ? "一括削除の確認を開く"
              : "ゴミ箱を空にする"}
        </button>
        {state.kind === "unknown" && (
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={checkUnknown}
          >
            同じ要求の結果を確認
          </button>
        )}
      </div>
      {!open && message && (
        <p role="status" className="hollow-message">
          {message}
        </p>
      )}
      {!open && error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {state.kind === "unknown" && !open && (
        <p role="status">
          受付・取消の結果は未確認です。要求 ID:{" "}
          <span style={{ overflowWrap: "anywhere" }}>{state.snapshot.id}</span>
          。新しい対象での実行は停止しています。
        </p>
      )}
      {open && snapshot && (
        <dialog
          ref={dialog}
          className="hollow-trash-dialog hollow-dialog"
          aria-labelledby={heading}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <DialogHandle />
          <h2 id={heading}>「{acceptedScope.name}」のゴミ箱を空にしますか？</h2>
          <p>
            確認時点の「{acceptedScope.name}」のゴミ箱から固定した{" "}
            <strong>{snapshot.total} 件</strong>{" "}
            が対象です。今表示中のページだけでなく、固定したすべての対象を処理します。
          </p>
          <p>
            この確認の後にゴミ箱へ入ったノートは対象に含みません。復元済みや別の削除世代は実行時に対象外となります。
          </p>
          <p>
            有効期限:{" "}
            <time dateTime={snapshot.expiresAt}>
              {new Date(snapshot.expiresAt).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
              })}
            </time>
          </p>
          <p>
            削除を開始したノートは元に戻せません。本文、原本ファイル、画像・動画、保存されたすべての版を削除します。他のノートが利用中の共有ファイルは残ります。
          </p>
          <p>
            Google Drive 側のファイルは削除しません。Drive
            への削除連携は未接続です。
          </p>
          <p>
            受付後も回収には時間がかかります。未開始分だけ取消できますが、開始済みの回収は継続し、復元はできません。
          </p>
          {snapshot.total > 50 && (
            <p>
              50件を超えるため、固定した {snapshot.total}{" "}
              件をバックグラウンドで処理します。画面を閉じても処理は続きます。
            </p>
          )}
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
          {state.kind === "prepared" ? (
            <>
              {Date.parse(snapshot.expiresAt) <= now && (
                <p role="alert">
                  確認の有効期限が切れました。この確認を取り消してから対象を読み直してください。
                </p>
              )}
              <label className="hollow-trash-check">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={pending || disabled}
                  onChange={(event) => setChecked(event.currentTarget.checked)}
                />
                <span>
                  固定した {snapshot.total}{" "}
                  件について、開始した削除は元に戻せず、原本・メディア・すべての版が削除されることを確認しました。
                </span>
              </label>
              <div className="hollow-trash-actions">
                <button
                  ref={cancelButton}
                  type="button"
                  className="hollow-button"
                  disabled={pending}
                  onClick={() => act("discard")}
                >
                  確認を取り消す
                </button>
                <button
                  type="button"
                  className="hollow-button hollow-purge-confirm hollow-destructive"
                  disabled={
                    pending || disabled || !canConfirmEmpty(state, checked, now)
                  }
                  onClick={() => act("confirm")}
                >
                  {pending ? stage : `${snapshot.total} 件の完全削除を実行`}
                </button>
              </div>
            </>
          ) : (
            <>
              <p role="status">
                この要求の受付・取消の結果は未確認です。別の対象を作成せず、同じ要求
                ID を確認します。
              </p>
              <div className="hollow-trash-actions">
                <button
                  ref={cancelButton}
                  type="button"
                  className="hollow-button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  閉じる（確認は保留）
                </button>
                <button
                  type="button"
                  className="hollow-button"
                  disabled={pending}
                  onClick={checkUnknown}
                >
                  {pending ? stage : "同じ要求の結果を確認"}
                </button>
              </div>
            </>
          )}
        </dialog>
      )}
    </section>
  );
}

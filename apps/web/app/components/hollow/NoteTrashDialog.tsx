"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { getTrashIntentFn } from "@/presentation/hollowTrash";

export type NoteTrashIntent = Awaited<ReturnType<typeof getTrashIntentFn>>;
export function NoteTrashDialog({
  target,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  target: { id: string; title: string };
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (intent: NoteTrashIntent, cancelProcessing: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [intent, setIntent] = useState<NoteTrashIntent | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [loading, start] = useTransition();
  const generation = useRef(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit retry reloads the latest confirmation state.
  useEffect(() => {
    const ticket = ++generation.current;
    setIntent(null);
    setCancelProcessing(false);
    setLoadError("");
    start(async () => {
      try {
        const next = await getTrashIntentFn({ data: { id: target.id } });
        if (generation.current === ticket) setIntent(next);
      } catch (cause) {
        if (generation.current === ticket) setLoadError(displayError(cause));
      }
    });
    return () => {
      generation.current++;
    };
  }, [target.id, attempt]);
  return (
    <dialog
      ref={dialog}
      className="hollow-trash-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <h2 id={titleId}>ノートをゴミ箱へ移動しますか？</h2>
      <p className="hollow-trash-title">{intent?.title ?? target.title}</p>
      <p>
        通常の一覧から消え、本文・元ファイル・メディアを開けなくなります。保存済みの内容は保持され、削除から30日以内なら復元できます。
      </p>
      {loading && <p role="status">最新の状態を確認しています…</p>}
      {intent?.hasRunningJobs && (
        <label className="hollow-trash-check">
          <input
            type="checkbox"
            checked={cancelProcessing}
            disabled={pending || loading}
            onChange={(event) =>
              setCancelProcessing(event.currentTarget.checked)
            }
          />
          <span>
            このノートの処理中・待機中の取り込みを取り消して削除する。復元しても取り消した処理は再開しません。
          </span>
        </label>
      )}
      {(loadError || error) && (
        <p role="alert" className="hollow-message">
          {loadError || error}
        </p>
      )}
      <div className="hollow-trash-actions">
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="hollow-button hollow-primary"
          disabled={
            pending ||
            loading ||
            !intent ||
            (intent.hasRunningJobs && !cancelProcessing)
          }
          onClick={() => {
            if (intent) onConfirm(intent, cancelProcessing);
          }}
        >
          {pending ? "移動中…" : "ゴミ箱へ移動"}
        </button>
        {(loadError || error) && (
          <button
            type="button"
            className="hollow-button"
            disabled={pending || loading}
            onClick={() => setAttempt((value) => value + 1)}
          >
            最新の状態を確認し直す
          </button>
        )}
      </div>
    </dialog>
  );
}

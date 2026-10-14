"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";

export function PurgeConfirm({
  title,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [understood, setUnderstood] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="hollow-trash-dialog hollow-dialog"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <DialogHandle />
      <h2 id={heading}>このノートを完全に削除しますか？</h2>
      <p className="hollow-trash-title">{title}</p>
      <p>
        受付が完了すると、処理中や回収に失敗した場合も取り消し・復元はできません。
      </p>
      <p>
        このノートの本文、保存されているすべての版、元ファイル、挿入した画像・動画が削除対象になります。他のノートが使う共有の参照ファイルは残ります。
      </p>
      <p>
        実際のファイル回収には時間がかかることがあります。容量は回収の完了に応じて解放されます。
      </p>
      <label className="hollow-trash-check">
        <input
          type="checkbox"
          checked={understood}
          disabled={pending}
          onChange={(event) => setUnderstood(event.currentTarget.checked)}
        />
        <span>
          元に戻せないことと、原本・メディア・すべての版が削除されることを確認しました。
        </span>
      </label>
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
          className="hollow-button hollow-purge-confirm hollow-destructive"
          disabled={pending || !understood}
          onClick={onConfirm}
        >
          {pending ? "受付を確認中…" : "完全削除を実行"}
        </button>
      </div>
    </dialog>
  );
}

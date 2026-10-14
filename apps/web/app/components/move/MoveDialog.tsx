"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";

export function MoveDialog({
  children,
  pending,
  onClose,
}: {
  children: ReactNode;
  pending: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="move-dialog hollow-dialog"
      aria-labelledby={heading}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <DialogHandle />
      <div className="move-heading">
        <h2 id={heading}>ノートを移動</h2>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          aria-label="移動を取り消して閉じる"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

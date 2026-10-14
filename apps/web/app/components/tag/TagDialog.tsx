"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";

export function TagDialog({
  title,
  children,
  onClose,
  pending = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  pending?: boolean;
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
      className="tag-dialog hollow-dialog"
      aria-labelledby={heading}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <DialogHandle />
      <div className="tag-dialog-heading">
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

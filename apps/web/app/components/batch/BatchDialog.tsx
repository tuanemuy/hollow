"use client";
import { type ReactNode, useEffect, useId, useRef } from "react";

export function BatchDialog({
  title,
  pending,
  onClose,
  children,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
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
      className="batch-dialog"
      aria-labelledby={heading}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <header>
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

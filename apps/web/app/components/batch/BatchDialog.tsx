"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";
import { type BatchContext, sameBatchContext } from "./model";

export function BatchDialog({
  title,
  pending,
  onClose,
  children,
  context,
  currentContext,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
  context: BatchContext;
  currentContext: () => BatchContext | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const owner = useRef(context);
  const latest = useRef(currentContext);
  latest.current = currentContext;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (
        sameBatchContext(owner.current, latest.current()) &&
        previous instanceof HTMLElement &&
        previous.isConnected
      )
        previous.focus();
    };
  }, []);
  if (!sameBatchContext(owner.current, currentContext())) return null;
  return (
    <dialog
      ref={ref}
      className="batch-dialog hollow-dialog"
      aria-labelledby={heading}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <DialogHandle />
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

"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";

export function PublicationConfirmation({
  titleId,
  current,
  busy,
  onCancel,
  children,
}: Readonly<{
  titleId: string;
  current: () => boolean;
  busy: boolean;
  onCancel: () => void;
  children: ReactNode;
}>) {
  const panel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = panel.current;
    const frame = requestAnimationFrame(() => {
      if (current()) {
        node?.showModal();
        node?.focus();
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      node?.close();
    };
  }, [current]);
  return (
    <dialog
      className="publication-dialog hollow-dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-busy={busy}
      tabIndex={-1}
      ref={panel}
      onCancel={(event) => {
        event.preventDefault();
        if (current() && !busy) onCancel();
      }}
      onKeyDown={(event) => {
        if (!current()) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onCancel();
        }
        if (event.key !== "Tab") return;
        const controls = [
          ...(panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),a[href],textarea:not(:disabled),[tabindex="0"]',
          ) ?? []),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          panel.current?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !controls.some((item) => item === document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !controls.some((item) => item === document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <DialogHandle />
      {children}
    </dialog>
  );
}

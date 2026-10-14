"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { DialogHandle } from "@/components/ui/DialogHandle";

export function SharingDialog({
  titleId,
  children,
  current,
  onClose,
  busy,
}: {
  titleId: string;
  children: ReactNode;
  current: () => boolean;
  onClose: () => void;
  busy: boolean;
}) {
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
      className="sharing-dialog hollow-dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-busy={busy}
      tabIndex={-1}
      ref={panel}
      onCancel={(event) => {
        event.preventDefault();
        if (current() && !busy) onClose();
      }}
      onKeyDown={(event) => {
        if (!current()) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
        }
        if (event.key !== "Tab") return;
        const items = [
          ...(panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),a[href],textarea:not(:disabled),[tabindex="0"]',
          ) ?? []),
        ];
        const first = items[0];
        const last = items.at(-1);
        const onControl = items.some((item) => item === document.activeElement);
        if (!first || !last) {
          event.preventDefault();
          panel.current?.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || !onControl)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !onControl)
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

"use client";

import { Link, useRouter } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { restoreNoteFn, type trashNoteFn } from "@/presentation/hollowTrash";
import "./trash.css";

type TrashReceipt = Awaited<ReturnType<typeof trashNoteFn>> & { title: string };
const TrashContext = createContext<((receipt: TrashReceipt) => void) | null>(
  null,
);

export function useTrashNotice() {
  const notify = useContext(TrashContext);
  if (!notify) throw new Error("ゴミ箱の操作には画面の状態が必要です。");
  return notify;
}

export function TrashProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<TrashReceipt | null>(null);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const latestOperation = useRef<string | null>(null);
  const toast = useRef<HTMLElement>(null);
  useEffect(() => {
    if (receipt) toast.current?.focus();
  }, [receipt]);
  const notify = (next: TrashReceipt) => {
    latestOperation.current = next.operationId;
    setReceipt(next);
    setRestored(false);
    setError("");
  };
  const undo = () => {
    if (!receipt || busy.current) return;
    const target = receipt;
    busy.current = true;
    start(async () => {
      setError("");
      let succeeded = false;
      try {
        await restoreNoteFn({
          data: { id: target.id, operationId: target.operationId },
        });
        succeeded = true;
        if (latestOperation.current === target.operationId) setRestored(true);
        await router.invalidate();
      } catch (cause) {
        if (latestOperation.current === target.operationId)
          setError(
            `${succeeded ? "復元は完了しましたが、一覧を更新できませんでした。" : "元に戻せませんでした。"}${displayError(cause)}`,
          );
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <TrashContext value={notify}>
      {receipt && (
        <section
          ref={toast}
          tabIndex={-1}
          className="hollow-trash-toast"
          aria-label="ゴミ箱の操作結果"
        >
          <p role="status">
            「{receipt.title}」を
            {restored ? "復元しました。" : "ゴミ箱へ移動しました。"}
          </p>
          <div className="hollow-trash-actions">
            {!restored && (
              <button
                className="hollow-button"
                type="button"
                disabled={pending}
                onClick={undo}
              >
                {pending ? "復元中…" : "元に戻す"}
              </button>
            )}
            {restored ? (
              <Link
                className="hollow-button"
                to="/notes/$noteId"
                params={{ noteId: receipt.id }}
              >
                ノートを開く
              </Link>
            ) : (
              <Link to="/trash">ゴミ箱を見る</Link>
            )}
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                setReceipt(null);
                latestOperation.current = null;
              }}
            >
              通知を閉じる
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
      {children}
    </TrashContext>
  );
}

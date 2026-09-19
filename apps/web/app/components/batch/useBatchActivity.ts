"use client";
import type { BatchView } from "@repo/core/application/batch/ports";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useBrowseContext } from "@/components/browse/BrowseContext";
import {
  batchActivityFn,
  listBatchesFn,
  watchBatchesFn,
} from "@/presentation/batchServerFn";
import { useBatchSelection } from "./BatchSelectionProvider";
import { activeBatchWatches, batchKindLabel, batchWatchIds } from "./model";

export function useBatchActivity() {
  const router = useRouter();
  const { userId } = useBrowseContext();
  const selection = useBatchSelection();
  const requested = useRef(selection.watchIds);
  requested.current = selection.watchIds;
  const requestedSignal = useRef(selection.watchSignal);
  requestedSignal.current = selection.watchSignal;
  const [state, setState] = useState<{
    actor: string | null;
    active: number;
    failed: number;
    error: boolean;
  }>({ actor: userId, active: 0, failed: 0, error: false });
  const [toast, setToast] = useState<{ actor: string; text: string } | null>(
    null,
  );
  const watched = useRef<readonly BatchView[]>([]);
  useEffect(() => {
    let disposed = false;
    let reading = false;
    watched.current = [];
    const notified = new Map<string, string>();
    let signalRevision = -1;
    const read = async () => {
      if (!userId || disposed || reading) return;
      reading = true;
      try {
        const [summary, page] = await Promise.all([
          batchActivityFn(),
          listBatchesFn({ data: { scope: "unfinished" } }),
        ]);
        if (disposed) return;
        const signal = requestedSignal.current;
        if (signal && signal.revision !== signalRevision) {
          notified.delete(signal.id);
          signalRevision = signal.revision;
        }
        const ids = batchWatchIds(requested.current, watched.current, notified);
        const results = ids.length
          ? await watchBatchesFn({ data: { ids } })
          : [];
        if (disposed) return;
        const terminal = results.filter(
          (item) =>
            item.counts.queued + item.counts.running === 0 &&
            notified.get(item.id) !==
              JSON.stringify([item.generation, item.state, item.counts]),
        );
        watched.current = activeBatchWatches([...results, ...page.items]);
        for (const item of terminal)
          notified.set(
            item.id,
            JSON.stringify([item.generation, item.state, item.counts]),
          );
        for (const id of notified.keys())
          if (!requested.current.includes(id) && !ids.includes(id))
            notified.delete(id);
        setState({ actor: userId, ...summary, error: false });
        if (terminal.length) {
          const failed = terminal.filter(
            (item) => item.counts.failed > 0,
          ).length;
          const cancelled = terminal.filter(
            (item) => item.counts.cancelled > 0,
          ).length;
          setToast({
            actor: userId,
            text: `${batchKindLabel[terminal[0]?.kind ?? "tag"]}：${terminal.length}件の親処理が終了（失敗あり${failed}件・取消あり${cancelled}件）。子ごとの結果を確認できます。`,
          });
          await router.invalidate();
        }
      } catch {
        if (!disposed)
          setState((previous) => ({ ...previous, actor: userId, error: true }));
      } finally {
        reading = false;
      }
    };
    void read();
    const timer = setInterval(() => void read(), 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [router, userId]);
  return {
    active: state.actor === userId ? state.active : 0,
    failed: state.actor === userId ? state.failed : 0,
    error: state.actor === userId && state.error,
    toast: toast?.actor === userId ? toast.text : "",
    dismiss: () => setToast(null),
  };
}

"use client";
import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { driveBackupActivityFn } from "@/presentation/driveBackupServerFn";
import {
  activityInput,
  activityReadCurrent,
  beginActivityRead,
  emptyActivity,
  emptyActivityReadGate,
  finishActivityRead,
  invalidateActivityRead,
  prepareActivity,
  receiveActivity,
  sameActivityScope,
  watchActivity,
} from "./driveBackupActivityModel";
import { useSharingActor } from "./SharingActorProvider";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type ActivityContext = Readonly<{
  active: number;
  title: string | null;
  watch(id: string): void;
  refresh(): void;
}>;
const Context = createContext<ActivityContext>({
  active: 0,
  title: null,
  watch: () => {},
  refresh: () => {},
});

export function useDriveBackupActivity(): ActivityContext {
  return useContext(Context);
}

export function DriveBackupActivityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const sharing = useSharingActor();
  const currentActor = sharing?.currentActor;
  const actorId = sharing?.actor?.id ?? null;
  const actorEpoch = sharing?.actor?.epoch ?? null;
  const operation = useAuthenticationOperation();
  const [model, setModel] = useState(() => emptyActivity(null));
  const [error, setError] = useState(false);
  const live = useRef(model);
  const gate = useRef(emptyActivityReadGate());
  const mounted = useRef(false);
  const signedOut = useRef(false);
  const readRef = useRef<(fresh?: boolean) => void>(() => {});
  const publish = useCallback((next: typeof model) => {
    live.current = next;
    setModel(next);
  }, []);
  const read = useCallback(
    (fresh = false) => {
      if (!mounted.current || signedOut.current || document.hidden) return;
      const scope = currentActor?.() ?? null;
      if (!scope) return;
      if (!sameActivityScope(live.current.scope, scope)) {
        gate.current = invalidateActivityRead(gate.current);
        publish(emptyActivity(scope));
      }
      const started = beginActivityRead(gate.current, fresh);
      gate.current = started.gate;
      const requestTicket = started.ticket;
      if (!requestTicket) return;
      const valid = operation();
      const prepared = prepareActivity(live.current);
      live.current = prepared;
      const applicable = () =>
        mounted.current &&
        !signedOut.current &&
        !document.hidden &&
        activityReadCurrent(gate.current, requestTicket) &&
        sameActivityScope(scope, currentActor?.() ?? null) &&
        valid();
      void driveBackupActivityFn({ data: activityInput(prepared) })
        .then((page) => {
          if (!applicable()) return;
          publish(
            receiveActivity(live.current, page, currentActor?.() ?? null),
          );
          setError(false);
        })
        .catch(() => {
          if (applicable()) setError(true);
        })
        .finally(() => {
          const finished = finishActivityRead(gate.current, requestTicket);
          gate.current = finished.gate;
          if (finished.repeat) readRef.current();
        });
    },
    [currentActor, operation, publish],
  );
  useEffect(() => {
    readRef.current = read;
  }, [read]);
  useEffect(() => {
    void actorId;
    void actorEpoch;
    mounted.current = true;
    signedOut.current = false;
    gate.current = invalidateActivityRead(gate.current);
    publish(emptyActivity(currentActor?.() ?? null));
    setError(false);
    read(true);
    const resolved = router.subscribe("onResolved", () =>
      readRef.current(true),
    );
    const visibility = () => {
      gate.current = invalidateActivityRead(gate.current);
      if (!document.hidden) readRef.current(true);
    };
    const clear = () => {
      signedOut.current = true;
      gate.current = invalidateActivityRead(gate.current);
      publish(emptyActivity(null));
      setError(false);
    };
    const interval = window.setInterval(() => readRef.current(), 3_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("hollow:signed-out", clear);
    return () => {
      mounted.current = false;
      gate.current = invalidateActivityRead(gate.current);
      live.current = emptyActivity(null);
      window.clearInterval(interval);
      resolved();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("hollow:signed-out", clear);
    };
  }, [actorId, actorEpoch, currentActor, publish, read, router]);
  const watch = useCallback((id: string) => {
    if (!mounted.current || signedOut.current) return;
    live.current = watchActivity(live.current, id);
    readRef.current();
  }, []);
  const refresh = useCallback(() => readRef.current(true), []);
  const visible = sameActivityScope(model.scope, sharing?.actor ?? null)
    ? model
    : emptyActivity(null);
  const title =
    visible.active > 0
      ? (visible.parents.values().next().value?.title ?? null)
      : null;
  const context = useMemo(
    () => ({ active: visible.active, title, watch, refresh }),
    [visible.active, title, watch, refresh],
  );
  const notice = visible.notices[0];
  return (
    <Context.Provider value={context}>
      {children}
      {error && visible.scope && (
        <p role="status">
          バックアップ状況を確認できません。次の確認を待つか、履歴を再読してください。
        </p>
      )}
      {notice && (
        <aside
          aria-label="Driveバックアップの結果"
          role="status"
          className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg border bg-white p-4 shadow-lg"
        >
          <p className="break-words">
            {notice.title}：
            {notice.state === "succeeded"
              ? "Driveへのバックアップが完了しました。"
              : notice.state === "failed"
                ? "バックアップに失敗した項目があります。履歴を確認してください。"
                : "バックアップの取消結果を確認できます。"}
          </p>
          <a href="/notes/jobs">履歴を見る</a>{" "}
          <button
            type="button"
            onClick={() =>
              publish({
                ...live.current,
                notices: live.current.notices.filter(
                  (item) => item.key !== notice.key,
                ),
              })
            }
          >
            閉じる
          </button>
        </aside>
      )}
    </Context.Provider>
  );
}

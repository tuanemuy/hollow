"use client";
import { Link, useRouter } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSharingActor } from "../hollow/SharingActorProvider";
import {
  sendZip,
  type ZipCommand,
  type ZipJob,
  zipActive,
  zipActivitySchema,
  zipCommandSchema,
  zipJobSchema,
  zipRead,
  zipStateLabel,
} from "./client";

type ContextValue = {
  blocked: boolean;
  pending: boolean;
  changed: number;
  activeCount: number;
  representative: string | null;
  notice: string | null;
  error: boolean;
  dismiss: () => void;
  submit: (command: ZipCommand, accepted?: () => void) => void;
  observe: (job: ZipJob, explicit?: boolean) => void;
};
const Context = createContext<ContextValue | null>(null);
export const useZip = () => useContext(Context);
export function ZipProvider({ children }: { children: ReactNode }) {
  const actor = useSharingActor()?.actor;
  return actor ? (
    <Session
      key={`${actor.id}:${actor.epoch}`}
      actorId={actor.id}
      epoch={actor.epoch}
    >
      {children}
    </Session>
  ) : (
    <Context value={null}>{children}</Context>
  );
}
function Session({
  actorId,
  epoch,
  children,
}: {
  actorId: string;
  epoch: number;
  children: ReactNode;
}) {
  const actor = useSharingActor();
  const router = useRouter();
  const mounted = useRef(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const flight = useRef(false);
  const watched = useRef(new Map<string, number>());
  const turn = useRef<string[]>([]);
  const cursor = useRef<string | null>(null);
  const [command, setCommand] = useState<ZipCommand | null>(null);
  const held = useRef<ZipCommand | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [accepted, setAccepted] = useState<ZipJob | null>(null);
  const [pending, start] = useTransition();
  const [changed, setChanged] = useState(0);
  const [summary, setSummary] = useState({
    activeCount: 0,
    representative: null as string | null,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [pollError, setPollError] = useState(false);
  const storageKey = `hollow.zip.command.v1:${actorId}`;
  const current = useCallback(
    () =>
      mounted.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch,
    [actor, actorId, epoch],
  );
  const observe = useCallback(
    (job: ZipJob, explicit = false) => {
      if (!current() || job.actorId !== actorId) return;
      const previous = watched.current.get(job.id);
      if (previous !== undefined && previous > job.version) return;
      revision.current++;
      if (zipActive(job)) {
        if (!watched.current.has(job.id)) turn.current.push(job.id);
        watched.current.set(job.id, job.version);
      } else {
        watched.current.delete(job.id);
        turn.current = turn.current.filter((id) => id !== job.id);
        if (previous !== undefined || explicit)
          setNotice(
            `ZIPが${zipStateLabel[job.state]}しました。成功${job.succeeded}件・失敗${job.failed}件・除外${job.excluded}件・取消${job.cancelled}件。`,
          );
      }
      setChanged((value) => value + 1);
    },
    [current, actorId],
  );
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw !== null) {
        const saved = zipCommandSchema.parse(JSON.parse(raw));
        held.current = saved;
        setCommand(saved);
        setUnknown(true);
      }
      setStorageReady(true);
    } catch {
      setError(
        "受付情報を保存・確認できません。新しい要求は送信していません。ブラウザの保存設定を確認してください。",
      );
    }
    return () => {
      mounted.current = false;
    };
  }, [storageKey]);
  const clearCommand = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      setStorageReady(false);
    }
    held.current = null;
    setCommand(null);
    setUnknown(false);
  };
  const submit = (next: ZipCommand, callback?: () => void, repeat = false) => {
    if (
      !current() ||
      busy.current ||
      !storageReady ||
      (!repeat && held.current)
    )
      return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageReady(false);
      setError("受付情報を保存できないため、この要求は送信していません。");
      return;
    }
    held.current = next;
    setCommand(next);
    setUnknown(true);
    setAccepted(null);
    setError("");
    busy.current = true;
    start(async () => {
      try {
        const result = await sendZip(next);
        if (
          !current() ||
          held.current?.input.commandId !== next.input.commandId
        )
          return;
        if (result.kind === "accepted") {
          if (result.job.actorId !== actorId) {
            setError("現在の本人の受付結果を確認できません。");
            return;
          }
          clearCommand();
          setAccepted(result.job);
          observe(result.job, true);
          callback?.();
        } else if (result.kind === "rejected") {
          setUnknown(false);
          setError(result.message);
        } else
          setError(
            "受付結果が不明です。同じ要求を明示的に確認してください。自動再送はしません。",
          );
        await router.invalidate();
      } catch {
        if (current())
          setError("画面更新に失敗しました。処理履歴から確認できます。");
      } finally {
        busy.current = false;
      }
    });
  };
  const lookup = () => {
    const next = held.current;
    if (!next || busy.current || !current()) return;
    busy.current = true;
    start(async () => {
      try {
        const job = await zipRead(
          `/api/zip/requests?command=${next.input.commandId}`,
          zipJobSchema.nullable(),
        );
        if (
          !current() ||
          held.current?.input.commandId !== next.input.commandId
        )
          return;
        if (job?.actorId === actorId) {
          clearCommand();
          setAccepted(job);
          observe(job, true);
          setError("");
        } else
          setError(
            "この操作IDの受付はまだ確認できません。同じ内容の明示再送で確認できます。新しいIDには置き換えません。",
          );
      } catch {
        if (current())
          setError("受付を照会できません。要求情報は保持しています。");
      } finally {
        busy.current = false;
      }
    });
  };
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (disposed || !current()) return;
      if (flight.current) {
        timer = setTimeout(poll, 2000);
        return;
      }
      flight.current = true;
      const own = revision.current;
      const ids = turn.current.slice(0, 50);
      const params = new URLSearchParams();
      if (cursor.current) params.set("after", cursor.current);
      for (const id of ids) params.append("watch", id);
      try {
        const page = await zipRead(
          `/api/zip/activity?${params}`,
          zipActivitySchema,
        );
        if (disposed || !current() || own !== revision.current) return;
        if (page.actorId !== actorId) throw Error("actor");
        turn.current = [...turn.current.slice(ids.length), ...ids];
        for (const id of ids) {
          const row = page.watched.find((job) => job.id === id);
          if (row) observe(row);
          else {
            watched.current.delete(id);
            turn.current = turn.current.filter((value) => value !== id);
          }
        }
        for (const row of page.active) {
          if (!watched.current.has(row.id)) turn.current.push(row.id);
          watched.current.set(
            row.id,
            Math.max(watched.current.get(row.id) ?? 0, row.version),
          );
        }
        cursor.current = page.next;
        setSummary({
          activeCount: page.summary.activeCount,
          representative: page.summary.representative?.title ?? null,
        });
        setPollError(false);
      } catch {
        if (!disposed && current() && own === revision.current)
          setPollError(true);
      } finally {
        flight.current = false;
        if (!disposed && current()) timer = setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [actorId, current, observe]);
  return (
    <Context
      value={{
        blocked: !storageReady || !!command,
        pending,
        changed,
        ...summary,
        notice,
        error: pollError,
        dismiss: () => setNotice(null),
        submit,
        observe,
      }}
    >
      {children}
      {(command || error) && (
        <aside className="batch-receipt" aria-live="polite" aria-busy={pending}>
          <p>
            {pending
              ? "ZIPの受付結果を確認しています…"
              : unknown
                ? "受付結果は未確認です。要求IDと内容を保持しています。"
                : "ZIPを受け付けられませんでした。"}
          </p>
          {error && <p role="alert">{error}</p>}
          {command && unknown && (
            <>
              <button type="button" disabled={pending} onClick={lookup}>
                受付を照会
              </button>
              <button
                type="button"
                disabled={pending || !storageReady}
                onClick={() => submit(command, undefined, true)}
              >
                同じ要求を再送して確認
              </button>
            </>
          )}
          {command && !unknown && (
            <button type="button" disabled={pending} onClick={clearCommand}>
              確認をやり直す
            </button>
          )}
          <Link to="/notes/jobs">本人の処理履歴</Link>
        </aside>
      )}
      {accepted && (
        <aside className="batch-receipt" role="status">
          <p>
            ZIPの要求を受け付けました。{accepted.total}
            件。画面を閉じても処理は続きます。
          </p>
          <Link to="/notes/jobs">ZIPの結果を確認</Link>
          <button type="button" onClick={() => setAccepted(null)}>
            閉じる
          </button>
        </aside>
      )}
    </Context>
  );
}

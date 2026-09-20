"use client";
import type { PdfJobView } from "@repo/core/application/pdf/usecases";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSharingActor } from "../hollow/SharingActorProvider";
import {
  applyWatched,
  nextWatch,
  observeActive,
  type PdfActivityState,
} from "./activityModel";
import { pdfActivitySchema, pdfJson } from "./client";
import { writePdfPending } from "./pending";

type Activity = {
  activeCount: number;
  representative: string | null;
  notice: string | null;
  error: boolean;
  changed: number;
  receipt: (job: PdfJobView, explicit?: boolean) => void;
  dismiss: () => void;
};
const Context = createContext<Activity | null>(null);
export const usePdfActivity = () => useContext(Context);
export function PdfActivityProvider({ children }: { children: ReactNode }) {
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
    <Context.Provider value={null}>{children}</Context.Provider>
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
  const mounted = useRef(false);
  const revision = useRef(0);
  const flight = useRef(false);
  const watch = useRef<PdfActivityState>({ watch: new Map(), turn: [] });
  const after = useRef<string | null>(null);
  const notified = useRef(new Set<string>());
  const [summary, setSummary] = useState({
    activeCount: 0,
    representative: null as string | null,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [changed, setChanged] = useState(0);
  const current = useCallback(
    () =>
      mounted.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch,
    [actor, actorId, epoch],
  );
  const announce = useCallback(
    (rows: readonly { id: string; state: string; title: string }[]) => {
      const unseen = rows.filter((row) => !notified.current.has(row.id));
      if (!unseen.length) return;
      for (const row of unseen) notified.current.add(row.id);
      while (notified.current.size > 100) {
        const first = notified.current.values().next().value;
        if (first) notified.current.delete(first);
        else break;
      }
      const last = unseen.at(-1);
      if (!last) return;
      const label =
        last.state === "succeeded"
          ? "完了"
          : last.state === "failed"
            ? "失敗"
            : "取り消し";
      setNotice(
        `PDFの処理が${label}しました: ${last.title || "無題"}${unseen.length > 1 ? `（ほか${unseen.length - 1}件）` : ""}`,
      );
      setChanged((value) => value + 1);
    },
    [],
  );
  const receipt = (job: PdfJobView, explicit = false) => {
    if (!current() || job.actorId !== actorId) return;
    const prior = watch.current.watch.get(job.id);
    if (prior !== undefined && job.version < prior) return;
    if (
      job.state !== "queued" &&
      job.state !== "running" &&
      prior === undefined &&
      !explicit
    )
      return;
    if (
      (job.state === "queued" || job.state === "running") &&
      prior === job.version
    )
      return;
    revision.current++;
    if (job.state === "queued" || job.state === "running")
      watch.current = observeActive(watch.current, [job]);
    else {
      const included = explicit
        ? observeActive(watch.current, [job])
        : watch.current;
      watch.current = applyWatched(included, [job.id], [job]).state;
      writePdfPending(actorId, job.noteId, null, job.commandId);
      announce([job]);
    }
    setChanged((value) => value + 1);
  };
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const poll = async () => {
      if (disposed || !current()) return;
      if (flight.current) {
        timer = setTimeout(poll, 2000);
        return;
      }
      flight.current = true;
      const own = revision.current;
      const next = nextWatch(watch.current);
      const cursor = after.current;
      const query = new URLSearchParams();
      if (cursor) query.set("after", cursor);
      for (const id of next.requestedIds) query.append("watch", id);
      try {
        const { response, value } = await pdfJson(`/api/pdf-activity?${query}`);
        if (!response.ok) throw Error("pdf-activity");
        const page = pdfActivitySchema.parse(value);
        if (disposed || !current() || own !== revision.current) return;
        if (page.actorId !== actorId) throw Error("pdf-actor");
        const result = applyWatched(
          next.state,
          next.requestedIds,
          page.watched,
        );
        watch.current = observeActive(result.state, page.active);
        after.current = page.nextActive;
        for (const terminal of result.notifications) {
          const row = page.watched.find((value) => value.id === terminal.id);
          if (row) writePdfPending(actorId, row.noteId, null, row.commandId);
        }
        announce(result.notifications);
        setSummary({
          activeCount: page.activeCount,
          representative: page.representative?.title ?? null,
        });
        setError(false);
      } catch {
        if (!disposed && current() && own === revision.current) setError(true);
      } finally {
        flight.current = false;
        if (!disposed && current()) timer = setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => {
      disposed = true;
      mounted.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [actorId, current, announce]);
  if (
    actor?.currentActor()?.id !== actorId ||
    actor.currentActor()?.epoch !== epoch
  )
    return <Context.Provider value={null}>{children}</Context.Provider>;
  return (
    <Context.Provider
      value={{
        ...summary,
        notice,
        error,
        changed,
        receipt,
        dismiss: () => {
          if (current()) setNotice(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

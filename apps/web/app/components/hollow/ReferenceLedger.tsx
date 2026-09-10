"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  controlReferenceFn,
  listReferenceJobsFn,
  readReferencesFn,
} from "@/presentation/hollowReferences";

const states = {
  acquired: "取得済み",
  unattempted: "未試行",
  failed: "取得失敗",
  limited: "制限で未適用",
  external: "取得対象外の依存",
  cancelled: "取消済み",
} as const;
const kinds = {
  image: "画像",
  video: "動画",
  stylesheet: "CSS",
  background: "背景画像",
  font: "フォント",
} as const;
type Ledger = Awaited<ReturnType<typeof readReferencesFn>>;

export function ReferenceLedger({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [pending, start] = useTransition();
  const previous = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit retry restarts the failed read.
  useEffect(() => {
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const result = await readReferencesFn({ data: { noteId } });
        if (disposed) return;
        setData(result);
        setError("");
        const state = result.job?.state ?? "none";
        if (
          ["queued", "running"].includes(previous.current ?? "") &&
          !["queued", "running"].includes(state)
        )
          await router.invalidate();
        previous.current = state;
      } catch (cause) {
        if (!disposed) setError(displayError(cause));
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [noteId, router, refresh]);
  const mutate = (action: "on" | "off" | "retry" | "cancel") =>
    start(async () => {
      setError("");
      try {
        await controlReferenceFn({ data: { noteId, action } });
        const result = await readReferencesFn({ data: { noteId } });
        previous.current = result.job?.state ?? "none";
        setData(result);
        await router.invalidate();
      } catch (cause) {
        setError(displayError(cause));
      }
    });
  const active =
    data?.job?.state === "queued" || data?.job?.state === "running";
  return (
    <section className="hollow-original" aria-label="参照リソースの取り込み">
      <h2>参照リソース</h2>
      {error && (
        <p className="hollow-message" role="alert">
          {error}{" "}
          <button
            type="button"
            className="hollow-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            再読み込み
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">参照の記録を読み込み中…</p>
      ) : (
        <>
          <label className="hollow-check">
            <input
              type="checkbox"
              checked={data.enabled}
              disabled={pending}
              onChange={(event) => mutate(event.target.checked ? "on" : "off")}
            />
            参照画像・動画・CSSを取り込む
          </label>
          <p className="hollow-help">
            取得済みの内容は保持します。オフでも候補を残し、後から取り込めます。背景画像・フォントは取得せず外部依存として記録します。
          </p>
          <p>
            現在 {data.entries.filter((entry) => entry.current).length} 件 ·
            取得済み{" "}
            {
              data.entries.filter(
                (entry) => entry.current && entry.state === "acquired",
              ).length
            }{" "}
            件 · 未取得{" "}
            {
              data.entries.filter(
                (entry) =>
                  entry.current &&
                  ["failed", "unattempted", "limited", "cancelled"].includes(
                    entry.state,
                  ),
              ).length
            }{" "}
            件 · 外部依存{" "}
            {
              data.entries.filter(
                (entry) => entry.current && entry.state === "external",
              ).length
            }{" "}
            件
          </p>
          {active && (
            <div role="status">
              <p>
                {data.job?.cancelRequested
                  ? "取消待ち（現在の取得完了を待っています）"
                  : data.job?.state === "queued"
                    ? "参照の取り込み待機中"
                    : "参照を取り込み中"}{" "}
                · {data.job?.completed} / {data.job?.total} 件
              </p>
              <progress
                max={Math.max(1, data.job?.total ?? 0)}
                value={data.job?.completed ?? 0}
                aria-label="参照取り込みの進捗"
              />
              <button
                type="button"
                className="hollow-button"
                disabled={pending || data.job?.cancelRequested}
                onClick={() => {
                  if (
                    window.confirm(
                      "未開始の参照取得を取り消しますか？現在の1件は完了を待ち、取得済みの本文・リソースは保持します。",
                    )
                  )
                    mutate("cancel");
                }}
              >
                未開始分を取り消す
              </button>
            </div>
          )}
          {data.job?.state === "failed" && (
            <p className="hollow-message" role="alert">
              {data.job.failure}
            </p>
          )}
          {data.job?.state === "cancelled" && (
            <p role="status">
              参照の取り込みは取り消されました。取得済みを保持しています。未開始分は再試行できます。
            </p>
          )}
          {!active &&
            data.entries.some(
              (entry) =>
                entry.current &&
                ["failed", "limited", "cancelled", "unattempted"].includes(
                  entry.state,
                ),
            ) && (
              <button
                type="button"
                className="hollow-button"
                disabled={pending}
                onClick={() => mutate(data.enabled ? "retry" : "on")}
              >
                {pending
                  ? "受け付け中…"
                  : data.enabled
                    ? "未取得の参照を再試行"
                    : "参照取り込みをオンにする"}
              </button>
            )}
          {!data.entries.length ? (
            <p>参照リソースはありません。</p>
          ) : (
            <ul>
              {data.entries.map((entry) => (
                <li key={entry.id}>
                  <p>
                    {entry.kind === "stylesheet" &&
                    !entry.current &&
                    entry.state === "limited"
                      ? "安全化・CSS除去"
                      : kinds[entry.kind]}{" "}
                    · {states[entry.state]}
                    {entry.current ? "" : " · 過去の参照"}
                    {entry.bytes
                      ? ` · ${(entry.bytes / 1024).toFixed(1)} KB`
                      : ""}
                  </p>
                  <p className="hollow-help">
                    {entry.url.startsWith("data:")
                      ? `data URI（${entry.url.slice(5, entry.url.indexOf(",")).slice(0, 60)}）`
                      : entry.url}
                  </p>
                  <p>{entry.location}</p>
                  {entry.reason && (
                    <p className="hollow-message">{entry.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function ReferenceJobHistory() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Awaited<
    ReturnType<typeof listReferenceJobsFn>
  > | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const data = await listReferenceJobsFn();
        if (!disposed) setJobs(data);
      } catch (cause) {
        if (!disposed) setError(displayError(cause));
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  const mutate = (noteId: string, action: "retry" | "cancel" | "on") =>
    start(async () => {
      setError("");
      try {
        await controlReferenceFn({ data: { noteId, action } });
        setJobs(await listReferenceJobsFn());
        await router.invalidate();
      } catch (cause) {
        setError(displayError(cause));
      }
    });
  const names = {
    queued: "待機中",
    running: "取得中",
    succeeded: "完了",
    failed: "失敗",
    cancelled: "取消済み",
  } as const;
  return (
    <section className="hollow-original" aria-label="参照取り込みの処理履歴">
      <h2>参照取り込みの履歴</h2>
      <p>
        自分が実行した直近90日の処理です。元URLと取得結果はノートの参照記録にも残ります。
      </p>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {jobs === null ? (
        <p role="status">履歴を読み込み中…</p>
      ) : !jobs.length ? (
        <p>参照取り込みの履歴はありません。</p>
      ) : (
        <ul>
          {jobs.map((job) => (
            <li key={job.id}>
              <p className="hollow-trash-title">{job.name}</p>
              {job.targetAvailable ? (
                <Link to="/notes/$noteId" params={{ noteId: job.noteId }}>
                  ノートの参照記録を開く
                </Link>
              ) : (
                <span>
                  {job.targetDeleted
                    ? "対象は完全削除済み。取り込み直し不可。"
                    : "対象はゴミ箱にあるか、利用できません。"}
                </span>
              )}
              <p>
                {names[job.state]} · {job.completed} / {job.total} 件
                {job.cancelRequested &&
                ["queued", "running"].includes(job.state)
                  ? " · 現在の取得完了後に取消"
                  : ""}
              </p>
              <time dateTime={job.createdAt}>
                {new Date(job.createdAt).toLocaleString("ja-JP", {
                  timeZone: "Asia/Tokyo",
                })}
              </time>
              {job.failure && <p className="hollow-message">{job.failure}</p>}
              {job.targetAvailable &&
                (["queued", "running"].includes(job.state) ? (
                  <button
                    type="button"
                    className="hollow-button"
                    disabled={pending || job.cancelRequested}
                    onClick={() => {
                      if (
                        window.confirm(
                          "現在の取得は完了を待ち、未開始の参照を取り消しますか？取得済みの内容は保持します。",
                        )
                      )
                        mutate(job.noteId, "cancel");
                    }}
                  >
                    未開始分を取り消す
                  </button>
                ) : (
                  ["failed", "cancelled"].includes(job.state) && (
                    <button
                      type="button"
                      className="hollow-button"
                      disabled={
                        pending ||
                        jobs.some(
                          (other) =>
                            other.noteId === job.noteId &&
                            ["queued", "running"].includes(other.state),
                        )
                      }
                      onClick={() =>
                        mutate(
                          job.noteId,
                          job.state === "cancelled" ? "on" : "retry",
                        )
                      }
                    >
                      {job.state === "cancelled"
                        ? "未取得参照を取り込み直す"
                        : "ノートの未取得参照を再試行"}
                    </button>
                  )
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

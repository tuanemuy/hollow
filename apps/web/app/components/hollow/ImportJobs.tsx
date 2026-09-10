"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  cancelImportFn,
  listImportsFn,
  retryImportFn,
} from "@/presentation/hollowImports";
import { listReferenceJobsFn } from "@/presentation/hollowReferences";
import { jobDuration } from "./importSelection";
import { ReferenceJobHistory } from "./ReferenceLedger";
import "./import.css";
export const noteStatus = {
  processing: "変換中",
  ready: "保存済み",
  needs_ai: "要AI連携",
  failed: "変換失敗",
  cancelled: "取消済み",
} as const;
export const jobStatus = {
  queued: "待機中",
  running: "変換中",
  succeeded: "完了",
  failed: "失敗",
  cancelled: "取消済み",
} as const;
type Imports = Awaited<ReturnType<typeof listImportsFn>>;
export function ImportJobs({ initial }: { initial: Imports }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => setData(initial), [initial]);
  useEffect(() => {
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const result = await listImportsFn();
        if (!disposed) setData(result);
      } catch (cause) {
        if (!disposed) setError(displayError(cause));
      } finally {
        polling = false;
      }
    };
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  const mutate = (action: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        await action();
        setData(await listImportsFn());
        await router.invalidate();
      } catch (cause) {
        setError(displayError(cause));
      }
    });
  const retryFailed = (batch: Imports["batches"][number]) =>
    start(async () => {
      setError("");
      setMessage("");
      const failures: string[] = [];
      let accepted = 0;
      for (const job of batch.jobs.filter(
        (candidate) => candidate.state === "failed",
      )) {
        try {
          await retryImportFn({ data: { id: job.id } });
          accepted++;
        } catch (cause) {
          failures.push(`${job.name}: ${displayError(cause)}`);
        }
      }
      setMessage(
        `${accepted} 件の再試行を受け付けました。完了済みのノートは保持しています。`,
      );
      if (failures.length) setError(failures.join(" / "));
      try {
        setData(await listImportsFn());
        await router.invalidate();
      } catch (cause) {
        setError((previous) =>
          [previous, displayError(cause)].filter(Boolean).join(" / "),
        );
      }
    });
  return (
    <section>
      <p className="hollow-eyebrow">個人 / 自分の処理履歴</p>
      <h1>取り込みの履歴</h1>
      <p>直近90日。実行中の処理は画面を閉じても続きます。</p>
      <p className="hollow-help">
        原本・予約済み容量: {(data.usedBytes / 1024 / 1024).toFixed(1)} MB / 5
        GB
      </p>
      <Link className="hollow-button" to="/notes/import">
        ファイルを取り込む
      </Link>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {message && (
        <p className="hollow-message" role="status">
          {message}
        </p>
      )}
      {!data.batches.length && (
        <p className="hollow-empty">処理履歴はまだありません。</p>
      )}
      {data.batches.map((batch) => (
        <article key={batch.id} className="hollow-job-batch">
          <h2>
            {new Date(batch.createdAt).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })}{" "}
            の取り込み
          </h2>
          <p role="status">
            {batch.active ? "処理中" : "処理終了"} · 完了
            {batch.jobs.filter((j) => j.state === "succeeded").length} / 失敗
            {batch.jobs.filter((j) => j.state === "failed").length +
              batch.uploads.filter((u) => u.state === "failed").length}{" "}
            / 取消
            {batch.jobs.filter((j) => j.state === "cancelled").length +
              batch.uploads.filter((u) => u.state === "cancelled").length}
          </p>
          {batch.active && (
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    "未開始の取り込みを取り消しますか？保存済みの原本とノートは残ります。開始済みの変換は完了まで続きます。",
                  )
                )
                  mutate(() => cancelImportFn({ data: { id: batch.id } }));
              }}
            >
              未開始分を取り消す
            </button>
          )}
          {batch.jobs.some((job) => job.state === "failed") && (
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => retryFailed(batch)}
            >
              {pending
                ? "処理中…"
                : `失敗した ${batch.jobs.filter((job) => job.state === "failed").length} 件を再試行`}
            </button>
          )}
          {batch.uploads.some((upload) => upload.state === "failed") && (
            <p className="hollow-help">
              原本のアップロードに失敗したファイルは、ファイル選択から取り込み直してください。
            </p>
          )}
          <ul>
            {batch.uploads.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong>
                <p>
                  {u.state === "awaiting"
                    ? "アップロード待ち"
                    : u.state === "uploading"
                      ? "アップロード中"
                      : u.state === "cancelled"
                        ? "取消済み"
                        : "アップロード失敗"}
                </p>
                {u.failure && <p>{u.failure}</p>}
              </li>
            ))}
            {batch.jobs.map((job) => (
              <li key={job.id}>
                <Link to="/notes/$noteId" params={{ noteId: job.noteId }}>
                  {job.name}
                </Link>
                <p>
                  {jobStatus[job.state]} · {noteStatus[job.noteState]}
                  {job.coverage === "partial" ? " · 一部未取得あり" : ""}
                </p>
                <p className="hollow-help">
                  開始{" "}
                  <time dateTime={job.createdAt}>
                    {new Date(job.createdAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </time>{" "}
                  ·{" "}
                  {job.state === "queued" || job.state === "running"
                    ? "経過"
                    : "所要時間"}{" "}
                  {jobDuration(
                    job.createdAt,
                    job.state === "queued" || job.state === "running"
                      ? new Date().toISOString()
                      : job.updatedAt,
                  )}
                </p>
                {job.failure && <p className="hollow-message">{job.failure}</p>}
                {job.noteState === "needs_ai" && (
                  <p>
                    原本を保存しました。本文を作るにはAI連携が必要です（連携機能は準備中）。
                  </p>
                )}
                {(job.state === "failed" || job.state === "cancelled") && (
                  <button
                    type="button"
                    className="hollow-button"
                    disabled={pending}
                    onClick={() =>
                      mutate(() => retryImportFn({ data: { id: job.id } }))
                    }
                  >
                    再試行
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <ReferenceJobHistory />
    </section>
  );
}
export function ImportTicker() {
  const router = useRouter();
  const [data, setData] = useState<Imports | null>(null);
  const [toast, setToast] = useState("");
  const [referenceJobs, setReferenceJobs] = useState<
    Awaited<ReturnType<typeof listReferenceJobsFn>>
  >([]);
  const previous = useRef<Map<string, string> | null>(null);
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const [next, references] = await Promise.all([
          listImportsFn(),
          listReferenceJobsFn(),
        ]);
        if (!disposed) {
          const jobs = [
            ...next.batches.flatMap((batch) => batch.jobs),
            ...references.map((job) => ({
              ...job,
              name: "参照取り込み",
              noteState: null,
            })),
          ];
          setReferenceJobs(references);
          const completed =
            previous.current === null
              ? []
              : jobs.filter((job) => {
                  const old = previous.current?.get(job.id);
                  return (
                    (job.state === "succeeded" || job.state === "failed") &&
                    old !== job.state &&
                    (old === "queued" ||
                      old === "running" ||
                      (old === undefined &&
                        Date.parse(job.createdAt) >= mountedAt.current))
                  );
                });
          previous.current = new Map(jobs.map((job) => [job.id, job.state]));
          setData(next);
          if (completed.length) {
            const success = completed.filter(
              (job) => job.state === "succeeded",
            ).length;
            const failed = completed.filter(
              (job) => job.state === "failed",
            ).length;
            const needsAi = completed.filter(
              (job) => job.noteState === "needs_ai",
            ).length;
            setToast(
              `${completed[0]?.name ?? "取り込み"}${completed.length > 1 ? ` ほか ${completed.length - 1} 件` : ""}：完了 ${success} 件・失敗 ${failed} 件${needsAi ? `（要AI連携 ${needsAi} 件）` : ""}`,
            );
            await router.invalidate();
          }
        }
      } catch {
        /* Auth and detailed errors belong to the current route. */
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [router]);
  const activeJobs =
    data?.batches.flatMap((batch) =>
      batch.jobs.filter(
        (job) => job.state === "queued" || job.state === "running",
      ),
    ) ?? [];
  const activeUploads =
    data?.batches.flatMap((batch) =>
      batch.uploads.filter(
        (upload) => upload.state === "awaiting" || upload.state === "uploading",
      ),
    ) ?? [];
  const activeReferences = referenceJobs.filter(
    (job) => job.state === "queued" || job.state === "running",
  );
  const count =
    activeJobs.length + activeUploads.length + activeReferences.length;
  const representative =
    activeJobs.find((job) => job.state === "running")?.name ??
    activeUploads.find((upload) => upload.state === "uploading")?.name ??
    activeJobs[0]?.name ??
    activeUploads[0]?.name ??
    (activeReferences.length ? "参照取り込み" : undefined);
  return (
    <>
      <nav className="hollow-import-navigation" aria-label="取り込み">
        <Link to="/notes/import">アップロード</Link>
        <Link to="/notes/jobs">処理履歴</Link>
      </nav>
      {count > 0 && (
        <div className="hollow-import-active-ticker" role="status">
          <span>
            {count} 件を処理中 · {representative}
          </span>
          <Link to="/notes/jobs">処理履歴 →</Link>
        </div>
      )}
      {toast && (
        <div className="hollow-import-toast" role="status">
          <span>{toast}</span>
          <Link to="/notes/jobs">結果を見る</Link>
          <button
            type="button"
            aria-label="取り込み通知を閉じる"
            onClick={() => setToast("")}
          >
            閉じる
          </button>
        </div>
      )}
    </>
  );
}

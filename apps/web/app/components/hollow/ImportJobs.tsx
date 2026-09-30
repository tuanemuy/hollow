"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  BatchHistory,
  type BatchHistorySeed,
} from "@/components/batch/BatchHistory";
import { useBatchActivity } from "@/components/batch/useBatchActivity";
import { usePdfActivity } from "@/components/pdf/PdfActivityProvider";
import { useZip } from "@/components/zip/ZipProvider";
import { listEmptyTrashFn } from "@/presentation/hollowEmptyTrash";
import {
  cancelImportFn,
  listImportsFn,
  reimportNoteFn,
  retryImportFn,
} from "@/presentation/hollowImports";
import { listNotePurgesFn } from "@/presentation/hollowPurge";
import { listReferenceJobsFn } from "@/presentation/hollowReferences";
import { cancelLlmFn } from "@/presentation/llmServerFn";
import { scopeSearch } from "@/presentation/workspaceInput";
import { useDriveBackupActivity } from "./DriveBackupActivityProvider";
import { EmptyTrashHistory } from "./EmptyTrashHistory";
import { jobDuration } from "./importSelection";
import { LlmUsage } from "./LlmUsage";
import { llmDocumentMessage } from "./llmDocumentMessage";
import { llmError as displayError } from "./llmError";
import { PurgeHistory } from "./PurgeHistory";
import { purgeIsActive } from "./PurgeState";
import { ReferenceJobHistory } from "./ReferenceLedger";
import { useCurrentWorkspaceId } from "./WorkspaceScope";
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
export const needsAiNotice =
  "原本を保存しました。OpenRouter連携と各ノートの対応状況を確認してください。連携だけでは自動変換されません。対応する原本では、ノートから明示的に本文を再生成できます。";
type Imports = Awaited<ReturnType<typeof listImportsFn>>;
export function jobCompletionNotices(importToast: string, batchToast: string) {
  return [
    {
      kind: "import" as const,
      message: importToast,
      label: "取り込み通知を閉じる",
    },
    {
      kind: "batch" as const,
      message: batchToast,
      label: "一括処理通知を閉じる",
    },
  ].filter((notice) => notice.message);
}
export function importRecoveryAction(job: {
  state: keyof typeof jobStatus;
  targetAvailable: boolean;
}): "retry" | "reimport" | null {
  if (!job.targetAvailable) return null;
  if (job.state === "failed") return "retry";
  return job.state === "cancelled" ? "reimport" : null;
}
export function ImportJobs({
  initial,
  batches,
  selectedBatchId,
}: {
  initial: Imports;
  batches?: BatchHistorySeed | undefined;
  selectedBatchId?: string | undefined;
}) {
  const router = useRouter();
  const workspaceId = useCurrentWorkspaceId();
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const mutationBusy = useRef(false);
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
  const mutate = (action: () => Promise<unknown>) => {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    start(async () => {
      setError("");
      try {
        await action();
        setData(await listImportsFn());
        await router.invalidate();
      } catch (cause) {
        setError(displayError(cause));
      } finally {
        mutationBusy.current = false;
      }
    });
  };
  const retryFailed = (batch: Imports["batches"][number]) => {
    if (mutationBusy.current) return;
    if (
      batch.jobs.some(
        (job) => job.llm && importRecoveryAction(job) === "retry",
      ) &&
      !window.confirm(
        "失敗した変換を同じモデル・追加指示で再試行しますか？LLM は新しい月間使用回数・料金が発生する場合があります。連携が変わった処理は自動で新しい鍵に付け替えません。",
      )
    )
      return;
    mutationBusy.current = true;
    start(async () => {
      setError("");
      setMessage("");
      const failures: string[] = [];
      let accepted = 0;
      for (const job of batch.jobs.filter(
        (candidate) => importRecoveryAction(candidate) === "retry",
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
      } finally {
        mutationBusy.current = false;
      }
    });
  };
  return (
    <section>
      <p className="hollow-eyebrow">自分の処理履歴 / 保存先を横断</p>
      <h1>処理履歴</h1>
      <p>直近90日。実行中の処理は画面を閉じても続きます。</p>
      <LlmUsage
        refreshKey={data.batches
          .map((batch) => `${batch.id}:${batch.active}`)
          .join(",")}
      />
      <p className="hollow-help">
        個人・ワークスペースのうち、自分が依頼した処理だけを表示します。使用容量は各保存先のノート一覧や取り込み画面で確認できます。
      </p>
      <Link
        className="hollow-button"
        to="/notes/import"
        search={scopeSearch(workspaceId)}
      >
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
        <p className="hollow-empty">取り込みの履歴はまだありません。</p>
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
          {batch.jobs.some((job) => importRecoveryAction(job) === "retry") && (
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => retryFailed(batch)}
            >
              {pending
                ? "処理中…"
                : `失敗した ${batch.jobs.filter((job) => importRecoveryAction(job) === "retry").length} 件を再試行`}
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
                {job.targetAvailable ? (
                  <Link to="/notes/$noteId" params={{ noteId: job.noteId }}>
                    {job.name}
                  </Link>
                ) : (
                  <span>{job.name}</span>
                )}
                {!job.targetAvailable && (
                  <p className="hollow-help">
                    {job.targetDeleted
                      ? "対象は完全削除済み。取り込み直し不可。"
                      : "対象のノートを利用できません。削除済み、またはゴミ箱にあるノートは、開いたり取り込みを再実行したりできません。"}
                  </p>
                )}
                <p>
                  {jobStatus[job.state]}
                  {!job.targetDeleted && ` · ${noteStatus[job.noteState]}`}
                  {job.coverage === "partial" ? " · 一部未取得あり" : ""}
                </p>
                {job.llm && (
                  <p>
                    {job.llm.operation === "regenerate"
                      ? "本文再生成"
                      : "LLM変換"}{" "}
                    ·{" "}
                    {job.llm.pdfClassification === "pending"
                      ? "PDF用途確認中（モデル未確定）"
                      : job.llm.modelId}
                    {job.llm.ownershipUnconfirmed
                      ? " · 実処理の終了未確認（自動再送なし）"
                      : job.llm.outcome === "unknown"
                        ? " · 送信結果未確認（自動再送なし）"
                        : job.llm.cancelRequested && job.state === "running"
                          ? " · 取消要求済み・実終了待ち"
                          : ""}
                  </p>
                )}
                {job.llm?.operation === "regenerate" &&
                  job.state === "running" &&
                  !job.llm.cancelRequested && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            "再生成を取り消し、旧本文を保持しますか？実処理の終了まで待ち、送信済みの使用回数・料金は返却されません。",
                          )
                        )
                          mutate(() =>
                            cancelLlmFn({ data: { jobId: job.id } }),
                          );
                      }}
                    >
                      再生成を取り消す
                    </button>
                  )}
                {job.failure === "LLM_MONTHLY_LIMIT" && (
                  <p>
                    月間の AI
                    変換上限に達しました。text・DOCX・XLSX・PPTX・対応PDFは LLM
                    を使わず明示的に取り込むこともできます。AI
                    必須形式は次の月間枠をお待ちください。
                  </p>
                )}
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
                {job.failure && llmDocumentMessage(job.failure) && (
                  <p className="hollow-message">
                    {llmDocumentMessage(job.failure)}
                  </p>
                )}
                {!job.targetDeleted && job.noteState === "needs_ai" && (
                  <p>{needsAiNotice}</p>
                )}
                {importRecoveryAction(job) === "retry" && (
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
                {importRecoveryAction(job) === "reimport" && (
                  <button
                    type="button"
                    className="hollow-button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `「${job.name}」を保存済みの原本から取り込み直しますか？取り消した処理の再開ではなく、新しい処理を開始します。既に本文が編集されている場合は開始できません。`,
                        )
                      )
                        mutate(() =>
                          reimportNoteFn({ data: { noteId: job.noteId } }),
                        );
                    }}
                  >
                    取り込み直す
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <ReferenceJobHistory />
      <BatchHistory initial={batches} selectedBatchId={selectedBatchId} />
      <PurgeHistory />
      <EmptyTrashHistory />
    </section>
  );
}
export function ImportTicker() {
  const backup = useDriveBackupActivity();
  const pdf = usePdfActivity();
  const zip = useZip();
  const router = useRouter();
  const batch = useBatchActivity();
  const workspaceId = useCurrentWorkspaceId();
  const [data, setData] = useState<Imports | null>(null);
  const [toast, setToast] = useState("");
  const [emptyActive, setEmptyActive] = useState(0);
  const emptyCache = useRef<
    Awaited<ReturnType<typeof listEmptyTrashFn>>["items"]
  >([]);
  const [referenceJobs, setReferenceJobs] = useState<
    Awaited<ReturnType<typeof listReferenceJobsFn>>
  >([]);
  const [purgeJobs, setPurgeJobs] = useState<
    Awaited<ReturnType<typeof listNotePurgesFn>>["items"]
  >([]);
  const [purgeSummary, setPurgeSummary] = useState<
    Awaited<ReturnType<typeof listNotePurgesFn>>["summary"] | null
  >(null);
  const purgeCache = useRef<
    Awaited<ReturnType<typeof listNotePurgesFn>>["items"]
  >([]);
  const previous = useRef<Map<
    string,
    { state: string; updatedAt: string }
  > | null>(null);
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const [next, references, purges, empty] = await Promise.all([
          listImportsFn(),
          listReferenceJobsFn(),
          listNotePurgesFn({
            data: { watch: purgeCache.current.slice(0, 50).map((p) => p.id) },
          }).catch(() => null),
          listEmptyTrashFn({
            data: {
              watch: emptyCache.current.slice(0, 50).map((job) => job.id),
            },
          }).catch(() => null),
        ]);
        if (!disposed) {
          if (empty) {
            emptyCache.current = empty.items;
            setEmptyActive(empty.summary.active);
          }
          if (purges) {
            purgeCache.current = purges.items;
            setPurgeJobs(purges.items);
            setPurgeSummary(purges.summary);
          }
          const jobs = [
            ...(empty
              ? [
                  ...new Map(
                    [...empty.items, ...empty.observed].map((job) => [
                      job.id,
                      job,
                    ]),
                  ).values(),
                ]
              : emptyCache.current
            ).map((job) => ({
              ...job,
              id: `empty:${job.id}`,
              name: `ゴミ箱を空にする（${job.counts.total}件）`,
              noteState: null,
            })),
            ...next.batches.flatMap((batch) =>
              batch.jobs.map((job) => ({ ...job, id: `conversion:${job.id}` })),
            ),
            ...references.map((job) => ({
              ...job,
              id: `reference:${job.id}`,
              name: `参照取り込み：${job.name}`,
              noteState: null,
            })),
            ...(purges
              ? [
                  ...new Map(
                    [...purges.items, ...purges.observed].map((p) => [p.id, p]),
                  ).values(),
                ]
              : purgeCache.current
            ).map((job) => ({
              ...job,
              id: `purge:${job.id}`,
              name: `完全削除：${job.title}`,
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
                    (old?.state === "queued" ||
                      old?.state === "running" ||
                      ((job.id.startsWith("purge:") ||
                        job.id.startsWith("empty:")) &&
                        old !== undefined &&
                        "updatedAt" in job &&
                        old.updatedAt !== job.updatedAt) ||
                      (old === undefined &&
                        Date.parse(job.createdAt) >= mountedAt.current))
                  );
                });
          previous.current = new Map(
            jobs.map((job) => [
              job.id,
              {
                state: job.state,
                updatedAt: "updatedAt" in job ? job.updatedAt : job.createdAt,
              },
            ]),
          );
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
  const activePurges = purgeJobs.filter(purgeIsActive);
  const count =
    activeJobs.length +
    activeUploads.length +
    activeReferences.length +
    emptyActive +
    (purgeSummary?.active ?? activePurges.length) +
    batch.active +
    (pdf?.activeCount ?? 0) +
    (zip?.activeCount ?? 0) +
    backup.active;
  const representative =
    activeJobs.find((job) => job.state === "running")?.name ??
    activeUploads.find((upload) => upload.state === "uploading")?.name ??
    activeJobs[0]?.name ??
    activeUploads[0]?.name ??
    (activeReferences.length
      ? `参照取り込み：${activeReferences[0]?.name}`
      : undefined) ??
    (purgeSummary?.representative
      ? `完全削除：${purgeSummary.representative.title}`
      : activePurges.length
        ? `完全削除：${activePurges[0]?.title}`
        : undefined) ??
    (emptyActive ? "ゴミ箱を空にする" : undefined) ??
    (batch.active ? "一括整理" : undefined) ??
    (pdf?.activeCount ? `PDF：${pdf.representative || "無題"}` : undefined) ??
    (zip?.activeCount
      ? `ZIP：${zip.representative || "一括ダウンロード"}`
      : undefined) ??
    (backup.active
      ? `原本バックアップ：${backup.title ?? "処理中"}`
      : undefined);
  return (
    <>
      <nav className="hollow-import-navigation" aria-label="取り込み">
        <Link to="/notes/import" search={scopeSearch(workspaceId)}>
          アップロード
        </Link>
        <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
          処理履歴
        </Link>
      </nav>
      {batch.error && (
        <p role="status" className="hollow-help">
          一括処理の最新件数を取得できません。未取得を完了とは扱いません。処理履歴から再確認できます。
        </p>
      )}
      {pdf?.error && (
        <p role="status" className="hollow-help">
          PDF処理の最新件数を取得できません。未取得を完了とは扱いません。処理履歴から再確認できます。
        </p>
      )}
      {zip?.error && (
        <p role="status" className="hollow-help">
          ZIPの最新状態を取得できません。未取得を完了とは扱いません。処理履歴から確認できます。
        </p>
      )}
      {count > 0 && (
        <div className="hollow-import-active-ticker" role="status">
          <span>
            {count} 件を処理中 · {representative}
          </span>
          <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
            処理履歴 →
          </Link>
        </div>
      )}
      {(toast || batch.toast || pdf?.notice || zip?.notice) && (
        <div className="hollow-job-notices">
          {jobCompletionNotices(toast, batch.toast).map((notice) => (
            <div
              className="hollow-import-toast"
              role="status"
              key={notice.kind}
            >
              <span>{notice.message}</span>
              <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
                結果を見る
              </Link>
              <button
                type="button"
                aria-label={notice.label}
                onClick={() => {
                  if (notice.kind === "import") setToast("");
                  else batch.dismiss();
                }}
              >
                閉じる
              </button>
            </div>
          ))}
          {pdf?.notice && (
            <div className="hollow-import-toast" role="status">
              <span>{pdf.notice}</span>
              <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
                結果を見る
              </Link>
              <button
                type="button"
                aria-label="PDFの通知を閉じる"
                onClick={pdf.dismiss}
              >
                閉じる
              </button>
            </div>
          )}
          {zip?.notice && (
            <div className="hollow-import-toast" role="status">
              <span>{zip.notice}</span>
              <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
                結果を見る
              </Link>
              <button
                type="button"
                aria-label="ZIPの通知を閉じる"
                onClick={zip.dismiss}
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

"use client";
import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { z } from "zod";
import { jobDuration } from "../hollow/importSelection";
import { useSharingActor } from "../hollow/SharingActorProvider";
import {
  downloadZip,
  type ZipJob,
  zipActive,
  zipDetailsSchema,
  zipJobSchema,
  zipListSchema,
  zipNeedsNewRequest,
  zipRead,
  zipRetryPreviewSchema,
  zipStateLabel,
} from "./client";
import { useZip } from "./ZipProvider";

const failureMessages: Readonly<Record<string, string>> = {
  ZIP_TOO_LARGE:
    "生成した内容が1GBを超えました。対象を分割して新しく書き出してください。",
  ZIP_CAPACITY:
    "生成用の空き容量を確保できません。時間を置くか、対象を分割してください。",
  ZIP_DISK_BUSY:
    "生成用ディスクの空きが不足しています。時間を置いて確認してください。",
  ZIP_DEADLINE:
    "生成に時間がかかりすぎました。対象を分割してやり直してください。",
  ZIP_TIMEOUT: "生成期限に達しました。対象を分割してやり直してください。",
  ZIP_CHILD_DEADLINE:
    "この対象の生成期限に達しました。内容を確認して再試行してください。",
  ZIP_STAGE_DEADLINE:
    "生成工程の期限に達しました。対象を分割してやり直してください。",
  ZIP_INTERRUPTED:
    "生成処理が中断されました。現在の内容を確認してやり直してください。",
  ZIP_OWNERSHIP_UNKNOWN:
    "資源が安全に終了したか確認できません。現在は再試行できません。管理者による安全確認が必要です。",
  ZIP_EXECUTION_UNPROVEN:
    "生成処理の終了を確認できません。安全確認が終わるまで新しい処理は開始できません。",
  ZIP_CONTENT_CHANGED: "保存済みの内容が変わったため、この対象を除外しました。",
  ZIP_NOTE_UNAVAILABLE: "対象を現在閲覧できないため、除外しました。",
  ZIP_SOURCE_CHANGED: "保存した参照素材が変わったため、除外しました。",
  EXPORT_MEDIA_UNAVAILABLE:
    "参照素材を読み込めません。現在のノートを確認してください。",
  ZIP_NO_OUTPUT:
    "ZIPへ含められるファイルが残っていません。対象を選び直してください。",
};
export function zipFailure(code: string | null) {
  return code
    ? (failureMessages[code] ??
        "生成に失敗しました。現在の内容・権限を確認してから再試行してください。")
    : "";
}
type Page = z.infer<typeof zipListSchema>;
type Details = z.infer<typeof zipDetailsSchema>;
type RetryPreview = z.infer<typeof zipRetryPreviewSchema>;
export function ZipHistory() {
  const actor = useSharingActor()?.actor;
  return actor ? (
    <History
      key={`${actor.id}:${actor.epoch}`}
      actorId={actor.id}
      epoch={actor.epoch}
    />
  ) : null;
}
function History({ actorId, epoch }: { actorId: string; epoch: number }) {
  const actor = useSharingActor();
  const activity = useZip();
  const router = useRouter();
  const mounted = useRef(false);
  const revision = useRef(0);
  const flight = useRef(false);
  const busy = useRef(false);
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<readonly ZipJob[]>([]);
  const [cursor, setCursor] = useState<Page["next"]>(null);
  const [next, setNext] = useState<Page["next"]>(null);
  const [error, setError] = useState("");
  const [newRequestRequired, setNewRequestRequired] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [details, setDetails] = useState<Details | null>(null);
  const [retry, setRetry] = useState<{
    preview: RetryPreview;
    ordinals: number[];
  } | null>(null);
  const current = useCallback(
    () =>
      mounted.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch,
    [actor, actorId, epoch],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    void refresh;
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
      try {
        const query = cursor
          ? `?${new URLSearchParams({ id: cursor.requestId, generation: String(cursor.generation), at: cursor.acceptedAt })}`
          : "";
        const page = await zipRead(`/api/zip/requests${query}`, zipListSchema);
        if (disposed || !current() || own !== revision.current) return;
        if (page.items.some((job) => job.actorId !== actorId))
          throw Error("現在の本人の履歴を確認できません。");
        setRows(page.items);
        setNext(page.next);
        setLoaded(true);
      } catch (cause) {
        if (!disposed && current() && own === revision.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "ZIP履歴を確認できません。",
          );
      } finally {
        flight.current = false;
        if (!disposed && current()) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [actorId, current, cursor, refresh]);
  const run = (work: (valid: () => boolean) => Promise<void>) => {
    if (!current() || busy.current) return;
    busy.current = true;
    const own = ++revision.current;
    const valid = () => current() && revision.current === own;
    setError("");
    setNewRequestRequired(false);
    start(async () => {
      try {
        await work(valid);
        if (valid()) await router.invalidate();
      } catch (cause) {
        if (valid()) {
          setNewRequestRequired(zipNeedsNewRequest(cause));
          setError(
            cause instanceof Error
              ? cause.message
              : "結果を確認できません。自動再送はしません。",
          );
        }
      } finally {
        busy.current = false;
        if (valid()) setRefresh((value) => value + 1);
      }
    });
  };
  const inspect = (job: ZipJob, offset = 0) =>
    run(async (valid) => {
      const result = await zipRead(
        `/api/zip/requests/${job.id}/details?generation=${job.generation}&offset=${offset}`,
        zipDetailsSchema,
      );
      if (!valid()) return;
      if (result.job.actorId !== actorId)
        throw Error("現在の本人の履歴を確認できません。");
      setDetails(result);
      setRetry(null);
    });
  const confirmRetry = (
    value: Details,
    mode: "failed" | "assembly",
    ordinals: number[],
    offset = 0,
  ) =>
    run(async (valid) => {
      const result = await zipRead(
        "/api/zip/retry-preview",
        zipRetryPreviewSchema,
        {
          id: value.job.id,
          generation: value.job.generation,
          mode,
          ordinals,
          offset,
        },
      );
      if (!valid()) return;
      if (
        result.actorId !== actorId ||
        (offset && retry?.preview.confirmation !== result.confirmation)
      ) {
        setRetry(null);
        throw Error("再試行対象が変わりました。確認し直してください。");
      }
      setRetry({ preview: result, ordinals });
    });
  return (
    <section aria-labelledby="zip-history-heading" className="zip-history">
      <h2 id="zip-history-heading">ZIPの処理履歴</h2>
      <p>
        本人の要求を90日間、完成ZIPを7日間保持します。再試行は新しい実行として記録し、元の履歴期限は延長しません。PDF一括は未提供です。
      </p>
      {error && <p role="status">{error}</p>}
      {newRequestRequired && (
        <p>
          <Link to="/notes">利用可能なノートを選び直して新しいZIPを作成</Link>
        </p>
      )}
      {pending && <p role="status">ZIP操作を確認中です…</p>}
      {loaded && !rows.length && <p>このページにZIPの履歴はありません。</p>}
      {rows.map((job) => (
        <article key={`${job.id}:${job.generation}`}>
          <h3>
            {job.format === "markdown" ? "Markdown" : job.format.toUpperCase()}{" "}
            ZIP · 実行{job.generation}
          </h3>
          <p>
            {zipStateLabel[job.state]} · 開始{" "}
            <time dateTime={job.acceptedAt}>
              {new Date(job.acceptedAt).toLocaleString("ja-JP")}
            </time>
          </p>
          <p>
            {zipActive(job) ? "経過" : "所要時間"}{" "}
            {jobDuration(
              job.acceptedAt,
              job.finishedAt ?? new Date().toISOString(),
            )}
          </p>
          <p>
            全{job.total}件 · 成功{job.succeeded} · 失敗{job.failed} · 除外
            {job.excluded} · 取消{job.cancelled}
          </p>
          {job.failure && <p>{zipFailure(job.failure)}</p>}
          {job.publishedAt && (
            <p>
              {job.available
                ? `取得期限：${job.expiresAt ? new Date(job.expiresAt).toLocaleString("ja-JP") : "確認中"}`
                : job.expiresAt && Date.parse(job.expiresAt) <= Date.now()
                  ? "期限切れです。一覧から現在の対象を選び、新しく書き出してください。"
                  : "このZIPは現在取得できません。対象の内容・閲覧権限を確認し、新しく書き出してください。"}
            </p>
          )}
          <button type="button" disabled={pending} onClick={() => inspect(job)}>
            子の結果を確認
          </button>
          {job.available && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async (valid) => {
                  const url = await downloadZip(job);
                  if (!valid()) return;
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "hollow-export.zip";
                  link.target = "_blank";
                  link.rel = "noopener noreferrer";
                  link.hidden = true;
                  document.body.appendChild(link);
                  try {
                    if (valid()) link.click();
                  } finally {
                    link.remove();
                  }
                  if (valid())
                    setError(
                      "ZIPの取得を開始しました。端末への保存完了はブラウザーで確認してください。",
                    );
                })
              }
            >
              ZIPを取得
            </button>
          )}
          {zipActive(job) && job.state !== "stopping" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "ZIP生成を取り消しますか？中間生成物を破棄します。元のノートは変更しません。",
                  )
                )
                  return;
                run(async (valid) => {
                  const result = await zipRead(
                    `/api/zip/requests/${job.id}/cancel`,
                    zipJobSchema,
                    {},
                  );
                  if (valid() && result.actorId === actorId) {
                    activity?.observe(result);
                    setDetails(null);
                    setRetry(null);
                  }
                });
              }}
            >
              ZIP生成を取り消す
            </button>
          )}
          {!zipActive(job) && !job.available && (
            <Link to="/notes">一覧から新しく書き出す</Link>
          )}
        </article>
      ))}
      {details && (
        <section aria-label="ZIP子の結果">
          <h3>実行{details.job.generation}の子の結果</h3>
          <ol>
            {details.items.map((item) => (
              <li key={item.ordinal}>
                {item.ordinal + 1}.{" "}
                {item.title === null
                  ? "表示情報の保持期間が終了しました"
                  : item.title || "無題"}{" "}
                · 試行
                {item.attemptNumber} ·{" "}
                {item.origin === "reused"
                  ? "保存済み成功ファイルを再利用 · "
                  : ""}
                {item.state === "excluded"
                  ? "除外"
                  : item.state === "cancelled"
                    ? "取消済み"
                    : item.state === "queued"
                      ? "待機中"
                      : item.state === "running"
                        ? "生成中"
                        : item.state === "succeeded"
                          ? "成功"
                          : "失敗"}
                {item.failure && <p>{zipFailure(item.failure)}</p>}
                {details.retryOrdinals.includes(item.ordinal) && (
                  <button
                    type="button"
                    disabled={pending || activity?.blocked || activity?.pending}
                    onClick={() =>
                      confirmRetry(details, "failed", [item.ordinal])
                    }
                  >
                    この失敗を再確認
                  </button>
                )}
              </li>
            ))}
          </ol>
          {details.nextOffset !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() => inspect(details.job, details.nextOffset ?? 0)}
            >
              次の50件
            </button>
          )}
          {details.retryOrdinals.length > 0 && (
            <button
              type="button"
              disabled={pending || activity?.blocked || activity?.pending}
              onClick={() =>
                confirmRetry(details, "failed", [...details.retryOrdinals])
              }
            >
              最新の失敗だけをまとめて再確認
            </button>
          )}
          {details.canRetryAssembly && (
            <button
              type="button"
              disabled={pending || activity?.blocked || activity?.pending}
              onClick={() => confirmRetry(details, "assembly", [])}
            >
              ZIP組立を新しい要求で再確認
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setDetails(null);
              setRetry(null);
            }}
          >
            詳細を閉じる
          </button>
        </section>
      )}
      {retry && details && (
        <section aria-label="ZIP再試行の確認">
          <h3>現在の内容で再試行</h3>
          <p>
            失敗{retry.preview.total}
            件を現在の本文・保存スタイルで再生成し、成功{retry.preview.reused}
            件は保存済みファイルをそのまま再利用します。成功側が変更されている場合は新しい要求が必要です。
          </p>
          <ol>
            {retry.preview.items.map((item) => (
              <li key={item.ordinal}>
                {item.ordinal + 1}. {item.title || "無題"}
              </li>
            ))}
          </ol>
          {retry.preview.nextOffset !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                confirmRetry(
                  details,
                  retry.preview.mode,
                  retry.ordinals,
                  retry.preview.nextOffset ?? 0,
                )
              }
            >
              次の50件を確認
            </button>
          )}
          <button
            type="button"
            disabled={
              pending || !activity || activity.blocked || activity.pending
            }
            onClick={() => {
              if (!current()) return;
              activity?.submit({
                kind: "retry",
                input: {
                  id: retry.preview.id,
                  generation: retry.preview.generation,
                  mode: retry.preview.mode,
                  ordinals: retry.ordinals,
                  confirmation: retry.preview.confirmation,
                  commandId: crypto.randomUUID(),
                },
              });
              setRetry(null);
            }}
          >
            確認した内容で再試行
          </button>
          <button type="button" onClick={() => setRetry(null)}>
            再試行しない
          </button>
        </section>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          revision.current++;
          setRefresh((value) => value + 1);
        }}
      >
        ZIPの状況を更新
      </button>
      {cursor && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            revision.current++;
            setCursor(null);
            setDetails(null);
            setRetry(null);
          }}
        >
          最新のZIP履歴へ
        </button>
      )}
      {next && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            revision.current++;
            setCursor(next);
            setDetails(null);
            setRetry(null);
          }}
        >
          次の50件のZIP履歴
        </button>
      )}
    </section>
  );
}

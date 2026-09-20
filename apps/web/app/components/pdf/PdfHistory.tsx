"use client";
import type { PdfJobView } from "@repo/core/application/pdf/usecases";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSharingActor } from "../hollow/SharingActorProvider";
import {
  cancelPdfJob,
  lookupPdfJob,
  pdfJson,
  pdfListSchema,
  postPdf,
  preparePdfDownload,
} from "./client";
import { pdfDeliveryUrl, pdfFailureMessage, pdfStateLabel } from "./model";
import { usePdfActivity } from "./PdfActivityProvider";
import { listPdfPending, readPdfPending, writePdfPending } from "./pending";

type Cursor = { at: string; id: string } | null;
export function PdfHistory() {
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
  const activity = usePdfActivity();
  const mounted = useRef(false);
  const operation = useRef(0);
  const flight = useRef(false);
  const [rows, setRows] = useState<readonly PdfJobView[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [next, setNext] = useState<Cursor>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<ReturnType<typeof listPdfPending>>([]);
  const [resolved, setResolved] = useState<PdfJobView | null>(null);
  const [, startTransition] = useTransition();
  const current = useCallback(
    () =>
      mounted.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch,
    [actor, actorId, epoch],
  );
  useEffect(() => {
    mounted.current = true;
    setPending(listPdfPending(actorId));
    return () => {
      mounted.current = false;
      operation.current++;
    };
  }, [actorId]);
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
      const own = operation.current;
      try {
        const query = cursor
          ? `?${new URLSearchParams({ at: cursor.at, id: cursor.id })}`
          : "";
        const { response, value } = await pdfJson(`/api/pdf-requests${query}`);
        if (!response.ok) throw Error("history");
        const page = pdfListSchema.parse(value);
        if (disposed || !current() || own !== operation.current) return;
        if (page.actorId !== actorId) throw Error("actor");
        setRows(page.items);
        setNext(page.nextCursor);
        setConfigured(page.configured);
        for (const job of page.items) {
          if (job.state !== "queued" && job.state !== "running")
            writePdfPending(actorId, job.noteId, null, job.commandId);
        }
        setPending(listPdfPending(actorId));
      } catch {
        if (!disposed && current() && own === operation.current)
          setMessage(
            "PDF履歴を取得できませんでした。未取得を完了とは扱いません。",
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
    if (!current() || busy) return;
    const own = ++operation.current;
    setBusy(true);
    setMessage(null);
    const valid = () => current() && operation.current === own;
    startTransition(async () => {
      try {
        await work(valid);
      } catch {
        if (valid())
          setMessage(
            "操作の結果を確認できませんでした。自動では再送しません。状況を確認してから操作してください。",
          );
      } finally {
        if (valid()) {
          setBusy(false);
          setPending(listPdfPending(actorId));
          setRefresh((value) => value + 1);
        }
      }
    });
  };
  const adopt = (job: PdfJobView, explicit = false) => {
    if (job.actorId !== actorId) throw Error("actor");
    setResolved(job);
    activity?.receipt(job, explicit);
    if (job.state !== "queued" && job.state !== "running")
      writePdfPending(actorId, job.noteId, null, job.commandId);
  };
  const download = (job: PdfJobView) =>
    run(async (valid) => {
      const result = await preparePdfDownload(job.id);
      if (!valid()) return;
      const url = pdfDeliveryUrl(result);
      if (!url) throw Error("delivery");
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
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
        setMessage(
          "PDFの取得を開始しました。端末への保存完了はブラウザーで確認してください。",
        );
    });
  const retry = (job: PdfJobView) =>
    run(async (valid) => {
      const existing = readPdfPending(actorId, job.noteId);
      if (existing.commandId) {
        setMessage(
          "このノートには確認中の要求があります。下の「受付結果を確認」で同じ要求を照会してください。",
        );
        return;
      }
      const commandId = crypto.randomUUID();
      const saved = writePdfPending(actorId, job.noteId, commandId, null);
      if (saved.storageFailed || saved.commandId !== commandId) {
        setMessage("要求識別子を保存できないため、再試行は送信していません。");
        return;
      }
      const result = await postPdf({
        noteId: job.noteId,
        commandId,
        retryOf: job.id,
      });
      if (!valid()) return;
      if (result.kind === "accepted") adopt(result.job, true);
      else if (result.kind === "rejected") {
        writePdfPending(actorId, job.noteId, null, commandId);
        setMessage(result.message);
      } else
        setMessage(
          "再試行の受付結果は不明です。同じ要求識別子を保持しています。新しい要求は自動送信しません。",
        );
    });
  if (
    actor?.currentActor()?.id !== actorId ||
    actor.currentActor()?.epoch !== epoch
  )
    return null;
  const item = (job: PdfJobView) => (
    <article key={job.id}>
      <h3>{job.title || "無題"}</h3>
      <p>
        PDF · {pdfStateLabel(job)} ·{" "}
        {new Date(job.createdAt).toLocaleString("ja-JP")}
      </p>
      {job.state === "failed" && (
        <p role="status">
          {pdfFailureMessage(job.failure)}{" "}
          HTML・Markdownはノートから引き続き利用できます。
        </p>
      )}
      {job.state === "succeeded" && (
        <p>
          {job.available
            ? `PDF保存期限: ${job.expiresAt ? new Date(job.expiresAt).toLocaleString("ja-JP") : "確認中"}`
            : "PDFの保存期限が切れたか、取得できない状態です。現在のノートから新しいPDFを作成してください。"}
        </p>
      )}
      <div>
        {job.state === "succeeded" && job.available && (
          <button type="button" disabled={busy} onClick={() => download(job)}>
            PDFを取得
          </button>
        )}
        {(job.state === "queued" || job.state === "running") && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async (valid) => {
                const result = await cancelPdfJob(job.id);
                if (valid()) adopt(result);
              })
            }
          >
            取り消す
          </button>
        )}
        {job.state === "failed" && configured && (
          <button type="button" disabled={busy} onClick={() => retry(job)}>
            同じPDF形式で再試行
          </button>
        )}
      </div>
      <p>再試行時は現在の保存済み本文・タイトル・表示スタイルを使います。</p>
    </article>
  );
  return (
    <section aria-labelledby="pdf-history-title">
      <h2 id="pdf-history-title">PDFの処理履歴</h2>
      <p>
        この本人の履歴を90日間、完成したPDFを24時間保持します。ログアウトしても処理は続きます。
      </p>
      {configured === false && <p>この環境ではPDF生成が設定されていません。</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">PDF操作を確認中です…</p>}
      {pending.map((entry) => (
        <p key={entry.commandId}>
          受付確認中のPDF要求{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async (valid) => {
                const job = await lookupPdfJob(entry.commandId);
                if (!valid()) return;
                if (job) adopt(job);
                else
                  setMessage(
                    "受付結果はまだ確認できません。同じ識別子を保持し、自動で再送しません。",
                  );
              })
            }
          >
            受付結果を確認
          </button>
        </p>
      ))}
      {resolved && !rows.some((job) => job.id === resolved.id) && (
        <section aria-label="直近に確認したPDF">{item(resolved)}</section>
      )}
      {rows.map(item)}
      {configured !== null && !rows.length && (
        <p>このページにPDFの処理履歴はありません。</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          operation.current++;
          setRefresh((value) => value + 1);
        }}
      >
        状況を更新
      </button>
      {cursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            operation.current++;
            setCursor(null);
          }}
        >
          最新の履歴へ
        </button>
      )}
      {next && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            operation.current++;
            setCursor(next);
          }}
        >
          次の50件
        </button>
      )}
    </section>
  );
}

"use client";
import type { PdfJobView } from "@repo/core/application/pdf/usecases";
import { useRouterState } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSharingActor } from "../hollow/SharingActorProvider";
import {
  cancelPdfJob,
  lookupPdfJob,
  pdfJson,
  pdfListSchema,
  postPdf,
  preparePdfDownload,
} from "./client";
import { usePdfActivity } from "./PdfActivityProvider";
import { PdfRequestPanel } from "./PdfRequestPanel";
import { readPdfPending, writePdfPending } from "./pending";

export function NotePdfAction(props: {
  actorId: string;
  noteId: string;
  editing: boolean;
}) {
  const actor = useSharingActor();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return actor?.actor?.id === props.actorId ? (
    <Session
      key={`${props.actorId}:${actor.actor.epoch}:${props.noteId}:${pathname}`}
      {...props}
      epoch={actor.actor.epoch}
    />
  ) : null;
}
function Session({
  actorId,
  noteId,
  editing,
  epoch,
}: {
  actorId: string;
  noteId: string;
  editing: boolean;
  epoch: number;
}) {
  const activity = usePdfActivity();
  const actor = useSharingActor();
  const mounted = useRef(false);
  const pending = useRef<string | null>(null);
  const [state, setState] = useState<{
    ready: boolean;
    commandId: string | null;
    storageFailed: boolean;
  }>({ ready: false, commandId: null, storageFailed: false });
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [latest, setLatest] = useState<PdfJobView | null>(null);
  const live = useCallback(
    () =>
      mounted.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch,
    [actor, actorId, epoch],
  );
  useLayoutEffect(() => {
    mounted.current = true;
    const restored = readPdfPending(actorId, noteId);
    pending.current = restored.commandId;
    setState({ ready: true, ...restored });
    return () => {
      mounted.current = false;
    };
  }, [actorId, noteId]);
  useEffect(() => {
    void attempt;
    let current = true;
    void pdfJson("/api/pdf-requests")
      .then(({ response, value }) => {
        if (!current || !live()) return;
        if (!response.ok) throw Error("pdf-config");
        const list = pdfListSchema.parse(value);
        if (list.actorId !== actorId) throw Error("pdf-actor");
        setConfigured(list.configured);
        setError(false);
      })
      .catch(() => {
        if (current && live()) setError(true);
      });
    return () => {
      current = false;
    };
  }, [actorId, live, attempt]);
  if (
    actor?.currentActor()?.id !== actorId ||
    actor.currentActor()?.epoch !== epoch
  )
    return null;
  if (!state.ready || configured === null)
    return (
      <section aria-label="PDF">
        {error ? (
          <p role="alert">
            PDFの状態を確認できませんでした。
            <button type="button" onClick={() => setAttempt((v) => v + 1)}>
              再確認
            </button>
          </p>
        ) : (
          <p role="status">PDFの状態を確認しています…</p>
        )}
      </section>
    );
  return (
    <>
      {state.storageFailed && (
        <p role="alert">
          要求識別子をこのブラウザーに保存できないため、新しいPDF要求は送信していません。既存の要求の確認・取消は引き続き利用できます。
        </p>
      )}
      <PdfRequestPanel
        actorId={actorId}
        actorEpoch={epoch}
        noteId={noteId}
        currentActor={() => actor.currentActor()}
        configured={configured}
        editing={editing}
        pendingCommandId={state.commandId}
        onPendingCommandChange={(commandId) => {
          if (!live()) return;
          const next = writePdfPending(
            actorId,
            noteId,
            commandId,
            pending.current,
          );
          pending.current = next.commandId;
          setState({ ready: true, ...next });
        }}
        onJobChange={(job) => {
          if (live() && job.actorId === actorId && job.noteId === noteId) {
            setLatest(job);
            activity?.receipt(job);
          }
        }}
        request={async (input) => {
          const saved = readPdfPending(actorId, noteId);
          if (
            !live() ||
            saved.storageFailed ||
            saved.commandId !== input.commandId
          )
            return {
              kind: "rejected" as const,
              message:
                "要求識別子を保存できなかったため、PDF要求は送信していません。",
            };
          const result = await postPdf(input);
          if (live() && result.kind === "accepted")
            activity?.receipt(result.job, true);
          return result;
        }}
        lookup={lookupPdfJob}
        cancel={cancelPdfJob}
        prepareDelivery={preparePdfDownload}
      />
      {latest && (
        <p>
          <a href="/notes/jobs">処理の一覧で確認</a>
        </p>
      )}
    </>
  );
}

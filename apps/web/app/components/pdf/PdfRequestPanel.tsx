"use client";

import type {
  PdfJobView,
  PdfRequestInput,
} from "@repo/core/application/pdf/usecases";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  adoptPdfJob,
  canPreparePdf,
  clearPdfPending,
  initialPdfModel,
  mayAutoDownloadPdf,
  ownsPdfOperation,
  type PdfActor,
  type PdfModel,
  type PdfOperation,
  pdfDeliveryUrl,
  pdfFailureMessage,
  pdfIsActive,
  pdfLookupUnavailable,
  pdfStateLabel,
  samePdfActor,
} from "./model";

export type PdfRequestPanelProps = Readonly<{
  actorId: string;
  actorEpoch: number;
  noteId: string;
  currentActor: () => PdfActor;
  configured: boolean;
  editing?: boolean;
  pendingCommandId: string | null;
  onPendingCommandChange: (commandId: string | null) => void;
  onJobChange: (job: PdfJobView) => void;
  request: (
    input: PdfRequestInput,
  ) => Promise<
    | { kind: "accepted"; job: PdfJobView }
    | { kind: "rejected"; message: string }
    | { kind: "unknown" }
  >;
  lookup: (commandId: string) => Promise<PdfJobView | null>;
  cancel: (id: string) => Promise<PdfJobView>;
  prepareDelivery: (requestId: string) => Promise<{
    id: string;
    url: string;
    filename: string;
    expiresAt: string;
  }>;
}>;

type Work = "request" | "lookup" | "poll" | "cancel" | "delivery";
type Valid = () => boolean;

export function PdfRequestPanel(props: PdfRequestPanelProps) {
  return (
    <PdfPanel
      key={`${props.actorId}:${props.actorEpoch}:${props.noteId}`}
      {...props}
    />
  );
}

function PdfPanel(props: PdfRequestPanelProps) {
  const heading = useId();
  const callbacks = useRef(props);
  callbacks.current = props;
  const identity = useRef({
    actorId: props.actorId,
    actorEpoch: props.actorEpoch,
    noteId: props.noteId,
  }).current;
  const mount = useRef({});
  const mounted = useRef(false);
  const active = useRef<PdfOperation | null>(null);
  const work = useRef<Work | null>(null);
  const pending = useRef(props.pendingCommandId);
  const hydrated = useRef<string | null>(null);
  const automatic = useRef<string | null>(null);
  const lookupFlight = useRef<object | null>(null);
  const [model, setModel] = useState<PdfModel>(() =>
    initialPdfModel(props.pendingCommandId),
  );
  const state = useRef(model);
  const [busy, setBusy] = useState<Work | null>(null);
  const [, startTransition] = useTransition();

  useLayoutEffect(() => {
    mounted.current = true;
    setBusy(null);
    return () => {
      mounted.current = false;
      active.current = null;
      work.current = null;
      hydrated.current = null;
      automatic.current = null;
    };
  }, []);

  const current = useCallback(
    () =>
      mounted.current &&
      samePdfActor(callbacks.current.currentActor(), identity),
    [identity],
  );

  const update = useCallback((next: PdfModel) => {
    state.current = next;
    setModel(next);
  }, []);

  const run = useCallback(
    (kind: Work, action: (valid: Valid) => Promise<void>) => {
      if (
        !current() ||
        (work.current !== null &&
          !(kind === "cancel" && work.current === "poll"))
      )
        return false;
      const operation: PdfOperation = {
        ...identity,
        mount: mount.current,
        token: {},
      };
      active.current = operation;
      work.current = kind;
      setBusy(kind);
      const valid = () =>
        ownsPdfOperation(
          mounted.current,
          operation,
          active.current,
          callbacks.current.currentActor(),
        );
      startTransition(async () => {
        try {
          await action(valid);
        } catch {
          if (valid()) {
            automatic.current = null;
            update(pdfLookupUnavailable(state.current));
          }
        } finally {
          if (valid()) {
            active.current = null;
            work.current = null;
            setBusy(null);
          }
        }
      });
      return true;
    },
    [current, identity, update],
  );

  const deliver = useCallback(
    async (job: PdfJobView, valid: Valid) => {
      if (!valid() || !canPreparePdf(job)) return;
      work.current = "delivery";
      setBusy("delivery");
      try {
        const delivery = await callbacks.current.prepareDelivery(job.id);
        if (!valid()) return;
        const url = pdfDeliveryUrl(delivery);
        if (!url) throw new Error("invalid-delivery-route");
        const link = document.createElement("a");
        link.href = url;
        link.download = delivery.filename;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.hidden = true;
        if (!valid()) return;
        document.body.appendChild(link);
        try {
          if (!valid()) return;
          link.click();
        } finally {
          link.remove();
        }
        if (!valid()) return;
        update({
          ...state.current,
          message:
            "PDFの取得を開始しました。端末への保存完了はブラウザーで確認してください。開始されない場合は「PDFを取得」を押してください。",
        });
      } catch {
        if (!valid()) return;
        update({
          ...state.current,
          message:
            "PDFの取得を開始できたか確認できません。権限・内容・保存期限を再確認するため、もう一度「PDFを取得」を押してください。自動では再送しません。",
        });
      }
    },
    [update],
  );

  const adopt = useCallback(
    async (job: PdfJobView, valid: Valid) => {
      if (!valid()) return;
      const next = adoptPdfJob(state.current, job, identity);
      if (next === state.current) {
        automatic.current = null;
        update(pdfLookupUnavailable(state.current));
        return;
      }
      update(next);
      if (!valid()) return;
      callbacks.current.onJobChange(job);
      if (!valid()) return;
      if (clearPdfPending(pending.current, job, identity)) {
        callbacks.current.onPendingCommandChange(null);
        if (!valid()) return;
        pending.current = null;
      }
      if (!valid()) return;
      if (mayAutoDownloadPdf(automatic.current, job)) {
        automatic.current = null;
        await deliver(job, valid);
      }
    },
    [deliver, identity, update],
  );

  const lookup = useCallback(
    (commandId: string, kind: "lookup" | "poll") => {
      if (lookupFlight.current !== null) return false;
      return run(kind, async (valid) => {
        const flight = {};
        lookupFlight.current = flight;
        try {
          const job = await callbacks.current.lookup(commandId);
          if (!valid()) return;
          if (!job) {
            update(pdfLookupUnavailable(state.current));
            return;
          }
          await adopt(job, valid);
        } catch {
          if (valid()) update(pdfLookupUnavailable(state.current));
        } finally {
          if (lookupFlight.current === flight) lookupFlight.current = null;
        }
      });
    },
    [adopt, run, update],
  );

  useLayoutEffect(() => {
    pending.current = props.pendingCommandId;
    const commandId = props.pendingCommandId;
    if (
      commandId &&
      (state.current.kind === "idle" || state.current.commandId !== commandId)
    ) {
      active.current = null;
      work.current = null;
      setBusy(null);
      automatic.current = null;
      hydrated.current = null;
      update(initialPdfModel(commandId));
    }
  }, [props.pendingCommandId, update]);

  useEffect(() => {
    const commandId = props.pendingCommandId;
    if (!commandId || hydrated.current === commandId || !current()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hydrate = () => {
      if (!current() || pending.current !== commandId) return;
      if (lookup(commandId, "lookup")) hydrated.current = commandId;
      else timer = setTimeout(hydrate, 2000);
    };
    hydrate();
    return () => clearTimeout(timer);
  }, [props.pendingCommandId, current, lookup]);

  useEffect(() => {
    if (busy || model.kind !== "tracked" || !model.polling || !current())
      return;
    const commandId = model.commandId;
    let timer: ReturnType<typeof setTimeout>;
    const poll = () => {
      if (!current()) return;
      if (!lookup(commandId, "poll")) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, [busy, model, current, lookup]);

  const request = () => {
    if (
      !current() ||
      !callbacks.current.configured ||
      pending.current !== null ||
      (state.current.kind !== "idle" &&
        (state.current.kind !== "tracked" || pdfIsActive(state.current.job)))
    )
      return;
    run("request", async (valid) => {
      let commandId: string;
      try {
        commandId = crypto.randomUUID();
      } catch {
        if (valid())
          update({
            kind: "idle",
            message:
              "要求識別子を保持できませんでした。PDFの要求は送信していません。",
          });
        return;
      }
      if (!valid()) return;
      pending.current = commandId;
      hydrated.current = commandId;
      automatic.current = commandId;
      update(initialPdfModel(commandId));
      try {
        callbacks.current.onPendingCommandChange(commandId);
      } catch {
        if (valid()) {
          automatic.current = null;
          update({
            kind: "unconfirmed",
            commandId,
            message:
              "要求識別子の保持を確認できないため、PDFの要求は送信していません。この識別子を保持して状況を確認してください。",
          });
        }
        return;
      }
      if (!valid()) return;
      let response: Awaited<ReturnType<PdfRequestPanelProps["request"]>>;
      try {
        response = await callbacks.current.request({
          noteId: identity.noteId,
          commandId,
        });
      } catch {
        response = { kind: "unknown" };
      }
      if (!valid()) return;
      if (response.kind === "accepted") {
        await adopt(response.job, valid);
      } else if (response.kind === "rejected") {
        automatic.current = null;
        if (pending.current === commandId) {
          callbacks.current.onPendingCommandChange(null);
          if (!valid()) return;
          pending.current = null;
        }
        if (valid()) update({ kind: "idle", message: response.message });
      } else {
        automatic.current = null;
        update(pdfLookupUnavailable(state.current));
      }
    });
  };

  const cancel = () => {
    const snapshot = state.current;
    if (snapshot.kind !== "tracked" || !pdfIsActive(snapshot.job)) return;
    run("cancel", async (valid) => {
      automatic.current = null;
      try {
        const job = await callbacks.current.cancel(snapshot.job.id);
        if (valid()) await adopt(job, valid);
      } catch {
        if (!valid()) return;
        update({
          ...snapshot,
          polling: false,
          message:
            "取消の結果を確認できません。取り消されたとは判断せず、状況を確認してください。",
        });
      }
    });
  };

  if (!samePdfActor(props.currentActor(), identity)) return null;
  const job = model.kind === "tracked" ? model.job : null;
  const activeJob = job !== null && pdfIsActive(job);
  const mayRequest =
    props.configured &&
    !busy &&
    pending.current === null &&
    (model.kind === "idle" || (model.kind === "tracked" && !activeJob));

  return (
    <section className="pdf-request-panel" aria-labelledby={heading}>
      <style>{styles}</style>
      <h3 id={heading}>PDF</h3>
      <p>
        保存済みの本文と表示スタイルからPDFを作成します。完成したPDFは公開せず、24時間保存します。
      </p>
      {props.editing && (
        <p>
          編集中の変更は含まれません。ここで本文を保存・破棄することはありません。
        </p>
      )}
      {!props.configured && (
        <p role="status">
          この環境ではPDFの生成が設定されていません。HTML・Markdownの取得は別の操作から利用できます。
        </p>
      )}
      <div aria-live="polite" aria-atomic="true">
        {busy === "request" && <p>PDFの作成を要求しています…</p>}
        {model.kind === "unconfirmed" && busy !== "request" && (
          <p>
            受付結果はまだ確認できていません。同じ識別子で状況だけを照会します。自動で新しい要求は送信しません。
          </p>
        )}
        {job && <p>{pdfStateLabel(job)}</p>}
        {job?.failure && <p>{pdfFailureMessage(job.failure)}</p>}
        {busy === "lookup" && <p>状況を確認しています…</p>}
        {busy === "cancel" && <p>取消を要求しています…</p>}
        {busy === "delivery" && <p>現在の権限とPDFを確認しています…</p>}
        {model.message && <p>{model.message}</p>}
      </div>
      {job?.expiresAt && (
        <p>
          PDFの保存期限: <time dateTime={job.expiresAt}>{job.expiresAt}</time>
        </p>
      )}
      <div className="pdf-request-actions">
        <button type="button" disabled={!mayRequest} onClick={request}>
          {job ? "現在の内容から新しいPDFを作成" : "PDFを作成"}
        </button>
        {model.kind !== "idle" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => lookup(model.commandId, "lookup")}
          >
            状況を確認
          </button>
        )}
        {activeJob && (
          <button
            type="button"
            disabled={busy !== null && busy !== "poll"}
            onClick={cancel}
          >
            この要求を取り消す
          </button>
        )}
        {job && canPreparePdf(job) && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              automatic.current = null;
              run("delivery", (valid) => deliver(job, valid));
            }}
          >
            PDFを取得
          </button>
        )}
      </div>
      {activeJob && (
        <p>この画面を閉じても生成は続きます。処理の一覧からも確認できます。</p>
      )}
    </section>
  );
}

const styles = `
.pdf-request-panel{border:1px solid currentColor;border-radius:.5rem;padding:1rem;margin-block:1rem;max-width:100%;min-width:0;overflow-wrap:anywhere}
.pdf-request-panel h3{margin-block:0 .75rem;font-size:1rem}
.pdf-request-panel p{margin-block:.5rem;line-height:1.6}
.pdf-request-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-block:.75rem}
.pdf-request-actions button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:.3rem;min-height:2.75rem;padding:.5rem .75rem;max-width:100%;white-space:normal;text-align:start}
.pdf-request-actions button:disabled{opacity:.55;cursor:not-allowed}
.pdf-request-actions button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media(max-width:420px){.pdf-request-actions{display:grid;grid-template-columns:minmax(0,1fr)}.pdf-request-actions button{width:100%}}
`;

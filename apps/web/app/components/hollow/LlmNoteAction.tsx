"use client";
import type { RegenerateLlmInput } from "@repo/core/application/llm/request";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import {
  beginPdfPreviewFn,
  cancelLlmFn,
  cancelPdfPreviewFn,
  getLlmNoteFn,
  getPdfPreviewFn,
  listLlmModelsFn,
  requestLlmFn,
  undoLlmFn,
} from "@/presentation/llmServerFn";
import { LlmUsage } from "./LlmUsage";
import { llmDocumentMessage } from "./llmDocumentMessage";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type View = Awaited<ReturnType<typeof getLlmNoteFn>>;
type Catalog = Awaited<ReturnType<typeof listLlmModelsFn>>;
type Request = RegenerateLlmInput;
type Preview = Awaited<ReturnType<typeof getPdfPreviewFn>>;
type Interaction = "mutation" | "submit" | "preview-submit" | "receipt-read";
type ReadRequest = {
  valid(): boolean;
  initialize: boolean;
  resolve(): void;
  reject(error: unknown): void;
};

import { requestDriveLlmFn } from "@/presentation/regenerationServerFn";

export function LlmNoteAction({
  noteId,
  noteVersion,
  recordId,
}: {
  noteId: string;
  noteVersion: number;
  recordId?: string;
}) {
  const router = useRouter();
  const operation = useAuthenticationOperation();
  const [view, setView] = useState<View | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [model, setModel] = useState("");
  const [instruction, setInstruction] = useState("");
  const [seed, setSeed] = useState({ model: "", instruction: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState<Preview>(null);
  const [previewUncertain, setPreviewUncertain] = useState(false);
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const request = useRef<Request | null>(null);
  const initialized = useRef(false);
  const reading = useRef<{ running: boolean; queued: ReadRequest | null }>({
    running: false,
    queued: null,
  });
  const errorCommand = useRef<string | null>(null);
  const previewCommand = useRef<string | null>(null);
  const draft = useRef({ model, instruction, dirty: false });
  const fail = useCallback(
    (cause: unknown, commandId: string | null = null) => {
      errorCommand.current = commandId;
      setError(displayError(cause));
    },
    [],
  );
  const dirty = model !== seed.model || instruction !== seed.instruction;
  draft.current = { model, instruction, dirty };
  const currentVersion = view?.noteVersion;
  useBlocker({
    shouldBlockFn: () =>
      (dirty || uncertain || previewUncertain) &&
      !window.confirm(
        "再生成の未送信設定を破棄して移動しますか？受付済みの処理は履歴から確認できます。",
      ),
    enableBeforeUnload: dirty || uncertain || previewUncertain,
  });

  const reload = useCallback(
    (valid: () => boolean, initialize = false) =>
      new Promise<void>((resolve, reject) => {
        const run = async (read: ReadRequest) => {
          reading.current.running = true;
          try {
            if (!read.valid()) return;
            const value = await getLlmNoteFn({
              data: {
                noteId,
                ...(recordId ? { recordId } : {}),
                ...(request.current
                  ? { commandId: request.current.commandId }
                  : {}),
              },
            });
            if (!read.valid()) return;
            let currentPreview: Preview = null;
            if (value.format === "pdf") {
              const commandId =
                previewCommand.current ?? value.pdfPreview?.commandId;
              if (commandId) {
                currentPreview = await getPdfPreviewFn({
                  data: { noteId, commandId },
                });
                if (!read.valid()) return;
                previewCommand.current = commandId;
                if (currentPreview) setPreviewUncertain(false);
              }
              setPreview(currentPreview);
            }
            setView(value);
            const initialModel =
              value.modelId ??
              (currentPreview?.usable ? currentPreview.defaultModelId : null) ??
              "";
            if (read.initialize || !initialized.current) {
              initialized.current = true;
              setModel(initialModel);
              setInstruction(value.instruction);
              setSeed({ model: initialModel, instruction: value.instruction });
            } else if (
              value.format === "pdf" &&
              currentPreview?.usable &&
              initialModel &&
              !draft.current.model &&
              !draft.current.dirty
            ) {
              setModel(initialModel);
              setSeed({
                model: initialModel,
                instruction: draft.current.instruction,
              });
            }
            if (value.receipt) {
              if (
                request.current &&
                errorCommand.current === request.current.commandId
              ) {
                errorCommand.current = null;
                setError("");
              }
              request.current = null;
              setUncertain(false);
              setMessage("受付済みの変換を確認しました。");
              setSeed({
                model: value.modelId ?? "",
                instruction: value.instruction,
              });
            } else if (request.current) {
              setMessage(
                "受付結果はまだ確認できません。自動再送は行いません。",
              );
            }
          } catch (cause) {
            read.reject(cause);
          } finally {
            read.resolve();
            reading.current.running = false;
            const queued = reading.current.queued;
            reading.current.queued = null;
            if (queued) void run(queued);
          }
        };
        const read = { valid, initialize, resolve, reject };
        if (reading.current.running) {
          reading.current.queued?.resolve();
          reading.current.queued = read;
        } else void run(read);
      }),
    [noteId, recordId],
  );
  useEffect(() => {
    const valid = operation();
    void reload(valid, true).catch((cause) => {
      if (valid()) fail(cause);
    });
  }, [reload, operation, fail]);
  useEffect(() => {
    let disposed = false;
    const href = router.state.location.href;
    const unsubscribe = router.subscribe("onResolved", () => {
      if (disposed || busy.current || router.state.location.href !== href)
        return;
      const valid = operation();
      void reload(() => !disposed && valid()).catch((cause) => {
        if (!disposed && valid()) fail(cause);
      });
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [operation, reload, router, fail]);
  useEffect(() => {
    if (
      !view?.processing &&
      !previewUncertain &&
      preview?.state !== "queued" &&
      preview?.state !== "running" &&
      preview?.state !== "ready" &&
      preview?.state !== "unknown"
    )
      return;
    let disposed = false;
    let polling = false;
    const timer = setInterval(() => {
      if (disposed || busy.current || reading.current.running || polling)
        return;
      polling = true;
      const valid = operation();
      void reload(() => !disposed && valid())
        .then(() => {
          if (!disposed && valid()) void router.invalidate();
        })
        .catch((cause) => {
          if (!disposed && valid()) fail(cause);
        })
        .finally(() => {
          polling = false;
        });
    }, 2000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [
    view?.processing,
    preview?.state,
    previewUncertain,
    reload,
    operation,
    router,
    fail,
  ]);
  useEffect(() => {
    if (
      busy.current ||
      reading.current.running ||
      currentVersion === undefined ||
      currentVersion === noteVersion
    )
      return;
    const valid = operation();
    void reload(valid).catch((cause) => {
      if (valid()) fail(cause);
    });
  }, [noteVersion, currentVersion, operation, reload, fail]);
  function mutate(
    work: (valid: () => boolean) => Promise<unknown>,
    interaction: Interaction = "mutation",
  ) {
    if (busy.current || reading.current.running) return;
    busy.current = true;
    const valid = operation();
    if (interaction !== "receipt-read") {
      errorCommand.current = null;
      setError("");
    }
    setMessage("");
    start(async () => {
      let accepted = false;
      try {
        await work(valid);
        accepted = true;
        if (!valid()) return;
        if (interaction === "submit") {
          request.current = null;
          setUncertain(false);
          setSeed({ model, instruction });
        }
        if (interaction !== "receipt-read")
          setMessage("操作を受け付けました。");
        await reload(valid);
        if (valid()) await router.invalidate();
      } catch (cause) {
        if (valid()) {
          let commandId: string | null = null;
          if (interaction === "submit" && !accepted) {
            const kind = extractSerializedError(cause).kind;
            const unknown = kind === "unknown" || kind === "system";
            setUncertain(unknown);
            if (unknown) commandId = request.current?.commandId ?? null;
            if (!unknown) request.current = null;
          } else if (interaction === "preview-submit" && !accepted) {
            const kind = extractSerializedError(cause).kind;
            const unknown = kind === "unknown" || kind === "system";
            setPreviewUncertain(unknown);
            if (!unknown) previewCommand.current = null;
          }
          fail(cause, commandId);
        }
      } finally {
        busy.current = false;
      }
    });
  }
  const canSubmit =
    !!view?.configured &&
    view.linked &&
    view.supported &&
    !view.processing &&
    view.noteVersion === noteVersion &&
    (view.format !== "pdf" ||
      (!!preview?.usable &&
        preview.noteVersion === view.noteVersion &&
        preview.epoch === view.epoch &&
        !previewUncertain)) &&
    !!catalog?.models.some((item) => item.id === model) &&
    new TextEncoder().encode(instruction).length <= 8192;
  return (
    <section className="hollow-job-batch" aria-label="原本から本文を再生成">
      <h2>{recordId ? "Driveの原本からAIで再生成" : "原本から本文を再生成"}</h2>
      <p>
        text・HTML・Markdown・DOCX・XLSX・PPTX・対応範囲のPDF・静止画像の原本から、本文だけを置き換えます。題名・タグ・表示スタイルは変えません。既存本文の再生成は現在の公開設定を維持します。音声の変換は未提供です。
      </p>
      {!recordId && (
        <p>
          取り込み時の公開希望が保留されている場合は、初回本文の完成時に適用します。手動で変更した共有設定を優先します。
        </p>
      )}
      <p>
        1 回の変換で月間枠を 1
        回使用します。送信後の失敗・取消・結果不明も使用回数に含まれ、提供元の料金が発生する場合があります。
      </p>
      <LlmUsage
        refreshKey={`${view?.job?.id ?? ""}:${view?.job?.outcome ?? ""}:${view?.processing ?? false}`}
      />
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!view && <p role="status">状態を確認中…</p>}
      {view && !view.configured && (
        <p>この環境では本文生成が構成されていません。</p>
      )}
      {view && !view.linked && (
        <p>
          <Link to="/settings/openrouter">OpenRouter の連携を設定</Link>
          してから再生成できます。
        </p>
      )}
      {view && !view.supported && (
        <p>
          {view.availability === "no-original"
            ? "再生成に使える原本がありません。"
            : "この原本形式の再生成は現在提供していません。原本を保持します。"}
        </p>
      )}
      {view?.availability === "office-text-gated" && (
        <p>
          Officeは文字・表などの構造を対象にします。画像や図の内容は解釈せず、未解釈の案内を残します。全文を確認できない構造では変換しません。
        </p>
      )}
      {view?.availability === "pdf-gated" && (
        <>
          <p>
            まず本文を変更せずPDFの用途を確認します。文字と順序を全頁確認できる場合は文字用モデル、それ以外の対応PDFは全頁画像用モデルを選びます。破損・暗号化・上限超過では変換せず原本と旧本文を保持します。
          </p>
          <p>
            全頁画像は最大32頁・144dpi・各辺1728px以下です。縮小で上限を回避しません。表示範囲・回転・対応注釈を含む全頁が対象で、フォームや任意の対話機能には対応しません。認識結果には誤りがあり得るため原本を確認してください。
          </p>
          <p>
            画像のトークン数は事前計算していません。サイズ・寸法の制限内でも、画像を含む入力がモデルの入力上限を超える場合があります。
          </p>
          {view.configured && view.linked && !view.processing && (
            <button
              type="button"
              className="hollow-button"
              disabled={
                pending ||
                previewUncertain ||
                (!!preview &&
                  ["queued", "running", "ready", "unknown"].includes(
                    preview.state,
                  ))
              }
              onClick={() => {
                if (busy.current || reading.current.running || previewUncertain)
                  return;
                const commandId = crypto.randomUUID();
                previewCommand.current = commandId;
                setPreview(null);
                setCatalog(null);
                setPreviewUncertain(true);
                mutate(
                  () =>
                    beginPdfPreviewFn({
                      data: {
                        noteId,
                        noteVersion: view.noteVersion,
                        expectedEpoch: view.epoch,
                        commandId,
                        ...(recordId ? { recordId } : {}),
                      },
                    }),
                  "preview-submit",
                );
              }}
            >
              PDFの用途を確認
            </button>
          )}
          {previewUncertain && (
            <p role="status">
              用途確認の受付結果は未確認です。自動再送せず、同じ受付を再読します。
            </p>
          )}
          {preview && (
            <p role="status">
              {preview.ownershipUnconfirmed
                ? "用途確認の終了未確認・保持中"
                : preview.cancelRequested
                  ? "用途確認の取消要求済み・終了待ち"
                  : preview.state === "queued" || preview.state === "running"
                    ? "用途確認中。本文はまだ変更せず、編集できます。"
                    : preview.usable
                      ? `用途確認済み: ${preview.purpose === "chat-image" ? "全頁画像用" : "文字用"}・${preview.pages}頁。確認の有効期限は5分です。`
                      : preview.state === "consumed"
                        ? "用途確認を生成受付に使用しました。"
                        : preview.expired || !preview.current
                          ? "用途確認が失効しました。終了を確認してから確認し直してください。"
                          : preview.state === "failed"
                            ? (llmDocumentMessage(preview.failure) ??
                              "用途確認に失敗しました。原本と旧本文を保持します。")
                            : "用途確認を取り消しました。"}
            </p>
          )}
          {(previewUncertain || !!preview) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => mutate(async () => undefined, "receipt-read")}
            >
              用途確認の結果を再読
            </button>
          )}
          {preview &&
            ["queued", "running", "ready", "unknown"].includes(preview.state) &&
            !preview.cancelRequested && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  mutate(() =>
                    cancelPdfPreviewFn({
                      data: { previewId: preview.previewId },
                    }),
                  )
                }
              >
                用途確認を取り消す
              </button>
            )}
        </>
      )}
      {view?.availability === "image-gated" && (
        <>
          <p>
            静止JPEG・PNG・WebP・GIFのみ対象です。長辺4096px・1600万画素以下を、縮小や切り抜きなしで向き・色・白背景を整えて送信します。アニメーションや複数画像は変換しません。認識結果には誤りがあり得るため原本を確認してください。
          </p>
          <p>
            画像のトークン数は事前計算していません。サイズ・寸法の制限内でも、画像を含む入力がモデルの入力上限を超える場合があります。
          </p>
        </>
      )}
      {view?.job && (
        <p role="status">
          前回の処理:{" "}
          {view.job.ownershipUnconfirmed
            ? "終了未確認（再送せず保持中）"
            : view.job.cancelRequested && view.processing
              ? "取消要求済み・実処理の終了待ち"
              : view.job.outcome === "pending"
                ? "処理中"
                : view.job.outcome === "succeeded"
                  ? "完了"
                  : view.job.outcome === "cancelled"
                    ? "取消済み・旧本文を保持"
                    : view.job.outcome === "unknown"
                      ? "送信結果未確認・自動再送なし"
                      : "失敗・旧本文を保持"}
          {view.job.failure ? ` (${view.job.failure})` : ""}
        </p>
      )}
      {view?.job?.epochChanged && (
        <p>
          連携が変わりました。元のモデル・追加指示を初期値として表示しています。新しい連携で開始するには、設定と置き換えを改めて確認してください。
        </p>
      )}
      {view?.job?.failure && llmDocumentMessage(view.job.failure) && (
        <p role="status">{llmDocumentMessage(view.job.failure)}</p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!view || !canSubmit || uncertain || busy.current) return;
          if (
            !window.confirm(
              "現在の本文を原本から再生成して置き換えますか？追加の利用回数・料金が発生する場合があります。失敗・取消時は旧本文を保持します。",
            )
          )
            return;
          const input: Request = {
            noteId,
            noteVersion: view.noteVersion,
            commandId: crypto.randomUUID(),
            expectedEpoch: view.epoch,
            modelId: model,
            instruction,
            confirmed: true,
            ...(view.format === "pdf" && preview
              ? { previewId: preview.previewId }
              : {}),
          };
          request.current = input;
          mutate(
            () =>
              recordId
                ? requestDriveLlmFn({
                    data: {
                      noteId: input.noteId,
                      noteVersion: input.noteVersion,
                      commandId: input.commandId,
                      expectedEpoch: input.expectedEpoch,
                      modelId: input.modelId,
                      instruction: input.instruction,
                      confirmed: true,
                      recordId,
                      ...(input.previewId
                        ? { pdfPreviewId: input.previewId }
                        : {}),
                    },
                  })
                : requestLlmFn({ data: input }),
            "submit",
          );
        }}
      >
        <fieldset
          disabled={
            pending ||
            uncertain ||
            !!view?.processing ||
            (view?.format === "pdf" && (!preview?.usable || previewUncertain))
          }
        >
          <label>
            モデル
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {!catalog?.models.some((item) => item.id === model) && (
                <option value={model}>
                  {model || "モデルを読み込んでください"}（提供未確認）
                </option>
              )}
              {catalog?.models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="hollow-button"
            onClick={() =>
              mutate(async (valid) => {
                const kind =
                  view?.format === "pdf"
                    ? preview?.purpose
                    : view?.format === "image"
                      ? "chat-image"
                      : "chat-text";
                if (!kind) return;
                const value = await listLlmModelsFn({
                  data: {
                    kind,
                  },
                });
                if (valid()) setCatalog(value);
              })
            }
          >
            モデル一覧を更新
          </button>
          {catalog?.source === "default-fallback" && (
            <p>
              一覧を取得できないため採用済み既定モデルだけ表示しています。現在の提供・品質は未確認です。
            </p>
          )}
          <label>
            追加指示（任意・8 KiB 以下）
            <textarea
              value={instruction}
              maxLength={8192}
              onChange={(event) => setInstruction(event.target.value)}
            />
          </label>
          <button className="hollow-button" type="submit" disabled={!canSubmit}>
            {pending ? "処理中…" : "本文を置き換えて再生成"}
          </button>
        </fieldset>
      </form>
      {uncertain && (
        <div role="status">
          <p>受付結果を確認できませんでした。自動再送は行いません。</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => mutate(async () => undefined, "receipt-read")}
          >
            同じ受付の結果を再読
          </button>
        </div>
      )}
      {view?.job?.operation === "regenerate" &&
        view.processing &&
        !view.job.cancelRequested && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const job = view.job;
              if (
                job &&
                window.confirm(
                  "再生成を取り消しますか？実処理の終了まで待ち、旧本文を保持します。送信済みの使用回数・料金は返却されません。",
                )
              )
                mutate(() => cancelLlmFn({ data: { jobId: job.id } }));
            }}
          >
            再生成を取り消す
          </button>
        )}
      {view?.job?.undoAvailable && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const job = view.job;
            if (
              job &&
              window.confirm(
                "再生成直前の本文に戻しますか？題名・タグ・表示設定は変更しません。使用回数は戻りません。",
              )
            )
              mutate(() => undoLlmFn({ data: { jobId: job.id } }));
          }}
        >
          再生成前の本文に戻す
        </button>
      )}
    </section>
  );
}

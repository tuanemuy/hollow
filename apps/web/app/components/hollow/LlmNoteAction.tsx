"use client";
import type { RegenerateLlmInput } from "@repo/core/application/llm/request";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import {
  cancelLlmFn,
  getLlmNoteFn,
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
type Interaction = "mutation" | "submit" | "receipt-read";
type ReadRequest = {
  valid(): boolean;
  initialize: boolean;
  resolve(): void;
  reject(error: unknown): void;
};

export function LlmNoteAction({
  noteId,
  noteVersion,
}: {
  noteId: string;
  noteVersion: number;
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
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const request = useRef<Request | null>(null);
  const initialized = useRef(false);
  const reading = useRef<{ running: boolean; queued: ReadRequest | null }>({
    running: false,
    queued: null,
  });
  const errorCommand = useRef<string | null>(null);
  const fail = useCallback(
    (cause: unknown, commandId: string | null = null) => {
      errorCommand.current = commandId;
      setError(displayError(cause));
    },
    [],
  );
  const dirty = model !== seed.model || instruction !== seed.instruction;
  const currentVersion = view?.noteVersion;
  useBlocker({
    shouldBlockFn: () =>
      (dirty || uncertain) &&
      !window.confirm(
        "再生成の未送信設定を破棄して移動しますか？受付済みの処理は履歴から確認できます。",
      ),
    enableBeforeUnload: dirty || uncertain,
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
                ...(request.current
                  ? { commandId: request.current.commandId }
                  : {}),
              },
            });
            if (!read.valid()) return;
            setView(value);
            if (read.initialize || !initialized.current) {
              initialized.current = true;
              setModel(value.modelId);
              setInstruction(value.instruction);
              setSeed({ model: value.modelId, instruction: value.instruction });
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
              setSeed({ model: value.modelId, instruction: value.instruction });
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
    [noteId],
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
      if (disposed || router.state.location.href !== href) return;
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
    if (!view?.processing) return;
    let disposed = false;
    let polling = false;
    const timer = setInterval(() => {
      if (disposed || busy.current || polling) return;
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
  }, [view?.processing, reload, operation, router, fail]);
  useEffect(() => {
    if (
      busy.current ||
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
    if (busy.current) return;
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
    !!catalog?.models.some((item) => item.id === model) &&
    new TextEncoder().encode(instruction).length <= 8192;
  return (
    <section className="hollow-job-batch" aria-label="原本から本文を再生成">
      <h2>原本から本文を再生成</h2>
      <p>
        text・HTML・Markdown・DOCX・XLSX・PPTX・対応範囲の文字PDF・静止画像の原本から、本文だけを置き換えます。題名・タグ・公開設定・表示スタイルは変えません。音声や画像主体・混在PDFの視覚変換は未提供です。
      </p>
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
      {view?.availability === "pdf-text-gated" && (
        <p>
          文字PDFは全頁の文字と順序を確認できる、単純な左揃え一段組に限ります。中央見出し・字下げ・段組・図・ロゴなどがあると対応範囲外になることがあります。一部だけを変換せず原本と旧本文を保持します。
        </p>
      )}
      {view?.availability === "image-gated" && (
        <p>
          静止JPEG・PNG・WebP・GIFのみ対象です。長辺4096px・1600万画素以下を、縮小や切り抜きなしで向き・色・白背景を整えて送信します。アニメーションや複数画像は変換しません。認識結果には誤りがあり得るため原本を確認してください。
        </p>
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
          };
          request.current = input;
          mutate(() => requestLlmFn({ data: input }), "submit");
        }}
      >
        <fieldset disabled={pending || uncertain || !!view?.processing}>
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
                const value = await listLlmModelsFn({
                  data: {
                    kind: view?.format === "image" ? "chat-image" : "chat-text",
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

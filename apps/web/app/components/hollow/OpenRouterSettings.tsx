"use client";
import type { OpenRouterReturn } from "@repo/core/domain/integration/openRouter";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import {
  beginOpenRouterFn,
  checkOpenRouterFn,
  openRouterModelsFn,
  openRouterSettingsFn,
  saveOpenRouterModelsFn,
  unlinkOpenRouterFn,
} from "@/presentation/openRouterServerFn";
import { Shell } from "./Shell";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Settings = Awaited<ReturnType<typeof openRouterSettingsFn>>;
type Catalog = Awaited<ReturnType<typeof openRouterModelsFn>>;
export function OpenRouterSettings({
  email,
  returnTo,
}: {
  email: string;
  returnTo: OpenRouterReturn;
}) {
  const ticket = useAuthenticationOperation();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({ text: "", image: "", audio: "" });
  const dirty =
    !!settings &&
    (draft.text !== settings.models.text.modelId ||
      draft.image !== settings.models.image.modelId ||
      draft.audio !== settings.models.audio.modelId);
  useBlocker({
    shouldBlockFn: () =>
      dirty &&
      !window.confirm("モデル設定が未保存です。この画面を離れますか？"),
    enableBeforeUnload: dirty,
  });
  const accept = useCallback((value: Settings) => {
    setSettings(value);
    setDraft({
      text: value.models.text.modelId,
      image: value.models.image.modelId,
      audio: value.models.audio.modelId,
    });
  }, []);
  useEffect(() => {
    const valid = ticket();
    void (async () => {
      try {
        await bootstrapAuthenticationFn();
        if (!valid()) return;
        const value = await openRouterSettingsFn();
        if (!valid()) return;
        accept(value);
        if (value.configured) {
          const models = await openRouterModelsFn();
          if (valid()) setCatalog(models);
        }
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    })();
  }, [ticket, accept]);
  const mutate = (work: () => Promise<unknown>, success: string) => {
    const valid = ticket();
    setError("");
    setMessage("");
    start(async () => {
      try {
        await work();
        if (!valid()) return;
        const value = await openRouterSettingsFn();
        if (valid()) {
          accept(value);
          setMessage(success);
          await router.invalidate();
        }
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    });
  };
  const begin = () => {
    if (!settings) return;
    const reconnect = settings.state !== "unlinked";
    if (
      reconnect &&
      !window.confirm(
        `新しい連携に成功すると、以前の連携で進行中のAI変換 ${settings.admission.active} 件を取り消します。失敗した場合は現在の連携を維持します。再連携しますか？`,
      )
    )
      return;
    const valid = ticket();
    setError("");
    start(async () => {
      try {
        const result = await beginOpenRouterFn({
          data: {
            expectedEpoch: settings.epoch,
            expectedVersion: settings.version,
            confirmedReconnect: reconnect,
            confirmedAdmissionSequence: settings.admission.sequence,
            returnTo,
          },
        });
        if (valid()) window.location.assign(result.authorizationUrl);
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    });
  };
  const [saveError, save, saving] = useActionState(async (_: string) => {
    if (!settings) return "";
    const valid = ticket();
    setError("");
    setMessage("");
    try {
      await saveOpenRouterModelsFn({
        data: {
          expectedEpoch: settings.epoch,
          expectedVersion: settings.models.version,
          text: { kind: "chat-text", modelId: draft.text },
          image: { kind: "chat-image", modelId: draft.image },
          audio: { kind: "stt-transcription", modelId: draft.audio },
        },
      });
      if (valid()) {
        const result = await openRouterSettingsFn();
        if (valid()) {
          accept(result);
          setMessage("モデル設定を保存しました。");
          await router.invalidate();
        }
      }
      return "";
    } catch (cause) {
      return valid() ? displayError(cause) : "";
    }
  }, "");
  const reloadModels = () => {
    const valid = ticket();
    setError("");
    start(async () => {
      try {
        const value = await openRouterModelsFn();
        if (valid()) setCatalog(value);
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      }
    });
  };
  const busy = pending || saving;
  return (
    <Shell email={email}>
      <section className="hollow-auth">
        <h1>OpenRouter連携</h1>
        <p>
          OpenRouterとの接続と用途別モデルを設定します。有効な連携と構成がある場合、textと対応範囲のDOCX・XLSX・PPTX・文字PDF・静止JPEG・PNG・WebP・GIFをAI変換できます。文書は全文の文字・構造・順序を確認できる場合だけ処理します。画像は画像用モデルで全画素を送り、長辺4096px・1600万画素以下の静止1枚に限ります。認識品質を保証するものではありません。text・HTML・Markdownと対応文書・画像の原本から本文を再生成できます。音声・画像主体や混在PDF・順序不明PDFのAI変換は未提供で、原本を保持します。連携だけでは変換や課金は開始しません。
        </p>
        <p>
          画像のトークン数は事前計算していません。サイズ・寸法の制限内でも、画像を含む入力がモデルの入力上限を超える場合があります。
        </p>
        {!settings && !error && <p role="status">連携状態を確認しています…</p>}
        {settings && (
          <>
            <p>
              状態:{" "}
              {!settings.configured
                ? "この環境では未構成"
                : settings.state === "linked"
                  ? "連携済み"
                  : settings.state === "needs_relink"
                    ? "再連携が必要"
                    : "未連携"}
            </p>
            {!settings.configured && (
              <p>
                管理者の連携設定が必要です。パスワードでのログインと通常の取り込みは引き続き利用できます。
              </p>
            )}
            {settings.linkedAt && (
              <p>連携日時: {new Date(settings.linkedAt).toLocaleString()}</p>
            )}
            {settings.expiresAt && (
              <p>鍵の期限: {new Date(settings.expiresAt).toLocaleString()}</p>
            )}
            <p>
              最終使用:{" "}
              {settings.lastUsedAt
                ? new Date(settings.lastUsedAt).toLocaleString()
                : "未使用"}
            </p>
            <button
              type="button"
              disabled={busy || !settings.configured}
              onClick={begin}
            >
              {settings.state === "unlinked"
                ? "OpenRouterを連携"
                : "OpenRouterを再連携"}
            </button>
            {settings.state === "linked" && (
              <button
                type="button"
                disabled={busy || !settings.configured}
                onClick={() =>
                  mutate(
                    () =>
                      checkOpenRouterFn({
                        data: {
                          epoch: settings.epoch,
                          version: settings.version,
                        },
                      }),
                    "連携を確認しました。",
                  )
                }
              >
                連携を確認
              </button>
            )}
            {settings.state !== "unlinked" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "OpenRouter連携を解除します。進行中のAI変換は取り消され、完成済みノートと他の連携は保持されます。解除しますか？",
                    )
                  )
                    mutate(
                      () =>
                        unlinkOpenRouterFn({
                          data: {
                            epoch: settings.epoch,
                            version: settings.version,
                          },
                        }),
                      "OpenRouter連携を解除しました。",
                    );
                }}
              >
                連携を解除
              </button>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy && dirty && catalog && settings.state === "linked")
                  start(() => save());
              }}
              className="hollow-form"
            >
              <h2>用途別モデル</h2>
              {catalog?.source === "default-fallback" && (
                <p>
                  現在のモデル一覧を取得できていません。採用済みの既定候補だけを選択できますが、現在の提供状況は未確認です。保存済み設定を自動で置き換えません。候補がない用途は一覧を再取得してください。
                </p>
              )}
              {(
                [
                  {
                    field: "text",
                    kind: "chat-text",
                    label: "文章・PDF用モデル",
                  },
                  { field: "image", kind: "chat-image", label: "画像用モデル" },
                  {
                    field: "audio",
                    kind: "stt-transcription",
                    label: "音声文字起こし用モデル",
                  },
                ] as const
              ).map((item) => {
                const defaultId = catalog?.defaults[item.field].modelId;
                const choices = (catalog?.models ?? [])
                  .filter(
                    (model) =>
                      model.kinds.includes(item.kind) &&
                      (!model.expiresAt || model.expiresAt > new Date()),
                  )
                  .sort((a, b) =>
                    a.id === defaultId
                      ? -1
                      : b.id === defaultId
                        ? 1
                        : a.id.localeCompare(b.id),
                  );
                return (
                  <label key={item.field}>
                    {item.label}
                    <select
                      value={draft[item.field]}
                      disabled={
                        busy ||
                        choices.length === 0 ||
                        settings.state !== "linked"
                      }
                      onChange={(event) =>
                        setDraft({ ...draft, [item.field]: event.target.value })
                      }
                    >
                      {!choices.some(
                        (model) => model.id === draft[item.field],
                      ) && (
                        <option value={draft[item.field]} disabled>
                          {draft[item.field]}（保存値・現在の提供未確認）
                        </option>
                      )}
                      {choices.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} — {model.id}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
              <p>
                既定候補: 文章・画像 google/gemini-3.5-flash-lite、音声
                openai/whisper-large-v3。実サービスでの品質・利用料金は未検証です。
              </p>
              <button
                type="button"
                disabled={busy || !settings.configured}
                onClick={reloadModels}
              >
                モデル一覧を再取得
              </button>
              <button
                type="submit"
                disabled={
                  busy || !dirty || !catalog || settings.state !== "linked"
                }
              >
                {saving ? "保存しています…" : "モデル設定を保存"}
              </button>
            </form>
          </>
        )}
        {busy && <p role="status">処理しています…</p>}
        {(error || saveError) && <p role="alert">{error || saveError}</p>}
        {message && <p role="status">{message}</p>}
        <Link to="/notes">ノートに戻る</Link>
      </section>
    </Shell>
  );
}

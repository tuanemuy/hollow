"use client";
import type { NoteVisibility } from "@repo/core/domain/sharing/entity";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  beginUploadFn,
  cancelImportFn,
  sealUploadFn,
} from "@/presentation/hollowImports";
import { scopeSearch } from "@/presentation/workspaceInput";
import {
  canBeCompanion,
  collectDroppedFiles,
  defaultImportRole,
  IMPORT_ACCEPT,
  importEstimate,
  importSourcePath,
  isStylesheetImport,
  isSupportedImport,
  requiresCompanion,
  validateSelectedFiles,
} from "./importSelection";
import "./import.css";
import { NoteCreationScope } from "./NoteCreationScope";
import { ScopeUsageLive } from "./WorkspaceScope";
export function ImportUpload({
  workspaceId,
}: {
  workspaceId?: string | undefined;
}) {
  const router = useRouter();
  const [acceptedWorkspaceId, setAcceptedWorkspaceId] = useState(workspaceId);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [files, setFiles] = useState<File[]>([]);
  const [useAi, setUseAi] = useState(true);
  const [requestedVisibility, setRequestedVisibility] =
    useState<NoteVisibility>("private");
  const [importReferences, setImportReferences] = useState(true);
  const [metadata, setMetadata] = useState(
    new Map<File, { role: "note" | "companion"; path: string }>(),
  );
  const [unsealedBatch, setUnsealedBatch] = useState<string | null>(null);
  const [progress, setProgress] = useState<
    Record<number, { percent: number; message: string }>
  >({});
  const [error, setError] = useState("");
  const [excluded, setExcluded] = useState(0);
  const [collecting, setCollecting] = useState(false);
  const [pending, start] = useTransition();
  const [scopeBusy, setScopeBusy] = useState(false);
  const stopped = useRef(false);
  const active = useRef<XMLHttpRequest | null>(null);
  const batchId = useRef<string | null>(null);
  const navigating = useRef(false);
  const departed = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileKeys = useRef(new WeakMap<File, string>());
  useBlocker({
    shouldBlockFn: () => {
      if (!pending || navigating.current) return false;
      const leave = window.confirm(
        "アップロードが完了していません。この画面を離れますか？",
      );
      if (leave) departed.current = true;
      return !leave;
    },
    enableBeforeUnload: pending,
  });
  const syncFileInput = (selected: readonly File[]) => {
    if (!fileInput.current) return;
    if (!selected.length) {
      fileInput.current.value = "";
      return;
    }
    const transfer = new DataTransfer();
    for (const file of selected) transfer.items.add(file);
    fileInput.current.files = transfer.files;
  };
  const select = (incoming: File[], skipped = 0) => {
    setError("");
    setProgress({});
    const accepted = incoming.filter((file) => isSupportedImport(file.name));
    try {
      validateSelectedFiles(accepted);
    } catch (cause) {
      syncFileInput(files);
      setError(
        cause instanceof Error
          ? cause.message
          : "ファイルを選択できませんでした。",
      );
      return;
    }
    setExcluded(skipped + incoming.length - accepted.length);
    syncFileInput(accepted);
    setFiles(accepted);
    setMetadata(
      new Map(
        accepted.map((file) => [
          file,
          { role: defaultImportRole(file.name), path: importSourcePath(file) },
        ]),
      ),
    );
    for (const file of accepted)
      fileKeys.current.set(file, crypto.randomUUID());
  };
  const estimates = files.map((file) =>
    metadata.get(file)?.role === "companion"
      ? {
          format: isStylesheetImport(file.name) ? "CSS" : "参照リソース",
          method: "参照用に保存（ノートは作りません）",
          needsAi: false,
          pdf: false,
        }
      : importEstimate(file.name, useAi),
  );
  const companionCount = files.filter(
    (file) => metadata.get(file)?.role === "companion",
  ).length;
  const invalidRole = files.some(
    (file) =>
      requiresCompanion(file.name) && metadata.get(file)?.role !== "companion",
  );
  const paths = files.map(
    (file) => metadata.get(file)?.path ?? importSourcePath(file),
  );
  const duplicatePaths = [
    ...new Set(paths.filter((value, index) => paths.indexOf(value) !== index)),
  ];
  const needsAiCount = estimates.filter((estimate) => estimate.needsAi).length;
  const pdfCount = estimates.filter((estimate) => estimate.pdf).length;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const transferredBytes = files.reduce(
    (sum, file, index) =>
      sum + (file.size * (progress[index]?.percent ?? 0)) / 100,
    0,
  );
  const overallPercent = totalBytes
    ? Math.round((transferredBytes / totalBytes) * 100)
    : 0;
  const upload = (file: File, id: string, index: number) =>
    new Promise<{ noteId: string | null; jobId: string | null }>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();
        active.current = xhr;
        xhr.open("POST", `/api/hollow/uploads/${id}`);
        xhr.timeout = 300_000;
        xhr.ontimeout = () =>
          reject(new Error("アップロードが時間切れになりました"));
        setProgress((previous) => ({
          ...previous,
          [index]: { percent: 0, message: "アップロード中" },
        }));
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress((p) => ({
              ...p,
              [index]: {
                percent: Math.round((e.loaded / e.total) * 100),
                message: "アップロード中",
              },
            }));
        };
        xhr.onerror = () => reject(new Error("通信に失敗しました"));
        xhr.onabort = () => reject(new Error("アップロードを取り消しました"));
        xhr.onload = () => {
          try {
            const result = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(result);
            else reject({ serialized: result.error });
          } catch {
            reject(new Error("アップロード応答を読み取れません"));
          }
        };
        xhr.send(file);
      },
    );
  return (
    <section>
      <p className="hollow-eyebrow">
        {acceptedWorkspaceId ? "ワークスペース" : "個人"} / 変換成功まで非公開
      </p>
      <h1>ファイルを取り込む</h1>
      <p>原本を保存してノートに変換します。変換は画面を閉じても続きます。</p>
      <NoteCreationScope
        value={acceptedWorkspaceId}
        disabled={pending || unsealedBatch !== null}
        onBusy={setScopeBusy}
        onChange={async (next) => {
          setAcceptedWorkspaceId(next);
          setProgress({});
        }}
      />
      {acceptedWorkspaceId !== workspaceId && (
        <ScopeUsageLive
          workspaceId={acceptedWorkspaceId ?? null}
          refreshKey={0}
        />
      )}
      <label>
        変換成功後の公開状態
        <select
          aria-label="変換成功後の公開状態"
          value={requestedVisibility}
          disabled={pending || unsealedBatch !== null}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "private" || next === "link" || next === "public")
              setRequestedVisibility(next);
          }}
        >
          <option value="private">非公開</option>
          <option value="link">限定公開（リンクを知る人）</option>
          <option value="public">公開（誰でも閲覧可能）</option>
        </select>
      </label>
      <p className="hollow-help">
        変換が成功するまで非公開です。失敗・取消・要AI連携の本文は公開しません。取り込み中に共有設定を変更した場合は、その設定を優先します。
      </p>
      {requestedVisibility === "public" && (
        <p className="hollow-help">
          公開には
          {acceptedWorkspaceId
            ? "ワークスペースの公開スラッグ"
            : "プロフィールの公開ハンドル"}
          が必要です。受付前と変換成功時に確認します。
          {acceptedWorkspaceId ? (
            <Link
              to="/workspaces/$workspaceId/settings"
              params={{ workspaceId: acceptedWorkspaceId }}
            >
              公開スラッグの設定
            </Link>
          ) : (
            <Link to="/settings/profile">公開ハンドルの設定</Link>
          )}
        </p>
      )}
      <section
        aria-label="ファイル選択"
        className="hollow-upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          if (pending || collecting) return;
          const items = [...e.dataTransfer.items];
          const droppedFiles = [...e.dataTransfer.files];
          setCollecting(true);
          setError("");
          try {
            const result = await collectDroppedFiles(items, droppedFiles);
            select(result.files, result.excluded);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "フォルダを読み取れませんでした。ファイル選択からお試しください。",
            );
          } finally {
            setCollecting(false);
          }
        }}
      >
        <label htmlFor="import-files">
          ファイルを選ぶ、またはファイル・フォルダをここへドロップ
        </label>
        <input
          id="import-files"
          ref={fileInput}
          type="file"
          multiple
          accept={IMPORT_ACCEPT}
          disabled={pending || collecting}
          onChange={(e) => select([...(e.target.files ?? [])])}
        />
      </section>
      {collecting && <p role="status">フォルダ内のファイルを確認しています…</p>}
      {excluded > 0 && (
        <p role="status" className="hollow-message">
          未対応のファイル {excluded}{" "}
          件を除外しました。旧Office・ZIPは取り込めません。
        </p>
      )}
      <p className="hollow-help">
        HTML・Markdown・TXT・DOCX・XLSX・PPTX・PDF・画像・音声。CSS・画像・動画を参照用として同梱できます。最大100件
        / 合計500 MB。原本は受付時の保存先の容量（
        {acceptedWorkspaceId ? "ワークスペース20 GiB" : "個人5 GiB"}
        ）に含まれます。
      </p>
      {files.length > 0 && (
        <div className="hollow-import-summary">
          <p>
            {files.length} 件 · {(totalBytes / 1024 / 1024).toFixed(1)} MB
            {companionCount > 0 && `（うち参照用 ${companionCount} 件）`}
          </p>
          <p>
            形式・変換方式は拡張子からの暫定判定です。受け付け時はファイルの内容で判定します。
          </p>
          {needsAiCount > 0 && (
            <p role="status">
              {needsAiCount} 件は
              {useAi
                ? "機械変換できません。対応する静止画像は有効な連携・構成と検査の後にAI変換します。音声のAI変換は未提供です。原本を保持し、連携だけでは変換されません。"
                : "LLM なしでは取り込めません。原本を保存し、失敗として記録します。"}
            </p>
          )}
          {pdfCount > 0 && (
            <>
              <p>
                PDF {pdfCount}
                {useAi
                  ? "件の変換方式はまだ未確定です。有効なOpenRouter連携・構成がある場合、全頁を検査し、文字と順序を確認できるPDFは文字用、対応する画像主体・混在頁・段組などのPDFは全頁画像用モデルで変換します。破損・暗号化・上限超過などを画像化で回避しません。失敗時も原本を保持します。"
                  : "件はLLMを使わずに文字を機械抽出します。文字を抽出できない場合は失敗として記録し、原本を保持します。画像をAIで解析する処理は行いません。"}
              </p>
              {useAi && (
                <p>
                  全頁画像は最大32頁・144dpi・各辺1728px以下です。画像のトークン数は事前計算していません。サイズ・寸法の制限内でも、画像を含む入力がモデルの入力上限を超える場合があります。認識結果は原本と照合してください。
                </p>
              )}
            </>
          )}
        </div>
      )}
      {duplicatePaths.length > 0 && (
        <p className="hollow-message" role="status">
          同梱パスが重複しています: {duplicatePaths.join("、")}
          。通常ノートは別々に保存しますが、このパスへの参照は特定できません。
        </p>
      )}
      {files.length > 0 && companionCount === files.length && (
        <p className="hollow-message" role="alert">
          参照用ファイルだけでは取り込めません。本文の HTML または Markdown
          も選択してください。
        </p>
      )}
      <label className="hollow-check">
        <input
          type="checkbox"
          checked={importReferences}
          disabled={pending}
          onChange={(event) => setImportReferences(event.target.checked)}
        />
        参照画像・動画・CSSも取り込む（既定オン）
      </label>
      <p className="hollow-help">
        オフでも参照候補と同梱ファイルを保存し、後からオンにできます。CSSは参照用です。通常画像は既定でノートに変換し、参照用にする場合は明示的に変更してください。SVG・動画は参照用として対応します。
      </p>
      <label className="hollow-check">
        <input
          type="checkbox"
          checked={!useAi}
          disabled={pending}
          onChange={(e) => setUseAi(!e.target.checked)}
        />
        LLMを使わずに取り込む
      </label>
      <p className="hollow-help">
        構成済み環境で有効なOpenRouter連携がある場合、text・DOCX・XLSX・PPTX・対応範囲のPDFと静止JPEG・PNG・WebP・GIFをAIで変換します。Officeは文字・構造を対象にし、画像や図の未解釈を案内します。PDFは全頁を検査して文字用または全頁画像用に確定します。文書は非連携・未構成またはLLM不使用なら従来の機械変換、通常HTML・Markdownは常時機械変換です。画像は長辺4096px・1600万画素以下の静止1枚だけで、非連携・未構成は原本保持と要連携、LLM不使用は失敗になります。縮小や切り抜きはせず、認識結果は原本と照合してください。AI受付後の失敗を機械変換の成功へ置き換えません。音声のAI変換は未提供です。原本を保持し、失敗・未対応の理由を履歴に表示します。
        <a
          href={`/settings/openrouter?returnTo=upload${acceptedWorkspaceId ? `&workspaceId=${encodeURIComponent(acceptedWorkspaceId)}` : ""}`}
        >
          OpenRouter連携とモデル設定
        </a>
      </p>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {(pending || Object.keys(progress).length > 0) && (
        <div className="hollow-import-overall" role="status">
          <label htmlFor="import-overall-progress">
            全体のアップロード {overallPercent}%
          </label>
          <progress
            id="import-overall-progress"
            max={100}
            value={overallPercent}
          />
          <span>
            原本保存{" "}
            {
              Object.values(progress).filter((item) =>
                item.message.startsWith("原本保存済み"),
              ).length
            }{" "}
            / {files.length} 件
          </span>
        </div>
      )}
      <ul className="hollow-import-files">
        {files.map((file, i) => (
          <li key={fileKeys.current.get(file)}>
            <strong>{file.name}</strong>{" "}
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span className="hollow-import-method">
              {estimates[i]?.format} · {estimates[i]?.method}
            </span>
            <label>
              用途{" "}
              <select
                aria-label={`${file.name} の用途`}
                value={metadata.get(file)?.role ?? "note"}
                disabled={pending}
                onChange={(event) => {
                  const role =
                    event.target.value === "companion" ? "companion" : "note";
                  setMetadata((previous) =>
                    new Map(previous).set(file, {
                      path: previous.get(file)?.path ?? importSourcePath(file),
                      role,
                    }),
                  );
                }}
              >
                <option value="note" disabled={isStylesheetImport(file.name)}>
                  通常ノート
                </option>
                <option value="companion" disabled={!canBeCompanion(file.name)}>
                  参照用（ノートを作らない）
                </option>
              </select>
            </label>
            {requiresCompanion(file.name) &&
              metadata.get(file)?.role !== "companion" && (
                <p className="hollow-message" role="alert">
                  この形式は参照用を選択してください。
                </p>
              )}
            <label>
              同梱パス{" "}
              <input
                aria-label={`${file.name} の同梱パス`}
                value={metadata.get(file)?.path ?? importSourcePath(file)}
                maxLength={1024}
                disabled={pending}
                onChange={(event) => {
                  const sourcePath = event.target.value;
                  setMetadata((previous) =>
                    new Map(previous).set(file, {
                      role:
                        previous.get(file)?.role ??
                        defaultImportRole(file.name),
                      path: sourcePath,
                    }),
                  );
                }}
              />
            </label>
            {!pending && (
              <button
                type="button"
                className="hollow-button hollow-import-remove"
                aria-label={`${file.name} を選択から除く`}
                onClick={() => {
                  const remaining = files.filter(
                    (candidate) => candidate !== file,
                  );
                  syncFileInput(remaining);
                  setFiles(remaining);
                  setProgress({});
                }}
              >
                除く
              </button>
            )}
            {progress[i] && (
              <>
                <progress
                  max={100}
                  value={progress[i].percent}
                  aria-label={`${file.name} のアップロード`}
                />
                <span role="status">{progress[i].message}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="hollow-import-actions">
        <button
          type="button"
          className="hollow-button hollow-primary"
          disabled={
            pending ||
            scopeBusy ||
            collecting ||
            !files.length ||
            companionCount === files.length ||
            unsealedBatch !== null ||
            invalidRole
          }
          onClick={() =>
            start(async () => {
              stopped.current = false;
              navigating.current = false;
              departed.current = false;
              setError("");
              setProgress({});
              try {
                const batch = await beginUploadFn({
                  data: {
                    files: files.map((f) => ({
                      name: f.name,
                      bytes: f.size,
                      ...(metadata.get(f) ?? {
                        role: defaultImportRole(f.name),
                        path: importSourcePath(f),
                      }),
                    })),
                    useAi,
                    requestedVisibility,
                    importReferences,
                    ...(acceptedWorkspaceId
                      ? { workspaceId: acceptedWorkspaceId }
                      : {}),
                  },
                });
                batchId.current = batch.batchId;
                let single: string | null = null;
                let sealingFailed = false;
                let sealingError: unknown;
                try {
                  if (stopped.current)
                    await cancelImportFn({ data: { id: batch.batchId } });
                  for (const [index, row] of batch.files.entries()) {
                    if (stopped.current) break;
                    const file = files[index];
                    if (!file) continue;
                    try {
                      const accepted = await upload(file, row.id, index);
                      single = accepted.noteId;
                      setProgress((p) => ({
                        ...p,
                        [index]: {
                          percent: 100,
                          message: accepted.noteId
                            ? "原本保存済み・変換を受け付けました"
                            : "原本保存済み・参照用として保存しました",
                        },
                      }));
                    } catch (cause) {
                      setProgress((p) => ({
                        ...p,
                        [index]: {
                          percent: p[index]?.percent ?? 0,
                          message: stopped.current
                            ? "取消済み"
                            : `失敗: ${displayError(cause)}。取り込み直してください。`,
                        },
                      }));
                    }
                  }
                } finally {
                  try {
                    await sealUploadFn({ data: { id: batch.batchId } });
                    setUnsealedBatch(null);
                  } catch (cause) {
                    setUnsealedBatch(batch.batchId);
                    sealingFailed = true;
                    sealingError = cause;
                  }
                }
                if (sealingFailed) throw sealingError;
                await router.invalidate();
                if (!mounted.current || departed.current) return;
                navigating.current = true;
                if (!stopped.current && files.length === 1 && single)
                  await router.navigate({
                    to: "/notes/$noteId",
                    params: { noteId: single },
                  });
                else if (!stopped.current)
                  await router.navigate({
                    to: "/notes/jobs",
                    search: scopeSearch(acceptedWorkspaceId),
                  });
              } catch (cause) {
                setError(displayError(cause));
              } finally {
                active.current = null;
                batchId.current = null;
              }
            })
          }
        >
          {pending ? "アップロード中…" : "アップロードを開始"}
        </button>
        {pending && (
          <button
            type="button"
            className="hollow-button"
            onClick={() => {
              if (
                !window.confirm(
                  "未開始の取り込みを取り消しますか？保存済みの原本とノートは残ります。開始済みの変換は完了まで続きます。",
                )
              )
                return;
              stopped.current = true;
              active.current?.abort();
              const id = batchId.current;
              if (id)
                start(async () => {
                  try {
                    await cancelImportFn({ data: { id } });
                    await router.invalidate();
                    setError(
                      "未開始の取り込みを取り消しました。処理開始済みの変換は完了まで続きます。",
                    );
                  } catch (cause) {
                    setError(displayError(cause));
                  }
                });
            }}
          >
            取り消す
          </button>
        )}
        <Link to="/notes/jobs" search={scopeSearch(acceptedWorkspaceId)}>
          処理履歴
        </Link>
      </div>
      {unsealedBatch && (
        <div className="hollow-message" role="alert">
          <p>
            保存できたファイルは保持しています。取り込みの終了処理を再試行してください。
          </p>
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await sealUploadFn({ data: { id: unsealedBatch } });
                  setUnsealedBatch(null);
                  setError("");
                  await router.invalidate();
                  if (!mounted.current) return;
                  navigating.current = true;
                  await router.navigate({
                    to: "/notes/jobs",
                    search: scopeSearch(acceptedWorkspaceId),
                  });
                } catch (cause) {
                  setError(displayError(cause));
                }
              })
            }
          >
            終了処理を再試行
          </button>
        </div>
      )}
    </section>
  );
}

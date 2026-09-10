"use client";

import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  listRevisionsFn,
  restoreRevisionFn,
} from "@/presentation/hollowRevisions";
import { NoteContent } from "./NoteContent";

type History = Awaited<ReturnType<typeof listRevisionsFn>>;
const causeNames: Readonly<Record<string, string>> = {
  manual: "手動保存",
  autosave: "自動保存",
  title: "タイトル変更",
  style: "表示スタイル変更",
  import: "ファイル変換",
  reference: "参照リソース反映",
  restore: "過去版から復元",
  baseline: "保持開始時の版",
  legacy: "移行時の保持版",
  initialization: "初回の表示設定",
};
const actors = {
  user: "利用者の操作",
  system: "システム処理",
  legacy: "移行時の保持版（過去の実行者は不明）",
} as const;

export function NoteHistory({
  noteId,
  version,
  processing,
  canEdit = true,
}: {
  noteId: string;
  version: number;
  processing: boolean;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<History | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [confirmation, setConfirmation] = useState<{
    revisionNo: number;
    expectedVersion: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [pending, start] = useTransition();
  const previewChanged = useCallback(
    (status: "loading" | "ready" | "error") => setPreviewStatus(status),
    [],
  );

  useEffect(() => {
    const showHistory = () => {
      if (window.location.hash === "#note-history") setOpen(true);
      const match = /^#note-history-([1-9][0-9]*)$/.exec(window.location.hash);
      if (match && Number.isSafeInteger(Number(match[1]))) {
        setSelected(Number(match[1]));
        setOpen(true);
      }
    };
    showHistory();
    window.addEventListener("hashchange", showHistory);
    return () => window.removeEventListener("hashchange", showHistory);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Version and retry refresh the server-owned immutable revision list.
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    setLoading(true);
    void listRevisionsFn({ data: { noteId } })
      .then((result) => {
        if (disposed) return;
        setData(result);
        setConfirmation(null);
      })
      .catch((cause) => {
        if (!disposed) setError(displayError(cause));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [noteId, version, processing, open, attempt]);

  const item = data?.items.find((entry) => entry.revisionNo === selected);
  const canRestore = Boolean(
    canEdit &&
      item &&
      !item.sameAsCurrent &&
      !item.isCurrent &&
      !data?.processing &&
      !loading &&
      previewStatus === "ready",
  );
  const restore = () => {
    if (!confirmation || pending || !canRestore) return;
    const snapshot = confirmation;
    start(async () => {
      setError("");
      setMessage("");
      try {
        const result = await restoreRevisionFn({
          data: { noteId, ...snapshot },
        });
        setRemoved(result.removed);
      } catch (cause) {
        setConfirmation(null);
        setAttempt((value) => value + 1);
        setError(
          `復元結果を確認できません。${displayError(cause)} 最新の履歴を確認してから、再度復元するか判断してください。`,
        );
        return;
      }
      setConfirmation(null);
      setSelected(null);
      setMessage(
        `版 ${snapshot.revisionNo} を新しい現在版として保存しました。未取得の参照は現在の設定に従って別途処理します。`,
      );
      try {
        setData(await listRevisionsFn({ data: { noteId } }));
        await router.invalidate();
      } catch (cause) {
        setError(
          `復元は保存済みですが、最新の表示を取得できません。再読み込みしてください。${displayError(cause)}`,
        );
      }
    });
  };

  return (
    <section
      id="note-history"
      className="hollow-original"
      aria-label="版の履歴"
    >
      <details
        open={open}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
          if (!event.currentTarget.open && !pending) {
            setSelected(null);
            setConfirmation(null);
          }
        }}
      >
        <summary>版の履歴</summary>
        <p className="hollow-help">
          現在を含む直近20版を保持します。選択だけでは本文を変更しません。復元すると、本文・タイトル・表示スタイルを新しい版として保存します。
        </p>
        <button
          type="button"
          className="hollow-button"
          disabled={loading || pending}
          onClick={() => {
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          履歴を再読み込み
        </button>
        {loading && <p role="status">履歴を読み込み中…</p>}
        {data?.processing && (
          <p role="status" className="hollow-message">
            本文を変換中のため復元できません。完了を待つか、
            <Link to="/notes/jobs">処理履歴</Link>で取消を確認してください。
          </p>
        )}
        {data && !data.items.length && <p>保持されている版はありません。</p>}
        {data && (
          <ol>
            {data.items.map((entry) => (
              <li key={entry.revisionNo}>
                <button
                  type="button"
                  className="hollow-button"
                  disabled={pending || loading}
                  aria-pressed={selected === entry.revisionNo}
                  onClick={() => {
                    if (selected !== entry.revisionNo)
                      setPreviewStatus("loading");
                    setSelected(entry.revisionNo);
                    setConfirmation(null);
                    setError("");
                    setMessage("");
                  }}
                >
                  版 {entry.revisionNo}
                  {entry.isCurrent ? "（現在）" : ""}：{entry.title || "無題"}
                </button>
                <p className="hollow-help">
                  <time dateTime={entry.savedAt}>
                    {new Date(entry.savedAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </time>{" "}
                  · {causeNames[entry.cause] ?? "保存"} ·{" "}
                  {actors[entry.actorKind]}
                </p>
                {!entry.isCurrent && entry.sameAsCurrent && (
                  <p className="hollow-help">現在と同じ内容</p>
                )}
              </li>
            ))}
          </ol>
        )}
        {item && (
          <section aria-label="過去版のプレビュー">
            <h3>
              版 {item.revisionNo}：{item.title || "無題"}
            </h3>
            <p>
              {item.style === "original"
                ? "元の装飾のみ"
                : "既定スタイルを適用"}{" "}
              · 読み取り専用プレビュー
            </p>
            <NoteContent
              key={item.revisionNo}
              noteId={noteId}
              revisionNo={item.revisionNo}
              onStatusChange={previewChanged}
            />
            {(item.isCurrent || item.sameAsCurrent) && (
              <p>現在と同じ内容のため復元は不要です。</p>
            )}
            <div className="hollow-actions">
              <button
                type="button"
                className="hollow-button"
                disabled={pending}
                onClick={() => {
                  setSelected(null);
                  setConfirmation(null);
                }}
              >
                プレビューを取り消す
              </button>
              <button
                type="button"
                className="hollow-button hollow-primary"
                disabled={pending || !canRestore}
                onClick={() => {
                  if (data)
                    setConfirmation({
                      revisionNo: item.revisionNo,
                      expectedVersion: data.currentVersion,
                    });
                }}
              >
                この版への復元を確認
              </button>
            </div>
          </section>
        )}
        {confirmation && (
          <fieldset className="hollow-message" aria-label="復元の確認">
            <p>
              版 {confirmation.revisionNo}{" "}
              の本文・タイトル・表示スタイルで現在を置き換え、新しい版を作成します。原本・参照設定・処理履歴は巻き戻しません。
            </p>
            <div className="hollow-actions">
              <button
                type="button"
                className="hollow-button"
                disabled={pending}
                onClick={() => setConfirmation(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="hollow-button hollow-primary"
                disabled={pending || !canRestore}
                onClick={restore}
              >
                {pending ? "復元を保存中…" : "復元して保存"}
              </button>
            </div>
          </fieldset>
        )}
      </details>
      {pending && <p role="status">選択した版を復元しています…</p>}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="hollow-help">
          {message}
        </p>
      )}
      {removed.length > 0 && (
        <details className="hollow-message" open>
          <summary>復元時、安全のため除去した内容</summary>
          <ul>
            {[...new Set(removed)].map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

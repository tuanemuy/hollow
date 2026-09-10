"use client";
import { useEffect, useState } from "react";
import {
  draftKey,
  editorRecoveryDownload,
  readEditorBackup,
} from "./editorSave";

export function EditorBackupRecovery({
  userId,
  noteId,
  workspaceId,
}: {
  userId: string;
  noteId?: string;
  workspaceId?: string;
}) {
  const key = draftKey(userId, noteId, workspaceId);
  const [result, setResult] = useState<{
    key: string;
    backup: ReturnType<typeof readEditorBackup>;
    error: string;
  } | null>(null);
  useEffect(() => {
    try {
      setResult({
        key,
        backup: readEditorBackup(localStorage, key),
        error: "",
      });
    } catch {
      setResult({
        key,
        backup: null,
        error:
          "このブラウザの退避内容を読み出せません。退避データは削除していません。",
      });
    }
  }, [key]);
  const current = result?.key === key ? result : null;
  const backup = current?.backup;
  const error = current?.error;
  return (
    <section className="hollow-message" aria-label="未保存内容の回収">
      <h2>未保存内容の回収</h2>
      <p>
        サーバーのノートにはアクセスせず、この利用者・このノート（新規の場合は同じ保存先）のブラウザ退避だけを確認します。
      </p>
      {!current && <p role="status">このノートの退避内容を確認しています。</p>}
      {error && <p role="alert">{error}</p>}
      {backup ? (
        <>
          <p>
            このブラウザに退避内容があります。保存済みとは限りません。HTML・タイトル・編集モードの回収用
            JSON を保存できます。
          </p>
          <button
            type="button"
            className="hollow-button"
            onClick={() => {
              const file = editorRecoveryDownload(
                backup.draft,
                backup.mode ?? "html",
              );
              const url = URL.createObjectURL(
                new Blob([file.content], { type: file.mime }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = file.filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 0);
            }}
          >
            この退避 JSON を保存
          </button>
        </>
      ) : (
        current &&
        !error && (
          <p>
            このブラウザに該当する退避内容は見つかりません。ノートを削除・上書きする操作は行っていません。
          </p>
        )
      )}
    </section>
  );
}

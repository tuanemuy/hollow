"use client";

import type { NoteView } from "@repo/core/application/note/view";
import type {
  DisplayStyle,
  NoteDisplay,
} from "@repo/core/domain/note/displayStyle";
import { useRouter } from "@tanstack/react-router";
import { useId, useOptimistic, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { setDisplayStyleFn } from "@/presentation/hollowNotes";
import { NoteContent } from "./NoteContent";

const labels = {
  default: "既定スタイルを適用",
  original: "元の装飾のみ",
} as const;

function originDescription(display: NoteDisplay, canEdit = true): string {
  if (display.initialization.kind !== "complete")
    return (
      "初回の装飾を確認中です。確定するまでは既定スタイルで表示します。" +
      (canEdit ? "今選択すると、以後は選択した設定を維持します。" : "")
    );
  if (display.source === "user")
    return "利用者が選択した設定です。本文の装飾が変わっても自動では変更しません。";
  if (display.source === "legacy")
    return "既存ノートの設定を保持しています。取り込み時の自動判定ではありません。";
  if (display.initialization.reason === "blank")
    return "新規ノートの既定設定です。本文の装飾が変わっても自動では変更しません。";
  if (display.initialization.reason === "interrupted")
    return "初回処理の完了前に、確認できた装飾から確定しました。後の取得結果で自動では変更しません。";
  return "取り込み時に残った安全な装飾から自動判定した設定です。";
}

export function NoteDisplayStyle({
  note,
  canEdit = true,
}: {
  note: NoteView;
  canEdit?: boolean;
}) {
  if (!canEdit)
    return (
      <>
        <div className="hollow-original">
          <p>表示スタイル：{labels[note.display.style]}</p>
          <p className="hollow-help">
            {originDescription(note.display, false)}
          </p>
        </div>
        {note.html && (
          <NoteContent
            html={note.html}
            noteId={note.id}
            title={`${note.title} の本文`}
            displayStyle={note.display.style}
          />
        )}
      </>
    );
  return <EditableNoteDisplayStyle note={note} />;
}

function EditableNoteDisplayStyle({ note }: { note: NoteView }) {
  const router = useRouter();
  const choiceId = useId();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<DisplayStyle | null>(null);
  const [confirmed, setConfirmed] = useState<{
    version: number;
    display: NoteDisplay;
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const saved =
    confirmed && confirmed.version >= note.version
      ? confirmed.display
      : note.display;
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const previewStyle = selection ?? optimistic.style;
  const canApply =
    (selection !== null && selection !== saved.style) ||
    saved.source !== "user";

  const apply = () => {
    if (!canApply || pending) return;
    const style = selection ?? saved.style;
    start(async () => {
      setError("");
      setMessage("");
      setOptimistic({
        style,
        source: "user",
        initialization: { kind: "complete", reason: "user" },
      });
      try {
        const result = await setDisplayStyleFn({
          data: { id: note.id, style },
        });
        setConfirmed({ version: result.version, display: result.display });
        setSelection(null);
        setOpen(false);
        setMessage("表示スタイルを保存しました。");
      } catch (cause) {
        setSelection(null);
        setError(
          `表示スタイルを保存できませんでした。保存済みの表示に戻しました。${displayError(cause)}`,
        );
        return;
      }
      try {
        await router.invalidate();
      } catch (cause) {
        setError(
          `設定は保存済みですが、最新の本文を取得できません。再読み込みしてください。${displayError(cause)}`,
        );
      }
    });
  };

  return (
    <>
      <details
        className="hollow-original"
        open={open}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
          if (!event.currentTarget.open && !pending) setSelection(null);
        }}
      >
        <summary>表示スタイル：{labels[optimistic.style]}</summary>
        <p>
          {pending
            ? "選択した表示スタイルを保存中…"
            : `保存済み：${labels[saved.style]}`}
        </p>
        <p className="hollow-help">{originDescription(optimistic)}</p>
        <fieldset disabled={pending}>
          <legend>このノートの表示をプレビュー</legend>
          {(["default", "original"] as const).map((style) => (
            <label className="hollow-check" key={style}>
              <input
                type="radio"
                name={choiceId}
                value={style}
                checked={previewStyle === style}
                onChange={() => {
                  setSelection(style);
                  setError("");
                  setMessage("");
                }}
              />
              {labels[style]}
            </label>
          ))}
        </fieldset>
        <p className="hollow-help">
          「元の装飾のみ」は Hollow
          の既定装飾を外します。本文に装飾がなければ素のブラウザ表示になります。本文や安全性の設定は変更しません。
        </p>
        <div className="hollow-actions">
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={() => {
              setSelection(null);
              setOpen(false);
              setError("");
              setMessage(
                "プレビューを取り消しました。保存済みの表示に戻しました。",
              );
            }}
          >
            取消
          </button>
          <button
            type="button"
            className="hollow-button hollow-primary"
            disabled={pending || !canApply}
            onClick={apply}
          >
            {pending ? "適用中…" : "適用"}
          </button>
        </div>
      </details>
      {saved.initialization.kind !== "complete" && !pending && (
        <p role="status" className="hollow-message">
          初回の装飾を確認中です。
          {saved.initialization.kind === "conversion"
            ? "本文の変換"
            : "参照 CSS の取得"}
          が終了すると表示設定が確定します。
        </p>
      )}
      {selection !== null && !pending && (
        <p role="status" className="hollow-help">
          プレビュー中：{labels[selection]}。まだ保存していません。
        </p>
      )}
      {pending && <p role="status">表示スタイルを保存中…</p>}
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
      {note.html && (
        <NoteContent
          html={note.html}
          noteId={note.id}
          title={`${note.title} の本文`}
          displayStyle={previewStyle}
        />
      )}
    </>
  );
}

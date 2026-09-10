"use client";

import type { NoteView } from "@repo/core/application/note/view";
import { Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { trashNoteFn } from "@/presentation/hollowTrash";
import { scopeSearch } from "@/presentation/workspaceInput";
import { noteStatus } from "./ImportJobs";
import { NoteTrashDialog, type NoteTrashIntent } from "./NoteTrashDialog";
import { useTrashNotice } from "./TrashProvider";

type NoteListItem = Pick<
  NoteView,
  "id" | "title" | "createdAt" | "updatedAt" | "status"
> & { thumbnailUrl?: string | null };
export function NoteList({
  notes: items,
  canEdit = true,
  workspaceId,
  paged = false,
}: {
  notes: readonly NoteListItem[];
  canEdit?: boolean;
  workspaceId?: string | null;
  paged?: boolean;
}) {
  const router = useRouter();
  const notify = useTrashNotice();
  const [notes, setNotes] = useState(items);
  const [visible, remove] = useOptimistic(notes, (previous, id: string) =>
    previous.filter((note) => note.id !== id),
  );
  const [target, setTarget] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  useEffect(() => setNotes(items), [items]);
  const confirm = (intent: NoteTrashIntent, cancelProcessing: boolean) => {
    if (busy.current || !canEdit) return;
    busy.current = true;
    start(async () => {
      setError("");
      remove(intent.id);
      let succeeded = false;
      try {
        const receipt = await trashNoteFn({
          data: { id: intent.id, version: intent.version, cancelProcessing },
        });
        succeeded = true;
        setNotes((previous) =>
          previous.filter((note) => note.id !== intent.id),
        );
        setTarget(null);
        notify({
          ...receipt,
          title: intent.title,
          ...(workspaceId ? { workspaceId } : {}),
        });
        await router.invalidate();
      } catch (cause) {
        setError(
          `${succeeded ? "ゴミ箱への移動は完了しました。一覧を更新できませんでした。" : ""}${displayError(cause)}`,
        );
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <section aria-busy={pending}>
      {!target && error && (
        <p className="hollow-message" role="alert">
          {error}
        </p>
      )}
      {!visible.length ? (
        <section className="hollow-empty">
          <span className="hollow-empty-mark" aria-hidden="true">
            ○
          </span>
          <h2>
            {paged ? "このページのノートはありません。" : "まだ、白紙です。"}
          </h2>
          <p>
            考えたこと、残しておきたいこと。
            <br />
            最初のノートを書いてみましょう。
          </p>
          {canEdit && (
            <Link
              to="/notes/new"
              search={scopeSearch(workspaceId)}
              className="hollow-button hollow-primary"
            >
              新規作成
            </Link>
          )}
        </section>
      ) : (
        <ul className="hollow-note-list">
          {visible.map((note) => (
            <li key={note.id} className="hollow-note-with-trash">
              <Link to="/notes/$noteId" params={{ noteId: note.id }}>
                {note.thumbnailUrl && (
                  <img
                    src={note.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    width={64}
                    height={48}
                    className="hollow-note-thumbnail"
                  />
                )}
                <div>
                  <h2>{note.title}</h2>
                  <p>
                    <time dateTime={note.updatedAt}>
                      {new Date(note.updatedAt).toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>非公開</span>
                    <span>{noteStatus[note.status]}</span>
                  </p>
                </div>
                <span aria-hidden="true">↗</span>
              </Link>
              {canEdit && (
                <button
                  type="button"
                  className="hollow-button"
                  aria-label={`「${note.title}」を削除`}
                  disabled={pending}
                  onClick={() => {
                    setError("");
                    setTarget({ id: note.id, title: note.title });
                  }}
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {target && (
        <NoteTrashDialog
          target={target}
          pending={pending}
          error={error}
          onCancel={() => setTarget(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  );
}

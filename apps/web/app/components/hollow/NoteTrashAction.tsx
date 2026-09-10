"use client";

import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { trashNoteFn } from "@/presentation/hollowTrash";
import { scopeSearch } from "@/presentation/workspaceInput";
import { NoteTrashDialog, type NoteTrashIntent } from "./NoteTrashDialog";
import { useTrashNotice } from "./TrashProvider";

export function NoteTrashAction({
  id,
  title,
  workspaceId,
}: {
  id: string;
  title: string;
  workspaceId?: string | null;
}) {
  const router = useRouter();
  const notify = useTrashNotice();
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const confirm = (intent: NoteTrashIntent, cancelProcessing: boolean) => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      setError("");
      let succeeded = false;
      try {
        const result = await trashNoteFn({
          data: { id: intent.id, version: intent.version, cancelProcessing },
        });
        succeeded = true;
        setDeleted(true);
        setOpen(false);
        notify({
          ...result,
          title: intent.title,
          ...(workspaceId ? { workspaceId } : {}),
        });
        if (!mounted.current) {
          await router.invalidate();
          return;
        }
        await router.navigate({
          to: "/notes",
          search: scopeSearch(workspaceId),
        });
        await router.invalidate();
      } catch (cause) {
        setError(
          `${succeeded ? "ゴミ箱への移動は完了しました。画面を更新できませんでした。" : ""}${displayError(cause)}`,
        );
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <div className="hollow-trash-action">
      {deleted ? (
        <Link
          to="/notes"
          search={scopeSearch(workspaceId)}
          className="hollow-button"
        >
          ノート一覧へ
        </Link>
      ) : (
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          削除
        </button>
      )}
      {!open && error && <p role="alert">{error}</p>}
      {open && (
        <NoteTrashDialog
          target={{ id, title }}
          pending={pending}
          error={error}
          onCancel={() => setOpen(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}

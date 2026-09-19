"use client";

import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { scopeSearch } from "@/presentation/workspaceInput";
import {
  acceptedDeletionResult,
  exactDeletionConfirmation,
  ownsDeletionRequest,
  type PendingWorkspaceDeletion,
  uncertainDeletionResult,
  type WorkspaceDeletionInput,
} from "./model";
import { useDeletionOperation } from "./useDeletionOperation";
import "./workspace-deletion.css";

export type WorkspaceDeletionPanelProps = {
  workspaceId: string;
  name: string;
  actorId: string;
  currentActor: () => string | null;
  request: (input: WorkspaceDeletionInput) => Promise<WorkspaceDeletionResult>;
  lookup: (input: {
    requestId: string;
  }) => Promise<WorkspaceDeletionResult | null>;
  onAccepted: (result: WorkspaceDeletionResult) => void;
  pendingRequest?: PendingWorkspaceDeletion | null;
  onPendingRequestChange?: (request: PendingWorkspaceDeletion | null) => void;
};

export function WorkspaceDeletionPanel(props: WorkspaceDeletionPanelProps) {
  return (
    <DeletionSession key={`${props.actorId}:${props.workspaceId}`} {...props} />
  );
}

function DeletionSession({
  workspaceId,
  name,
  actorId,
  currentActor,
  request,
  lookup,
  onAccepted,
  pendingRequest,
  onPendingRequestChange,
}: WorkspaceDeletionPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState<PendingWorkspaceDeletion | null>(() =>
    ownsDeletionRequest(pendingRequest, actorId, workspaceId)
      ? pendingRequest
      : null,
  );
  const [accepted, setAccepted] = useState<WorkspaceDeletionResult | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const operation = useDeletionOperation(actorId, currentActor);
  const heading = useId();
  const description = useId();
  const field = useId();
  const help = useId();
  useEffect(() => {
    if (
      currentActor() === actorId &&
      ownsDeletionRequest(pendingRequest, actorId, workspaceId)
    ) {
      setPending(pendingRequest);
    }
  }, [pendingRequest, actorId, workspaceId, currentActor]);
  if (currentActor() !== actorId) return null;
  const remember = (next: PendingWorkspaceDeletion | null) => {
    if (!operation.ownsContext()) return;
    setPending(next);
    onPendingRequestChange?.(next);
  };
  const accept = (result: WorkspaceDeletionResult) => {
    if (!operation.ownsContext()) return;
    setAccepted(result);
    setOpen(false);
    setMessage("");
    remember(null);
    if (!operation.ownsContext()) return;
    try {
      onAccepted(result);
    } catch {
      if (operation.ownsContext())
        setMessage(
          "削除は受理されました。個人のノートへ移動して結果を確認してください。",
        );
    }
  };
  const submit = () => {
    if (pending || accepted || !exactDeletionConfirmation(name, confirmation))
      return;
    operation.run(async (current) => {
      const input = {
        workspaceId,
        requestId: crypto.randomUUID(),
        confirmation,
      };
      remember({ actorId, input });
      setMessage("");
      let result: WorkspaceDeletionResult;
      try {
        result = await request(input);
      } catch (cause) {
        if (!current()) return;
        if (!uncertainDeletionResult(cause)) remember(null);
        setMessage(
          uncertainDeletionResult(cause)
            ? "削除を受け付けたか確認できません。新しい削除要求は送らず、同じ要求の結果を確認してください。"
            : displayError(cause),
        );
        return;
      }
      if (!current()) return;
      if (!acceptedDeletionResult(result, input.requestId)) {
        setMessage(
          "この要求の結果を確認できません。受付結果を確認してください。",
        );
        return;
      }
      accept(result);
    });
  };
  const checkReceipt = () => {
    if (!pending) return;
    const requestId = pending.input.requestId;
    operation.run(async (current) => {
      setMessage("");
      try {
        const result = await lookup({ requestId });
        if (!current()) return;
        if (acceptedDeletionResult(result, requestId)) accept(result);
        else
          setMessage(
            "受付結果をまだ確認できません。処理中や履歴の期限外の場合があります。削除されていないとは判断できません。時間をおいて同じ要求の結果を確認してください。",
          );
      } catch (cause) {
        if (current())
          setMessage(`結果を確認できませんでした。${displayError(cause)}`);
      }
    });
  };
  const unresolved = (
    <div className="workspace-deletion-notice" role="status">
      <p>
        削除要求の受付結果を確認してください。この画面を閉じても、受理済みの削除は取り消せません。
      </p>
      <button type="button" onClick={checkReceipt} disabled={operation.busy}>
        {operation.busy ? "確認中…" : "受付結果を確認"}
      </button>
    </div>
  );
  return (
    <section className="workspace-deletion-panel" aria-labelledby={heading}>
      <h2 id={heading}>ワークスペースを削除</h2>
      <p>
        ノート（ゴミ箱内を含む）、タグ、メンバーシップ、公開ページを削除します。全メンバーがアクセスできなくなります。
      </p>
      <p>
        この操作は取り消せません。残したいノートは、削除前に個人または別のワークスペースへ移動してください。
      </p>
      <Link to="/notes" search={scopeSearch(workspaceId)}>
        ノートを確認・移動する
      </Link>
      <p>
        削除の受理後、保存ファイルの回収は画面を離れても続きます。受理と回収完了は別の状態です。
      </p>
      {accepted ? (
        <div role="status">
          <p>削除を受理しました。ワークスペースは利用できません。</p>
          <Link to="/notes" search={{}}>
            個人のノートへ
          </Link>
        </div>
      ) : pending && !open ? (
        unresolved
      ) : (
        <button
          type="button"
          disabled={operation.busy}
          onClick={() => {
            if (!operation.ownsContext()) return;
            setConfirmation("");
            setMessage("");
            setOpen(true);
          }}
        >
          削除の確認へ
        </button>
      )}
      {!open && message && <p role="alert">{message}</p>}
      {open && (
        <DeletionDialog
          busy={operation.busy}
          onClose={() => setOpen(false)}
          heading={heading}
          description={description}
          canRestoreFocus={operation.ownsContext}
        >
          <h2 id={`${heading}-dialog`}>「{name}」を削除しますか？</h2>
          <p id={description}>
            ゴミ箱内を含むすべてのノートとタグ、メンバーシップ、公開ページを削除します。全員のアクセスが失効し、関連する通常の処理を取り消します。削除は取り消せません。
          </p>
          {pending ? (
            unresolved
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label htmlFor={field}>確認のため、ワークスペース名を入力</label>
              <p id={help}>「{name}」と完全に一致すると実行できます。</p>
              <input
                id={field}
                value={confirmation}
                disabled={operation.busy}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={help}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
              />
              <div className="workspace-deletion-actions">
                <button
                  type="button"
                  disabled={operation.busy}
                  onClick={() => setOpen(false)}
                >
                  削除せずに戻る
                </button>
                <button
                  type="submit"
                  className="workspace-deletion-confirm"
                  disabled={
                    operation.busy ||
                    !exactDeletionConfirmation(name, confirmation)
                  }
                >
                  {operation.busy
                    ? "削除を受け付けています…"
                    : "ワークスペースを削除"}
                </button>
              </div>
            </form>
          )}
          {operation.busy && (
            <p role="status">
              通信中です。削除要求を取り消すことはできません。
            </p>
          )}
          {message && <p role="alert">{message}</p>}
        </DeletionDialog>
      )}
    </section>
  );
}

function DeletionDialog({
  busy,
  onClose,
  heading,
  description,
  canRestoreFocus,
  children,
}: {
  busy: boolean;
  onClose: () => void;
  heading: string;
  description: string;
  canRestoreFocus: () => boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const restore = useRef(canRestoreFocus);
  restore.current = canRestoreFocus;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    close.current?.focus();
    return () => {
      dialog?.close();
      if (
        restore.current() &&
        previous instanceof HTMLElement &&
        previous.isConnected
      )
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="workspace-deletion-dialog"
      aria-labelledby={`${heading}-dialog`}
      aria-describedby={description}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <button
        ref={close}
        type="button"
        className="workspace-deletion-close"
        disabled={busy}
        onClick={onClose}
        aria-label="確認を閉じる"
      >
        閉じる
      </button>
      {children}
    </dialog>
  );
}

"use client";

import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { acceptedDeletionResult } from "./model";
import { useDeletionOperation } from "./useDeletionOperation";
import "./workspace-deletion.css";

export type WorkspaceDeletionReceiptProps = {
  actorId: string;
  currentActor: () => string | null;
  result: WorkspaceDeletionResult;
  refresh: (input: {
    requestId: string;
  }) => Promise<WorkspaceDeletionResult | null>;
  onResult?: (result: WorkspaceDeletionResult) => void;
};

export function WorkspaceDeletionReceipt(props: WorkspaceDeletionReceiptProps) {
  return (
    <ReceiptSession
      key={`${props.actorId}:${props.result.requestId}`}
      {...props}
    />
  );
}

function ReceiptSession({
  actorId,
  currentActor,
  result,
  refresh,
  onResult,
}: WorkspaceDeletionReceiptProps) {
  const [view, setView] = useState(result);
  const [error, setError] = useState("");
  const operation = useDeletionOperation(actorId, currentActor);
  const heading = useId();
  useEffect(() => {
    if (currentActor() === actorId) setView(result);
  }, [result, actorId, currentActor]);
  if (currentActor() !== actorId) return null;
  const update = () => {
    operation.run(async (current) => {
      setError("");
      try {
        const next = await refresh({ requestId: result.requestId });
        if (!current()) return;
        if (!acceptedDeletionResult(next, result.requestId)) {
          setError(
            "最新の結果を確認できません。履歴は受理から90日で表示されなくなります。以前の受理結果を表示しています。回収を取り消した状態ではありません。",
          );
          return;
        }
        setView(next);
        onResult?.(next);
      } catch (cause) {
        if (current())
          setError(`最新の結果を確認できませんでした。${displayError(cause)}`);
      }
    });
  };
  return (
    <section
      className="workspace-deletion-receipt"
      aria-labelledby={heading}
      aria-busy={operation.busy}
    >
      <h2 id={heading}>ワークスペースの削除結果</h2>
      <p className="workspace-deletion-name">{view.name}</p>
      <p role="status">
        {view.state === "succeeded"
          ? "保存データの回収が完了しました。"
          : "削除を受理しました。保存データを回収しています。"}
      </p>
      <p>
        ワークスペースは全メンバーが利用できない状態です。削除は取り消せません。
      </p>
      <dl>
        <dt>削除の受理</dt>
        <dd>
          <time dateTime={view.acceptedAt}>{date(view.acceptedAt)}</time>
        </dd>
        <dt>ノートの回収</dt>
        <dd>
          {view.completedNotes} / {view.totalNotes} 件
        </dd>
        {view.completedAt && (
          <>
            <dt>回収完了</dt>
            <dd>
              <time dateTime={view.completedAt}>{date(view.completedAt)}</time>
            </dd>
          </>
        )}
      </dl>
      {view.state === "reclaiming" && (
        <p>
          画面を離れても回収は続きます。ノートの件数が揃っても、ファイルや残りの資源の回収が完了するまで処理中です。
        </p>
      )}
      {view.state === "reclaiming" && view.delayed && (
        <p className="workspace-deletion-notice" role="status">
          ファイルの回収を自動で再試行します。まだ回収されていない容量は保持されています。削除を再送する必要はありません。
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="workspace-deletion-actions">
        <button type="button" onClick={update} disabled={operation.busy}>
          {operation.busy ? "確認中…" : "回収状況を更新"}
        </button>
        <Link to="/notes" search={{}}>
          個人のノートへ
        </Link>
        <Link to="/notes/jobs" search={{}}>
          処理履歴へ
        </Link>
      </div>
      <p>この削除の履歴は、受理から90日間表示します。</p>
    </section>
  );
}

function date(value: string) {
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

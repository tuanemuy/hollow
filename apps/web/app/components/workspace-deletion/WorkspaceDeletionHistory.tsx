"use client";

import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { useEffect, useState } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  workspaceDeletionHistoryFn,
  workspaceDeletionReceiptFn,
} from "@/presentation/workspaceDeletionServerFn";
import { useDeletionOperation } from "./useDeletionOperation";
import { useWorkspaceDeletion } from "./WorkspaceDeletionProvider";
import { WorkspaceDeletionReceipt } from "./WorkspaceDeletionReceipt";

type Page = Readonly<{
  actorId: string;
  items: readonly WorkspaceDeletionResult[];
  nextCursor: { at: string; requestId: string } | null;
}>;
export function WorkspaceDeletionHistory({ initial }: { initial: Page }) {
  const context = useWorkspaceDeletion();
  return context?.actorId && initial.actorId === context.actorId ? (
    <History
      key={context.actorId}
      initial={initial}
      actorId={context.actorId}
      currentActor={context.currentActor}
    />
  ) : null;
}
function History({
  initial,
  actorId,
  currentActor,
}: {
  initial: Page;
  actorId: string;
  currentActor: () => string | null;
}) {
  const [page, setPage] = useState(initial);
  const [error, setError] = useState("");
  const operation = useDeletionOperation(actorId, currentActor);
  useEffect(() => {
    if (currentActor() === actorId && initial.actorId === actorId)
      setPage(initial);
  }, [initial, actorId, currentActor]);
  if (!operation.ownsContext() || page.actorId !== actorId) return null;
  return (
    <section aria-label="自分のワークスペース削除履歴">
      <h2>ワークスペースの削除</h2>
      <p>自分が受け付けた削除の結果を90日間表示します。</p>
      {!page.items.length && <p>削除の受付履歴はありません。</p>}
      {page.items.map((result) => (
        <WorkspaceDeletionReceipt
          key={result.requestId}
          actorId={actorId}
          currentActor={currentActor}
          result={result}
          refresh={(data) => workspaceDeletionReceiptFn({ data })}
        />
      ))}
      {page.nextCursor && (
        <button
          type="button"
          className="hollow-button"
          disabled={operation.busy}
          onClick={() => {
            const before = page.nextCursor;
            if (!before) return;
            operation.run(async (current) => {
              try {
                const next = await workspaceDeletionHistoryFn({
                  data: { before },
                });
                if (current() && next.actorId === actorId)
                  setPage((old) => ({
                    actorId,
                    items: [
                      ...old.items,
                      ...next.items.filter(
                        (row) =>
                          !old.items.some(
                            (value) => value.requestId === row.requestId,
                          ),
                      ),
                    ],
                    nextCursor: next.nextCursor,
                  }));
              } catch (cause) {
                if (current()) setError(displayError(cause));
              }
            });
          }}
        >
          {operation.busy ? "読み込み中…" : "削除履歴の続きを読み込む"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

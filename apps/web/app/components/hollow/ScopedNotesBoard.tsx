"use client";
import type { listScopedNotes } from "@repo/core/application/workspace/usecases";
import { Link } from "@tanstack/react-router";
import { scopeSearch } from "@/presentation/workspaceInput";
import { NoteList } from "./NoteList";
import { ScopeUsageNotice } from "./WorkspaceScope";

export function ScopedNotesBoard({
  page,
  paged,
}: {
  page: Awaited<ReturnType<typeof listScopedNotes>>;
  paged: boolean;
}) {
  return (
    <>
      <div className="hollow-page-heading">
        <div>
          <p className="hollow-eyebrow">{page.scope.name} / 非公開</p>
          <h1>ノート</h1>
        </div>
        {page.scope.canEdit && (
          <div className="hollow-trash-actions">
            <Link
              to="/notes/import"
              search={scopeSearch(page.scope.workspaceId)}
              className="hollow-button"
            >
              ファイルを取り込む
            </Link>
            <Link
              to="/notes/new"
              search={scopeSearch(page.scope.workspaceId)}
              className="hollow-button hollow-primary"
            >
              ＋ 新規作成
            </Link>
          </div>
        )}
      </div>
      <ScopeUsageNotice scope={page.scope} usage={page.usage} />
      <p className="hollow-help">
        更新日の新しい順に、最大50件ずつ表示します。
      </p>
      <NoteList
        notes={page.items}
        canEdit={page.scope.canEdit}
        workspaceId={page.scope.workspaceId}
        paged={paged}
      />
      <nav className="hollow-trash-actions" aria-label="ノート一覧のページ移動">
        {paged && (
          <Link
            to="/notes"
            search={scopeSearch(page.scope.workspaceId)}
            className="hollow-button"
          >
            先頭へ
          </Link>
        )}
        {page.nextCursor && (
          <Link
            to="/notes"
            search={{
              ...scopeSearch(page.scope.workspaceId),
              cursor: page.nextCursor,
            }}
            className="hollow-button"
          >
            次の50件
          </Link>
        )}
      </nav>
    </>
  );
}

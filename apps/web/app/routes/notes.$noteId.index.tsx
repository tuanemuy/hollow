import { hasBody } from "@repo/core/domain/note/entity";
import {
  createFileRoute,
  Link,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { DriveBackupPanel } from "@/components/hollow/DriveBackupPanel";
import { DriveRegenerationPanel } from "@/components/hollow/DriveRegenerationPanel";
import { noteStatus } from "@/components/hollow/ImportJobs";
import { LlmNoteAction } from "@/components/hollow/LlmNoteAction";
import { llmDocumentMessage } from "@/components/hollow/llmDocumentMessage";
import { NoteConversionStatus } from "@/components/hollow/NoteConversionStatus";
import { NoteDisplayStyle } from "@/components/hollow/NoteDisplayStyle";
import { NoteExportAction } from "@/components/hollow/NoteExportAction";
import { NoteHistory } from "@/components/hollow/NoteHistory";
import { NoteReadingSkeleton } from "@/components/hollow/NoteReadingSkeleton";
import { NoteSharingAction } from "@/components/hollow/NoteSharingAction";
import { NoteTrashAction } from "@/components/hollow/NoteTrashAction";
import { ReferenceLedger } from "@/components/hollow/ReferenceLedger";
import { PageError } from "@/components/hollow/Shell";
import { NoteMoveAction } from "@/components/move/NoteMoveAction";
import { NoteTags } from "@/components/tag/NoteTags";
import { getNoteFn } from "@/presentation/hollowNotes";
import {
  PRINT_NOTICE_CLASS,
  READING_PRINT_NOTICE,
} from "@/presentation/notePrintText";
import { scopeSearch, scopeSearchSchema } from "@/presentation/workspaceInput";

export const Route = createFileRoute("/notes/$noteId/")({
  validateSearch: scopeSearchSchema.extend({
    sharing: z
      .union([z.literal("1"), z.literal(1)])
      .transform(() => "1" as const)
      .optional(),
  }),
  loader: ({ params }) => getNoteFn({ data: { id: params.noteId } }),
  pendingComponent: NoteReadingSkeleton,
  errorComponent: PageError,
  component: NotePage,
});
function NotePage() {
  const note = Route.useLoaderData();
  const router = useRouter();
  const search = Route.useSearch();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [canonicalError, setCanonicalError] = useState(false);
  const scope = note.scope ?? {
    workspaceId: null,
    name: "個人",
    canEdit: true,
  };
  const displayPending = note.display.initialization.kind !== "complete";
  const printable = hasBody(note.html);
  useEffect(() => {
    let disposed = false;
    setCanonicalError(false);
    if (pathname !== `/notes/${note.id}` && pathname !== `/notes/${note.id}/`)
      return;
    if (!note.scope || (search.workspaceId ?? null) === note.scope.workspaceId)
      return;
    void router
      .navigate({
        to: "/notes/$noteId",
        params: { noteId: note.id },
        search: {
          ...scopeSearch(note.scope.workspaceId),
          ...(search.sharing ? { sharing: search.sharing } : {}),
        },
        replace: true,
      })
      .catch(() => {
        if (!disposed) setCanonicalError(true);
      });
    return () => {
      disposed = true;
    };
  }, [
    note.id,
    note.scope,
    search.workspaceId,
    search.sharing,
    pathname,
    router,
  ]);
  useEffect(() => {
    if (note.status !== "processing" && !displayPending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await router.invalidate();
      } catch {
        /* The route error boundary provides reload on failed reads. */
      } finally {
        if (!stopped) timer = setTimeout(() => void poll(), 2000);
      }
    };
    timer = setTimeout(() => void poll(), 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [note.status, displayPending, router]);
  return (
    <article className="hollow-reading">
      {printable && (
        <p className={PRINT_NOTICE_CLASS}>{READING_PRINT_NOTICE}</p>
      )}
      {canonicalError && (
        <p role="alert" className="hollow-message">
          現在の所属先の URL に更新できません。ページを読み直してください。
        </p>
      )}
      <Link
        to="/notes"
        search={scopeSearch(scope.workspaceId)}
        className="hollow-back"
      >
        ← ノート一覧
      </Link>
      <p className="hollow-eyebrow">
        {scope.name} /{" "}
        {note.visibility === "private"
          ? "非公開"
          : note.visibility === "link"
            ? "限定公開"
            : "公開"}{" "}
        / {scope.canEdit ? "編集可能" : "閲覧のみ"} / {noteStatus[note.status]}
      </p>
      <h1>{note.title}</h1>
      <NoteTags
        key={`tags:${note.id}:${scope.workspaceId ?? "personal"}`}
        noteId={note.id}
        title={note.title}
        scope={scope}
        tags={note.tags ?? []}
      />
      <p className="hollow-help">
        作成者：
        {note.creatorDisplay?.kind === "label"
          ? note.creatorDisplay.label
          : note.creatorDisplay?.kind === "unavailable"
            ? "作成者の表示情報なし"
            : "作成者不明"}
      </p>
      <p className="hollow-help">
        作成{" "}
        <time dateTime={note.createdAt}>
          {new Date(note.createdAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}
        </time>{" "}
        · 更新{" "}
        <time dateTime={note.updatedAt}>
          {new Date(note.updatedAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}
        </time>
      </p>
      {note.status !== "ready" && (
        <section role="status" className="hollow-message">
          <p>
            {note.status === "processing"
              ? "原本を保存しました。変換が完了すると本文が表示されます。"
              : note.status === "needs_ai"
                ? "原本のみ保存済みです。本文の生成にはOpenRouter連携が必要です。"
                : note.status === "cancelled"
                  ? "処理が取り消されました。原本は保存されています。処理履歴から取り込み直せます。"
                  : "本文を変換できませんでした。処理履歴で理由と再試行を確認できます。"}
          </p>
          {note.status === "needs_ai" && (
            <Link to="/settings/openrouter">OpenRouter連携を設定</Link>
          )}
          <Link to="/notes/jobs" search={scopeSearch(scope.workspaceId)}>
            処理履歴を確認
          </Link>
        </section>
      )}
      {note.conversion && (
        <NoteConversionStatus
          key={`conversion:${note.id}:${note.conversion.jobId}`}
          conversion={note.conversion}
          sourceFormat={note.original?.format ?? null}
          workspaceId={scope.workspaceId}
        />
      )}
      <NoteDisplayStyle
        key={`display:${note.id}`}
        note={note}
        canEdit={scope.canEdit}
      />
      <p className="hollow-help">
        {note.original
          ? "原本：Hollow に保存済み。"
          : "原本：元ファイルはありません。"}
        {note.original
          ? "Driveバックアップの現在の状態は下の原本バックアップで確認できます。"
          : "Driveバックアップは原本のあるノートが対象です。"}
      </p>
      {note.original && (
        <section className="hollow-original">
          <h2>元ファイルと取り込み結果</h2>
          <a
            className="hollow-button"
            href={`/api/hollow/originals/${note.original.id}`}
          >
            元ファイルをダウンロード
          </a>
          <p>
            {note.original.name} · {note.original.format.toUpperCase()} ·{" "}
            {note.original.bytes.toLocaleString("ja-JP")} bytes
          </p>
          {note.original.coverage === "partial" && (
            <p>
              一部の内容は抽出されていません。元ファイルも確認してください。
            </p>
          )}
          <ul>
            {note.original.notices.map((n) => (
              <li key={`${n.code}-${n.location}-${n.message}`}>
                {n.location}:{" "}
                {n.code === "LLM_DISABLED"
                  ? (llmDocumentMessage(n.code) ?? n.message)
                  : n.message}
              </li>
            ))}
          </ul>
        </section>
      )}
      {scope.canEdit && note.original && (
        <LlmNoteAction
          key={`${note.actorId}:${note.id}`}
          noteId={note.id}
          noteVersion={note.version}
        />
      )}
      <NoteExportAction
        noteId={note.id}
        actorId={note.actorId}
        printable={printable}
      />
      {scope.canEdit && note.original && (
        <DriveBackupPanel
          key={`backup:${note.actorId}:${note.id}`}
          noteId={note.id}
          actorId={note.actorId}
        />
      )}
      {scope.canEdit && note.original && (
        <DriveRegenerationPanel
          key={`regenerate:${note.actorId}:${note.id}`}
          noteId={note.id}
          noteVersion={note.version}
          processing={note.status === "processing"}
        />
      )}
      <ReferenceLedger noteId={note.id} canEdit={scope.canEdit} />
      <NoteHistory
        key={`history:${note.id}`}
        noteId={note.id}
        version={note.version}
        processing={note.status === "processing"}
        canEdit={scope.canEdit}
      />
      <div className="hollow-reading-bar">
        <span>
          {note.visibility === "public"
            ? "誰でも閲覧できます"
            : note.visibility === "link"
              ? `${scope.workspaceId ? "ワークスペースのメンバーと、" : "所有者本人と、"}リンクを知る人が${note.sharing.hasPassword ? "パスワードを通過すると" : ""}閲覧できます`
              : scope.workspaceId
                ? "現在のワークスペース権限に従って閲覧できます"
                : "自分だけが閲覧できます"}
        </span>
        <NoteSharingAction
          noteId={note.id}
          actorId={note.actorId}
          autoOpen={search.sharing === "1"}
          badge={
            note.visibility === "private"
              ? "非公開"
              : note.visibility === "link"
                ? "限定公開"
                : "公開"
          }
        />
        {scope.canEdit && (
          <NoteTrashAction
            key={`trash:${note.id}`}
            id={note.id}
            title={note.title}
            workspaceId={scope.workspaceId}
          />
        )}
        {note.scope && (
          <NoteMoveAction
            noteId={note.id}
            version={note.version}
            title={note.title}
            scope={note.scope}
            processing={note.status === "processing"}
          />
        )}
        {scope.canEdit && note.status !== "processing" && (
          <Link
            to="/notes/$noteId/edit"
            params={{ noteId: note.id }}
            className="hollow-button hollow-primary"
          >
            編集
          </Link>
        )}
      </div>
    </article>
  );
}

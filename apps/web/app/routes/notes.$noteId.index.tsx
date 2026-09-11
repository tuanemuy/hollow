import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { noteStatus } from "@/components/hollow/ImportJobs";
import { NoteDisplayStyle } from "@/components/hollow/NoteDisplayStyle";
import { NoteHistory } from "@/components/hollow/NoteHistory";
import { NoteTrashAction } from "@/components/hollow/NoteTrashAction";
import { ReferenceLedger } from "@/components/hollow/ReferenceLedger";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { getNoteFn } from "@/presentation/hollowNotes";
import { scopeSearch } from "@/presentation/workspaceInput";

export const Route = createFileRoute("/notes/$noteId/")({
  loader: ({ params }) => getNoteFn({ data: { id: params.noteId } }),
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: NotePage,
});
function NotePage() {
  const note = Route.useLoaderData();
  const router = useRouter();
  const scope = note.scope ?? {
    workspaceId: null,
    name: "個人",
    canEdit: true,
  };
  const displayPending = note.display.initialization.kind !== "complete";
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
      <Link
        to="/notes"
        search={scopeSearch(scope.workspaceId)}
        className="hollow-back"
      >
        ← ノート一覧
      </Link>
      <p className="hollow-eyebrow">
        {scope.name} / 非公開 / {scope.canEdit ? "編集可能" : "閲覧のみ"} /{" "}
        {noteStatus[note.status]}
      </p>
      <h1>{note.title}</h1>
      {note.tags && note.tags.length > 0 && (
        <ul aria-label="タグ">
          {note.tags.map((tag) => (
            <li key={tag.id}>{tag.name}</li>
          ))}
        </ul>
      )}
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
                ? "原本のみ保存済みです。本文の生成にはAI連携が必要です（連携機能は準備中）。"
                : note.status === "cancelled"
                  ? "処理が取り消されました。原本は保存されています。処理履歴から取り込み直せます。"
                  : "本文を変換できませんでした。処理履歴で理由と再試行を確認できます。"}
          </p>
          <Link to="/notes/jobs">処理履歴を確認</Link>
        </section>
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
        Drive バックアップ：この環境では未提供です。
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
                {n.location}: {n.message}
              </li>
            ))}
          </ul>
        </section>
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
          非公開 ·{" "}
          {scope.workspaceId
            ? "現在のワークスペース権限に従って閲覧できます"
            : "自分だけが閲覧できます"}
        </span>
        {scope.canEdit && (
          <NoteTrashAction
            key={`trash:${note.id}`}
            id={note.id}
            title={note.title}
            workspaceId={scope.workspaceId}
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

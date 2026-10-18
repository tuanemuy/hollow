import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { z } from "zod";
import { EditorBackupRecovery } from "@/components/hollow/EditorBackupRecovery";
import { NoteEditor } from "@/components/hollow/NoteEditor";
import { NoteExportAction } from "@/components/hollow/NoteExportAction";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { getNoteFn } from "@/presentation/hollowNotes";

export const Route = createFileRoute("/notes/$noteId/edit")({
  validateSearch: (search) =>
    z
      .object({ mode: z.enum(["wysiwyg", "html", "visual"]).optional() })
      .parse(search),
  loader: ({ params }) => getNoteFn({ data: { id: params.noteId } }),
  pendingComponent: LoadingNotes,
  errorComponent: EditError,
  component: EditNote,
});
function EditNote() {
  const note = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { mode } = Route.useSearch();
  const opened = useRef<string | null>(null);
  if (note.scope?.canEdit === false && opened.current !== note.id)
    return (
      <section>
        <h1>このノートは閲覧のみです</h1>
        <p>現在の権限では編集・保存できません。</p>
        <Link to="/notes/$noteId" params={{ noteId: note.id }}>
          ノートを読む
        </Link>
        <EditorBackupRecovery userId={user.id} noteId={note.id} />
      </section>
    );
  if (note.status === "processing")
    return (
      <section>
        <h1>変換中は編集できません</h1>
        <Link to="/notes/$noteId" params={{ noteId: note.id }}>
          ノートの進捗を確認
        </Link>
      </section>
    );
  opened.current = note.id;
  return (
    <>
      <NoteEditor
        key={note.id}
        note={note}
        userId={user.id}
        initialMode={mode}
      />
      <NoteExportAction
        noteId={note.id}
        actorId={note.actorId}
        printable={note.html.trim() !== ""}
        editing
      />
    </>
  );
}
function EditError({ error }: { error: unknown }) {
  const { user } = Route.useRouteContext();
  const { noteId } = Route.useParams();
  return (
    <>
      <PageError error={error} />
      {z.uuid().safeParse(noteId).success && (
        <EditorBackupRecovery userId={user.id} noteId={noteId} />
      )}
    </>
  );
}

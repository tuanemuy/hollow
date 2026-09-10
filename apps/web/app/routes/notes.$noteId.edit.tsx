import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { NoteEditor } from "@/components/hollow/NoteEditor";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { getNoteFn } from "@/presentation/hollowNotes";

export const Route = createFileRoute("/notes/$noteId/edit")({
  validateSearch: (search) =>
    z
      .object({ mode: z.enum(["wysiwyg", "html", "visual"]).optional() })
      .parse(search),
  loader: ({ params }) => getNoteFn({ data: { id: params.noteId } }),
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: EditNote,
});
function EditNote() {
  const note = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { mode } = Route.useSearch();
  if (note.status === "processing")
    return (
      <section>
        <h1>変換中は編集できません</h1>
        <Link to="/notes/$noteId" params={{ noteId: note.id }}>
          ノートの進捗を確認
        </Link>
      </section>
    );
  return (
    <NoteEditor key={note.id} note={note} userId={user.id} initialMode={mode} />
  );
}

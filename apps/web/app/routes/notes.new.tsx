import { createFileRoute } from "@tanstack/react-router";
import { NoteEditor } from "@/components/hollow/NoteEditor";

export const Route = createFileRoute("/notes/new")({ component: NewNote });
function NewNote() {
  const { user } = Route.useRouteContext();
  return <NoteEditor userId={user.id} />;
}

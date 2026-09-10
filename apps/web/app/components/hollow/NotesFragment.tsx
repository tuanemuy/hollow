import { listNotes } from "@repo/core/application/note/listNotes";
import { hollowContext } from "@/presentation/hollowServer";
import { NoteList } from "./NoteList";

export async function NotesFragment() {
  const { container, token } = await hollowContext();
  const notes = await listNotes(container, token);
  return <NoteList notes={notes} />;
}

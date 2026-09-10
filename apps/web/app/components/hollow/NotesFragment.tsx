import { listScopedNotes } from "@repo/core/application/workspace/usecases";
import { hollowContext } from "@/presentation/hollowServer";
import { ScopedNotesBoard } from "./ScopedNotesBoard";

export async function NotesFragment({
  workspaceId,
  cursor,
}: {
  workspaceId?: string | undefined;
  cursor?: string | undefined;
}) {
  const { container, token } = await hollowContext();
  const page = await listScopedNotes(container, token, {
    ...(workspaceId ? { workspaceId } : {}),
    ...(cursor ? { cursor } : {}),
  });
  return (
    <ScopedNotesBoard
      key={`${workspaceId ?? "personal"}:${cursor ?? "first"}`}
      page={page}
      paged={!!cursor}
    />
  );
}

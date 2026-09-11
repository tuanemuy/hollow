import { browseNotes } from "@repo/core/application/browse/usecases";
import { BrowsePreparation } from "@/components/browse/BrowsePreparation";
import {
  type BrowseRouteSearch,
  browseInputSchema,
} from "@/presentation/browseInput";
import { hollowContext } from "@/presentation/hollowServer";
import { ScopedNotesBoard } from "./ScopedNotesBoard";

export async function NotesFragment({ search }: { search: BrowseRouteSearch }) {
  if (
    !search.zone ||
    !search.layout ||
    !search.sort ||
    (search.layout === "calendar" && !search.month)
  )
    return <BrowsePreparation search={search} />;
  const { container, token } = await hollowContext();
  const page = await browseNotes(
    container,
    token,
    browseInputSchema.parse(search),
  );
  return <ScopedNotesBoard key={page.identity} page={page} />;
}

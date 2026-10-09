import { browseNotes } from "@repo/core/application/browse/usecases";
import { BrowseError } from "@/components/browse/BrowseError";
import { BrowsePreparation } from "@/components/browse/BrowsePreparation";
import {
  type BrowseRouteSearch,
  browseInputSchema,
} from "@/presentation/browseInput";
import { redactForClient, serializeError } from "@/presentation/errorResponse";
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
  try {
    const { container, token } = await hollowContext();
    const page = await browseNotes(
      container,
      token,
      browseInputSchema.parse(search),
    );
    return <ScopedNotesBoard key={page.identity} page={page} />;
  } catch (cause) {
    return (
      <BrowseError
        error={{ serialized: redactForClient(serializeError(cause)) }}
      />
    );
  }
}

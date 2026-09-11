import {
  createFileRoute,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { BrowseError } from "@/components/browse/BrowseError";
import { BrowseSkeleton } from "@/components/browse/BrowseSkeleton";
import { Deferred } from "@/components/ui/Deferred";
import {
  type BrowseRouteInput,
  browseIdentity,
  browseRouteSchema,
} from "@/presentation/browseInput";
import { renderNotes } from "./-hollow";

export const Route = createFileRoute("/notes/")({
  validateSearch: (search: SearchSchemaInput & BrowseRouteInput) =>
    browseRouteSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => renderNotes({ data: deps }),
  component: NotesPage,
  errorComponent: BrowseError,
});
function NotesPage() {
  const { notes } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <Suspense
      key={browseIdentity(search)}
      fallback={<BrowseSkeleton layout={search.layout ?? "list"} />}
    >
      <Deferred promise={notes} />
    </Suspense>
  );
}

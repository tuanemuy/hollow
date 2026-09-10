import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { Deferred } from "@/components/ui/Deferred";
import {
  scopedNotesSchema,
  scopeReadIdentity,
} from "@/presentation/workspaceInput";
import { renderNotes } from "./-hollow";

export const Route = createFileRoute("/notes/")({
  validateSearch: (search) => scopedNotesSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => renderNotes({ data: deps }),
  component: NotesPage,
  errorComponent: PageError,
});
function NotesPage() {
  const { notes } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <Suspense
      key={scopeReadIdentity(search.workspaceId, search.cursor)}
      fallback={<LoadingNotes />}
    >
      <Deferred promise={notes} />
    </Suspense>
  );
}

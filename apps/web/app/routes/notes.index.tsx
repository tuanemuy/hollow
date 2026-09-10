import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { Deferred } from "@/components/ui/Deferred";
import { renderNotes } from "./-hollow";

export const Route = createFileRoute("/notes/")({
  loader: () => renderNotes(),
  component: NotesPage,
  errorComponent: PageError,
});
function NotesPage() {
  const { notes } = Route.useLoaderData();
  return (
    <>
      <div className="hollow-page-heading">
        <div>
          <p className="hollow-eyebrow">個人のスペース</p>
          <h1>ノート</h1>
        </div>
        <Link to="/notes/new" className="hollow-button hollow-primary">
          ＋ 新規作成
        </Link>
      </div>
      <Suspense fallback={<LoadingNotes />}>
        <Deferred promise={notes} />
      </Suspense>
    </>
  );
}

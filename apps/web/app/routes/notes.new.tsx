import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { EditorBackupRecovery } from "@/components/hollow/EditorBackupRecovery";
import { NoteEditor } from "@/components/hollow/NoteEditor";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { ScopeUsageNotice } from "@/components/hollow/WorkspaceScope";
import { getScopeUsageFn } from "@/presentation/hollowWorkspace";
import { scopeSearch, scopeSearchSchema } from "@/presentation/workspaceInput";

export const Route = createFileRoute("/notes/new")({
  validateSearch: (search) => scopeSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getScopeUsageFn({ data: deps }),
  component: NewNote,
  pendingComponent: LoadingNotes,
  errorComponent: NewNoteError,
});
function NewNote() {
  const { user } = Route.useRouteContext();
  const { scope, usage } = Route.useLoaderData();
  const identity = `${user.id}:${scope.workspaceId ?? "personal"}`;
  const opened = useRef<string | null>(null);
  if (scope.canEdit) opened.current = identity;
  return (
    <>
      <ScopeUsageNotice scope={scope} usage={usage} />
      {scope.canEdit || opened.current === identity ? (
        <NoteEditor
          key={identity}
          userId={user.id}
          workspaceId={scope.workspaceId ?? undefined}
          canEdit={scope.canEdit}
        />
      ) : (
        <section>
          <h1>この保存先は閲覧のみです</h1>
          <Link to="/notes" search={scopeSearch(scope.workspaceId)}>
            ノート一覧へ
          </Link>
          <EditorBackupRecovery
            userId={user.id}
            {...scopeSearch(scope.workspaceId)}
          />
        </section>
      )}
    </>
  );
}
function NewNoteError({ error }: { error: unknown }) {
  const { user } = Route.useRouteContext();
  const search = scopeSearchSchema.safeParse(Route.useSearch());
  return (
    <>
      <PageError error={error} />
      {search.success && (
        <EditorBackupRecovery
          userId={user.id}
          {...(search.data.workspaceId
            ? { workspaceId: search.data.workspaceId }
            : {})}
        />
      )}
    </>
  );
}

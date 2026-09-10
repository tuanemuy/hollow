import { createFileRoute, Link } from "@tanstack/react-router";
import { ImportUpload } from "@/components/hollow/ImportUpload";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { ScopeUsageNotice } from "@/components/hollow/WorkspaceScope";
import { getScopeUsageFn } from "@/presentation/hollowWorkspace";
import { scopeSearch, scopeSearchSchema } from "@/presentation/workspaceInput";
export const Route = createFileRoute("/notes/import")({
  validateSearch: (search) => scopeSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getScopeUsageFn({ data: deps }),
  component: ImportPage,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});
function ImportPage() {
  const { scope, usage } = Route.useLoaderData();
  return (
    <>
      <ScopeUsageNotice scope={scope} usage={usage} />
      {scope.canEdit ? (
        <ImportUpload
          key={scope.workspaceId ?? "personal"}
          workspaceId={scope.workspaceId ?? undefined}
        />
      ) : (
        <section>
          <h1>この保存先へ取り込む権限がありません</h1>
          <Link to="/notes" search={scopeSearch(scope.workspaceId)}>
            ノート一覧へ
          </Link>
        </section>
      )}
    </>
  );
}

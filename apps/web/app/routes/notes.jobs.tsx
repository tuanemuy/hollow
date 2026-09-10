import { createFileRoute } from "@tanstack/react-router";
import { ImportJobs } from "@/components/hollow/ImportJobs";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { listImportsFn } from "@/presentation/hollowImports";
import { scopeSearchSchema } from "@/presentation/workspaceInput";
export const Route = createFileRoute("/notes/jobs")({
  validateSearch: (search) => scopeSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listImportsFn({ data: deps }),
  component: () => <ImportJobs initial={Route.useLoaderData()} />,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});

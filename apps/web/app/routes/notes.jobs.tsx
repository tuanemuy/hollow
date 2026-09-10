import { createFileRoute } from "@tanstack/react-router";
import { ImportJobs } from "@/components/hollow/ImportJobs";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { listImportsFn } from "@/presentation/hollowImports";
export const Route = createFileRoute("/notes/jobs")({
  loader: () => listImportsFn(),
  component: () => <ImportJobs initial={Route.useLoaderData()} />,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ImportJobs } from "@/components/hollow/ImportJobs";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { listBatchesFn } from "@/presentation/batchServerFn";
import { listImportsFn } from "@/presentation/hollowImports";
import { scopeSearchSchema } from "@/presentation/workspaceInput";
export const Route = createFileRoute("/notes/jobs")({
  validateSearch: (search) =>
    scopeSearchSchema.extend({ batchId: z.uuid().optional() }).parse(search),
  loaderDeps: ({ search }) => scopeSearchSchema.parse(search),
  loader: async ({ deps }) => {
    const [imports, unfinished, completed] = await Promise.all([
      listImportsFn({ data: deps }),
      listBatchesFn({ data: { scope: "unfinished" } }),
      listBatchesFn({ data: { scope: "completed" } }),
    ]);
    return { imports, batches: { unfinished, completed } };
  },
  component: JobsPage,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});
function JobsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <ImportJobs
      initial={data.imports}
      batches={data.batches}
      selectedBatchId={search.batchId}
    />
  );
}

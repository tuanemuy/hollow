import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ImportJobs } from "@/components/hollow/ImportJobs";
import { LoadingNotes, PageError } from "@/components/hollow/Shell";
import { PdfHistory } from "@/components/pdf/PdfHistory";
import { WorkspaceDeletionHistory } from "@/components/workspace-deletion/WorkspaceDeletionHistory";
import { ZipHistory } from "@/components/zip/ZipHistory";
import { listBatchesFn } from "@/presentation/batchServerFn";
import { listImportsFn } from "@/presentation/hollowImports";
import { workspaceDeletionHistoryFn } from "@/presentation/workspaceDeletionServerFn";
import { scopeSearchSchema } from "@/presentation/workspaceInput";
export const Route = createFileRoute("/notes/jobs")({
  validateSearch: (search) =>
    scopeSearchSchema.extend({ batchId: z.uuid().optional() }).parse(search),
  loaderDeps: ({ search }) => scopeSearchSchema.parse(search),
  loader: async ({ deps }) => {
    const [imports, unfinished, completed, deletions] = await Promise.all([
      listImportsFn({ data: deps }),
      listBatchesFn({ data: { scope: "unfinished" } }),
      listBatchesFn({ data: { scope: "completed" } }),
      workspaceDeletionHistoryFn({ data: {} }),
    ]);
    return { imports, batches: { unfinished, completed }, deletions };
  },
  component: JobsPage,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});
function JobsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <>
      <ImportJobs
        initial={data.imports}
        batches={data.batches}
        selectedBatchId={search.batchId}
      />
      <WorkspaceDeletionHistory initial={data.deletions} />
      <PdfHistory />
      <ZipHistory />
    </>
  );
}

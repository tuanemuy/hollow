import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { TrashList } from "@/components/hollow/TrashList";
import { currentUserFn } from "@/presentation/hollowAuth";
import { listTrashFn } from "@/presentation/hollowTrash";
import { scopeSearchSchema } from "@/presentation/workspaceInput";

export const Route = createFileRoute("/trash")({
  validateSearch: (search) => scopeSearchSchema.parse(search),
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listTrashFn({ data: deps }),
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: TrashPage,
});
function TrashPage() {
  const { user } = Route.useRouteContext();
  const initial = Route.useLoaderData();
  return (
    <Shell email={user.email}>
      <TrashList
        key={initial.scope.workspaceId ?? "personal"}
        initial={initial}
      />
    </Shell>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { TrashList } from "@/components/hollow/TrashList";
import { currentUserFn } from "@/presentation/hollowAuth";
import { listTrashFn } from "@/presentation/hollowTrash";

export const Route = createFileRoute("/trash")({
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  loader: () => listTrashFn({ data: {} }),
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: TrashPage,
});
function TrashPage() {
  const { user } = Route.useRouteContext();
  const initial = Route.useLoaderData();
  return (
    <Shell email={user.email}>
      <TrashList initial={initial} />
    </Shell>
  );
}

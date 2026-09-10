import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { WorkspaceCreate } from "@/components/hollow/WorkspaceCreate";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/workspaces/new")({
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  component: WorkspaceCreatePage,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});
function WorkspaceCreatePage() {
  const { user } = Route.useRouteContext();
  return (
    <Shell email={user.email}>
      <WorkspaceCreate />
    </Shell>
  );
}

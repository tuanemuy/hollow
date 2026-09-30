import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DriveBackupActivityProvider } from "@/components/hollow/DriveBackupActivityProvider";
import { ImportTicker } from "@/components/hollow/ImportJobs";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/notes")({
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  component: NotesShell,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
});
function NotesShell() {
  const { user } = Route.useRouteContext();
  return (
    <Shell email={user.email}>
      <DriveBackupActivityProvider>
        <ImportTicker />
        <Outlet />
      </DriveBackupActivityProvider>
    </Shell>
  );
}

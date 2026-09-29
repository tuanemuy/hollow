import { createFileRoute, redirect } from "@tanstack/react-router";
import { DriveSettings } from "@/components/hollow/DriveSettings";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/settings/drive")({
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  component: Page,
});
function Page() {
  const { user } = Route.useRouteContext();
  return <DriveSettings key={user.id} />;
}

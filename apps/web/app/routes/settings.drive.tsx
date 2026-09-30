import { createFileRoute, redirect } from "@tanstack/react-router";
import { DriveSettings } from "@/components/hollow/DriveSettings";
import { driveReturnSearch } from "@/presentation/driveDocument";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/settings/drive")({
  validateSearch: (search) => driveReturnSearch.parse(search),
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  component: Page,
});
function Page() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const initialLookup = search.controlId
    ? { by: "id" as const, kind: "control" as const, id: search.controlId }
    : search.controlCommand
      ? {
          by: "command" as const,
          kind: "control" as const,
          commandId: search.controlCommand,
        }
      : null;
  return <DriveSettings key={user.id} initialLookup={initialLookup} />;
}

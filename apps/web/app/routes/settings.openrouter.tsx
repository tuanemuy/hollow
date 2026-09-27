import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { OpenRouterSettings } from "@/components/hollow/OpenRouterSettings";
import { currentUserFn } from "@/presentation/hollowAuth";
export const Route = createFileRoute("/settings/openrouter")({
  validateSearch: z.object({
    returnTo: z.literal("upload").optional().catch(undefined),
    workspaceId: z.uuid().optional().catch(undefined),
  }),
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
  return (
    <OpenRouterSettings
      key={user.id}
      email={user.email}
      returnTo={
        search.returnTo === "upload"
          ? { kind: "upload", workspaceId: search.workspaceId ?? null }
          : { kind: "settings" }
      }
    />
  );
}

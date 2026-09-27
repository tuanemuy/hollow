import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { OpenRouterResult } from "@/components/hollow/OpenRouterResult";
export const Route = createFileRoute("/auth/openrouter-result")({
  validateSearch: z.object({ id: z.uuid().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { name: "referrer", content: "no-referrer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useSearch();
  return <OpenRouterResult {...(id ? { id } : {})} />;
}

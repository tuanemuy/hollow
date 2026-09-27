import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GoogleResult } from "@/components/hollow/GoogleResult";

export const Route = createFileRoute("/auth/google-result")({
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
  return <GoogleResult {...(id ? { id } : {})} />;
}

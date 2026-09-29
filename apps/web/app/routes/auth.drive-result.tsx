import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DriveResult } from "@/components/hollow/DriveResult";

export const Route = createFileRoute("/auth/drive-result")({
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
  return <DriveResult {...(id ? { id } : {})} />;
}

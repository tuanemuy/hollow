import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GoogleMailProof } from "@/components/hollow/AuthenticationForms";
import { authenticationTokenSchema } from "@/presentation/authenticationInput";

export const Route = createFileRoute("/auth/google-proof")({
  validateSearch: z.object({ token: authenticationTokenSchema }),
  head: () => ({
    meta: [
      { name: "referrer", content: "no-referrer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  const { token } = Route.useSearch();
  return <GoogleMailProof token={token} />;
}

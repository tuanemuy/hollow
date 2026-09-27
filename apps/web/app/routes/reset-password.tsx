import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PasswordReset } from "@/components/hollow/AuthenticationForms";
import { authenticationTokenSchema } from "@/presentation/authenticationInput";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: authenticationTokenSchema.optional() }),
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
  return <PasswordReset {...(token ? { token } : {})} />;
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "@/components/hollow/Auth";
import { safeNoteDestination } from "@/components/hollow/navigation";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/signin")({
  validateSearch: (search) =>
    z
      .object({ redirect: z.string().max(2048).optional().catch(undefined) })
      .parse(search),
  beforeLoad: async ({ search }) => {
    if (await currentUserFn())
      throw redirect({ href: safeNoteDestination(search.redirect) });
  },
  component: SignIn,
});
function SignIn() {
  const search = Route.useSearch();
  return (
    <AuthForm mode="signin" redirectTo={safeNoteDestination(search.redirect)} />
  );
}

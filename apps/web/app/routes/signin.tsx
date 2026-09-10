import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "@/components/hollow/Auth";
import { safeNoteDestination } from "@/components/hollow/navigation";
import { currentUserFn } from "@/presentation/hollowAuth";
import { getInvitationLandingFn } from "@/presentation/hollowInvitationAuth";
import {
  invitationAuthSearchSchema,
  invitationDestination,
  invitationSelection,
} from "@/presentation/invitationInput";

export const Route = createFileRoute("/signin")({
  validateSearch: (search) =>
    invitationAuthSearchSchema
      .and(
        z.object({
          redirect: z.string().max(2048).optional().catch(undefined),
        }),
      )
      .parse(search),
  beforeLoad: async ({ search }) => {
    const view = search.invitation
      ? await getInvitationLandingFn({
          data: { expected: invitationSelection(search) },
        })
      : null;
    const selected = view
      ? { id: view.id, generation: view.generation }
      : undefined;
    if (await currentUserFn())
      throw redirect({
        href: search.invitation
          ? invitationDestination(selected)
          : safeNoteDestination(search.redirect),
      });
    return { selected };
  },
  component: SignIn,
});
function SignIn() {
  const search = Route.useSearch();
  const { selected } = Route.useRouteContext();
  return (
    <AuthForm
      mode="signin"
      invitation={search.invitation ?? false}
      {...(selected ? { invitationSelection: selected } : {})}
      redirectTo={
        search.invitation
          ? invitationDestination(selected)
          : safeNoteDestination(search.redirect)
      }
    />
  );
}

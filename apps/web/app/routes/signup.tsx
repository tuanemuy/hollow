import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/hollow/Auth";
import { currentUserFn } from "@/presentation/hollowAuth";
import { getInvitationLandingFn } from "@/presentation/hollowInvitationAuth";
import {
  invitationAuthSearchSchema,
  invitationDestination,
  invitationSelection,
} from "@/presentation/invitationInput";

export const Route = createFileRoute("/signup")({
  validateSearch: (search) => invitationAuthSearchSchema.parse(search),
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
        href: search.invitation ? invitationDestination(selected) : "/notes",
      });
    return { selected };
  },
  component: Signup,
});
function Signup() {
  const search = Route.useSearch();
  const { selected } = Route.useRouteContext();
  return (
    <AuthForm
      mode="signup"
      invitation={search.invitation ?? false}
      {...(selected ? { invitationSelection: selected } : {})}
    />
  );
}

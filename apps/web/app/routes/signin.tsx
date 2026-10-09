import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "@/components/hollow/Auth";
import { safeNoteDestination } from "@/components/hollow/navigation";
import { googleResultFn } from "@/presentation/authenticationServerFn";
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
          cancelled: z.uuid().optional().catch(undefined),
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
    const user = await currentUserFn();
    let cancelled = false;
    if (user && search.cancelled) {
      try {
        const result = await googleResultFn({ data: { id: search.cancelled } });
        cancelled = result.failure === "AUTH_CANCELLED";
      } catch {
        cancelled = false;
      }
    }
    if (user && !cancelled)
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
      {...(search.cancelled ? { cancelledAttempt: search.cancelled } : {})}
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

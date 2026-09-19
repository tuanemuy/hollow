import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useSharingActor } from "@/components/hollow/SharingActorProvider";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { DisplayNameIsland } from "@/components/sharing/DisplayNameIsland";
import { currentUserFn } from "@/presentation/hollowAuth";
import { profileSearchSchema } from "@/presentation/sharingInput";
import {
  getDisplayNameFn,
  getSharingFn,
  setDisplayNameFn,
} from "@/presentation/sharingServerFn";

export const Route = createFileRoute("/settings/profile")({
  validateSearch: profileSearchSchema,
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const profile = await getDisplayNameFn();
    const sharing =
      deps.noteId && deps.resume === "sharing"
        ? await getSharingFn({ data: { noteId: deps.noteId } })
        : null;
    return {
      profile,
      returnNoteId:
        sharing?.actorId === profile.accountId ? sharing.expected.noteId : null,
    };
  },
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: ProfilePage,
});
function ProfilePage() {
  const { profile, returnNoteId } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const actor = useSharingActor();
  const router = useRouter();
  return (
    <Shell email={user.email}>
      <h1>表示名</h1>
      {actor?.actor && actor.actor.id === profile.accountId && (
        <DisplayNameIsland
          initial={profile}
          actorId={actor.actor.id}
          actorEpoch={actor.actor.epoch}
          currentActor={actor.currentActor}
          save={(data) => setDisplayNameFn({ data })}
          refresh={() => getDisplayNameFn()}
          onSaved={() => {
            void router.invalidate();
          }}
          {...(returnNoteId
            ? { returnHref: `/notes/${returnNoteId}?sharing=1` }
            : {})}
        />
      )}
    </Shell>
  );
}

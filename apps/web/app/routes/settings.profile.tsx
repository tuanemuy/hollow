import {
  createFileRoute,
  Link,
  redirect,
  useBlocker,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useSharingActor } from "@/components/hollow/SharingActorProvider";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { ProfileEditor } from "@/components/publication/ProfileEditor";
import { currentUserFn } from "@/presentation/hollowAuth";
import {
  beginProfileIconSchema,
  profileViewSchema,
} from "@/presentation/publicationInput";
import {
  beginProfileIconFn,
  checkHandleFn,
  getProfileFn,
  removeProfileIconFn,
  saveProfileFn,
} from "@/presentation/publicationServerFn";
import { profileSearchSchema } from "@/presentation/sharingInput";
import { getSharingFn } from "@/presentation/sharingServerFn";

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
    const profile = await getProfileFn();
    const sharing =
      deps.noteId && deps.resume === "sharing"
        ? await getSharingFn({ data: { noteId: deps.noteId } })
        : null;
    return {
      profile,
      returnNoteId:
        sharing?.actorId === profile.actorId ? sharing.expected.noteId : null,
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
  const dirty = useRef<{ id: string; epoch: number; value: boolean } | null>(
    null,
  );
  const isDirty = () => {
    const current = actor?.currentActor();
    return (
      !!current &&
      dirty.current?.id === current.id &&
      dirty.current.epoch === current.epoch &&
      dirty.current.value
    );
  };
  useBlocker({
    shouldBlockFn: () =>
      isDirty() &&
      !window.confirm("未保存のプロフィール変更があります。画面を離れますか？"),
    enableBeforeUnload: isDirty,
  });
  useEffect(() => {
    const before = (event: Event) => {
      if (
        isDirty() &&
        !window.confirm(
          "未保存のプロフィール変更があります。サインアウトしますか？",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("hollow:before-signout", before);
    return () => window.removeEventListener("hollow:before-signout", before);
  });
  return (
    <Shell email={user.email}>
      <h1>プロフィール</h1>
      {actor?.actor && actor.actor.id === profile.actorId && (
        <ProfileEditor
          initial={profile}
          actorId={actor.actor.id}
          actorEpoch={actor.actor.epoch}
          currentActor={actor.currentActor}
          save={(data) => saveProfileFn({ data })}
          refresh={() => getProfileFn()}
          checkHandle={(handle) => checkHandleFn({ data: { handle } })}
          uploadIcon={async (file, profileVersion) => {
            const expected = actor.actor;
            const stillCurrent = () => {
              const current = actor.currentActor();
              return (
                current?.id === expected?.id &&
                current?.epoch === expected?.epoch
              );
            };
            const receipt = await beginProfileIconFn({
              data: beginProfileIconSchema.parse({
                profileVersion,
                bytes: file.size,
                mime: file.type,
              }),
            });
            if (!stillCurrent()) throw new Error("利用者が変更されました。");
            const response = await fetch(receipt.uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
            });
            const result: unknown = await response.json();
            if (!response.ok)
              throw result && typeof result === "object" && "error" in result
                ? { serialized: result.error }
                : new Error("画像の保存結果を確認できません。");
            return profileViewSchema.parse(result);
          }}
          removeIcon={(profileVersion) =>
            removeProfileIconFn({ data: { profileVersion } })
          }
          onDirtyChange={(value) => {
            if (actor.actor) dirty.current = { ...actor.actor, value };
          }}
          onSaved={() => {
            const current = actor.currentActor();
            if (
              current?.id === actor.actor?.id &&
              current?.epoch === actor.actor?.epoch
            )
              void router.invalidate();
          }}
        />
      )}
      {returnNoteId && actor?.actor?.id === profile.actorId && (
        <p>
          <Link
            to="/notes/$noteId"
            params={{ noteId: returnNoteId }}
            search={{ sharing: 1 }}
          >
            ノートの共有設定へ戻る
          </Link>
        </p>
      )}
    </Shell>
  );
}

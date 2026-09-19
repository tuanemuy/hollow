import {
  createFileRoute,
  redirect,
  useBlocker,
  useRouter,
} from "@tanstack/react-router";
import { useRef } from "react";
import { z } from "zod";
import { useSharingActor } from "@/components/hollow/SharingActorProvider";
import { PageError, Shell } from "@/components/hollow/Shell";
import { WorkspaceSettings } from "@/components/hollow/WorkspaceSettings";
import { WorkspacePublicationPanel } from "@/components/publication/WorkspacePublicationPanel";
import { currentUserFn } from "@/presentation/hollowAuth";
import { loadWorkspaceSettingsFn } from "@/presentation/hollowInvitations";
import {
  getWorkspacePublicationFn,
  setWorkspacePublicationFn,
} from "@/presentation/publicationServerFn";

export const Route = createFileRoute("/workspaces/$workspaceId/settings")({
  params: {
    parse: (params) => ({ workspaceId: z.uuid().parse(params.workspaceId) }),
  },
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  loader: async ({ params }) => {
    const [settings, publication] = await Promise.all([
      loadWorkspaceSettingsFn({ data: { workspaceId: params.workspaceId } }),
      getWorkspacePublicationFn({ data: { workspaceId: params.workspaceId } }),
    ]);
    return { ...settings, publication };
  },
  component: WorkspaceSettingsPage,
  errorComponent: PageError,
  pendingComponent: SettingsPending,
});

function SettingsPending() {
  return (
    <div className="hollow-loading" role="status" aria-label="設定を読み込み中">
      <span>設定を読み込み中…</span>
      {[0, 1, 2].map((value) => (
        <div key={value} className="hollow-skeleton" />
      ))}
    </div>
  );
}

function WorkspaceSettingsPage() {
  const { user } = Route.useRouteContext();
  const { workspaceId } = Route.useParams();
  const { initial, invitations, publication } = Route.useLoaderData();
  const actor = useSharingActor();
  const router = useRouter();
  const dirty = useRef<{
    actorId: string;
    epoch: number;
    workspaceId: string;
    value: boolean;
  } | null>(null);
  const isDirty = () => {
    const current = actor?.currentActor();
    return (
      !!current &&
      dirty.current?.actorId === current.id &&
      dirty.current.epoch === current.epoch &&
      dirty.current.workspaceId === workspaceId &&
      dirty.current.value
    );
  };
  useBlocker({
    shouldBlockFn: () =>
      isDirty() &&
      !window.confirm("公開ページの未保存の変更があります。画面を離れますか？"),
    enableBeforeUnload: isDirty,
  });
  return (
    <Shell email={user.email}>
      <WorkspaceSettings
        key={workspaceId}
        initial={initial}
        invitations={invitations}
      />
      {actor?.actor?.id === publication.actorId && (
        <WorkspacePublicationPanel
          actorId={actor.actor.id}
          actorEpoch={actor.actor.epoch}
          currentActor={actor.currentActor}
          initial={publication}
          save={(data) => setWorkspacePublicationFn({ data })}
          refresh={() => getWorkspacePublicationFn({ data: { workspaceId } })}
          onDirtyChange={(value) => {
            if (actor.actor)
              dirty.current = {
                actorId: actor.actor.id,
                epoch: actor.actor.epoch,
                workspaceId,
                value,
              };
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
    </Shell>
  );
}

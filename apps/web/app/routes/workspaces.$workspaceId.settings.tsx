import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageError, Shell } from "@/components/hollow/Shell";
import { WorkspaceSettings } from "@/components/hollow/WorkspaceSettings";
import { currentUserFn } from "@/presentation/hollowAuth";
import { loadWorkspaceSettingsFn } from "@/presentation/hollowInvitations";

export const Route = createFileRoute("/workspaces/$workspaceId/settings")({
  params: {
    parse: (params) => ({ workspaceId: z.uuid().parse(params.workspaceId) }),
  },
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  loader: ({ params }) =>
    loadWorkspaceSettingsFn({ data: { workspaceId: params.workspaceId } }),
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
  const { initial, invitations } = Route.useLoaderData();
  return (
    <Shell email={user.email}>
      <WorkspaceSettings
        key={workspaceId}
        initial={initial}
        invitations={invitations}
      />
    </Shell>
  );
}

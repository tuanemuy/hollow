import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { driveSettingsFn } from "@/presentation/driveServerFn";
import { currentUserFn } from "@/presentation/hollowAuth";
import { openRouterSettingsFn } from "@/presentation/openRouterServerFn";

export const Route = createFileRoute("/settings/integrations")({
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  loader: async () => {
    const [openRouter, drive] = await Promise.all([
      openRouterSettingsFn(),
      driveSettingsFn(),
    ]);
    return { openRouter, drive };
  },
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const { openRouter, drive } = Route.useLoaderData();
  return (
    <Shell email={user.email}>
      <h1>外部連携</h1>
      <section aria-label="OpenRouter連携の状態">
        <h2>OpenRouter</h2>
        <p>
          {openRouter.state === "linked"
            ? "連携済み"
            : openRouter.state === "needs_relink"
              ? "再連携が必要"
              : "未連携"}
        </p>
        {openRouter.state === "unlinked" && (
          <p>
            連携すると、対応する文書・画像のAI変換と原本からの再生成を利用できます。
          </p>
        )}
        {openRouter.providerUserId && (
          <p>OpenRouter creator_user_id: {openRouter.providerUserId}</p>
        )}
        {openRouter.linkedAt && (
          <p>連携日時: {new Date(openRouter.linkedAt).toLocaleString()}</p>
        )}
        <p>
          最終利用:{" "}
          {openRouter.lastUsedAt
            ? new Date(openRouter.lastUsedAt).toLocaleString()
            : "まだ利用していません"}
        </p>
        {openRouter.lastUsedAt && <p>送信結果が不明な試行も含む日時です。</p>}
        <p>
          <Link to="/settings/openrouter">OpenRouter連携とモデル設定</Link>
          {" · "}
          <Link to="/notes/jobs" search={{}}>
            AI変換の処理履歴
          </Link>
        </p>
      </section>
      <section aria-label="Google Drive連携の状態">
        <h2>Google Drive</h2>
        <p>
          {drive.state === "linked"
            ? "連携済み"
            : drive.state === "needs-relink"
              ? "再連携が必要"
              : "未連携"}
        </p>
        {drive.state === "unlinked" && (
          <p>
            連携すると、原本のバックアップとバックアップからの再生成を利用できます。
          </p>
        )}
        {drive.account && (
          <>
            <p>連携先: {drive.account.email}</p>
            <p>
              連携日時: {new Date(drive.account.connectedAt).toLocaleString()}
            </p>
          </>
        )}
        <p>
          最終利用:{" "}
          {drive.lastUsedAt
            ? new Date(drive.lastUsedAt).toLocaleString()
            : "まだ利用していません"}
        </p>
        <p>
          <Link to="/settings/drive">Google Drive連携の設定・履歴</Link>
        </p>
      </section>
    </Shell>
  );
}

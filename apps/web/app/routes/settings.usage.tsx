import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { LlmUsage } from "@/components/hollow/LlmUsage";
import { LoadingNotes, PageError, Shell } from "@/components/hollow/Shell";
import { browseNotesFn } from "@/presentation/browseServerFn";
import { currentUserFn } from "@/presentation/hollowAuth";
import {
  getScopeUsageFn,
  listWorkspacesFn,
} from "@/presentation/hollowWorkspace";
import { scopeSearch } from "@/presentation/workspaceInput";

export async function readUsageScopes() {
  const workspaceIds: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await listWorkspacesFn({ data: cursor ? { cursor } : {} });
    workspaceIds.push(
      ...page.items
        .filter((item) => item.role !== "viewer")
        .map((item) => item.id),
    );
    cursor = page.nextCursor;
  } while (cursor);
  const scopes = [];
  for (const workspaceId of [undefined, ...workspaceIds]) {
    const data = workspaceId ? { workspaceId } : {};
    const [usage, notes] = await Promise.all([
      getScopeUsageFn({ data }),
      browseNotesFn({
        data: {
          ...data,
          query: "",
          tags: [],
          zone: "UTC",
          layout: "list",
          sort: "updated-desc",
        },
      }),
    ]);
    scopes.push({ ...usage, activeNotes: notes.total });
  }
  return scopes;
}

export const Route = createFileRoute("/settings/usage")({
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  loader: readUsageScopes,
  pendingComponent: LoadingNotes,
  errorComponent: PageError,
  component: Page,
});

function Page() {
  const scopes = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return (
    <Shell email={user.email}>
      <h1>使用状況</h1>
      <p>
        個人と、編集できるワークスペースの使用状況です。容量にはゴミ箱の原本・メディアと受付済みの予約・回収待ちを含みます。ノート件数はゴミ箱を除く現在の件数です。
      </p>
      {scopes.map(({ scope, usage, activeNotes }) => (
        <section
          key={scope.workspaceId ?? "personal"}
          aria-label={`${scope.name}の使用状況`}
        >
          <h2>{scope.name}</h2>
          <p>
            容量: {usage.usedBytes.toLocaleString()} /{" "}
            {usage.limitBytes.toLocaleString()} bytes（上限{" "}
            {usage.limitBytes / 1024 ** 3} GiB）
          </p>
          <progress
            aria-label={`${scope.name}の容量`}
            value={usage.usedBytes}
            max={usage.limitBytes}
          />
          <p>ノート: {activeNotes.toLocaleString()} 件（ゴミ箱を除く）</p>
          <p>最終更新: {new Date(usage.updatedAt).toLocaleString()}</p>
          {usage.usedBytes >= usage.limitBytes ? (
            <p role="alert">
              容量の上限に達しています。新しいファイルは取り込めません。不要なノートを削除し、ゴミ箱から完全に削除すると容量を空けられます。
            </p>
          ) : (
            usage.usedBytes > usage.limitBytes * 0.8 && (
              <p role="status">
                容量の80%を超えています。不要なノートとゴミ箱を確認してください。
              </p>
            )
          )}
          <p>
            <Link
              to="/notes"
              search={scopeSearch(scope.workspaceId ?? undefined)}
            >
              不要なノートを確認
            </Link>
            {" · "}
            <Link
              to="/trash"
              search={scopeSearch(scope.workspaceId ?? undefined)}
            >
              ゴミ箱
            </Link>
          </p>
        </section>
      ))}
      <LlmUsage key={user.id} />
    </Shell>
  );
}

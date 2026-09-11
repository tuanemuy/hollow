import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { LoadingNotes, Shell } from "@/components/hollow/Shell";
import { TagRouteError } from "@/components/tag/TagRouteError";
import { TagSkeleton } from "@/components/tag/TagSkeleton";
import { Deferred } from "@/components/ui/Deferred";
import { currentUserFn } from "@/presentation/hollowAuth";
import { tagRouteSchema } from "@/presentation/tagInput";
import { renderTags } from "./-tags";

export const Route = createFileRoute("/tags")({
  validateSearch: (search) => tagRouteSchema.parse(search),
  beforeLoad: async ({ location }) => {
    const user = await currentUserFn();
    if (!user)
      throw redirect({ to: "/signin", search: { redirect: location.href } });
    return { user };
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => renderTags({ data: deps }),
  errorComponent: TagRouteError,
  pendingComponent: LoadingNotes,
  component: TagsPage,
});
function TagsPage() {
  const { user } = Route.useRouteContext();
  const { tags } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <Shell email={user.email}>
      <Suspense key={JSON.stringify(search)} fallback={<TagSkeleton />}>
        <Deferred promise={tags} />
      </Suspense>
    </Shell>
  );
}

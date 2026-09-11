import { readTags } from "@repo/core/application/tag/usecases";
import { hollowContext } from "@/presentation/hollowServer";
import { TagManager, type TagManagerSearch } from "./TagManager";

export async function TagsFragment({ search }: { search: TagManagerSearch }) {
  const { container, token } = await hollowContext();
  const page = await readTags(container, token, {
    purpose: "manager",
    query: search.query ?? "",
    unusedOnly: search.unusedOnly ?? false,
    ...(search.workspaceId ? { workspaceId: search.workspaceId } : {}),
    ...(search.cursor ? { cursor: search.cursor } : {}),
  });
  if (
    page.kind !== "page" ||
    page.purpose !== "manager" ||
    page.scope.workspaceId !== (search.workspaceId ?? null)
  )
    throw new Error("Tag manager response mismatch");
  return <TagManager page={page} search={search} />;
}

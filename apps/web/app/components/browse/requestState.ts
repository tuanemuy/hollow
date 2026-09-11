import type {
  BrowseConditions,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import { browseIdentity, browseRouteSchema } from "@/presentation/browseInput";
import { scopeFromLoader } from "@/presentation/workspaceInput";

export type RequestTicket = Readonly<{
  generation: number;
  identity: string;
  seed: object;
  location: string;
}>;
export function acceptsRequest(
  current: RequestTicket,
  requested: RequestTicket,
): boolean {
  return (
    current.generation === requested.generation &&
    current.identity === requested.identity &&
    current.seed === requested.seed &&
    current.location === requested.location
  );
}
export function acceptsPage(
  request: BrowseConditions,
  seed: BrowsePage,
  response: BrowsePage,
): boolean {
  return (
    response.scope.workspaceId === seed.scope.workspaceId &&
    browseIdentity({ ...response.conditions, cursor: undefined }) ===
      browseIdentity({ ...request, cursor: undefined }) &&
    (!!request.day || response.identity === seed.identity)
  );
}
export function matchesBrowseLocation(
  conditions: BrowseConditions,
  search: unknown,
): boolean {
  const parsed = browseRouteSchema.safeParse(search);
  return (
    parsed.success && browseIdentity(parsed.data) === browseIdentity(conditions)
  );
}
export function noteScopeForPath(pathname: string, data: unknown) {
  const match = /^\/notes\/([^/]+)(?:\/edit)?\/?$/.exec(pathname);
  if (
    !match ||
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    data.id !== match[1]
  )
    return undefined;
  return scopeFromLoader(data);
}

import type { SharingView } from "@repo/core/application/sharing/settings";
import type { ShareExpected } from "@repo/core/domain/sharing/entity";
import { sharingFailure } from "./model";

export async function readSharingLink(
  view: SharingView,
  valid: () => boolean,
  getLink: (expected: ShareExpected) => Promise<{ url: string }>,
): Promise<
  | { kind: "stale" }
  | { kind: "absent" }
  | { kind: "ready"; url: string }
  | { kind: "failed"; failure: ReturnType<typeof sharingFailure> }
> {
  if (!valid()) return { kind: "stale" };
  if (!view.canEdit || view.visibility === "private" || !view.hasLink)
    return { kind: "absent" };
  try {
    const result = await getLink(view.expected);
    return valid() ? { kind: "ready", url: result.url } : { kind: "stale" };
  } catch (cause) {
    return valid()
      ? { kind: "failed", failure: sharingFailure(cause) }
      : { kind: "stale" };
  }
}

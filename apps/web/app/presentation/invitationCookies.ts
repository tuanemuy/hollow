import { NotFoundError } from "@repo/core/application/errors";
import type { InvitationSelection } from "@repo/core/application/workspace/invitationViews";
import { getCookie } from "@tanstack/react-start/server";
export function invitationCookies(expected?: InvitationSelection) {
  const continuationId = getCookie("hollow_invitation_continuation");
  const browserToken = getCookie("hollow_invitation_browser");
  if (
    !continuationId ||
    !browserToken ||
    !/^[A-Za-z0-9_-]{43}$/.test(continuationId) ||
    !/^[A-Za-z0-9_-]{43}$/.test(browserToken)
  )
    throw new NotFoundError(
      "INVITATION_INVALID",
      "招待メールのリンクをもう一度開いてください。",
    );
  return { continuationId, browserToken, ...(expected ? { expected } : {}) };
}

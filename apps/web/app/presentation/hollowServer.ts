import type { IssuedSession } from "@repo/core/application/account/session";
import { getContainer } from "@repo/core/application/di/containerStore";
import {
  ForbiddenError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

export const SESSION_COOKIE = "hollow_session";
export const VERIFICATION_COOKIE = "hollow_verification_browser";

export async function hollowContext(mutation = false) {
  const container = await getContainer();
  if (!container.hollow)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "Hollow は Node ランタイムで利用できます。",
    );
  setResponseHeader("Cache-Control", "no-store");
  if (mutation) {
    const origin = getRequestHeader("origin");
    if (origin !== new URL(container.hollow.appUrl).origin)
      throw new ForbiddenError(
        "ORIGIN_REJECTED",
        "この操作を実行できません。元の画面からやり直してください。",
      );
  }
  const token = getCookie(SESSION_COOKIE);
  return {
    container: container.hollow,
    token: token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null,
  };
}

export function storeSession(session: IssuedSession, appUrl: string) {
  setCookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: new URL(appUrl).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

export function storeVerificationBrowser(token: string, appUrl: string) {
  setCookie(VERIFICATION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(appUrl).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

export function removeSession() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

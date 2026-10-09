import {
  completeGoogleCallback,
  rejectGoogleCallback,
} from "@repo/core/application/account/google";
import type { IssuedSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";

export function authenticationCookie(
  request: Request,
  name: string,
): string | null {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${name}=`)) ?? [];
  const value = values.length === 1 ? values[0]?.slice(name.length + 1) : null;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export async function fenceAuthenticationRequest(
  request: Request,
  c: HollowContainer,
): Promise<Request> {
  const token = authenticationCookie(request, "hollow_session");
  if (
    !request.headers
      .get("cookie")
      ?.split(";")
      .some((part) => part.trim().startsWith("hollow_session="))
  )
    return request;
  const row = token
    ? await c.unitOfWorkProvider.run((u) =>
        u.accounts.findSession(c.tokens.hash(token)),
      )
    : null;
  const browser = authenticationCookie(request, "hollow_auth_browser");
  if (
    row &&
    (!row.browser || (browser && row.browser.hash === c.tokens.hash(browser)))
  )
    return request;
  const headers = new Headers(request.headers);
  const cookies = headers
    .get("cookie")
    ?.split(";")
    .filter((part) => !part.trim().startsWith("hollow_session="));
  if (cookies?.length) headers.set("cookie", cookies.join(";"));
  else headers.delete("cookie");
  return new Request(request, { headers });
}

function sessionCookie(session: IssuedSession, secure: boolean) {
  return `hollow_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Expires=${session.expiresAt.toUTCString()}${secure ? "; Secure" : ""}`;
}

export async function authenticationHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/auth/google/callback") return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Security-Policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  const redirect = (id?: string) => {
    headers.set(
      "Location",
      id ? `/auth/google-result?id=${id}` : "/auth/google-result",
    );
    return new Response(null, { status: 303, headers });
  };
  if (request.method !== "GET") {
    headers.set("Allow", "GET");
    return new Response(null, { status: 405, headers });
  }
  if (url.search.length > 16384) return redirect();
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const browserToken = authenticationCookie(request, "hollow_auth_browser");
  if (
    !browserToken ||
    !state ||
    !/^[A-Za-z0-9_-]{43}$/.test(state) ||
    url.searchParams.getAll("state").length !== 1
  )
    return redirect();
  const auth = {
    browserToken,
    sessionToken: authenticationCookie(request, "hollow_session"),
  };
  const attempt = await c.unitOfWorkProvider.run((u) =>
    u.googleAttempts.findByState(c.tokens.hash(state)),
  );
  if (!attempt || attempt.browser.hash !== c.tokens.hash(browserToken))
    return redirect();
  if (
    !code ||
    new TextEncoder().encode(code).byteLength > 4096 ||
    url.searchParams.getAll("code").length !== 1 ||
    url.searchParams.has("error")
  ) {
    try {
      const cancelled =
        !url.searchParams.has("code") &&
        url.searchParams.getAll("error").length === 1 &&
        url.searchParams.get("error") === "access_denied";
      const result = await rejectGoogleCallback(
        c,
        auth,
        state,
        cancelled ? "AUTH_CANCELLED" : "AUTH_PROVIDER_REJECTED",
      );
      if (result.cancelled) {
        headers.set("Location", `/signin?cancelled=${result.id}`);
        return new Response(null, { status: 303, headers });
      }
    } catch {
      return redirect(attempt.id);
    }
    return redirect(attempt.id);
  }
  try {
    const result = await completeGoogleCallback(c, auth, state, code);
    const secure = new URL(c.appUrl).protocol === "https:";
    if (result.session)
      headers.append("Set-Cookie", sessionCookie(result.session, secure));
    if (result.reauthProof)
      headers.append(
        "Set-Cookie",
        `hollow_google_reauth=${result.id}.${result.reauthProof}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${secure ? "; Secure" : ""}`,
      );
    return redirect(result.id);
  } catch {
    return redirect(attempt.id);
  }
}

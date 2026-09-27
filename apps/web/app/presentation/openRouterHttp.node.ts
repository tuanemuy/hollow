import { requireAuthenticationContext } from "@repo/core/application/account/context";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import {
  cancelOpenRouterAttempt,
  completeOpenRouter,
} from "@repo/core/application/integration/openRouter/connection";
import { authenticationCookie } from "./authenticationHttp.node";

export async function openRouterHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/auth/openrouter/callback") return null;
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
      id ? `/auth/openrouter-result?id=${id}` : "/auth/openrouter-result",
    );
    return new Response(null, { status: 303, headers });
  };
  if (request.method !== "GET") {
    headers.set("Allow", "GET");
    return new Response(null, { status: 405, headers });
  }
  if (url.search.length > 16384) return redirect();
  const correlation = url.searchParams.get("correlation");
  const code = url.searchParams.get("code");
  const browserToken = authenticationCookie(request, "hollow_auth_browser");
  if (
    !browserToken ||
    !correlation ||
    !/^[A-Za-z0-9_-]{43}$/.test(correlation) ||
    url.searchParams.getAll("correlation").length !== 1
  )
    return redirect();
  const auth = {
    browserToken,
    sessionToken: authenticationCookie(request, "hollow_session"),
  };
  let id: string | undefined;
  try {
    const attempt = await c.unitOfWorkProvider.run(async (u) => {
      const a = await u.openRouterAttempts.findByCorrelation(
        c.tokens.hash(correlation),
      );
      if (!a) return null;
      await requireAuthenticationContext(c, u, auth, a);
      return a;
    });
    if (!attempt) return redirect();
    id = attempt.id;
    if (
      !code ||
      new TextEncoder().encode(code).byteLength > 4096 ||
      url.searchParams.getAll("code").length !== 1 ||
      url.searchParams.has("error")
    ) {
      await cancelOpenRouterAttempt(c, auth, id);
      return redirect(id);
    }
    await completeOpenRouter(c, auth, correlation, code);
    return redirect(id);
  } catch {
    return redirect(id);
  }
}

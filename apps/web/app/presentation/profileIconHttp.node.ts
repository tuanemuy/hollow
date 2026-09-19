import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import {
  ForbiddenError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import { importContext } from "@repo/core/application/import/context";
import {
  acceptProfileIcon,
  getProfileIcon,
  getPublicWorkspaceIcon,
} from "@repo/core/application/publication/icons";
import { publicNotFound } from "@repo/core/application/publication/reading";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

export async function profileIconHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const upload = /^\/api\/profile-icon-uploads\/([a-f0-9-]{36})$/.exec(
    url.pathname,
  );
  const current = /^\/api\/profile\/icons\/([a-f0-9-]{36})$/.exec(url.pathname);
  const publicIcon =
    /^\/(@|w\/)([a-z0-9][a-z0-9-]{1,61}[a-z0-9])\/icons\/([a-f0-9-]{36})$/.exec(
      url.pathname,
    );
  if (!upload && !current && !publicIcon) return null;
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  });
  const tokens =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith("hollow_session=")) ?? [];
  const token =
    tokens.length === 1
      ? (tokens[0]?.slice("hollow_session=".length) ?? null)
      : null;
  try {
    if (url.search) throw publicNotFound();
    if (upload?.[1]) {
      if (request.method !== "PUT")
        return new Response(null, {
          status: 405,
          headers: { ...Object.fromEntries(headers), Allow: "PUT" },
        });
      if (request.headers.get("origin") !== new URL(c.appUrl).origin)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
      if (!request.body) return new Response(null, { status: 400, headers });
      return Response.json(
        await acceptProfileIcon(
          c,
          token,
          upload[1],
          request.body,
          request.signal,
        ),
        { headers },
      );
    }
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, {
        status: 405,
        headers: { ...Object.fromEntries(headers), Allow: "GET, HEAD" },
      });
    const lookup = () =>
      publicIcon?.[2] && publicIcon[3]
        ? publicIcon[1] === "@"
          ? getProfileIcon(c, null, {
              handle: publicIcon[2],
              iconId: publicIcon[3],
            })
          : getPublicWorkspaceIcon(c, publicIcon[2], publicIcon[3])
        : current?.[1]
          ? getProfileIcon(c, token, { iconId: current[1] })
          : Promise.reject(publicNotFound());
    const item = await lookup();
    const data = await importContext(c).storage.read(
      item.storageKey,
      item.bytes,
    );
    const latest = await lookup();
    if (JSON.stringify(item) !== JSON.stringify(latest)) throw publicNotFound();
    if (data.length !== item.bytes)
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Profile icon length mismatch",
      );
    headers.set("Content-Type", "image/webp");
    headers.set("Content-Length", String(data.length));
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    return new Response(
      request.method === "HEAD" ? null : new Uint8Array(data),
      { headers },
    );
  } catch (error) {
    const raw = serializeError(error);
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Profile icon HTTP failed", {
        kind: raw.kind,
        code: raw.code,
      });
    return new Response(
      request.method === "HEAD"
        ? null
        : JSON.stringify({ error: redactForClient(raw) }),
      {
        status: httpStatusFor(raw),
        headers: new Headers([
          ...headers,
          ["Content-Type", "application/json"],
        ]),
      },
    );
  }
}

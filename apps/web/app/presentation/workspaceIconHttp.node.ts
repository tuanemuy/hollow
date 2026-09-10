import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import { importContext } from "@repo/core/application/import/context";
import {
  acceptWorkspaceIcon,
  getWorkspaceIcon,
} from "@repo/core/application/workspace/icons";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";
import { iconSelectorSchema } from "./iconInput";

export async function workspaceIconHttp(
  request: Request,
  container: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const upload = /^\/api\/workspace-icon-uploads\/([a-f0-9-]{36})$/.exec(
    url.pathname,
  );
  const current =
    /^\/api\/workspace-icons\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/.exec(
      url.pathname,
    );
  if (!upload && !current) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie, Sec-Fetch-Site, Sec-Fetch-Dest",
  });
  const cookie = (name: string) =>
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null;
  const token = cookie("hollow_session");
  try {
    const site = request.headers.get("sec-fetch-site");
    const dest = request.headers.get("sec-fetch-dest");
    if (
      (site && !["same-origin", "none"].includes(site)) ||
      (dest && !["empty", "image", "document"].includes(dest))
    )
      throw new ForbiddenError(
        "ICON_REQUEST_REJECTED",
        "この用途では取得できません。",
      );
    if (upload?.[1]) {
      if (request.method !== "PUT") {
        headers.set("Allow", "PUT");
        return new Response(null, { status: 405, headers });
      }
      if (request.headers.get("origin") !== new URL(container.appUrl).origin)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
      if (!request.body) return new Response(null, { status: 400, headers });
      return Response.json(
        await acceptWorkspaceIcon(
          container,
          token,
          upload[1],
          request.body,
          request.signal,
        ),
        { headers },
      );
    }
    if (!current) return new Response(null, { status: 404, headers });
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    const parsed = iconSelectorSchema.safeParse({
      workspaceId: current[1],
      iconId: current[2],
      ...(url.searchParams.has("invitationId")
        ? { invitationId: url.searchParams.get("invitationId") }
        : {}),
      ...(url.searchParams.has("generation")
        ? { generation: url.searchParams.get("generation") }
        : {}),
    });
    if (!parsed.success) return new Response(null, { status: 400, headers });
    const s = parsed.data;
    const item = await getWorkspaceIcon(container, token, {
      workspaceId: s.workspaceId,
      iconId: s.iconId,
      ...(s.invitationId && s.generation
        ? {
            invitation: {
              continuationId: cookie("hollow_invitation_continuation") ?? "",
              browserToken: cookie("hollow_invitation_browser") ?? "",
              expected: { id: s.invitationId, generation: s.generation },
            },
          }
        : {}),
    });
    const data = await importContext(container).storage.read(
      item.storageKey,
      item.bytes,
    );
    if (data.length !== item.bytes) throw new Error("Icon size mismatch");
    headers.set("Content-Type", "image/webp");
    headers.set("Content-Length", String(data.length));
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    return new Response(
      request.method === "HEAD" ? null : new Uint8Array(data),
      { headers },
    );
  } catch (error) {
    const serialized = redactForClient(serializeError(error));
    return new Response(
      request.method === "HEAD" ? null : JSON.stringify({ error: serialized }),
      {
        status: httpStatusFor(serialized),
        headers: new Headers([
          ...headers,
          ["Content-Type", "application/json"],
        ]),
      },
    );
  }
}

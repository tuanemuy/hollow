import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { originalDownload } from "@repo/core/application/import/readImports";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

export async function importHttp(
  request: Request,
  container: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = /^\/api\/hollow\/(uploads|originals)\/([a-f0-9-]{36})$/.exec(
    url.pathname,
  );
  if (!url.pathname.startsWith("/api/hollow/")) return null;
  if (!match) return new Response("Not found", { status: 404 });
  const id = match[2];
  if (!id) return new Response("Not found", { status: 404 });
  const token =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("hollow_session="))
      ?.slice("hollow_session=".length) ?? null;
  try {
    if (match[1] === "uploads") {
      if (request.method !== "POST")
        return new Response(null, { status: 405, headers: { Allow: "POST" } });
      if (request.headers.get("origin") !== new URL(container.appUrl).origin)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
      if (!request.body) return new Response("Missing body", { status: 400 });
      return Response.json(
        await acceptUpload(container, token, id, request.body),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (request.method !== "GET")
      return new Response(null, { status: 405, headers: { Allow: "GET" } });
    const original = await originalDownload(container, token, id);
    return new Response(original.stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(original.bytes),
        "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${encodeURIComponent(original.name).replace(/'/g, "%27")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const serialized = redactForClient(serializeError(error));
    if (serialized.kind === "unknown" || serialized.kind === "system")
      container.logger.error("Import HTTP failed", { cause: error });
    return Response.json(
      { error: serialized },
      {
        status: httpStatusFor(serialized),
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

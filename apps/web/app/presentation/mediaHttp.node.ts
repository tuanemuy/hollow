import { getAsset } from "@repo/core/application/asset/access";
import { acceptMediaUpload } from "@repo/core/application/asset/uploads";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import {
  ForbiddenError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import { importContext } from "@repo/core/application/import/context";
import {
  parseAssetUrl,
  parseHistoryAssetUrl,
} from "@repo/core/domain/asset/entity";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

export function singleRange(
  header: string | null,
  bytes: number,
): { start: number; end: number } | null | "invalid" {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return "invalid";
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return "invalid";
  const start = match[1] ? a : Math.max(0, bytes - b);
  const end = match[1] && match[2] ? Math.min(b, bytes - 1) : bytes - 1;
  return start > end || start >= bytes || (!match[1] && b === 0)
    ? "invalid"
    : { start, end };
}
export async function mediaHttp(
  request: Request,
  container: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const upload = /^\/api\/media-uploads\/([a-f0-9-]{36})$/.exec(url.pathname);
  const reference =
    parseAssetUrl(url.pathname) ?? parseHistoryAssetUrl(url.pathname);
  if (!upload && !reference) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const token =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("hollow_session="))
      ?.slice("hollow_session=".length) ?? null;
  try {
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
        await acceptMediaUpload(container, token, upload[1], request.body),
        { headers },
      );
    }
    if (!reference) return new Response(null, { status: 404, headers });
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    const asset = await getAsset(container, token, reference);
    const storage = importContext(container).storage;
    const info = await storage.stat(asset.storageKey);
    if (info.bytes !== asset.bytes)
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "保存メディアのサイズが一致しません。",
      );
    const range = singleRange(request.headers.get("range"), info.bytes);
    headers.set("Accept-Ranges", "bytes");
    if (range === "invalid") {
      headers.set("Content-Range", `bytes */${info.bytes}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Type", asset.mime);
    headers.set("Content-Disposition", "inline");
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; sandbox",
    );
    headers.set(
      "Content-Length",
      String(range ? range.end - range.start + 1 : info.bytes),
    );
    if (range)
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${info.bytes}`,
      );
    const body =
      request.method === "HEAD"
        ? null
        : await storage.stream(asset.storageKey, range ?? undefined);
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch (error) {
    const serialized = redactForClient(serializeError(error));
    if (serialized.kind === "unknown" || serialized.kind === "system")
      container.logger.error("Media HTTP failed", { cause: error });
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

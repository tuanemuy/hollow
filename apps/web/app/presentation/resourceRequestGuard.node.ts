import { parseHistoryAssetUrl } from "@repo/core/domain/asset/entity";
import { serveStaticAsset } from "./staticAssets.node";

const subresources = new Set(["image", "video", "audio", "font"]);
export async function guardResourceRequest(
  request: Request,
  staticDirectory?: string,
): Promise<Response | null> {
  const destination = request.headers.get("sec-fetch-dest");
  if (!destination || !subresources.has(destination)) return null;
  const url = new URL(request.url);
  if (
    (request.method === "GET" || request.method === "HEAD") &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    (/^\/api\/(?:notes|drafts)\/[a-f0-9-]{36}\/assets\/[a-f0-9-]{36}$/.test(
      url.pathname,
    ) ||
      /^\/api\/workspace-icons\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(
        url.pathname,
      ) ||
      parseHistoryAssetUrl(url.pathname))
  )
    return null;
  if (staticDirectory) {
    const asset = await serveStaticAsset(request, staticDirectory);
    if (asset) return asset;
  }
  return new Response("この用途では取得できません。", {
    status: 403,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Sec-Fetch-Dest, Sec-Fetch-Site",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

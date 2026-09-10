import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const contentTypes: Readonly<Record<string, string>> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

export async function serveStaticAsset(
  request: Request,
  directory: string,
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return null;
  }
  if (
    pathname.includes("\\") ||
    pathname.split("/").some((segment) => segment.startsWith("."))
  )
    return null;
  const contentType = contentTypes[path.extname(pathname)];
  if (!contentType) return null;
  try {
    const root = await realpath(directory);
    const filename = await realpath(path.resolve(root, `.${pathname}`));
    if (!filename.startsWith(`${root}${path.sep}`)) return null;
    const metadata = await stat(filename);
    if (!metadata.isFile()) return null;
    return new Response(
      request.method === "HEAD"
        ? null
        : new Uint8Array(await readFile(filename)),
      {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(metadata.size),
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOENT" ||
        error.code === "ENOTDIR" ||
        error.code === "EINVAL")
    )
      return null;
    throw error;
  }
}

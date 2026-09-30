import { randomBytes } from "node:crypto";
import { DRIVE_PICKER_PATH } from "./driveDocument";

export function createDriveDocumentContext(request: Request) {
  if (
    !["GET", "HEAD"].includes(request.method) ||
    new URL(request.url).pathname !== DRIVE_PICKER_PATH
  )
    return undefined;
  const nonce = randomBytes(24).toString("base64");
  return { nonce, drivePickerDocument: { nonce } };
}

export function driveDocumentResponse(
  response: Response,
  context: ReturnType<typeof createDriveDocumentContext>,
): Response {
  if (!context) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, private");
  headers.set("Pragma", "no-cache");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  if (
    headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() ===
    "text/html"
  )
    headers.set(
      "Content-Security-Policy",
      [
        `script-src 'self' 'nonce-${context.nonce}' https://apis.google.com`,
        "script-src-attr 'none'",
        "frame-src https://docs.google.com",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

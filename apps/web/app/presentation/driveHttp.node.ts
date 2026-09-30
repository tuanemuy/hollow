import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { exchangeDriveAuthorization } from "@repo/core/application/integration/drive/connection";
import {
  cancelDriveOperation,
  sameDriveActor,
} from "@repo/core/application/integration/drive/control";
import { readDriveActor } from "@repo/core/application/integration/drive/current";
import { beginDriveFolderSelection } from "@repo/core/application/integration/drive/folders";
import { launchDrivePicker } from "@repo/core/application/integration/drive/picker";
import { authenticationCookie } from "./authenticationHttp.node";
import { driveInitialSchema, driveSelectSchema } from "./driveInput";

const headers = () =>
  new Headers({
    "Cache-Control": "no-store, private",
    Pragma: "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
async function body(request: Request, limit: number) {
  if (
    !request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .match(/^application\/json$/i)
  )
    throw Error("DRIVE_SHAPE");
  const reader = request.body?.getReader();
  if (!reader) throw Error("DRIVE_SHAPE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let cancellation: Promise<void> | null = null;
  const cancel = () => {
    cancellation ??= reader.cancel().then(
      () => {},
      () => {
        throw Error("DRIVE_ABORT");
      },
    );
    void cancellation.catch(() => {});
  };
  request.signal.addEventListener("abort", cancel, { once: true });
  if (request.signal.aborted) cancel();
  try {
    for (;;) {
      if (request.signal.aborted) throw Error("DRIVE_ABORT");
      const value = await reader.read();
      if (request.signal.aborted) throw Error("DRIVE_ABORT");
      if (value.done) break;
      size += value.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw Error("DRIVE_LIMIT");
      }
      chunks.push(value.value);
    }
  } finally {
    request.signal.removeEventListener("abort", cancel);
    try {
      await cancellation;
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
}
function json(value: unknown, status = 200) {
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > 65536)
    throw Error("DRIVE_LIMIT");
  const h = headers();
  h.set("Content-Type", "application/json; charset=utf-8");
  return new Response(serialized, { status, headers: h });
}

export function createDriveHttp(c: HollowContainer, callbackUrl: string) {
  const callback = new URL(callbackUrl);
  if (callback.origin !== new URL(c.appUrl).origin) throw Error("DRIVE_CONFIG");
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    const picker = url.pathname === "/api/integrations/drive/picker";
    const selection = url.pathname === "/api/integrations/drive/selection";
    const callbackRequest = url.pathname === callback.pathname;
    if (!picker && !selection && !callbackRequest) return null;
    if (request.signal.aborted)
      return json({ ok: false, code: "DRIVE_UNAVAILABLE" }, 503);
    const browserToken = authenticationCookie(request, "hollow_auth_browser");
    const auth = {
      browserToken: browserToken ?? "",
      sessionToken: authenticationCookie(request, "hollow_session"),
    };
    if (picker || selection) {
      if (request.method !== "POST") {
        const h = headers();
        h.set("Allow", "POST");
        return new Response(null, { status: 405, headers: h });
      }
      if (
        !browserToken ||
        request.headers.get("origin") !== new URL(c.appUrl).origin
      )
        return json({ ok: false, code: "DRIVE_CONTEXT_CHANGED" }, 403);
      try {
        const value = await body(request, picker ? 4096 : 16384);
        if (request.signal.aborted) throw Error("DRIVE_ABORT");
        const result = picker
          ? await launchDrivePicker(c, auth, driveInitialSchema.parse(value))
          : await beginDriveFolderSelection(
              c,
              auth,
              driveSelectSchema.parse(value),
            );
        return json({ ok: true, value: result });
      } catch {
        return json({ ok: false, code: "DRIVE_UNAVAILABLE" }, 400);
      }
    }
    const redirect = (id?: string) => {
      const h = headers();
      h.set(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      );
      h.set(
        "Location",
        id
          ? `/auth/drive-result?id=${encodeURIComponent(id)}`
          : "/auth/drive-result",
      );
      return new Response(null, { status: 303, headers: h });
    };
    if (request.method !== "GET") {
      const h = headers();
      h.set("Allow", "GET");
      return new Response(null, { status: 405, headers: h });
    }
    if (
      !browserToken ||
      new TextEncoder().encode(url.search).byteLength > 16384
    )
      return redirect();
    const state = url.searchParams.get("state");
    if (
      !state ||
      new TextEncoder().encode(state).byteLength > 4096 ||
      url.searchParams.getAll("state").length !== 1
    )
      return redirect();
    let id: string | undefined;
    try {
      const row = await c.unitOfWorkProvider.run(async (u) => {
        const actor = await readDriveActor(c, u, auth);
        const a = await u.driveAttempts.findByState(c.tokens.hash(state));
        return actor && a && sameDriveActor(a.context, actor) ? a : null;
      });
      if (!row) return redirect();
      if (request.signal.aborted) return redirect();
      id = row.id;
      const code = url.searchParams.get("code");
      if (
        !code ||
        new TextEncoder().encode(code).byteLength > 4096 ||
        url.searchParams.getAll("code").length !== 1 ||
        url.searchParams.has("error")
      ) {
        await cancelDriveOperation(c, auth, {
          kind: "authorization",
          id,
          expectedVersion: row.version,
        });
        return redirect(id);
      }
      if (!c.drive) return redirect(id);
      await exchangeDriveAuthorization(
        c,
        auth,
        { state, code },
        c.drive.runtimeGeneration,
      );
      return redirect(id);
    } catch {
      return redirect(id);
    }
  };
}

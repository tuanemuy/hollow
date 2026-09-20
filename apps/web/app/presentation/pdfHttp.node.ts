import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import { getPdfFile } from "@repo/core/application/pdf/delivery";
import {
  cancelPdf,
  listPdf,
  lookupPdf,
  pdfActivity,
  preparePdfDelivery,
  requestPdf,
} from "@repo/core/application/pdf/usecases";
import { z } from "zod";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

const uuid = "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})";
const requestPath = new RegExp(`^/api/notes/${uuid}/pdf$`);
const actionPath = new RegExp(`^/api/pdf-requests/${uuid}/(cancel|delivery)$`);
const deliveryPath = new RegExp(`^/api/pdf-deliveries/${uuid}$`);
const inputSchema = z.strictObject({
  commandId: z.uuid(),
  retryOf: z.uuid().optional(),
});
const emptySchema = z.strictObject({});
function session(request: Request) {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith("hollow_session=")) ?? [];
  const token =
    values.length === 1 ? values[0]?.slice("hollow_session=".length) : null;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
async function input(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0] !== "application/json" ||
    !request.body
  )
    throw Error("input");
  const reader = request.body.getReader();
  let bytes = 0;
  let expired = false;
  const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 5000);
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        throw Error("input");
      }
      chunks.push(next.value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (expired) throw Error("input");
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(all),
  ) as unknown;
}
export async function pdfHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const create = requestPath.exec(url.pathname);
  const action = actionPath.exec(url.pathname);
  const file = deliveryPath.exec(url.pathname);
  const list = url.pathname === "/api/pdf-requests";
  const activity = url.pathname === "/api/pdf-activity";
  if (!create && !action && !file && !list && !activity) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Type": "application/json",
    "Content-Security-Policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  try {
    const method = create || action ? "POST" : "GET";
    if (request.method !== method) {
      headers.set("Allow", method);
      return new Response(null, { status: 405, headers });
    }
    if (!list && !activity && url.search)
      return new Response(null, { status: 404, headers });
    if (
      method === "POST" &&
      request.headers.get("origin") !== new URL(c.appUrl).origin
    )
      throw new ForbiddenError(
        "ORIGIN_REJECTED",
        "元の画面からやり直してください。",
      );
    const token = session(request);
    if (activity) {
      const parsed = z
        .strictObject({
          after: z.uuid().optional(),
          watch: z.array(z.uuid()).max(50),
        })
        .safeParse({
          ...(url.searchParams.has("after")
            ? { after: url.searchParams.get("after") }
            : {}),
          watch: url.searchParams.getAll("watch"),
        });
      if (
        !parsed.success ||
        url.search.length > 4096 ||
        [...url.searchParams.keys()].some(
          (key) => key !== "watch" && key !== "after",
        ) ||
        url.searchParams.getAll("after").length > 1
      )
        return json(
          {
            error: {
              kind: "validation",
              message: "PDF処理の照会条件を確認してください。",
            },
          },
          422,
        );
      return json(
        await pdfActivity(c, token, parsed.data.after ?? null, [
          ...new Set(parsed.data.watch),
        ]),
      );
    }
    if (file?.[1]) {
      if (request.headers.has("range"))
        return new Response(null, { status: 416, headers });
      const result = await getPdfFile(c, token, file[1], request.signal);
      const filename = encodeURIComponent(result.file.filename).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Length", String(result.file.bytes));
      headers.set(
        "Content-Disposition",
        `attachment; filename="note.pdf"; filename*=UTF-8''${filename}`,
      );
      return new Response(result.body, { headers });
    }
    if (list) {
      if (
        url.search.length > 1024 ||
        [...url.searchParams.keys()].some(
          (key) => !["command", "at", "id"].includes(key),
        ) ||
        [...url.searchParams.keys()].some(
          (key) => url.searchParams.getAll(key).length !== 1,
        )
      )
        return json(
          {
            error: {
              kind: "validation",
              message: "照会条件を確認してください。",
            },
          },
          422,
        );
      const command = url.searchParams.get("command");
      if (command) {
        if (url.searchParams.size !== 1 || !z.uuid().safeParse(command).success)
          return json(
            {
              error: {
                kind: "validation",
                message: "要求識別子を確認してください。",
              },
            },
            422,
          );
        return json(await lookupPdf(c, token, command));
      }
      const at = url.searchParams.get("at");
      const id = url.searchParams.get("id");
      if (
        (at || id) &&
        (!at ||
          !id ||
          !z.iso.datetime().safeParse(at).success ||
          !z.uuid().safeParse(id).success)
      )
        return json(
          {
            error: {
              kind: "validation",
              message: "履歴の位置を確認してください。",
            },
          },
          422,
        );
      return json(
        await listPdf(
          c,
          token,
          at && id ? { createdAt: new Date(at), id } : null,
        ),
      );
    }
    let value: unknown;
    try {
      value = await input(request);
    } catch {
      return json(
        {
          error: {
            kind: "validation",
            message: "PDF操作の入力を確認してください。",
          },
        },
        422,
      );
    }
    if (create?.[1]) {
      const parsed = inputSchema.safeParse(value);
      if (!parsed.success)
        return json(
          {
            error: {
              kind: "validation",
              message: "PDF操作の入力を確認してください。",
            },
          },
          422,
        );
      return json(
        await requestPdf(c, token, {
          noteId: create[1],
          commandId: parsed.data.commandId,
          ...(parsed.data.retryOf ? { retryOf: parsed.data.retryOf } : {}),
        }),
      );
    }
    if (action?.[1]) {
      if (!emptySchema.safeParse(value).success)
        return json(
          {
            error: {
              kind: "validation",
              message: "PDF操作の入力を確認してください。",
            },
          },
          422,
        );
      return json(
        action[2] === "cancel"
          ? await cancelPdf(c, token, action[1])
          : await preparePdfDelivery(c, token, action[1]),
      );
    }
    return new Response(null, { status: 404, headers });
  } catch (error) {
    const raw = serializeError(error);
    const safe = redactForClient(raw);
    const status = [
      "PDF_BUSY",
      "PDF_STOPPING",
      "PDF_DISK_BUSY",
      "PDF_DELIVERY_BUSY",
    ].includes(raw.code ?? "")
      ? 503
      : httpStatusFor(raw);
    if (status === 503) headers.set("Retry-After", "3");
    return json({ error: safe }, status);
  }
}

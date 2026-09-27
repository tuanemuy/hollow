import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import {
  getZipFile,
  prepareZipDelivery,
} from "@repo/core/application/zip/delivery";
import { previewZip } from "@repo/core/application/zip/preview";
import { previewZipRetry, retryZip } from "@repo/core/application/zip/retry";
import {
  cancelZip,
  getZip,
  getZipDetails,
  listZip,
  lookupZip,
  requestZip,
  zipActivity,
} from "@repo/core/application/zip/usecases";
import { z } from "zod";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

const uuid = "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})";
const itemPath = new RegExp(
  `^/api/zip/requests/${uuid}(?:/(cancel|delivery|details))?$`,
);
const filePath = new RegExp(`^/api/zip/deliveries/${uuid}/file$`);
const generation = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const offset = z.number().int().min(0).max(499);
const selection = z.strictObject({
  noteIds: z.array(z.uuid()).min(1).max(500),
  format: z.enum(["html", "markdown", "pdf"]),
});
const preview = selection.extend({ offset: offset.optional() });
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const command = selection.extend({ commandId: z.uuid(), confirmation: digest });
const retry = z.strictObject({
  id: z.uuid(),
  generation,
  mode: z.enum(["failed", "assembly"]),
  ordinals: z.array(z.number().int().min(0).max(499)).max(500),
});
const retryPreview = retry.extend({ offset: offset.optional() });
const retryCommand = retry.extend({
  commandId: z.uuid(),
  confirmation: digest,
});
function session(request: Request) {
  const cookies =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .filter((value) => value.startsWith("hollow_session=")) ?? [];
  const value = cookies.length === 1 ? cookies[0]?.slice(15) : null;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
async function body(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0] !== "application/json" ||
    !request.body
  )
    throw Error("input");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel().catch(() => {});
  }, 5000);
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 65536) {
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
  const joined = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    joined.set(chunk, position);
    position += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
}
export async function zipHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const item = itemPath.exec(url.pathname);
  const file = filePath.exec(url.pathname);
  const list = url.pathname === "/api/zip/requests";
  const action = [
    "/api/zip/preview",
    "/api/zip/retry-preview",
    "/api/zip/retry",
  ].includes(url.pathname);
  const activity = url.pathname === "/api/zip/activity";
  if (!item && !file && !list && !action && !activity) return null;
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
  const invalid = () =>
    json(
      {
        error: {
          kind: "validation",
          message: "ZIP操作の入力を確認してください。",
        },
      },
      422,
    );
  try {
    const methods = list
      ? ["GET", "POST"]
      : action || item?.[2] === "cancel" || item?.[2] === "delivery"
        ? ["POST"]
        : ["GET"];
    if (!methods.includes(request.method)) {
      headers.set("Allow", methods.join(", "));
      return new Response(null, { status: 405, headers });
    }
    if (url.search.length > 4096) return invalid();
    const token = session(request);
    if (request.method === "POST") {
      if (url.search) return invalid();
      if (request.headers.get("origin") !== new URL(c.appUrl).origin)
        throw new ForbiddenError(
          "ORIGIN_REJECTED",
          "元の画面からやり直してください。",
        );
      let input: unknown;
      try {
        input = await body(request);
      } catch {
        return invalid();
      }
      if (list) {
        const parsed = command.safeParse(input);
        return parsed.success
          ? json(await requestZip(c, token, parsed.data))
          : invalid();
      }
      if (url.pathname === "/api/zip/preview") {
        const parsed = preview.safeParse(input);
        return parsed.success
          ? json(
              await previewZip(c, token, {
                ...parsed.data,
                offset: parsed.data.offset ?? 0,
              }),
            )
          : invalid();
      }
      if (url.pathname === "/api/zip/retry-preview") {
        const parsed = retryPreview.safeParse(input);
        return parsed.success
          ? json(
              await previewZipRetry(c, token, {
                ...parsed.data,
                offset: parsed.data.offset ?? 0,
              }),
            )
          : invalid();
      }
      if (url.pathname === "/api/zip/retry") {
        const parsed = retryCommand.safeParse(input);
        return parsed.success
          ? json(await retryZip(c, token, parsed.data))
          : invalid();
      }
      if (item?.[1] && item[2] === "cancel")
        return z.strictObject({}).safeParse(input).success
          ? json(await cancelZip(c, token, item[1]))
          : invalid();
      if (item?.[1] && item[2] === "delivery") {
        const parsed = z.strictObject({ generation }).safeParse(input);
        return parsed.success
          ? json(
              await prepareZipDelivery(
                c,
                token,
                item[1],
                parsed.data.generation,
              ),
            )
          : invalid();
      }
      return invalid();
    }
    if (file?.[1]) {
      if (url.search) return new Response(null, { status: 404, headers });
      if (request.headers.has("range"))
        return new Response(null, { status: 416, headers });
      const result = await getZipFile(c, token, file[1], request.signal);
      headers.set("Content-Type", "application/zip");
      headers.set("Content-Length", String(result.file.bytes));
      headers.set(
        "Content-Disposition",
        'attachment; filename="hollow-export.zip"',
      );
      return new Response(result.body, { headers });
    }
    if (activity) {
      if (
        [...url.searchParams.keys()].some(
          (key) => key !== "after" && key !== "watch",
        ) ||
        url.searchParams.getAll("after").length > 1
      )
        return invalid();
      const parsed = z
        .strictObject({
          after: z.uuid().nullable(),
          watch: z.array(z.uuid()).max(50),
        })
        .safeParse({
          after: url.searchParams.get("after"),
          watch: url.searchParams.getAll("watch"),
        });
      return parsed.success
        ? json(
            await zipActivity(c, token, parsed.data.after, parsed.data.watch),
          )
        : invalid();
    }
    const entries = [...url.searchParams];
    if (new Set(entries.map(([key]) => key)).size !== entries.length)
      return invalid();
    const query = Object.fromEntries(entries);
    if (list) {
      if (url.searchParams.has("command")) {
        const parsed = z.strictObject({ command: z.uuid() }).safeParse(query);
        return parsed.success
          ? json(await lookupZip(c, token, parsed.data.command))
          : invalid();
      }
      if (!entries.length) return json(await listZip(c, token, null));
      const parsed = z
        .strictObject({
          id: z.uuid(),
          generation: z.coerce.number().pipe(generation),
          at: z.iso.datetime(),
        })
        .safeParse(query);
      return parsed.success
        ? json(
            await listZip(c, token, {
              requestId: parsed.data.id,
              generation: parsed.data.generation,
              acceptedAt: new Date(parsed.data.at),
            }),
          )
        : invalid();
    }
    if (item?.[1]) {
      if (item[2] === "details") {
        const parsed = z
          .strictObject({
            generation: z.coerce.number().pipe(generation),
            offset: z.coerce.number().pipe(offset).optional(),
          })
          .safeParse(query);
        return parsed.success
          ? json(
              await getZipDetails(
                c,
                token,
                item[1],
                parsed.data.generation,
                parsed.data.offset,
              ),
            )
          : invalid();
      }
      const parsed = z
        .strictObject({
          generation: z.coerce.number().pipe(generation).optional(),
        })
        .safeParse(query);
      return parsed.success
        ? json(await getZip(c, token, item[1], parsed.data.generation))
        : invalid();
    }
    return new Response(null, { status: 404, headers });
  } catch (error) {
    const raw = serializeError(error);
    const status = ["ZIP_BUSY", "ZIP_DISK_BUSY", "ZIP_DELIVERY_BUSY"].includes(
      raw.code ?? "",
    )
      ? 503
      : httpStatusFor(raw);
    if (status === 503) headers.set("Retry-After", "3");
    return json({ error: redactForClient(raw) }, status);
  }
}

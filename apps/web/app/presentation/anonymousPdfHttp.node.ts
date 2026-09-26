import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { ForbiddenError } from "@repo/core/application/errors";
import { getAnonymousPdfFile } from "@repo/core/application/pdf/anonymousDelivery";
import type { PdfAnonymousAccess } from "@repo/core/application/pdf/anonymousSnapshot";
import {
  anonymousPdfStatus,
  prepareAnonymousPdfDelivery,
  requestAnonymousPdf,
} from "@repo/core/application/pdf/anonymousUsecases";
import { pdfNotFound } from "@repo/core/application/pdf/snapshot";
import { anonymousPdfFormBinding } from "./anonymousPdfForm";
import { renderAnonymousPdfPage } from "./anonymousPdfPage";
import {
  httpStatusFor,
  redactForClient,
  serializeError,
} from "./errorResponse";

const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const html = (body: string) =>
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>PDF — Hollow</title></head><body><main>${body}</main></body></html>`;
function browser(request: Request) {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith("hollow_share_browser=")) ?? [];
  const value =
    values.length === 1
      ? values[0]?.slice("hollow_share_browser=".length)
      : null;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function origin(request: Request, c: HollowContainer) {
  const supplied = request.headers.get("origin");
  const local =
    supplied === "null" &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    request.headers.get("sec-fetch-mode") === "navigate" &&
    request.headers.get("sec-fetch-dest") === "document";
  if (supplied !== new URL(c.appUrl).origin && !local)
    throw new ForbiddenError(
      "ORIGIN_REJECTED",
      "元の画面からやり直してください。",
    );
}
async function form(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0] !==
    "application/x-www-form-urlencoded"
  )
    throw Error("form");
  if (!request.body) return new URLSearchParams();
  const reader = request.body.getReader();
  const bytes: number[] = [];
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 5000);
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      if (bytes.length + next.value.length > 1024) {
        await reader.cancel();
        throw Error("form");
      }
      bytes.push(...next.value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (expired) throw Error("form");
  return new URLSearchParams(
    new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)),
  );
}

export async function anonymousPdfHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  const link = /^\/s\/([A-Za-z0-9_-]{43})\/pdf(?:\/(.*))?$/.exec(url.pathname);
  const published =
    /^\/s\/export-public\/([a-f0-9-]{36})\/1\/pdf(?:\/(.*))?$/.exec(
      url.pathname,
    );
  if (!link && !published) return null;
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  let current: {
    access: PdfAnonymousAccess;
    ticket: string;
    entry: string;
    statusPath: string;
  } | null = null;
  let entryPath: string | null = null;
  const redirect = (target: string) => {
    headers.set("Location", target);
    return new Response(null, { status: 303, headers });
  };
  const attachment = (
    result: Awaited<ReturnType<typeof getAnonymousPdfFile>>,
  ) => {
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Length", String(result.file.bytes));
    const filename = encodeURIComponent(result.file.filename).replace(
      /[!'()*]/g,
      (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="note.pdf"; filename*=UTF-8''${filename}`,
    );
    return new Response(result.body, { headers });
  };
  const render = async (
    value: NonNullable<typeof current>,
    busy = false,
    statusCode = 200,
  ) => {
    const status = await anonymousPdfStatus(c, value.access, value.ticket);
    const page = renderAnonymousPdfPage(
      status,
      {
        status: value.statusPath,
        receive: `${value.statusPath}/receive`,
        manual: `${value.statusPath}/download`,
        origin: value.entry,
      },
      busy,
    );
    if (page.refresh)
      headers.set(
        "Refresh",
        `${page.refresh.seconds}; url=${page.refresh.path}`,
      );
    else headers.delete("Refresh");
    return new Response(page.html, { status: statusCode, headers });
  };
  try {
    const match = published ?? link;
    const nonce = browser(request);
    if (
      !match?.[1] ||
      !nonce ||
      url.search ||
      url.pathname.length > 4096 ||
      (published && !uuid.test(match[1]))
    )
      return pdfNotFound();
    const access: PdfAnonymousAccess = published
      ? { kind: "public", publicId: match[1], urlGeneration: 1, browser: nonce }
      : { kind: "link", token: match[1], browser: nonce };
    const entry = published
      ? `/s/export-public/${match[1]}/1`
      : `/s/${match[1]}`;
    entryPath = entry;
    const tail = match[2];
    if (tail === undefined) {
      if (request.method !== "POST") {
        headers.set("Allow", "POST");
        return new Response(null, { status: 405, headers });
      }
      origin(request, c);
      let commandId: string;
      try {
        const params = await form(request);
        commandId = params.get("command") ?? "";
        const binding = params.get("binding") ?? "";
        if (
          [...params.keys()].some(
            (key) => key !== "command" && key !== "binding",
          ) ||
          params.getAll("command").length !== 1 ||
          params.getAll("binding").length !== 1 ||
          !uuid.test(commandId) ||
          !/^[a-f0-9]{64}$/.test(binding) ||
          binding !== anonymousPdfFormBinding(c, access, commandId)
        )
          throw Error("form");
      } catch {
        return new Response(
          html(
            `<h1>ダウンロードの準備をやり直してください</h1><p>要求は受け付けていません。元の画面を開き直して操作してください。</p><a href="${escapeAttribute(entry)}">元の画面へ</a>`,
          ),
          { status: 422, headers },
        );
      }
      const accepted = await requestAnonymousPdf(c, access, commandId);
      return redirect(`${entry}/pdf/${accepted.ticket}`);
    }
    const parts = tail.split("/");
    const ticket = parts[0] ?? "";
    if (
      ticket.length > 1413 ||
      !/^v1\.[A-Za-z0-9_-]{1,1366}\.[A-Za-z0-9_-]{43}$/.test(ticket)
    )
      return pdfNotFound();
    const action = parts[1];
    const fileId = parts[2];
    if (
      parts.length > 3 ||
      (action === undefined && parts.length !== 1) ||
      (action !== undefined &&
        action !== "receive" &&
        action !== "download" &&
        action !== "files") ||
      (action === "files"
        ? !fileId || !uuid.test(fileId)
        : fileId !== undefined)
    )
      return pdfNotFound();
    const method = action === "download" ? "POST" : "GET";
    if (request.method !== method) {
      headers.set("Allow", method);
      return new Response(null, { status: 405, headers });
    }
    if (request.headers.has("range"))
      return new Response(null, { status: 416, headers });
    current = { access, ticket, entry, statusPath: `${entry}/pdf/${ticket}` };
    if (action === undefined) return await render(current);
    if ((await anonymousPdfStatus(c, access, ticket)).kind === "expired")
      return await render(current, false, 410);
    if (action === "files" && fileId)
      return attachment(
        await getAnonymousPdfFile(c, access, ticket, fileId, request.signal),
      );
    if (action === "download") {
      origin(request, c);
      try {
        if ([...(await form(request)).keys()].length) throw Error("form");
      } catch {
        return new Response(html("<h1>元の画面からやり直してください</h1>"), {
          status: 422,
          headers,
        });
      }
    }
    const delivery = await prepareAnonymousPdfDelivery(
      c,
      access,
      ticket,
      action === "receive",
    );
    if (!delivery) return redirect(current.statusPath);
    if (action === "download")
      return redirect(`${current.statusPath}/files/${delivery.id}`);
    return attachment(
      await getAnonymousPdfFile(c, access, ticket, delivery.id, request.signal),
    );
  } catch (error) {
    const raw = serializeError(error);
    if (raw.code === "PDF_DELIVERY_BUSY" && current) {
      try {
        headers.set("Retry-After", "2");
        return await render(current, true, 503);
      } catch {
        return new Response(html("<h1>このPDFは利用できません</h1>"), {
          status: 404,
          headers,
        });
      }
    }
    const safe = redactForClient(raw);
    const status =
      raw.code === "EXPORT_RATE_LIMIT"
        ? 429
        : [
              "PDF_BUSY",
              "PDF_STOPPING",
              "PDF_DISK_BUSY",
              "PDF_NOT_CONFIGURED",
            ].includes(raw.code ?? "")
          ? 503
          : httpStatusFor(raw);
    if (status === 429 || status === 503)
      headers.set("Retry-After", status === 429 ? "60" : "3");
    if (raw.kind === "system" || raw.kind === "unknown")
      c.logger.error("Anonymous PDF HTTP failed", {
        kind: raw.kind,
        code: raw.code,
      });
    const back =
      current && status !== 404
        ? `<p><a href="${escapeAttribute(current.statusPath)}">取得状態を確認する</a></p>`
        : entryPath && status !== 404
          ? `<p><a href="${escapeAttribute(entryPath)}">元の画面でやり直す</a></p>`
          : "";
    return new Response(
      html(
        `<h1>PDFを取得できませんでした</h1><p>${escapeAttribute(safe.message)}</p>${back}`,
      ),
      { status, headers },
    );
  }
}
